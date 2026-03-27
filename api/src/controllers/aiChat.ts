/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AI Chat Controller
 * Handles streaming chat with OpenAI GPT-4 and function calling for agentic actions
 */

import { Request, Response } from 'express';
import OpenAI from 'openai';
import { supabase } from '../utils/supabaseClient.js';
import { AI_TOOLS, executeTool } from '../services/aiTools.js';
import { captureApiError } from '../utils/sentryCapture.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o';
const GPT_CONTENT_MODEL = process.env.GPT_CONTENT_MODEL || 'gpt-4o-mini';

// Initialize OpenAI client
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Chat pricing configuration - Sharkly tier limits (V2.6: Growth+ for AI Assistant)
const CHAT_TIER_LIMITS: Record<string, number> = {
  builder: 0,    // No chat access
  growth: 200,
  scale: 500,
  pro: 1000,
  default: 200,
};

// Extra seat adds this many messages
const CHAT_MESSAGES_PER_EXTRA_SEAT = 125;

const CHAT_CONFIG = {
  creditCostAfterFree: 0.25,          // Credits per message after free limit ($0.05)
  // GPT-4o pricing (per 1K tokens)
  inputTokenCostPer1K: 0.0025,        // $2.50 per 1M input tokens
  outputTokenCostPer1K: 0.01,         // $10.00 per 1M output tokens
};

function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get org's message limit and remaining from org record
async function getOrgChatInfo(orgId: string): Promise<{
  limit: number;
  remaining: number;
  used: number;
}> {
  const { data } = await supabase
    .from('organizations')
    .select('included_chat_messages_monthly, chat_messages_remaining')
    .eq('id', orgId)
    .single();
  
  const limit = data?.included_chat_messages_monthly || CHAT_TIER_LIMITS.default;
  const remaining = data?.chat_messages_remaining ?? limit;
  const used = limit - remaining;
  
  return { limit, remaining, used };
}

// Spend a chat message - handles free messages and credit charges
async function spendChatMessage(
  orgId: string,
  sessionId: string,
  tokens: number,
  costUsd: number,
  creditCost: number
): Promise<{
  success: boolean;
  usedFree: boolean;
  creditsSpent: number;
  remaining: number;
  limit: number;
  error?: string;
}> {
  const monthKey = getMonthKey();
  
  // Call the DB function that handles everything atomically
  const { data, error } = await supabase.rpc('spend_chat_message', {
    p_org_id: orgId,
    p_session_id: sessionId,
    p_credit_cost: creditCost,
    p_tokens: tokens,
    p_llm_cost_usd: costUsd,
  });

  if (error) {
    console.error('[AI Chat] Error spending chat message:', error);
    // Fallback to simple decrement if RPC fails (graceful degradation)
    const info = await getOrgChatInfo(orgId);
    return {
      success: true,
      usedFree: info.remaining > 0,
      creditsSpent: info.remaining > 0 ? 0 : creditCost,
      remaining: Math.max(0, info.remaining - 1),
      limit: info.limit,
    };
  }

  const result = data as {
    success: boolean;
    used_free?: boolean;
    credits_spent?: number;
    free_remaining?: number;
    monthly_limit?: number;
    error?: string;
    message?: string;
  };

  if (!result.success) {
    return {
      success: false,
      usedFree: false,
      creditsSpent: 0,
      remaining: 0,
      limit: result.monthly_limit || CHAT_TIER_LIMITS.default,
      error: result.message || result.error || 'Failed to process chat message',
    };
  }

  // Also track in chat_usage_monthly for analytics (non-critical)
  try {
    await supabase.rpc('increment_chat_usage', {
      p_org_id: orgId,
      p_month_key: monthKey,
      p_messages: 1,
      p_tokens: tokens,
      p_cost_usd: costUsd,
      p_credits: result.credits_spent || 0,
    });
  } catch {
    // Ignore - analytics tracking failure shouldn't break chat
  }
  
  return {
    success: true,
    usedFree: result.used_free || false,
    creditsSpent: result.credits_spent || 0,
    remaining: result.free_remaining ?? 0,
    limit: result.monthly_limit || CHAT_TIER_LIMITS.default,
  };
}

function calculateLlmCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1000) * CHAT_CONFIG.inputTokenCostPer1K;
  const outputCost = (outputTokens / 1000) * CHAT_CONFIG.outputTokenCostPer1K;
  return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimal places
}

async function shouldChargeCredits(orgId: string): Promise<{ shouldCharge: boolean; messageNumber: number; freeRemaining: number; limit: number }> {
  const info = await getOrgChatInfo(orgId);
  return {
    shouldCharge: info.remaining <= 0,
    messageNumber: info.used + 1,
    freeRemaining: info.remaining,
    limit: info.limit,
  };
}

// ============ Chat Session Management ============

interface ChatSession {
  id: string;
  organization_id: string;
  user_id?: string;
  case_id?: string;
  person_id?: string;
  title?: string;
}

// Generate a smart title from the first message using LLM
async function generateChatTitle(firstMessage: string): Promise<string> {
  // Fallback title in case LLM fails
  const fallbackTitle = firstMessage.slice(0, 40).trim() + (firstMessage.length > 40 ? '...' : '');
  
  if (!openai) return fallbackTitle;
  
  try {
    const response = await openai.chat.completions.create({
      model: GPT_CONTENT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Generate a very short title (3-6 words max) for a Fin (SEO assistant) conversation. Return ONLY the title, no quotes or punctuation. Examples: "SEO priorities for my site", "Technical audit summary", "Cluster health overview", "Pages needing refresh"'
        },
        {
          role: 'user',
          content: firstMessage.slice(0, 500) // Limit input
        }
      ],
      max_tokens: 20,
      temperature: 0.3,
    });
    
    const title = response.choices[0]?.message?.content?.trim();
    if (title && title.length > 0 && title.length <= 60) {
      return title;
    }
    return fallbackTitle;
  } catch (error) {
    console.error('[AI Chat] Error generating title:', error);
    return fallbackTitle;
  }
}

// Create or get a chat session
async function getOrCreateSession(
  orgId: string,
  userId: string | null,
  sessionId: string | null,
  context?: { case_id?: string; person_id?: string; business_id?: string },
  firstMessage?: string
): Promise<ChatSession> {
  // If session ID provided, try to load it
  if (sessionId) {
    const { data: existing } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('organization_id', orgId)
      .single();
    if (existing) return existing;
  }

  // Auto-generate title from first message using LLM
  const title = firstMessage ? await generateChatTitle(firstMessage) : 'New conversation';

  // Create new session
  const { data: newSession, error } = await supabase
    .from('chat_sessions')
    .insert({
      organization_id: orgId,
      user_id: userId,
      title,
      case_id: context?.case_id || null,
      person_id: context?.person_id || null,
      business_id: context?.business_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[AI Chat] Failed to create session:', error);
    throw error;
  }
  
  return newSession;
}

// Save a message to the session
async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string,
  opts?: {
    tool_calls?: any[];
    tool_call_id?: string;
    input_tokens?: number;
    output_tokens?: number;
    cost_usd?: number;
  }
): Promise<void> {
  await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role,
    content,
    tool_calls: opts?.tool_calls || null,
    tool_call_id: opts?.tool_call_id || null,
    input_tokens: opts?.input_tokens || null,
    output_tokens: opts?.output_tokens || null,
    cost_usd: opts?.cost_usd || null,
  });

  // Update session metadata
  await supabase
    .from('chat_sessions')
    .update({
      message_count: supabase.rpc('increment', { x: 1 }) as any, // This won't work, need raw SQL
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
}

// Load messages for a session
async function loadSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from('chat_messages')
    .select('role, content, tool_calls, tool_call_id')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (!data) return [];

  return data.map(m => ({
    role: m.role as ChatMessage['role'],
    content: m.content,
    tool_calls: m.tool_calls || undefined,
    tool_call_id: m.tool_call_id || undefined,
  }));
}

// Update session with a smart title from first message
async function generateSessionTitle(sessionId: string, firstMessage: string): Promise<void> {
  const title = await generateChatTitle(firstMessage);
  await supabase
    .from('chat_sessions')
    .update({ title })
    .eq('id', sessionId);
}

// System prompt for Sharkly SEO Assistant (V2.6) — named "Fin"
const SYSTEM_PROMPT = `You are Fin, the Sharkly SEO Assistant. You help business owners and marketers improve their search rankings using Sharkly's data and tools. When users address you, they call you Fin.

## Your Role
1. **Read project data**: List sites, clusters, pages, audit results, and priorities
2. **Explain findings**: Summarize audit issues, SEO scores, and recommendations in plain English
3. **Suggest next actions**: Recommend what to fix based on the Weekly Priority Stack and audit data
4. **Trigger audits** (Scale/Pro only): Run technical SEO audits when the user asks

## Tools Available
- **get_sites_summary** — List all sites. Use first to understand what the user has.
- **get_site_details** — Full site info: niche, URL, domain authority, competitors.
- **get_clusters_summary** — Content clusters for a site (topic groups).
- **get_cluster_details** — Cluster pages, funnel stages, intelligence warnings.
- **get_page_summary** — Single page: keyword, type, UPSA score, status.
- **get_audit_summary** — Latest technical audit: health score, critical issues, recommendations.
- **get_weekly_priority_stack** — Top recommended actions (credits, low-score pages, etc.).
- **get_refresh_queue** — Pages that need content updates (stale + declining).
- **suggest_next_actions** — Analyze and suggest priorities. Free.
- **trigger_technical_audit** — (Scale/Pro only) Run full technical audit. Costs credits.

## Workflow
1. When the user asks "what should I do" or "what's wrong" — run get_sites_summary first, then get_weekly_priority_stack for their main site.
2. When they ask about a specific site — use get_site_details, get_audit_summary, get_clusters_summary.
3. When they ask "why isn't this ranking" — get the page summary and audit, explain the likely causes.
4. When they want an audit — use trigger_technical_audit (Scale/Pro only; tell Growth users to upgrade).

## Output Rules
1. **Never output raw JSON** — summarize tool results in natural language.
2. **Be conversational** — short, helpful sentences.
3. **Use plain English** — avoid jargon like "UPSA", "DA", "KGR" unless you briefly explain.
4. **Suggest specific actions** — "Fix the missing meta descriptions on your pricing page" not "improve on-page SEO."
5. **Mention where to go** — "Check Technical SEO for the full audit" or "Open the Workspace for that page."

## Response Style
- Direct and professional, warm and approachable
- Proactive: if the request is vague, run get_sites_summary and suggest_next_actions
- After tools run, highlight the key takeaways — don't dump everything
- Use **bold** for emphasis, bullet lists for multiple items`;


// Types
interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

interface ChatRequest {
  message: string;
  conversation_id?: string;
  person_context?: {
    person_id: string;
    person_name: string;
  };
  history?: ChatMessage[];
}

/**
 * Main chat endpoint - handles streaming responses
 */
export async function chatWithAssistant(req: Request, res: Response) {
  if (!openai) {
    return res.status(500).json({
      error: 'OpenAI not configured',
      message: 'Please set OPENAI_API_KEY in your environment variables',
    });
  }

  // Get organization context
  const organizationId = (req as any).organizationId;
  const userId = (req as any).userId;
  const seatId = (req as any).seatId;

  if (!organizationId) {
    return res.status(401).json({ error: 'Organization context required' });
  }

  const body = req.body as ChatRequest;
  const { message, conversation_id, person_context, history } = body;

  console.log('[AI Chat] Received message:', { 
    message: message?.slice(0, 100), 
    orgId: organizationId,
    userId,
    hasHistory: !!history?.length,
    conversationId: conversation_id 
  });

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Declare sessionId outside try so it's available in catch for error reporting
  let sessionId: string | undefined;

  try {
    // Fetch org plan for Scale-only tools (e.g. trigger_technical_audit)
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('plan_code')
      .eq('id', organizationId)
      .single();
    const planCode = (orgRow as { plan_code?: string } | null)?.plan_code ?? null;

    // Get or create a chat session (pass first message for auto-title on new sessions)
    const session = await getOrCreateSession(
      organizationId,
      userId,
      conversation_id || null,
      { person_id: person_context?.person_id },
      !conversation_id ? message : undefined // Only pass message for new sessions
    );
    sessionId = session.id;

    // Load existing messages from DB or use provided history
    let messages: ChatMessage[] = [];
    if (history?.length) {
      messages = history;
      console.log('[AI Chat] Using provided history:', messages.length, 'messages');
    } else if (conversation_id) {
      messages = await loadSessionMessages(conversation_id);
      console.log('[AI Chat] Loaded history from DB:', messages.length, 'messages', 
        messages.map(m => ({ role: m.role, hasToolCalls: !!m.tool_calls?.length, hasToolId: !!m.tool_call_id }))
      );
    }

    // Add system message if not present
    if (messages.length === 0 || messages[0].role !== 'system') {
      let systemMsg = SYSTEM_PROMPT;
      
      // Add person context if available
      if (person_context) {
        systemMsg += `\n\n## Current Subject Context
The user is currently viewing: ${person_context.person_name} (ID: ${person_context.person_id})
When asked to perform actions, default to this subject unless otherwise specified.`;
      }

      messages.unshift({ role: 'system', content: systemMsg });
    }

    // Add user message
    messages.push({ role: 'user', content: message });

    // Save user message to DB
    await saveMessage(sessionId, 'user', message);

    // Generate title from first user message if new session
    if (!conversation_id) {
      await generateSessionTitle(sessionId, message);
    }

    // Set up SSE for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Check if this message should cost credits
    const creditCheck = await shouldChargeCredits(organizationId);
    let chatCreditCost = 0;
    if (creditCheck.shouldCharge) {
      chatCreditCost = CHAT_CONFIG.creditCostAfterFree;
    }

    // Track tool calls and total credits
    let totalCredits = chatCreditCost;
    const executedTools: Array<{ name: string; result: any; credits: number }> = [];
    
    // Track LLM usage across all iterations
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Call OpenAI with streaming and function calling
    let continueLoop = true;
    let loopCount = 0;
    const maxLoops = 5; // Prevent infinite loops

    while (continueLoop && loopCount < maxLoops) {
      loopCount++;

      console.log('[AI Chat] Calling OpenAI with model:', OPENAI_MODEL, 'tools count:', AI_TOOLS.length);
      console.log('[AI Chat] Message count:', messages.length, 'Last message role:', messages[messages.length - 1]?.role);
      console.log('[AI Chat] User message:', messages[messages.length - 1]?.content?.slice(0, 200));
      // Debug: show full message history summary
      console.log('[AI Chat] Full message history:', messages.map(m => ({ 
        role: m.role, 
        hasContent: !!m.content,
        hasToolCalls: !!m.tool_calls?.length,
        toolCallId: m.tool_call_id?.slice(0, 8) || null
      })));

      let stream;
      try {
        stream = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: messages as any,
          tools: AI_TOOLS as any,
          tool_choice: 'auto',
          stream: true,
          stream_options: { include_usage: true },
        });
      } catch (openaiError: any) {
        console.error('[AI Chat] OpenAI API error:', openaiError.message, openaiError.code);
        res.write(`data: ${JSON.stringify({ type: 'error', error: openaiError.message })}\n\n`);
        res.end();
        return;
      }

      let assistantContent = '';
      const currentToolCalls: any[] = [];
      let finishReason: string | null = null;
      let chunkCount = 0;

      // Process stream
      for await (const chunk of stream) {
        chunkCount++;
        const delta = chunk.choices[0]?.delta;
        // Only update finishReason if it's set (don't let later chunks overwrite with undefined)
        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }
        
        // Log first few chunks and last chunk for debugging
        if (chunkCount <= 3 || finishReason) {
          console.log('[AI Chat] Stream chunk', chunkCount, { 
            hasContent: !!delta?.content,
            contentPreview: delta?.content?.slice(0, 50),
            hasToolCalls: !!delta?.tool_calls,
            toolCallNames: delta?.tool_calls?.map((t: any) => t.function?.name),
            finishReason 
          });
        }

        // Capture usage from the final chunk (when stream_options.include_usage is true)
        if (chunk.usage) {
          totalInputTokens += chunk.usage.prompt_tokens || 0;
          totalOutputTokens += chunk.usage.completion_tokens || 0;
        }

        // Handle content streaming
        if (delta?.content) {
          assistantContent += delta.content;
          // Send content chunk to client
          res.write(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`);
        }

        // Collect tool calls
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              if (!currentToolCalls[tc.index]) {
                currentToolCalls[tc.index] = {
                  id: tc.id || '',
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
              }
              if (tc.id) currentToolCalls[tc.index].id = tc.id;
              if (tc.function?.name) currentToolCalls[tc.index].function.name += tc.function.name;
              if (tc.function?.arguments) currentToolCalls[tc.index].function.arguments += tc.function.arguments;
            }
          }
        }
      }

      // Filter out any undefined entries from sparse array and compact
      const validToolCalls = currentToolCalls.filter(tc => tc && tc.function?.name);
      
      // Debug: log what we collected
      console.log('[AI Chat] Stream ended. finishReason:', finishReason, 'raw toolCalls:', currentToolCalls.length, 'valid toolCalls:', validToolCalls.length);
      if (validToolCalls.length > 0) {
        console.log('[AI Chat] Tool calls:', JSON.stringify(validToolCalls.map(t => ({ name: t?.function?.name, argsLen: t?.function?.arguments?.length }))));
      }

      // Handle tool calls if any
      if (validToolCalls.length > 0 && finishReason === 'tool_calls') {
        console.log('[AI Chat] LLM requested tools:', validToolCalls.map(t => t.function.name));
        
        // Add assistant message with tool calls
        messages.push({
          role: 'assistant',
          content: assistantContent || '',
          tool_calls: validToolCalls,
        });
        
        // Save assistant message with tool calls to DB
        await saveMessage(sessionId, 'assistant', assistantContent || '', {
          tool_calls: validToolCalls,
        });

        // Execute each tool
        for (const toolCall of validToolCalls) {
          const toolName = toolCall.function.name;
          let toolArgs: Record<string, any> = {};

          try {
            toolArgs = JSON.parse(toolCall.function.arguments || '{}');
          } catch {
            console.error(`[AI Chat] Failed to parse tool args:`, toolCall.function.arguments);
          }

          console.log(`[AI Chat] Executing tool: ${toolName}`, toolArgs);

          // Notify client about tool execution
          res.write(`data: ${JSON.stringify({ 
            type: 'tool_start', 
            tool: toolName, 
            args: toolArgs 
          })}\n\n`);

          // Execute the tool (pass planCode for Scale-only tools like trigger_technical_audit)
          const toolResult = await executeTool(toolName, toolArgs, {
            organizationId,
            userId,
            planCode,
          });
          
          console.log(`[AI Chat] Tool ${toolName} result:`, { success: toolResult.success, hasResult: !!toolResult.result });

          executedTools.push({
            name: toolName,
            result: toolResult,
            credits: toolResult.creditsCost || 0,
          });
          totalCredits += toolResult.creditsCost || 0;

          // Send tool result to client (include error message if present)
          res.write(`data: ${JSON.stringify({ 
            type: 'tool_result', 
            tool: toolName, 
            result: toolResult.result,
            success: toolResult.success,
            error: toolResult.error,
            credits: toolResult.creditsCost || 0,
          })}\n\n`);

          // Add tool result to messages
          messages.push({
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult.result),
          });
          
          // Save tool result to DB
          await saveMessage(sessionId, 'tool', JSON.stringify(toolResult.result), {
            tool_call_id: toolCall.id,
          });
        }

        // Continue loop to get AI response to tool results
        continueLoop = true;
      } else {
        // No more tool calls, we're done
        continueLoop = false;
        console.log('[AI Chat] LLM finished, no tool calls. Content length:', assistantContent.length);

        // Add final assistant message
        if (assistantContent) {
          messages.push({ role: 'assistant', content: assistantContent });
        }
      }
    }

    // Calculate LLM cost
    const llmCostUsd = calculateLlmCost(totalInputTokens, totalOutputTokens);

    // Save assistant message to DB
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant') {
      await saveMessage(sessionId, 'assistant', lastMessage.content, {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        cost_usd: llmCostUsd,
      });
    }

    // Spend chat message (decrements free or charges credits)
    const spendResult = await spendChatMessage(
      organizationId,
      sessionId,
      totalInputTokens + totalOutputTokens,
      llmCostUsd,
      CHAT_CONFIG.creditCostAfterFree
    );

    // Update total credits if overage was charged
    if (spendResult.creditsSpent > 0) {
      totalCredits += spendResult.creditsSpent;
    }

    // Send completion event with usage stats
    res.write(`data: ${JSON.stringify({ 
      type: 'done', 
      conversation_id: sessionId,
      credits_used: totalCredits,
      chat_credit_cost: spendResult.creditsSpent,
      used_free_message: spendResult.usedFree,
      tools_executed: executedTools.map(t => ({ name: t.name, credits: t.credits })),
      usage: {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        total_tokens: totalInputTokens + totalOutputTokens,
        llm_cost_usd: llmCostUsd,
        message_number: spendResult.limit - spendResult.remaining,
        monthly_limit: spendResult.limit,
        free_remaining: spendResult.remaining,
        is_free: spendResult.usedFree,
      },
    })}\n\n`);

    res.end();
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    
    // Try to send error through stream - include conversation_id if session was created
    try {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Chat failed',
        conversation_id: sessionId, // Include so frontend can track the session
      })}\n\n`);
      res.end();
    } catch {
      // If stream failed, send JSON response
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Chat failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
}

/**
 * Non-streaming chat endpoint (for simpler integrations)
 */
export async function chatWithAssistantSync(req: Request, res: Response) {
  if (!openai) {
    return res.status(500).json({
      error: 'OpenAI not configured',
      message: 'Please set OPENAI_API_KEY in your environment variables',
    });
  }

  const organizationId = (req as any).organizationId;
  const userId = (req as any).userId;
  const seatId = (req as any).seatId;

  if (!organizationId) {
    return res.status(401).json({ error: 'Organization context required' });
  }

  const body = req.body as ChatRequest;
  const { message, conversation_id, person_context, history } = body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Fetch org plan for Scale-only tools
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('plan_code')
      .eq('id', organizationId)
      .single();
    const planCode = (orgRow as { plan_code?: string } | null)?.plan_code ?? null;

    // Get or create session (pass first message for auto-title on new sessions)
    const session = await getOrCreateSession(
      organizationId,
      userId,
      conversation_id || null,
      { person_id: person_context?.person_id },
      !conversation_id ? message : undefined
    );
    const sessionId = session.id;

    let messages: ChatMessage[] = [];

    if (history?.length) {
      messages = history;
    } else if (conversation_id) {
      messages = await loadSessionMessages(conversation_id);
    }

    if (messages.length === 0 || messages[0].role !== 'system') {
      let systemMsg = SYSTEM_PROMPT;
      if (person_context) {
        systemMsg += `\n\n## Current Subject Context
The user is currently viewing: ${person_context.person_name} (ID: ${person_context.person_id})
When asked to perform actions, default to this subject unless otherwise specified.`;
      }
      messages.unshift({ role: 'system', content: systemMsg });
    }

    messages.push({ role: 'user', content: message });

    // Save user message
    await saveMessage(sessionId, 'user', message);

    // Check if this message should cost credits
    const creditCheck = await shouldChargeCredits(organizationId);
    let chatCreditCost = 0;
    if (creditCheck.shouldCharge) {
      chatCreditCost = CHAT_CONFIG.creditCostAfterFree;
    }

    let totalCredits = chatCreditCost;
    const executedTools: Array<{ name: string; result: any; credits: number }> = [];
    let finalResponse = '';
    let loopCount = 0;
    const maxLoops = 5;
    
    // Track LLM usage
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    while (loopCount < maxLoops) {
      loopCount++;

      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: messages as any,
        tools: AI_TOOLS as any,
        tool_choice: 'auto',
      });

      // Capture usage
      if (response.usage) {
        totalInputTokens += response.usage.prompt_tokens || 0;
        totalOutputTokens += response.usage.completion_tokens || 0;
      }

      const choice = response.choices[0];
      const assistantMessage = choice.message;

      if (assistantMessage.tool_calls?.length) {
        messages.push({
          role: 'assistant',
          content: assistantMessage.content || '',
          tool_calls: assistantMessage.tool_calls as any,
        });
        
        // Save assistant message with tool calls to DB
        await saveMessage(sessionId, 'assistant', assistantMessage.content || '', {
          tool_calls: assistantMessage.tool_calls as any,
        });

        for (const toolCall of assistantMessage.tool_calls) {
          const tc = toolCall as any;
          const toolName = tc.function?.name || '';
          let toolArgs: Record<string, any> = {};
          try {
            toolArgs = JSON.parse(tc.function?.arguments || '{}');
          } catch {
            console.error(`[AI Chat] Failed to parse tool args`);
          }

          const toolResult = await executeTool(toolName, toolArgs, {
            organizationId,
            userId,
            planCode,
          });

          executedTools.push({
            name: toolName,
            result: toolResult,
            credits: toolResult.creditsCost || 0,
          });
          totalCredits += toolResult.creditsCost || 0;

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult.result),
          });
          
          // Save tool result to DB
          await saveMessage(sessionId, 'tool', JSON.stringify(toolResult.result), {
            tool_call_id: toolCall.id,
          });
        }
      } else {
        finalResponse = assistantMessage.content || '';
        messages.push({ role: 'assistant', content: finalResponse });
        break;
      }
    }

    // Calculate LLM cost
    const llmCostUsd = calculateLlmCost(totalInputTokens, totalOutputTokens);

    // Save assistant message
    await saveMessage(sessionId, 'assistant', finalResponse, {
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      cost_usd: llmCostUsd,
    });

    // Spend chat message (decrements free or charges credits)
    const spendResult = await spendChatMessage(
      organizationId,
      sessionId,
      totalInputTokens + totalOutputTokens,
      llmCostUsd,
      CHAT_CONFIG.creditCostAfterFree
    );

    // Update total credits if overage was charged
    if (spendResult.creditsSpent > 0) {
      totalCredits += spendResult.creditsSpent;
    }

    return res.json({
      response: finalResponse,
      conversation_id: sessionId,
      credits_used: totalCredits,
      chat_credit_cost: spendResult.creditsSpent,
      used_free_message: spendResult.usedFree,
      tools_executed: executedTools.map(t => ({ name: t.name, credits: t.credits })),
      usage: {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        total_tokens: totalInputTokens + totalOutputTokens,
        llm_cost_usd: llmCostUsd,
        message_number: spendResult.limit - spendResult.remaining,
        monthly_limit: spendResult.limit,
        free_remaining: spendResult.remaining,
        is_free: spendResult.usedFree,
      },
    });
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    return res.status(500).json({
      error: 'Chat failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get conversation history
 */
export async function getConversationHistory(req: Request, res: Response) {
  const { conversation_id } = req.params;
  const organizationId = (req as any).organizationId;
  
  if (!conversation_id) {
    return res.status(400).json({ error: 'Conversation ID required' });
  }

  // Verify the session belongs to this organization
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at, message_count, total_cost_usd, organization_id')
    .eq('id', conversation_id)
    .eq('organization_id', organizationId) // Security: filter by org
    .single();
  
  if (!session) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  // Load from database
  const messages = await loadSessionMessages(conversation_id);

  // Filter out system messages and tool messages (tool messages contain raw JSON that shouldn't be displayed)
  // Also hide assistant rows with no visible text — those are tool-call stubs / "thinking" placeholders
  // persisted with empty content; reloading would otherwise show empty bubbles.
  const visibleMessages = messages.filter((m: ChatMessage) => {
    if (m.role === 'system' || m.role === 'tool') return false;
    if (m.role === 'assistant' && !(m.content || '').trim()) return false;
    return true;
  });

  return res.json({
    conversation_id,
    title: session?.title,
    created_at: session?.created_at,
    message_count: session?.message_count,
    messages: visibleMessages,
  });
}

/**
 * Clear/archive conversation
 */
export async function clearConversation(req: Request, res: Response) {
  const { conversation_id } = req.params;
  const organizationId = (req as any).organizationId;
  
  if (conversation_id) {
    await supabase
      .from('chat_sessions')
      .update({ status: 'archived' })
      .eq('id', conversation_id)
      .eq('organization_id', organizationId);
  }

  return res.json({ success: true });
}

/**
 * List all chat sessions for the organization
 */
export async function listChatSessions(req: Request, res: Response) {
  const organizationId = (req as any).organizationId;
  
  if (!organizationId) {
    return res.status(401).json({ error: 'Organization context required' });
  }

  try {
    // Try DB function first for better data
    let sessions: any[] | null = null;

    try {
      const { data: sessionsFromFunc, error: funcError } = await supabase
        .rpc('get_chat_sessions_with_preview', {
          p_org_id: organizationId,
          p_limit: 50,
        });

      if (!funcError && sessionsFromFunc) {
        sessions = sessionsFromFunc;
      }
    } catch {
      // Function doesn't exist, use fallback
    }

    // Fallback to direct query
    if (!sessions) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(50);
      
      if (error) {
        console.error('[AI Chat] Error fetching sessions:', error);
        return res.json({ sessions: [] });
      }
      
      sessions = data;
    }

    return res.json({ sessions: sessions || [] });
  } catch (err) {
    console.error('[AI Chat] Exception fetching sessions:', err);
    captureApiError(err, req, { feature: 'ai-chat-sessions' });
    return res.json({ sessions: [] });
  }
}

/**
 * Update chat session (rename, pin, etc.)
 */
export async function updateChatSession(req: Request, res: Response) {
  const { session_id } = req.params;
  const organizationId = (req as any).organizationId;
  const { title, pinned } = req.body;

  if (!organizationId) {
    return res.status(401).json({ error: 'Organization context required' });
  }

  if (!session_id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (title !== undefined) {
    updateData.title = title;
  }
  if (pinned !== undefined) {
    updateData.pinned = pinned;
  }

  const { data: session, error } = await supabase
    .from('chat_sessions')
    .update(updateData)
    .eq('id', session_id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ session });
}

/**
 * Get chat configuration/status
 */
export async function getChatStatus(req: Request, res: Response) {
  const organizationId = (req as any).organizationId;
  
  let usageInfo = null;
  if (organizationId) {
    const info = await getOrgChatInfo(organizationId);
    usageInfo = {
      messages_used: info.used,
      monthly_limit: info.limit,
      free_remaining: info.remaining,
      credit_cost_after_free: CHAT_CONFIG.creditCostAfterFree,
      is_over_limit: info.remaining <= 0,
    };
  }

  return res.json({
    enabled: !!openai,
    model: OPENAI_MODEL,
    tools_available: AI_TOOLS.map(t => t.function.name),
    pricing: {
      tier_limits: CHAT_TIER_LIMITS,
      messages_per_extra_seat: CHAT_MESSAGES_PER_EXTRA_SEAT,
      credit_cost_after_free: CHAT_CONFIG.creditCostAfterFree,
      llm_input_cost_per_1k: CHAT_CONFIG.inputTokenCostPer1K,
      llm_output_cost_per_1k: CHAT_CONFIG.outputTokenCostPer1K,
    },
    usage: usageInfo,
  });
}


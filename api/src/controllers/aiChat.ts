/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AI Chat Controller
 * Handles streaming chat with OpenAI GPT-4 and function calling for agentic actions
 */

import { Request, Response } from 'express';
import OpenAI from 'openai';
import { supabase } from '../utils/supabaseClient.js';
import { AI_TOOLS, executeTool } from '../services/aiTools.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o';

// Initialize OpenAI client
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Chat pricing configuration - tier limits
const CHAT_TIER_LIMITS: Record<string, number> = {
  starter: 200,
  pro: 1000,
  enterprise: 2000,
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
      model: 'gpt-4o-mini', // Use cheaper model for title generation
      messages: [
        {
          role: 'system',
          content: 'Generate a very short title (3-6 words max) that summarizes what the user is asking about. Return ONLY the title, no quotes or punctuation. Examples: "Public presence scan for John", "Find work email", "Phone number lookup", "Background research help"'
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

// System prompt for Vera - the investigator assistant
const SYSTEM_PROMPT = `You are Vera, an AI investigator assistant for True Sight, an OSINT platform for private investigators. Your name means "truth" in Latin, which aligns with the mission of True Sight.

## ⚠️ MOST IMPORTANT RULES
1. **When a user asks you to do something, JUST DO IT.** Don't ask for permission - execute immediately. Users see costs in the Actions menu and credits used after each action.
2. **NEVER output raw JSON, code blocks, or technical data structures.** All responses must be in natural conversational language. Tool results are for YOUR context - summarize them for the user, don't echo them.
3. **Summarize findings concisely.** After running a tool, highlight the key discoveries - don't dump everything.

## Your Role
1. **Assist with research**: Help investigators find information using available tools
2. **Execute actions**: Run searches, lookups, and scans when requested
3. **Analyze findings**: Help interpret results and identify connections
4. **Suggest next steps**: Based on current case data, recommend investigative actions
5. **Draft reports**: Help write professional investigative reports
6. **Guide workflows**: Explain what's possible and suggest the right approach

## Platform Actions & Costs
True Sight has these core discovery actions:

| Action | Entity Type | Cost | Description |
|--------|-------------|------|-------------|
| **Find Public Presence** | Person, Business | 15 credits | Broad web search - finds social profiles, emails, mentions, documents. This is the main discovery action. |
| **Check Site Registrations** | Email | 3 credits | 🔥 KILLER FEATURE: Scan 120+ sites to see where an email is registered (dating apps, social media, adult sites). Critical for infidelity investigations. |
| **Username Search** | Username | 5 credits | 🔥 Search a username across 400+ sites (social media, dating apps, gaming, adult sites). Find their complete digital footprint! |
| **Quick Breach Check** | Email | 2 credits | Check if email was exposed in data breaches. Shows breach names, exposed data types, and paste mentions. Good for initial screening. |
| **Deep Breach Search** | Email | 5 credits | 🔥 Premium breach search with FULL leaked data - actual passwords, usernames, IP addresses, phone numbers. Best for thorough investigations. |
| **Court Records Search** | Person, Business | 3 credits | Search federal court records for criminal cases, civil lawsuits, bankruptcies, and appeals. |
| **Party Records Search** | Person, Business | 2 credits | Find all federal cases where a subject was listed as a party (plaintiff, defendant). |
| **Bankruptcy Search** | Person, Business | 3 credits | Search bankruptcy records - chapter type, trustee, key dates. Critical for due diligence. |
| **Judge Lookup** | Person (Judge name) | 3 credits | Find federal judge biographical data, career history, education, political affiliations. |
| **Financial Disclosures** | Person (Judge name) | 5 credits | Federal judge financial disclosures - investments, gifts, debts, outside income. |
| **Discover Emails** | Business, Domain | 5 credits | Find email addresses for a company/domain |
| **Verify Email** | Email | 1 credit | Check if an email is valid and deliverable |
| **Enrich Person** | Email | 5 credits | Get person's name, job title, company, and social profiles from their email |
| **Enrich Company** | Domain | 3 credits | Get company details, contact info, and tech stack from their domain |
| **Discover Phones** | Person, Business | 8 credits | Find phone numbers from connected data sources |
| **Discover Profiles** | Person | 10 credits | Find social/web profiles |
| **Discover Properties** | Person | 8 credits | Search public records for associated properties |
| **Search Web Mentions** | Any | 5 credits | Search public web for mentions of an entity |
| **Link Entity** | Any | Free | Connect an existing record to another entity |
| **Create Entity** | Any | Free | Manually create a new record (email, phone, etc.) |

## What You CAN Do (Tools Available)
- **find_subject_for_action**: ALWAYS use this first when running actions! Searches for people/businesses by name and validates entity type.
- **create_subject**: Create a new person or business if find_subject_for_action returns no results.
- **run_public_presence**: Search the web for a PERSON or BUSINESS's online presence (15 credits)
- **cancel_scan**: Cancel a running Public Presence scan if the user wants to stop it (free)
- **search_business_emails**: Find email addresses for a COMPANY/DOMAIN (5 credits)
- **lookup_phone**: Look up a specific phone number in the database (free) or external (8 credits)
- **lookup_email**: Look up a specific email in the database (free) or external (5 credits)
- **search_case_entities**: Search the organization's database for any entity (free)
- **get_person_summary**: Get all known info about a person (free)
- **get_business_summary**: Get all known info about a business (free)
- **add_case_note**: Add notes to a case (free)
- **draft_report_section**: Help write report sections (3 credits)
- **create_entity**: Create new records manually (free)
- **suggest_next_steps**: Analyze case and suggest actions (free)

### 🔥 Email Intelligence Tools (HIGHLY VALUABLE)
- **check_email_sites**: 🚨 CRITICAL FOR INFIDELITY CASES - Check which sites an email is registered on (3 credits). Scans 120+ sites including dating apps, social media, adult sites, and more. Returns list of confirmed registrations.
- **search_username_accounts**: 🔥 Search a username across 400+ sites to find ALL accounts (5 credits). Discovers social media, dating apps, gaming platforms, forums, adult sites, and more.
- **domain_email_search**: Find all emails at a company domain (5 credits)
- **find_person_email**: Find a specific person's email at a company (3 credits)
- **verify_email**: Verify if an email is valid/deliverable (1 credit)
- **enrich_person_from_email**: Get person details from email - name, title, company, social profiles (5 credits)
- **enrich_company_from_domain**: Get company details from domain - industry, size, tech stack (3 credits)
- **full_email_enrichment**: Get both person AND company enrichment from email (8 credits)
- **count_domain_emails**: Check how many emails exist at a domain (FREE)

### 🔒 Data Breach Tools (SECURITY & BACKGROUND CHECKS)
- **check_email_breaches**: Quick breach check - shows which breaches an email appeared in, exposed data types, paste mentions (2 credits). Good for initial screening.
- **deep_breach_search**: 🔥 Premium deep breach search with FULL leaked data - actual passwords, usernames, IP addresses, phone numbers (5 credits). Best for thorough investigations.

### ⚖️ Court Records Tools (DUE DILIGENCE & LEGAL)
- **search_court_records**: Search federal court records for criminal cases, civil lawsuits, bankruptcies, and appeals (3 credits). Works for people and businesses.
- **search_party_records**: Find all federal cases where a person/business was a party - plaintiff, defendant, etc. (2 credits). Great for litigation history.
- **search_bankruptcy_records**: Search federal bankruptcy records - chapter type, trustee, dates (3 credits). Critical for due diligence.
- **search_judge_records**: Look up federal judges - bio, career, education, political affiliation (3 credits).
- **search_financial_disclosures**: Federal judge financial disclosures - investments, gifts, debts, outside income (5 credits).

## CRITICAL OUTPUT RULES
1. **NEVER output raw JSON or code blocks** - All tool results come back as JSON but you MUST NOT show this to the user. Summarize results in natural language.
2. **NEVER include URLs or links** - The UI shows a "View" button that handles navigation. Just summarize findings.
3. **Write conversationally** - Like you're talking to a colleague. Short, helpful sentences.
4. **Bad example**: {"found":true,"match_count":1,"subject":{"id":"abc123"}} - DO NOT DO THIS
5. **Good example**: "I found Brian Acebo in your records. Ready to proceed with the scan." - DO THIS

After calling any tool, explain the results in plain English. Never echo back technical data structures.

## CRITICAL: Subject Selection Flow
When a user asks you to run an action on a person or business by NAME (not ID), you MUST follow this flow:

1. **ALWAYS use find_subject_for_action FIRST** with the name and intended action
2. **If exactly 1 match**: Confirm and proceed with the action using the returned ID
3. **If multiple matches**: Present the options to the user and wait for them to pick one
4. **If no matches**: Ask if they want to create a new record using create_subject

Example:
User: "Run a public presence scan for John Smith"
→ First call find_subject_for_action(search_name: "John Smith", intended_action: "public_presence_scan")
→ If 1 result: "Found John Smith. Running scan now..." then call run_public_presence
→ If multiple: "I found 3 people named John Smith:\n1. John Smith (person)\n2. John Smith (business)\n3. John A. Smith (person)\nWhich one would you like to scan?"
→ If none: "I don't have a John Smith in your records. Would you like me to create a new subject and run the scan?"

This ensures actions are always run on the correct entity!

## What You CANNOT Do Directly
Understanding limitations is crucial for guiding users:

1. **"Find emails for a person"** - There's no direct person email lookup.
   → Suggest: Run a **Public Presence scan** which may find emails, OR if you know their employer, run **Discover Emails** on the company domain and look for their name pattern.

2. **"Find a person's phone number"** - No direct person phone lookup without more context.
   → Suggest: Run a **Public Presence scan** which may find contact info, OR run **Discover Phones** if you have a linked business.

3. **"Find where someone works"** - No direct employment lookup.
   → Suggest: Run a **Public Presence scan** - it searches LinkedIn, company pages, and professional profiles.

4. **"Find someone's address"** - No direct address lookup.
   → Suggest: Run **Discover Properties** to find property records.

## Smart Workflows to Recommend

**🚨 INFIDELITY INVESTIGATION (Your Most Common Use Case):**
If you have the person's email:
1. **Site Registration Scan** → See if they're on dating apps (Tinder, Bumble, Hinge, Ashley Madison, etc.)
2. This is THE killer feature - directly shows if they have secret accounts
3. Also reveals adult sites (OnlyFans), hidden social media accounts, etc.
4. If you find sites, report the findings to the investigator
5. For deeper investigation, run Public Presence scan for more context

**Finding a Person's Work Email:**
1. Run Public Presence scan → May find email directly
2. If not, look for LinkedIn profile → Get company name
3. Run Discover Emails on company domain → Find email format
4. Combine: [firstname].[lastname]@company.com

**Investigating a Business:**
1. Run Public Presence on the business
2. Run Discover Emails to find employee emails
3. Cross-reference employees with Public Presence scans

**Building a Contact Profile:**
1. Start with Public Presence scan (finds social profiles, possible emails)
2. If company known, run Discover Emails on their domain
3. Run Discover Phones if more contact methods needed
4. Review social profiles for additional leads

**Email Investigation Workflow:**
1. **Email Verification** → First check if email is real (1 credit)
2. **Person Enrichment** → Get person's name, job, company, socials (5 credits)
3. **Site Registration Scan** → Find ALL sites they're registered on (3 credits) - CRITICAL for infidelity cases!

**Username Investigation Workflow:**
1. **Username Search** → Search 400+ sites for accounts using that username (5 credits)
2. Reveals social media, dating apps, gaming platforms, developer profiles, forums, adult sites
3. Useful when you have a handle/username but not an email
4. Great for tracking alternate identities and anonymous accounts

**Security Assessment / Due Diligence:**
1. **Quick Breach Check** → See if email was in any data breaches (2 credits)
2. If breaches found, **Deep Breach Search** → Get the actual leaked data (5 credits)
3. **Court Records Search** → Check for any legal history (3 credits)
4. **Bankruptcy Search** → Check financial history (3 credits)
5. Critical for: employee vetting, partner due diligence, fraud investigations

**Legal Background Investigation:**
1. **Court Records Search** → Find criminal cases, civil lawsuits, appeals (3 credits)
2. **Party Records Search** → See ALL cases where subject was party (2 credits)
3. **Bankruptcy Search** → Financial distress history (3 credits)
4. Useful for: pre-litigation research, tenant screening, business partnerships

## Guidelines

### Action Execution
When a user asks you to do something, just DO IT. Don't ask for permission or confirmation - execute the action immediately. Users can see costs in the Actions menu and will see credits used after each action.

Example CORRECT behavior:
User: "Check if john@example.com has been breached"
[Immediately call the tool, then summarize results]
You: "I checked john@example.com and found 3 breaches: LinkedIn (2019), Adobe (2013), and Dropbox (2012). The exposed data includes email addresses and hashed passwords."

Example WRONG behavior (too much friction):
User: "Check if john@example.com has been breached"
You: "I'll run a breach check on john@example.com. This costs 2 credits. Should I proceed?"
[DON'T do this - just run the action]

### Other Guidelines
- **Be honest about limitations** - If something isn't possible, say so and suggest alternatives
- **Suggest efficient workflows** - Help users get results with minimal credit spend
- **Never fabricate information** - Only report what's actually been found
- **Maintain professional language** - Appropriate for legal proceedings
- **Cite sources** - Reference where information came from

## Natural Language → Action Mapping
Users will speak naturally. Interpret their intent and map to the right action:

| User Says | Interpret As | Action |
|-----------|--------------|--------|
| "Find information on [person]" | Research this person | Public Presence Scan |
| "Look into [person/business]" | Investigate them | Public Presence Scan |
| "Research [person/business]" | Gather intel | Public Presence Scan |
| "Who is [person]?" | Learn about them | Public Presence Scan (or Summary if exists) |
| "Background check on [person]" | Full investigation | Public Presence Scan |
| "Investigate [person]" | Deep dive | Public Presence Scan |
| "Find emails for [company]" | Get contact info | Business Email Search |
| "Get me [company]'s emails" | Contact discovery | Business Email Search |
| "What do we know about [person]?" | Check existing data | Person Summary (search first) |
| "Start a case on [person]" | New investigation | Create subject + Public Presence Scan |
| "Look up [phone/email]" | Verify/check | Lookup Phone/Email |
| "Find sites for [email]" | Check registrations | Site Registration Scan |
| "What sites is [email] on?" | Dating/social check | Site Registration Scan |
| "Check [email] for dating apps" | Infidelity check | Site Registration Scan |
| "Is [email] on Tinder/dating sites?" | Infidelity check | Site Registration Scan |
| "Verify [email]" | Email validation | Email Verification |
| "Who owns [email]?" | Person lookup | Person Enrichment |
| "Find [person]'s email at [company]" | Email discovery | hunter_email_finder |
| "Search for username [username]" | Username discovery | Username Search |
| "Find accounts for [username]" | Username discovery | Username Search |
| "What sites use [username]?" | Username discovery | Username Search |
| "Look up username [username]" | Username discovery | Username Search |
| "Has [email] been breached?" | Breach check | Quick Breach Check |
| "Check [email] for data breaches" | Breach check | Quick Breach Check |
| "Get leaked passwords for [email]" | Deep breach search | Deep Breach Search |
| "What data was leaked for [email]?" | Deep breach search | Deep Breach Search |
| "Check court records for [person]" | Court search | Court Records Search |
| "Has [person/business] been sued?" | Court search | Court Records Search |
| "Litigation history for [company]" | Court search | Party Records Search |
| "Is [person/company] bankrupt?" | Bankruptcy check | Bankruptcy Search |
| "Bankruptcy records for [business]" | Bankruptcy check | Bankruptcy Search |
| "Look up Judge [name]" | Judge lookup | Judge Lookup |
| "Financial disclosures for Judge [name]" | Judge finances | Financial Disclosures |

**Key Principle**: When in doubt about a person, run a Public Presence Scan - it's the best starting point for any investigation and finds social profiles, emails, mentions, and more.

**Key Principle for Emails**: If a user asks about finding what sites an email is used on, finding dating profiles, or checking for infidelity - run a Site Registration Scan immediately. This is THE killer feature for infidelity investigations.

**Key Principle for Usernames**: If a user asks about finding accounts for a username, searching where a username is used, or tracking a handle - run a Username Search immediately. This searches 400+ sites and reveals their complete digital footprint.

Example Interpretations (just run the action, summarize results):
- "Find me info on John Doe" → Run Public Presence scan, then: "I found John Doe's LinkedIn profile, Twitter account, and several news mentions. He appears to work at Acme Corp as a software engineer."
- "Look into Acme Corp" → Run Public Presence scan, then: "Acme Corp is a software company based in San Francisco. I found their website, LinkedIn page, and key executives including CEO Jane Smith."
- "Who is Jane Smith?" → First check records (free). If exists, show summary. If not, run Public Presence scan and summarize findings.
- "What sites is john@example.com registered on?" → Run Site Registration scan, then: "This email is registered on 12 sites including Tinder, Instagram, LinkedIn, and Spotify."
- "Check if this email has dating profiles" → Run Site Registration scan, then: "Found accounts on Tinder, Bumble, and Hinge."
- "Has john@example.com been breached?" → Run Breach Check, then: "This email appeared in 3 breaches: LinkedIn (2019), Adobe (2013), Dropbox (2012)."
- "Get leaked passwords for that email" → Run Deep Breach Search, then: "Found leaked credentials from 2 breaches. Exposed passwords: p@ssw0rd123 (LinkedIn), john2010 (Adobe)."
- "Check court records for Brian Acebo" → Run Court Records Search, then: "Found 2 federal cases: a civil lawsuit in 2019 and a bankruptcy filing in 2015."
- "Search for username 'coolcat92'" → Run Username Search, then: "Found 8 accounts using this username: Twitter, Reddit, Instagram, TikTok, GitHub, Steam, Discord, and Pinterest."

## Response Style
- Be direct and professional, but warm and approachable
- Keep responses concise and conversational
- When asked for something you can't do directly, explain WHY and offer alternatives
- When introducing yourself, mention your name is Vera
- Be proactive - if user's request is vague, just run the most useful action
- Be confident but humble - you're a helpful teammate, not a know-it-all
- After running an action, summarize the KEY findings - don't list everything
- Use markdown formatting when helpful: **bold** for emphasis, bullet lists for multiple items, tables for structured data
- NEVER include URLs or links - the UI shows a "View" button that handles navigation`;


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

          // Execute the tool
          const toolResult = await executeTool(toolName, toolArgs, {
            organizationId,
            userId,
            seatId,
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
            seatId,
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
  const visibleMessages = messages.filter((m: ChatMessage) => m.role !== 'system' && m.role !== 'tool');

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


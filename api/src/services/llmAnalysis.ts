/* eslint-disable @typescript-eslint/no-explicit-any */
import fetch from 'node-fetch';
import { supabase } from '../utils/supabaseClient.js';

export type LlmAnalysisResult = {
  analyzed: number;
  extractedMentions: number;
  errors: string[];
};

type DocumentForAnalysis = {
  id: string;
  text: string;
  url: string | null;
  title: string | null;
};

type ExtractedEntity = {
  type: 'email' | 'phone' | 'social_profile' | 'domain' | 'username' | 'url';
  value: string;
  confidence: number;
  context?: string;
  platform?: string;
};

type AnalysisResponse = {
  isAboutSubject: boolean;
  confidence: number;
  reasoning: string;
  entities: ExtractedEntity[];
  relationships: Array<{ from: string; to: string; type: string }>;
};

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
// Default to Anthropic Claude
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase() as 'openai' | 'anthropic';
const LLM_MODEL = process.env.LLM_MODEL || (LLM_PROVIDER === 'anthropic'
	? (process.env.CLAUDE_SONNET_MODEL || 'claude-sonnet-4-5-20250929')
	: (process.env.GPT_CONTENT_MODEL || 'gpt-4o-mini'));

/**
 * Run LLM analysis on documents for a public presence run
 * Analyzes if documents are about the subject and extracts additional entities
 */
export async function runLlmAnalysisForRun(
  runId: string,
  maxDocs: number = Number(process.env.LLM_MAX_DOCS_PER_RUN || 15)
): Promise<LlmAnalysisResult> {
  const enabled = String(process.env.LLM_ANALYSIS_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) {
    console.log('[LLM Analysis] Disabled via LLM_ANALYSIS_ENABLED');
    return { analyzed: 0, extractedMentions: 0, errors: [] };
  }

  if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
    console.log('[LLM Analysis] No API key configured (set ANTHROPIC_API_KEY)');
    return { analyzed: 0, extractedMentions: 0, errors: ['no_api_key'] };
  }

  // Get run info to find subject name
  const { data: runRow, error: runErr } = await supabase
    .from('public_presence_runs')
    .select('entity_type, entity_id, params')
    .eq('id', runId)
    .single();

  if (runErr || !runRow) {
    console.error('[LLM Analysis] Failed to load run', runErr);
    return { analyzed: 0, extractedMentions: 0, errors: ['run_not_found'] };
  }

  const subjectName = (runRow.params as any)?.fullName || '';
  if (!subjectName) {
    console.log('[LLM Analysis] No subject name in run params');
    return { analyzed: 0, extractedMentions: 0, errors: ['no_subject_name'] };
  }

  // Get documents with extracted text for this run
  const { data: docContents, error: dcErr } = await supabase
    .from('public_presence_run_items')
    .select(`
      document_id,
      documents!inner(id, canonical_url, title),
      document_contents!inner(text_content)
    `)
    .eq('run_id', runId)
    .limit(maxDocs);

  if (dcErr) {
    console.error('[LLM Analysis] Failed to load documents', dcErr);
    return { analyzed: 0, extractedMentions: 0, errors: ['doc_load_failed'] };
  }

  // Prepare documents for analysis
  const docs: DocumentForAnalysis[] = (docContents || [])
    .filter((r: any) => r.document_contents?.text_content)
    .map((r: any) => ({
      id: r.document_id,
      text: truncateText((r.document_contents as any).text_content, 4000),
      url: (r.documents as any)?.canonical_url ?? null,
      title: (r.documents as any)?.title ?? null,
    }));

  if (docs.length === 0) {
    console.log('[LLM Analysis] No documents with text content');
    return { analyzed: 0, extractedMentions: 0, errors: [] };
  }

  console.log(`[LLM Analysis] Analyzing ${docs.length} documents for "${subjectName}"`);

  let analyzed = 0;
  let extractedMentions = 0;
  const errors: string[] = [];

  // Analyze each document
  for (const doc of docs) {
    try {
      const result = await analyzeDocument(doc, subjectName);
      analyzed++;

      // Store analysis results
      if (result.entities.length > 0) {
        const mentions = result.entities.map(e => ({
          document_id: doc.id,
          entity_type: e.type,
          value_raw: e.value,
          value_normalized: e.value.toLowerCase(),
          confidence: e.confidence,
          context_snippet: e.context?.slice(0, 500) ?? null,
          source: 'llm_extraction',
          meta: {
            platform: e.platform ?? null,
            llm_model: LLM_MODEL,
            is_about_subject: result.isAboutSubject,
            subject_confidence: result.confidence,
          },
        }));

        const { error: insertErr } = await supabase
          .from('document_entity_mentions')
          .upsert(mentions, {
            onConflict: 'document_id,entity_type,value_normalized',
            ignoreDuplicates: true,
          });

        if (insertErr) {
          console.error('[LLM Analysis] Failed to insert mentions', insertErr);
        } else {
          extractedMentions += mentions.length;
        }
      }

      // Update document with analysis metadata
      await supabase
        .from('documents')
        .update({
          meta: {
            llm_analyzed: true,
            is_about_subject: result.isAboutSubject,
            subject_confidence: result.confidence,
            llm_reasoning: result.reasoning?.slice(0, 500),
          },
        })
        .eq('id', doc.id);

    } catch (e) {
      console.error(`[LLM Analysis] Error analyzing doc ${doc.id}:`, e);
      errors.push(`doc_${doc.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`[LLM Analysis] Complete: ${analyzed} analyzed, ${extractedMentions} mentions extracted`);
  return { analyzed, extractedMentions, errors };
}

async function analyzeDocument(
  doc: DocumentForAnalysis,
  subjectName: string
): Promise<AnalysisResponse> {
  const prompt = buildAnalysisPrompt(doc, subjectName);

  if (LLM_PROVIDER === 'anthropic' && ANTHROPIC_API_KEY) {
    return analyzeWithAnthropic(prompt);
  } else if (OPENAI_API_KEY) {
    return analyzeWithOpenAI(prompt);
  }

  throw new Error('No LLM API key configured');
}

function buildAnalysisPrompt(doc: DocumentForAnalysis, subjectName: string): string {
  return `You are analyzing a web page to determine if it contains information about a specific person and to extract any contact/identity information.

SUBJECT NAME: "${subjectName}"
DOCUMENT URL: ${doc.url || 'unknown'}
DOCUMENT TITLE: ${doc.title || 'unknown'}

DOCUMENT TEXT (truncated):
---
${doc.text}
---

TASKS:
1. Determine if this page is primarily ABOUT the subject (not just mentioning them)
2. Extract any contact/identity entities that likely belong to the subject
3. Note any relationships between entities

Respond in JSON format:
{
  "isAboutSubject": boolean,
  "confidence": number (0-1),
  "reasoning": "brief explanation",
  "entities": [
    {
      "type": "email" | "phone" | "social_profile" | "domain" | "username",
      "value": "extracted value",
      "confidence": number (0-1),
      "context": "surrounding text snippet",
      "platform": "linkedin/twitter/github/etc (for social_profile only)"
    }
  ],
  "relationships": [
    {"from": "entity1", "to": "entity2", "type": "associated_with/works_at/owns/etc"}
  ]
}

IMPORTANT:
- Only extract entities that appear to belong to the subject, not other people mentioned
- For social profiles, include the full URL
- Phone numbers should be in E.164 format if possible
- Be conservative - only include entities with reasonable confidence
- If the page is clearly NOT about the subject (e.g., just mentions them in a list), set isAboutSubject to false`;
}

async function analyzeWithOpenAI(prompt: string): Promise<AnalysisResponse> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: 'You are a precise entity extraction assistant. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenAI API error: ${resp.status} ${text}`);
  }

  const data = await resp.json() as any;
  const content = data.choices?.[0]?.message?.content || '{}';
  
  try {
    return JSON.parse(content) as AnalysisResponse;
  } catch {
    console.error('[LLM Analysis] Failed to parse OpenAI response:', content);
    return {
      isAboutSubject: false,
      confidence: 0,
      reasoning: 'parse_error',
      entities: [],
      relationships: [],
    };
  }
}

async function analyzeWithAnthropic(prompt: string): Promise<AnalysisResponse> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 1500,
      messages: [
        { role: 'user', content: prompt },
      ],
      system: 'You are a precise entity extraction assistant. Always respond with valid JSON only, no markdown.',
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Anthropic API error: ${resp.status} ${text}`);
  }

  const data = await resp.json() as any;
  const content = data.content?.[0]?.text || '{}';
  
  try {
    // Claude might wrap in markdown code blocks
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr) as AnalysisResponse;
  } catch {
    console.error('[LLM Analysis] Failed to parse Anthropic response:', content);
    return {
      isAboutSubject: false,
      confidence: 0,
      reasoning: 'parse_error',
      entities: [],
      relationships: [],
    };
  }
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  // Try to truncate at a word boundary
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.8) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}

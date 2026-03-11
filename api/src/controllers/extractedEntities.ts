import type { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';

/**
 * Normalize phone number to E.164 format
 * - Detects 10-digit US numbers and adds +1
 * - Handles numbers that already have country codes
 */
function normalizePhoneToE164(phone: string): string {
  // Get just the digits
  const digits = phone.replace(/\D/g, '');
  
  // If it's exactly 10 digits, assume US number and add +1
  if (digits.length === 10) {
    const firstDigit = parseInt(digits[0]);
    if (firstDigit >= 2 && firstDigit <= 9) {
      return `+1${digits}`;
    }
  }
  
  // If it's 11 digits starting with 1, it's US with country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If the original had a + and is valid length, keep format
  if (phone.startsWith('+') && digits.length >= 7 && digits.length <= 15) {
    return `+${digits}`;
  }
  
  // Otherwise return with + prefix
  return digits.length > 0 ? `+${digits}` : '';
}

export type ExtractedEntityRow = {
  entity_type: string;
  value_normalized: string;
  mention_count: number;
  latest_seen: string | null;
  docs: Array<{ document_id: string; url: string | null; title: string | null; content_type: string | null }>;
  snippets: string[];
};

export async function getExtractedEntitiesForRun(runId: string): Promise<ExtractedEntityRow[]> {
  // Load document ids for the run
  const { data: runItems, error: runErr } = await supabase
    .from('public_presence_run_items')
    .select('document_id')
    .eq('run_id', runId);
  if (runErr) throw runErr;
  const docIds = Array.from(new Set((runItems ?? []).map((r: any) => r.document_id)));
  if (docIds.length === 0) return [];

  // Load mentions for those docs
  const { data: mentions, error: mErr } = await supabase
    .from('document_entity_mentions')
    .select('document_id, entity_type, value_normalized, context_snippet, created_at')
    .in('document_id', docIds);
  if (mErr) throw mErr;

  if (!mentions || mentions.length === 0) return [];

  // Load doc details
  const { data: docs, error: dErr } = await supabase
    .from('documents')
    .select('id, canonical_url, title, mime_type')
    .in('id', docIds);
  if (dErr) throw dErr;
  const idToDoc = new Map<string, { url: string | null; title: string | null; mime: string | null }>();
  for (const d of docs ?? []) {
    const id = (d as any).id as string;
    const url = (d as any).canonical_url as string | null;
    const title = (d as any).title as string | null;
    const mime = (d as any).mime_type as string | null;
    if (id) idToDoc.set(id, { url: url ?? null, title: title ?? null, mime: mime ?? null });
  }

  type Acc = {
    count: number;
    latest: string | null;
    docIds: Set<string>;
    snippets: string[];
  };
  const agg = new Map<string, Acc>();

  for (const row of mentions) {
    const et = (row as any).entity_type as string;
    const val = (row as any).value_normalized as string;
    const did = (row as any).document_id as string;
    const created = (row as any).created_at as string | null;
    const snippet = (row as any).context_snippet as string | null;
    const key = `${et}||${val}`;
    const curr = agg.get(key) || { count: 0, latest: null, docIds: new Set<string>(), snippets: [] };
    curr.count += 1;
    if (!curr.latest || (created && created > curr.latest)) curr.latest = created ?? curr.latest;
    if (did) {
      curr.docIds.add(did);
    }
    if (snippet && curr.snippets.length < 3) curr.snippets.push(snippet);
    agg.set(key, curr);
  }

  const rows: ExtractedEntityRow[] = [];
  for (const [k, v] of agg.entries()) {
    const [entity_type, value_normalized] = k.split('||');
    const docsList = Array.from(v.docIds).map((id) => {
      const meta = idToDoc.get(id);
      return {
        document_id: id,
        url: meta?.url ?? null,
        title: meta?.title ?? null,
        content_type: meta?.mime ?? null
      };
    });
    rows.push({
      entity_type,
      value_normalized,
      mention_count: v.count,
      latest_seen: v.latest,
      docs: docsList,
      snippets: v.snippets
    });
  }

  // Sort by mention_count desc
  rows.sort((a, b) => {
    if (b.mention_count !== a.mention_count) return b.mention_count - a.mention_count;
    const la = a.latest_seen ?? '';
    const lb = b.latest_seen ?? '';
    return lb.localeCompare(la);
  });
  return rows;
}

export async function getExtractedEntitiesForRunHttp(req: Request, res: Response) {
  try {
    const runId = req.params.runId || (req.query.runId as string);
    if (!runId) return res.status(400).json({ error: { message: 'runId is required' } });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    // Optional params for pagination and filtering
    // Default: no pagination if limit is not provided
    const rawLimit = req.query.limit as string | undefined;
    let limit = 0; // 0 means no pagination
    if (rawLimit !== undefined && rawLimit !== '') {
      const parsed = parseInt(rawLimit, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        limit = Math.min(200, parsed);
      }
    }
    const rawOffset = req.query.offset as string | undefined;
    const offset = limit > 0
      ? Math.max(0, (rawOffset ? parseInt(rawOffset, 10) : 0) || 0)
      : 0;
    const entityType = ((req.query.entity_type as string) || '').toLowerCase().trim();
    const q = ((req.query.q as string) || '').toLowerCase().trim();
    const excludeDecided = ((req.query.exclude_decided as string) || '').toLowerCase().trim() === 'true';

    let rows = await getExtractedEntitiesForRun(runId);

    // Exclude decided if requested
    if (excludeDecided) {
      const { data: decisions } = await supabase
        .from('mention_decisions')
        .select('entity_type, value_normalized')
        .eq('run_id', runId);
      const excluded = new Set<string>(
        (decisions ?? []).map(
          (d: any) => `${(d.entity_type as string).toLowerCase()}||${(d.value_normalized as string).toLowerCase()}`
        )
      );
      rows = rows.filter(
        (r) => !excluded.has(`${r.entity_type.toLowerCase()}||${r.value_normalized.toLowerCase()}`)
      );
    }

    // Filter by entity type
    if (entityType) {
      rows = rows.filter((r) => r.entity_type.toLowerCase() === entityType);
    }
    // Search filter
    if (q) {
      rows = rows.filter((r) => r.value_normalized.toLowerCase().includes(q));
    }

    const total = rows.length;
    if (limit > 0) {
      const paged = rows.slice(offset, offset + limit);
      return res.json({
        ok: true,
        items: paged,
        pageInfo: { total, limit, offset, hasMore: offset + paged.length < total }
      });
    }
    // No pagination: return all
    return res.json({ ok: true, items: rows, pageInfo: { total, limit: 0, offset: 0, hasMore: false } });
  } catch (e: any) {
    console.error('getExtractedEntitiesForRun error', e);
    return res.status(500).json({ ok: false, error: { message: e?.message ?? 'Failed to load extracted entities' } });
  }
}

type SuggestedGroups = {
  email: ExtractedEntityRow[];
  domain: ExtractedEntityRow[];
  social_profile: ExtractedEntityRow[];
  phone: ExtractedEntityRow[];
  ip: ExtractedEntityRow[];
  username: ExtractedEntityRow[];
};

function isBoilerplateEmail(value: string): boolean {
  const local = (value.split('@')[0] || '').toLowerCase();
  const banned = [
    'info','support','privacy','legal','press','sales','billing','help',
    'noreply','no-reply','do-not-reply','donotreply','admin','webmaster'
  ];
  return banned.includes(local) || local.includes('no-reply') || local.includes('noreply');
}

export async function getSuggestedEntitiesForRunHttp(req: Request, res: Response) {
  try {
    const runId = req.params.runId || (req.query.runId as string);
    if (!runId) return res.status(400).json({ error: { message: 'runId is required' } });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    // Resolve org for this run
    const { data: runRow, error: runErr } = await supabase
      .from('public_presence_runs')
      .select('entity_type, entity_id')
      .eq('id', runId)
      .single();
    if (runErr || !runRow) return res.status(404).json({ error: { message: 'Run not found' } });
    const entityType = (runRow as any).entity_type as 'person' | 'business';
    const entityId = (runRow as any).entity_id as string;

    // Look up organization for the run's entity
    const table = entityType === 'person' ? 'people' : 'businesses';
    const { data: orgRow, error: orgErr } = await supabase
      .from(table)
      .select('organization_id')
      .eq('id', entityId)
      .single();
    if (orgErr || !orgRow) return res.status(400).json({ error: { message: 'Failed to resolve organization for run' } });
    const organizationId = (orgRow as any).organization_id as string | null;
    if (!organizationId) return res.status(400).json({ error: { message: 'Run entity has no organization' } });

    // Validate org access (best effort)
    try {
      const userId = (req as unknown as { user?: { id?: string } }).user?.id as string | undefined;
      if (userId) {
        const { data: seat } = await supabase
          .from('seats')
          .select('id')
          .eq('org_id', organizationId)
          .eq('user_id', userId)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();
        if (!seat) return res.status(403).json({ error: { message: 'Forbidden: seat not found for organization' } });
      }
    } catch {
      // ignore
    }

    // Load run document ids
    const { data: runItems, error: runItemsErr } = await supabase
      .from('public_presence_run_items')
      .select('document_id')
      .eq('run_id', runId);
    if (runItemsErr) throw runItemsErr;
    const docIds = Array.from(new Set((runItems ?? []).map((r: any) => r.document_id)));
    if (docIds.length === 0) {
      return res.json({
        runId,
        groups: { email: [], domain: [], social_profile: [], phone: [], ip: [], username: [] } as SuggestedGroups,
        totals: { email: 0, domain: 0, social_profile: 0, phone: 0, ip: 0, username: 0 }
      });
    }

    // Load documents meta
    const { data: docs, error: docsErr } = await supabase
      .from('documents')
      .select('id, canonical_url, title, mime_type')
      .in('id', docIds);
    if (docsErr) throw docsErr;
    const idToDoc = new Map<string, { url: string | null; title: string | null; mime: string | null }>();
    for (const d of docs ?? []) {
      idToDoc.set((d as any).id, {
        url: (d as any).canonical_url ?? null,
        title: (d as any).title ?? null,
        mime: (d as any).mime_type ?? null
      });
    }

    // Exclusions from mention_decisions
    const { data: decisions } = await supabase
      .from('mention_decisions')
      .select('entity_type, value_normalized')
      .eq('run_id', runId);
    const excluded = new Set<string>(
      (decisions ?? []).map((d: any) => `${(d.entity_type as string).toLowerCase()}||${(d.value_normalized as string).toLowerCase()}`)
    );

    // Load mentions
    const { data: mentions, error: mErr } = await supabase
      .from('document_entity_mentions')
      .select('document_id, entity_type, value_normalized, context_snippet, created_at')
      .in('document_id', docIds);
    if (mErr) throw mErr;

    type Acc = {
      type: string;
      value: string;
      count: number;
      latest: string | null;
      docIds: Set<string>;
      snippets: string[];
    };
    const agg = new Map<string, Acc>();

    for (const row of mentions ?? []) {
      const t = ((row as any).entity_type as string).toLowerCase();
      const v = ((row as any).value_normalized as string).toLowerCase();
      const did = (row as any).document_id as string;
      const created = (row as any).created_at as string | null;
      if (excluded.has(`${t}||${v}`)) continue;
      if (t === 'email' && isBoilerplateEmail(v)) continue;
      const key = `${t}||${v}`;
      const curr =
        agg.get(key) ||
        ({
          type: t,
          value: v,
          count: 0,
          latest: null,
          docIds: new Set<string>(),
          snippets: []
        } as Acc);
      curr.count += 1;
      if (!curr.latest || (created && created > curr.latest)) curr.latest = created ?? curr.latest;
      curr.docIds.add(did);
      const snip = (row as any).context_snippet as string | null;
      if (snip && curr.snippets.length < 3) curr.snippets.push(snip);
      agg.set(key, curr);
    }

    const groups: SuggestedGroups = {
      email: [],
      domain: [],
      social_profile: [],
      phone: [],
      ip: [],
      username: []
    };

    for (const [, v] of agg.entries()) {
      const docsList = Array.from(v.docIds)
        .slice(0, 10)
        .map((id) => {
          const meta = idToDoc.get(id);
          return {
            document_id: id,
            url: meta?.url ?? null,
            title: meta?.title ?? null,
            content_type: meta?.mime ?? null
          };
        });
      const row: ExtractedEntityRow = {
        entity_type: v.type,
        value_normalized: v.value,
        mention_count: v.count,
        latest_seen: v.latest,
        docs: docsList,
        snippets: v.snippets
      };
      if (v.type in groups) {
        (groups as any)[v.type].push(row);
      }
    }

    const sorter = (a: ExtractedEntityRow, b: ExtractedEntityRow) => {
      const dcA = a.docs.length;
      const dcB = b.docs.length;
      if (dcB !== dcA) return dcB - dcA;
      if (b.mention_count !== a.mention_count) return b.mention_count - a.mention_count;
      const la = a.latest_seen ?? '';
      const lb = b.latest_seen ?? '';
      return lb.localeCompare(la);
    };
    (Object.keys(groups) as Array<keyof SuggestedGroups>).forEach((k) => {
      (groups[k] as ExtractedEntityRow[]).sort(sorter);
    });

    const totals = {
      email: groups.email.length,
      domain: groups.domain.length,
      social_profile: groups.social_profile.length,
      phone: groups.phone.length,
      ip: groups.ip.length,
      username: groups.username.length
    };

    return res.json({ runId, groups, totals });
  } catch (e: any) {
    console.error('getSuggestedEntitiesForRun error', e);
    return res.status(500).json({ error: { message: e?.message ?? 'Failed to load suggested entities' } });
  }
}

// New: Top Suggestions with noise filters, thresholds, scoring and caps
export async function getTopSuggestionsForRunHttp(req: Request, res: Response) {
  try {
    const runId = req.params.runId || (req.query.runId as string);
    if (!runId) return res.status(400).json({ error: { message: 'runId is required' } });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    const { data: runItems, error: runItemsErr } = await supabase
      .from('public_presence_run_items')
      .select('document_id')
      .eq('run_id', runId);
    if (runItemsErr) throw runItemsErr;
    const docIds = Array.from(new Set((runItems ?? []).map((r: any) => r.document_id)));
    if (docIds.length === 0) {
      return res.json({
        runId,
        totals: { extractedCount: 0, topSuggestionCount: 0 },
        groups: { social_profile: [], email: [], domain: [], username: [], phone: [], ip: [] }
      });
    }

    const { data: docs, error: docsErr } = await supabase
      .from('documents')
      .select('id, canonical_url, title, mime_type')
      .in('id', docIds);
    if (docsErr) throw docsErr;
    const idToDoc = new Map<string, { url: string | null; title: string | null; mime: string | null }>();
    for (const d of docs ?? []) {
      idToDoc.set((d as any).id, {
        url: (d as any).canonical_url ?? null,
        title: (d as any).title ?? null,
        mime: (d as any).mime_type ?? null
      });
    }

    // exclude decided
    const { data: decisions } = await supabase
      .from('mention_decisions')
      .select('entity_type, value_normalized')
      .eq('run_id', runId);
    const excluded = new Set<string>(
      (decisions ?? []).map((d: any) => `${(d.entity_type as string).toLowerCase()}||${(d.value_normalized as string).toLowerCase()}`)
    );

    const { data: mentions, error: mErr } = await supabase
      .from('document_entity_mentions')
      .select('document_id, entity_type, value_normalized, context_snippet, created_at, meta')
      .in('document_id', docIds);
    if (mErr) throw mErr;

    const infraDomains = new Set([
      'googletagmanager.com', 'google-analytics.com', 'doubleclick.net',
      'gstatic.com', 'cloudfront.net', 'google.com', 'googleapis.com',
      'googleusercontent.com', 'googlesyndication.com', 'googleadservices.com',
      'cloudflare.com', 'amazonaws.com', 'fonts.googleapis.com', 'fonts.gstatic.com',
      'jquery.com', 'jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com', 'w3.org', 'schema.org'
    ]);
    const allowedSocial = new Set(['twitter','x','linkedin','instagram','facebook','tiktok','reddit','github']);

    // Resolve person name for person runs to bias social profiles
    let runPersonName: string | null = null;
    try {
      const { data: runRow } = await supabase.from('public_presence_runs').select('entity_type, entity_id').eq('id', runId).single();
      if ((runRow as any)?.entity_type === 'person' && (runRow as any)?.entity_id) {
        const { data: personRow } = await supabase.from('people').select('name').eq('id', (runRow as any).entity_id as string).single();
        const n = (personRow as any)?.name as string | undefined;
        runPersonName = n ? String(n).toLowerCase() : null;
      }
    } catch { /* ignore */ }
    const tokenizeName = (name?: string | null): string[] => {
      if (!name) return [];
      return String(name).toLowerCase().split(/[^a-z0-9]+/i).filter((t) => t.length >= 2);
    };
    const nameTokens = tokenizeName(runPersonName);
    const allTokensIn = (s: string): boolean => {
      if (nameTokens.length === 0) return false;
      const low = s.toLowerCase();
      return nameTokens.every((t) => low.includes(t));
    };
    const anyTokenIn = (s: string): boolean => {
      if (nameTokens.length === 0) return false;
      const low = s.toLowerCase();
      return nameTokens.some((t) => low.includes(t));
    };
    const keywordHit = (path: string): boolean => {
      const p = path.toLowerCase();
      return ['resume','cv','about','contact','portfolio','projects','work','blog','articles','github','linkedin','bio'].some((k) => p.includes(`/${k}`) || p.endsWith(`/${k}`));
    };
    const assetExt = new Set(['js','css','map','svg','png','jpg','jpeg','gif','webp','ico','woff','woff2','ttf','otf','eot','json']);

    type Acc = {
      type: string;
      value: string;
      count: number;
      latest: string | null;
      docIds: Set<string>;
      snippets: string[];
      platforms: Set<string>;
      hosts: Set<string>;
      // SERP tracking for boost
      fromSerp: boolean;
      bestSerpRank: number | null;
      serpTitle: string | null;
      // Confidence tracking
      maxConfidence: number;
    };
    const agg = new Map<string, Acc>();

    for (const row of mentions ?? []) {
      const t = ((row as any).entity_type as string).toLowerCase();
      const v = ((row as any).value_normalized as string).toLowerCase();
      const did = (row as any).document_id as string;
      const created = (row as any).created_at as string | null;
      if (excluded.has(`${t}||${v}`)) continue;
      if (t === 'email' && isBoilerplateEmail(v)) continue;
      if (t === 'domain') {
        const domain = v.replace(/^www\./, '');
        if (infraDomains.has(domain)) continue;
        // rudimentary invalid domain check
        if (!domain.includes('.') || domain.split('.').pop()!.length < 2) continue;
      }
      const curr = agg.get(`${t}||${v}`) || {
        type: t, value: v, count: 0, latest: null, docIds: new Set<string>(), snippets: [], platforms: new Set<string>(), hosts: new Set<string>(),
        fromSerp: false, bestSerpRank: null, serpTitle: null, maxConfidence: 0
      } as Acc;
      curr.count += 1;
      if (!curr.latest || (created && created > curr.latest)) curr.latest = created ?? curr.latest;
      curr.docIds.add(did);
      const snip = (row as any).context_snippet as string | null;
      if (snip && curr.snippets.length < 3) curr.snippets.push(snip);
      const meta = (row as any).meta as any;
      const platform = (meta?.platform as string | undefined)?.toLowerCase() ?? null;
      if (platform) curr.platforms.add(platform);
      const host = (meta?.host as string | undefined)?.toLowerCase() ?? null;
      if (host) curr.hosts.add(host.replace(/^www\./, ''));
      // Track SERP source and position
      const source = (meta?.source as string | undefined)?.toLowerCase() ?? null;
      if (source === 'google_serp' || source === 'bing_serp' || source === 'serp') {
        curr.fromSerp = true;
        const serpRank = meta?.serp_position as number | undefined;
        if (serpRank && (curr.bestSerpRank === null || serpRank < curr.bestSerpRank)) {
          curr.bestSerpRank = serpRank;
        }
        const serpTitle = meta?.serp_title as string | undefined;
        if (serpTitle && !curr.serpTitle) {
          curr.serpTitle = serpTitle;
        }
      }
      // Track max confidence
      const confidence = (row as any).confidence as number | undefined;
      if (confidence && confidence > curr.maxConfidence) {
        curr.maxConfidence = confidence;
      }
      agg.set(`${t}||${v}`, curr);
    }

    // Build candidates with thresholds and scoring
    type Candidate = ExtractedEntityRow & { score: number };
    const groups: Record<string, Candidate[]> = {
      social_profile: [],
      email: [],
      domain: [],
      username: [],
      phone: [],
      ip: [],
      document: []
    };
    let extractedCount = 0;

    const derivePlatformFromUrl = (u?: string | null): string | null => {
      if (!u) return null;
      try {
        const host = new URL(u).host.replace(/^www\./i, '').toLowerCase();
        if (host === 'x.com' || host.endsWith('twitter.com')) return 'x';
        if (host.endsWith('linkedin.com')) return 'linkedin';
        if (host.endsWith('instagram.com')) return 'instagram';
        if (host.endsWith('facebook.com')) return 'facebook';
        if (host.endsWith('tiktok.com')) return 'tiktok';
        if (host.endsWith('reddit.com')) return 'reddit';
        if (host.endsWith('github.com')) return 'github';
        return null;
      } catch { return null; }
    };

    for (const [, v] of agg.entries()) {
      const docsList = Array.from(v.docIds).slice(0, 10).map((id) => {
        const meta = idToDoc.get(id);
        return {
          document_id: id,
          url: meta?.url ?? null,
          title: meta?.title ?? null,
          content_type: meta?.mime ?? null
        };
      });
      const docCount = v.docIds.size;
      const effType = v.type === 'time' ? v.type : (v.type === 'url' ? ('document' as any) : v.type);
      const base: ExtractedEntityRow = {
        entity_type: effType as any,
        value_normalized: v.value,
        mention_count: v.count,
        latest_seen: v.latest,
        docs: docsList,
        snippets: v.snippets
      };
      extractedCount += 1;

      // Thresholds - SERP-sourced entities get relaxed filtering (Google already determined relevance)
      let passes = false;
      const isSerpSourced = v.fromSerp && v.bestSerpRank !== null;
      const isHighRankSerp = isSerpSourced && v.bestSerpRank !== null && v.bestSerpRank <= 10;
      
      if (v.type === 'social_profile') {
        // determine platform if not in meta
        let pDetected: string | null = null;
        if (v.platforms.size > 0) {
          for (const p of v.platforms) { pDetected = p; break; }
        } else {
          // derive from first doc URL or value itself
          pDetected = derivePlatformFromUrl(docsList[0]?.url) || derivePlatformFromUrl(v.value);
        }
        if (pDetected && allowedSocial.has(pDetected)) {
          // SERP-sourced social profiles: Google already determined relevance, relax name match
          if (isHighRankSerp) {
            // Top 10 SERP result - trust Google's relevance, only require docCount >= 1
            passes = docCount >= 1;
          } else if (['linkedin','github','instagram','facebook','twitter','x'].includes(pDetected) && nameTokens.length > 0) {
            // Non-SERP or low-rank: require name match
            const titleJoined = (docsList.map((d) => d.title ?? '').join(' ') + ' ' + (v.serpTitle ?? '')).toLowerCase();
            const nameMatch = anyTokenIn(v.value) || anyTokenIn(titleJoined);
            passes = nameMatch && (docCount >= 1);
          } else {
            passes = docCount >= 1;
          }
        } else {
          passes = false; // treat as generic url -> exclude from top suggestions
        }
      } else if (['email','domain','username','phone','ip'].includes(v.type)) {
        // SERP-sourced entities bypass strict docCount requirements
        if (isSerpSourced) {
          passes = true; // SERP already validated relevance
        } else if (v.type === 'domain' && nameTokens.length > 0) {
          const dom = v.value.replace(/^www\./, '');
          const domMatch = anyTokenIn(dom) || dom.includes(nameTokens.join(''));
          passes = domMatch || docCount >= 2 || v.count >= 3;
        } else if (v.type === 'username' && nameTokens.length > 0) {
          passes = anyTokenIn(v.value) || v.count >= 2 || docCount >= 1;
        } else {
          // Relaxed: docCount >= 1 OR count >= 2 (was docCount >= 2 OR count >= 3)
          passes = docCount >= 1 || v.count >= 2;
        }
      } else if (v.type === 'url') {
        // treat URL as document candidate: require at least one doc and filter infra hosts and obvious assets
        let okHost = false;
        let strongName = false;
        let keyword = false;
        let isAsset = false;
        try {
          const host = new URL(v.value).host.replace(/^www\./, '').toLowerCase();
          const path = new URL(v.value).pathname || '/';
          const pathLower = path.toLowerCase();
          const lastDot = pathLower.lastIndexOf('.');
          const ext = lastDot > 0 ? pathLower.slice(lastDot + 1) : '';
          isAsset = ext ? assetExt.has(ext) && ext !== 'pdf' : false;
          const infra = new Set(['googletagmanager.com','google-analytics.com','doubleclick.net','gstatic.com','cloudfront.net']);
          okHost = !infra.has(host);
          strongName = allTokensIn(`${host}${pathLower}`) || allTokensIn(v.value);
          keyword = keywordHit(pathLower);
        } catch {
          okHost = false;
        }
        const titleJoined = (docsList.map((d) => d.title ?? '').join(' ')).toLowerCase();
        const snippetJoined = (v.snippets ?? []).join(' ').toLowerCase();
        const weakName = anyTokenIn(titleJoined) || anyTokenIn(snippetJoined) || anyTokenIn(v.value);
        // Accept if not an asset and either name- or keyword-signal is present
        passes = !!okHost && !isAsset && (docCount >= 1) && (strongName || weakName || keyword);
      } else {
        passes = false;
      }
      if (!passes) continue;

      // Score (multi-factor weighted scoring)
      let score = 0;
      
      // Base: document count and mention frequency
      score += docCount * 3;
      score += Math.min(v.count, 10);
      
      // Entity type value (PI-relevant types weighted higher)
      const typeBoosts: Record<string, number> = { social_profile: 5, email: 4, phone: 4, domain: 3, username: 2, ip: 2, url: 1 };
      score += typeBoosts[v.type] ?? 0;
      
      // SERP position boost (search engine already determined relevance)
      if (v.fromSerp && v.bestSerpRank !== null) {
        if (v.bestSerpRank <= 3) score += 12;
        else if (v.bestSerpRank <= 5) score += 8;
        else if (v.bestSerpRank <= 10) score += 5;
        else score += 2;
        score += 3;  // Base SERP source bonus
      }
      
      // Platform authority boost for social profiles
      if (v.type === 'social_profile') {
        let pDet: string | null = null;
        if (v.platforms.size > 0) { for (const p of v.platforms) { pDet = p; break; } }
        else { pDet = derivePlatformFromUrl(v.value); }
        const platformBoosts: Record<string, number> = { linkedin: 6, github: 5, twitter: 4, x: 4, facebook: 3, instagram: 3, tiktok: 2, reddit: 2 };
        score += platformBoosts[pDet ?? ''] ?? 0;
      }
      
      // Name matching boost
      const scoreTitleJoined = (docsList.map((d) => d.title ?? '').join(' ') + ' ' + (v.serpTitle ?? '')).toLowerCase();
      const scoreSnippetJoined = (v.snippets ?? []).join(' ').toLowerCase();
      if (nameTokens.length > 0) {
        if (allTokensIn(v.value)) score += 6;
        else if (anyTokenIn(v.value)) score += 3;
        if (allTokensIn(scoreTitleJoined)) score += 5;
        else if (anyTokenIn(scoreTitleJoined)) score += 2;
        if (anyTokenIn(scoreSnippetJoined)) score += 2;
      }
      
      // Keyword boost for URLs
      if (v.type === 'url') {
        try { const p = new URL(v.value).pathname || '/'; if (keywordHit(p)) score += 4; } catch { /* ignore */ }
      }
      
      // Confidence boost
      if (v.maxConfidence >= 0.9) score += 3;
      else if (v.maxConfidence >= 0.7) score += 2;
      else if (v.maxConfidence >= 0.5) score += 1;

      const cand: Candidate = Object.assign({ score }, base);
      const bucket = (effType in groups) ? (effType as keyof typeof groups) : (v.type as keyof typeof groups);
      (groups as any)[bucket].push(cand);
    }

    // Keep both domain and page-level document candidates to mirror crawler behavior.

    // Sort and cap per type
    const caps: Record<string, number> = {
      social_profile: 20,
      email: 30,
      domain: 30,
      username: 20,
      phone: 10,
      ip: 10,
      document: 15
    };
    const sorter = (a: Candidate, b: Candidate) => {
      if (b.score !== a.score) return b.score - a.score;
      const la = a.latest_seen ?? '';
      const lb = b.latest_seen ?? '';
      return lb.localeCompare(la);
    };
    (Object.keys(groups) as Array<keyof typeof groups>).forEach((k) => {
      groups[k] = groups[k].sort(sorter).slice(0, caps[k]);
    });

    const topSuggestionCount = (Object.values(groups) as Candidate[][]).reduce((acc, arr) => acc + arr.length, 0);

    return res.json({
      runId,
      totals: { extractedCount, topSuggestionCount },
      groups
    });
  } catch (e: any) {
    console.error('getTopSuggestionsForRun error', e);
    return res.status(500).json({ error: { message: e?.message ?? 'Failed to load top suggestions' } });
  }
}

// Optional AI suggestions – stub if no model configured
export async function postAiSuggestForRunHttp(req: Request, res: Response) {
  try {
    const runId = req.params.runId || (req.query.runId as string);
    if (!runId) return res.status(400).json({ error: { message: 'runId is required' } });
    const maxItemsRequested = (req.body?.maxItems as number) || 30;
    const maxItems = Math.max(10, Math.min(40, maxItemsRequested));

    // Build the same top suggestions set (duplicated core of getTopSuggestionsForRunHttp)
    const { data: runItems } = await supabase
      .from('public_presence_run_items')
      .select('document_id')
      .eq('run_id', runId);
    const docIds = Array.from(new Set((runItems ?? []).map((r: any) => r.document_id)));
    if (docIds.length === 0) {
      return res.json({
        runId,
        ai: { model: null, generated_at: new Date().toISOString(), results: {} }
      });
    }

    const { data: docs } = await supabase
      .from('documents')
      .select('id, canonical_url, title, mime_type')
      .in('id', docIds);
    const idToDoc = new Map<string, { url: string | null; title: string | null; mime: string | null }>();
    for (const d of docs ?? []) {
      idToDoc.set((d as any).id, {
        url: (d as any).canonical_url ?? null,
        title: (d as any).title ?? null,
        mime: (d as any).mime_type ?? null
      });
    }

    const { data: decisions } = await supabase
      .from('mention_decisions')
      .select('entity_type, value_normalized')
      .eq('run_id', runId);
    const excluded = new Set<string>(
      (decisions ?? []).map((d: any) => `${(d.entity_type as string).toLowerCase()}||${(d.value_normalized as string).toLowerCase()}`)
    );

    const { data: mentions } = await supabase
      .from('document_entity_mentions')
      .select('document_id, entity_type, value_normalized, context_snippet, created_at, meta')
      .in('document_id', docIds);

    const infraDomains = new Set([
      'googletagmanager.com', 'google-analytics.com', 'doubleclick.net',
      'gstatic.com', 'cloudfront.net'
    ]);
    const allowedSocial = new Set(['twitter','x','linkedin','instagram','facebook','tiktok','reddit','github']);

    type Acc = {
      type: string;
      value: string;
      count: number;
      latest: string | null;
      docIds: Set<string>;
      snippets: string[];
      platforms: Set<string>;
      hosts: Set<string>;
    };
    const agg = new Map<string, Acc>();
    // local candidate type for scoring in this handler
    type Candidate = ExtractedEntityRow & { score: number };
    for (const row of mentions ?? []) {
      const t = ((row as any).entity_type as string).toLowerCase();
      const v = ((row as any).value_normalized as string).toLowerCase();
      const did = (row as any).document_id as string;
      const created = (row as any).created_at as string | null;
      if (excluded.has(`${t}||${v}`)) continue;
      if (t === 'email' && isBoilerplateEmail(v)) continue;
      if (t === 'domain') {
        const domain = v.replace(/^www\./, '');
        if (infraDomains.has(domain)) continue;
        if (!domain.includes('.') || domain.split('.').pop()!.length < 2) continue;
      }
      const curr = agg.get(`${t}||${v}`) || {
        type: t,
        value: v,
        count: 0,
        latest: null,
        docIds: new Set<string>(),
        snippets: [],
        platforms: new Set<string>(),
        hosts: new Set<string>()
      } as Acc;
      curr.count += 1;
      if (!curr.latest || (created && created > curr.latest)) curr.latest = created ?? curr.latest;
      curr.docIds.add(did);
      const snip = (row as any).context_snippet as string | null;
      if (snip && curr.snippets.length < 3) curr.snippets.push(snip);
      const meta = (row as any).meta as any;
      const platform = (meta?.platform as string | undefined)?.toLowerCase() ?? null;
      if (platform) curr.platforms.add(platform);
      agg.set(`${t}||${v}`, curr);
    }

    const derivePlatformFromUrl = (u?: string | null): string | null => {
      if (!u) return null;
      try {
        const host = new URL(u).host.replace(/^www\./i, '').toLowerCase();
        if (host === 'x.com' || host.endsWith('twitter.com')) return 'x';
        if (host.endsWith('linkedin.com')) return 'linkedin';
        if (host.endsWith('instagram.com')) return 'instagram';
        if (host.endsWith('facebook.com')) return 'facebook';
        if (host.endsWith('tiktok.com')) return 'tiktok';
        if (host.endsWith('reddit.com')) return 'reddit';
        if (host.endsWith('github.com')) return 'github';
        return null;
      } catch { return null; }
    };

    // Build candidates with thresholds and scoring
    const groups: Record<string, Candidate[]> = {
      social_profile: [],
      email: [],
      domain: [],
      username: [],
      phone: [],
      ip: [],
      document: []
    };
    for (const [, v] of agg.entries()) {
      const docsList = Array.from(v.docIds).slice(0, 10).map((id) => {
        const meta = idToDoc.get(id);
        return {
          document_id: id,
          url: meta?.url ?? null,
          title: meta?.title ?? null,
          content_type: meta?.mime ?? null
        };
      });
      const docCount = v.docIds.size;
      const outType = (v.type === 'url' ? 'document' : v.type);
      const base: ExtractedEntityRow = {
        entity_type: outType as any,
        value_normalized: v.value,
        mention_count: v.count,
        latest_seen: v.latest,
        docs: docsList,
        snippets: v.snippets
      };
      // Thresholds
      let passes = false;
      if (v.type === 'social_profile') {
        let pDetected: string | null = null;
        if (v.platforms.size > 0) {
          for (const p of v.platforms) { pDetected = p; break; }
        } else {
          pDetected = derivePlatformFromUrl(docsList[0]?.url);
        }
        if (pDetected && allowedSocial.has(pDetected)) {
          passes = docCount >= 1;
        } else {
          passes = false;
        }
      } else if (['email','domain','username','phone','ip'].includes(v.type)) {
        passes = docCount >= 2 || v.count >= 3;
      } else if (v.type === 'url') {
        // treat URL mentions as document candidates; require non-infra host and at least one doc reference
        try {
          const u = new URL(v.value);
          const host = u.host.replace(/^www\./, '').toLowerCase();
          const infra = new Set(['googletagmanager.com','google-analytics.com','doubleclick.net','gstatic.com','cloudfront.net']);
          passes = !infra.has(host) && docCount >= 1;
        } catch {
          passes = false;
        }
      } else {
        passes = false;
      }
      if (!passes) continue;
      let score = docCount * 3 + v.count;
      if (v.type === 'social_profile') score += 3;
      else if (v.type === 'email') score += 2;
      else if (v.type === 'domain') score += 1;
      else if (v.type === 'url') score += 2;
      const cand: Candidate = Object.assign({ score }, base);
      (groups as any)[outType].push(cand);
    }

    // Sort & cap per type like top suggestions
    const caps: Record<string, number> = {
      social_profile: 20,
      email: 30,
      domain: 30,
      username: 20,
      phone: 10,
      ip: 10
    };
    const sorter = (a: Candidate, b: Candidate) => {
      if (b.score !== a.score) return b.score - a.score;
      const la = a.latest_seen ?? '';
      const lb = b.latest_seen ?? '';
      return lb.localeCompare(la);
    };
    (Object.keys(groups) as Array<keyof typeof groups>).forEach((k) => {
      groups[k] = groups[k].sort(sorter).slice(0, caps[k]);
    });

    const flat: Candidate[] = [
      ...groups.social_profile,
      ...groups.email,
      ...groups.domain,
      ...groups.username,
      ...groups.phone,
      ...groups.ip
    ].slice(0, maxItems);

    const contexts = flat.map((c) => {
      const hostnames = Array.from(
        new Set(
          (c.docs || [])
            .map((d) => {
              try {
                return d.url ? new URL(d.url).host.replace(/^www\./i, '').toLowerCase() : null;
              } catch {
                return null;
              }
            })
            .filter(Boolean) as string[]
        )
      );
      return {
        key: `${c.entity_type}::${c.value_normalized}`.toLowerCase(),
        entity_type: c.entity_type,
        value_normalized: c.value_normalized,
        mention_count: c.mention_count,
        doc_count: (c.docs || []).length,
        hostnames,
        snippets: (c.snippets || []).slice(0, 2)
      };
    });

    // Use Anthropic Claude for AI suggestions
    const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    const model = process.env.CLAUDE_SONNET_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
    if (!anthropicKey) {
      return res.json({
        runId,
        ai: { model: null, generated_at: new Date().toISOString(), results: {} }
      });
    }

    const systemPrompt = `You are assisting a privacy investigator triaging extracted entities from web documents.
For each candidate, assign:
- confidence: HIGH, MED, or LOW
- rationale: 1–2 sentences explaining why it is likely relevant to the subject
- flags: optional array like ["noise"] when likely irrelevant or belongs to someone else

Consider:
- Social profiles on major platforms (LinkedIn, GitHub, Twitter) are HIGH confidence if they appear in multiple docs or match the subject's name
- Email addresses from reputable sources are HIGH confidence
- Phone numbers require context - HIGH if from official sources, LOW if from spam/directory sites
- Domains that match the subject's name or company are HIGH confidence
- Flag as "noise" anything that appears generic, belongs to someone else, or is clearly unrelated

Return ONLY valid JSON (no markdown) mapping keys "<entity_type>::<value>" to {confidence, rationale, flags}.`;

    const userContent = JSON.stringify({
      instruction: 'Score the following candidates. Only include keys you recognize.',
      candidates: contexts
    });

    let results: Record<string, { confidence?: 'HIGH' | 'MED' | 'LOW'; rationale?: string; flags?: string[] }> = {};
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userContent }
          ]
        })
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Claude HTTP ${resp.status}: ${txt}`);
      }
      const data = await resp.json() as any;
      const content = data?.content?.[0]?.text ?? '{}';
      // Claude might wrap in markdown code blocks
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      results = parsed.results ?? parsed;
    } catch (err) {
      console.warn('AI suggest call failed; falling back to empty results', err);
      results = {};
    }

    return res.json({
      runId,
      model,
      maxItems,
      cached: false,
      suggestionsHash: null,
      results,
      ai: { model, generated_at: new Date().toISOString(), results }
    });
  } catch (e: any) {
    console.error('postAiSuggestForRun error', e);
    return res.status(500).json({ error: { message: e?.message ?? 'AI suggest failed' } });
  }
}

export async function postMentionDecisionHttp(req: Request, res: Response) {
  try {
    const runId = req.params.runId || (req.query.runId as string);
    if (!runId) return res.status(400).json({ error: { message: 'runId is required' } });
    const body = (req.body || {}) as {
      entity_type?: string;
      value_normalized?: string;
      decision?: 'ignored' | 'promoted' | string;
      note?: string | null;
    };
    const entity_type = (body.entity_type || '').toLowerCase().trim();
    const value_normalized = (body.value_normalized || '').toLowerCase().trim();
    const decision = (body.decision || '').toLowerCase().trim() as 'ignored' | 'promoted';
    const note = (body.note ?? null) as string | null;
    if (!entity_type || !value_normalized || !decision) {
      return res.status(400).json({ error: { message: 'entity_type, value_normalized and decision are required' } });
    }

    // Resolve run and org
    const { data: runRow, error: runErr } = await supabase
      .from('public_presence_runs')
      .select('entity_type, entity_id')
      .eq('id', runId)
      .single();
    if (runErr || !runRow) return res.status(404).json({ error: { message: 'Run not found' } });
    const et = (runRow as any).entity_type as 'person' | 'business';
    const eid = (runRow as any).entity_id as string;
    const table = et === 'person' ? 'people' : 'businesses';
    const { data: orgRow, error: orgErr } = await supabase
      .from(table)
      .select('organization_id')
      .eq('id', eid)
      .single();
    if (orgErr || !orgRow) return res.status(400).json({ error: { message: 'Failed to resolve organization for run' } });
    const organization_id = (orgRow as any).organization_id as string | null;
    if (!organization_id) return res.status(400).json({ error: { message: 'Run entity has no organization' } });

    // Validate seat in org if user available
    let decided_by: string | null = null;
    try {
      const userId = (req as unknown as { user?: { id?: string } }).user?.id as string | undefined;
      if (userId) {
        const { data: seat } = await supabase
          .from('seats')
          .select('id')
          .eq('org_id', organization_id)
          .eq('user_id', userId)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();
        if (!seat) return res.status(403).json({ error: { message: 'Forbidden: seat not found for organization' } });
        decided_by = userId;
      }
    } catch {
      // ignore, allow system/service users
    }

    // Upsert decision
    const { error: upErr } = await supabase
      .from('mention_decisions')
      .upsert(
        {
          organization_id,
          run_id: runId,
          entity_type,
          value_normalized,
          decision,
          decided_by,
          note: note ?? null
        } as Record<string, unknown>,
        { onConflict: 'organization_id,run_id,entity_type,value_normalized' }
      );
    if (upErr) {
      return res.status(500).json({ ok: false, error: { message: upErr.message } });
    }
    return res.json({ ok: true });
  } catch (e: any) {
    console.error('postMentionDecision error', e);
    return res.status(500).json({ ok: false, error: { message: e?.message ?? 'Failed to save decision' } });
  }
}

function derivePlatformFromUrl(u?: string | null): string | null {
  if (!u) return null;
  try {
    const host = new URL(u).host.replace(/^www\./i, '').toLowerCase();
    if (host.endsWith('twitter.com') || host === 'x.com') return 'twitter';
    if (host.endsWith('linkedin.com')) return 'linkedin';
    if (host.endsWith('instagram.com')) return 'instagram';
    if (host.endsWith('facebook.com')) return 'facebook';
    if (host.endsWith('tiktok.com')) return 'tiktok';
    if (host.endsWith('reddit.com')) return 'reddit';
    if (host.endsWith('github.com')) return 'github';
    return host;
  } catch {
    return null;
  }
}

function deriveHandleFromUrl(u?: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return null;
    const host = url.host.replace(/^www\./i, '').toLowerCase();
    if (host === 'x.com' || host.endsWith('twitter.com')) {
      return parts[0].replace(/^@/, '').toLowerCase();
    }
    if (host.endsWith('linkedin.com')) {
      if (parts[0] === 'in' || parts[0] === 'company') return (parts[1] || '').toLowerCase();
      return parts[0].toLowerCase();
    }
    return parts[0].replace(/^@/, '').toLowerCase();
  } catch {
    return null;
  }
}

export async function postPromoteEntityHttp(req: Request, res: Response) {
  try {
    const runId = req.params.runId || (req.query.runId as string);
    if (!runId) return res.status(400).json({ error: { message: 'runId is required' } });
    const body = (req.body || {}) as { entity_type?: string; value_normalized?: string };
    const entity_type = (body.entity_type || '').toLowerCase().trim();
    const value_normalized = (body.value_normalized || '').toLowerCase().trim();
    if (!entity_type || !value_normalized) {
      return res.status(400).json({ error: { message: 'entity_type and value_normalized are required' } });
    }

    // Resolve run & organization
    const { data: runRow, error: runErr } = await supabase
      .from('public_presence_runs')
      .select('entity_type, entity_id')
      .eq('id', runId)
      .single();
    if (runErr || !runRow) return res.status(404).json({ error: { message: 'Run not found' } });
    const parentType = (runRow as any).entity_type as 'person' | 'business';
    const parentId = (runRow as any).entity_id as string;
    const parentTable = parentType === 'person' ? 'people' : 'businesses';
    const { data: orgRow, error: orgErr } = await supabase
      .from(parentTable)
      .select('organization_id')
      .eq('id', parentId)
      .single();
    if (orgErr || !orgRow) return res.status(400).json({ error: { message: 'Failed to resolve organization for run' } });
    const organization_id = (orgRow as any).organization_id as string | null;
    if (!organization_id) return res.status(400).json({ error: { message: 'Run entity has no organization' } });

    // Org access best-effort
    try {
      const userId = (req as unknown as { user?: { id?: string } }).user?.id as string | undefined;
      if (userId) {
        const { data: seat } = await supabase
          .from('seats')
          .select('id')
          .eq('org_id', organization_id)
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();
        if (!seat) return res.status(403).json({ error: { message: 'Forbidden: seat not found for organization' } });
      }
    } catch { /* ignore */ }

    // 2) Fetch up to 25 mentions for this candidate within the run
    const { data: mentionRows, error: mErr } = await supabase
      .from('document_entity_mentions')
      .select('id, document_id, context_snippet, meta:meta, entity_type, value_normalized')
      .in(
        'document_id',
        (
          await supabase
            .from('public_presence_run_items')
            .select('document_id')
            .eq('run_id', runId)
        ).data?.map((r: any) => r.document_id) ?? []
      )
      .eq('entity_type', entity_type === 'document' ? 'url' : (entity_type as string))
      .eq('value_normalized', value_normalized)
      .limit(25);
    if (mErr) return res.status(500).json({ error: { message: mErr.message } });
    const mentions = mentionRows ?? [];

    // Map docId -> url
    const docIds = Array.from(new Set(mentions.map((m) => (m as any).document_id as string)));
    const { data: docs, error: dErr } = await supabase
      .from('documents')
      .select('id, canonical_url')
      .in('id', docIds);
    if (dErr) return res.status(500).json({ error: { message: dErr.message } });
    const urlById = new Map<string, string>((docs ?? []).map((d) => [(d as any).id as string, ((d as any).canonical_url as string) ?? '']));

    // 3) Upsert into correct entity table
    let entity_id: string | null = null;
    if (entity_type === 'email') {
      const domain = value_normalized.includes('@') ? value_normalized.split('@')[1] : null;
      const { data, error } = await supabase
        .from('emails')
        .upsert({ organization_id, address: value_normalized, domain }, { onConflict: 'organization_id,address' })
        .select('id')
        .single();
      if (error) return res.status(500).json({ error: { message: error.message } });
      entity_id = (data?.id as string) ?? null;
    } else if (entity_type === 'domain') {
      const { data, error } = await supabase
        .from('domains')
        .upsert({ organization_id, name: value_normalized }, { onConflict: 'organization_id,name' })
        .select('id')
        .single();
      if (error) return res.status(500).json({ error: { message: error.message } });
      entity_id = (data?.id as string) ?? null;
    } else if (entity_type === 'phone') {
      // Normalize phone number to E.164 format (adds +1 for US numbers)
      const normalizedPhone = normalizePhoneToE164(value_normalized);
      const { data, error } = await supabase
        .from('phones')
        .upsert({ organization_id, number_e164: normalizedPhone }, { onConflict: 'organization_id,number_e164' })
        .select('id')
        .single();
      if (error) return res.status(500).json({ error: { message: error.message } });
      entity_id = (data?.id as string) ?? null;
    } else if (entity_type === 'ip') {
      const { data, error } = await supabase
        .from('ip_addresses')
        .upsert({ organization_id, address: value_normalized, ip: { address: value_normalized } }, { onConflict: 'organization_id,address' })
        .select('id')
        .single();
      if (error) return res.status(500).json({ error: { message: error.message } });
      entity_id = (data?.id as string) ?? null;
    } else if (entity_type === 'username') {
      const { data, error } = await supabase
        .from('usernames')
        .upsert({ organization_id, value: value_normalized }, { onConflict: 'organization_id,value' })
        .select('id')
        .single();
      if (error) return res.status(500).json({ error: { message: error.message } });
      entity_id = (data?.id as string) ?? null;
    } else if (entity_type === 'social_profile') {
      // Attempt to derive handle/platform from first mention url (preserve original casing)
      const firstUrl = urlById.get(docIds[0] ?? '') ?? null;
      const platform = derivePlatformFromUrl(firstUrl) ?? 'unknown';
      const handle = deriveHandleFromUrl(firstUrl) ?? value_normalized;
      
      // Check if a matching profile already exists (case-insensitive)
      const { data: existingProfile } = await supabase
        .from('social_profiles')
        .select('id')
        .eq('organization_id', organization_id)
        .ilike('platform', platform)
        .ilike('handle', handle)
        .maybeSingle();
      
      if (existingProfile) {
        // Profile already exists, just use it
        entity_id = (existingProfile as { id: string }).id;
      } else {
        const { data, error } = await supabase
          .from('social_profiles')
          .insert({
            organization_id,
            platform,
            handle,
            profile_url: firstUrl ?? null
          })
          .select('id')
          .single();
        if (error) {
          // Check if it's a duplicate key error
          if (error.code === '23505') {
            return res.status(409).json({ 
              error: { 
                message: `A social profile with platform "${platform}" and handle "${handle}" already exists.`,
                code: 'DUPLICATE_RECORD'
              } 
            });
          }
          return res.status(500).json({ error: { message: error.message } });
        }
        entity_id = (data?.id as string) ?? null;
      }
    } else if (entity_type === 'document') {
      // Promote document by URL (value_normalized)
      let docId: string | null = null;
      const { data: existingDoc } = await supabase
        .from('documents')
        .select('id')
        .eq('canonical_url', value_normalized)
        .maybeSingle();
      if (existingDoc?.id) {
        docId = (existingDoc as any).id as string;
      } else {
        const { data: insDoc, error: insErr } = await supabase
          .from('documents')
          .insert({
            organization_id,
            canonical_url: value_normalized,
            source_url: value_normalized,
            doc: { type: 'web' },
            retrieved_at: new Date().toISOString()
          } as Record<string, unknown>)
          .select('id')
          .single();
        if (insErr) return res.status(500).json({ error: { message: insErr.message } });
        docId = (insDoc as any)?.id ?? null;
      }
      if (!docId) return res.status(500).json({ error: { message: 'Failed to create or resolve document_id' } });
      entity_id = docId;
    } else {
      return res.status(400).json({ error: { message: `Unsupported entity_type: ${entity_type}` } });
    }

    if (!entity_id) return res.status(500).json({ error: { message: 'Failed to create or resolve entity_id' } });

    // 4) Link run → entity
    await supabase
      .from('run_entities')
      .insert({ run_id: runId, entity_type, entity_id })
      .select('run_id')
      .maybeSingle();

    // 5) Insert evidence rows
    const evidenceRows = mentions.map((m) => {
      const mid = (m as any).id as string;
      const did = (m as any).document_id as string;
      const snippet = ((m as any).context_snippet as string | null) ?? null;
      const url = urlById.get(did) ?? null;
      return {
        organization_id,
        entity_type,
        entity_id,
        run_id: runId,
        document_id: did,
        mention_id: mid,
        context_snippet: snippet,
        source_url: url
      } as Record<string, unknown>;
    });
    if (evidenceRows.length > 0) {
      await supabase.from('entity_evidence').upsert(evidenceRows, {
        onConflict: 'organization_id,entity_type,entity_id,run_id,document_id,mention_id'
      });
    }

    // 6) Upsert decision='promoted'
    await supabase
      .from('mention_decisions')
      .upsert(
        {
          organization_id,
          run_id: runId,
          entity_type,
          value_normalized,
          decision: 'promoted'
        } as Record<string, unknown>,
        { onConflict: 'organization_id,run_id,entity_type,value_normalized' }
      );

    return res.json({ ok: true, entity_type, entity_id, evidence_added: evidenceRows.length });
  } catch (e: any) {
    console.error('postPromoteEntity error', e);
    return res.status(500).json({ ok: false, error: { message: e?.message ?? 'Failed to promote entity' } });
  }
}

export async function postLinkEntityToPersonHttp(req: Request, res: Response) {
  try {
    const runId = req.params.runId || (req.query.runId as string);
    if (!runId) return res.status(400).json({ error: { message: 'runId is required' } });
    const body = (req.body || {}) as { entity_type?: string; value_normalized?: string };
    const entity_type = (body.entity_type || '').toLowerCase().trim();
    const value_normalized = (body.value_normalized || '').toLowerCase().trim();
    if (!entity_type || !value_normalized) {
      return res.status(400).json({ error: { message: 'entity_type and value_normalized are required' } });
    }

    // Resolve run person and org
    const { data: runRow, error: runErr } = await supabase
      .from('public_presence_runs')
      .select('entity_type, entity_id')
      .eq('id', runId)
      .single();
    if (runErr || !runRow) return res.status(404).json({ error: { message: 'Run not found' } });
    if ((runRow as any).entity_type !== 'person') {
      return res.status(400).json({ error: { message: 'Only person runs support linking' } });
    }
    const personId = (runRow as any).entity_id as string;
    const { data: orgRow, error: orgErr } = await supabase
      .from('people')
      .select('organization_id')
      .eq('id', personId)
      .single();
    if (orgErr || !orgRow) return res.status(400).json({ error: { message: 'Failed to resolve organization for person' } });
    const organization_id = (orgRow as any).organization_id as string | null;
    if (!organization_id) return res.status(400).json({ error: { message: 'Person has no organization' } });

    let entityId: string | null = null;
    const nowIso = new Date().toISOString();
    
    // Helper to create entity_edge (consistent linking for all entity types)
    const createEdgeIfNotExists = async (targetType: string, targetId: string) => {
      const { data: existing } = await supabase
        .from('entity_edges')
        .select('id')
        .eq('source_type', 'person')
        .eq('source_id', personId)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .maybeSingle();
      if (!existing) {
        await supabase.from('entity_edges').insert({
          source_type: 'person',
          source_id: personId,
          target_type: targetType,
          target_id: targetId,
          transform_type: 'extraction',
          confidence_score: 0.8,
          source_api: 'entity_extraction',
          metadata: { run_id: runId },
          retrieved_at: nowIso
        });
      }
    };
    
    if (entity_type === 'email') {
      const { data } = await supabase.from('emails').select('id').eq('organization_id', organization_id).eq('address', value_normalized).maybeSingle();
      entityId = (data as any)?.id ?? null;
      if (!entityId) return res.status(404).json({ error: { message: 'Email not found; promote first' } });
      await createEdgeIfNotExists('email', entityId);
    } else if (entity_type === 'phone') {
      // Normalize phone number to E.164 format for lookup
      const normalizedPhone = normalizePhoneToE164(value_normalized);
      const { data } = await supabase.from('phones').select('id').eq('organization_id', organization_id).eq('number_e164', normalizedPhone).maybeSingle();
      entityId = (data as any)?.id ?? null;
      if (!entityId) return res.status(404).json({ error: { message: 'Phone not found; promote first' } });
      await createEdgeIfNotExists('phone', entityId);
    } else if (entity_type === 'social_profile') {
      const { data } = await supabase.from('social_profiles').select('id').eq('organization_id', organization_id).eq('handle', value_normalized).maybeSingle();
      entityId = (data as any)?.id ?? null;
      if (!entityId) return res.status(404).json({ error: { message: 'Social profile not found; promote first' } });
      await createEdgeIfNotExists('social_profile', entityId);
    } else if (entity_type === 'domain') {
      // Normalize domain (strip scheme/path/leading www, lowercase)
      const normalizeDomain = (input: string): string => {
        let s = input.trim().toLowerCase();
        try {
          if (!/^https?:\/\//.test(s)) s = `http://${s}`;
          const u = new URL(s);
          s = u.hostname;
        } catch {
          // best-effort: remove path after slash
          const slash = s.indexOf('/');
          if (slash > 0) s = s.slice(0, slash);
        }
        return s.replace(/^www\./, '');
      };
      const domName = normalizeDomain(value_normalized);
      // Try org-scoped, case-insensitive
      let found = await supabase.from('domains').select('id').eq('organization_id', organization_id).ilike('name', domName).maybeSingle();
      if (!found?.data) {
        // Try unscoped (some existing rows may not have org set)
        found = await supabase.from('domains').select('id').ilike('name', domName).maybeSingle();
      }
      if (!found?.data) {
        // Create if still not found
        const ins = await supabase.from('domains').insert({ organization_id, name: domName } as Record<string, unknown>).select('id').single();
        if (ins.error) return res.status(500).json({ error: { message: ins.error.message } });
        entityId = (ins.data as any)?.id ?? null;
      } else {
        entityId = (found.data as any)?.id ?? null;
      }
      if (!entityId) return res.status(404).json({ error: { message: 'Domain not found or created' } });
      // use generic graph edge
      const { data: existing } = await supabase
        .from('entity_edges')
        .select('id')
        .eq('source_type', 'person')
        .eq('source_id', personId)
        .eq('target_type', 'domain')
        .eq('target_id', entityId)
        .maybeSingle();
    if (!existing) {
      const { error: edgeErr } = await supabase.from('entity_edges').insert({
          source_type: 'person',
          source_id: personId,
          target_type: 'domain',
        target_id: entityId,
        meta: { transform_type: 'manual_link', source: 'link-entity-to-person', run_id: runId, retrieved_at: nowIso }
        } as Record<string, unknown>);
      if (edgeErr) {
        console.error('postLinkEntityToPerson: failed to insert edge', edgeErr);
        return res.status(500).json({ error: { message: edgeErr.message } });
      }
      }
    } else if (entity_type === 'document') {
      // Link a document (by URL) to a person via document -> person edge
      let docId: string | null = null;
      const normUrl = value_normalized;
      let found = await supabase.from('documents').select('id, organization_id, canonical_url').eq('canonical_url', normUrl).maybeSingle();
      if (found?.data) {
        docId = (found.data as any).id as string;
      } else {
        // Generate a name from the URL
        let docName = 'Web document';
        try {
          const url = new URL(normUrl);
          const hostname = url.hostname.replace(/^www\./, '');
          const pathname = url.pathname.split('/').filter(Boolean).pop() || '';
          docName = pathname ? `${hostname} - ${pathname}` : hostname;
          if (docName.length > 80) docName = docName.substring(0, 77) + '...';
        } catch {
          // If URL parsing fails, use a truncated version of the URL
          docName = normUrl.length > 80 ? normUrl.substring(0, 77) + '...' : normUrl;
        }
        const ins = await supabase.from('documents').insert({ organization_id, canonical_url: normUrl, source_url: normUrl, doc: { type: 'web', name: docName }, retrieved_at: new Date().toISOString() } as Record<string, unknown>).select('id').single();
        if (ins.error) return res.status(500).json({ error: { message: ins.error.message } });
        docId = (ins.data as any)?.id ?? null;
      }
      if (!docId) return res.status(500).json({ error: { message: 'Document not found or created' } });
      const { data: existingDoc } = await supabase
        .from('entity_edges')
        .select('id')
        .eq('source_type', 'document')
        .eq('source_id', docId)
        .eq('target_type', 'person')
        .eq('target_id', personId)
        .maybeSingle();
      if (!existingDoc) {
        const { error: edgeErr } = await supabase.from('entity_edges').insert({
          source_type: 'document',
          source_id: docId,
          target_type: 'person',
          target_id: personId,
          meta: { transform_type: 'manual_link', source: 'link-entity-to-person', run_id: runId, retrieved_at: nowIso }
        } as Record<string, unknown>);
        if (edgeErr) {
          console.error('postLinkEntityToPerson: failed to link document', edgeErr);
          return res.status(500).json({ error: { message: edgeErr.message } });
        }
      }
      entityId = docId;
    } else {
      return res.status(400).json({ error: { message: `Linking not supported for entity_type=${entity_type}` } });
    }

    return res.json({ ok: true, linked: true, entity_type, entity_id: entityId, person_id: personId });
  } catch (e: any) {
    console.error('postLinkEntityToPerson error', e);
    return res.status(500).json({ ok: false, error: { message: e?.message ?? 'Failed to link entity to person' } });
  }
}

// Promote and link in one call; best-effort rollback for newly-created domain entities
export async function postPromoteAndLinkEntityHttp(req: Request, res: Response) {
  try {
    const runId = req.params.runId || (req.query.runId as string);
    if (!runId) return res.status(400).json({ error: { message: 'runId is required' } });
    const body = (req.body || {}) as { entity_type?: string; value_normalized?: string };
    const entity_type = (body.entity_type || '').toLowerCase().trim();
    const value_normalized = (body.value_normalized || '').toLowerCase().trim();
    if (!entity_type || !value_normalized) {
      return res.status(400).json({ error: { message: 'entity_type and value_normalized are required' } });
    }

    // Promote first (reusing logic)
    const promoteRes = await postPromoteEntityHttp(
      Object.assign({}, req, { body: { entity_type, value_normalized } }) as unknown as Request,
      { json: (v: any) => v } as unknown as Response
    ) as any;
    // When postPromoteEntityHttp is invoked this way, it returns a JSON-like object or writes to res; handle both
    if (!promoteRes || promoteRes?.ok === false || promoteRes?.error) {
      console.error('postPromoteAndLink: promotion failed', promoteRes?.error ?? promoteRes);
      return res.status(500).json(promoteRes ?? { ok: false, error: { message: 'promotion_failed' } });
    }

    // Link to person
    const linkRes = await postLinkEntityToPersonHttp(
      Object.assign({}, req, { body: { entity_type, value_normalized } }) as unknown as Request,
      { json: (v: any) => v } as unknown as Response
    ) as any;
    if (!linkRes || linkRes?.ok === false || linkRes?.error) {
      console.error('postPromoteAndLink: link failed', linkRes?.error ?? linkRes);
      // attempt minimal rollback for newly-created domains (best-effort; skip others)
      if (entity_type === 'domain') {
        try {
          const { data: runRow } = await supabase.from('public_presence_runs').select('entity_type, entity_id').eq('id', runId).single();
          const personId = (runRow as any)?.entity_id as string | undefined;
          if (personId) {
            // delete edge if any
            await supabase.from('entity_edges')
              .delete()
              .eq('source_type', 'person')
              .eq('source_id', personId)
              .eq('target_type', 'domain')
              // cannot know target_id safely; skip
              ;
          }
        } catch { /* ignore rollback errors */ }
      }
      return res.status(500).json(linkRes ?? { ok: false, error: { message: 'link_failed' } });
    }

    return res.json({ ok: true, ...linkRes });
  } catch (e: any) {
    console.error('postPromoteAndLinkEntity error', e);
    return res.status(500).json({ ok: false, error: { message: e?.message ?? 'Failed to promote and link entity' } });
  }
}


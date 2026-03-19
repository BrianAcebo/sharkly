import { supabase } from '../utils/supabaseClient.js';
import { createHash } from 'node:crypto';
/* eslint-disable @typescript-eslint/no-explicit-any */

type ExtractOptions = {
  concurrency?: number;
  bucket?: string;
  maxDocs?: number;
  maxChars?: number;
};

async function withConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const active = new Set<Promise<void>>();
  const runNext = async (): Promise<void> => {
    if (i >= items.length) return;
    const idx = i++;
    const p = worker(items[idx], idx)
      .then((res) => { results[idx] = res; })
      .finally(() => { active.delete(p); });
    active.add(p);
    if (active.size >= limit) {
      await Promise.race(active);
    }
    return runNext();
  };
  while (i < items.length) {
    await runNext();
  }
  await Promise.all(Array.from(active));
  return results;
}

// (removed legacy basicHtmlToText; using improved parser-based extraction)

async function extractFromHtml(html: string): Promise<{ text: string; meta: Record<string, unknown> }> {
  // Prefer DOM-based extraction so we can insert explicit delimiters and capture anchors.
  try {
    const cheerio = await import('cheerio').catch(() => null as any);
    if (cheerio && typeof cheerio.load === 'function') {
      const $ = cheerio.load(html, { decodeEntities: true });
      $('script,style,noscript').remove();
      const parts: string[] = [];
      const urlRefs: string[] = [];
      const block = new Set(['p','div','section','article','header','footer','li','ul','ol','table','tr','td','th','h1','h2','h3','h4','h5','h6','br','hr']);
      const normalizeOutbound = (href: string): string | null => {
        try {
          const u = new URL(href, 'https://placeholder.local/');
          // unwrap Google redirect links
          if (u.hostname.endsWith('google.com')) {
            if (u.pathname === '/url' && u.searchParams.has('q')) {
              const q = u.searchParams.get('q')!;
              if (/^https?:\/\//i.test(q)) return q;
            }
            if (u.pathname === '/imgres' && u.searchParams.has('imgurl')) {
              const img = u.searchParams.get('imgurl')!;
              if (/^https?:\/\//i.test(img)) return img;
            }
          }
          // return absolute http(s) only
          const abs = new URL(href, 'https://example.com/').toString();
          if (/^https?:\/\//i.test(abs)) return abs;
          return null;
        } catch {
          return null;
        }
      };
      // Inline elements that should have whitespace separation
      const inlineSeparators = new Set(['span','strong','em','b','i','u','s','mark','small','sub','sup','code','abbr','cite','dfn','kbd','samp','var','time','data','q']);
      
      const walk = (node: any) => {
        $(node).contents().each((_idx: any, el: any) => {
          if (el.type === 'text') {
            const t = String(el.data || '').replace(/\s+/g, ' ').trim();
            if (t) parts.push(t);
          } else if (el.type === 'tag') {
            const name = String(el.name || '').toLowerCase();
            if (name === 'a') {
              const t = $(el).text().trim();
              if (t) parts.push(t);
              const rawHref = String($(el).attr('href') || '').trim();
              const out = normalizeOutbound(rawHref);
              if (out) {
                urlRefs.push(out);
                parts.push('\n' + out);
              } else {
                // ensure separation from following word when anchor closes
                parts.push(' ');
              }
              $(el).contents().each((_i: any, c: any) => walk(c));
            } else if (name === 'img') {
              const src = String($(el).attr('src') || '').trim();
              if (/^https?:\/\//i.test(src)) {
                urlRefs.push(src);
                parts.push('\n' + src);
              }
              // alt text contributes words
              const alt = String($(el).attr('alt') || '').trim();
              if (alt) parts.push(alt);
            } else if (block.has(name)) {
              // Block elements get newlines
              parts.push('\n');
              $(el).contents().each((_i: any, c: any) => walk(c));
              parts.push('\n');
            } else if (inlineSeparators.has(name)) {
              // Inline elements get space separation to prevent word gluing
              // e.g., <span>touch</span><span>email@test.com</span> → "touch email@test.com"
              parts.push(' ');
              $(el).contents().each((_i: any, c: any) => walk(c));
              parts.push(' ');
            } else {
              // Other elements: just recurse
              $(el).contents().each((_i: any, c: any) => walk(c));
            }
          }
        });
      };
      walk($.root());
      const text = parts
        .join(' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
      return { text, meta: { parser: 'cheerio', url_refs: Array.from(new Set(urlRefs)).slice(0, 200) } };
    }
  } catch {
    // ignore and fall back
  }
  // Fallback: regex-based stripper with basic boundaries and link capture.
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const urlRefs: string[] = [];
  s = s.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_m, href: string, inner: string) => {
    const t = String(inner || '').replace(/\s+/g, ' ').trim();
    if (/^https?:\/\//i.test(href)) {
      urlRefs.push(href);
      return `${t ? t + ' ' : ''}\n${href}\n`;
    }
    return t;
  });
  s = s.replace(/<\/(p|div|section|article|header|footer|li|ul|ol|table|tr|td|th|h[1-6])\s*>/gi, '\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  const text = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
  return { text, meta: { parser: 'basic', url_refs: Array.from(new Set(urlRefs)).slice(0, 200) } };
}

/** Exported for chat file PDF extraction */
export async function extractFromPdf(buffer: Buffer): Promise<{ text: string; meta: Record<string, unknown> }> {
  try {
    // dynamic import if available in server env
    // @ts-expect-error dynamic optional dependency
    const pdfParseMod = await import('pdf-parse').catch(() => null as any);
    if (pdfParseMod) {
      const pdfParse = (pdfParseMod.default ?? pdfParseMod) as (buf: Buffer) => Promise<{ text: string; info?: unknown; metadata?: unknown }>;
      const res = await pdfParse(buffer);
      return { text: (res.text ?? '').toString(), meta: { parser: 'pdf-parse' } };
    }
    return { text: '', meta: { parser: 'pdf-parse', error: 'module_unavailable' } };
  } catch (e) {
    return { text: '', meta: { parser: 'pdf-parse', error: e instanceof Error ? e.message : String(e) } };
  }
}

export async function extractTextForRun(runId: string, orgId: string, seatId: string | null, opts: ExtractOptions = {}) {
  const bucket = opts.bucket ?? 'raw_documents';
  const concurrency = opts.concurrency ?? 3;
  const maxDocs = opts.maxDocs ?? 25;
  const maxChars = opts.maxChars ?? 200_000;

  // load document ids for the run
  const { data: runItems, error: runErr } = await supabase
    .from('public_presence_run_items')
    .select('document_id')
    .eq('run_id', runId);
  if (runErr) throw runErr;
  const docIds = Array.from(new Set((runItems ?? []).map((r: { document_id: string }) => r.document_id)));
  console.log('[DocExtract] Loaded run items', { runId, count: docIds.length });
  if (docIds.length === 0) {
    return { ok: true, parsedCount: 0, failedCount: 0, failures: [], billed: null };
  }

  // find docs with raw_storage_path and no existing content
  const [{ data: docs, error: docsErr }, { data: existing, error: existErr }] = await Promise.all([
    supabase.from('documents').select('id, organization_id, mime_type, raw_storage_path').in('id', docIds).not('raw_storage_path', 'is', null),
    supabase.from('document_contents').select('document_id').in('document_id', docIds)
  ]);
  if (docsErr) throw docsErr;
  if (existErr) throw existErr;
  const already = new Set((existing ?? []).map((r: { document_id: string }) => r.document_id));
  const candidates = (docs ?? [])
    // allow missing org on older rows
    .filter((d) => !!(d as any).raw_storage_path && (!(d as any).organization_id || (d as any).organization_id === orgId) && !already.has((d as any).id))
    .slice(0, maxDocs) as Array<{ id: string; organization_id: string; mime_type: string | null; raw_storage_path: string }>;

  console.log('[DocExtract] Candidates', { runId, candidates: candidates.length, maxDocs });
  if (candidates.length === 0) {
    return { ok: true, parsedCount: 0, failedCount: 0, failures: [], billed: null };
  }

  // bill once via RPC only
  const qty = candidates.length;
  const creditCost = qty * 1;
  const meta = { qty, max_docs: maxDocs, max_chars: maxChars, parsers: ['basic|cheerio', 'pdf-parse?'] };
  const { data: billData, error: billErr } = await supabase.rpc('spend_credits_for_usage_event', {
    p_org_id: orgId,
    p_seat_id: seatId,
    p_run_id: runId,
    p_category: 'document_parse',
    p_provider: 'local',
    p_unit: 'document_parsed',
    p_qty: qty,
    p_credit_cost: creditCost,
    p_raw_cost_cents: 0,
    p_meta: meta
  });
  if (billErr || !billData?.ok) {
    console.error('[DocExtract] Billing RPC failed (blocking)', { runId, orgId, reason: billData?.reason ?? billErr?.message ?? 'billing_failed' });
    return {
      ok: false,
      parsedCount: 0,
      failedCount: 0,
      failures: [],
      billing_error: {
        code: 'INSUFFICIENT_CREDITS',
        title: 'Not enough credits to extract document text',
        message: 'Your organization does not have sufficient credits or wallet balance to parse documents for this run.',
        reason: billData?.reason ?? billErr?.message ?? 'billing_failed',
        included_remaining_credits: billData?.included_remaining_credits ?? null,
        wallet_balance_cents: billData?.wallet_balance_cents ?? null,
        required_wallet_cents: billData?.required_wallet_cents ?? null,
        action: 'Add credits or top up wallet'
      },
      insufficientCredits: true
    };
  }

  const failures: Array<{ id: string; error: string }> = [];
  let parsedCount = 0;

  await withConcurrency(candidates, concurrency, async (doc) => {
    const path = doc.raw_storage_path!;
    try {
      const { data, error: dlErr } = await supabase.storage.from(bucket).download(path);
      if (dlErr || !data) {
        console.error('[DocExtract] Download failed', { docId: doc.id, path, error: dlErr });
        failures.push({ id: doc.id, error: dlErr?.message ?? 'download_failed' });
        return;
      }
      const arrBuf = await (data as Blob).arrayBuffer();
      const buf = Buffer.from(arrBuf);
      const mime = (doc.mime_type ?? '').toLowerCase();

      let text = '';
      let meta: Record<string, unknown> = {};
      if (mime.includes('text/html')) {
        const html = buf.toString('utf8');
        const res = await extractFromHtml(html);
        text = res.text;
        meta = res.meta;
      } else if (mime.includes('application/pdf')) {
        const res = await extractFromPdf(buf);
        text = res.text;
        meta = res.meta;
      } else if (mime.startsWith('text/')) {
        text = buf.toString('utf8');
        meta = { parser: 'text' };
      } else {
        // attempt utf8 and store whatever is readable
        text = buf.toString('utf8');
        meta = { parser: 'fallback' };
      }

      let truncated = false;
      if (text.length > maxChars) {
        text = text.slice(0, maxChars);
        truncated = true;
      }
      const sha = createHash('sha256').update(text, 'utf8').digest('hex');
      const insertMeta = { ...(meta ?? {}), truncated };

      const { error: insErr } = await supabase.from('document_contents').insert({
        document_id: doc.id,
        text_content: text,
        content_sha256: sha,
        extract_error: null,
        meta: insertMeta
      });
      if (insErr) {
        console.error('[DocExtract] Insert failed', { docId: doc.id, error: insErr });
        failures.push({ id: doc.id, error: insErr.message });
        return;
      }
      console.log('[DocExtract] Inserted document_content', { docId: doc.id, chars: text.length, sha: sha.slice(0, 12) });
      parsedCount += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[DocExtract] Exception', { docId: doc.id, error: msg });
      const { error: err2 } = await supabase.from('document_contents').insert({
        document_id: doc.id,
        text_content: '',
        content_sha256: createHash('sha256').update('', 'utf8').digest('hex'),
        extract_error: msg,
        meta: { error: msg }
      });
      if (err2) console.error('[DocExtract] Insert error after exception', { docId: doc.id, error: err2 });
      failures.push({ id: doc.id, error: msg });
    }
  });

  return {
    ok: true,
    parsedCount,
    failedCount: failures.length,
    failures,
    billed: {
      from_included_credits: billData.from_included_credits ?? 0,
      from_wallet_credits: billData.from_wallet_credits ?? 0,
      wallet_debit_cents: billData.wallet_debit_cents ?? 0
    }
  };
}

export default { extractTextForRun };



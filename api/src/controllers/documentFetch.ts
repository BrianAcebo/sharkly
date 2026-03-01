import fetch, { AbortError } from 'node-fetch';
import { supabase } from '../utils/supabaseClient.js';
import { ensureRawDocumentsBucket } from '../utils/storage.js';
import { fetchWithFallback } from '../services/fetchFallback.js';

type DocRow = {
  id: string;
  organization_id: string;
  canonical_url: string;
  http_status: number | null;
  fetched_at: string | null;
};

type FetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  concurrency?: number;
  userAgent?: string;
  bucket?: string;
  maxDocs?: number;
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

function parseMime(contentType: string | null): string | null {
  if (!contentType) return null;
  const semi = contentType.indexOf(';');
  return (semi >= 0 ? contentType.slice(0, semi) : contentType).trim() || null;
}

export async function fetchDocumentsForRun(runId: string, orgId: string, seatId: string | null, opts: FetchOptions = {}) {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const maxBytes = opts.maxBytes ?? 5 * 1024 * 1024; // 5MB
  const concurrency = opts.concurrency ?? 3;
  const userAgent = opts.userAgent ?? 'TrueSightBot/1.0 (+https://truesightintel.com)';
  const bucket = opts.bucket ?? 'raw_documents';
  const maxDocs = opts.maxDocs ?? 25;

  // Find document ids for the run
  const { data: runItems, error: runItemsErr } = await supabase
    .from('public_presence_run_items')
    .select('document_id')
    .eq('run_id', runId);
  if (runItemsErr) throw runItemsErr;
  const docIds = (runItems ?? []).map((r: { document_id: string }) => r.document_id);
  console.log('[DocFetch] Loaded run items', { runId, count: docIds.length });
  if (docIds.length === 0) {
    return { ok: true, fetchedCount: 0, failedCount: 0, failures: [], billed: null };
  }

  // Load documents to fetch (unfetched only)
  const { data: docs, error: docsErr } = await supabase
    .from('documents')
    .select('id, organization_id, canonical_url, fetched_at, http_status, raw_storage_path')
    .in('id', docIds)
    .or('fetched_at.is.null,raw_storage_path.is.null'); // consider unfetched if no fetched_at OR no raw content path
  if (docsErr) throw docsErr;

  // Skip already fetched docs and enforce org match and limit
  const toFetch = ((docs ?? []) as DocRow[])
    // allow rows where organization_id is null (older rows), or matches orgId
    .filter((d: any) => {
      const urlOk = !!d?.canonical_url;
      const needsFetch = d.fetched_at === null || d.raw_storage_path == null;
      const orgOk = !d.organization_id || d.organization_id === orgId;
      return urlOk && needsFetch && orgOk;
    })
    .slice(0, maxDocs);
  console.log('[DocFetch] Candidate docs', {
    runId,
    orgId,
    toFetch: toFetch.length,
    maxDocs
  });
  if (toFetch.length === 0) {
    return { ok: true, fetchedCount: 0, failedCount: 0, failures: [], billed: null };
  }

  // Ensure bucket exists (idempotent)
  try {
    await ensureRawDocumentsBucket(bucket);
  } catch (e) {
    console.warn('[DocFetch] Failed to ensure raw documents bucket', { bucket, error: e });
  }

  // Bill credits once prior to fetching via RPC only
  const qty = toFetch.length;
  const creditCost = qty * 1;
  const meta = { qty, max_bytes: maxBytes, timeout_ms: timeoutMs };
  const { data: billData, error: billErr } = await supabase.rpc('spend_credits_for_usage_event', {
    p_org_id: orgId,
    p_seat_id: seatId,
    p_run_id: runId,
    p_category: 'document_fetch',
    p_provider: 'http',
    p_unit: 'url_fetch',
    p_qty: qty,
    p_credit_cost: creditCost,
    p_raw_cost_cents: 0,
    p_meta: meta
  });
  if (billErr || !billData?.ok) {
    console.error('[DocFetch] Billing RPC failed (blocking)', { runId, orgId, reason: billData?.reason ?? billErr?.message ?? 'billing_failed' });
    return {
      ok: false,
      fetchedCount: 0,
      failedCount: 0,
      failures: [],
      billing_error: {
        code: 'INSUFFICIENT_CREDITS',
        title: 'Not enough credits to fetch documents',
        message: 'Your organization does not have sufficient credits or wallet balance to fetch documents for this run.',
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
  let fetchedCount = 0;

  const nowIso = new Date().toISOString();

  await withConcurrency(toFetch, concurrency, async (doc) => {
    const url = doc.canonical_url;
    
    try {
      // Use fallback chain: direct → googlebot → archive.org → google cache
      const result = await fetchWithFallback(url, { timeoutMs, maxBytes });
      
      if (!result.success || !result.content) {
        const errMsg = result.error ?? 'fetch_failed';
        const { error: updErr } = await supabase.from('documents').update({
          http_status: result.status ?? null,
          mime_type: result.mime ?? null,
          fetched_at: nowIso,
          fetch_error: errMsg
        }).eq('id', doc.id);
        if (updErr) console.error('[DocFetch] Update error after failed fetch', { docId: doc.id, error: updErr });
        // Lightweight fallback to extract title/description
        try {
          await tryLightweightFallback(url, doc.id);
        } catch { /* ignore */ }
        failures.push({ id: doc.id, error: errMsg });
        return;
      }

      const buf = result.content;
      const mime = result.mime ?? null;
      const status = result.status ?? 200;
      console.log('[DocFetch] Fetched bytes', { docId: doc.id, source: result.source, status, mime, bytes: buf.length });

      // Suggest extension from mime
      const ext =
        mime === 'text/html' ? '.html' :
        mime === 'application/pdf' ? '.pdf' :
        mime === 'text/plain' ? '.txt' : '';
      const storagePath = `org/${orgId}/documents/${doc.id}/raw${ext}`;
      const { error: upErr } = await supabase
        .storage
        .from(bucket)
        .upload(storagePath, buf, {
          contentType: mime ?? 'application/octet-stream',
          upsert: true
        });
      if (upErr) {
        console.error('[DocFetch] Storage upload failed', { docId: doc.id, bucket, storagePath, error: upErr });
        const { error: updErr } = await supabase.from('documents').update({
          http_status: status,
          mime_type: mime,
          fetched_at: nowIso,
          fetch_error: `upload_failed: ${upErr.message}`,
          raw_storage_path: null
        }).eq('id', doc.id);
        if (updErr) console.error('[DocFetch] Update error after upload failure', { docId: doc.id, error: updErr });
        failures.push({ id: doc.id, error: `upload_failed: ${upErr.message}` });
        return;
      }

      const { error: updErrOk } = await supabase.from('documents').update({
        http_status: status,
        mime_type: mime,
        fetched_at: nowIso,
        raw_storage_path: storagePath,
        fetch_error: null,
        // Store which fallback source was used
        meta: { fetch_source: result.source }
      }).eq('id', doc.id);
      if (updErrOk) {
        console.error('[DocFetch] Update error after success', { docId: doc.id, error: updErrOk });
      } else {
        console.log('[DocFetch] Stored raw document', { docId: doc.id, storagePath, source: result.source });
      }
      fetchedCount += 1;
    } catch (e) {
      const msg = e instanceof AbortError ? 'timeout' : (e instanceof Error ? e.message : String(e));
      const { error: updErr } = await supabase.from('documents').update({
        http_status: null,
        mime_type: null,
        fetched_at: nowIso,
        fetch_error: msg,
        raw_storage_path: null
      }).eq('id', doc.id);
      if (updErr) console.error('[DocFetch] Update error after exception', { docId: doc.id, error: updErr });
      // Lightweight fallback to extract title/description
      try {
        await tryLightweightFallback(url, doc.id);
      } catch { /* ignore */ }
      failures.push({ id: doc.id, error: msg });
    }
  });

  return {
    ok: true,
    fetchedCount,
    failedCount: failures.length,
    failures,
    billed: {
      from_included_credits: billData.from_included_credits ?? 0,
      from_wallet_credits: billData.from_wallet_credits ?? 0,
      wallet_debit_cents: billData.wallet_debit_cents ?? 0
    }
  };
}

export default { fetchDocumentsForRun };

async function tryLightweightFallback(url: string, documentId: string): Promise<boolean> {
  try {
    // Strategy: Googlebot UA, short timeout, partial body read (<=20KB)
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    let html = '';
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'accept': 'text/html'
        } as any,
        redirect: 'follow',
        signal: controller.signal
      } as any);
      if (resp.ok && resp.body) {
        const reader = (resp.body as any).getReader?.() ?? null;
        if (reader) {
          let bytes = 0;
          const maxBytes = 20_000;
          const td = new TextDecoder();
          // read until head end or bytes cap
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            html += td.decode(value);
            bytes += value?.length ?? 0;
            if (bytes >= maxBytes || /<\/head>/i.test(html)) break;
          }
          try { await reader.cancel(); } catch { /* ignore */ }
        }
      }
    } finally {
      clearTimeout(t);
    }
    if (!html) {
      // Try HEAD just to confirm reachability
      const r = await fetch(url, { method: 'HEAD', redirect: 'follow' } as any);
      if (!r.ok) return false;
      html = '<html><head></head><body></body></html>';
    }
    // Extract title and meta description
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() ?? null;
    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const description = descMatch?.[1]?.trim() ?? null;
    if (!title && !description) return false;
    if (title) {
      await supabase.from('documents').update({ title, fetch_error: null }).eq('id', documentId);
    }
    const text = [title, description].filter(Boolean).join('\n\n');
    if (text) {
      await supabase
        .from('document_contents')
        .upsert({
          document_id: documentId,
          text_content: text,
          meta: { source: 'lightweight_fallback', partial: true }
        } as any, { onConflict: 'document_id' });
    }
    return true;
  } catch {
    return false;
  }
}



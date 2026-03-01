/* eslint-disable @typescript-eslint/no-explicit-any */
import fetch, { AbortError } from 'node-fetch';

export type FallbackResult = {
  success: boolean;
  source: 'direct' | 'googlebot' | 'archive_org' | 'google_cache' | 'none';
  content?: Buffer;
  mime?: string;
  status?: number;
  error?: string;
};

const USER_AGENTS = {
  default: 'TrueSightBot/1.0 (+https://truesightintel.com)',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function parseMime(contentType: string | null): string | null {
  if (!contentType) return null;
  const semi = contentType.indexOf(';');
  return (semi >= 0 ? contentType.slice(0, semi) : contentType).trim() || null;
}

/**
 * Attempt to fetch URL with fallback chain:
 * 1. Direct fetch with default UA
 * 2. Direct fetch with Googlebot UA
 * 3. Archive.org Wayback Machine
 * 4. Google Cache (if not blocked)
 */
export async function fetchWithFallback(
  url: string,
  options: {
    timeoutMs?: number;
    maxBytes?: number;
  } = {}
): Promise<FallbackResult> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;

  // Strategy 1: Direct fetch with default UA
  const direct = await tryFetch(url, USER_AGENTS.default, timeoutMs, maxBytes);
  if (direct.success) {
    return { ...direct, source: 'direct' };
  }

  // Strategy 2: Try with Googlebot UA (many sites serve different content)
  const googlebot = await tryFetch(url, USER_AGENTS.googlebot, timeoutMs, maxBytes);
  if (googlebot.success) {
    return { ...googlebot, source: 'googlebot' };
  }

  // Strategy 3: Archive.org Wayback Machine
  const archiveResult = await tryArchiveOrg(url, timeoutMs, maxBytes);
  if (archiveResult.success) {
    return { ...archiveResult, source: 'archive_org' };
  }

  // Strategy 4: Google Cache (via webcache URL)
  const cacheResult = await tryGoogleCache(url, timeoutMs, maxBytes);
  if (cacheResult.success) {
    return { ...cacheResult, source: 'google_cache' };
  }

  // All strategies failed
  return {
    success: false,
    source: 'none',
    error: direct.error || googlebot.error || archiveResult.error || 'all_fallbacks_failed',
  };
}

async function tryFetch(
  url: string,
  userAgent: string,
  timeoutMs: number,
  maxBytes: number
): Promise<Omit<FallbackResult, 'source'>> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      follow: 5,
      size: maxBytes,
      headers: { 'user-agent': userAgent },
    } as any);

    if (!resp.ok) {
      return { success: false, status: resp.status, error: `HTTP ${resp.status}` };
    }

    const arrBuf = await resp.arrayBuffer();
    const content = Buffer.from(arrBuf);
    const mime = parseMime(resp.headers.get('content-type'));

    return {
      success: true,
      content,
      mime: mime ?? undefined,
      status: resp.status,
    };
  } catch (e) {
    const msg = e instanceof AbortError ? 'timeout' : (e instanceof Error ? e.message : String(e));
    return { success: false, error: msg };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Try to fetch from Archive.org Wayback Machine
 */
async function tryArchiveOrg(
  url: string,
  timeoutMs: number,
  maxBytes: number
): Promise<Omit<FallbackResult, 'source'>> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // First, check if Archive.org has this URL
    const availabilityUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    const availResp = await fetch(availabilityUrl, {
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENTS.default },
    } as any);

    if (!availResp.ok) {
      return { success: false, error: 'archive_availability_check_failed' };
    }

    const availData = await availResp.json() as any;
    const snapshot = availData?.archived_snapshots?.closest;
    
    if (!snapshot?.available || !snapshot?.url) {
      return { success: false, error: 'not_in_archive' };
    }

    // Fetch the archived version
    const archiveUrl = snapshot.url;
    const archiveResp = await fetch(archiveUrl, {
      signal: controller.signal,
      redirect: 'follow',
      follow: 5,
      size: maxBytes,
      headers: { 'user-agent': USER_AGENTS.default },
    } as any);

    if (!archiveResp.ok) {
      return { success: false, status: archiveResp.status, error: `archive_http_${archiveResp.status}` };
    }

    const arrBuf = await archiveResp.arrayBuffer();
    const content = Buffer.from(arrBuf);
    const mime = parseMime(archiveResp.headers.get('content-type'));

    console.log(`[FetchFallback] Retrieved from Archive.org: ${url}`);

    return {
      success: true,
      content,
      mime: mime ?? undefined,
      status: archiveResp.status,
    };
  } catch (e) {
    const msg = e instanceof AbortError ? 'archive_timeout' : (e instanceof Error ? e.message : String(e));
    return { success: false, error: msg };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Try to fetch from Google Cache
 * Note: Google Cache is being deprecated, but still works for some pages
 */
async function tryGoogleCache(
  url: string,
  timeoutMs: number,
  maxBytes: number
): Promise<Omit<FallbackResult, 'source'>> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Google's cache URL format
    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
    
    const resp = await fetch(cacheUrl, {
      signal: controller.signal,
      redirect: 'follow',
      follow: 5,
      size: maxBytes,
      headers: { 
        'user-agent': USER_AGENTS.chrome, // Use Chrome UA for Google
        'accept': 'text/html,application/xhtml+xml',
      },
    } as any);

    if (!resp.ok) {
      return { success: false, status: resp.status, error: `cache_http_${resp.status}` };
    }

    const arrBuf = await resp.arrayBuffer();
    const content = Buffer.from(arrBuf);
    const mime = parseMime(resp.headers.get('content-type'));

    // Check if we got a "not found" page from Google
    const text = content.toString('utf8');
    if (text.includes('did not match any documents') || text.includes('Error 404')) {
      return { success: false, error: 'not_in_cache' };
    }

    console.log(`[FetchFallback] Retrieved from Google Cache: ${url}`);

    return {
      success: true,
      content,
      mime: mime ?? undefined,
      status: resp.status,
    };
  } catch (e) {
    const msg = e instanceof AbortError ? 'cache_timeout' : (e instanceof Error ? e.message : String(e));
    return { success: false, error: msg };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Get just the availability info from Archive.org without fetching content
 */
export async function checkArchiveAvailability(url: string): Promise<{
  available: boolean;
  timestamp?: string;
  archiveUrl?: string;
}> {
  try {
    const availabilityUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    const resp = await fetch(availabilityUrl, {
      headers: { 'user-agent': USER_AGENTS.default },
    } as any);

    if (!resp.ok) {
      return { available: false };
    }

    const data = await resp.json() as any;
    const snapshot = data?.archived_snapshots?.closest;
    
    if (!snapshot?.available || !snapshot?.url) {
      return { available: false };
    }

    return {
      available: true,
      timestamp: snapshot.timestamp,
      archiveUrl: snapshot.url,
    };
  } catch {
    return { available: false };
  }
}


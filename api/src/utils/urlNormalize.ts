/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * URL Normalization Utility
 *
 * - normalizeUrl(url: string): string
 *   Lowercases host, strips www, removes tracking params, sorts remaining params,
 *   removes default ports, trims trailing slash (except root), and drops non-meaningful hash.
 *
 * - extractHost(url: string): string | null
 *   Returns normalized host without www prefix, or null on parse failure.
 *
 * - unwrapGoogleUrl(url: string): string
 *   Unwraps Google /url?q= and /imgres?imgurl= redirects; then normalizes.
 *
 * - urlsMatch(a, b): boolean
 *   Compares normalized representations.
 */

export function normalizeUrl(input: string): string {
  try {
    const url = new URL(input);
    // Lowercase scheme/host
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();

    // Remove default ports
    if (url.port === '80' || url.port === '443') url.port = '';

    // Remove www. prefix
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
    }

    // Remove tracking params
    const removeParams = [
      'fbclid',
      'gclid',
      'msclkid',
      'ref',
      'source',
      '_ga',
      '_gl',
    ];
    for (const k of Array.from(url.searchParams.keys())) {
      const lower = k.toLowerCase();
      if (lower.startsWith('utm_') || removeParams.includes(lower)) {
        url.searchParams.delete(k);
      }
    }

    // Sort remaining params for stability
    const entries = Array.from(url.searchParams.entries());
    entries.sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) : a[0] < b[0] ? -1 : 1));
    const sorted = new URLSearchParams();
    for (const [k, v] of entries) sorted.append(k, v);
    const sortedQuery = sorted.toString();
    url.search = sortedQuery ? `?${sortedQuery}` : '';

    // Remove non-meaningful hash (preserve anchor-like ids such as #about)
    if (url.hash && !/^#[a-zA-Z][\w-]*$/.test(url.hash)) {
      url.hash = '';
    }

    // Remove trailing slash (except root)
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/g, '');
    }

    return url.toString();
  } catch {
    return input;
  }
}

export function extractHost(input: string): string | null {
  try {
    const u = new URL(input);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function unwrapGoogleUrl(input: string): string {
  try {
    const u = new URL(input);
    const host = u.hostname.toLowerCase();
    const path = u.pathname;
    if (host.includes('google.') && path === '/url') {
      const q = u.searchParams.get('q') || u.searchParams.get('url');
      if (q) return normalizeUrl(q);
    }
    if (host.includes('google.') && path === '/imgres') {
      const img = u.searchParams.get('imgurl');
      if (img) return normalizeUrl(img);
    }
    return normalizeUrl(input);
  } catch {
    return input;
  }
}

export function urlsMatch(a: string, b: string): boolean {
  return normalizeUrl(a) === normalizeUrl(b);
}



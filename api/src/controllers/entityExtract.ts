import { supabase } from '../utils/supabaseClient.js';

type ExtractOptions = {
	extractorVersion?: string;
	concurrency?: number;
	maxDocs?: number;
	subjectTerms?: string[]; // Names/terms to validate relevance (e.g., ["brian", "acebo", "brian acebo"])
};

type DocContentRow = {
	id: string;
	text: string;
	canonical_url?: string | null;
	title?: string | null;
};

type MentionRow = {
	document_id: string;
	entity_type: 'email' | 'phone' | 'domain' | 'ip' | 'url' | 'social_profile' | 'username';
	value_raw: string;
	value_normalized: string;
	confidence: number;
	context_snippet: string | null;
	source: string;
	meta: Record<string, unknown>;
};

async function withConcurrency<T, R>(
	items: T[],
	limit: number,
	worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let i = 0;
	const active = new Set<Promise<void>>();
	const runNext = async (): Promise<void> => {
		if (i >= items.length) return;
		const idx = i++;
		const p = worker(items[idx], idx)
			.then((res) => {
				results[idx] = res;
			})
			.finally(() => {
				active.delete(p);
			});
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

function normalizeEmail(e: string): string {
	return e.trim().toLowerCase();
}

function isValidIPv4(candidate: string): boolean {
	const parts = candidate.split('.');
	if (parts.length !== 4) return false;
	return parts.every((p) => {
		if (!/^\d{1,3}$/.test(p)) return false;
		const n = Number(p);
		return n >= 0 && n <= 255;
	});
}

function extractIPv4(text: string): Array<{ raw: string; norm: string; index: number }> {
	const re = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
	const out: Array<{ raw: string; norm: string; index: number }> = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) {
		const raw = m[0];
		if (isValidIPv4(raw)) {
			out.push({ raw, norm: raw, index: m.index });
		}
	}
	return out;
}

function trimTrailingPunct(s: string): string {
	return s.replace(/[)\].,;:!?"'>]+$/g, '');
}

function normalizeUrl(u: string): { raw: string; norm: string; host?: string; path?: string } | null {
	try {
		const raw = trimTrailingPunct(u);
		const url = new URL(raw);
		const host = url.host.toLowerCase();
		url.hash = '';
		url.hostname = host;
		// Optionally normalize path: remove trailing slash except root
		if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
			url.pathname = url.pathname.slice(0, -1);
		}
		return { raw, norm: url.toString(), host, path: url.pathname || '/' };
	} catch {
		return null;
	}
}

function extractUrls(text: string): Array<{ raw: string; norm: string; host?: string; path?: string; index: number }> {
	// Basic URL pattern; avoid trailing punctuation
	const re = /https?:\/\/[^\s<>"'()]+/gi;
	const out: Array<{ raw: string; norm: string; host?: string; path?: string; index: number }> = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) {
		const n = normalizeUrl(m[0]);
		if (n) {
			out.push({ ...n, index: m.index });
		}
	}
	return out;
}

function extractEmails(text: string): Array<{ raw: string; norm: string; index: number }> {
	// Require a left boundary that is not part of an email-local character to avoid gluing with preceding words.
	const re = /(?:^|[^A-Za-z0-9._%+-])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
	const out: Array<{ raw: string; norm: string; index: number }> = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) {
		const raw = m[1];
		const start = m.index + (m[0].indexOf(raw));
		out.push({ raw, norm: normalizeEmail(raw), index: start });
	}
	return out;
}

function looksLikeDomain(candidate: string): boolean {
	// Basic domain validation: label(.label)+ with TLD >=2 chars, no underscores, not all digits
	if (!/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(candidate)) return false;
	if (/[._]{2,}/.test(candidate)) return false;
	if (/\s/.test(candidate)) return false;
	if (/\d+\.\d+\.\d+\.\d+/.test(candidate)) return false; // avoid IPv4
	return true;
}

// Social media and generic domains that need context validation
// These are only meaningful if the context mentions the subject or has a profile path
const GENERIC_DOMAINS = new Set([
	// Social media platforms
	'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com',
	'tiktok.com', 'youtube.com', 'pinterest.com', 'reddit.com', 'tumblr.com',
	'snapchat.com', 'threads.net', 'mastodon.social',
	// Developer platforms  
	'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 'medium.com', 'dev.to',
	// Search engines & utilities (never relevant as standalone domains)
	'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com',
	'cloudflare.com', 'googleapis.com', 'gstatic.com', 'doubleclick.net',
	// Generic shopping/sites (never relevant as standalone domains)
	'amazon.com', 'ebay.com', 'apple.com', 'microsoft.com',
]);

// Domains that should NEVER be extracted (tracking, CDN, etc.)
const ALWAYS_BLOCKED = new Set([
	'googleapis.com', 'gstatic.com', 'cloudflare.com', 'doubleclick.net',
	'googlesyndication.com', 'googleadservices.com', 'facebook.net',
	'fbcdn.net', 'twimg.com', 'akamaihd.net', 'cloudfront.net',
]);

function isGenericDomain(domain: string): boolean {
	const d = domain.toLowerCase().replace(/^(www|m|mobile)\./i, '');
	return GENERIC_DOMAINS.has(d);
}

function isAlwaysBlockedDomain(domain: string): boolean {
	const d = domain.toLowerCase().replace(/^(www|m|mobile)\./i, '');
	for (const blocked of ALWAYS_BLOCKED) {
		if (d === blocked || d.endsWith(`.${blocked}`)) return true;
	}
	return false;
}

function extractDomains(text: string): Array<{ raw: string; norm: string; index: number }> {
	const re = /\b(?:(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.)+[a-z]{2,}\b/gi;
	const out: Array<{ raw: string; norm: string; index: number }> = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) {
		const raw = m[0];
		const norm = raw.toLowerCase();
		if (looksLikeDomain(norm) && !isAlwaysBlockedDomain(norm)) {
			// avoid obvious email localparts by excluding if preceded by '@'
			const prev = m.index > 0 ? text[m.index - 1] : '';
			if (prev !== '@') {
				out.push({ raw, norm, index: m.index });
			}
		}
	}
	return out;
}

// Check if text mentions the subject (case-insensitive, fuzzy)
function textMentionsSubject(text: string, subjectTerms: string[]): boolean {
	const lowerText = text.toLowerCase();
	// Require at least one subject term to appear in the text
	return subjectTerms.some(term => lowerText.includes(term.toLowerCase()));
}

function extractPhones(text: string): Array<{ raw: string; norm: string; index: number }> {
	// Simple US-centric phone regex; may capture more than desired, we'll normalize
	const re = /(?:(?:\+?1[\s.\-]?)?(?:\(?\d{3}\)?[\s.\-]?)\d{3}[\s.\-]?\d{4})/g;
	const out: Array<{ raw: string; norm: string; index: number }> = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(text))) {
		const raw = m[0];
		const digits = raw.replace(/[^\d]/g, '');
		let norm = digits;
		if (digits.length === 10) {
			norm = `+1${digits}`;
		} else if (digits.length === 11 && digits.startsWith('1')) {
			norm = `+${digits}`;
		} else if (digits.startsWith('0')) {
			// likely not a valid US number, skip
			continue;
		} else if (!digits) {
			continue;
		} else {
			// fallback to raw digits prefixed with '+'
			norm = `+${digits}`;
		}
		out.push({ raw, norm, index: m.index });
	}
	return out;
}

function socialPlatformFromHost(host?: string): string | null {
	if (!host) return null;
	const h = host.replace(/^www\./i, '').toLowerCase();
	if (h.endsWith('twitter.com') || h === 'x.com') return 'twitter';
	if (h.endsWith('linkedin.com')) return 'linkedin';
	if (h.endsWith('instagram.com')) return 'instagram';
	if (h.endsWith('facebook.com')) return 'facebook';
	if (h.endsWith('tiktok.com')) return 'tiktok';
	if (h.endsWith('reddit.com')) return 'reddit';
	if (h.endsWith('github.com')) return 'github';
	return null;
}

function usernameFromPath(platform: string, path?: string): string | null {
	if (!path) return null;
	const parts = path.split('/').filter(Boolean);
	if (parts.length === 0) return null;
	switch (platform) {
		case 'twitter': {
			// /{handle}
			const h = parts[0];
			if (!h) return null;
			return h.replace(/^@/, '').toLowerCase();
		}
		case 'linkedin': {
			// /in/{handle} or /company/{handle}
			if (parts[0] === 'in' || parts[0] === 'company') {
				return (parts[1] || '').toLowerCase() || null;
			}
			return parts[0].toLowerCase();
		}
		case 'instagram':
		case 'github':
		case 'facebook': {
			return parts[0].toLowerCase();
		}
		case 'tiktok': {
			// /@handle or /{something}
			const h = parts[0].replace(/^@/, '');
			return h ? h.toLowerCase() : null;
		}
		case 'reddit': {
			// /user/{name} or /u/{name}
			if ((parts[0] === 'user' || parts[0] === 'u') && parts[1]) {
				return parts[1].toLowerCase();
			}
			return null;
		}
		default:
			return null;
	}
}

function contextSnippet(text: string, index: number, length: number, radius = 80): string {
	const start = Math.max(0, index - radius);
	const end = Math.min(text.length, index + length + radius);
	const prefix = start > 0 ? '…' : '';
	const suffix = end < text.length ? '…' : '';
	return `${prefix}${text.slice(start, end)}${suffix}`;
}

export async function extractEntitiesForRun(
	runId: string,
	orgId: string,
	seatId: string | null,
	opts: ExtractOptions = {}
) {
	const extractorVersion = opts.extractorVersion ?? 'v1';
	const concurrency = opts.concurrency ?? 4;
	const maxDocs = opts.maxDocs ?? 50;
	
	// Get subject terms from options or from the run's params
	let subjectTerms: string[] = opts.subjectTerms ?? [];
	if (subjectTerms.length === 0) {
		// Try to get subject name from the run record
		const { data: runRecord } = await supabase
			.from('public_presence_runs')
			.select('params')
			.eq('id', runId)
			.single();
		if (runRecord?.params) {
			const params = runRecord.params as { fullName?: string; firstName?: string; lastName?: string };
			if (params.fullName) {
				// Split full name into terms
				subjectTerms = params.fullName.toLowerCase().split(/\s+/).filter(Boolean);
				subjectTerms.push(params.fullName.toLowerCase()); // Also add full name
			}
		}
	}
	console.log('[EntityExtract] Subject terms for relevance filtering:', subjectTerms);

	// 1) Load documents for the run that have document_contents.text_content and belong to org
	const { data: runItems, error: runErr } = await supabase
		.from('public_presence_run_items')
		.select('document_id')
		.eq('run_id', runId);
	if (runErr) {
		return { ok: false, docsProcessed: 0, mentionsCreated: 0, byTypeCounts: {}, failures: [{ documentId: 'N/A', error: runErr.message }] };
	}
	const docIds = (runItems ?? []).map((r: any) => r.document_id);
	if (docIds.length === 0) {
		return { ok: true, docsProcessed: 0, mentionsCreated: 0, byTypeCounts: {}, failures: [] };
	}

	// Filter by org and ensure content exists; also fetch doc meta needed for domain/url extraction
	const [{ data: docs, error: docsErr }, { data: contents, error: contErr }] = await Promise.all([
		supabase.from('documents').select('id, organization_id, canonical_url, title').in('id', docIds),
		supabase.from('document_contents').select('document_id, text_content').in('document_id', docIds).not('text_content', 'is', null)
	]);
	if (docsErr || contErr) {
		return {
			ok: false,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			docsProcessed: 0,
			mentionsCreated: 0,
			byTypeCounts: {},
			failures: [{ documentId: 'N/A', error: (docsErr || contErr) ? (docsErr?.message ?? contErr?.message) : 'unknown_error' }]
		};
	}
	const orgDocIds = new Set((docs ?? []).filter((d: any) => d.organization_id === orgId).map((d: any) => d.id));
	const metaById = new Map<string, { canonical_url?: string | null; title?: string | null }>();
	for (const d of (docs ?? []) as any[]) {
		if (orgDocIds.has(d.id)) {
			metaById.set(d.id, { canonical_url: d.canonical_url ?? null, title: d.title ?? null });
		}
	}
	const contentByDoc = new Map<string, string>();
	for (const c of contents ?? []) {
		if (orgDocIds.has(c.document_id)) {
			contentByDoc.set(c.document_id, String(c.text_content ?? ''));
		}
	}
	const toProcess: DocContentRow[] = Array.from(contentByDoc.entries())
		.slice(0, maxDocs)
		.map(([id, text]) => {
			const meta = metaById.get(id) ?? {};
			return { id, text, canonical_url: meta.canonical_url ?? null, title: meta.title ?? null };
		});
	if (toProcess.length === 0) {
		return { ok: true, docsProcessed: 0, mentionsCreated: 0, byTypeCounts: {}, failures: [] };
	}

	// 2) Billing via RPC
	const qty = toProcess.length;
	const meta = { extractor_version: extractorVersion, docsToProcess: qty };
	const { data: billData, error: billErr } = await supabase.rpc('spend_credits_for_usage_event', {
		p_org_id: orgId,
		p_seat_id: seatId,
		p_run_id: runId,
		p_category: 'entity_extract',
		p_provider: 'local',
		p_unit: 'document_processed',
		p_qty: qty,
		p_credit_cost: qty,
		p_raw_cost_cents: 0,
		p_meta: meta
	});
	if (billErr || !billData?.ok) {
		return {
			ok: false,
			docsProcessed: 0,
			mentionsCreated: 0,
			byTypeCounts: {},
			failures: [{
				documentId: 'N/A',
				error: billErr?.message || (billData?.reason ?? 'billing_failed')
			}],
			billing_error: {
				code: 'INSUFFICIENT_CREDITS',
				reason: billData?.reason,
				included_remaining_credits: billData?.included_remaining_credits ?? null,
				wallet_balance_cents: billData?.wallet_balance_cents ?? null,
				required_wallet_cents: billData?.required_wallet_cents ?? null
			}
		};
	}

	// 3) Process documents with concurrency
	const byTypeCounts: Record<string, number> = {};
	let mentionsCreated = 0;
	const failures: Array<{ documentId: string; error: string }> = [];

	await withConcurrency(toProcess, concurrency, async (doc) => {
		try {
			const text = String(doc.text || '');
			const mentions: MentionRow[] = [];
			const seen = new Set<string>(); // key: type|norm

			// Emails
			for (const m of extractEmails(text)) {
				const key = `email|${m.norm}`;
				if (seen.has(key)) continue;
				seen.add(key);
				mentions.push({
					document_id: doc.id,
					entity_type: 'email',
					value_raw: m.raw,
					value_normalized: m.norm,
					confidence: 0.9,
					context_snippet: contextSnippet(text, m.index, m.raw.length),
					source: 'document_text',
					meta: {}
				});
			}

			// IPv4
			for (const m of extractIPv4(text)) {
				const key = `ip|${m.norm}`;
				if (seen.has(key)) continue;
				seen.add(key);
				mentions.push({
					document_id: doc.id,
					entity_type: 'ip',
					value_raw: m.raw,
					value_normalized: m.norm,
					confidence: 0.85,
					context_snippet: contextSnippet(text, m.index, m.raw.length),
					source: 'document_text',
					meta: {}
				});
			}

			// URLs - also extract domain from each URL
			const urls = extractUrls(text);
			const urlHosts = new Set<string>();
			for (const u of urls) {
				const key = `url|${u.norm}`;
				if (!seen.has(key)) {
					seen.add(key);
					mentions.push({
						document_id: doc.id,
						entity_type: 'url',
						value_raw: u.raw,
						value_normalized: u.norm,
						confidence: 0.9,
						context_snippet: contextSnippet(text, u.index, u.raw.length),
						source: 'document_text',
						meta: { host: u.host, path: u.path }
					});
				}
				
				// Extract domain from URL host (with relevance filtering for generic domains)
				if (u.host) {
					const hostNorm = u.host.toLowerCase().replace(/^www\./, '');
					urlHosts.add(hostNorm);
					const domKey = `domain|${hostNorm}`;
					if (!seen.has(domKey)) {
						// For generic social/platform domains, only include if URL path or context mentions subject
						if (isGenericDomain(hostNorm)) {
							const urlPath = u.path?.toLowerCase() || '';
							const snippet = contextSnippet(text, u.index, u.raw.length);
							const pathMentionsSubject = subjectTerms.length > 0 && subjectTerms.some(t => urlPath.includes(t));
							const contextMentionsSubject = subjectTerms.length > 0 && textMentionsSubject(snippet, subjectTerms);
							if (!pathMentionsSubject && !contextMentionsSubject) {
								// Skip this generic domain - not relevant to subject
								continue;
							}
						}
						seen.add(domKey);
						mentions.push({
							document_id: doc.id,
							entity_type: 'domain',
							value_raw: hostNorm,
							value_normalized: hostNorm,
							confidence: 0.85,
							context_snippet: contextSnippet(text, u.index, u.raw.length),
							source: 'document_text',
							meta: { from_url: u.norm }
						});
					}
				}

				// Social profile classification
				const platform = socialPlatformFromHost(u.host);
				if (platform) {
					const spKey = `social_profile|${u.norm}`;
					if (!seen.has(spKey)) {
						seen.add(spKey);
						mentions.push({
							document_id: doc.id,
							entity_type: 'social_profile',
							value_raw: u.raw,
							value_normalized: u.norm,
							confidence: 0.9,
							context_snippet: contextSnippet(text, u.index, u.raw.length),
							source: 'document_text',
							meta: { platform }
						});
					}
					const handle = usernameFromPath(platform, u.path);
					if (handle) {
						const unameKey = `username|${handle}`;
						if (!seen.has(unameKey)) {
							seen.add(unameKey);
							mentions.push({
								document_id: doc.id,
								entity_type: 'username',
								value_raw: handle,
								value_normalized: handle,
								confidence: 0.8,
								context_snippet: contextSnippet(text, u.index, u.raw.length),
								source: 'document_text',
								meta: { platform, from_url: u.norm }
							});
						}
					}
				}
			}

			// Also include the current page's host and URL as mentions
			try {
				if (doc.canonical_url) {
					const u = new URL(doc.canonical_url);
					const host = u.host.toLowerCase().replace(/^www\./, '');
					const dkey = `domain|${host}`;
					if (!seen.has(dkey)) {
						// For generic domains, check if URL path or title mentions subject
						let shouldIncludeDomain = true;
						if (isGenericDomain(host)) {
							const urlPath = u.pathname?.toLowerCase() || '';
							const titleText = doc.title?.toLowerCase() || '';
							const pathMentionsSubject = subjectTerms.length > 0 && subjectTerms.some(t => urlPath.includes(t));
							const titleMentionsSubject = subjectTerms.length > 0 && subjectTerms.some(t => titleText.includes(t));
							shouldIncludeDomain = pathMentionsSubject || titleMentionsSubject;
						}
						if (shouldIncludeDomain) {
							seen.add(dkey);
							mentions.push({
								document_id: doc.id,
								entity_type: 'domain',
								value_raw: host,
								value_normalized: host,
								confidence: 0.85,
								context_snippet: (doc.title ?? null),
								source: 'document_url',
								meta: {}
							} as unknown as MentionRow);
						}
					}
					const normSelf = normalizeUrl(u.toString());
					if (normSelf) {
						const ukey = `url|${normSelf.norm}`;
						if (!seen.has(ukey)) {
							seen.add(ukey);
							mentions.push({
								document_id: doc.id,
								entity_type: 'url',
								value_raw: normSelf.raw,
								value_normalized: normSelf.norm,
								confidence: 0.9,
								context_snippet: (doc.title ?? null),
								source: 'document_url',
								meta: { host: normSelf.host, path: normSelf.path, is_page: true } as Record<string, unknown>
							} as unknown as MentionRow);
						}
					}
				}
			} catch {
				// ignore parse errors
			}

			// Domains (standalone + from URLs) - with relevance filtering
			for (const d of extractDomains(text)) {
				if (urlHosts.has(d.norm)) continue; // already covered by URL host
				const key = `domain|${d.norm}`;
				if (seen.has(key)) continue;
				
				// For generic domains found in text, require context to mention subject
				if (isGenericDomain(d.norm)) {
					const snippet = contextSnippet(text, d.index, d.raw.length);
					const contextMentionsSubject = subjectTerms.length > 0 && textMentionsSubject(snippet, subjectTerms);
					if (!contextMentionsSubject) {
						// Skip - generic domain without subject context
						continue;
					}
				}
				
				seen.add(key);
				mentions.push({
					document_id: doc.id,
					entity_type: 'domain',
					value_raw: d.raw,
					value_normalized: d.norm,
					confidence: 0.8,
					context_snippet: contextSnippet(text, d.index, d.raw.length),
					source: 'document_text',
					meta: {}
				});
			}

			// Phones
			for (const p of extractPhones(text)) {
				const key = `phone|${p.norm}`;
				if (seen.has(key)) continue;
				seen.add(key);
				mentions.push({
					document_id: doc.id,
					entity_type: 'phone',
					value_raw: p.raw,
					value_normalized: p.norm,
					confidence: 0.75,
					context_snippet: contextSnippet(text, p.index, p.raw.length),
					source: 'document_text',
					meta: { region: 'US' }
				});
			}

			if (mentions.length === 0) {
				return;
			}

			// Deduplicate across all types by (type, norm)
			const unique: MentionRow[] = [];
			const uniqSet = new Set<string>();
			for (const m of mentions) {
				const k = `${m.entity_type}|${m.value_normalized}`;
				if (!uniqSet.has(k)) {
					uniqSet.add(k);
					unique.push(m);
				}
			}

			// Upsert (ignore duplicates via onConflict)
			const { data: inserted, error: insErr } = await supabase
				.from('document_entity_mentions')
				.upsert(unique as any, { onConflict: 'document_id,entity_type,value_normalized', ignoreDuplicates: true })
				.select('id, entity_type, value_normalized');
			if (insErr) {
				failures.push({ documentId: doc.id, error: insErr.message });
				return;
			}
			const added = Array.isArray(inserted) ? inserted.length : 0;
			mentionsCreated += added;
			// Count per type from the ones we attempted to insert and were actually inserted
			if (Array.isArray(inserted)) {
				for (const row of inserted as Array<{ id: string; entity_type: string; value_normalized: string }>) {
					byTypeCounts[row.entity_type] = (byTypeCounts[row.entity_type] || 0) + 1;
				}
			}
		} catch (e: any) {
			failures.push({ documentId: doc.id, error: e?.message ?? String(e) });
		}
	});

	return {
		ok: true,
		docsProcessed: toProcess.length,
		mentionsCreated,
		byTypeCounts,
		failures
	};
}

export default { extractEntitiesForRun };



/**
 * CRO Studio — destination handoff check
 * Verifies the first in-body link in the first 400 words points to the destination page.
 * This is the reverse silo in practice: link equity must flow to the destination.
 *
 * Spec: cro-studio.md — checkDestinationHandoff()
 */

import { normalizeUrl } from './urlNormalize.js';
import type { ParsedPageContent } from './fetchAndParseURL.js';

/** Result of the destination handoff check */
export interface DestinationHandoffResult {
	/** 'pass' if first link matches destination, 'fail' otherwise */
	status: 'pass' | 'fail';
	/** Human-readable evidence for the audit report */
	evidence: string;
	/** URL of the first link found (absolute, resolved), or null if no links */
	first_link_found: string | null;
	/** Anchor text of the first link, when present */
	anchor_text: string | null;
	/** True iff the first link points to the destination */
	destination_match: boolean;
}

/**
 * Resolve a potentially relative href against a base URL.
 */
function resolveHref(href: string, baseUrl: string): string {
	href = href.trim();
	if (!href || href.startsWith('#') || href.toLowerCase().startsWith('javascript:')) {
		return '';
	}
	try {
		return new URL(href, baseUrl).href;
	} catch {
		return href;
	}
}

/**
 * Check if the first link in the first N words of body content points to the destination URL.
 * Normalizes both URLs (strip trailing slash, lowercase, strip www) before comparison.
 *
 * @param content - Parsed page content from fetchAndParseURL
 * @param destination_url - Expected destination page URL (e.g. from targets.destination_page_url)
 * @param word_limit - Number of words to consider (default 400)
 * @returns DestinationHandoffResult
 */
export function checkDestinationHandoff(
	content: ParsedPageContent | null,
	destination_url: string,
	word_limit = 400
): DestinationHandoffResult {
	if (!content) {
		return {
			status: 'fail',
			evidence: 'Could not fetch or parse the page. The handoff check could not run.',
			first_link_found: null,
			anchor_text: null,
			destination_match: false
		};
	}

	// Get first link in the first N words (links are in document order)
	const firstLinkInSection = content.links.find((l) => l.wordOffset < word_limit);

	if (!firstLinkInSection) {
		return {
			status: 'fail',
			evidence: `No links found in the first ${word_limit} words of body content.`,
			first_link_found: null,
			anchor_text: null,
			destination_match: false
		};
	}

	const resolvedHref = resolveHref(firstLinkInSection.href, content.pageUrl);
	if (!resolvedHref) {
		return {
			status: 'fail',
			evidence: 'The first link in body content could not be resolved to a valid URL.',
			first_link_found: firstLinkInSection.href,
			anchor_text: firstLinkInSection.text || null,
			destination_match: false
		};
	}

	const normalizedFirst = normalizeUrl(resolvedHref);
	const normalizedDestination = normalizeUrl(destination_url);

	if (normalizedFirst === normalizedDestination) {
		return {
			status: 'pass',
			evidence: `First in-body link correctly points to destination: ${resolvedHref}`,
			first_link_found: resolvedHref,
			anchor_text: firstLinkInSection.text || null,
			destination_match: true
		};
	}

	return {
		status: 'fail',
		evidence: `First in-body link points to ${resolvedHref}, not to destination ${destination_url}. Link equity is flowing to the wrong page.`,
		first_link_found: resolvedHref,
		anchor_text: firstLinkInSection.text || null,
		destination_match: false
	};
}

/**
 * UPSA — Universal Page Scoring Algorithm (max 115 points)
 *
 * Patent grounding:
 *   Module 1 (Structural, 25pts)        — inverted index weights, keyword placement
 *   Module 2 (Semantic, 25pts)          — SCS formula [LSI 15pts, Entity 10pts]
 *   Module 3 (Content Quality, 25pts)   — US20190155948A1 + US9940367B1 + intent alignment
 *   Module 4 (Passage Readiness, 15pts) — US9940367B1 + US9959315B1
 *   Module 5 (Technical, 10pts)         — schema, meta, canonical, internal links
 *   IGS Bonus (+15pts)                  — US20190155948A1 (Information Gain Score)
 *
 * Section 17.1 of Sharkly_Complete_Product_Spec_V4.md is the authoritative reference.
 * Max total: 115 points.
 *
 * CORRECTIONS vs previous version:
 *   - Module 1: max reduced from 40 → 25; added title ≤60 chars, keyword-first,
 *     URL slug keyword, exactly-1-H1 checks
 *   - Module 2: LSI/Entity weights corrected (was Entity 12/LSI 8, now LSI 15/Entity 10);
 *     max increased from 20 → 25
 *   - Module 3: added Intent Alignment (9pts), first-sentence-answers-heading (4pts),
 *     ≥3 images check, TOC check; hasExtLink fixed to check external links
 *   - Module 4: new Passage Readiness module (replaces UX module)
 *   - Module 5: new Technical module (schema, meta 150–155 chars, internal links)
 *   - Meta description lower bound corrected from 50 → 150
 */

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

export type BriefEntity = {
	term: string;
	competitor_count?: number;
	importance_pct?: number;
	must_cover?: boolean;
};

export type BriefLsiTerm = {
	term: string;
	competitor_count?: number;
	importance_pct?: number;
};

export type BriefPaaQuestion = {
	question: string;
	answered_in_content?: boolean;
};

export type SeoScoreInput = {
	/** Tiptap JSON document */
	content: { type: string; content?: unknown[] } | null;
	/** Target keyword for the page */
	keyword: string;
	/** Target word count from competitor average */
	targetWordCount: number;
	/** Meta description (from page record) */
	metaDescription: string | null;
	/** Meta title (from page record) */
	metaTitle?: string | null;
	/** URL slug for the page (e.g. "/best-crm-software") */
	urlSlug?: string | null;
	/** Whether schema has been generated for this page */
	schemaGenerated?: boolean;
	/** Entities from brief_data.entities */
	entities?: BriefEntity[];
	/** LSI terms from brief_data.lsi_terms */
	lsiTerms?: BriefLsiTerm[];
	/** PAA questions from brief_data.paa_questions */
	paaQuestions?: BriefPaaQuestion[];
	/** Base URL to help classify internal vs external links */
	baseUrl?: string;
	/** Search intent for this page: informational | commercial | transactional */
	searchIntent?: 'informational' | 'commercial' | 'transactional';
};

// ---------------------------------------------------------------------------
// Module type definitions — 5 modules + IGS bonus
// ---------------------------------------------------------------------------

export type UPSAModule1 = {
	score: number;
	max: 25;
	// Sub-checks
	keywordInTitle: boolean; // 7pts
	keywordFirstInTitle: boolean; // 2pts bonus (keyword appears in first half of title)
	titleLe60Chars: boolean; // 2pts
	keywordInH1: boolean; // 7pts
	exactlyOneH1: boolean; // 2pts
	keywordInFirst100: boolean; // 3pts
	keywordInUrlSlug: boolean; // 2pts
};

export type UPSAModule2 = {
	score: number;
	max: 25;
	// LSI: 15pts max (corrected — was 8pts, inverted with entity)
	lsiCoverage: number; // 0–15 pts
	lsiPct: number; // 0–1
	// Entity: 10pts max (corrected — was 12pts)
	entityCoverage: number; // 0–10 pts
	entityPct: number; // 0–1
};

export type UPSAModule3 = {
	score: number;
	max: 25;
	// Intent alignment: 9pts — largest single sub-check
	intentAlignmentScore: number; // 0–9 pts
	intentAligned: boolean;
	// Word count vs competitor average: 8pts
	wordCountScore: number; // 0–8 pts
	wordCountCurrent: number;
	wordCountRatio: number;
	// PAA coverage: 4pts
	paaCoverageScore: number; // 0–4 pts
	// Rich elements: 4pts (FAQ, table, ≥2 lists, ≥3 images, TOC)
	richElementsScore: number; // 0–4 pts
	hasFAQ: boolean;
	hasTable: boolean;
	hasLists: boolean;
	hasImages: boolean; // ≥3 images
	hasTOC: boolean;
	hasExternalLink: boolean; // external link (fixed from internal)
};

export type UPSAModule4 = {
	score: number;
	max: 15;
	// Passage-ready H2s — S2-1: bidirectional (rewards good, penalizes contamination)
	passageReadyH2Score: number; // -5 to +10 (was 0-7 additive)
	passageReadyH2Count: number;
	h2Count: number;
	vagueH2Count: number; // H2s that are not passage-ready (contamination)
	passageReadyRatio: number; // 0–1
	h2ContaminationPenalty: boolean; // true when ratio < 0.3
	// First sentence answers heading: 1pt per section, max 4pts
	firstSentenceAnswersScore: number;
	firstSentenceAnswerCount: number;
	sectionCount: number;
	// FAQ section present: 4pts
	faqSectionScore: number;
	hasFaqSection: boolean;
};

export type UPSAModule5 = {
	score: number;
	max: 10;
	// Meta description 150–155 chars: 4pts (corrected lower bound from 50 → 150)
	metaDescriptionScore: number;
	metaDescriptionLength: number;
	hasValidMetaDescription: boolean;
	// Schema markup: 3pts
	schemaScore: number;
	hasSchema: boolean;
	// Internal links (≥2 in body): 3pts
	internalLinksScore: number;
	internalLinksCount: number;
};

export type IGSBreakdown = {
	score: number;
	max: 15;
	originalResearch: boolean; // +5
	expertQuotes: boolean; // +4
	firstHand: boolean; // +3
	uniqueViz: boolean; // +2
	contrarian: boolean; // +1
};

export type KeywordDensityBreakdown = {
	score: number; // -5 to +10
	status: 'too_low' | 'optimal' | 'slightly_high' | 'keyword_stuffing';
	densityPct: number;
	keywordCount: number;
	wordCount: number;
	message: string;
};

export type SeoScoreBreakdown = {
	module1: UPSAModule1;
	module2: UPSAModule2;
	module3: UPSAModule3;
	module4: UPSAModule4;
	module5: UPSAModule5;
	igs: IGSBreakdown;
	keywordDensity: KeywordDensityBreakdown; // S2-2: bidirectional density
	total: number; // max 115
	skyscraperWarning: boolean;
};

// ---------------------------------------------------------------------------
// DOM / content extraction helpers
// ---------------------------------------------------------------------------

type TiptapNode = {
	type?: string;
	text?: string;
	attrs?: Record<string, unknown>;
	marks?: unknown[];
	content?: TiptapNode[];
};

function walkNodes(nodes: TiptapNode[], visitor: (n: TiptapNode) => void) {
	for (const n of nodes) {
		visitor(n);
		if (n.content) walkNodes(n.content, visitor);
	}
}

/** Exported for CRO checklist (system-1-cro-layer). Strips to plain text from Tiptap doc. */
export function extractPlainText(doc: TiptapNode | null): string {
	if (!doc) return '';
	const parts: string[] = [];
	walkNodes(doc.content ?? [], (n) => {
		if (n.text) parts.push(n.text);
	});
	return parts.join(' ');
}

/** Exported for CRO checklist Item 1. Returns H1 heading texts from Tiptap doc. */
export function extractH1s(doc: TiptapNode | null): string[] {
	if (!doc) return [];
	const result: string[] = [];
	walkNodes(doc.content ?? [], (n) => {
		if (n.type === 'heading' && (n.attrs?.level as number) === 1) {
			result.push(extractPlainText(n));
		}
	});
	return result;
}

function extractH2s(doc: TiptapNode | null): string[] {
	if (!doc) return [];
	const result: string[] = [];
	walkNodes(doc.content ?? [], (n) => {
		if (n.type === 'heading' && (n.attrs?.level as number) === 2) {
			result.push(extractPlainText(n));
		}
	});
	return result;
}

/**
 * Extract paragraph nodes as an array of text strings.
 * Used for first-sentence-answers-heading detection.
 */
function extractParagraphs(doc: TiptapNode | null): string[] {
	if (!doc) return [];
	const result: string[] = [];
	walkNodes(doc.content ?? [], (n) => {
		if (n.type === 'paragraph') {
			const text = extractPlainText(n).trim();
			if (text.length > 0) result.push(text);
		}
	});
	return result;
}

/**
 * Extract heading→first-paragraph pairs for first-sentence-answers-heading check.
 * Returns array of { heading, firstParagraph } for each H2 section.
 */
function extractSections(
	doc: TiptapNode | null
): Array<{ heading: string; firstParagraph: string }> {
	if (!doc) return [];
	const sections: Array<{ heading: string; firstParagraph: string }> = [];
	const nodes = doc.content ?? [];
	let currentHeading: string | null = null;

	for (const n of nodes as TiptapNode[]) {
		if (n.type === 'heading' && (n.attrs?.level as number) === 2) {
			currentHeading = extractPlainText(n).trim();
		} else if (n.type === 'paragraph' && currentHeading !== null) {
			const text = extractPlainText(n).trim();
			if (text.length > 0) {
				sections.push({ heading: currentHeading, firstParagraph: text });
				currentHeading = null; // only capture first paragraph per section
			}
		}
	}
	return sections;
}

/**
 * Separate internal and external links from the document.
 */
function extractLinks(
	doc: TiptapNode | null,
	baseUrl?: string
): { internal: string[]; external: string[] } {
	if (!doc) return { internal: [], external: [] };
	const internal: string[] = [];
	const external: string[] = [];
	const normalBase = baseUrl?.replace(/\/$/, '').toLowerCase();

	walkNodes(doc.content ?? [], (n) => {
		if (n.type === 'text' && n.marks) {
			for (const m of n.marks as Array<{ type?: string; attrs?: { href?: string } }>) {
				if (m.type === 'link' && m.attrs?.href) {
					const href = m.attrs.href;
					const hrefLower = href.toLowerCase();
					const isRelative =
						href.startsWith('/') ||
						href.startsWith('#') ||
						(!href.startsWith('http') && !href.startsWith('mailto:'));
					const isSameDomain = normalBase
						? hrefLower.startsWith(normalBase + '/') || hrefLower === normalBase
						: false;

					if (isRelative || isSameDomain) {
						internal.push(href);
					} else if (href.startsWith('http') && !href.startsWith('mailto:')) {
						external.push(href);
					}
				}
			}
		}
	});

	return { internal, external };
}

/** Count nodes of a given Tiptap node type (e.g. 'table', 'bulletList'). */
function countNodeType(doc: TiptapNode | null, type: string): number {
	if (!doc) return 0;
	let n = 0;
	walkNodes(doc.content ?? [], (node) => {
		if (node.type === type) n++;
	});
	return n;
}

/** Count image nodes in the Tiptap document. */
function countImages(doc: TiptapNode | null): number {
	if (!doc) return 0;
	let n = 0;
	walkNodes(doc.content ?? [], (node) => {
		if (node.type === 'image') n++;
	});
	return n;
}

function countWords(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Stop words list (used in kwWordCoverage)
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
	'a',
	'an',
	'the',
	'and',
	'or',
	'but',
	'in',
	'on',
	'at',
	'to',
	'for',
	'of',
	'with',
	'by',
	'from',
	'as',
	'is',
	'are',
	'was',
	'were',
	'be',
	'been',
	'being',
	'have',
	'has',
	'had',
	'do',
	'does',
	'did',
	'will',
	'would',
	'could',
	'should',
	'may',
	'might',
	'its',
	'it',
	'this',
	'that',
	'these',
	'those',
	'i',
	'we',
	'you',
	'he',
	'she',
	'they',
	'my',
	'your',
	'our',
	'their',
	'all',
	'any',
	'both',
	'each'
]);

export function kwWordCoverage(keyword: string, text: string): number {
	const textLower = text.toLowerCase();
	const words = keyword
		.toLowerCase()
		.split(/[\s\-–—\/]+/)
		.map((w) => w.replace(/[^a-z0-9]/g, ''))
		.filter((w) => w.length > 1 && !STOP_WORDS.has(w));
	if (words.length === 0) return 1;
	const matched = words.filter((w) => textLower.includes(w)).length;
	return matched / words.length;
}

/**
 * kwMatch — true if the keyword appears verbatim OR ≥85% of its significant
 * words appear in the target text. The 85% threshold allows one stop-word
 * mismatch or a minor variant without penalising naturally written copy.
 */
export function kwMatch(keyword: string, text: string): boolean {
	const lower = text.toLowerCase();
	const kw = keyword.toLowerCase().trim();
	return lower.includes(kw) || kwWordCoverage(keyword, text) >= 0.85;
}

/**
 * isPassageReadyH2 — US9940367B1 + US9959315B1
 * H2s written as specific answerable questions create stronger passage context
 * vectors. Returns true if the heading ends with "?" or starts with a question word.
 */
export function isPassageReadyH2(heading: string): boolean {
	const text = heading.toLowerCase().trim();
	const questionWords = [
		'how',
		'what',
		'why',
		'when',
		'which',
		'can',
		'does',
		'is',
		'are',
		'do',
		'will',
		'should'
	];
	return text.endsWith('?') || questionWords.some((w) => text.startsWith(w + ' '));
}

/**
 * countKeywordOccurrences — S2-2 keyword density (product-gaps-master.md V1.2e)
 * Counts how many times the keyword phrase appears in text (case-insensitive).
 * Uses word-boundary-aware matching for multi-word keywords.
 */
function countKeywordOccurrences(text: string, keyword: string): number {
	if (!text || !keyword.trim()) return 0;
	const lower = text.toLowerCase();
	const kw = keyword.toLowerCase().trim();
	if (!kw) return 0;
	// Exact phrase count (non-overlapping)
	const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
	const matches = lower.match(regex);
	return matches ? matches.length : 0;
}

/**
 * scoreKeywordDensity — S2-2 bidirectional density (product-gaps-master.md V1.2e)
 * Above 3% = -5 pts (keyword stuffing). Optimal 0.5–2% = +10. Slightly high 2–3% = +5.
 */
export function scoreKeywordDensity(
	content: string,
	keyword: string
): KeywordDensityBreakdown {
	const words = content.trim().split(/\s+/).filter(Boolean);
	const wordCount = words.length;
	const keywordCount = countKeywordOccurrences(content, keyword);
	const density =
		wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;

	if (density < 0.5) {
		return {
			score: 0,
			status: 'too_low',
			densityPct: density,
			keywordCount,
			wordCount,
			message: 'Keyword appears too rarely — add natural mentions.'
		};
	}
	if (density >= 0.5 && density <= 2.0) {
		return {
			score: 10,
			status: 'optimal',
			densityPct: density,
			keywordCount,
			wordCount,
			message: 'Keyword density is in the optimal range.'
		};
	}
	if (density > 2.0 && density <= 3.0) {
		return {
			score: 5,
			status: 'slightly_high',
			densityPct: density,
			keywordCount,
			wordCount,
			message: 'Keyword density is slightly high — consider reducing.'
		};
	}
	const targetCount = Math.ceil(wordCount * 0.02);
	const removeCount = Math.max(0, keywordCount - targetCount);
	return {
		score: -5,
		status: 'keyword_stuffing',
		densityPct: density,
		keywordCount,
		wordCount,
		message: `Keyword appears ${keywordCount} times in ${wordCount} words (${density.toFixed(1)}%). Above the natural threshold — remove ~${removeCount} instances to avoid semantic distortion.`
	};
}

/**
 * firstSentenceAnswersHeading — US9940367B1
 * Checks whether the first sentence of a section directly answers its H2.
 * Heuristic: ≥2 significant words from the heading appear in the first sentence.
 */
function firstSentenceAnswersHeading(heading: string, firstParagraph: string): boolean {
	const firstSentence = firstParagraph.split(/[.!?]/)[0] ?? '';
	const headingWords = heading
		.toLowerCase()
		.split(/\s+/)
		.map((w) => w.replace(/[^a-z0-9]/g, ''))
		.filter((w) => w.length > 2 && !STOP_WORDS.has(w));
	const sentenceLower = firstSentence.toLowerCase();
	const matched = headingWords.filter((w) => sentenceLower.includes(w)).length;
	return matched >= 2;
}

/**
 * calculateIGS — US20190155948A1 (Information Gain Score)
 * Client-side heuristics that catch most genuine IGS content.
 * IGS = 0 is a warning ("Skyscraper content"), not a verdict.
 *
 * @param body  Plain-text content (from extractPlainText)
 * @param doc   Optional Tiptap document — used for table/list detection
 */
export function calculateIGS(body: string, doc?: TiptapNode | null): IGSBreakdown {
	const lower = body.toLowerCase();
	let score = 0;

	// +5 Original research / data
	const dataSignals = [
		'%',
		'survey',
		'we found',
		'our data',
		'our study',
		'in our experience',
		'we tested',
		'our analysis',
		'our research',
		'according to our',
		'in our case'
	];
	const originalResearch = dataSignals.some((s) => lower.includes(s));
	if (originalResearch) score += 5;

	// +4 Expert quotes with attribution (20+ char quoted string + attribution verb)
	const expertQuotes =
		/"\S.{18,}\S"/.test(body) && /according to|said|explained|told us|noted|shared/.test(lower);
	if (expertQuotes) score += 4;

	// +3 First-hand experience signals
	const firstHand =
		/\b(i|we)\b.{0,50}(tested|tried|used|found|noticed|experienced|discovered)/i.test(body);
	if (firstHand) score += 3;

	// +2 Unique visualization: Tiptap table node, markdown-table pipes, or
	// any structured multi-list content (≥2 list nodes).
	const hasTiptapTable = doc ? countNodeType(doc, 'table') > 0 : false;
	const hasTiptapLists = doc
		? countNodeType(doc, 'bulletList') + countNodeType(doc, 'orderedList') >= 2
		: false;
	const uniqueViz = hasTiptapTable || hasTiptapLists || /\|.+\|.+\|/.test(body);
	if (uniqueViz) score += 2;

	// +1 Contrarian perspective
	const contrarianSignals = [
		'however,',
		'contrary to',
		'despite popular',
		'actually,',
		'in reality,',
		'the truth is',
		'this is wrong',
		'myth:'
	];
	const contrarian = contrarianSignals.some((s) => lower.includes(s));
	if (contrarian) score += 1;

	return {
		score: Math.min(15, score),
		max: 15,
		originalResearch,
		expertQuotes,
		firstHand,
		uniqueViz,
		contrarian
	};
}

// ---------------------------------------------------------------------------
// Main UPSA scoring function (Section 17.1)
// ---------------------------------------------------------------------------

export function computeSeoScore(input: SeoScoreInput): SeoScoreBreakdown {
	const {
		content,
		keyword,
		targetWordCount,
		metaDescription,
		metaTitle,
		urlSlug,
		schemaGenerated,
		entities = [],
		lsiTerms = [],
		paaQuestions = [],
		baseUrl,
		searchIntent = 'informational'
	} = input;

	const doc = (content && 'content' in content ? content : { content: [] }) as TiptapNode;
	const body = extractPlainText(doc);
	const bodyLower = body.toLowerCase();
	const kw = keyword.toLowerCase().trim();
	const h1s = extractH1s(doc);
	const h2s = extractH2s(doc);
	const { internal: internalLinks, external: externalLinks } = extractLinks(doc, baseUrl);
	const sections = extractSections(doc);
	const words = countWords(body);
	const imageCount = countImages(doc);

	// -----------------------------------------------------------------------
	// MODULE 1 — Structural Signals (max 25 pts)
	// Keyword placement in high-weight structural positions.
	// -----------------------------------------------------------------------

	// Keyword in title: 7pts
	const keywordInTitle = metaTitle ? kwMatch(kw, metaTitle) : false;

	// Keyword appears in title front (keyword-first position): 2pts bonus
	// Loose word-level match — Google tolerates reordering (same logic as MetaSidebar)
	const keywordFirstInTitle = (() => {
		if (!metaTitle || !keyword.trim()) return false;
		const titleLower = metaTitle.toLowerCase();
		const frontLen = Math.min(50, titleLower.length);
		const front = titleLower.slice(0, frontLen);
		const kwWords = keyword
			.toLowerCase()
			.trim()
			.split(/\s+/)
			.filter((w) => w.length >= 2);
		if (kwWords.length === 0) return false;
		const matches = kwWords.filter((w) => front.includes(w)).length;
		return matches >= Math.ceil(kwWords.length * 0.75);
	})();

	// Title ≤60 chars: 2pts
	const titleLe60Chars = metaTitle ? metaTitle.trim().length <= 60 : false;

	// Keyword in H1: 7pts
	const keywordInH1 = h1s.some((h) => kwMatch(kw, h));

	// Exactly one H1: 2pts
	const exactlyOneH1 = h1s.length === 1;

	// Keyword in first 100 words (~600 chars): 3pts
	const keywordInFirst100 = kwMatch(kw, body.slice(0, 600));

	// Keyword in URL slug: 2pts (looser 75% word match — slug may be abbreviated)
	const keywordInUrlSlug = (() => {
		if (!urlSlug || !keyword.trim()) return false;
		const slugNormalized = urlSlug.toLowerCase().replace(/[-_/]/g, ' ');
		return (
			slugNormalized.includes(kw) ||
			kwWordCoverage(keyword, slugNormalized) >= 0.75
		);
	})();

	const m1Score =
		(keywordInTitle ? 7 : 0) +
		(keywordFirstInTitle ? 2 : 0) +
		(titleLe60Chars ? 2 : 0) +
		(keywordInH1 ? 7 : 0) +
		(exactlyOneH1 ? 2 : 0) +
		(keywordInFirst100 ? 3 : 0) +
		(keywordInUrlSlug ? 2 : 0);

	const module1: UPSAModule1 = {
		score: Math.min(25, m1Score),
		max: 25,
		keywordInTitle,
		keywordFirstInTitle,
		titleLe60Chars,
		keywordInH1,
		exactlyOneH1,
		keywordInFirst100,
		keywordInUrlSlug
	};

	// -----------------------------------------------------------------------
	// MODULE 2 — Semantic Completeness (max 25 pts)
	// CORRECTED: LSI = 15pts max, Entity = 10pts max (was inverted: Entity 12, LSI 8)
	// LSI terms (topical language) weight 1.5× more than entity mentions per
	// the SCS formula grounded in the semantic density model (Dissertation §4.2).
	// -----------------------------------------------------------------------

	const coveredLsi = lsiTerms.filter((t) => t.term && kwMatch(t.term, body)).length;
	const coveredEntities = entities.filter((e) => e.term && kwMatch(e.term, body)).length;

	const lsiPct = lsiTerms.length > 0 ? coveredLsi / lsiTerms.length : 0;
	const entityPct = entities.length > 0 ? coveredEntities / entities.length : 0;

	// LSI: max 15pts (corrected from 8pts)
	const lsiCoverage = Math.round(lsiPct * 15);
	// Entity: max 10pts (corrected from 12pts)
	const entityCoverage = Math.round(entityPct * 10);

	const m2Score = lsiCoverage + entityCoverage;
	const module2: UPSAModule2 = {
		score: Math.min(25, m2Score),
		max: 25,
		lsiCoverage,
		lsiPct,
		entityCoverage,
		entityPct
	};

	// -----------------------------------------------------------------------
	// MODULE 3 — Content Quality (max 25 pts)
	// -----------------------------------------------------------------------

	// Intent Alignment: 9pts — largest single sub-check (was entirely missing)
	// Checks whether content format and signals match the search intent type.
	const intentAligned = (() => {
		if (searchIntent === 'transactional') {
			// Commercial/transactional pages need CTA signals and pricing language
			return /buy|price|cost|\$|order|purchase|get started|sign up|free trial|contact us/i.test(
				body
			);
		}
		if (searchIntent === 'commercial') {
			// Comparison / review intent — needs evaluation language
			return /best|review|compare|vs|versus|top|recommended|pros|cons|alternative/i.test(body);
		}
		// Informational — needs explanation language and structure
		return (
			h2s.length >= 2 && /how|what|why|guide|steps|tips|explained|overview|introduction/i.test(body)
		);
	})();
	const intentAlignmentScore = intentAligned ? 9 : 0;

	// Word count vs competitor average: 8pts
	const ratio = targetWordCount > 0 ? words / targetWordCount : 1;
	const wordCountScore = ratio >= 1.0 ? 8 : ratio >= 0.85 ? 5 : ratio >= 0.7 ? 2 : 0;

	// PAA questions answered: 1pt each, max 4pts
	const answeredPAA = paaQuestions.filter((q) => {
		const sigWords = q.question
			.toLowerCase()
			.split(/\s+/)
			.map((w) => w.replace(/[^a-z0-9]/g, ''))
			.filter((w) => w.length > 2 && !STOP_WORDS.has(w))
			.slice(0, 5);
		if (sigWords.length === 0) return false;
		const matchedWords = sigWords.filter((w) => bodyLower.includes(w)).length;
		return matchedWords >= Math.min(3, sigWords.length);
	}).length;
	const paaCoverageScore = Math.min(answeredPAA * 1, 4);

	// Rich elements: 1pt each, max 4pts
	const hasFAQ = /faq|frequently asked/i.test(body);
	const hasTiptapTable = countNodeType(doc, 'table') > 0;
	const hasMarkdownTable = /\|.+\|.+\|/.test(body);
	const hasTable = hasTiptapTable || hasMarkdownTable;
	const listsCount =
		countNodeType(doc, 'bulletList') +
		countNodeType(doc, 'orderedList') +
		(body.match(/<[uo]l/gi) ?? []).length;
	const hasLists = listsCount >= 2;
	// ≥3 images: CORRECTED — was missing entirely
	const hasImages = imageCount >= 3;
	// Table of contents: CORRECTED — was missing entirely
	const hasTOC =
		/table of contents|jump to section|in this (article|guide|post)/i.test(body) ||
		countNodeType(doc, 'tableOfContents') > 0;
	// External link: CORRECTED — was checking internal links (hasExtLink bug)
	const hasExternalLink = externalLinks.length > 0;

	// Score up to 4pts from: FAQ, table, lists, images, TOC, external link
	// Take the best 4 signals
	const richSignals = [hasFAQ, hasTable, hasLists, hasImages, hasTOC, hasExternalLink];
	const richElementsScore = Math.min(richSignals.filter(Boolean).length, 4);

	const m3Score = intentAlignmentScore + wordCountScore + paaCoverageScore + richElementsScore;
	const module3: UPSAModule3 = {
		score: Math.min(25, m3Score),
		max: 25,
		intentAlignmentScore,
		intentAligned,
		wordCountScore,
		wordCountCurrent: words,
		wordCountRatio: ratio,
		paaCoverageScore,
		richElementsScore,
		hasFAQ,
		hasTable,
		hasLists,
		hasImages,
		hasTOC,
		hasExternalLink
	};

	// -----------------------------------------------------------------------
	// MODULE 4 — Passage Readiness (max 15 pts)
	// US9940367B1 + US9959315B1
	// S2-1: H2 Contamination Penalty — bidirectional (rewards good, penalizes weak)
	// -----------------------------------------------------------------------

	// Passage-ready H2s — S2-1 bidirectional scoring (product-gaps-master.md V1.2b)
	// Weak H2s contaminate the passage path signal; not additive-only.
	const passageReadyH2Count = h2s.filter((h) => isPassageReadyH2(h)).length;
	const totalH2s = h2s.length;
	const vagueH2Count = totalH2s - passageReadyH2Count;
	const passageReadyRatio = totalH2s > 0 ? passageReadyH2Count / totalH2s : 0;

	let passageReadyH2Score: number;
	let h2ContaminationPenalty: boolean;
	if (passageReadyRatio >= 0.8) {
		passageReadyH2Score = 10;
		h2ContaminationPenalty = false;
	} else if (passageReadyRatio >= 0.5) {
		passageReadyH2Score = 5;
		h2ContaminationPenalty = false;
	} else if (passageReadyRatio >= 0.3) {
		passageReadyH2Score = 0;
		h2ContaminationPenalty = false;
	} else {
		passageReadyH2Score = -5;
		h2ContaminationPenalty = true;
	}

	// First sentence answers heading: 1pt per section, max 4pts
	// CORRECTED — was entirely missing from scoring
	const answeredSections = sections.filter((s) =>
		firstSentenceAnswersHeading(s.heading, s.firstParagraph)
	).length;
	const firstSentenceAnswersScore = Math.min(answeredSections, 4);

	// FAQ section present: 4pts
	const hasFaqSection = /faq|frequently asked questions/i.test(body);
	const faqSectionScore = hasFaqSection ? 4 : 0;

	const m4Score = passageReadyH2Score + firstSentenceAnswersScore + faqSectionScore;
	const module4: UPSAModule4 = {
		score: Math.max(-5, Math.min(15, m4Score)),
		max: 15,
		passageReadyH2Score,
		passageReadyH2Count,
		h2Count: totalH2s,
		vagueH2Count,
		passageReadyRatio,
		h2ContaminationPenalty,
		firstSentenceAnswersScore,
		firstSentenceAnswerCount: answeredSections,
		sectionCount: sections.length,
		faqSectionScore,
		hasFaqSection
	};

	// -----------------------------------------------------------------------
	// MODULE 5 — Technical Signals (max 10 pts)
	// CORRECTED: This replaces the old "UX Signals" module.
	// Meta description lower bound corrected from 50 → 150 chars.
	// -----------------------------------------------------------------------

	// Meta description 150–155 chars: 4pts
	// CORRECTED: lower bound was 50 (allowed 50-char metas to pass — 100 chars short of spec)
	const metaLen = metaDescription?.trim().length ?? 0;
	const hasValidMetaDescription = metaLen >= 150 && metaLen <= 165;
	const metaDescriptionScore = hasValidMetaDescription ? 4 : 0;

	// Schema markup: 3pts
	const schemaScore = schemaGenerated ? 3 : 0;

	// Internal links (≥2 in body): 3pts
	const internalLinksScore = internalLinks.length >= 3 ? 3 : internalLinks.length >= 1 ? 1 : 0;

	const m5Score = metaDescriptionScore + schemaScore + internalLinksScore;
	const module5: UPSAModule5 = {
		score: Math.min(10, m5Score),
		max: 10,
		metaDescriptionScore,
		metaDescriptionLength: metaLen,
		hasValidMetaDescription,
		schemaScore,
		hasSchema: Boolean(schemaGenerated),
		internalLinksScore,
		internalLinksCount: internalLinks.length
	};

	// -----------------------------------------------------------------------
	// IGS BONUS — Information Gain Score (max +15 pts)
	// US20190155948A1
	// -----------------------------------------------------------------------
	const igs = calculateIGS(body, doc);

	// -----------------------------------------------------------------------
	// S2-2: Keyword Density — bidirectional (-5 to +10)
	// product-gaps-master.md V1.2e
	// -----------------------------------------------------------------------
	const keywordDensity = scoreKeywordDensity(body, kw);

	// -----------------------------------------------------------------------
	// Total + Skyscraper Warning
	// -----------------------------------------------------------------------
	const rawTotal =
		module1.score +
		module2.score +
		module3.score +
		module4.score +
		module5.score +
		igs.score +
		keywordDensity.score;
	const total = Math.max(0, Math.min(115, Math.round(rawTotal)));

	// Skyscraper warning: no original elements AND content is substantial
	const skyscraperWarning = igs.score === 0 && words > 300;

	return {
		module1,
		module2,
		module3,
		module4,
		module5,
		igs,
		keywordDensity,
		total,
		skyscraperWarning
	};
}

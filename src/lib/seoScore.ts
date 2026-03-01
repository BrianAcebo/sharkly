/**
 * UPSA — Universal Page Scoring Algorithm (max 115 points)
 *
 * Patent grounding:
 *   Module 1 (Structural)     — inverted index weights
 *   Module 2 (Semantic)       — SCS formula
 *   Module 3 (Content Quality)— US20190155948A1 + US9940367B1
 *   Module 4 (UX Signals)     — US8117209B1 (Reasonable Surfer)
 *   IGS Bonus                 — US20190155948A1 (Information Gain Score)
 *
 * Section 17.1 of Sharkly_Complete_Product_Spec_V4.md is the authoritative reference.
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
	/** Whether schema has been generated for this page */
	schemaGenerated?: boolean;
	/** Entities from brief_data.entities */
	entities?: BriefEntity[];
	/** LSI terms from brief_data.lsi_terms */
	lsiTerms?: BriefLsiTerm[];
	/** PAA questions from brief_data.paa_questions */
	paaQuestions?: BriefPaaQuestion[];
	/** Base URL to help classify internal links */
	baseUrl?: string;
};

export type UPSAModule1 = {
	score: number;
	max: 40;
	keywordInTitle: boolean;
	keywordInH1: boolean;
	keywordInFirst100: boolean;
};

export type UPSAModule2 = {
	score: number;
	max: 20;
	entityCoverage: number; // 0–12 pts
	lsiCoverage: number;    // 0–8 pts
	entityPct: number;      // 0–1
	lsiPct: number;         // 0–1
};

export type UPSAModule3 = {
	score: number;
	max: 25;
	passageReadyH2Score: number; // 0–8 pts
	wordCountScore: number;      // 0–8 pts
	paaCoverageScore: number;    // 0–5 pts
	richElementsScore: number;   // 0–4 pts
	wordCountCurrent: number;
	wordCountRatio: number;
	passageReadyH2Count: number;
	h2Count: number;
};

export type IGSBreakdown = {
	score: number;
	max: 15;
	originalResearch: boolean; // +5
	expertQuotes: boolean;     // +4
	firstHand: boolean;        // +3
	uniqueViz: boolean;        // +2
	contrarian: boolean;       // +1
};

export type UPSAModule4 = {
	score: number;
	max: 15;
	internalLinksScore: number; // 0–8 pts
	metaDescriptionScore: number; // 0–4 pts
	schemaScore: number;          // 0–3 pts
	internalLinksCount: number;
	hasMetaDescription: boolean;
	hasSchema: boolean;
};

export type SeoScoreBreakdown = {
	module1: UPSAModule1;
	module2: UPSAModule2;
	module3: UPSAModule3;
	module4: UPSAModule4;
	igs: IGSBreakdown;
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

function extractPlainText(doc: TiptapNode | null): string {
	if (!doc) return '';
	const parts: string[] = [];
	walkNodes(doc.content ?? [], (n) => {
		if (n.text) parts.push(n.text);
	});
	return parts.join(' ');
}

function extractH1s(doc: TiptapNode | null): string[] {
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

function extractInternalLinks(doc: TiptapNode | null): string[] {
	if (!doc) return [];
	const hrefs: string[] = [];
	walkNodes(doc.content ?? [], (n) => {
		if (n.type === 'text' && n.marks) {
			for (const m of n.marks as Array<{ type?: string; attrs?: { href?: string } }>) {
				if (m.type === 'link' && m.attrs?.href) {
					const href = m.attrs.href;
					if (
						href.startsWith('/') ||
						href.startsWith('#') ||
						(!href.startsWith('http') && !href.startsWith('mailto:'))
					) {
						hrefs.push(href);
					}
				}
			}
		}
	});
	return hrefs;
}

function countWords(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Patent-grounded helpers (Section 17.1)
// ---------------------------------------------------------------------------

/**
 * isPassageReadyH2 — US9940367B1 + US9959315B1
 * H2s written as specific answerable questions create stronger passage context
 * vectors. Returns true if the heading ends with "?" or starts with a question word.
 */
export function isPassageReadyH2(heading: string): boolean {
	const text = heading.toLowerCase().trim();
	const questionWords = ['how', 'what', 'why', 'when', 'which', 'can', 'does', 'is', 'are', 'do', 'will', 'should'];
	return text.endsWith('?') || questionWords.some((w) => text.startsWith(w + ' '));
}

/**
 * calculateIGS — US20190155948A1 (Information Gain Score)
 * Client-side heuristics that catch most genuine IGS content.
 * IGS = 0 is a warning ("Skyscraper content"), not a verdict.
 */
export function calculateIGS(body: string): IGSBreakdown {
	const lower = body.toLowerCase();
	let score = 0;

	// +5 Original research / data
	const dataSignals = [
		'%', 'survey', 'we found', 'our data', 'our study',
		'in our experience', 'we tested', 'our analysis', 'our research',
		'according to our', 'in our case',
	];
	const originalResearch = dataSignals.some((s) => lower.includes(s));
	if (originalResearch) score += 5;

	// +4 Expert quotes with attribution (20+ char quoted string + attribution verb)
	const expertQuotes =
		/"\S.{18,}\S"/.test(body) &&
		/according to|said|explained|told us|noted|shared/.test(lower);
	if (expertQuotes) score += 4;

	// +3 First-hand experience signals
	const firstHand = /\b(i|we)\b.{0,50}(tested|tried|used|found|noticed|experienced|discovered)/i.test(body);
	if (firstHand) score += 3;

	// +2 Unique visualization (table or significant list structure)
	const uniqueViz = body.includes('<table') || /\|.+\|.+\|/.test(body);
	if (uniqueViz) score += 2;

	// +1 Contrarian perspective
	const contrarianSignals = [
		'however,', 'contrary to', 'despite popular', 'actually,',
		'in reality,', 'the truth is', 'this is wrong', 'myth:',
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
		contrarian,
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
		schemaGenerated,
		entities = [],
		lsiTerms = [],
		paaQuestions = [],
	} = input;

	const doc = (content && 'content' in content ? content : { content: [] }) as TiptapNode;
	const body = extractPlainText(doc);
	const bodyLower = body.toLowerCase();
	const kw = keyword.toLowerCase().trim();
	const h1s = extractH1s(doc);
	const h2s = extractH2s(doc);
	const internalLinks = extractInternalLinks(doc);
	const words = countWords(body);

	// -----------------------------------------------------------------------
	// MODULE 1 — Structural Signals (max 40 pts)
	// -----------------------------------------------------------------------
	const keywordInTitle = Boolean(metaTitle?.toLowerCase().includes(kw));
	const keywordInH1 = h1s.some((h) => h.toLowerCase().includes(kw));
	// "first 100 words" = approx first 500 chars of plain text
	const keywordInFirst100 = body.slice(0, 600).toLowerCase().includes(kw);

	const m1Score = (keywordInTitle ? 15 : 0) + (keywordInH1 ? 15 : 0) + (keywordInFirst100 ? 10 : 0);
	const module1: UPSAModule1 = { score: m1Score, max: 40, keywordInTitle, keywordInH1, keywordInFirst100 };

	// -----------------------------------------------------------------------
	// MODULE 2 — Semantic Completeness (max 20 pts)
	// -----------------------------------------------------------------------
	const coveredEntities = entities.filter((e) => bodyLower.includes(e.term.toLowerCase())).length;
	const coveredLsi = lsiTerms.filter((t) => bodyLower.includes(t.term.toLowerCase())).length;

	const entityPct = entities.length > 0 ? coveredEntities / entities.length : 0;
	const lsiPct = lsiTerms.length > 0 ? coveredLsi / lsiTerms.length : 0;

	const entityCoverage = Math.round(entityPct * 12);
	const lsiCoverage = Math.round(lsiPct * 8);
	const m2Score = entityCoverage + lsiCoverage;
	const module2: UPSAModule2 = { score: m2Score, max: 20, entityCoverage, lsiCoverage, entityPct, lsiPct };

	// -----------------------------------------------------------------------
	// MODULE 3 — Content Quality (max 25 pts)
	// -----------------------------------------------------------------------

	// H2 passage readiness: 2 pts per question-format H2, max 8 pts
	const passageReadyH2Count = h2s.filter((h) => isPassageReadyH2(h)).length;
	const passageReadyH2Score = Math.min(passageReadyH2Count * 2, 8);

	// Word count vs target
	const ratio = targetWordCount > 0 ? words / targetWordCount : 1;
	const wordCountScore = ratio >= 1.0 ? 8 : ratio >= 0.85 ? 5 : ratio >= 0.70 ? 2 : 0;

	// PAA questions answered: 2 pts each, max 5 pts
	const answeredPAA = paaQuestions.filter((q) => {
		const qWords = q.question.toLowerCase().split(' ').slice(0, 4).join(' ');
		return bodyLower.includes(qWords);
	}).length;
	const paaCoverageScore = Math.min(answeredPAA * 2, 5);

	// Rich elements: 1 pt each, max 4 pts
	const hasFAQ = /faq|frequently asked/i.test(body) ? 1 : 0;
	const hasTable = body.includes('<table') || /\|.+\|.+\|/.test(body) ? 1 : 0;
	const listsCount = (body.match(/<[uo]l/gi) ?? []).length;
	const hasLists = listsCount >= 2 ? 1 : 0;
	const hasExtLink = internalLinks.length > 0 ? 1 : 0; // any link = rich context
	const richElementsScore = Math.min(hasFAQ + hasTable + hasLists + hasExtLink, 4);

	const m3Score = passageReadyH2Score + wordCountScore + paaCoverageScore + richElementsScore;
	const module3: UPSAModule3 = {
		score: m3Score,
		max: 25,
		passageReadyH2Score,
		wordCountScore,
		paaCoverageScore,
		richElementsScore,
		wordCountCurrent: words,
		wordCountRatio: ratio,
		passageReadyH2Count,
		h2Count: h2s.length,
	};

	// -----------------------------------------------------------------------
	// MODULE 4 — UX Signals (max 15 pts)
	// -----------------------------------------------------------------------
	const internalLinksScore = internalLinks.length >= 3 ? 8 : internalLinks.length >= 1 ? 4 : 0;
	const hasMeta = Boolean(metaDescription?.trim() && metaDescription.length >= 50 && metaDescription.length <= 160);
	const metaDescriptionScore = hasMeta ? 4 : 0;
	const schemaScore = schemaGenerated ? 3 : 0;

	const m4Score = internalLinksScore + metaDescriptionScore + schemaScore;
	const module4: UPSAModule4 = {
		score: m4Score,
		max: 15,
		internalLinksScore,
		metaDescriptionScore,
		schemaScore,
		internalLinksCount: internalLinks.length,
		hasMetaDescription: hasMeta,
		hasSchema: Boolean(schemaGenerated),
	};

	// -----------------------------------------------------------------------
	// IGS BONUS — Information Gain Score (max +15 pts)
	// -----------------------------------------------------------------------
	const igs = calculateIGS(body);

	// -----------------------------------------------------------------------
	// Total + Skyscraper Warning
	// -----------------------------------------------------------------------
	const total = Math.min(115, Math.round(m1Score + m2Score + m3Score + m4Score + igs.score));
	const skyscraperWarning = igs.score === 0 && words > 300;

	return { module1, module2, module3, module4, igs, total, skyscraperWarning };
}

import { Request, Response } from 'express';
import OpenAI from 'openai';
import { supabase } from '../utils/supabaseClient.js';
import fetch from 'node-fetch';
import { serperSearch } from '../utils/serper.js';
import { fetchCompetitorPages } from '../utils/competitorFetch.js';
import { CREDIT_COSTS } from '../../../shared/credits.mjs';
import {
	classifyPageType,
	inferDominantIntentFromKeyword,
	getFailingRequiredItems,
	detectCTAsInFirst20,
	detectTrustSignals
} from '../utils/croChecklist.js';
import { extractPlainText, extractH1s } from '../utils/tiptapExtract.js';
import { YMYL_PROMPT_ADDITIONS } from '../utils/ymyl.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const CLAUDE_MODEL = process.env.CLAUDE_SONNET_MODEL || 'claude-sonnet-4-5-20250929';

// OpenAI for CRO fixes (GPT-4o-mini per spec)
const GPT_CONTENT_MODEL = process.env.GPT_CONTENT_MODEL || 'gpt-4o-mini';
const openai = process.env.OPENAI_API_KEY
	? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
	: null;

/** Shared helper: call Claude and return the text response */
async function callClaude(system: string, user: string, maxTokens = 8000): Promise<string> {
	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': ANTHROPIC_API_KEY,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model: CLAUDE_MODEL,
			max_tokens: maxTokens,
			system,
			messages: [{ role: 'user', content: user }]
		})
	});
	if (!res.ok) {
		const errText = await res.text();
		throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 300)}`);
	}
	const data = (await res.json()) as { content?: Array<{ type: string; text: string }> };
	return data.content?.find((c) => c.type === 'text')?.text ?? '';
}

// ---------------------------------------------------------------------------
// Internal link helpers (mirrors Section 17.6 / Reasonable Surfer US8117209B1)
// These run server-side so the AI can insert actual <a> tags in generated HTML.
// ---------------------------------------------------------------------------

type ClusterPageRow = {
	id: string;
	title: string;
	keyword: string;
	type: string;
};

type LinkInstruction = {
	toTitle: string;
	anchorText: string;
	placement: 'intro' | 'body';
	priority: 'critical' | 'high' | 'medium';
	href: string;
	note: string;
};

function slugifyKeyword(keyword: string): string {
	return keyword
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
}

/**
 * Build link instructions for the page being generated.
 *
 * Reverse silo rules (Section 17.6):
 *   Article → focus page  : CRITICAL, intro, equity 1.0×
 *   Focus page → destination : CRITICAL when set (many-to-one-to-one; connects to store)
 *   Focus page → articles : HIGH, body, equity 0.8×
 *   Article → siblings    : MEDIUM, body, equity 0.8×
 */
function buildInternalLinksForPage(
	currentPageId: string,
	currentPageType: string,
	clusterPages: ClusterPageRow[],
	siteUrl: string,
	destination?: { url: string; label: string }
): LinkInstruction[] {
	const baseUrl = (siteUrl || '').replace(/\/$/, '');
	const focusPage = clusterPages.find((p) => p.type === 'focus_page');
	const articles = clusterPages.filter((p) => p.type === 'article');
	const instructions: LinkInstruction[] = [];

	function variantAnchor(keyword: string): string {
		const words = keyword.split(/\s+/).filter(Boolean);
		return words.length <= 3 ? keyword : words.slice(0, 3).join(' ');
	}
	function descriptiveAnchor(keyword: string): string {
		const words = keyword.split(/\s+/).filter(Boolean);
		return words.slice(0, Math.min(5, words.length)).join(' ');
	}

	if (currentPageType === 'focus_page') {
		// Focus page: max 3 outbound links total. When destination set: 1 destination + 2 articles.
		const hasDestination = Boolean(destination?.url && destination?.label);
		// 1. Destination (primary conversion; many-to-one-to-one)
		if (hasDestination) {
			const href = destination!.url.startsWith('http')
				? destination!.url
				: `${baseUrl}${destination!.url.startsWith('/') ? '' : '/'}${destination!.url}`;
			instructions.push({
				toTitle: destination!.label,
				anchorText: destination!.label,
				placement: 'body',
				priority: 'critical',
				href,
				note: `Connects to your store — include a natural contextual link to ${destination!.label} (primary conversion target for this cluster)`
			});
		}
		// 2. Top 2 articles when destination, else top 3 (cap at 3 total)
		const articleSlots = hasDestination ? 2 : 3;
		const targets = articles.filter((a) => a.id !== currentPageId).slice(0, articleSlots);
		for (const a of targets) {
			instructions.push({
				toTitle: a.title,
				anchorText: descriptiveAnchor(a.keyword),
				placement: 'body',
				priority: 'high',
				href: `${baseUrl}/${slugifyKeyword(a.keyword)}`,
				note: 'Place in the body where the topic naturally comes up (equity 0.8×)'
			});
		}
	} else {
		// Article MUST link to focus page — critical reverse-silo link
		if (focusPage && focusPage.id !== currentPageId) {
			instructions.push({
				toTitle: focusPage.title,
				anchorText: variantAnchor(focusPage.keyword),
				placement: 'intro',
				priority: 'critical',
				href: `${baseUrl}/${slugifyKeyword(focusPage.keyword)}`,
				note: 'Place in first 2 paragraphs — highest PageRank equity [US8117209B1]'
			});
		}

		// Article also links to 1-2 sibling articles in the same group of 5
		const currentIdx = articles.findIndex((a) => a.id === currentPageId);
		const groupStart = currentIdx >= 0 ? Math.floor(currentIdx / 5) * 5 : 0;
		const group = articles.slice(groupStart, groupStart + 5);
		const siblings = group.filter((a) => a.id !== currentPageId).slice(0, 2);
		for (const sib of siblings) {
			instructions.push({
				toTitle: sib.title,
				anchorText: descriptiveAnchor(sib.keyword),
				placement: 'body',
				priority: 'medium',
				href: `${baseUrl}/${slugifyKeyword(sib.keyword)}`,
				note: 'Article-to-article mesh — place naturally in the body (equity 0.8×)'
			});
		}
	}

	return instructions;
}

/** Format link instructions as a prompt block for Claude */
function formatLinksForPrompt(links: LinkInstruction[]): string {
	if (links.length === 0) return 'None — this page is standalone.';
	return links
		.map((l, i) => {
			const label =
				l.priority === 'critical' ? '🔴 CRITICAL' : l.priority === 'high' ? '🟠 HIGH' : '🟡 MEDIUM';
			const placement = l.placement === 'intro' ? 'INTRO (first 400 words)' : 'BODY TEXT';
			return [
				`${i + 1}. ${label} — Place in ${placement}`,
				`   Target page: "${l.toTitle}"`,
				`   Anchor text (use EXACTLY): "${l.anchorText}"`,
				`   href: "${l.href}"`,
				`   Note: ${l.note}`
			].join('\n');
		})
		.join('\n\n');
}

// ---------------------------------------------------------------------------
// Page-type-specific on-page optimisation rules injected into every prompt.
//
// CORRECTIONS vs previous version:
//   - Complete Guide: H2 rule now ALLOWS question H2s (was incorrectly prohibiting
//     them). Per US9940367B1 + US9959315B1, question-format H2s create stronger
//     passage context vectors — this is most valuable for long pillar content,
//     not least valuable. Mix of question and descriptive H2s is correct.
//   - BreadcrumbList schema added to Category, How-To, and Complete Guide types.
//   - H3 strategy added to all page types per the heading vector model.
// ---------------------------------------------------------------------------

function getPageTypeInstructions(rawPageType: string | null | undefined): {
	systemNote: string;
	h2Rules: string;
	h3Rules: string;
	schemaType: string;
	targetWcOverride: number | null;
	avoidRules: string;
	ctaStrategy: string;
} {
	const pt = (rawPageType ?? '').toLowerCase();

	// ── Canonical CRO types (system-1-cro-layer.md) ───────────────────────────
	// These take precedence when page_type is set by classifyPageType during brief gen.
	if (pt === 'money_page') {
		return {
			systemNote: 'This is a MONEY PAGE — transactional conversion focus. Light SEO, heavy CTA.',
			h2Rules:
				'H2s = benefit/objection handlers ("What You Get", "How It Works", "Why Choose Us", "FAQs"). NEVER use question H2s.',
			h3Rules: 'H3s = specific benefits, process steps, or FAQ questions within each H2 section.',
			schemaType: 'Product + BreadcrumbList',
			targetWcOverride: 450,
			avoidRules: 'No question H2s. Single CTA repeated throughout. No competing goals.',
			ctaStrategy: '"Add to Cart" / "Get a Quote" / "Book Now" above the fold. Repeat CTA 2–3×.'
		};
	}
	if (pt === 'service_page') {
		return {
			systemNote: 'This is a SERVICE PAGE. Rank AND convert. Commercial or local service focus.',
			h2Rules:
				'H2s = benefit/objection handlers ("What You Get", "How It Works", "Why Choose Us", "FAQs"). NEVER use question H2s.',
			h3Rules: 'H3s = specific benefits, process steps, or FAQ questions within each H2 section.',
			schemaType: 'LocalBusiness + Service + BreadcrumbList',
			targetWcOverride: 800,
			avoidRules: 'No question H2s. Single CTA repeated throughout. No competing goals.',
			ctaStrategy:
				'Primary CTA repeated 3× (above fold, mid-page, bottom): "Get a Free Quote" / "Book Now".'
		};
	}
	if (pt === 'mofu_comparison') {
		return {
			systemNote:
				'This is a COMPARISON PAGE. Middle-funnel. Enable evaluation — comparison table required.',
			h2Rules:
				'H2s = feature categories ("Pricing", "Features", "Support", "Verdict") or numbered options. Side-by-side table required.',
			h3Rules: 'H3s = sub-criteria within each feature category or option attributes.',
			schemaType: 'Article + ItemList',
			targetWcOverride: null,
			avoidRules: 'MUST include a comparison table. MUST give a clear winner/recommendation.',
			ctaStrategy: 'Medium-commitment CTA in Verdict: "Try [Winner] free" or "Get a demo".'
		};
	}
	if (pt === 'bofu_article') {
		return {
			systemNote:
				'This is a BOTTOM-OF-FUNNEL ARTICLE. Reader is close to decision. Push toward conversion.',
			h2Rules:
				'H2s = objection handlers and decision drivers ("When to Choose X", "Costs", "FAQs"). Mix descriptive and question H2s.',
			h3Rules: 'H3s = sub-points within each section. Specific numbers and outcomes.',
			schemaType: 'Article + BreadcrumbList',
			targetWcOverride: null,
			avoidRules: 'Include trust signals before CTA. Hard or medium CTA at bottom required.',
			ctaStrategy:
				'Hard or medium CTA in last 15%: "Get a Quote", "Book a Call", "Start Free Trial".'
		};
	}
	if (pt === 'mofu_article') {
		return {
			systemNote:
				'This is a CONSIDERATION-STAGE ARTICLE. Reader is weighing options. Build trust, address objections.',
			h2Rules:
				'H2s = mix of question and descriptive ("How to Choose X", "Key Features", "What to Look For").',
			h3Rules: 'H3s = sub-criteria, pros/cons, specific comparisons within each H2.',
			schemaType: 'Article + BreadcrumbList',
			targetWcOverride: null,
			avoidRules: 'No hard-sell CTAs. Medium or soft CTA only. Build trust before ask.',
			ctaStrategy: 'Medium CTA: "Get a free assessment", "See how it works", "Book a demo".'
		};
	}
	if (pt === 'tofu_article') {
		return {
			systemNote:
				'This is an INFORMATIONAL ARTICLE. Top-of-funnel. Educate first, convert softly at the end.',
			h2Rules:
				'H2s = questions (How/What/Why/When/Which) or descriptive subtopics. Targets PAA and passage scoring.',
			h3Rules: 'H3s = specific answers or sub-points within each H2.',
			schemaType: 'Article + BreadcrumbList',
			targetWcOverride: null,
			avoidRules: 'No hard sales language. No purchase/contact pressure. Soft CTA only.',
			ctaStrategy: 'Single soft CTA at the very end: download, email sign-up, or "learn more" link.'
		};
	}

	// ── Product Page ──────────────────────────────────────────────────────────
	if (pt.includes('product page') || pt === 'product') {
		return {
			systemNote:
				'This is a PRODUCT PAGE. Short, benefit-focused, conversion-optimised. No long-form copy.',
			h2Rules:
				'H2s = feature/benefit categories ("Key Features", "What\'s Included", "Specifications", "Customer Reviews"). NEVER use question H2s.',
			h3Rules:
				'H3s = individual feature names or sub-specifications within each H2 section. Keep them short and scannable.',
			schemaType: 'Product + BreadcrumbList',
			targetWcOverride: 450,
			avoidRules:
				'No question H2s. No manufacturer copy (duplicate content risk). No long intros. Benefits over features.',
			ctaStrategy: '"Add to Cart" / "Buy Now" above the fold. Repeat CTA after features section.'
		};
	}

	// ── Service / Landing Page ────────────────────────────────────────────────
	if (pt.includes('service') || pt.includes('landing') || pt.includes('pricing')) {
		return {
			systemNote:
				'This is a SERVICE / LANDING PAGE targeting commercial or transactional intent. Conversion is the single goal.',
			h2Rules:
				'H2s = benefit/objection handlers ("What You Get", "How It Works", "Why Choose Us", "FAQs"). NEVER use question H2s — these are benefit-statement headings.',
			h3Rules:
				'H3s = specific benefits, process steps, or FAQ questions within each H2 section. Use H3s to break up longer sections.',
			schemaType: 'LocalBusiness + Service + BreadcrumbList',
			targetWcOverride: 800,
			avoidRules:
				'No question H2s. Single CTA repeated throughout — no competing goals. No navigation links that let users escape the page.',
			ctaStrategy:
				'Primary CTA repeated 3× (above fold, mid-page, bottom): "Get a Free Quote" / "Start Free Trial" / "Book Now". CTA copy states the outcome, not the action ("Start My Free Trial" not "Submit").'
		};
	}

	// ── Category Page ─────────────────────────────────────────────────────────
	if (pt.includes('category')) {
		return {
			systemNote:
				'This is a CATEGORY PAGE — short intro, breadcrumb navigation, links to sub-pages.',
			h2Rules:
				'H2s = subcategory headings or featured content groups. Keep them brief and descriptive.',
			h3Rules: 'H3s = individual sub-items or product/content titles within each category group.',
			schemaType: 'CollectionPage + BreadcrumbList',
			targetWcOverride: 300,
			avoidRules:
				'Category description max 200 words. BreadcrumbList schema required. No keyword stuffing.',
			ctaStrategy:
				'No primary CTA. Guide users to the most relevant subcategory or content group using internal links.'
		};
	}

	// ── How-To Guide ──────────────────────────────────────────────────────────
	if (pt.includes('how-to') || pt.includes('how to')) {
		return {
			systemNote: 'This is a HOW-TO GUIDE. Step-by-step format. HowTo schema unlocks rich results.',
			h2Rules:
				'H2s = numbered steps with clear action verbs ("Step 1: Install the Plugin", "Step 2: Configure Settings"). Each step is its own H2.',
			h3Rules:
				'H3s = sub-steps or tips within a step. Use sparingly — only when a step has multiple distinct sub-actions.',
			schemaType: 'HowTo + BreadcrumbList',
			targetWcOverride: null,
			avoidRules:
				'Include estimated time and difficulty near the top. No FAQ sections (breaks HowTo schema). No step-skipping.',
			ctaStrategy:
				'Soft CTA after the final step only: "Now that you know how to [X], try [product] to do it faster."'
		};
	}

	// ── Comparison (listicle + versus) ────────────────────────────────────────
	if (
		pt.includes('comparison') ||
		pt.includes('listicle') ||
		pt.includes('versus') ||
		pt.includes(' vs')
	) {
		const isVersus = pt.includes('versus') || pt.includes(' vs');
		return {
			systemNote: isVersus
				? 'This is a HEAD-TO-HEAD COMPARISON. Two options, one clear winner. Be opinionated.'
				: 'This is a COMPARISON LISTICLE ("Best X for Y"). Middle-funnel commercial intent. Ranked list format.',
			h2Rules: isVersus
				? 'H2s = feature categories ("Pricing", "Ease of Use", "Features", "Support", "Verdict"). Side-by-side table required.'
				: 'H2s = numbered options ("1. [Option] — Best for [Use Case]"). One H2 per option.',
			h3Rules: isVersus
				? 'H3s = sub-criteria within each feature category (e.g., under "Pricing": "Free Plan", "Pro Plan").'
				: 'H3s = key attributes of each option (Pros, Cons, Pricing, Best For). Consistent H3 structure per option.',
			schemaType: isVersus ? 'Article' : 'ItemList + BreadcrumbList',
			targetWcOverride: null,
			avoidRules:
				'MUST include a comparison table. MUST give a clear winner/recommendation. No wishy-washy conclusions.',
			ctaStrategy: isVersus
				? 'CTA in Verdict section: "Try [Winner] free". One winner, one CTA.'
				: 'CTA per option ("Try [Name] free") + strong winner recommendation at the bottom.'
		};
	}

	// ── Review ────────────────────────────────────────────────────────────────
	if (pt.includes('review')) {
		return {
			systemNote:
				'This is a REVIEW. Include Review schema with a numerical rating. Be specific and opinionated.',
			h2Rules:
				'H2s = feature categories reviewed ("UI/UX", "Features", "Pricing", "Support", "Verdict"). Pros/Cons section required near the top.',
			h3Rules:
				'H3s = specific sub-features within each category (e.g., under "Features": "Automation", "Reporting", "Integrations").',
			schemaType: 'Review + BreadcrumbList',
			targetWcOverride: null,
			avoidRules:
				'Review schema with rating (1–5) required. Must include Pros/Cons. Include current pricing. No generic praise — every claim needs a specific reason.',
			ctaStrategy:
				'CTA after Pros/Cons summary (buying intent peaks here) and again in Verdict: "Try [Product] free" or "Check current pricing".'
		};
	}

	// ── Complete Guide ────────────────────────────────────────────────────────
	// CORRECTED: H2 rule now ALLOWS question-format H2s. Previous version incorrectly
	// prohibited them for guides. Per US9940367B1 + US9959315B1, question H2s create
	// stronger passage context vectors — this matters MOST for long pillar content.
	// Correct approach: mix of descriptive H2s (major sections) AND question H2s
	// (subsections where passage ranking is valuable).
	if (pt.includes('complete guide') || pt.includes('ultimate guide') || pt.includes('guide')) {
		return {
			systemNote:
				'This is a COMPLETE GUIDE — pillar/cornerstone content. Long-form, comprehensive, evergreen.',
			h2Rules:
				'H2s = major subtopics. Use a MIX: descriptive H2s for major sections ("What Is X", "Types of X") AND question-format H2s where you\'re answering a specific user question ("How Does X Work?", "Why Does X Matter?"). Question H2s improve passage scoring [US9940367B1]. Table of contents with jump links required.',
			h3Rules:
				'H3s = sub-topics within each major H2 section. Use question-format H3s where possible — they extend the heading vector (Title→H1→H2→H3→passage) and improve independent passage scoring for long guides.',
			schemaType: 'Article + BreadcrumbList',
			targetWcOverride: 2500,
			avoidRules:
				'TOC required for content over 2,000 words. Include a "Last updated" date. Cover both beginner and advanced angles. No shallow treatment of subtopics.',
			ctaStrategy:
				'"Download the checklist" or strong internal links to supporting articles. Avoid hard sell — guide readers are in research mode.'
		};
	}

	// ── Blog Post (default — covers educational, explainer, stats, FAQ, general) ──
	return {
		systemNote:
			'This is a BLOG POST / INFORMATIONAL ARTICLE. Awareness-stage content — educate first, convert softly at the end.',
		h2Rules:
			'ALL H2s MUST be phrased as questions (start with How/What/Why/When/Which/Can/Does/Is or end with "?"). This targets People Also Ask and Google passage scoring [US9940367B1].',
		h3Rules:
			'H3s = specific answers or sub-points within each H2 section. Where the H2 is a question, H3s can be the individual answer components. Each H3 should be 1-3 paragraphs.',
		schemaType: 'Article + BreadcrumbList',
		targetWcOverride: null,
		avoidRules:
			'No hard sales language. No generic intros ("In this article..."). No keyword stuffing. No feature-focused CTAs.',
		ctaStrategy:
			'Single soft CTA at the very end: link to a relevant service page, guide, or resource. Do not interrupt the article with promotional CTAs — informational readers are not in buying mode.'
	};
}

// ---------------------------------------------------------------------------
// CRO context block — injected into brief generation based on page type (system-1-cro-layer §8.2)
// ---------------------------------------------------------------------------
function getCroContextBlock(canonicalPageType: string): string {
	const pt = (canonicalPageType ?? '').toLowerCase();
	if (pt === 'tofu_article') {
		return `
CRO CONTEXT FOR THIS PAGE:
This is a top-of-funnel informational page. The reader is not ready to buy.
Do not include any hard-sell language or high-commitment CTAs.
Build authority. Answer the question completely.
Guide the reader to their next step with a low-commitment prompt only
(email capture, downloadable guide, "learn more" link).
End sections with curiosity or education, not purchase pressure.
`;
	}
	if (pt === 'mofu_article' || pt === 'mofu_comparison') {
		return `
CRO CONTEXT FOR THIS PAGE:
This is a consideration-stage page. The reader is weighing their options.
They are using logic to decide. Address objections directly.
Include a medium-commitment CTA (free consultation, demo, assessment).
Build trust through specifics — numbers, credentials, case study references.
Do not pressure toward immediate purchase.
`;
	}
	if (pt === 'service_page' || pt === 'bofu_article' || pt === 'money_page') {
		return `
CRO CONTEXT FOR THIS PAGE:
This is a bottom-of-funnel page. The reader is close to a decision.
Structure the page in layers:
1. Above the fold: H1 + hard CTA + one trust signal (phone number or review count)
2. First scroll: Problem identification + emotional hook
3. Middle: Full SEO content, entities, FAQ, depth
4. Bottom: Testimonials with specific results + urgency signal + second hard CTA
Every section brief must include guidance on trust building, objection removal,
and CTA placement. Treat every section as an opportunity to move the reader closer.
`;
	}
	return '';
}

// ---------------------------------------------------------------------------
// Universal EEAT + anti-pogo-stick prompt block
// Injected into EVERY content generation prompt (brief + article).
//
// Grounds:
//   EEAT signals    — SEO System §3, Google Quality Rater Guidelines
//   Anti-pogo-stick — SEO System §2, US10055467B1 (short-click penalty)
//   H3 heading vector — US9959315B1 (Title→H1→H2→H3→passage coherence path)
// ---------------------------------------------------------------------------
const EEAT_AND_OPENING_INSTRUCTIONS = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EEAT SIGNALS — INCLUDE ALL OF THESE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Google's quality rater guidelines reward pages that demonstrate Experience,
Expertise, Authoritativeness, and Trustworthiness. Include at least 3 of:

1. EXPERIENCE marker — first-hand language: "In our experience...", "We've tested...",
   "When we [did X], we found...", "Based on [N] projects/clients/cases..."
2. EXPERTISE signal — cite a specific methodology, framework, or standard:
   "According to [Named Expert / Institution]...", reference a specific study or data point
   with source attribution, use precise technical vocabulary appropriate to the topic.
3. AUTHOR CREDENTIAL hook — include a sentence that implies real-world experience:
   "Having worked with [type of business/situation]...", "After reviewing [N] options..."
4. PRIMARY SOURCE citation — quote or reference a credible external source by name
   (study, report, official documentation, recognised expert). Do NOT invent citations.
5. TRUSTWORTHINESS signal — acknowledge trade-offs, limitations, or when NOT to use
   something. Honest nuance signals expertise more than uniform positivity.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANTI-POGO-STICK OPENING — CRITICAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Google penalises pages where users immediately return to search results (pogo-stick
behaviour) [US10055467B1]. The FIRST PARAGRAPH must do one job: confirm to the
reader that they found exactly what they searched for.

Rules for the opening paragraph:
• Start with a direct, confident statement that contains or paraphrases the target keyword
• Immediately signal what the reader will learn/get/be able to do after reading
• DO NOT start with a question, a generic greeting, or a vague scene-setter
• DO NOT use: "In this article...", "Are you looking for...", "Have you ever wondered..."
• DO: "X is [direct definition/answer]. In this guide, you'll [specific outcome]."
• The opening paragraph should make a reader think "yes, this is exactly what I needed"
  within the first 2 sentences.

Example of WRONG opening:
"Have you ever wondered how to improve your website's rankings? In this article,
we'll explore some strategies that might help..."

Example of CORRECT opening:
"Drain cleaning costs between $150–$400 for most households, depending on the
blockage type and pipe access. This guide covers exactly what drives that price,
how to avoid overpaying, and when a job needs a professional vs. a DIY fix."
`;

async function checkAndDeductCredits(
	orgId: string,
	cost: number
): Promise<{ ok: boolean; error?: string; available?: number }> {
	const { data: org } = await supabase
		.from('organizations')
		.select('included_credits_remaining, included_credits')
		.eq('id', orgId)
		.single();

	const available = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
	if (available < cost) {
		return { ok: false, error: 'Insufficient credits', available };
	}

	const newCredits = Math.max(0, available - cost);
	await supabase
		.from('organizations')
		.update({
			included_credits_remaining: newCredits,
			...(org?.included_credits != null && { included_credits: newCredits })
		})
		.eq('id', orgId);

	return { ok: true };
}

export const generateBrief = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const pageId = req.params.id;
		if (!pageId) return res.status(400).json({ error: 'Page ID required' });

		const { data: page, error: pageErr } = await supabase
			.from('pages')
			.select(
				'id, cluster_id, site_id, type, title, keyword, funnel_stage, target_word_count, page_type, author_bio_override'
			)
			.eq('id', pageId)
			.single();

		if (pageErr || !page) return res.status(404).json({ error: 'Page not found' });

		// CORRECTED: Removed hard rejection of article pages.
		// Articles need briefs too — they should have entity targets, LSI terms,
		// PAA questions, and IGS opportunities planned before generation.
		// Both focus_page and article types are now supported.
		if (page.type !== 'focus_page' && page.type !== 'article') {
			return res.status(400).json({ error: 'Only focus pages and articles can have briefs' });
		}

		const { data: site } = await supabase
			.from('sites')
			.select(
				'id, name, niche, customer_description, url, organization_id, domain_authority, tone, include_terms, avoid_terms, target_language, target_region, author_bio'
			)
			.eq('id', page.site_id)
			.single();

		if (!site) return res.status(404).json({ error: 'Site not found' });

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg || userOrg.organization_id !== site.organization_id) {
			return res.status(403).json({ error: 'Access denied' });
		}

		// Use appropriate credit cost based on page type
		const creditCost =
			page.type === 'focus_page'
				? CREDIT_COSTS.MONEY_PAGE_BRIEF
				: (CREDIT_COSTS.ARTICLE_BRIEF ?? CREDIT_COSTS.MONEY_PAGE_BRIEF);

		const creditCheck = await checkAndDeductCredits(site.organization_id, creditCost);
		if (!creditCheck.ok) {
			return res.status(402).json({
				error: creditCheck.error,
				required: creditCost,
				available: creditCheck.available
			});
		}

		const { organic, relatedSearches, peopleAlsoAsk } = await serperSearch(
			page.keyword || page.title,
			10
		);

		// Fetch competitor pages to extract H2s and word count — used in Competitors tab
		const competitorUrls = (organic || [])
			.slice(0, 5)
			.map((o) => (o as { link?: string }).link)
			.filter((u): u is string => typeof u === 'string' && u.startsWith('http'));
		const competitorsRaw = await fetchCompetitorPages(competitorUrls, 5);
		// Merge titles from Serper when our fetch didn't get a title (match by URL)
		const organicByLink = new Map(
			(organic || []).map((o) => [(o as { link?: string }).link, o as { title?: string }])
		);
		const competitorsWithTitles = competitorsRaw.map((c) => {
			const serper = organicByLink.get(c.url);
			return {
				...c,
				title: c.title || serper?.title || null
			};
		});

		// Real competitor block using fetched H2s and word counts (dissertation Section 8.2)
		const competitorBlock = competitorsWithTitles.length > 0
			? competitorsWithTitles
					.slice(0, 3)
					.map((c, i) => {
						const h2List = c.h2s.length > 0
							? c.h2s.slice(0, 8).join(' | ')
							: '(no headings extracted)';
						return `Competitor ${i + 1} (${c.url}): ${c.word_count.toLocaleString()} words, H2s: [${h2List}]`;
					})
					.join('\n')
			: (organic || [])
					.slice(0, 3)
					.map((o, i) => `Competitor ${i + 1}: "${o.title}" — ${o.snippet || '(no snippet)'}`)
					.join('\n');

		// Real competitor average word count — target = avg × 1.1 per dissertation
		const competitorAvgWc =
			competitorsWithTitles.length > 0
				? Math.round(
						competitorsWithTitles.reduce((sum, c) => sum + c.word_count, 0) /
							competitorsWithTitles.length
					)
				: null;

		const paaList = (peopleAlsoAsk || []).map((p) => p.question);
		const relatedKeywords = (relatedSearches || []).map((r) => r.query).join(', ');
		// Target = competitor average × 1.1, floor at page setting if manually set higher
		const targetWc = competitorAvgWc
			? Math.max(page.target_word_count || 0, Math.round(competitorAvgWc * 1.1))
			: (page.target_word_count || 1400);

		const brandTone = (site.tone as string | null) || 'professional';
		const includeTerms = (site.include_terms as string | null) || '(none specified)';
		const avoidTerms = (site.avoid_terms as string | null) || '(none)';
		const targetLanguage = (site.target_language as string | null) || 'English';
		const targetRegion = (site.target_region as string | null) || 'United States';
		const pageTypeInstr = getPageTypeInstructions(page.page_type as string | null);
		const resolvedWc = pageTypeInstr.targetWcOverride ?? targetWc;

		// Compute canonical page type for CRO context injection (system-1-cro-layer §8.2)
		const pageRole = page.type === 'focus_page' ? 'focus' : 'article';
		const funnelStage = page.funnel_stage ?? 'mofu';
		const dominantIntent = inferDominantIntentFromKeyword(page.keyword ?? page.title ?? '');
		const canonicalPageType = classifyPageType(
			page.keyword ?? page.title ?? '',
			funnelStage,
			dominantIntent,
			pageRole
		);
		const croContextBlock = getCroContextBlock(canonicalPageType);

		// L7: Author / EEAT — resolve from body override, page override, or site default
		const authorOverrideFromBody = (req.body as { authorOverride?: string } | undefined)?.authorOverride;
		const resolvedAuthor =
			authorOverrideFromBody ??
			(page.author_bio_override as string | null) ??
			(site.author_bio as string | null) ??
			null;
		const authorBlock = resolvedAuthor
			? `
AUTHOR / EEAT — Use this author bio to demonstrate Experience, Expertise, Authority, Trust:
${resolvedAuthor}
`
			: '';

		// For focus pages: inject destination so AI includes conversion link (many-to-one-to-one)
		let destinationBlock = '';
		if (page.type === 'focus_page' && page.cluster_id) {
			const { data: cluster } = await supabase
				.from('clusters')
				.select('destination_page_url, destination_page_label')
				.eq('id', page.cluster_id)
				.single();
			if (cluster?.destination_page_url) {
				const label = cluster.destination_page_label || cluster.destination_page_url;
				destinationBlock = `
DESTINATION PAGE (REQUIRED — reverse silo exit):
This page should drive readers toward "${label}" at ${cluster.destination_page_url}.
Include a natural contextual link to this destination in the content — it is the primary conversion target for this cluster.
`;
			}
		}

		const userPrompt = `PAGE TYPE: ${page.page_type || 'Blog Post / Article'}
${pageTypeInstr.systemNote}
${croContextBlock}
${authorBlock}
${destinationBlock}

Target keyword: ${page.keyword || page.title}
Business: ${site.name} — ${site.niche || ''}
Target customers: ${site.customer_description || ''}
Brand tone: ${brandTone}
Language: ${targetLanguage}
Region / dialect: ${targetRegion}
Must include these terms: ${includeTerms}
Avoid these terms: ${avoidTerms}
Domain Authority: ${site.domain_authority || 0}

Competitor analysis (real H2s and word counts crawled from top-ranking pages):
${competitorBlock}

IGS REQUIREMENT: Identify what ALL competitors are covering (the shared H2 topics above) AND what NONE of them cover — that gap must be your igs_opportunity field.

Target word count: ${resolvedWc} words

People Also Ask:
${paaList.length ? paaList.map((q, i) => `${i + 1}. ${q}`).join('\n') : 'None'}

Related keywords to weave in:
${relatedKeywords || 'None'}

PAGE-TYPE-SPECIFIC H2 RULES (CRITICAL — follow these exactly):
${pageTypeInstr.h2Rules}

H3 STRATEGY:
${pageTypeInstr.h3Rules}

AVOID:
${pageTypeInstr.avoidRules}

${EEAT_AND_OPENING_INSTRUCTIONS}

Create a content brief for this specific page type. Return ONLY a valid JSON object:
{
  "sections": [
    {
      "type": "H1|H2|H3|intro|cta|faq|product_description|specs|comparison_table",
      "heading": "exact heading text following the H2 rules above",
      "guidance": "2-3 sentences on what to write in this section. First section (intro) must explicitly instruct the writer to open with a direct, keyword-containing statement that confirms the reader found what they searched for — no question openers, no generic scene-setters.",
      "entities": ["entity1", "entity2"],
      "word_count_target": 200,
      "cro_note": "conversion tip or null",
      "eeat_note": "which EEAT signal to demonstrate in this section: experience|expertise|authority|trust or null"
    }
  ],
  "lsi_terms": [{"term": "latent semantic term", "found_in_competitors": true}],
  "entities": [{"name": "entity name", "must_cover": true}],
  "paa_questions": [{"question": "People Also Ask question", "answered": false}],
  "igs_opportunity": "unique angle, original stat, or perspective competitors haven't covered",
  "dominant_intent": "informational|commercial|transactional",
  "competitor_word_counts": [1200, 1450, 980],
  "schema_type": "${pageTypeInstr.schemaType}",
  "meta_title_suggestion": "Primary Keyword — Brand Name (under 60 chars)",
  "meta_description_suggestion": "150-155 chars, includes keyword + clear value prop + CTA"
}

Requirements:
- H2s: ${pageTypeInstr.h2Rules}
- H3s: ${pageTypeInstr.h3Rules}
- lsi_terms: 8-15 contextually related terms
- entities: 5-10 real-world entities to cover
- paa_questions: use People Also Ask questions provided above
- igs_opportunity: what's MISSING from competitors that would add genuine value
- The intro section guidance MUST explicitly instruct: open with a direct statement
  containing the keyword that confirms the reader found what they searched for`;

		let rawContent: string;
		try {
			rawContent = await callClaude(
				`You are an expert SEO content strategist. You create detailed content briefs adapted to the specific page type — different page types have fundamentally different on-page SEO rules. ${pageTypeInstr.systemNote} Return only valid JSON — no markdown fences, no extra text.`,
				userPrompt,
				4000
			);
		} catch (err) {
			console.error('[Pages] Claude brief error:', err instanceof Error ? err.message : err);
			return res.status(500).json({ error: 'Failed to generate brief' });
		}

		let briefData: Record<string, unknown>;
		try {
			briefData = JSON.parse(rawContent.replace(/```json\n?|\n?```/g, '').trim());
		} catch {
			console.error('[Pages] Brief parse error:', rawContent.slice(0, 200));
			briefData = { sections: [], meta_title_suggestion: '', meta_description_suggestion: '' };
		}

		// Attach competitor H2s and word counts for the Competitors tab
		if (competitorsWithTitles.length > 0) {
			briefData.competitors_raw = competitorsWithTitles;
		}

		const updatePayload: Record<string, unknown> = {
			brief_data: briefData,
			status: 'brief_generated',
			page_type: canonicalPageType,
			meta_title: (briefData.meta_title_suggestion as string) || null,
			meta_description: (briefData.meta_description_suggestion as string) || null,
			updated_at: new Date().toISOString()
		};
		// Persist competitor-based target so page shows correct word count (not hardcoded 900)
		if (resolvedWc != null && resolvedWc > 0) {
			updatePayload.target_word_count = resolvedWc;
		}
		if (authorOverrideFromBody !== undefined) {
			updatePayload.author_bio_override =
				typeof authorOverrideFromBody === 'string' && authorOverrideFromBody.trim()
					? authorOverrideFromBody.trim()
					: null;
		}
		await supabase.from('pages').update(updatePayload).eq('id', pageId);

		return res.json({ briefData, status: 'brief_generated' });
	} catch (err) {
		console.error('[Pages] generateBrief error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const generateArticle = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const pageId = req.params.id;
		if (!pageId) return res.status(400).json({ error: 'Page ID required' });

		const { data: page, error: pageErr } = await supabase
			.from('pages')
			.select(
				'id, cluster_id, site_id, type, title, keyword, target_word_count, page_type, brief_data, author_bio_override'
			)
			.eq('id', pageId)
			.single();

		if (pageErr || !page) return res.status(404).json({ error: 'Page not found' });

		const { data: site } = await supabase
			.from('sites')
			.select(
				'id, name, niche, customer_description, organization_id, tone, include_terms, avoid_terms, target_language, target_region, url, author_bio, is_ymyl'
			)
			.eq('id', page.site_id)
			.single();

		if (!site) return res.status(404).json({ error: 'Site not found' });

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg || userOrg.organization_id !== site.organization_id) {
			return res.status(403).json({ error: 'Access denied' });
		}

		// Fetch all pages in the cluster to build internal link instructions
		const { data: clusterPages } = await supabase
			.from('pages')
			.select('id, title, keyword, type')
			.eq('cluster_id', page.cluster_id)
			.neq('id', pageId);

		// Fetch cluster for destination (focus page → product/collection; many-to-one-to-one)
		let destination: { url: string; label: string } | undefined;
		if (page.cluster_id) {
			const { data: cluster } = await supabase
				.from('clusters')
				.select('destination_page_url, destination_page_label')
				.eq('id', page.cluster_id)
				.single();
			if (cluster?.destination_page_url) {
				destination = {
					url: cluster.destination_page_url,
					label: cluster.destination_page_label || cluster.destination_page_url
				};
			}
		}

		const linkInstructions = buildInternalLinksForPage(
			pageId,
			page.type || 'article',
			[
				{
					id: pageId,
					title: page.title,
					keyword: page.keyword || page.title,
					type: page.type || 'article'
				},
				...(clusterPages ?? [])
			],
			(site.url as string | null) ?? '',
			destination
		);

		const creditCheck = await checkAndDeductCredits(
			site.organization_id,
			CREDIT_COSTS.ARTICLE_GENERATION
		);
		if (!creditCheck.ok) {
			return res.status(402).json({
				error: creditCheck.error,
				required: CREDIT_COSTS.ARTICLE_GENERATION,
				available: creditCheck.available
			});
		}

		const { organic, relatedSearches, peopleAlsoAsk } = await serperSearch(
			page.keyword || page.title,
			10
		);

		// Fetch real competitor H2s and word counts for article generation
		// Falls back to brief_data.competitors_raw if already populated from brief
		const articleCompetitorUrls = (organic || [])
			.slice(0, 5)
			.map((o) => (o as { link?: string }).link)
			.filter((u): u is string => typeof u === 'string' && u.startsWith('http'));

		const brief = page.brief_data as {
			sections?: Array<{
				heading: string;
				guidance?: string;
				entities?: string[];
				eeat_note?: string;
			}>;
			lsi_terms?: Array<{ term: string }>;
			entities?: Array<{ term: string; name?: string }>;
			paa_questions?: Array<{ question: string }>;
			igs_opportunity?: string;
			competitors_raw?: Array<{
				url: string;
				word_count: number;
				h2s: string[];
				title?: string | null;
			}>;
		} | null;

		const articleCompetitorsRaw =
			brief?.competitors_raw && brief.competitors_raw.length > 0
				? brief.competitors_raw
				: await fetchCompetitorPages(articleCompetitorUrls, 5);

		const paaList = (peopleAlsoAsk || []).map((p) => p.question);
		const relatedKws = (relatedSearches || [])
			.map((r) => r.query)
			.slice(0, 8)
			.join(', ');
		const targetWc = page.target_word_count || 1000;

		const briefSections = brief?.sections
			?.map((s) => {
				const eeaNote = s.eeat_note ? ` [EEAT: demonstrate ${s.eeat_note}]` : '';
				return `- ${s.heading}${s.guidance ? `: ${s.guidance}` : ''}${eeaNote}`;
			})
			.join('\n');
		const lsiTerms = brief?.lsi_terms?.map((t) => t.term).join(', ') || relatedKws || 'None';
		const entities = brief?.entities?.map((e) => e.term ?? e.name ?? '').join(', ') || 'None';
		const igsOpportunity =
			brief?.igs_opportunity ||
			'Add a unique perspective, original stat, or first-hand insight not found in competitor articles.';

		// Competitor heading structure for article prompt (spec Section 8.3: {competitor_heading_structure})
		const competitorHeadingStructure =
			articleCompetitorsRaw && articleCompetitorsRaw.length > 0
				? articleCompetitorsRaw
						.slice(0, 3)
						.map((c, i) => {
							const h2s =
								c.h2s.length > 0
									? c.h2s
											.slice(0, 6)
											.map((h) => `  • ${h}`)
											.join('\n')
									: '  (no headings available)';
							return `Competitor ${i + 1} (${c.word_count.toLocaleString()} words):\n${h2s}`;
						})
						.join('\n\n')
				: null;

		// Real competitor avg word count from brief data (dissertation: target = avg × 1.1)
		const competitorAvgWcFromBrief =
			articleCompetitorsRaw && articleCompetitorsRaw.length > 0
				? Math.round(
						articleCompetitorsRaw.reduce((sum, c) => sum + c.word_count, 0) /
							articleCompetitorsRaw.length
					)
				: null;

		const paaFromBrief = brief?.paa_questions?.map((q) => q.question) || paaList;

		const brandTone = (site.tone as string | null) || 'professional';
		const includeTerms = (site.include_terms as string | null) || '(none)';
		const avoidTerms = (site.avoid_terms as string | null) || '(none)';
		const targetLanguage = (site.target_language as string | null) || 'English';
		const targetRegion = (site.target_region as string | null) || 'United States';
		const resolvedAuthorArticle =
			(page.author_bio_override as string | null) ?? (site.author_bio as string | null) ?? null;
		const authorBlockArticle = resolvedAuthorArticle
			? `
AUTHOR / EEAT — Use this author bio to demonstrate Experience, Expertise, Authority, Trust:
${resolvedAuthorArticle}
`
			: '';
		const articlePageTypeInstr = getPageTypeInstructions(page.page_type as string | null);
		const resolvedArticleWc =
			articlePageTypeInstr.targetWcOverride ??
			(competitorAvgWcFromBrief ? Math.round(competitorAvgWcFromBrief * 1.1) : null) ??
			targetWc;

		const structureGuidance =
			briefSections ||
			(organic || [])
				.slice(0, 5)
				.map((o) => `- ${o.title}`)
				.join('\n');

		const maxWords = Math.ceil(Number(resolvedArticleWc) * 1.15);
		const userPrompt = `PAGE TYPE: ${page.page_type || 'Blog Post / Article'}
${articlePageTypeInstr.systemNote}

CRITICAL WORD COUNT: Your output MUST be approximately ${resolvedArticleWc} words (±15%). Do NOT exceed ${maxWords} words. This is non-negotiable — count your words before returning.

Write complete ${resolvedArticleWc}-word content targeting: "${page.keyword || page.title}"

Business: ${site.name} — ${site.niche || ''}
Audience: ${site.customer_description || 'general audience'}
Brand tone: ${brandTone}
Language: ${targetLanguage}
Region / dialect: ${targetRegion}${targetRegion !== 'United States' ? ` (use ${targetRegion} spelling and conventions throughout)` : ''}
Must include these terms: ${includeTerms}
Avoid these terms: ${avoidTerms}

LSI / contextual terms to weave in naturally:
${lsiTerms}

Entities and topics to cover:
${entities}

Content structure (follow this outline):
${structureGuidance}
${competitorHeadingStructure ? `
COMPETITOR HEADING STRUCTURE — improve on this, do not copy it:
${competitorHeadingStructure}

Your H2s must:
1. Cover the same core user intents as competitors (readers expect this coverage)
2. Be written as specific answerable questions [Patent US9959315B1 — passage context vectors]
3. Include at least 1-2 H2s on angles NONE of the competitors address [IGS requirement — Patent US20190155948A1]` : ''}

People Also Ask (use where relevant):
${paaFromBrief.length ? paaFromBrief.map((q, i) => `${i + 1}. ${q}`).join('\n') : 'None'}

Information Gain opportunity:
${igsOpportunity}

PAGE-TYPE-SPECIFIC REQUIREMENTS (THESE OVERRIDE DEFAULTS):
H2 strategy: ${articlePageTypeInstr.h2Rules}
H3 strategy: ${articlePageTypeInstr.h3Rules}
Schema type to include: ${articlePageTypeInstr.schemaType}
CTA strategy: ${articlePageTypeInstr.ctaStrategy}
AVOID: ${articlePageTypeInstr.avoidRules}

UNIVERSAL REQUIREMENTS:
1. One H1 containing the primary keyword
2. Keyword appears naturally in first 100 words
3. Natural keyword density (1-2x primary keyword, rest LSI terms)
4. At least ONE section with original perspective or specific statistic (IGS — patent US20190155948A1)
${authorBlockArticle}
${EEAT_AND_OPENING_INSTRUCTIONS}
${site.is_ymyl ? YMYL_PROMPT_ADDITIONS : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY INTERNAL LINKS — YOU MUST INSERT ALL OF THESE AS <a> TAGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${formatLinksForPrompt(linkInstructions)}

Internal link rules (US8117209B1 Reasonable Surfer):
• Use EXACTLY the anchor text specified — do not paraphrase or split it
• Wrap naturally into a sentence, e.g. "…read our guide on <a href="...">anchor text</a> to…"
• Always include a space before <a> and after </a> so links don't merge with adjacent words (e.g. "Understanding <a href="...">ingredients</a> reactions" not "Understanding<a>ingredients</a>reactions")
• INTRO links go in the first two paragraphs (before the first H2)
• BODY links go where the topic is naturally mentioned in the article
• Do NOT add rel="nofollow" or target="_blank" to internal links
• Every link listed above MUST appear in the final HTML — they are mandatory
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Output HTML only (h1, h2, h3, p, ul, ol, li, table, thead, tbody, tr, th, td, a tags). No markdown. No <html>, <head>, or <body> wrapper.`;

		let htmlContent: string;
		try {
			htmlContent = await callClaude(
				`You are an expert SEO content writer who adapts your approach completely based on page type. ${articlePageTypeInstr.systemNote} Each page type has different H2 rules, H3 rules, schema requirements, and CTA strategies. CRITICAL: Respect the exact word count specified — do not exceed the maximum. You MUST insert every internal link listed in the prompt as an HTML <a> tag at the exact placement specified — these are non-negotiable for the reverse-silo link architecture. Output HTML only — no markdown, no wrappers.`,
				userPrompt,
				6000
			);
		} catch (err) {
			console.error('[Pages] Claude article error:', err instanceof Error ? err.message : err);
			return res.status(500).json({ error: 'Failed to generate article' });
		}

		const htmlWithSpaces = ensureSpacesAroundLinks(htmlContent);
		const wordCount = stripTags(htmlWithSpaces).split(/\s+/).filter(Boolean).length;
		const tiptapContent = htmlToTiptap(htmlWithSpaces);

		// ── Extract meta + semantic data from the generated article ────────────
		type ArticleMeta = {
			meta_title: string;
			meta_description: string;
			lsi_terms: Array<{ term: string; found_in_competitors: boolean }>;
			entities: Array<{ term: string; must_cover: boolean }>;
			paa_questions: Array<{ question: string; answered: boolean }>;
		};

		let extractedMeta: ArticleMeta | null = null;
		try {
			const keyword = page.keyword || page.title;
			const plainText = stripTags(htmlWithSpaces).slice(0, 3000);
			const metaRaw = await callClaude(
				'You are an SEO metadata extractor. Analyse the provided article and return ONLY valid JSON with no markdown fences.',
				`Primary keyword: "${keyword}"
Page type: ${page.page_type || 'Blog Post / Article'}

Article content (excerpt):
${plainText}

Return this JSON shape — nothing else:
{
  "meta_title": "Under 60 chars, includes the primary keyword",
  "meta_description": "150-155 chars, includes keyword + clear value prop",
  "lsi_terms": [
    { "term": "2-4 word phrase used or implied in the article", "found_in_competitors": true }
  ],
  "entities": [
    { "term": "specific entity, brand, place, or concept covered", "must_cover": true }
  ],
  "paa_questions": [
    { "question": "question answered or addressed in the article", "answered": true }
  ]
}

Requirements:
- meta_title: must contain the primary keyword naturally, under 60 characters
- meta_description: 150-155 chars — this is the range Google renders well
- lsi_terms: 8-12 terms that appear in or are strongly implied by the article
- entities: 5-10 real named entities (people, places, brands, tools, concepts)
- paa_questions: 3-6 questions the article answers`,
				1000
			);
			const jsonMatch = metaRaw.match(/\{[\s\S]*\}/);
			if (jsonMatch) extractedMeta = JSON.parse(jsonMatch[0]) as ArticleMeta;
		} catch (err) {
			console.warn('[Pages] Meta extraction failed:', err instanceof Error ? err.message : err);
		}

		const existingBrief = (page.brief_data as Record<string, unknown> | null) ?? {};
		const mergedBriefData = {
			...existingBrief,
			...(extractedMeta && {
				lsi_terms: extractedMeta.lsi_terms,
				entities: extractedMeta.entities,
				paa_questions: extractedMeta.paa_questions
			}),
			// Persist competitor data so Competitors tab shows it (from brief or from article fetch)
			...(articleCompetitorsRaw &&
				articleCompetitorsRaw.length > 0 && {
					competitors_raw: articleCompetitorsRaw.map((c) => ({
						url: c.url,
						title: c.title ?? null,
						word_count: c.word_count,
						h2s: c.h2s
					}))
				})
		};

		await supabase
			.from('pages')
			.update({
				content: JSON.stringify(tiptapContent),
				status: 'draft',
				word_count: wordCount,
				target_word_count: resolvedArticleWc,
				...(extractedMeta && {
					meta_title: extractedMeta.meta_title,
					meta_description: extractedMeta.meta_description
				}),
				brief_data: Object.keys(mergedBriefData).length > 0 ? mergedBriefData : null,
				updated_at: new Date().toISOString()
			})
			.eq('id', pageId);

		return res.json({
			content: tiptapContent,
			wordCount,
			status: 'draft',
			metaTitle: extractedMeta?.meta_title,
			metaDescription: extractedMeta?.meta_description
		});
	} catch (err) {
		console.error('[Pages] generateArticle error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

function stripTags(s: string): string {
	return s.replace(/<[^>]+>/g, '').trim();
}

/**
 * Fix LLM-generated HTML where links are concatenated with surrounding text
 * (e.g. "Understanding<a>ingredients</a>reactions" → "Understanding <a>ingredients</a> reactions").
 */
function ensureSpacesAroundLinks(html: string): string {
	return html
		.replace(/([^\s>])(<\s*a\s[^>]*>)/gi, '$1 $2')
		.replace(/(<\/a\s*>)([^\s<])/gi, '$1 $2');
}

/** Extract all <td> or <th> cell texts from a table row string */
function parseTableRow(rowHtml: string): string[] {
	const cells: string[] = [];
	const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
	let c;
	while ((c = cellRegex.exec(rowHtml)) !== null) {
		const text = stripTags(c[1]).trim();
		if (text) cells.push(text);
	}
	return cells;
}

/**
 * Parse inline HTML into Tiptap inline nodes, preserving <a> tags as link marks
 * and <strong>/<em>/<code> as bold/italic/code marks.
 */
function parseInlineContent(inner: string): unknown[] {
	const nodes: unknown[] = [];
	const tokenRegex =
		/(<a\s[^>]*>[\s\S]*?<\/a>|<strong[^>]*>[\s\S]*?<\/strong>|<em[^>]*>[\s\S]*?<\/em>|<code[^>]*>[\s\S]*?<\/code>|<br\s*\/?>|<[^>]+>)/gi;
	let lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = tokenRegex.exec(inner)) !== null) {
		if (m.index > lastIndex) {
			const text = stripTags(inner.slice(lastIndex, m.index));
			if (text) nodes.push({ type: 'text', text });
		}
		const token = m[0];
		if (/^<a\s/i.test(token)) {
			const hrefMatch = token.match(/href=["']([^"']+)["']/i);
			const linkText = stripTags(token);
			if (linkText && hrefMatch?.[1]) {
				nodes.push({
					type: 'text',
					text: linkText,
					marks: [{ type: 'link', attrs: { href: hrefMatch[1] } }]
				});
			} else if (linkText) {
				nodes.push({ type: 'text', text: linkText });
			}
		} else if (/^<strong/i.test(token)) {
			const text = stripTags(token);
			if (text) nodes.push({ type: 'text', text, marks: [{ type: 'bold' }] });
		} else if (/^<em/i.test(token)) {
			const text = stripTags(token);
			if (text) nodes.push({ type: 'text', text, marks: [{ type: 'italic' }] });
		} else if (/^<code/i.test(token)) {
			const text = stripTags(token);
			if (text) nodes.push({ type: 'text', text, marks: [{ type: 'code' }] });
		} else if (/^<br/i.test(token)) {
			nodes.push({ type: 'hardBreak' });
		}
		lastIndex = m.index + m[0].length;
	}
	if (lastIndex < inner.length) {
		const text = stripTags(inner.slice(lastIndex));
		if (text) nodes.push({ type: 'text', text });
	}
	return nodes.length > 0 ? nodes : [{ type: 'text', text: stripTags(inner) }];
}

function htmlToTiptap(html: string): unknown {
	const content: Array<{ type: string; attrs?: Record<string, unknown>; content?: unknown[] }> = [];

	const normalised = html.replace(/\r?\n/g, ' ');

	const topLevelRegex = /<(h[1-6]|p|ul|ol|blockquote|table)[^>]*>[\s\S]*?<\/\1>/gi;
	let m;
	while ((m = topLevelRegex.exec(normalised)) !== null) {
		const tag = m[0].match(/^<(\w+)/)?.[1]?.toLowerCase() ?? '';
		const full = m[0];
		const inner = full.replace(/^<[^>]+>/, '').replace(/<\/[^>]+>$/, '');

		if (tag.startsWith('h')) {
			const text = stripTags(inner).trim();
			if (text) {
				content.push({
					type: 'heading',
					attrs: { level: parseInt(tag[1], 10) },
					content: [{ type: 'text', text }]
				});
			}
		} else if (tag === 'p') {
			const inlineNodes = parseInlineContent(inner);
			if (inlineNodes.length > 0) {
				content.push({ type: 'paragraph', content: inlineNodes });
			}
		} else if (tag === 'blockquote') {
			const inlineNodes = parseInlineContent(inner);
			if (inlineNodes.length > 0) {
				content.push({
					type: 'blockquote',
					content: [{ type: 'paragraph', content: inlineNodes }]
				});
			}
		} else if (tag === 'ul' || tag === 'ol') {
			const listType = tag === 'ul' ? 'bulletList' : 'orderedList';
			const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
			const listItems: unknown[] = [];
			let liM;
			while ((liM = liRegex.exec(inner)) !== null) {
				const liNodes = parseInlineContent(liM[1]);
				if (liNodes.length > 0) {
					listItems.push({
						type: 'listItem',
						content: [{ type: 'paragraph', content: liNodes }]
					});
				}
			}
			if (listItems.length > 0) {
				content.push({ type: listType, content: listItems });
			}
		} else if (tag === 'table') {
			const tableItems: unknown[] = [];

			const theadMatch = inner.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
			if (theadMatch) {
				const headRowMatch = theadMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
				if (headRowMatch) {
					const cells = parseTableRow(headRowMatch[1]);
					if (cells.length > 0) {
						content.push({
							type: 'paragraph',
							content: [{ type: 'text', text: cells.join(' | ') }]
						});
					}
				}
			}

			const tbodyMatch = inner.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
			const bodyHtml = tbodyMatch ? tbodyMatch[1] : inner;
			const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
			let rowM;
			while ((rowM = rowRegex.exec(bodyHtml)) !== null) {
				const cells = parseTableRow(rowM[1]);
				if (cells.length > 0) {
					tableItems.push({
						type: 'listItem',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: cells.join(' | ') }] }]
					});
				}
			}
			if (tableItems.length > 0) {
				content.push({ type: 'bulletList', content: tableItems });
			}
		}
	}

	if (content.length === 0) {
		content.push({
			type: 'paragraph',
			content: [{ type: 'text', text: stripTags(html) || ' ' }]
		});
	}

	return { type: 'doc', content };
}

// ---------------------------------------------------------------------------
// Section-level rewrite
// POST /api/pages/:id/rewrite-section
// ---------------------------------------------------------------------------

export const rewriteSection = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const pageId = req.params.id;
		const { sectionIndex, heading, guidance, entities, keyword } = req.body;

		if (!pageId || sectionIndex == null || !heading) {
			return res.status(400).json({ error: 'pageId, sectionIndex, and heading are required' });
		}

		const { data: page } = await supabase
			.from('pages')
			.select('id, site_id, keyword, title, brief_data')
			.eq('id', pageId)
			.single();

		if (!page) return res.status(404).json({ error: 'Page not found' });

		const { data: site } = await supabase
			.from('sites')
			.select('id, name, niche, customer_description, organization_id')
			.eq('id', page.site_id)
			.single();

		if (!site) return res.status(404).json({ error: 'Site not found' });

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg || userOrg.organization_id !== site.organization_id) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const cost = CREDIT_COSTS.SECTION_REWRITE;
		const creditCheck = await checkAndDeductCredits(site.organization_id, cost);
		if (!creditCheck.ok) {
			return res
				.status(402)
				.json({ error: creditCheck.error, required: cost, available: creditCheck.available });
		}

		const targetKw = keyword || page.keyword || page.title;
		const entityList = Array.isArray(entities) ? entities.join(', ') : '';

		let rewrittenContent: string;
		try {
			rewrittenContent = (
				await callClaude(
					`You are an expert SEO copywriter. Rewrite the provided section guidance into publication-ready content.
- Write in second person or direct voice where appropriate
- Naturally include the target keyword where it fits
- Cover any entities/topics listed
- Keep the heading intact
- Return ONLY the rewritten section content as plain text (no heading, no JSON, no markdown fences)`,
					`Page keyword: "${targetKw}"
Business: ${site.name} — ${site.niche || ''}
Audience: ${site.customer_description || ''}

Section heading: "${heading}"
Original guidance: "${guidance || 'No guidance provided'}"
Entities to cover: ${entityList || 'none specified'}

Rewrite this section content (150-250 words). Keep the tone professional but approachable.`,
					600
				)
			).trim();
		} catch (err) {
			console.error(
				'[Pages] Claude section rewrite error:',
				err instanceof Error ? err.message : err
			);
			return res.status(500).json({ error: 'Failed to rewrite section' });
		}

		const briefData = page.brief_data as Record<string, unknown> | null;
		if (briefData && Array.isArray(briefData.sections)) {
			const sections = briefData.sections as Array<Record<string, unknown>>;
			if (sections[sectionIndex]) {
				sections[sectionIndex] = { ...sections[sectionIndex], guidance: rewrittenContent };
				await supabase.from('pages').update({ brief_data: briefData }).eq('id', pageId);
			}
		}

		res.json({ success: true, data: { content: rewrittenContent, sectionIndex } });
	} catch (error) {
		console.error('[Pages] Section rewrite error:', error);
		res.status(500).json({ error: 'Failed to rewrite section' });
	}
};

// ---------------------------------------------------------------------------
// FAQ generation
// POST /api/pages/:id/generate-faq
// ---------------------------------------------------------------------------

export const generateFAQ = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const pageId = req.params.id;
		if (!pageId) return res.status(400).json({ error: 'Page ID required' });

		const { data: page } = await supabase
			.from('pages')
			.select('id, site_id, keyword, title')
			.eq('id', pageId)
			.single();

		if (!page) return res.status(404).json({ error: 'Page not found' });

		const { data: site } = await supabase
			.from('sites')
			.select('id, name, niche, customer_description, organization_id')
			.eq('id', page.site_id)
			.single();

		if (!site) return res.status(404).json({ error: 'Site not found' });

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg || userOrg.organization_id !== site.organization_id) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const cost = CREDIT_COSTS.FAQ_GENERATION;
		const creditCheck = await checkAndDeductCredits(site.organization_id, cost);
		if (!creditCheck.ok) {
			return res
				.status(402)
				.json({ error: creditCheck.error, required: cost, available: creditCheck.available });
		}

		const serperData = await serperSearch(page.keyword || page.title, 5);
		const paaQuestions = (serperData.peopleAlsoAsk || []).map((q) => q.question).slice(0, 8);

		let rawFaqContent: string;
		try {
			rawFaqContent = await callClaude(
				`You are an SEO content expert. Generate FAQ content with concise, accurate answers.
Return JSON with this shape:
{
  "faqs": [{"question": "...", "answer": "..."}],
  "schema": "<script type=\\"application/ld+json\\">...</script>"
}
Each answer: 2-3 sentences, plain language. Include 5-7 FAQs. Schema must be valid FAQPage JSON-LD. Return only valid JSON — no markdown fences.`,
				`Target keyword: "${page.keyword || page.title}"
Business: ${site.name} — ${site.niche || ''}
Audience: ${site.customer_description || ''}

People Also Ask questions found on Google:
${paaQuestions.length ? paaQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n') : 'None found — generate relevant questions yourself'}

Generate a complete FAQ section with answers, plus copy-ready FAQPage schema markup.`,
				1500
			);
		} catch (err) {
			console.error('[Pages] Claude FAQ error:', err instanceof Error ? err.message : err);
			return res.status(500).json({ error: 'Failed to generate FAQ' });
		}

		let faqData: { faqs?: Array<{ question: string; answer: string }>; schema?: string } = {};
		try {
			const jsonMatch = rawFaqContent.match(/\{[\s\S]*\}/);
			faqData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
		} catch {
			console.error('[Pages] FAQ JSON parse error');
		}

		res.json({
			success: true,
			data: {
				faqs: faqData.faqs || [],
				schema: faqData.schema || '',
				paa_questions_used: paaQuestions
			}
		});
	} catch (error) {
		console.error('[Pages] FAQ generation error:', error);
		res.status(500).json({ error: 'Failed to generate FAQ' });
	}
};

// ---------------------------------------------------------------------------
// CRO Specific Fixes — Section 8.6 AI prompt
// POST /api/pages/:id/cro-fixes
// ---------------------------------------------------------------------------

export const getCroFixes = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const pageId = req.params.id;
		if (!pageId) return res.status(400).json({ error: 'Page ID required' });

		const { data: page } = await supabase
			.from('pages')
			.select('id, site_id, keyword, content, cro_checklist')
			.eq('id', pageId)
			.single();

		if (!page) return res.status(404).json({ error: 'Page not found' });

		const { data: site } = await supabase
			.from('sites')
			.select('id, name, niche, customer_description, organization_id')
			.eq('id', page.site_id)
			.single();

		if (!site) return res.status(404).json({ error: 'Site not found' });

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg || userOrg.organization_id !== site.organization_id) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const checklist = (page.cro_checklist as Record<string, unknown>) ?? {};
		const failing = getFailingRequiredItems(checklist);
		if (failing.length === 0) {
			return res.status(400).json({
				error: 'No failing required CRO items. All required items pass or partial.'
			});
		}

		const cost = CREDIT_COSTS.CRO_FIXES;
		const creditCheck = await checkAndDeductCredits(site.organization_id, cost);
		if (!creditCheck.ok) {
			return res
				.status(402)
				.json({ error: creditCheck.error, required: cost, available: creditCheck.available });
		}

		// Parse Tiptap content for context
		let doc: unknown = null;
		try {
			doc = typeof page.content === 'string' ? JSON.parse(page.content as string) : page.content;
		} catch {
			// content may be null or malformed
		}
		const plainText = extractPlainText(doc as Parameters<typeof extractPlainText>[0]);
		const h1s = extractH1s(doc as Parameters<typeof extractH1s>[0]);
		const h1 = h1s.length > 0 ? h1s[0] : '(none)';
		const ctas = detectCTAsInFirst20(plainText);
		const trustSignals = detectTrustSignals(plainText);

		const pageType = (checklist.page_type as string) ?? 'tofu_article';
		const businessName = site.name || 'Business';
		const niche = site.niche || '';
		const customerDesc = site.customer_description || '';
		const keyword = page.keyword || '';

		const failingBlock = failing
			.map(
				(f) => `• ${f.label}: ${f.evidence || '(no evidence)'} — why it matters for this page type`
			)
			.join('\n');

		const systemPrompt = `You are a conversion rate optimization expert writing for small business owners.
Your job is to give specific, actionable fixes for failing conversion elements.
Write in plain English. No jargon. No generic advice.
Give the exact copy or structural change — name actual words they should use.
Maximum 3 suggestions total across all failing items.
Each suggestion must be 1-2 sentences.`;

		const userPrompt = `Page type: ${pageType}
Business: ${businessName} — ${niche}
Target keyword: ${keyword}
Target customer: ${customerDesc}

Failing CRO items:
${failingBlock}

Current H1: ${h1}
Current CTAs detected: ${ctas.join(', ')}
Current trust signals detected: ${trustSignals.join(', ')}

INTENT RULES — follow these strictly:
- tofu_article: Suggest soft CTAs only. Examples: "Download the free guide", "Get the checklist", email opt-ins. Never suggest "Book Now", "Get a Quote", or any purchase/contact pressure.
- mofu_article / mofu_comparison: Suggest medium-commitment CTAs. Examples: "See how it works", "Get a free assessment", "Book a no-obligation call". Build trust before the ask.
- bofu_article / service_page / money_page: Suggest hard CTAs with urgency. Trust signals and social proof must appear before the CTA. Examples: "Get a Free Quote Today", "Call Us Now — We Answer 24/7", "Book Your Free Survey This Week".

For each failing item:
- State what is missing in one sentence
- Give the exact copy or structural change
- If suggesting copy, write the actual words: not "add a testimonial" but "Add this line: 'Over 200 London homeowners trust us — see their stories below'"`;

		if (!openai) {
			console.error('[Pages] OpenAI API key not configured');
			return res.status(500).json({ error: 'CRO fixes service not configured' });
		}

		const completion = await openai.chat.completions.create({
			model: GPT_CONTENT_MODEL,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			],
			max_tokens: 800
		});

		const suggestions =
			completion.choices[0]?.message?.content?.trim() ??
			'Sorry, no suggestions could be generated.';

		res.json({
			success: true,
			data: { suggestions }
		});
	} catch (error) {
		console.error('[Pages] CRO fixes error:', error);
		res.status(500).json({ error: 'Failed to generate CRO fixes' });
	}
};

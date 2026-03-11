// Shared SEO utility functions used across Strategy, ClusterDetail, Workspace, etc.

export type SearchIntent = 'informational' | 'commercial' | 'transactional';
export type FunnelStage = 'tofu' | 'mofu' | 'bofu' | 'money';

/**
 * Classifies the primary search intent of a keyword.
 * Mirrors the same logic in api/src/controllers/clusters.ts.
 */
export function detectSearchIntent(keyword: string): SearchIntent {
	const kw = keyword.toLowerCase();
	if (
		/\b(buy|price|pricing|cost|hire|near me|discount|deal|free trial|sign up|get started|order|quote|shop)\b/.test(
			kw
		)
	)
		return 'transactional';
	if (
		/\b(best|top|vs|versus|compare|comparison|review|reviews|worth it|ranking|alternative|alternatives|recommend)\b/.test(
			kw
		)
	)
		return 'commercial';
	return 'informational';
}

/**
 * Derives a page type recommendation from the keyword.
 * Advises users on what kind of page to build in the workspace.
 */
export function detectPageType(keyword: string): string {
	const kw = keyword.toLowerCase();
	// Transactional / conversion
	if (
		/\b(buy|shop|order|hire|near me|service|services|quote|get started|sign up|free trial|price|pricing|cost|how much)\b/.test(
			kw
		)
	)
		return 'Service / Landing Page';
	// Commercial comparison
	if (/\bvs\b|\bversus\b|\balternative(s)?\b|\breview(s)?\b|\bbest\b|\btop\b/.test(kw))
		return 'Comparison';
	// How-to / tutorial
	if (/\bhow (to|do|does|can|should|i|you)\b/.test(kw)) return 'How-To Guide';
	// Guide / pillar
	if (/\b(complete guide|ultimate guide|guide to|tutorial|walkthrough)\b/.test(kw))
		return 'Complete Guide';
	// Default informational
	return 'Blog Post';
}

/**
 * Canonical CRO page types (from classifyPageType) mapped to display names.
 * Per system-1-cro-layer.md — user sees plain-English, not internal codes.
 */
const CANONICAL_PAGE_TYPE_DISPLAY: Record<string, string> = {
	tofu_article: 'Informational Article',
	mofu_article: 'Consideration Article',
	mofu_comparison: 'Comparison',
	bofu_article: 'Decision Article',
	service_page: 'Service Page',
	money_page: 'Money Page'
};

/**
 * Converts canonical page type (or legacy display string) to user-facing label.
 * Use when displaying page_type from DB — pass-through if already display format.
 */
export function formatPageTypeDisplay(pageType: string | null | undefined): string {
	if (!pageType) return 'Blog Post';
	return CANONICAL_PAGE_TYPE_DISPLAY[pageType] ?? pageType;
}

/**
 * Returns Tailwind classes for a page type badge.
 * Handles both canonical types (tofu_article, etc.) and legacy display strings.
 */
export function pageTypeColor(pageType: string): string {
	const pt = (pageType ?? '').toLowerCase();
	// Canonical CRO types
	if (pt === 'mofu_comparison' || pt === 'mofu_article')
		return 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400 border-warning-200 dark:border-warning-700/40';
	if (pt === 'money_page' || pt === 'service_page' || pt === 'bofu_article')
		return 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400 border-success-200 dark:border-success-700/40';
	if (pt === 'tofu_article')
		return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
	// Legacy display strings
	if (pageType.includes('Comparison') || pageType.includes('Review'))
		return 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400 border-warning-200 dark:border-warning-700/40';
	if (pageType.includes('How-To') || pageType.includes('Complete Guide'))
		return 'bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-900/30 dark:text-blue-light-400 border-blue-light-200 dark:border-blue-light-700/40';
	if (
		pageType.includes('Service') ||
		pageType.includes('Landing') ||
		pageType.includes('Product Page')
	)
		return 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400 border-success-200 dark:border-success-700/40';
	if (pageType.includes('Category'))
		return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-700/40';
	// Blog Post (default)
	return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
}

// ---------------------------------------------------------------------------
// Page type catalogue — 8 meaningful types that genuinely change what the AI
// generates: H2 strategy, schema, word count target, and CTA approach.
//
// Removed types (and where they map):
//   Educational Article → Blog Post  (same question H2s, Article schema)
//   Explainer Article   → Blog Post  (same structure, softer CTA)
//   Statistics Article  → Blog Post  (same structure, IGS data signals)
//   Q&A / FAQ Article   → Blog Post  (FAQ sections are in all Blog Posts)
//   Versus Comparison   → Comparison (keyword context makes AI do head-to-head)
//   Pricing Guide       → Service / Landing Page (high-intent, conversion focus)
//   Product Category    → Category Page (same schema, same rules)
// ---------------------------------------------------------------------------

export const PAGE_TYPES = [
	'Blog Post',
	'How-To Guide',
	'Comparison',
	'Review',
	'Complete Guide',
	'Product Page',
	'Service / Landing Page',
	'Category Page'
] as const;

export type PageTypeName = (typeof PAGE_TYPES)[number];

export interface PageTypeConfig {
	name: PageTypeName;
	description: string;
	/** Recommended word count range */
	wordCount: [number, number];
	/** JSON-LD schema type to include */
	schemaType: string;
	/** Key on-page optimisation rules for this page type */
	rules: string[];
	/** What the H2 structure should look like */
	h2Strategy: string;
	/** CTA guidance */
	ctaStrategy: string;
	/** What NOT to do on this page type */
	avoid: string[];
}

export const PAGE_TYPE_CONFIGS: Record<PageTypeName, PageTypeConfig> = {
	'Blog Post': {
		name: 'Blog Post',
		description:
			'Informational content targeting awareness keywords. Covers educational, explainer, stats, Q&A, and general blog formats.',
		wordCount: [1000, 1800],
		schemaType: 'Article',
		rules: [
			'H1 must contain the primary keyword',
			'H2s phrased as questions (How/What/Why/When/Which) — targets "People Also Ask"',
			'Keyword in the first 100 words naturally',
			'Include a FAQ section answering top PAA questions',
			'Use LSI terms throughout — no keyword stuffing',
			'At least one original perspective or unique data point (IGS signal)'
		],
		h2Strategy: 'All H2s as questions matching "People Also Ask" patterns',
		ctaStrategy: 'Soft CTA at end — link to a related guide or service page',
		avoid: [
			'Hard sales language or pricing mentions',
			'Generic intros ("In this article we will...")',
			'Keyword stuffing'
		]
	},
	'How-To Guide': {
		name: 'How-To Guide',
		description:
			'Step-by-step instructional content for "how to" keywords. HowTo schema unlocks rich results.',
		wordCount: [1200, 2000],
		schemaType: 'HowTo',
		rules: [
			'H1 = "How to [Keyword]"',
			'H2s = numbered steps with action verbs (Step 1: Install…, Step 2: Configure…)',
			'Include time estimate and difficulty near the top',
			'HowTo schema with each step',
			'End with a summary or checklist'
		],
		h2Strategy: 'Numbered step H2s — each one a clear, actionable instruction',
		ctaStrategy: '"Ready to do this faster? Try [product/service]" after the final step',
		avoid: [
			"Vague H2s that aren't actual steps",
			'FAQ sections (breaks HowTo schema flow)',
			'Skipping the expected outcome in the intro'
		]
	},
	Comparison: {
		name: 'Comparison',
		description:
			'"Best X" listicles and "A vs B" head-to-head comparisons. Targets middle-funnel commercial intent.',
		wordCount: [1500, 2500],
		schemaType: 'ItemList or Article',
		rules: [
			'H1 = "Best [X] for [Y]" or "[A] vs [B]: Which Is Better?"',
			'Comparison table near the top — highest engagement element',
			'H2 per option (listicle) or per feature category (vs)',
			'Include a clear winner/recommendation',
			'ItemList schema for listicles; Article schema for vs pages',
			'Be opinionated — wishy-washy conclusions lose trust'
		],
		h2Strategy: 'One H2 per option (listicle) or per feature category (vs comparison)',
		ctaStrategy: 'Per-option CTAs + an overall winner recommendation with a clear link',
		avoid: [
			"Weak conclusions that don't pick a side",
			'More than 10 options (reduces scannability)',
			'Missing the comparison table'
		]
	},
	Review: {
		name: 'Review',
		description:
			'In-depth review of a single product, tool, or service. Review schema enables star ratings in search.',
		wordCount: [1200, 2000],
		schemaType: 'Review',
		rules: [
			'H1 = "[Product] Review ([Year]): [One-Line Verdict]"',
			'Review schema with rating (1–5), author, datePublished',
			'Pros/Cons list near the top',
			'Current pricing section (keeps content fresh)',
			'H2s = feature categories (UI/UX, Features, Pricing, Support)',
			"Who it's best for and who should skip it"
		],
		h2Strategy: 'Feature category H2s + mandatory Pros/Cons + Verdict sections',
		ctaStrategy: '"Try [Product] free" or affiliate CTA with disclosure',
		avoid: [
			'Generic praise without specifics',
			'Skipping the rating (Review schema requires it)',
			'Outdated pricing'
		]
	},
	'Complete Guide': {
		name: 'Complete Guide',
		description:
			'Pillar/cornerstone content — comprehensive reference on a broad topic. Targets high-volume head terms.',
		wordCount: [2000, 4000],
		schemaType: 'Article',
		rules: [
			'H1 = "The Complete Guide to [Topic] ([Year])"',
			'Table of contents with jump links at the top',
			'H2s = MIX of descriptive subtopics AND question-format headings — Google scores sections under question H2s higher under Passage Scoring [US9940367B1]',
			'Self-contained sections — each H2 stands alone as a scoreable passage',
			'Mix beginner and advanced content',
			'"Last updated: [date]" prominently displayed'
		],
		h2Strategy:
			'Mix of descriptive subtopic H2s + question-format H2s ("How Does X Work?", "When Should You Use X?") — TOC required. Question H2s improve passage scoring even in pillar content [US9940367B1 + US9959315B1]',
		ctaStrategy: '"Download the checklist" or strong internal links to supporting articles',
		avoid: [
			'Trying to cover everything equally — use the 80/20 rule',
			'No TOC on guides over 2,000 words',
			'Missing the update date',
			'ALL H2s as purely descriptive label headings — mix in question H2s to improve passage scoring'
		]
	},
	'Product Page': {
		name: 'Product Page',
		description:
			'Ecommerce or SaaS product page — high commercial intent. Short, benefit-focused, conversion-optimised.',
		wordCount: [300, 600],
		schemaType: 'Product',
		rules: [
			'H1 = exact product name',
			'Product schema: name, description, price, availability, reviews',
			'Benefit-focused description above the fold (not a feature dump)',
			'Bullet points for specs — scannable',
			'Social proof (reviews, ratings) near the CTA',
			'No question-based H2s — use feature/benefit category headings'
		],
		h2Strategy: 'Feature/benefit H2s ("Key Features", "What\'s Included", "Specifications")',
		ctaStrategy: '"Add to Cart" / "Buy Now" — urgent language where appropriate',
		avoid: [
			'Manufacturer copy (duplicate content risk)',
			'Question H2s — wrong intent signal for product pages',
			'Long-form content that buries the CTA'
		]
	},
	'Service / Landing Page': {
		name: 'Service / Landing Page',
		description:
			'Conversion-focused page for services, sign-ups, or lead gen. Covers pricing guides, local service pages, and campaign landing pages.',
		wordCount: [500, 1200],
		schemaType: 'LocalBusiness, Service, or WebPage',
		rules: [
			'H1 = clear value proposition or "[Service] in [Location]"',
			'CTA visible above the fold',
			'Social proof immediately below the fold (logos, testimonials, stats)',
			'Benefit-focused H2s — not questions, not features',
			'FAQ section addressing objections',
			'No question-based H2s — commercial intent pages use benefit headings'
		],
		h2Strategy: 'Benefit/objection-handler H2s ("What You Get", "Why Choose Us", "How It Works")',
		ctaStrategy:
			'Primary CTA repeated at top, middle, and bottom — "Get a free quote" / "Start free trial"',
		avoid: [
			'Question-based H2s',
			'Competing CTAs — one conversion goal only',
			'Thin content without social proof'
		]
	},
	'Category Page': {
		name: 'Category Page',
		description:
			'Site navigation/taxonomy page — helps users browse a content or product category.',
		wordCount: [150, 400],
		schemaType: 'CollectionPage',
		rules: [
			'H1 = category name',
			"Short intro (100–200 words) explaining what's in this category",
			'CollectionPage or BreadcrumbList schema',
			'Internal links to all sub-pages in this category',
			'Meta description describes what users will find here'
		],
		h2Strategy: 'H2s = subcategory headings or featured content groups',
		ctaStrategy: 'Navigation-focused — guide users to the most relevant sub-page',
		avoid: [
			'Long-form copy — this is a navigation page',
			'Keyword stuffing in the short description',
			'Missing breadcrumb schema'
		]
	}
};

/**
 * Maps a free-form page type string (from detectPageType or DB) to a
 * canonical PAGE_TYPES entry. Falls back to 'Blog Post'.
 * Also maps all legacy type names from the old 16-type catalogue.
 */
export function canonicalPageType(rawType: string | null | undefined): PageTypeName {
	if (!rawType) return 'Blog Post';
	// Exact match first
	if ((PAGE_TYPES as readonly string[]).includes(rawType)) return rawType as PageTypeName;
	const lower = rawType.toLowerCase();
	// Legacy → new mappings
	if (lower.includes('product page') || lower === 'product') return 'Product Page';
	if (lower.includes('product category') || lower.includes('ecommerce category'))
		return 'Category Page';
	if (lower.includes('category')) return 'Category Page';
	if (lower.includes('service') || lower.includes('landing') || lower.includes('pricing'))
		return 'Service / Landing Page';
	if (lower.includes('how-to') || lower.includes('how to')) return 'How-To Guide';
	if (
		lower.includes('versus') ||
		lower.includes(' vs ') ||
		lower.includes('listicle') ||
		lower.includes('comparison') ||
		lower.includes('alternative')
	)
		return 'Comparison';
	if (lower.includes('review')) return 'Review';
	if (lower.includes('complete guide') || lower.includes('guide') || lower.includes('pillar'))
		return 'Complete Guide';
	// All informational subtypes → Blog Post
	if (
		lower.includes('educational') ||
		lower.includes('explainer') ||
		lower.includes('statistic') ||
		lower.includes('faq') ||
		lower.includes('q&a') ||
		lower.includes('blog') ||
		lower.includes('article')
	)
		return 'Blog Post';
	return 'Blog Post';
}

/**
 * Maps a funnel stage to a plain-English label non-SEO users can understand.
 */
export function funnelStageLabel(stage: FunnelStage): string {
	// User-facing labels — intentionally avoid SEO jargon.
	// Internal DB values remain 'tofu' | 'mofu' | 'bofu' | 'money'.
	// See also: src/lib/funnelLabels.ts
	switch (stage) {
		case 'money':
			return 'Focus Page';
		case 'tofu':
			return 'New Visitors';
		case 'mofu':
			return 'Interested';
		case 'bofu':
			return 'Ready to Buy';
	}
}

/**
 * Maps a funnel stage to a plain-English description.
 */
export function funnelStageDescription(stage: FunnelStage): string {
	switch (stage) {
		case 'money':
			return 'Main hub page — targets the primary keyword for this topic';
		case 'tofu':
			return 'New Visitors — targets people discovering and learning about the topic for the first time';
		case 'mofu':
			return 'Interested — targets people comparing options and evaluating what to choose';
		case 'bofu':
			return 'Ready to Buy — targets people with high intent who are ready to take action';
	}
}

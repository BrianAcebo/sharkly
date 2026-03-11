# Sharkly — Master Product Gaps Register

## Everything identified but not yet specced, tiered by release

---

## How to Use This Document

This is the authoritative gap register produced from a forensic cross-examination of the SEO dissertation, the Complete SEO System document, and the Sharkly product spec, roadmap, and sitemap. It captures everything the original spec missed — features, detection logic, data model changes, warnings, and strategic guidance that are grounded in the research but absent from the build documents.

Each item includes: what it is, why it matters (patent/research grounding), what needs to be built, and which release tier it belongs to.

**Already fully specced in separate documents (do not re-spec here):**

- System 1 CRO Layer → `system-1-cro-layer.md`
- System 2 CRO Product → `system-2-cro-product.md`
- Cluster Intelligence Layer → `cluster-intelligence-layer.md`
- Architecture B Downstream Product Page → `architecture-b-downstream-product-page.md`
- Reverse Silo Architecture + Nav/Footer Dilution → `reverse-silo-architecture.md`

---

## BETA — Must exist at launch

### B1. Author / EEAT Field on Projects Table

**What it is:** A default author field at the project level, with a per-brief override
at generation time. The project-level field covers the 80% case (solo operator who is
always the author). The per-brief override covers multi-author businesses, agencies,
and topic-specific expertise without building a full author management system.

**Why it matters:** The EEAT content generation prompts instruct the AI to include
experience markers and credentials — but without actual author data, the AI invents
generic markers ("In our experience...") instead of specific ones ("In my 12 years
as a licensed plumber in Denver..."). One field. Massive quality difference on every
article generated.

**Research grounding:** Expertise dimension of EEAT (US9767157B2 phrase model quality
signals). IGS novelty scoring (US20190155948A1) — first-hand specific experience
scores higher than generic experience markers. PageOptimizer Pro uses this exact
pattern — Author field with EEAT framing before generation.

**What to build:**

```sql
-- Project-level default author
ALTER TABLE projects ADD COLUMN author_bio text;
-- Prompt shown to user: "Who is writing this content?
-- Include their role, years of experience, and any relevant credentials."
-- Example: "Jane Smith, licensed electrician, 15 years experience,
--            NICEIC certified, based in Manchester"

-- Per-brief override (on pages table)
ALTER TABLE pages ADD COLUMN author_bio_override text;
-- If set: used instead of project.author_bio for this page's generation
-- If null: falls back to project.author_bio
-- Set at brief generation time, editable afterwards
```

**Resolution logic in brief generation:**

```javascript
const authorContext = page.author_bio_override ?? project.author_bio ?? null;
```

**Generation prompt addition:**

```
AUTHOR EXPERTISE: {authorContext}
Use this to write specific first-hand experience markers throughout the article.
Never use generic phrases like "in our experience" — always tie to the specific
role, years, and credentials provided.
If authorContext is empty, include a placeholder:
[ADD YOUR EXPERIENCE HERE — e.g., "In my 8 years as a..."]
```

**UI — Project Settings:**
New field under "Content Voice" section.
Label: "Who is the expert behind this content?"
Helper text: "This makes your content sound like it comes from a real expert —
which helps with Google's trust signals. You can change this per article at
generation time."

**UI — Brief generation flow:**
The author field appears as an editable inline field before generation, pre-filled
from project.author_bio. If the user edits it, the new value saves to
pages.author_bio_override for that page only. Project default is unchanged.
Label: "Who is writing this article?"
Helper text: "Leave as-is to use your project default, or change it for this
article specifically."

**Build tier:** Launch (L7) — feeds into every article generated.

---

### B2. AI Detection Education — Tooltip / Info Card

**What it is:** A small persistent note near the content output panel explaining that AI detection tool flags don't affect Google rankings.

**Why it matters:** Small business owners will see their Sharkly-generated content flagged by Grammarly or ZeroGPT and panic. This kills a support ticket before it's raised and reinforces why the UPSA score is the number that matters.

**Plain-English copy:**

> "Your content may be flagged by AI detection tools. This has no effect on Google rankings. What Google actually measures is semantic depth and expertise signals — which your content score already tracks."

**What to build:** Info card component near the content output. Dismissable but persistent on first view. Not a feature — a UI copy decision.

**Build tier:** Beta.

---

### B3. URL Slug Change Warning — Hard Warning on Published Pages

**What it is:** A hard warning that fires when a user attempts to change the URL slug on a page that already has published status or any recorded rankings.

**Why it matters:** The URL slug weight is 0.85 in the keyword placement model — second only to the title tag. The Historical Data patent (US7346839B2) ties all accumulated historical trust (inception date, link velocity, anchor text stability, behavioral history) to the specific URL. A 301 redirect passes most but not all equity and resets the historical trust accumulation clock. Small businesses change URLs constantly without understanding this.

**Research grounding:** US7346839B2 — historical data scoring. URL slug weight: 0.85 (keyword placement model).

**What to build:**

```javascript
// Trigger: user edits published_url field on a page where
// status = 'published' OR rankings data exists for that URL

function onURLSlugChange(page, newSlug) {
	if (page.status === 'published' || page.has_ranking_data) {
		showHardWarning({
			title: 'Changing this URL will reset its ranking history',
			body: `This page has been live at ${page.published_url}. 
             Google has built up trust for this specific URL over time — 
             including any links pointing to it. Changing the URL risks 
             losing that authority permanently, even with a redirect.
             
             If you must change it: set up a 301 redirect from the old URL 
             immediately and update any internal links pointing to the old URL.`,
			confirmText: 'I understand — change the URL anyway',
			cancelText: 'Keep the current URL',
			requiresTypedConfirmation: true // user must type "CHANGE URL" to proceed
		});
	}
}
```

**Build tier:** Beta — this is a destructive action users will take constantly without knowing the consequence.

---

## V1 — Must exist before charging for the product at scale

### V1.1. EEAT Audit Checklist — Scored, Actionable

**What it is:** A scored checklist across all four EEAT dimensions that audits the user's site and gives specific actionable items to improve trust signals. Currently the spec has a mock UI showing "NexGen EEAT score: 34/80" with no scoring function, no detection logic, and no database field.

**Research grounding:** EEAT across all four dimensions. US9767157B2 (expertise), US8682892B1 (authoritativeness/GroupModificationFactor), US20190155948A1 (IGS/experience signals).

**What a real EEAT audit checks:**

```javascript
const EEAT_CHECKLIST = {
	// EXPERTISE
	author_bio_on_articles: {
		check: (site) => site.article_pages.some((p) => p.has_author_bio),
		weight: 10,
		label: 'Author bio with credentials on article pages',
		fix: "Add an author bio to your blog posts showing who wrote them and why they're qualified."
	},
	expert_vocabulary_present: {
		check: (page) => page.upsa_data?.entity_coverage > 0.7, // proxy for expertise
		weight: 8,
		label: 'Expert-level vocabulary and entity coverage',
		fix: "Your content needs more industry-specific terminology. Use the brief's entity list."
	},

	// EXPERIENCE
	first_hand_signals: {
		check: (page) => page.igs_score?.first_hand_experience > 0,
		weight: 8,
		label: 'First-hand experience signals in content',
		fix: 'Add specific examples from your own work — client stories, before/after scenarios, lessons from real jobs.'
	},

	// AUTHORITATIVENESS
	about_page_exists: {
		check: (site) => site.pages.some((p) => p.url.includes('/about')),
		weight: 8,
		label: 'About page with real team information',
		fix: 'Create an About page that describes your team, history, and credentials — not just marketing copy.'
	},
	brand_search_ratio: {
		check: (site) => site.brand_search_volume > 0,
		weight: 6,
		label: 'Brand search volume tracked',
		fix: "Your brand isn't being searched for enough. Focus on activities that build name recognition."
	},
	third_party_reviews_linked: {
		check: (site) => site.has_review_links || site.has_aggregate_rating_schema,
		weight: 8,
		label: 'Third-party reviews present or linked',
		fix: 'Link to your Google reviews or embed a review widget. Third-party reviews are a trust signal.'
	},

	// TRUSTWORTHINESS
	contact_page_exists: {
		check: (site) => site.pages.some((p) => p.url.includes('/contact')),
		weight: 6,
		label: 'Contact page with real contact methods',
		fix: 'Add a contact page with a phone number, email, or address — not just a form.'
	},
	privacy_policy_exists: {
		check: (site) => site.pages.some((p) => p.url.includes('/privacy')),
		weight: 5,
		label: 'Privacy policy and Terms of Service',
		fix: 'Add a privacy policy page. Google uses this as a basic trustworthiness signal.'
	},
	ssl_enforced: {
		check: (site) => site.base_url.startsWith('https'),
		weight: 5,
		label: 'SSL certificate (https://)',
		fix: 'Your site is not using HTTPS. This is a direct ranking factor and a basic trust requirement.'
	},
	citations_to_sources: {
		check: (page) => page.has_external_authority_link,
		weight: 4,
		label: 'Citations to authoritative external sources',
		fix: 'Link to at least one high-authority external source relevant to your topic.'
	}
};
```

**Database change:**

```sql
ALTER TABLE projects ADD COLUMN eeat_score integer DEFAULT 0;
ALTER TABLE projects ADD COLUMN eeat_checklist jsonb;
-- { evaluated_at, score, max_score, items: { [key]: { status, evidence } } }
```

**UI:** New tab in Technical SEO screen — "Trust & Authority". Displays scored checklist with pass/fail per item. Each failing item has one plain-English fix. Not collapsed — this is primary content.

**Build tier:** V1.

---

### V1.2. Nine Silent Dilution Problems — Detection and Warnings

Each of these needs detection logic and a plain-English warning. Currently the research grounding is in the spec but the detection and UI are missing or wrong-direction.

#### V1.2a. Keyword Cannibalization Detection

**What it is:** Two or more pages in the same project targeting the same or near-identical keywords, splitting Navboost signals between them.

**Research grounding:** Dissertation section 5.1, master ranking formula — Navboost signals accumulate per URL per query. Splitting dilutes both.

**Detection:**

```javascript
function detectKeywordCannibalization(project) {
	const pages = project.pages;
	const keywordMap = {};

	pages.forEach((page) => {
		const kw = normalizeKeyword(page.target_keyword);
		if (!keywordMap[kw]) keywordMap[kw] = [];
		keywordMap[kw].push(page);
	});

	const conflicts = Object.entries(keywordMap)
		.filter(([kw, pages]) => pages.length > 1)
		.map(([kw, pages]) => ({
			keyword: kw,
			pages: pages.map((p) => ({ title: p.title, url: p.published_url, type: p.page_type }))
		}));

	return conflicts;
}

function normalizeKeyword(keyword) {
	// Normalize plurals, stop words, order variations
	return keyword
		.toLowerCase()
		.replace(/\b(the|a|an|and|or|for|to|in|of|on|with)\b/g, '')
		.replace(/s\b/g, '') // basic plural normalization
		.split(' ')
		.sort()
		.join(' ')
		.trim();
}
```

**Plain-English output:**

> "2 of your pages are competing for the same keyword — 'drain cleaning cost' is the target on both your pricing page and this article. Google is splitting its ranking signals between them. Consolidate these into one page or differentiate their keywords clearly."

**Where it fires:** Cluster detail view (cluster intelligence layer) and Strategy screen when adding a new page keyword.

**Build tier:** V1.

---

#### V1.2b. H2 Contamination Penalty — UPSA Scoring Fix

**What it is:** The current UPSA awards points for passage-ready H2s (additive). The research shows weak H2s actively degrade the overall passage score for the page (penalizing). The scoring direction is wrong.

**Research grounding:** Passage scoring patents US9940367B1 and US9959315B1 — heading vectors evaluated as a coherent path. Weak H2s contaminate the path signal, they don't just score zero.

**What to change in UPSA Module 3:**

```javascript
// CURRENT (wrong — additive only):
const passageReadyH2s = h2s.filter((h2) => isPassageReadyH2(h2)).length;
score += passageReadyH2s * 2; // awards points per good H2

// CORRECTED (bidirectional — rewards good, penalizes contamination):
const totalH2s = h2s.length;
const passageReadyH2s = h2s.filter((h2) => isPassageReadyH2(h2)).length;
const vagueH2s = totalH2s - passageReadyH2s;
const passageReadyRatio = totalH2s > 0 ? passageReadyH2s / totalH2s : 0;

if (passageReadyRatio >= 0.8) {
	score += 10; // all or nearly all H2s are answerable questions — strong signal
} else if (passageReadyRatio >= 0.5) {
	score += 5; // majority are good — acceptable
} else if (passageReadyRatio >= 0.3) {
	score += 0; // mixed — neutral
} else {
	score -= 5; // majority are vague labels — contamination penalty
}
```

**Plain-English output (penalty state):**

> "{vagueH2s} of your {totalH2s} H2s are vague labels like 'Our Services' or 'Why Choose Us'. These are weakening your page's passage scoring — not just those sections but the whole page. Rewrite all H2s as specific answerable questions."

**Build tier:** V1 (scoring fix, not a new feature).

---

#### V1.2c. IGS Domain-Level Consequence Warning

**What it is:** The current IGS check is per-page only (UPSA +15 pts). The research shows low-IGS pages degrade the domain-level GroupModificationFactor via Panda (US8682892B1). This domain-level consequence is not captured anywhere.

**Two additions needed:**

**1. Pre-generation warning:**

```javascript
// Fire before article generation when IGS opportunity field is empty
// or when SERP analysis shows no obvious IGS gap

if (!brief.igs_opportunity || brief.igs_opportunity === '') {
	showPreGenerationWarning({
		message: `To protect your site's overall quality score, this article needs 
              at least one original element that competitors don't have. 
              Without it, this article may gradually lower Google's quality 
              rating for your entire site — not just this page.`,
		prompt: 'What original insight, data, or experience can you add?',
		field: 'igs_opportunity',
		required: false, // user can dismiss but warning is strong
		icon: '⚠️'
	});
}
```

**2. Site-level IGS health indicator:**

```javascript
// In technical audit or dashboard
function calculateSiteIGSHealth(project) {
	const pages = project.pages.filter((p) => p.status === 'published');
	const lowIGSPages = pages.filter((p) => p.igs_score < 5); // below threshold
	const ratio = lowIGSPages.length / pages.length;

	if (ratio > 0.5) {
		return {
			status: 'critical',
			message: `More than half your published pages have low originality scores. 
                This is gradually suppressing your site's overall quality rating 
                in Google's algorithm — affecting even your best pages. 
                Add original data, insights, or first-hand experience to 
                your existing content.`,
			affected_count: lowIGSPages.length
		};
	}
	// ... amber and green states
}
```

**Build tier:** V1.

---

#### V1.2d. Topical Dilution — Off-Topic Content Warning

**What it is:** Content that is significantly outside the project's established niche dilutes topical authority. Google pre-classifies sites topically — off-topic content creates signal confusion.

**Research grounding:** Dissertation section 5.1, US9135307B1 alternative query replacement patent — if threshold percentage of site content is off-topic, Google swaps the site out of SERPs for affected queries.

**Detection approach:**

```javascript
// At strategy/topic selection — when user adds a new topic or keyword
function detectTopicalDilution(newKeyword, project) {
	// Use the project's established niche (projects.niche field)
	// and existing keyword portfolio as the reference

	// Simple heuristic: check if new keyword shares entities with
	// the project's top 5 existing topics
	const existingEntities = extractTopicEntities(project.pages.map((p) => p.target_keyword));
	const newEntities = extractTopicEntities([newKeyword]);
	const overlap = calculateEntityOverlap(existingEntities, newEntities);

	// Flag if less than 20% entity overlap with existing content
	if (overlap < 0.2 && project.pages.length >= 5) {
		return {
			type: 'topical_dilution_risk',
			severity: 'medium',
			message: `This topic is outside your established subject area. 
                Publishing content that's unrelated to your core niche 
                can reduce Google's confidence in your expertise and 
                dilute the topical authority you've built.`,
			action:
				'Are you sure you want to add this topic? Consider whether it fits your content strategy.',
			confirmable: true // user can proceed but must acknowledge
		};
	}
	return null;
}
```

**Where it fires:** Strategy screen when adding a new keyword/topic. Amber warning — not a blocker, but requires acknowledgment.

**Build tier:** V1.

---

#### V1.2e. Keyword Density Penalty — UPSA and Audit Fix

**What it is:** The UPSA awards points for keyword presence but never penalizes for over-presence. The generation prompt correctly caps density at 3%, but existing pages brought into Sharkly are not checked for over-density.

**Research grounding:** Dissertation section 4.1 — BERT embedding distortion above ~2-3% keyword density. The vectors stop aligning with the query. The page that was ranking drops.

**UPSA change:**

```javascript
// In UPSA keyword density check — replace one-directional check
function scoreKeywordDensity(content, keyword) {
	const wordCount = content.split(/\s+/).length;
	const keywordCount = countKeywordOccurrences(content, keyword);
	const density = (keywordCount / wordCount) * 100;

	if (density < 0.5)
		return {
			score: 0,
			status: 'too_low',
			message: 'Keyword appears too rarely — add natural mentions.'
		};
	if (density >= 0.5 && density <= 2.0)
		return { score: 10, status: 'optimal', message: 'Keyword density is in the optimal range.' };
	if (density > 2.0 && density <= 3.0)
		return {
			score: 5,
			status: 'slightly_high',
			message: 'Keyword density is slightly high — consider reducing.'
		};
	if (density > 3.0)
		return {
			score: -5,
			status: 'penalty_risk',
			message: `Keyword appears ${keywordCount} times in ${wordCount} words (${density.toFixed(1)}%). 
              This is above the natural threshold and is likely hurting your ranking. 
              Remove ${Math.ceil(keywordCount - wordCount * 0.02)} instances.`
		};
}
```

**Technical audit issue type to add:**

```javascript
{
  type: 'keyword_stuffing',
  severity: 'high',
  label: 'Keyword appears too many times',
  description: 'Keyword density above 3% distorts how Google reads this page semantically.'
}
```

**Build tier:** V1 (scoring fix + audit issue type).

---

#### V1.2f. Brand Search Ratio — Corrected Framing

**What it is:** The Brand Search Panel currently frames this as "grow your brand search." The research frames it as a ratio — backlinks growing faster than branded searches is itself a negative signal (artificial link building pattern), not just a missed opportunity.

**Research grounding:** US8682892B1 — IndependentLinks / ReferenceQueries = GroupModificationFactor. The healthy pattern is both growing together.

**What to change in the Brand Search Panel:**

Add a ratio indicator and a specific warning when links outpace branded searches:

```javascript
function evaluateBrandSearchRatio(backlink_growth_rate, brand_search_growth_rate) {
	const ratio = backlink_growth_rate / Math.max(brand_search_growth_rate, 1);

	if (ratio > 3) {
		return {
			status: 'warning',
			message: `Your backlink count is growing much faster than your brand 
                search volume. Google uses this ratio as a quality signal — 
                when links grow much faster than brand recognition, it looks 
                like artificial link building rather than genuine authority.
                
                Focus on activities that grow both simultaneously: 
                press mentions, podcast appearances, social presence, 
                community involvement.`
		};
	}
	if (ratio > 1.5) {
		return {
			status: 'amber',
			message: 'Links growing faster than brand recognition — monitor this.'
		};
	}
	return { status: 'healthy', message: 'Link growth and brand recognition are growing together.' };
}
```

**Build tier:** V1 (correction to existing feature, not new build).

---

#### V1.2g. Crawl Budget Waste — Thin Page Detection

**What it is:** Low-value auto-generated pages (tag pages, author archives, empty category pages, paginated archives, parameter duplicates) consuming crawl budget that should be reserved for content pages.

**Research grounding:** Dissertation section 1.3 crawling pipeline. Crawl budget is finite — wasted crawls mean content pages get re-evaluated slowly.

**Detection (crawl audit):**

```javascript
function detectCrawlBudgetWaste(crawlResults) {
	const issues = [];

	// Tag pages
	const tagPages = crawlResults.pages.filter(
		(p) => p.url.match(/\/tag\/|\/tags\//) && p.word_count < 300
	);
	if (tagPages.length > 5) {
		issues.push({
			type: 'thin_tag_pages',
			count: tagPages.length,
			severity: 'high',
			message: `Your site has ${tagPages.length} tag pages with no unique content. 
                These are consuming crawl budget that should go to your real content. 
                Set these to noindex.`,
			fix: 'Add <meta name="robots" content="noindex"> to all tag pages, or block them in robots.txt'
		});
	}

	// Author archive pages
	const authorPages = crawlResults.pages.filter((p) => p.url.match(/\/author\//));
	if (authorPages.length > 3) {
		issues.push({
			type: 'author_archive_pages',
			count: authorPages.length,
			severity: 'medium',
			message: `${authorPages.length} author archive pages detected. Unless these have unique content, set them to noindex.`
		});
	}

	// Paginated archive pages
	const paginatedPages = crawlResults.pages.filter((p) => p.url.match(/[?&]page=\d+|\/page\/\d+/));
	if (paginatedPages.length > 10) {
		issues.push({
			type: 'pagination_waste',
			count: paginatedPages.length,
			severity: 'medium',
			message: `${paginatedPages.length} paginated archive pages detected. Canonicalize these to the root category page.`
		});
	}

	// URL parameter duplicates
	const paramPages = crawlResults.pages.filter((p) => p.url.includes('?') && !p.has_canonical);
	if (paramPages.length > 5) {
		issues.push({
			type: 'parameter_duplicates',
			count: paramPages.length,
			severity: 'high',
			message: `${paramPages.length} URL parameter variations without canonical tags. These create duplicate content that wastes crawl budget.`
		});
	}

	return issues;
}
```

**Technical audit issue types to add:**
`thin_tag_pages`, `author_archive_pages`, `pagination_waste`, `parameter_duplicates`

**Build tier:** V1.

---

### V1.3. Technical Audit Depth Additions

These are all missing from the current technical audit spec. Each is a distinct issue type that needs detection logic and a plain-English recommendation.

#### V1.3a. Redirect Chain Depth Detection

**Research grounding:** Research specifies "no redirect chains longer than 2 hops." Each hop loses equity and adds latency. Issue type exists in spec — detection function does not.

```javascript
function detectRedirectChains(crawlResults) {
	const longChains = [];

	crawlResults.pages.forEach((page) => {
		if (page.redirect_chain && page.redirect_chain.length > 2) {
			longChains.push({
				start_url: page.redirect_chain[0],
				end_url: page.url,
				hops: page.redirect_chain.length,
				chain: page.redirect_chain
			});
		}
	});

	return longChains.map((chain) => ({
		type: 'redirect_chain_too_long',
		severity: chain.hops > 4 ? 'high' : 'medium',
		message: `A redirect chain of ${chain.hops} hops was found from ${chain.start_url}. 
              Each redirect hop loses ranking power and slows page load. 
              Shorten this to a direct redirect.`,
		fix: `Update the redirect at ${chain.start_url} to point directly to ${chain.end_url}`
	}));
}
```

**Build tier:** V1.

---

#### V1.3b. Mobile-First Indexing Check

**Research grounding:** Google crawls mobile version of pages. Pages that break on mobile are indexed in broken form.

**What to check:**

- Viewport meta tag present
- Content not hidden behind mobile-specific CSS that removes it entirely
- Touch targets not too small (buttons/links < 44px)
- Text not too small to read on mobile (< 16px base font)
- No horizontal scroll on mobile viewport

**Issue types to add:** `missing_viewport_meta`, `mobile_content_hidden`, `small_touch_targets`, `horizontal_scroll_mobile`

**Plain-English output:**

> "Your page doesn't have a proper mobile setup. Google uses the mobile version of your page to decide how it ranks — if mobile is broken, your rankings will be too."

**Build tier:** V1.

---

#### V1.3c. Duplicate Title Tags and Meta Descriptions — Sitewide

**Research grounding:** Duplicate title tags across pages create entity disambiguation problems and split Navboost signals between competing pages.

```javascript
function detectDuplicateTitles(crawlResults) {
	const titleMap = {};

	crawlResults.pages.forEach((page) => {
		if (!titleMap[page.title_tag]) titleMap[page.title_tag] = [];
		titleMap[page.title_tag].push(page.url);
	});

	return Object.entries(titleMap)
		.filter(([title, urls]) => urls.length > 1)
		.map(([title, urls]) => ({
			type: 'duplicate_title_tag',
			severity: 'high',
			title,
			affected_urls: urls,
			message: `${urls.length} pages share the same title tag: "${title}". 
                Google can't tell these pages apart. Each page needs a unique title.`,
			fix: 'Rewrite the title tag on each of these pages to be unique and descriptive.'
		}));
}
```

Same logic for meta descriptions: `duplicate_meta_description` issue type.

**Build tier:** V1.

---

#### V1.3d. Pagination Handling — Canonical Tags on Paginated Pages

**Research grounding:** Ecommerce collection pages with pagination (/products?page=2) generate dozens of near-duplicate URLs competing for the same ranking signals.

```javascript
function detectPaginationIssues(crawlResults) {
	const paginatedPages = crawlResults.pages.filter((p) => p.url.match(/[?&]page=\d+|\/page\/\d+/));

	const missingCanonicals = paginatedPages.filter((p) => !p.canonical_url);

	if (missingCanonicals.length > 0) {
		return {
			type: 'pagination_missing_canonical',
			severity: 'high',
			count: missingCanonicals.length,
			message: `${missingCanonicals.length} paginated pages don't have canonical tags 
                pointing to the root category page. Google is treating these as 
                separate competing pages.`,
			fix: 'Add a canonical tag to each paginated page pointing to the first page (root) of that category.'
		};
	}
}
```

**Build tier:** V1.

---

#### V1.3e. Image Optimization Audit

**Research grounding:** WebP/AVIF format, correct sizing, lazy-load below fold, preload LCP images. These are direct LCP inputs which feed into Navboost via bad-click rates.

**What to check:**

```javascript
function auditImageOptimization(crawlResults) {
	const issues = [];

	crawlResults.pages.forEach((page) => {
		const images = page.images || [];

		// Format check
		const unoptimizedImages = images.filter(
			(img) => img.src.match(/\.(jpg|jpeg|png|gif)$/i) && !img.has_webp_version
		);
		if (unoptimizedImages.length > 0) {
			issues.push({
				type: 'unoptimized_image_format',
				page: page.url,
				count: unoptimizedImages.length,
				message: `${unoptimizedImages.length} images on this page are not in WebP or AVIF format. 
                  Modern image formats are significantly smaller and improve page speed.`
			});
		}

		// LCP image preload check
		const lcpImage = page.lcp_element;
		if (lcpImage?.tagName === 'IMG' && !lcpImage.is_preloaded) {
			issues.push({
				type: 'lcp_image_not_preloaded',
				page: page.url,
				severity: 'high',
				message: `Your page's main image loads too late. Add a preload hint to load it faster — 
                  this directly improves your page speed score.`,
				fix: `Add to <head>: <link rel="preload" as="image" href="${lcpImage.src}">`
			});
		}

		// Above-fold lazy-load check
		const aboveFoldLazyImages = images.filter((img) => img.is_above_fold && img.loading === 'lazy');
		if (aboveFoldLazyImages.length > 0) {
			issues.push({
				type: 'above_fold_lazy_load',
				page: page.url,
				severity: 'high',
				message: `${aboveFoldLazyImages.length} important images near the top of your page 
                  are set to load lazily. Google may not render these correctly. 
                  Remove lazy-loading from images that appear in the first screen.`
			});
		}
	});

	return issues;
}
```

**Build tier:** V1.

---

#### V1.3f. JavaScript Rendering Detection

**Research grounding:** Pages relying on JavaScript for primary content may be indexed incompletely. During the crawl gap, only raw HTML is available. This silently suppresses rankings without any visible error.

**Detection:**

```javascript
async function detectJSRendering(page) {
	// Compare raw HTML crawl with rendered DOM
	const rawHTML = await fetchRawHTML(page.url);
	const renderedDOM = await fetchRenderedDOM(page.url); // headless browser

	const rawTextLength = extractText(rawHTML).length;
	const renderedTextLength = extractText(renderedDOM).length;

	// If rendered content is significantly more than raw HTML,
	// primary content is JS-rendered
	const jsRenderRatio = renderedTextLength / Math.max(rawTextLength, 1);

	if (jsRenderRatio > 2.0 && rawTextLength < 500) {
		return {
			type: 'js_rendered_content',
			severity: 'critical',
			message: `Your page's main content loads via JavaScript. 
                Google may not be reading this page correctly — 
                it can see only ${Math.round(rawTextLength)} characters 
                without JavaScript but ${Math.round(renderedTextLength)} with it.
                
                Use server-side rendering for this page to ensure 
                Google sees all your content.`,
			raw_content_length: rawTextLength,
			rendered_content_length: renderedTextLength
		};
	}
	return null;
}
```

**Build tier:** V1 (requires headless browser capability in crawler — significant technical lift, may slide to V2 based on crawler architecture).

---

#### V1.3g. Intrusive Interstitial Detection

**Research grounding:** Google's Page Experience guidelines penalize popups that block content on mobile — non-legally-required overlays are a direct ranking signal connected to usability.

**Detection heuristic (crawl-time):**

```javascript
function detectIntrusiveInterstitials(page) {
	const overlayElements = page.dom_elements?.filter(
		(el) =>
			el.is_overlay &&
			el.z_index > 100 &&
			el.covers_viewport_percentage > 0.5 &&
			!el.is_cookie_consent && // legally required
			!el.is_age_gate // legally required in some contexts
	);

	if (overlayElements?.length > 0) {
		return {
			type: 'intrusive_interstitial',
			severity: 'medium',
			message: `Your page has a popup that covers most of the screen on mobile. 
                Google penalises these because they make it hard for visitors 
                to access your content. Use a smaller banner or delay 
                the popup until the visitor has read some content.`
		};
	}
}
```

**Build tier:** V1.

---

#### V1.3h. Link Velocity Monitoring

**Research grounding:** US7346839B2 Historical Data patent — sudden spikes in link acquisition rate are formal spam signals. The complete SEO system document specifies "target 3-8 new referring domains per month consistently."

**What to build:**

```javascript
// Requires Moz API or DataForSEO (already in env vars)
function evaluateLinkVelocity(backlinkHistory) {
	// backlinkHistory: array of { month, referring_domain_count }

	const monthlyGrowth = backlinkHistory.map((month, i) => {
		if (i === 0) return 0;
		return month.referring_domain_count - backlinkHistory[i - 1].referring_domain_count;
	});

	const recentMonthGrowth = monthlyGrowth[monthlyGrowth.length - 1];
	const avgHistoricalGrowth =
		monthlyGrowth.slice(0, -1).reduce((a, b) => a + b, 0) / Math.max(monthlyGrowth.length - 1, 1);

	const velocityRatio = recentMonthGrowth / Math.max(avgHistoricalGrowth, 1);

	if (velocityRatio > 5 && recentMonthGrowth > 20) {
		return {
			status: 'spike_warning',
			severity: 'high',
			message: `You gained ${recentMonthGrowth} new referring domains this month 
                after averaging ${Math.round(avgHistoricalGrowth)} per month. 
                Sudden spikes in link acquisition are a formal spam signal 
                in Google's algorithm. If these came from a paid link campaign, 
                this carries penalty risk.`,
			recommendation:
				'Review your recent link sources. If these are from a bulk link purchase, consider disavowing them.'
		};
	}

	if (velocityRatio > 3) {
		return { status: 'elevated', message: 'Link growth is higher than usual — monitor this.' };
	}

	return {
		status: 'healthy',
		message: `Link growth is consistent at ~${Math.round(avgHistoricalGrowth)} new domains per month.`
	};
}
```

**Where it lives:** Technical SEO screen → Backlink section. Trend chart + status indicator.

**Build tier:** V1.

---

### V1.4. EEAT Schema Gaps

These extend the existing schema generation system and do not require new infrastructure.

#### V1.4a. Person Schema — Author on Article Pages

**What it is:** JSON-LD Person schema on article pages with author name, credentials, and sameAs links to professional profiles.

**Research grounding:** Schema markup communicates EEAT signals explicitly to Google's entity system.

**Generation addition:**

```javascript
// Add to schema generation in pages.ts when page_type = 'article' and author_bio exists

const personSchema = {
	'@type': 'Person',
	name: project.author_name || project.business_name,
	description: project.author_bio,
	sameAs: [project.linkedin_url, project.twitter_url].filter(Boolean)
};

// Embed in Article schema as "author"
articleSchema.author = personSchema;
```

**Build tier:** V1 (extends existing schema system).

---

#### V1.4b. AggregateRating Schema

**What it is:** AggregateRating schema on business pages connecting third-party review data to the business entity.

**What to add to project settings:**

```sql
ALTER TABLE projects ADD COLUMN google_review_count integer;
ALTER TABLE projects ADD COLUMN google_average_rating numeric(2,1);
ALTER TABLE projects ADD COLUMN google_place_id text;
```

**Schema output:**

```json
{
	"@type": "LocalBusiness",
	"aggregateRating": {
		"@type": "AggregateRating",
		"ratingValue": "4.8",
		"reviewCount": "127",
		"bestRating": "5"
	}
}
```

**Build tier:** V1.

---

#### V1.4c. sameAs Entity Markup on LocalBusiness Schema

**What it is:** sameAs property linking the business entity to its profiles across the web — GBP, Facebook, LinkedIn, Yelp, Wikidata if available. This is entity disambiguation in Google's Knowledge Graph.

**Project settings to add:**

```sql
ALTER TABLE projects ADD COLUMN gbp_url text;
ALTER TABLE projects ADD COLUMN facebook_url text;
ALTER TABLE projects ADD COLUMN linkedin_url text;
ALTER TABLE projects ADD COLUMN yelp_url text;
ALTER TABLE projects ADD COLUMN wikidata_url text;
```

**Schema output:**

```json
{
	"@type": "LocalBusiness",
	"sameAs": [
		"https://www.google.com/maps/place/...",
		"https://www.facebook.com/businessname",
		"https://www.linkedin.com/company/businessname",
		"https://www.yelp.com/biz/businessname"
	]
}
```

**Plain-English UI prompt:**
"Add your business profiles here. These help Google confirm your business is real and connect all your online presence together."

**Build tier:** V1.

---

#### V1.4d. YMYL Niche Detection — Stricter EEAT Requirements

**What it is:** Detection of YMYL (Your Money or Your Life) niches — law, medical, financial, health — and application of stricter EEAT requirements for those projects.

**Research grounding:** Google applies significantly stricter EEAT to YMYL content. Legal blogs need explicit author credentials. Medical articles need clinical source citations. Financial advice needs regulatory disclaimers.

**Detection:**

```javascript
const YMYL_NICHES = [
	'law',
	'legal',
	'lawyer',
	'attorney',
	'solicitor',
	'medical',
	'health',
	'doctor',
	'physician',
	'dentist',
	'nurse',
	'financial',
	'finance',
	'investment',
	'insurance',
	'mortgage',
	'mental health',
	'therapy',
	'psychology',
	'counselling',
	'pharmacy',
	'medication',
	'drugs',
	'supplements'
];

function isYMYLNiche(niche) {
	return YMYL_NICHES.some((term) => niche.toLowerCase().includes(term));
}

// If YMYL detected:
// 1. Flag in project settings with explanation
// 2. Add stricter EEAT requirements to EEAT checklist
// 3. Add YMYL-specific generation prompt additions:
//    - "Every medical claim must cite a source"
//    - "Include author credentials prominently at article top"
//    - "Add regulatory disclaimer where appropriate"
// 4. Increase UPSA thresholds for authority signals
```

**Build tier:** V1.

---

### V1.5. SEO Decision Tree as a Diagnostic Feature

**What it is:** A guided diagnostic flow for "why isn't this page ranking?" — walks users through the exact sequence of checks from the Complete SEO System document.

**Research grounding:** The Complete SEO System doc has a formal 7-step decision tree. This is the missing diagnostic layer that turns Sharkly from a content tool into an SEO strategist.

**The diagnostic sequence:**

```
Step 1: Is the page indexed?
  → Check: page appears in Google search for site:domain.com/url
  → If NO: Indexation problem (robots.txt, noindex, crawl budget)
  → If YES: Continue

Step 2: Is it ranking at any position?
  → Check: GSC position data
  → If ranking 50+: Content/authority problem — continue
  → If not ranking at all: May be very new or penalised

Step 3: Is keyword intent matched?
  → Check: page_type vs funnel_stage vs SERP intent
  → If mismatch: Funnel mismatch warning fires
  → If matched: Continue

Step 4: Is on-page content competitive?
  → Check: UPSA score vs competitor UPSA estimates
  → If UPSA < 70: Content quality problem — specific UPSA items to fix
  → If UPSA ≥ 70: Continue

Step 5: Is domain authority sufficient?
  → Check: User DA vs median DA of top 5 ranking pages for keyword
  → If gap > 20 DR points: Authority gap — link building required before competing
  → If competitive: Continue

Step 6: Are user behavior signals negative?
  → Check: GSC CTR vs expected CTR for position, bounce signals
  → If CTR low: Title/meta optimization needed
  → If CTR ok: Continue

Step 7: Is GroupModificationFactor suppressed?
  → Check: Brand search ratio, IGS health, toxic links
  → If suppressed: Domain-level quality issue — site-level fixes needed
```

**UI:** "Diagnose This Page" button in workspace. Walks user through each step with current data from GSC + UPSA + audit. Outputs one primary diagnosis and the first action to take.

**Build tier:** V1.

---

### V1.6. Content Refresh Queue

**What it is:** An active workflow for pages where `last_updated_meaningful` is older than 6 months AND rankings are declining. A dedicated "Refresh" action that generates a targeted update brief — different from writing a new article.

**Research grounding:** US7346839B2 Historical Data patent — content update frequency is an explicit scoring dimension. Frequently updated pages get recrawled sooner.

**Detection:**

```javascript
function buildContentRefreshQueue(project) {
	const staleDeclines = project.pages.filter((page) => {
		const monthsStale = monthsSince(page.last_updated_meaningful);
		const isRankingDecline =
			page.gsc_position_trend === 'declining' || page.gsc_impressions_trend === 'declining';
		return monthsStale > 6 && isRankingDecline && page.status === 'published';
	});

	return staleDeclines.sort(
		(a, b) => b.gsc_impressions - a.gsc_impressions // prioritize by traffic impact
	);
}
```

**Refresh brief generation (different from new article brief):**

- Re-run competitor SERP analysis for the target keyword
- Identify what's changed: new competitor pages, new SERP features, new entities
- Generate a targeted update plan: "Add these 3 sections. Update these 2 statistics. Add this new entity."
- Do NOT rewrite the whole article — surgical additions only

**UI:** A "Refresh Queue" section in the Performance screen. Shows stale+declining pages prioritized by traffic. "Generate Refresh Brief" action button.

**Build tier:** V1.

---

## V2 — Add-on tier / significant new capability

### V2.1. Local SEO Module

**What it is:** A complete local SEO feature tier for local service businesses — the largest segment of Sharkly's user base. Currently zero local SEO features exist in any document.

**Research grounding:** Complete SEO System document — three-factor local ranking model: Relevance (35%), Distance (35%), Prominence (30%). Local Pack rankings are often more valuable to small businesses than organic rankings.

**What the module covers:**

**GBP Completeness Score:**

- All fields filled (name, address, phone, hours, categories, description, website)
- Photo count (minimum thresholds by business type)
- Primary and secondary categories correct
- Business description uses target keywords naturally
- Products/services listed

**NAP Consistency Check:**

- Business Name, Address, Phone identical across: GBP, website, Yelp, Facebook, industry directories
- Flag any inconsistencies — NAP mismatch suppresses Local Pack rankings

**Review Velocity Tracking:**

- Current review count and average rating
- Monthly review acquisition rate
- Target: 1-3 new reviews per week
- Response rate to reviews (100% response = prominence signal)
- Review request email template (already in System 2 CRO — connect here)

**LocalBusiness Schema Validation:**

- All required fields present
- sameAs connections complete
- AggregateRating populated

**Local Keyword Entity Detection:**

- City names, neighbourhoods, service areas present in content
- "[Service] + [City]" pattern in title and H1

**Local Pack Ranking Tracker:**

- Position in Local Pack for target keywords
- GeoGrid visibility map (showing rankings across the service area)

**This is potentially "Sharkly Local" — a distinct product positioning or add-on tier.** The research is fully developed in the Complete SEO System document. The market is large, underserved by existing tools, and the primary Sharkly user is a local service business.

**Build tier:** V2.

---

### V2.2. Competitor Backlink Gap Analysis

**What it is:** Identify domains linking to 2+ competitors but not to the user — pre-qualified link targets.

**Research grounding:** Complete SEO System document — "Export backlink profiles of top 3-5 competitors. Identify domains linking to 2+ competitors but not to you."

**What to build:**

- Pull competitor backlink profiles via DataForSEO or Moz (already in env vars)
- Find domains linking to 2+ competitors but not to user's domain
- Score by: relevance to niche, DA, link type (editorial vs directory)
- Export as prioritised outreach list
- Plain-English output: "These 12 sites link to your top 3 competitors but not to you. They're pre-qualified — they've already shown interest in your niche."

**Build tier:** V2.

---

### V2.3. Toxic Link Detection and Disavow Guidance

**What it is:** Detection of spam domains, link farms, and PBNs in the user's backlink profile, with guidance on building a Google disavow file.

**Research grounding:** Complete SEO System document — "identify and disavow spam domains, link farms, PBNs quarterly."

**Detection signals:** Low DA + high spam score + irrelevant niche + many outbound links + no real content + exact-match anchor patterns.

**What to build:**

- Backlink quality audit — score each referring domain
- Flag toxic links with explanation of why
- Generate disavow file in Google's format
- Plain-English: "These 8 links are from low-quality sites and may be hurting your authority score. We've prepared a disavow file — submit this to Google Search Console."

**Build tier:** V2.

---

### V2.4. Digital PR / Linkable Asset Strategy

**What it is:** Guidance on which content types attract the most links, integrated into the content strategy phase.

**Research grounding:** Complete SEO System document — linkable asset types ranked by IGS value and link acquisition potential. Original survey data, expert roundups, interactive tools, proprietary case studies score highest on both IGS and link attractiveness.

**What to build:**

- Content type classifier in the strategy phase — identifies which planned topics could be elevated to linkable assets
- Suggested format: "This topic would work well as original research or a data study — content like this earns 10-50x more links than a standard article."
- Link acquisition potential score per topic

**Build tier:** V2.

---

### V2.5. Competitor DR Gap Diagnosis

**What it is:** Surface the DR gap between the user's domain and the median DR of pages ranking for their target keyword. Tell users when the gap is too large to compete with content alone.

**Research grounding:** Complete SEO System decision tree — "if 20+ DR points below median, you need more links before competing."

**What to build:**

```javascript
function evaluateDRGap(userDA, competitorDAs, keyword) {
	const medianCompetitorDA = median(competitorDAs);
	const gap = medianCompetitorDA - userDA;

	if (gap > 20) {
		return {
			status: 'authority_gap',
			message: `Your domain authority (${userDA}) is ${gap} points below the average 
                page ranking for "${keyword}" (${medianCompetitorDA}). 
                Publishing more content alone won't get you there — you need 
                more external links pointing to your site before you can 
                compete for this keyword.`,
			recommendation:
				'Focus on link building for 3-6 months before targeting this keyword directly.'
		};
	}
}
```

**Where it surfaces:** Brief generation flow — before generating the brief, surface the DR gap if it exists. Also in the keyword research phase.

**Build tier:** V2.

---

## V3 — Strategic / Advanced features

### V3.1. Site-Level Architectural Intelligence

**What it is:** Beyond cluster-level — looking at the whole site as a system.

**Capabilities:**

- How clusters relate to each other (which clusters link to which)
- Where equity flows across the whole site
- Which clusters are feeding which money pages
- Site-wide topical authority coverage vs gaps
- Full funnel map: awareness clusters → consideration clusters → conversion pages

**Note on data model:** The data model must support this from V1 even if the feature ships in V3. Clusters need a `parent_cluster_id` or equivalent to express inter-cluster relationships.

**Build tier:** V3.

---

### V3.2. Wikipedia / Wikidata Entity Guidance

**What it is:** Guidance for establishing the business entity in Wikidata — formally establishing it in Google's Knowledge Graph. This directly improves the GroupModificationFactor.

**Not a feature Sharkly can automate** — but it should be in the off-page guidance as a recommended action with step-by-step instructions.

**Where it surfaces:** EEAT checklist item — "Your business is not established in Wikidata. This is an advanced trust signal that formally tells Google your business exists. Here's how to do it."

**Build tier:** V3.

---

### V3.3. Review Acquisition as a Product Feature (for Local SEO)

**What it is:** A review acquisition workflow — templates for requesting reviews from customers, tracking review velocity, monitoring review responses.

**Research grounding:** Review velocity as a Prominence sub-factor in local rankings (0.25 weight). Responding to every review within 48 hours is explicitly a ranking signal.

**Build tier:** V3 (local SEO module must exist first — V2).

---

### V3.4. Link Insertion / Niche Edit Strategy Guidance

**What it is:** Guidance on reaching out to existing indexed articles to request contextual link additions — the 30% allocation of the link building budget with the highest equity return because the source content is already indexed and trusted.

**Build tier:** V3.

---

### V3.5. Keyword Velocity Progression Roadmap

**What it is:** A full progression roadmap showing the user's current keyword velocity tier, what they need to reach the next tier, and a projected timeline.

**Research grounding:** Complete SEO System — Month 1-3, Month 3-6, Month 6-12, Month 12+ progression. The growth stage detection function exists but only classifies the current tier, not the path forward.

**Build tier:** V3.

---

## ONGOING — UI/Copy decisions, not features

### O1. Laws of SEO as Contextual Education

**What it is:** The 8 Laws of SEO from the Complete SEO System document surfaced at the right moments in the product — not as a glossary but as contextual education when users encounter those features.

Examples:

- Law 6 (Behaviour Confirms Authority) appears when user views Navboost signals in GSC integration
- Law 8 (Brand Search Is Algorithmic) appears in the Brand Search Panel tooltip
- Law 3 (Intent Precedes Relevance) appears in the page type classifier tooltip

**Build tier:** Ongoing — add to UI as features are built.

---

### O2. AI Detection Education Tooltip

Already documented in B2 above.

---

### O3. Publishing Cadence Guidance

**What it is:** A recommended publishing cadence based on the user's growth stage and topical authority level. Track whether users are hitting it — not just for topical authority but for crawl frequency (US7346839B2).

**Build tier:** V1 — simple display recommendation, no complex detection needed.

---

## Summary — Gap Count by Tier

| Tier    | Count | Description                                                                                                         |
| ------- | ----- | ------------------------------------------------------------------------------------------------------------------- |
| Beta    | 3     | Author/EEAT field, AI detection tooltip, URL slug warning                                                           |
| V1      | 18    | Nine dilution fixes, technical audit depth, EEAT checklist, schema gaps, YMYL, decision tree, content refresh queue |
| V2      | 5     | Local SEO module, backlink gap analysis, toxic links, digital PR strategy, DR gap diagnosis                         |
| V3      | 5     | Site-level intelligence, Wikidata, review acquisition, link insertion strategy, velocity roadmap                    |
| Ongoing | 3     | Laws of SEO education, AI tooltip, publishing cadence                                                               |

**Total new items to build:** 34

**The three categories that are systematically missing from the current spec:**

1. Off-page signals — link velocity, backlink gaps, toxic links, DR gap diagnosis
2. Technical SEO depth — JS rendering, lazy-load, redirect chains, image optimization, pagination, mobile-first, duplicate site-wide tags
3. Diagnostic and strategic features — the decision tree, content refresh queue, keyword velocity progression, linkable asset strategy

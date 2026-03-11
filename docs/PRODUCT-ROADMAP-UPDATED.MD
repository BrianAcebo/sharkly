# ⛔ DEPRECATED — DO NOT USE FOR BUILDING

**This file is the old spec-format roadmap. It has been superseded.**
**Use `PRODUCT-ROADMAP.md` instead — that file has the correct build sequence, the confirmed-built list, and the START HERE marker.**

This file is kept for patent notes and technical reference only. Do not treat any checkbox in this file as a build task.

---

# Sharkly Product Roadmap

# AI SEO Strategist — "Shark Engine Optimization"

# Last Updated: 2026 — Patent-Grounded Edition

# Algorithm grounding: 9 confirmed Google patents · DOJ antitrust trial evidence

# Core patents driving feature design:

# US8682892B1 + US10055467B1 (Panda — group modification factor + behavioral layer)

# US9135307B1 (alternative query replacement — domain quality pre-classification)

# US8117209B1 (Reasonable Surfer — link equity by click probability)

# US8595225B1 (Navboost — topic-specific behavioral ranking, DOJ confirmed)

# US7346839B2 (Historical Data — Sandbox, inception date, link velocity)

# US9940367B1 + US9959315B1 (Passage Scoring — H2 as context vectors)

# US20190155948A1 (Information Gain — IGS, anti-Skyscraper mechanism)

---

## HOW TO USE THIS FILE

This is the single source of truth for every feature Sharkly needs to build.
Every feature is assigned to a phase and a category.
When building in Cursor, reference this file to understand scope, priority,
and how features relate to each other.

Phase definitions:

- **Launch** — Everything shipping on day one. Must work completely and correctly. This is the full product — not an MVP. Includes all new spec features from the design sessions.
- **Post-Launch** — Features added in the weeks/months after launch. Mostly retention depth, automation, and CRO Studio add-on.
- **V2** — Competitive intelligence, link analysis, new integrations, and agency features.
- **V3** — Revenue attribution, autonomous features, and platform maturity.

**Spec documents that feed into this roadmap:**

- `system-1-cro-layer.md` — System 1 CRO checklist build spec
- `system-2-cro-product.md` — CRO Studio (System 2) build spec
- `cluster-intelligence-layer.md` — 7-warning cluster audit system
- `funnel-visualizer.md` — Customer journey map UI spec
- `cro-studio.md` — CRO Studio product space spec
- `architecture-b-downstream-product-page.md` — Destination page data model
- `reverse-silo-architecture.md` — Linking architecture + nav/footer dilution
- `product-gaps-master.md` — 34-item gap register

---

## CATEGORIES

1. Onboarding & Setup
2. Topic Strategy Engine
3. Content Engine
4. Cluster Management
5. Cluster Intelligence Layer (NEW)
6. Customer Journey Map / Funnel Visualizer (NEW)
7. Performance & Analytics
8. Technical SEO
9. CRO — System 1 (NEW)
10. CRO — System 2 / CRO Studio (NEW — Post-Launch)
11. Integrations
12. Credit & Billing System
13. Agency & White-Label
14. AI Intelligence Layer
15. Settings & Brand Voice
16. Shopify App Store Compliance

---

---

## CATEGORY 1 — ONBOARDING & SETUP

---

### Launch

- [ ] **Site URL input and validation**
      Accept any URL. Strip trailing slashes. Validate format. Show error if unreachable.

- [ ] **Business profile setup**
      Fields: business name, what they sell/offer, platform (Shopify/WooCommerce/WordPress/
      Webflow/Custom/Other), customer description (free text).

- [ ] **Competitor URL input**
      Accept up to 3 competitor URLs. Minimum 1 required. Validate format.

- [ ] **Onboarding loading sequence**
      Animated step-by-step progress list (not a spinner). Steps:
      scanning website → checking site health → analyzing competitors →
      finding keyword opportunities → building strategy.
      Each step completes sequentially with real API calls behind it.

- [ ] **Domain Authority estimation**
      On onboarding, estimate DA using available signals (backlink count, age, GSC data if
      connected). Store as da field on project. Used throughout for authority fit classification.

- [ ] **Onboarding completion state**
      Summary screen showing: keywords found, competitors analyzed, quick wins identified.
      CTA to view strategy.

- [ ] **Project creation in Supabase**
      On onboarding complete: create project record, save competitors, trigger topic
      strategy generation, save topics, mark onboarding_complete = true on profile.

### Launch

- [ ] **Multi-project support**
      Users can create multiple projects (sites) under one account.
      Project switcher in sidebar. No limit on number of projects (all tiers).

- [ ] **Project dashboard overview**
      Landing screen when user has multiple projects. Shows each site with:
      active cluster, last activity, credit usage per project, quick health score.

- [ ] **Edit project details**
      Allow user to update business name, niche, customer description, platform.
      Changing URL triggers re-audit option.

- [ ] **Re-audit option**
      Button in project settings to re-run the full site scan and refresh competitor data.
      Costs 10 credits.

- [ ] **Strategy keywords view**
      Toggle on the strategy page between Topics view (default) and Keywords view.
      Keywords view shows every keyword across all clusters in one flat table.
      Columns: keyword, cluster, article title, monthly searches (with plain label),
      difficulty (Easy/Medium/Hard), buyer intent (Informational/Commercial/High buyer intent),
      funnel stage.
      Sorted by cluster so keywords group naturally.
      This is a proof-of-work display — shows the user the full scope of research
      behind their strategy. Not interactive beyond filtering and sorting.
      Filter pills: All Clusters, by individual cluster name, by funnel stage.

- [ ] **Keyword lookup modal**
      Embedded in strategy keywords view and cluster detail content list.
      Triggered by "Research a keyword" input.
      Costs 5 credits per lookup (one Serper.dev call + Haiku classification).
      Returns a clean metrics card showing:
  - Monthly searches — visual bar + plain label (Niche / Steady / Popular / High Traffic)
  - Difficulty — Easy to rank / Takes time / Very competitive (color coded, number underneath)
  - Buyer intent — Informational / Commercial / High buyer intent (based on CPC)
  - Authority fit — Ready Now / Build Toward / Not Yet (based on user's DA)
    Below the card: 6-8 related keyword suggestions as clickable pills.
    Each pill shows a mini difficulty color indicator.
    Actions: "Add to Strategy" or "Add to Current Cluster" with one click.
    No separate page — modal only, contextual to where user already is.

### V2

- [ ] **Onboarding for Shopify stores**
      When platform = Shopify and integration is connected: auto-pull store name,
      products, collections, and existing blog posts during onboarding.
      Pre-populate strategy with product and collection keyword opportunities.

- [ ] **Niche template library**
      Pre-built strategy templates for common niches (ecommerce, local service, SaaS,
      law, medical, real estate). Auto-suggest based on business description.
      User can apply template as starting point for their strategy.

---

---

## CATEGORY 2 — TOPIC STRATEGY ENGINE

---

### Launch

- [ ] **AI topic generation**
      Using Claude Haiku 4.5. Input: project data, competitor URLs, niche.
      Output: list of 15-25 topic opportunities, each with:
      title, target keyword, estimated volume, keyword difficulty, CPC,
      funnel stage (tofu/mofu/bofu), authority fit (achievable/buildToward/locked),
      AI reasoning (plain English explanation of why this topic).
      Cost: 15 credits.

- [ ] **Authority fit classification**
      Every keyword classified relative to the site's current DA:
  - Achievable Now: KD within DA range, realistic to rank
  - Build Toward: KD 10-20 points above current DA, target in 3-6 months
  - Authority Locked: KD significantly above DA, revisit later
    Classification logic uses DA + KD + competitor domain strength.

    PATENT NOTE [US8682892B1 + US10055467B1]: The threshold gate mechanism
    is real and patent-confirmed. The GroupModificationFactor multiplier is only
    applied when a page's InitialScore exceeds a minimum threshold. This is why
    "Authority Locked" is not just a difficulty label — below-threshold pages on
    new domains receive NO domain-authority multiplier regardless of content quality.
    Authority Fit classification must reflect this: a new domain competing for head
    terms is not just "harder" — the algorithm literally withholds the multiplier.

- [ ] **Topic priority ordering**
      Default order: achievable topics first, sorted by (business value score × traffic
      potential) / difficulty. User can drag to reorder.

      PATENT NOTE [US7346839B2 + US8682892B1 + US10055467B1]:
      Topic priority must reflect keyword velocity tier logic — the patent-confirmed
      sequence of which keywords a domain can realistically compete for based on
      where it is in its trust accumulation timeline:

      PHASE 1 (Months 1-3, <500 searches/mo):
        Mechanism gating access: US7346839B2 inception date.
        Domain has zero trust history. Target only long-tail, low-competition terms.

      PHASE 2 (Months 3-6, 500-2,000/mo):
        Mechanism gating access: US8682892B1 reference query baseline forming.
        Can begin targeting moderate-volume terms as brand searches accumulate.

      PHASE 3 (Months 6-12, 2,000-10,000/mo):
        Mechanism gating access: US10055467B1 behavioral multiplier begins applying.
        With 5-10 referring domains/month and real behavioral signals, mid-volume
        keywords become viable.

      PHASE 4 (Month 12+, 10,000+/mo head terms):
        Mechanism gating access: US8682892B1 full group modification factor.
        Requires DR 30+, 50+ referring domains, consistent organic traffic.

      The UI should show which tier the user is currently in, which keywords are
      appropriate for this phase, and what specific conditions must be met before
      moving to the next tier.

- [ ] **Topic list display**
      Table view with columns: priority, topic, funnel tag, volume, KD, CPC,
      authority fit badge, action button.
      AI reasoning shown below topic title in muted text.

- [ ] **Topic filter pills**
      Filter by: All, Achievable Now, Build Toward, BoFu, MoFu, ToFu, Quick Wins.
      Quick Wins = achievable + KD under 20 + bofu or mofu.

- [ ] **Regenerate strategy**
      Re-run topic generation with updated competitor data. Costs 15 credits.
      Preserves user's manual ordering for topics they've already started.

### Launch

- [ ] **Add topic manually**
      User can type any keyword to add as a topic. System runs SERP analysis (5 credits),
      classifies authority fit, and inserts into priority list.

- [ ] **Topic status tracking**
      Statuses: queued, active (cluster exists), complete (all content published), locked.
      Visual status indicators throughout the strategy table.

- [ ] **Keyword volume refresh**
      Refresh volume and KD data for existing topics on demand. Costs 2 credits per topic.
      Auto-refresh monthly for active topics.

- [ ] **Seasonal opportunity detection**
      Flag topics that have seasonal volume spikes. Show "peaks in November" type labels.
      Surface seasonal topics 6-8 weeks before their peak month.

### V2

- [ ] **Content gap analysis vs competitors**
      Identify keywords competitors rank for that the user does not have content for.
      Surface as "Gap Opportunities" section at top of strategy page.
      Costs 10 credits to run. Powered by Serper.dev + Haiku analysis.

      PATENT NOTE [US20190155948A1]: Content gap analysis must include an
      IGS dimension, not just a keyword dimension. There are two types of gaps:
      (1) TOPIC GAPS: keywords competitors rank for that you have no content for
      (2) INFORMATION GAIN GAPS: topics you have content for, but your content
          adds nothing the user hasn't seen in competitor pages
      Type 2 gaps are often more urgent — you're already spending crawl budget on
      pages that can't win. Surface both gap types with different priority labels.

- [ ] **Competitor keyword steal**
      Show user which competitor pages are ranking for achievable keywords.
      "Your competitor ranks #4 for this with a 600-word article. You can beat it."
      Actionable recommendations with one-click cluster creation.

- [ ] **Product schema validation** (ecommerce)
      Validate schema markup on product and collection pages specifically.
      Check for: missing price, availability, reviews, brand fields.
      Flag errors that could prevent rich results in Google Shopping.

- [ ] **AI comparison table generator**
      Generate "X vs Y" or "Best X for Y" style content — high-converting MoFu format.
      Auto-structured with comparison table, pros/cons, and recommendation section.
      These pages convert extremely well for BoFu traffic.
      Cost: 25 credits.

- [ ] **Revenue-aligned keyword scoring**
      Weight keyword priority by CPC (proxy for buyer intent) and funnel stage.
      BoFu high-CPC keywords get boosted score regardless of volume.
      Toggle between traffic-optimized and revenue-optimized sort order.

- [ ] **Cannibalization detection**
      Identify existing pages on the user's site competing for the same keyword.
      Flag in strategy: "You already have content targeting this — optimize instead of create."

- [ ] **Visual authority map**
      Visual chart showing current DA, achievable keywords cluster, build-toward cluster,
      and locked cluster. Shows user their growth trajectory visually.
      Updates as DA grows over time.

### V3

- [ ] **Opportunity forecasting**
      For each achievable topic: projected ranking timeline and estimated monthly traffic
      if ranked in top 3, top 5, top 10. Based on CTR curves and volume data.

- [ ] **Authority unlock notifications**
      When site DA increases enough to unlock previously locked topics:
      notify user "3 new topics are now achievable for you." Surface in dashboard.

---

---

## CATEGORY 3 — CONTENT ENGINE

---

### Launch

- [ ] **Focus page brief generation**
      Using GPT-4o-mini. Input: target keyword, SERP data, competitor headings, brand voice.
      Output: structured brief with sections array. Each section contains:
      type (H1/H2/H3/CTA/FAQ/Schema), heading text, content guidance,
      NLP entities to cover, word count target, CRO notes.
      Cost: 40 credits.

      PATENT REQUIREMENTS for brief generation:
      [US9940367B1 + US9959315B1] Every H2 in the brief must be written as a
        clear, specific, answerable question. Vague labels ("Our Services",
        "About Drain Cleaning") produce weak passage context vectors. Strong H2s
        ("How Long Does Drain Cleaning Take?" "What Causes a Blocked Drain?")
        create heading vectors that score high on the passage context patent.
        Each H2 section brief must instruct the writer to answer the H2 in the
        first 1-2 sentences of the section.

      [US20190155948A1] Brief must include an "Information Gain" field identifying
        at least one novel element the page must include to score above zero on IGS.
        Options: original data point, expert quote not on SERP, first-hand experience,
        unique tool, contrarian evidence-backed position.
        If AI cannot identify an IGS opportunity from SERP analysis, flag explicitly:
        "⚠ IGS GAP: All top-ranking pages cover the same ground. Original data or
        first-hand experience required to differentiate."

      [US8117209B1] Brief must specify internal link placement: all recommended
        internal links must appear in body text (not navigation/footer),
        preferably in the first 400 words. Anchor text must be 2-5 descriptive words.

- [ ] **NLP entity extraction**
      For each focus page brief: extract semantic entities from top 10 SERP results.
      Classify entities as: must-cover, should-cover, nice-to-have.
      Show covered vs missing entities in workspace intelligence panel.

      PATENT NOTE [US20190155948A1]: Entity extraction alone is insufficient —
      the Information Gain patent confirms that pages covering only the same entities
      as competitors score LOW on IGS regardless of how well they cover them.
      Entity extraction must also flag the IGS gap: what entities, data points, or
      perspectives are ABSENT from ALL top-ranking pages? Those gaps are the
      highest-value content opportunities.

- [ ] **Competitor heading synthesis**
      Analyze H1-H3 structure of top 3 ranking pages for the target keyword.
      Synthesize into recommended heading structure for the brief.
      Show competitor headings in side-by-side comparison in workspace.

      PATENT NOTE [US9959315B1]: H2 analysis must go beyond keyword presence.
      The passage context patent confirms Google evaluates the entire heading vector
      (Title → H1 → H2 → passage) as a coherent path. Two outputs required:
      (1) What topics do competitors' H2s cover? (standard gap analysis)
      (2) Are competitor H2s written as clear, answerable questions? Flag if they are
      not — this is an opportunity to outscore them on passage context even if they
      outrank you on authority. Recommended H2s in the brief must be written as
      specific answerable questions, not vague topical labels.

- [ ] **Article generation**
      Using GPT-4o-mini. Input: keyword, target word count, competitor structure,
      entities to cover, brand voice settings.
      Output: full article in markdown, ~1,000 words, properly structured with headings.
      Cost: 20 credits.

      PATENT REQUIREMENTS for article generation:
      [US9940367B1 + US9959315B1] System prompt must instruct the model:
        - Write every H2 as a clear, specific, answerable question
        - Answer each H2 in the first 1-2 sentences of the section beneath it
        - End with a FAQ section using question-format H3s with direct first-sentence answers
        - Sections should be 150-350 words — focused on one answerable sub-topic each

      [US20190155948A1] System prompt must instruct the model to include at minimum
        one element not found in competitor content provided in the context:
        a unique angle, data point, specific example, or first-person framing.
        Articles that purely synthesise competitor content will score near-zero on IGS.

      [US8117209B1] System prompt must instruct: all internal link anchors should
        be 2-5 descriptive words, placed in body text paragraphs (not after headings
        or in the conclusion/footer), and ideally in the first half of the article.

- [ ] **Word count targeting**
      Calculate target word count from competitor average (top 3 results).
      Show progress toward target in workspace header.
      Flag if significantly under or over target.

- [ ] **WYSIWYG article editor**
      Tiptap-powered. Toolbar: Bold, Italic, H1, H2, H3, Bullet list, Ordered list,
      Blockquote, Link. Content area comfortable reading width (max 720px centered).
      Auto-saves to Supabase every 30 seconds.

- [ ] **Focus page brief editor**
      Section-by-section structured editor. Each section is a card.
      Drag to reorder sections. Edit heading and content inline.
      Rewrite individual section (5 credits per section).

- [ ] **AI draft pre-population**
      When article generation completes, pre-populate Tiptap editor with generated content.
      User edits from there — never starts from blank.

- [ ] **Live SEO score**
      Real-time score (0-115) updating as user edits content in workspace.
      Score based on patent-grounded dimensions:

      STRUCTURAL (25 pts): keyword in H1, keyword in title, keyword in URL,
        keyword in first 100 words, H2 count.

      SEMANTIC (25 pts): LSI term coverage vs competitor consensus,
        entity coverage vs expected entity set.

      CONTENT QUALITY + INFORMATION GAIN (25 pts base + 0-15 IGS bonus):
        word count vs competitor median, FAQ present, schema present,
        intent alignment.
        IGS BONUS (up to +15 pts) [US20190155948A1]:
          +5 original research or proprietary data
          +4 expert quotes not found in competitor pages
          +3 first-hand experience signals
          +2 unique visualisations or tools
          +1 contrarian perspective backed by evidence
        If zero IGS elements present: show "⚠ Skyscraper Warning — this content
        adds nothing the user hasn't seen. Add an original element."

      PASSAGE READINESS (15 pts) [US9940367B1 + US9959315B1]:
        H2s written as clear answerable questions (+2 pts each, max 8),
        first sentence of each section directly answers its H2 (+1 pt each, max 4),
        FAQ section present (+3).

      TECHNICAL (10 pts): schema present, canonical, internal links in body text.

      Display: score prominently with color (red <55, amber 55-75, green 76-115).
      Show breakdown by dimension so user knows exactly what to fix.

- [ ] **Export options**
      Copy to clipboard (markdown or plain text).
      Download as .txt or .md file.
      Print-friendly view.

### Launch

- [ ] **Meta title and description generator**
      Using GPT-4o-mini. Input: keyword, page content summary, SERP titles for reference.
      Output: 3 meta title options + 3 meta description options.
      Show character counts (title <60, description <160). Cost: 3 credits.

- [ ] **Section-level regeneration**
      Rewrite any individual section of a focus page brief or article without
      regenerating the entire piece. Preserves user's edits to other sections.
      Cost: 5 credits per section.

- [ ] **Tone adjustment**
      After generation, user can request tone shift: "make this more professional"
      or "make this more conversational." Applies brand voice settings.
      Cost: 5 credits.

- [ ] **FAQ generation**
      Generate FAQ section from People Also Ask data pulled via Serper.dev.
      Includes FAQ schema markup ready to copy.
      Cost: included in focus page brief, or 5 credits standalone.

- [ ] **Schema markup generator**
      Generate appropriate schema for page type:
      focus pages → LocalBusiness or Service schema
      articles → Article schema
      FAQ sections → FAQPage schema
      Output as JSON-LD ready to paste. Included in focus page brief.

- [ ] **Content calendar view**
      Calendar UI showing planned and published content across all clusters.
      Drag articles to assign target publish dates.
      Filter by cluster or funnel stage.

- [ ] **Product description rewriter** (ecommerce)
      Input: existing product description or product name + features.
      Output: SEO-optimized product description with target keyword naturally included.
      Cost: 10 credits per product.

- [ ] **Collection/category page generator** (ecommerce)
      Generate optimized introductory copy for Shopify collection pages.
      Includes target keyword, semantic entities, and internal link suggestions.
      Cost: 15 credits per collection.

- [ ] **Blog-to-product funnel mapping** (ecommerce)
      For each article in a cluster: identify the most relevant product to drive readers toward.
      "Readers of this article have high purchase intent — link to [product] here."
      Automatically suggests anchor text and placement within the article.
      Shown as CRO suggestion in workspace intelligence panel.

- [ ] **Buyer-intent CTA generator** (ecommerce)
      Generate contextual CTAs based on where the reader is in the funnel.
      ToFu articles get soft CTAs ("Learn more about our service").
      BoFu articles get hard CTAs ("Get a free quote", "Book a consultation", "Shop now").
      Generated from competitor CTA analysis and funnel stage classification.
      Cost: included in focus page brief, or 5 credits standalone.

- [ ] **Product keyword clustering** (ecommerce)
      Group keyword opportunities by product or product category — not just topic.
      Useful for Shopify stores with multiple product lines.
      Each product gets its own cluster strategy showing which keywords to target.

### V2

- [ ] **Content refresh suggestions**
      For published content: identify sections that are outdated, thin, or missing
      newly important entities. Surface as "refresh needed" flag with specific suggestions.
      Triggered by: rank drop, algorithm update signal, competitor new content.

      PATENT NOTE [US7346839B2]: Content update frequency is a tracked historical
      signal. The Historical Data patent documents that meaningful updates to existing
      content trigger re-evaluation. Stale pages decay in freshness scores.
      Frame refreshes as trust-building actions: "Updating this page signals to Google
      that it's maintained and current — one of the 6 historical trust signals Google
      tracks for every domain."

      PATENT NOTE [US20190155948A1]: Refresh suggestions must include an IGS check.
      Adding new statistics, a proprietary example, or a unique data point to an
      existing page can substantially improve its Information Gain Score — even a
      small addition of genuinely novel content lifts IGS meaningfully.

- [ ] **Comparison content generator**
      Generate "X vs Y" or "Best X for Y" style content — high-converting MoFu format.
      Auto-structured with comparison table, pros/cons, and recommendation section.
      Cost: 25 credits.

- [ ] **AI image alt text generator**
      For images in the editor: generate descriptive, keyword-rich alt text.
      Cost: 1 credit per image.

- [ ] **Readability scoring**
      Flesch-Kincaid readability score alongside SEO score.
      Flag content that's too complex for the target audience.
      Suggestion: "This reads at a college level — your audience may prefer simpler language."

- [ ] **UPSA scoring fix — H2 contamination penalty (bidirectional)**
      Gap: `product-gaps-master.md` V1.2b. Current UPSA Module 3 is additive only — rewards
      good H2s but doesn't penalize weak ones. Research shows weak H2s contaminate the entire
      page's passage score (US9940367B1 + US9959315B1).
      Fix: change to bidirectional ratio scoring.
      ≥80% passage-ready H2s: +10pts. ≥50%: +5pts. ≥30%: 0. <30%: -5pts.
      Plain-English output (penalty): "{n} of your H2s are vague labels like 'Our Services'.
      These are weakening your whole page's passage scoring — not just those sections."
      NOTE: This changes scores on all existing pages. Ship together with keyword density fix.

- [ ] **UPSA scoring fix — keyword density penalty (bidirectional)**
      Gap: `product-gaps-master.md` V1.2e. Currently no penalty for keyword stuffing.
      Fix: above 3% density = -5pts + `keyword_stuffing` audit issue type.
      <0.5%: 0pts (too low). 0.5-2%: +10pts (optimal). 2-3%: +5pts. >3%: -5pts.
      Plain-English: "Your keyword appears X times in Y words (Z%). Remove N instances."

- [ ] **Author / EEAT field on projects**
      Gap: `product-gaps-master.md` B1.
      DB migration: `ALTER TABLE projects ADD COLUMN author_bio text;`
      UI: Project Settings → Content Voice section. Label: "Who is the expert behind this content?"
      Helper: "This makes your content sound like it comes from a real expert — which helps with
      Google's trust signals." Example: "Jane Smith, licensed electrician, 15 years experience."
      Feeds into every article generation prompt as {author_expertise}.
      One field, massive quality difference on every article. Ship at launch.

- [ ] **URL slug change warning**
      Gap: `product-gaps-master.md` B3. Grounded in US7346839B2 (historical trust accumulation).
      Trigger: user edits published_url on a page where status = 'published' OR rankings data exists.
      Hard warning modal with explanation. Requires typed confirmation "CHANGE URL" to proceed.
      "Changing this URL resets all the trust Google has built for this address — including any
      links pointing to it. Even with a redirect, some of that authority is permanently lost."

- [ ] **AI detection education tooltip**
      Gap: `product-gaps-master.md` B2.
      Persistent info card near content output: "Your content may be flagged by AI detection tools.
      This has no effect on Google rankings. What Google measures is semantic depth and expertise
      signals — which your content score already tracks."
      Dismissable, persistent on first view.

### V3

- [ ] **Auto content refresh**
      When a page drops more than 5 positions: automatically generate refresh suggestions
      and notify user. One-click to apply AI-suggested improvements.

- [ ] **Bulk article generation**
      Generate multiple articles at once for an entire cluster.
      Queue system — processes in background, notifies when complete.
      Cost: standard per-article credit rate.

---

---

## CATEGORY 4 — CLUSTER MANAGEMENT

---

### Launch

- [ ] **Cluster creation from topic**
      From strategy page: "Start Cluster" → generates cluster structure using Haiku.
      Creates focus page + 5-8 supporting articles with keywords, funnel tags,
      word count targets, and AI reasoning for each. Cost: 15 credits.

- [ ] **React Flow visual cluster map**
      Interactive node-based map. Focus page node at center (dark navy, cyan border).
      Article nodes surrounding it, color-coded by funnel stage.
      ToFu: blue left border. MoFu: amber left border. BoFu: green left border.
      Edges: dashed gray = planned links, solid cyan = implemented links.

- [ ] **Node click → detail panel**
      Clicking any node opens right detail panel without page navigation.
      Panel shows: keyword data, funnel stage, AI reasoning, competitor coverage,
      CRO suggestions (focus page), action buttons.

- [ ] **Funnel stage tagging**
      Every article in a cluster tagged ToFu/MoFu/BoFu automatically by AI.
      User can manually override tag.

- [ ] **Cluster health bar**
      Persistent bar below page header showing:
      funnel coverage distribution, CRO score, authority fit, completion progress,
      AI alert if funnel is imbalanced.

- [ ] **Funnel balance detection**
      If cluster is ToFu-heavy (>60% ToFu): surface warning.
      "You have 7 ToFu articles and no MoFu — bringing in awareness traffic
      with nowhere to send it."
      Suggest specific MoFu article to add.

- [ ] **Add article to cluster**
      User can add a new article node manually. Type keyword → system classifies
      funnel stage, estimates volume/KD, generates AI reasoning.

- [ ] **Remove article from cluster**
      Remove node from React Flow map. Confirm modal. Does not delete content
      if already generated — moves to "unassigned" state.

- [ ] **Cluster completion tracking**
      Track: not started / draft / published per page.
      Cluster completion % shown in health bar, dashboard, and strategy table.

### Launch

- [ ] **Internal link suggestion engine**
      Analyze cluster content and suggest specific internal link opportunities:
      which anchor text, from which article, to which destination page.
      Mark suggestions as implemented/pending.
      Show as edge state on React Flow map (dashed → solid when implemented).

      PATENT REQUIREMENTS [US8117209B1 — Reasonable Surfer Model]:
      Internal link suggestions are NOT all equal. The patent confirms link equity
      = PR(source) × ClickProbability(link). The tool must enforce:

      PLACEMENT: Links must be suggested in body text paragraphs only.
        Never suggest footer, sidebar, or navigation links as SEO internal links.
        Suggest placement in the first 400 words where possible — first link to
        a destination from a page passes more equity than subsequent links.
        Show placement guidance in the suggestion: "Add in paragraph 2 of the
        intro section, not at the article conclusion."

      ANCHOR TEXT: Suggestions must specify 2-5 descriptive words as anchor text.
        Flag if user has generic anchors ("click here", "read more", "this article")
        on existing pages — these have low click probability and pass less equity.
        Suggest topically descriptive replacements.

      LINK EQUITY TABLE: Show users a visual of relative equity by placement:
        Body text early in article → Very High (1.00×)
        Body text late in article → High (0.80×)
        Above-fold sidebar → Medium (0.50×)
        Navigation menu → Low (0.30×)
        Footer → Very Low (0.15×)

- [ ] **Internal links view**
      Dedicated tab within cluster detail showing all link relationships.
      Table view: from page → anchor text → to page → implemented status.
      Mark as implemented with one click.

- [ ] **Drag to reposition nodes**
      User can drag nodes in React Flow map to customize layout.
      Positions saved to Supabase (position_x, position_y).

- [ ] **Draw edge (manual link)**
      User can draw a new edge between nodes to indicate a planned internal link.
      Prompts for anchor text. Saves as internal_link record.

- [ ] **Cluster list view**
      Alternative to React Flow map: simple table view of all articles in cluster.
      Columns: title, keyword, funnel, status, SEO score, word count, action.
      Toggle between map and list view.

- [ ] **Blog-to-product funnel mapping** (ecommerce)
      For each article in cluster: suggest relevant product to link to.
      "Readers of this article have high purchase intent — link to [product] here."
      Show as CRO suggestion in workspace panel.

- [ ] **Destination page field on clusters**
      Spec: `architecture-b-downstream-product-page.md`
      DB migration: add `destination_page_url` (text) + `destination_page_label` (text) to clusters table.
      After cluster creation: single prompt — "Does this cluster have a destination page?
      A product, signup, or service booking page your content drives visitors toward?"
      URL field + label field. Skip option. Not an architecture A/B choice — just one question.
      Universal model: ecommerce, SaaS, and service businesses all use this same pattern.

- [ ] **Destination page node in React Flow map**
      For clusters with destination_page_url: render as a distinct node outside the cluster boundary.
      Directional arrows from focus page to destination node.
      Visual message: SEO anchor earns the audience → destination page closes them.

- [ ] **Cluster health bar — destination connection status**
      New indicator pill in cluster health bar:
      Connected (green) / Partial (amber) / Disconnected (red)

- [ ] **Internal link engine — destination link suggestion type**
      New suggestion type for clusters with destination_page_url.
      ONE contextual destination link suggestion per MoFu/BoFu article (never ToFu).
      Only fires if article doesn't already link to destination.
      Hard limit: never suggest more than one destination link per article.

- [ ] **Brief generation — destination-aware CRO context blocks**
      ToFu articles: do not mention destination. MoFu/BoFu: one natural mention where reader is
      most solution-aware. Focus page: above-fold CTA + 1-2 body contextual links + bottom CTA.

- [ ] **Cluster intelligence layer — 7 warnings**
      Spec: `cluster-intelligence-layer.md`
      DB migration: `cluster_intelligence` (JSONB) on clusters table.
      Health scoring: high severity = -40pts, medium = -15pts, low = -5pts.
      Status tiers: Strong (80-100) / Needs Work (50-79) / Critical Issues (<50).
      Warning 1: Over-linking to destination page (equity dilution)
      Warning 2: Missing reverse silo connections (articles not linking to focus page)
      Warning 3: Funnel stage imbalance (ToFu-heavy, no MoFu bridge)
      Warning 4: External equity leakage (focus page leaking equity externally)
      Warning 5: Orphaned destination page (destination set but nothing links to it)
      Warning 6: Cluster-wide funnel mismatch (informational articles with hard CTAs)
      Warning 7: BoFu focus page — ALWAYS Critical Issues. Red full-width banner.
      "Your focus page is targeting a transactional keyword — this fights itself.
      Use a MoFu focus page and move the transactional keyword to the destination page."
      Intelligence panel: collapsible, in cluster detail view below React Flow map.

- [ ] **Customer journey map / funnel visualizer**
      Spec: `funnel-visualizer.md`
      Full spec ships at launch. This is the frame that makes the whole product coherent.
      Tab restructure in cluster detail:
      Customer Journey (default) | Link Architecture (React Flow) | Intelligence
      Three-column layout: Awareness | Consideration | Decision
      Page cards: UPSA score, CRO score, GSC impressions + clicks + CTR + position per card.
      SEO anchor highlighted: "★ — This is where you rank"
      Traffic flow arrow from anchor to destination showing GSC click volume.
      Destination card — locked (base): personalised upsell using actual click volume.
      Destination card — unlocked (CRO add-on): CRO score + "Open in CRO Studio."
      Top 2 cluster intelligence warnings shown as banners in this view.
      Warning 7: full-width red banner always shown when BoFu focus page detected.

- [ ] **Weekly priority stack**
      Data-driven personalised task list on dashboard. Max 6 items. Updates each page load.
      Sources: UPSA scores, cluster intelligence warnings, GSC data (Growth+), CRO scores.
      Categories: High Impact / Medium Impact / Keep Going. Direct action buttons per item.
      Builder tier: UPSA + cluster warnings. Growth+: adds GSC data + position movement.

### V2

- [ ] **Cluster duplication**
      Duplicate an existing cluster as a starting template for a similar topic.
      Useful for similar service areas or geographic variations.

- [ ] **Cluster merge**
      Merge two overlapping clusters. AI identifies duplicate content risk
      and suggests which articles to consolidate.

- [ ] **Cluster performance summary**
      Per-cluster analytics: total impressions, total clicks, avg position,
      best performing article, lowest CTR article.
      Shown on cluster detail page and in clusters overview.

---

---

## CATEGORY 5 — CLUSTER INTELLIGENCE LAYER (LAUNCH)

Full spec: `cluster-intelligence-layer.md`

Seven warnings that audit the structural health of every cluster. Each fires automatically
when conditions are met. Intelligence panel lives in cluster detail view.
Top 2 active warnings also surface in the funnel visualizer as banners.

DB changes:

```sql
ALTER TABLE clusters ADD COLUMN cluster_intelligence jsonb;
ALTER TABLE clusters ADD COLUMN architecture text DEFAULT 'A';
ALTER TABLE clusters ADD COLUMN destination_page_url text;
ALTER TABLE clusters ADD COLUMN destination_page_label text;
```

---

### Launch

- [ ] **Warning 1: Over-linking to money/product page**
      Fires when >1 supporting article links directly to destination_page_url.
      Severity: Medium. Only the focus page should funnel equity to the destination.
      Plain-English: "3 of your articles are linking directly to your product page.
      Only your focus page should do this — the others are diluting the equity."

- [ ] **Warning 2: Missing reverse silo connections**
      Fires when supporting articles exist with no link back to the focus page.
      Severity: High. Equity is leaking instead of concentrating.
      Plain-English: "2 articles in this cluster don't link back to your focus page.
      They're ranking on their own authority instead of building yours."

- [ ] **Warning 3: Funnel stage imbalance**
      Fires when cluster is >60% ToFu with no MoFu bridge pages.
      Severity: Medium. Awareness traffic with nowhere to go.
      Plain-English: "You have 6 awareness articles but nothing to move readers
      toward a decision. Add a comparison or 'how to choose' article."

- [ ] **Warning 4: External equity leakage**
      Fires when focus page has >2 external links without nofollow.
      Severity: Medium. Equity leaving the cluster through external links.
      Plain-English: "Your focus page is sending ranking power to 4 external sites.
      Add nofollow to external links that don't need to pass equity."

- [ ] **Warning 5: Orphaned destination page**
      Fires when architecture = 'B' and destination_page_url exists but
      no cluster pages link to it.
      Severity: High.
      Plain-English: "Your product page isn't connected to any content in this cluster.
      Nothing is driving visitors toward it."

- [ ] **Warning 6: Cluster-wide funnel mismatch**
      Fires when 2+ informational articles contain hard CTAs.
      Severity: Medium. Conversion pressure applied at wrong funnel stage.

- [ ] **Warning 7: Focus page is BoFu/transactional keyword**
      Always forces "Critical Issues" cluster status.
      Fires as full-width red banner in funnel visualizer AND in intelligence panel.
      Plain-English: "Your focus page is targeting a transactional keyword.
      A page that needs to rank AND convert at the same time does neither well.
      Move the ranking job to a MoFu focus page and make this the destination page."
      Detection: page_type = 'money_page', dominant_intent = 'transactional',
      funnel_stage = 'bofu', plus transactional keyword regex.

- [ ] **Cluster health scoring**
      High-severity warning: -40 pts. Medium: -15 pts. Low: -5 pts.
      Status labels: Strong (no warnings) / Needs Work (medium warnings) /
      Critical Issues (any high warning or Warning 7).
      Displayed in cluster health bar.

- [ ] **Cluster intelligence UI panel**
      In cluster detail view — collapsible panel below React Flow map.
      Lists all active warnings by severity. Each warning has one plain-English action.

- [ ] **Keyword cannibalization detection**
      Spec: `product-gaps-master.md` — V1.2a.
      `normalizeKeyword()` comparison across all pages in project.
      Fires in cluster intelligence panel AND at strategy screen when adding new keyword.
      "2 pages are competing for the same keyword — consolidate or differentiate."

- [ ] **Topical dilution warning**
      Spec: `product-gaps-master.md` — V1.2d.
      Entity overlap check when adding new topic to strategy.
      <20% overlap with existing content = amber warning. Confirmable.

---

## CATEGORY 6 — CUSTOMER JOURNEY MAP / FUNNEL VISUALIZER (LAUNCH)

Full spec: `funnel-visualizer.md`

This is the frame that makes the whole product make sense on day one.
Not a nice-to-have. The visual that teaches the two-job model without explanation.
Ships in full at launch — not a simplified version.

---

### Launch

- [ ] **Three-column journey layout**
      Columns: Awareness / Consideration / Decision.
      Pages appear as cards at their funnel stage.
      This is the default view when opening a cluster — replaces React Flow as primary tab.

- [ ] **Page cards with full data**
      Each card shows: page title, UPSA score, CRO score, funnel stage badge.
      GSC data on cards for Growth+ users: impressions, clicks, CTR, avg position.
      Builder users: scores only, GSC data locked with upgrade prompt.

- [ ] **SEO anchor highlight**
      Focus page (SEO anchor) marked with "★ This is where you rank."
      Visual distinction from supporting articles.

- [ ] **Traffic flow arrow**
      Arrow from SEO anchor down to destination page card.
      For Growth+ users: annotated with actual GSC click volume.
      "X people clicked through last month."
      For Builder users: arrow shows but click volume locked.

- [ ] **Destination page card — locked state (base)**
      Shown at bottom of funnel below the Decision column.
      Locked padlock icon. Personalised upsell copy using real data where available:
      "X visitors reached this page last month. Unlock CRO Studio to see
      what's stopping them from converting."
      Upgrade CTA → CRO Studio add-on.

- [ ] **Destination page card — unlocked state (CRO add-on)**
      Shows CRO score, last audit date, top issue count.
      "Open in CRO Studio" CTA.

- [ ] **Warning 7 red banner**
      Full-width red banner at top of funnel visualizer when Warning 7 fires.
      "Critical: Your focus page is targeting a transactional keyword.
      This is fighting itself — see Intelligence panel."

- [ ] **Cluster intelligence warning banners**
      Top 2 active warnings from cluster intelligence layer shown as
      amber/red banners below the funnel visualizer header.
      Each banner has a plain-English description and one-click action.

- [ ] **Empty and incomplete states**
      No destination page attached: prompt to add one in cluster settings.
      No GSC data yet: "Connect Search Console to see traffic data here."
      New cluster with no content: skeleton state with "Add your first article" CTA.

- [ ] **Cluster detail tab restructure**
      Tab order: "Customer Journey" (default) | "Link Architecture" (React Flow) | "Intelligence"
      Customer Journey is always the first thing a user sees when opening a cluster.

- [ ] **Subscription gating logic**
      Reads user plan. Shows locked/unlocked states accurately.
      Upgrade CTAs are personalised — use actual data where possible, not generic copy.

- [ ] **Destination page field on clusters**
      Spec: `architecture-b-downstream-product-page.md`
      After cluster creation: "Does this cluster have a destination page?"
      One URL field + label field. Skip option available.
      Not a choice between architecture types — just a simple prompt.

- [ ] **Architecture B internal link engine changes**
      New suggestion type: contextual destination link.
      MoFu/BoFu articles only. Maximum 1 per article. Never ToFu.
      Only if article doesn't already link to destination_page_url.

- [ ] **Architecture B brief generation changes**
      ToFu articles: "Do not mention or link to the destination page."
      MoFu/BoFu articles: "One contextual mention where reader is most solution-aware.
      If no natural moment exists, do not force it."
      Focus page: "2-3 links to destination. Above-fold CTA + body contextual + bottom CTA."

- [ ] **Cluster health bar — destination connection status**
      Pill in health bar: "Product Page — Connected / Partial / Disconnected"
      Green: focus page + at least one article link to destination.
      Amber: focus page links to destination but no articles do.
      Red: no pages link to destination (also fires Warning 5).

- [ ] **React Flow — destination page node**
      Destination page shown as a node outside the cluster boundary.
      Directional arrows from focus page (and linking articles) to destination node.
      Visual confirmation of the equity flow architecture.

---

## CATEGORY 7 — PERFORMANCE & ANALYTICS

---

### Launch (All tiers — base version; full version Growth+)

- [ ] **Weekly priority stack**
      Data-driven personalised task list shown every session on dashboard.
      Base version (all tiers): reads UPSA scores + cluster intelligence warnings.
      Full version (Growth+): adds GSC data, position movements, CTR signals.
      Categories: High Impact (red) / Medium Impact (amber) / Keep Going (green).
      Maximum 6 items. Updates on each page load.
      Not generic advice — specific: "Open [article] in Workspace — it's at position 9
      with an UPSA of 74. Fix the H2s and you could break into top 5."

### Launch (Growth tier)

- [ ] **Google Search Console OAuth connection**
      OAuth flow to connect user's GSC account.
      Store refresh token in Supabase. Pull data via GSC API.
      Show connection status in settings/integrations.

- [ ] **GSC data sync**
      Pull from GSC: queries, impressions, clicks, CTR, avg position per page.
      Sync on page load + daily background refresh.
      Store in Supabase for historical tracking.

- [ ] **Rankings dashboard**
      Table of tracked keywords with: current position, change vs last period,
      impressions, CTR, page title.
      Color-coded position changes (green up, red down, gray unchanged).
      Sortable columns.

- [ ] **Traffic trend chart**
      Recharts line chart of organic clicks over time (last 30/90 days/all time).
      Switchable date range.

- [ ] **Top pages list**
      Most clicked pages from GSC. Shown alongside traffic chart.

- [ ] **AI performance interpretation**
      Using Claude Haiku 4.5. Plain English summary of what the data means and
      what to do next. Generated on page load.
      "Your focus page moved from 18 to 14. The internal linking is working.
      Priority this week: improve CTR on 3 pages."
      Cost: 2 credits per interpretation.

- [ ] **[NEW] Navboost Momentum Score** [US8595225B1 — DOJ confirmed]
      For each tracked keyword: calculate a "momentum score" based on CTR trend
      over the trailing 13 weeks (reflecting Navboost's 13-month rolling window).
      If CTR is improving: show "🟢 Building Navboost momentum — keep going."
      If CTR is flat: show "🟡 No Navboost movement — test a new title."
      If CTR is declining: show "🔴 Navboost signal weakening — urgent: rewrite title/description."
      Explain to user: "Google scores your page differently for each keyword it
      appears in. These scores are based on how often people click your result
      and how satisfied they are. Improving your click rate today builds ranking
      power for the next 13 months."
      Cost: included in GSC data sync, no additional credits.

- [ ] **CTR optimization suggestions**
      Pages with impressions but low CTR (<2%): flag with "Optimize CTR" action.
      Generate new meta title + description suggestions. Cost: 3 credits.

      PATENT NOTE [US8595225B1 — Navboost, DOJ confirmed 2023]:
      CTR optimization is not a cosmetic fix — it is a direct input into Navboost,
      which was confirmed under oath at the 2023 DOJ antitrust trial as one of
      Google's "strongest and most important ranking signals." Navboost uses a
      13-month rolling click history window. A CTR improvement today compounds
      for 13 months. Bad clicks (quick return to SERP) and low CTR actively
      suppress a page's topic-specific Navboost score. This makes CTR optimization
      one of the highest-leverage actions in the tool — frame it that way in UX copy:
      "Improving this CTR builds ranking momentum for the next 13 months."

      Meta title and description generation must optimize for:
      - Click-through compulsion (triggers the Navboost good-click input)
      - Accurate promise (prevents pogo-stick / bad-click)
      Both matter equally. A title that gets clicks but triggers quick bounces
      actively harms rankings more than a low-CTR title.

- [ ] **Page-level attribution**
      Connect GSC page data to Sharkly content records.
      Show "ranking data" section within workspace intelligence panel for published pages.
      Impressions, clicks, CTR, average position per individual page — data already synced,
      just needs wiring to the page-level workspace sidebar.

### Post-Launch

- [ ] **Re-optimization queue**
      Deferred post-launch. Pages ranking positions 4–15 with UPSA score <85.
      Sorted by impression volume (highest revenue impact first).
      "Open in Workspace" action per item. Lives in Performance screen + Weekly Priority Stack.
      "You're 10 spots away from a major traffic jump — here's the fastest path to get there."

- [ ] **Content refresh queue**
      Deferred post-launch. Gap: `product-gaps-master.md` V1.6.
      Pages where last_updated_meaningful >6 months AND GSC position trending down.
      "Generate Refresh Brief" action — surgical additions only, not full rewrite.
      Re-run competitor SERP analysis, identify what's changed, generate targeted update plan.
      Lives in Performance screen.

- [ ] **Publishing cadence guidance**
      Deferred post-launch. Gap: `product-gaps-master.md` O3.
      Recommended publishing cadence based on growth stage (US7346839B2 crawl frequency).
      Track whether user is hitting it. Surface in Weekly Priority Stack.

### V2

- [ ] **Rank tracking (non-GSC)**
      Track keyword positions independently of GSC using Serper.dev spot checks.
      Useful for keywords that don't yet have GSC impression data.
      Daily rank checks for active cluster keywords.

- [ ] **Competitor rank monitoring**
      Track competitor positions for target keywords alongside own rankings.
      Surface when competitor drops — opportunity to gain ground.

- [ ] **Position history graph**
      Per-keyword position chart over time. See ranking trajectory.
      Overlay content publish date to see impact of publishing.

- [ ] **Impression share analysis**
      For keywords ranking 11-20: estimate impression share being lost to position.
      "You're ranking #14 — moving to top 5 would capture 8x more impressions."

### V3

- [ ] **Revenue attribution**
      Connect organic traffic to conversions (requires GA4 or Shopify integration).
      Show revenue influenced by SEO content per page and per cluster.
      "This article drove $4,200 in assisted revenue last month."

- [ ] **ROI calculator**
      Show ROI of Sharkly subscription based on traffic growth and attributed revenue.
      "Your Sharkly investment has driven an estimated $X in organic revenue."

- [ ] **Core Web Vitals monitoring** (Scale tier)
      Pull CWV data from GSC or PageSpeed Insights API.
      Show LCP, FID/INP, CLS per page with pass/fail status.
      Flag pages failing CWV with specific fix suggestions.

---

---

## CATEGORY 8 — TECHNICAL SEO (renumbered — see categories list)

---

### Launch (Scale tier)

- [ ] **Site crawler**
      Crawl all indexable pages on the connected site.
      Identify: missing meta titles, missing meta descriptions, duplicate titles,
      duplicate descriptions, missing H1, multiple H1s, thin content (<300 words).
      Store results in Supabase. Costs 10 credits per crawl.

- [ ] **Technical issues list**
      Table of all identified issues sorted by severity (critical/warning/info).
      Columns: issue type, affected page, severity, recommended fix.
      One-click to open affected page in workspace.

- [ ] **Thin content detection**
      Pages under 300 words flagged as thin. AI suggestion: expand with related
      content or consolidate with similar page.

      PATENT NOTE [US9135307B1 — Panda Site Quality Pre-Classification]:
      Thin content is not just a per-page problem. The patent confirms Google
      pre-classifies entire domains as high-quality or low-quality before serving
      results. One thin page anywhere on a domain can influence the entire domain's
      pre-classification — this is the mechanism behind "content auditing lifts
      rankings across an entire site, not just the audited pages." Thin content
      flagging should communicate this domain-level risk to users:
      "This page is thin. Google may be classifying your entire site based on
      pages like this — not just this page. Expanding or removing it can lift
      rankings site-wide."

- [ ] **Duplicate title/description detection**
      Flag pages sharing identical meta titles or descriptions.
      Suggest unique alternatives for each.

- [ ] **Missing meta detection**
      Flag all pages missing meta title or description.
      Bulk generate missing metas — costs 3 credits per page.

### Launch (Scale tier — continued)

- [ ] **Image optimization scanner**
      Identify images that are: missing alt text, oversized (>200kb),
      not in WebP format, breaking layout on mobile.
      Per-image recommendations. Not a compressor — recommendations only.

- [ ] **Broken link detection**
      Crawl internal links across the site. Flag 404s and redirect chains.
      Show: broken link URL, pages linking to it, suggested fix.

- [ ] **Redirect chain detection**
      Identify redirect chains (A→B→C) that should be simplified (A→C).
      Flag chains longer than 2 hops as performance issues.

- [ ] **Canonical tag audit**
      Check all canonical tags are self-referencing or correctly pointing to
      preferred URL. Flag missing canonicals and potential canonical conflicts.

      PATENT NOTE [US7346839B2]: Changing a URL resets all historical signals
      Google has accumulated for that path — inception date, link velocity pattern,
      anchor text history. Canonical issues that cause Google to index the wrong URL
      variant mean the right URL never accumulates trust history. Frame this as
      a trust-building issue, not just a technical one.

- [ ] **Structured data validation**
      Check existing schema markup for errors using Google's schema guidelines.
      Flag invalid or missing schema by page type.

- [ ] **Ongoing site health monitoring**
      Re-crawl site weekly. Alert user when new issues are detected.
      "3 new broken links detected since last week." Push to dashboard quick wins.

- [ ] **[NEW] H2 Passage Quality Checker** [US9940367B1 + US9959315B1]
      Scan all published pages and evaluate H2 headings for passage scoring readiness.
      Flag H2s that are vague labels rather than clear answerable questions.
      Examples of WEAK H2s to flag: "Our Services", "About Us", "Methods", "Overview"
      Examples of STRONG H2s: "How Much Does Drain Cleaning Cost?", "What Causes a Blocked Drain?"
      Show score per page: X of Y H2s are passage-ready (written as answerable questions).
      Include one-click "Rewrite this H2" button with AI suggestion.
      Framing for users: "Google independently scores each section of your page.
      Sections under clear question headings score higher than sections under
      vague labels — even with identical content underneath."

- [ ] **[NEW] Information Gain Checker** [US20190155948A1]
      During content creation and in the technical audit: flag pages that contain
      zero original elements — entirely synthesised from competitor content.
      Criteria to detect low-IGS content: - All H2 topics appear in 3+ competing pages - No original data, statistics, quotes, or tools cited - No first-person or first-hand experience language - AI-detectable as synthesis of existing SERP content
      Output: "⚠ Information Gain Warning — this content adds nothing the user
      hasn't already seen on the first page of Google. Add one original element
      to avoid Helpful Content demotion risk."
      Provide specific IGS suggestions based on the topic.

- [ ] **[NEW] Schema markup generator**
      JSON-LD schema generation for Article, FAQ, Product, LocalBusiness, BreadcrumbList.
      Copy-paste ready output in workspace sidebar. Triggered by page_type.
      All plan tiers — ships at launch.

- [ ] **[NEW] Person schema — author on article pages**
      Gap: `product-gaps-master.md` V1.4a.
      JSON-LD Person schema on article pages. Reads from author_bio field.
      Embedded in Article schema as "author" property.

- [ ] **[NEW] AggregateRating + sameAs schema**
      Gap: `product-gaps-master.md` V1.4b + V1.4c.
      DB: google_review_count, google_average_rating, google_place_id, gbp_url,
      facebook_url, linkedin_url, yelp_url, wikidata_url on projects table.
      AggregateRating schema (the gold stars in search results) on business pages.
      sameAs property linking to all configured profiles — entity disambiguation in Knowledge Graph.
      UI: Project Settings → "Your business profiles."

- [ ] **[NEW] YMYL niche detection**
      Gap: `product-gaps-master.md` V1.4d.
      Classify law/medical/financial/health niches at project creation.
      Stricter EEAT checklist requirements + additional generation prompt constraints.

- [ ] **[NEW] EEAT scored checklist**
      Gap: `product-gaps-master.md` V1.1.
      DB: `eeat_score` (integer) + `eeat_checklist` (JSONB) on projects table.
      10-item checklist across Expertise, Experience, Authoritativeness, Trustworthiness.
      "Trust & Authority" tab in technical SEO screen. Each failing item: one plain-English fix.

- [ ] **[NEW] Nav + footer dilution warning**
      Spec: `reverse-silo-architecture.md`
      Equity multiplier: nav = 0.30×, footer = 0.15×. Site-level and page-level warnings.
      Shopify mega-menu specific detection. Fires in cluster intelligence + technical audit.

- [ ] **[NEW] Keyword cannibalization detection**
      Gap: `product-gaps-master.md` V1.2a.
      Cross-page keyword normalization comparison. Fires in cluster intelligence panel
      and strategy screen when adding a keyword that already exists in the project.

- [ ] **[NEW] IGS domain-level consequence warning**
      Gap: `product-gaps-master.md` V1.2c. Grounded in US8682892B1 (Panda).
      (1) Pre-generation warning when IGS opportunity field is empty.
      (2) Site-level IGS health: ratio of low-IGS published pages.

- [ ] **[NEW] Topical dilution warning**
      Gap: `product-gaps-master.md` V1.2d.
      Entity overlap check when adding new topic. <20% overlap = amber warning, confirmable.

- [ ] **[NEW] Brand search ratio correction**
      Gap: `product-gaps-master.md` V1.2f. Correction to existing Brand Search Panel framing.
      Add ratio indicator. Warning when backlinks growing 3× faster than branded searches.

- [ ] **[NEW] Crawl budget waste detection**
      Gap: `product-gaps-master.md` V1.2g.
      Issue types: thin_tag_pages, author_archive_pages, pagination_waste, parameter_duplicates.
      noindex recommendations for all types.

- [ ] **[NEW] Redirect chain depth detection**
      Gap: `product-gaps-master.md` V1.3a. Extends existing redirect detection. >2 hops = medium. >4 hops = high. "Shorten this to a direct redirect."

- [ ] **[NEW] Mobile-first indexing check**
      Gap: `product-gaps-master.md` V1.3b.
      Viewport meta, hidden content, touch targets, horizontal scroll.
      Issue types: missing_viewport_meta, mobile_content_hidden, small_touch_targets.

- [ ] **[NEW] Duplicate title + meta detection sitewide**
      Gap: `product-gaps-master.md` V1.3c. Cross-page comparison across all crawled pages.
      Issue types: duplicate_title_tag, duplicate_meta_description.

- [ ] **[NEW] Pagination canonical tag check**
      Gap: `product-gaps-master.md` V1.3d. Critical for Shopify collection pages.
      Paginated pages without canonical tags pointing to root collection page.

- [ ] **[NEW] Image optimization audit (full)**
      Gap: `product-gaps-master.md` V1.3e. Extends existing image SEO scanner.
      WebP format check, LCP image preload check, above-fold lazy-load warning.

- [ ] **[NEW] Intrusive interstitial detection**
      Gap: `product-gaps-master.md` V1.3g. Issue type: intrusive_interstitial.
      Excludes cookie consent + legally required gates.

- [ ] **[NEW] Link velocity monitoring**
      Gap: `product-gaps-master.md` V1.3h. Grounded in US7346839B2.
      Via DataForSEO/Moz. Warning when current month >5× historical average AND >20 new domains.

- [ ] **[NEW] SEO decision tree — "Diagnose This Page"**
      Gap: `product-gaps-master.md` V1.5.
      "Diagnose This Page" button in workspace. 7-step root cause diagnostic.
      Reads GSC + UPSA + audit data. Outputs ONE diagnosis + first action.
      Steps: indexation → ranking position → intent match → content quality →
      domain authority → CTR signals → GroupModificationFactor.
      Not an on-page audit — diagnoses WHY a page with a good UPSA score still isn't ranking.

- [ ] **[NEW] Laws of SEO contextual education**
      Gap: `product-gaps-master.md` O1.
      8 Laws as contextual tooltips at relevant product moments. Not a glossary.
      Each law appears where the feature it explains is being used.

- [ ] **[NEW] Brand Search Signal Tracker** [US8682892B1]
      Track branded search volume (queries containing brand name) via Google Search
      Console. Surface as a dedicated metric alongside backlink count.
      Explain to user in plain language: "Brand searches are a direct input into
      Google's quality multiplier for your entire site. When people search for
      your brand name, it signals trust — and Google counts it in the formula that
      decides how much authority boost your pages get."
      Show trend over time. Flag if growing slower than backlink count
      (ratio deteriorating).
      Recommendations panel: "Ways to grow your brand search volume" — PR,
      social media, podcast appearances, consistent brand name usage in content.

### V2

- [ ] **Internal link gap analysis**
      Identify new content that hasn't been linked to from existing pages.
      "You published this article 2 weeks ago and nothing links to it yet."
      Suggest specific anchor text and source pages.

- [ ] **Crawl budget analysis** (larger sites)
      Identify pages being crawled that shouldn't be (admin, tag pages, duplicates).
      Suggest robots.txt or noindex improvements.

### V3

- [ ] **Page speed recommendations**
      Integrate PageSpeed Insights API. Per-page speed scores with specific
      improvement recommendations in plain English.

- [ ] **Backlink monitoring** (via third-party API)
      Track new and lost backlinks to the user's site.
      Do not build own infrastructure — integrate with existing backlink API (Ahrefs API or similar).
      Alert user when significant backlinks are gained or lost.
      Surface as "Link Opportunities" in dashboard.

- [ ] **Mobile usability audit**
      Flag mobile usability issues from GSC data.
      "3 pages have text too small to read on mobile."

---

---

## CATEGORY 9 — CRO: SYSTEM 1 (LAUNCH)

Full spec: `system-1-cro-layer.md`

System 1 is the conversion layer built on top of the SEO tool. It lives in the workspace.
It is NOT a separate product. It is included in the base subscription at all tiers.
It is a retention mechanism — users who see immediate CRO value stay subscribed through
the 3-6 months their rankings are building.

SEO score (UPSA) and CRO score are ALWAYS displayed as two separate numbers. Never combined.

---

### Launch

- [ ] **Page type classification engine**
      `classifyPageType()` — runs at brief generation, stored as `page_type` on pages table.
      Six types: tofu_article, mofu_article, mofu_comparison, bofu_article, service_page, money_page.
      User never sees the type code — they see plain-English labels.
      Re-runs if keyword or funnel_stage changes.

      DB migration:
      ```sql
      ALTER TABLE pages ADD COLUMN page_type text;
      ALTER TABLE pages ADD COLUMN cro_checklist jsonb;
      ALTER TABLE pages ADD COLUMN cro_score integer DEFAULT 0;
      ```

- [ ] **8-item CRO checklist — full detection engine**
      Spec: `system-1-cro-layer.md` — full detection functions.
      Each item returns pass / partial / fail / N/A based on page type.
      N/A items excluded from denominator entirely.
      Score displayed as X/Y where Y = applicable items only.

      Item 1: Clear H1 with target keyword
      Item 2: Hero CTA above the fold (first 20% of content by character count)
      Item 3: Trust signal before CTA
      Item 4: Intent-matched CTA type (soft/medium/hard mapped to funnel stage)
      Item 5: Objection addressed before CTA
      Item 6: Urgency or scarcity signal
      Item 7: FAQ or objection removal section
      Item 8: Keyword in first 100 words

- [ ] **CRO requirements map — per page type**
      Spec: `system-1-cro-layer.md` — CRO_REQUIREMENTS object.
      Determines required / optional / N/A per item per page type.
      money_page and service_page: all 8 items required.
      tofu_article: items 5, 6, 7 are N/A — no CTAs expected.
      Optional items that fail: shown as grey suggestions, not red fails.

- [ ] **Funnel mismatch detection**
      `detectFunnelMismatch()` — fires when CTA type conflicts with funnel stage.
      Example: hard "Book Now" CTA on a ToFu informational article.
      Shown as red/amber banner ABOVE the checklist in the CRO tab.
      Dismissable per session only — reappears if content changes and mismatch persists.

- [ ] **CRO score calculation**
      `calculateCROScore()` — stored as percentage 0-100 in cro_score field.
      Feeds cluster health bar. N/A items excluded from denominator.
      Evaluation trigger: fires on content save event alongside UPSA trigger.
      Debounced — not on every keystroke.

- [ ] **CRO tab UI — workspace intelligence panel**
      Replaces current stub. Layout top to bottom:
      (1) Score block — large number display, page type as plain-English subtext
      (2) Funnel mismatch warning (conditional, above checklist)
      (3) Checklist — 8 items with ✅/⚠️/❌/— indicators + evidence strings
      (4) "Get Specific Fixes" button — active only when required item is failing, shows "3 credits"
      (5) Brief Guidance — collapsed accordion with existing cro_note fields from brief

- [ ] **Intent-aware AI fixes prompt (Section 8.6)**
      GPT-4o-mini. 3 credits. Fires from "Get Specific Fixes" button.
      Intent rules strictly enforced: - tofu_article: soft CTAs only — email capture, download, "learn more" - mofu: medium-commitment — free assessment, no-obligation call - bofu/service/money: hard CTAs with urgency — "Get a Free Quote Today"
      Generates actual copy — not suggestions. "Add this line: '200 London homeowners trust us'"
      Max 3 suggestions. Each 1-2 sentences.

- [ ] **CRO context blocks in brief generation**
      Inject intent-aware CRO instructions into brief generation prompt (Section 8.2).
      Based on page_type classification at generation time.
      ToFu: "Do not include hard CTAs. Build authority. Guide with soft prompt only."
      MoFu: "Medium-commitment CTA. Address objections. Build trust through specifics."
      BoFu/Service/Money: "Hard CTA above fold. Trust signals before CTA. Urgency at bottom."

- [ ] **Author/EEAT field on projects**
      Spec: `product-gaps-master.md` — B1.
      `ALTER TABLE projects ADD COLUMN author_bio text;`
      UI: "Who is the expert behind this content?" in Project Settings → Content Voice.
      Feeds into every article generation prompt as {author_expertise}.
      If empty: placeholder inserted — "[ADD YOUR EXPERIENCE HERE]"

- [ ] **URL slug change warning**
      Spec: `product-gaps-master.md` — B3.
      Hard warning when user edits published_url on a page where status = 'published'.
      Requires typed confirmation: user must type "CHANGE URL" to proceed.
      Grounded in US7346839B2 — URL change resets all accumulated historical trust.

- [ ] **AI detection education tooltip**
      Spec: `product-gaps-master.md` — B2.
      Persistent info card near content output area.
      Copy: "Your content may be flagged by AI detection tools. This has no effect on
      Google rankings. What Google actually measures is semantic depth and expertise
      signals — which your content score already tracks."
      Dismissable. Reappears on first view per session.

---

## CATEGORY 10 — CRO: SYSTEM 2 / CRO STUDIO (POST-LAUNCH ADD-ON)

Full spec: `cro-studio.md`, `system-2-cro-product.md`

CRO Studio is a completely separate product space. It lives at /cro-studio.
It audits DESTINATION PAGES only — product pages, signup pages, service booking pages.
An SEO anchor (article, focus page) NEVER enters CRO Studio.
A destination page NEVER enters Workspace.
This is enforced at routing level. The absence of features in each space IS the message.

Pricing: +$29/month add-on on any plan. +50 credits/month included.

The upsell surface is created at launch by the locked destination page card in the
funnel visualizer — users can see their destination page, see traffic flowing to it,
but cannot audit it until they unlock CRO Studio. Desire is created before the feature ships.

---

### Post-Launch

- [ ] **CRO Studio navigation item**
      "CRO Studio 🎯" in main sidebar nav.
      Locked state (greyed + lock icon) for base subscribers.
      On click: upgrade modal with personalised upsell copy — show actual GSC click
      volume flowing to destination pages. "X visitors reached your product page last
      month — here's what's stopping them from converting."

- [ ] **CRO Studio home screen**
      Lists all destination pages across all clusters.
      Each card: destination label, cluster name, CRO score (if audited), last audited date.
      Empty state: "Connect destination pages in your clusters to start auditing."

- [ ] **Individual destination page view**
      CRO score header — the only score shown. No UPSA, no brief, no internal link engine.
      Fetch live page content via URL.
      Full System 2 audit — 5 dimensions:
      (1) Page architecture audit — is the page structured in the right sequence?
      (2) Intent-matched CRO checklist — deeper than System 1
      (3) Funnel coherence audit — do CTAs match funnel stage?
      (4) Psychological triggers audit — 15 cognitive bias signals
      (5) Objection removal audit — are objections addressed before the CTA?

- [ ] **Audit report display**
      Three sections: Critical Issues (red) / Improvements (amber) / Strong (green).
      Page architecture issues shown first — element sequence violations.
      Each issue: plain-English description + severity + revenue impact framing.

- [ ] **Generated fixes panel**
      For each failing item: inline expansion showing 2-3 copy options.
      Each option is actual usable copy — not suggestions.
      Exact placement instructions: "Replace your current H1 with option 2.
      Place above everything else on the page, before any images."
      Copy-to-clipboard per option.
      Credits: 1 credit (audit), 1-2 credits (single fix), 6 credits (generate all fixes).

- [ ] **Re-audit prompt**
      When audit is older than 30 days: amber banner "This audit is X days old — re-audit?"
      1 credit to re-run.

- [ ] **Subscription gate**
      Base subscribers: locked nav, locked destination card in funnel visualizer.
      Upgrade modal triggered from locked surfaces.
      Add-on purchased via Stripe — activates immediately.

### V2

- [ ] **Competitor CTA analysis**
      For each destination page: analyze what CTAs top 3 competitors use.
      Where placed, what copy, what offer. Surface as CRO insight in System 2 audit.

- [ ] **A/B meta testing suggestions**
      For pages with sufficient impression data: suggest meta title variants to test.
      Track which variant performs better via GSC CTR data.

---

---

## CATEGORY 8 — INTEGRATIONS

---

### Launch

- [ ] **Serper.dev integration**
      SERP analysis for keyword research. Used in: topic strategy, cluster generation,
      focus page brief, article brief. 5 credits per keyword.
      API key stored in .env. Error handling for rate limits.

### Launch

- [ ] **Google Search Console OAuth**
      OAuth 2.0 flow. Scopes: webmasters.readonly.
      Store refresh token encrypted in Supabase.
      Auto-refresh access tokens. Handle revoked access gracefully.

- [ ] **Shopify integration**
      OAuth flow via Shopify Partner app.
      Permissions needed: read_content, write_content, read_products, read_product_listings.
      Features unlocked:
  - Publish articles directly to Shopify blog (one-click from workspace)
  - Pull products and collections for content strategy
  - Collection page optimization
  - Product description rewriter with direct update
    Shopify Billing API for app store subscribers.

- [ ] **WordPress integration**
      Connect via WordPress REST API + Application Password.
      Features: publish posts directly from workspace editor.
      Map Sharkly categories to WordPress categories.

### V2

- [ ] **Google Analytics 4 integration**
      OAuth flow. Pull conversion and revenue data.
      Used for revenue attribution in performance dashboard.

- [ ] **WooCommerce integration**
      Extension of WordPress integration.
      Additional: pull WooCommerce products for content strategy,
      push optimized product descriptions back to WooCommerce.

### V3

- [ ] **Webflow integration**
      Connect via Webflow API. Publish CMS items directly from workspace.

- [ ] **Zapier / webhook support**
      Trigger external workflows when: article published, rank drops, cluster complete.
      Useful for agencies connecting Sharkly to client reporting workflows.

---

---

## CATEGORY 9 — CREDIT & BILLING SYSTEM

---

### Launch

- [ ] **Credit balance tracking**
      credits_remaining and credits_monthly stored on user profile.
      Real-time deduction on every AI action.
      Credit indicator always visible in sidebar.

- [ ] **Credit check before every action**
      Before any AI action: check if sufficient credits available.
      If insufficient: show modal with upgrade CTA and overage option.
      Never execute action without confirmed credits.

- [ ] **Credit transaction log**
      Every deduction logged to credit_transactions table:
      user_id, action type, credits_used, associated page/cluster, timestamp.
      Viewable in settings/credits as usage history.

- [ ] **Credit cost display**
      CreditBadge component shown before every AI action.
      Shows cost in credits. Color: cyan if sufficient, red if insufficient.

- [ ] **80% usage warning**
      When credits_remaining < 20% of monthly allocation:
      Show subtle amber warning banner in sidebar below credit bar.
      "Running low — 47 credits remaining this month."

- [ ] **Credit exhaustion state**
      When credits_remaining = 0:
      All AI action buttons disabled with lock icon.
      Persistent banner: "Credits exhausted — upgrade your plan or buy overage credits."
      Clear path to upgrade or purchase overages.

- [ ] **Monthly credit reset**
      On billing anniversary date: reset credits_remaining to plan monthly allowance.
      Log reset event. Notify user via in-app banner: "Your credits have refreshed."

### Launch

- [ ] **Stripe subscription integration**
      Stripe Checkout for new subscriptions.
      Stripe Customer Portal for plan changes and cancellation.
      Webhooks: subscription.created, subscription.updated, subscription.deleted,
      invoice.paid, invoice.payment_failed.
      Update plan and credits on webhook receipt.

- [ ] **Plan upgrade flow**
      In-app upgrade CTA → Stripe Checkout for new plan.
      On successful upgrade: immediately update plan, top up credits to new tier amount.
      Prorate billing handled by Stripe.

- [ ] **Overage credit purchase**
      User can buy additional credits at $0.05/credit.
      Minimum purchase: 50 credits ($2.50). Recommended: 200 credits ($10).
      Stripe one-time payment. Credits added immediately on payment success.
      Overage credits never expire.

- [ ] **Shopify Billing API**
      For users who install via Shopify App Store:
      All subscription billing through Shopify Billing API (required by Shopify terms).
      Mirror same 4 tiers at same prices.
      Overage top-ups also via Shopify Billing.
      Shopify revenue share (15-20%) factored into margins.

- [ ] **Usage analytics in settings**
      Table showing credit usage by action type this month.
      "Article generation: 120 credits · Focus page briefs: 80 credits · etc."
      Bar chart of daily usage.

### V2

- [ ] **Credit rollover option** (Pro tier)
      Pro users can roll over up to 500 unused credits to next month.
      Cap prevents unlimited accumulation.

- [ ] **Team credit pooling** (future V3)
      Placeholder — if team features added, credits shared across team members.

---

---

## CATEGORY 10 — AGENCY & WHITE-LABEL

---

### V2 (Pro tier)

- [ ] **White-label PDF exports**
      Export focus page brief, article, or cluster report as branded PDF.
      User uploads their logo and sets brand colors in settings.
      PDF header shows user's agency name and logo — not Sharkly branding.
      Download from workspace export button.

- [ ] **White-label cluster report**
      One-click export of full cluster status report:
      cluster overview, all content statuses, SEO scores, funnel coverage,
      rankings if GSC connected. Branded with user's logo.
      Useful for client deliverable.

### V2

- [ ] **Client view (read-only share link)**
      Generate shareable read-only link to a cluster or performance report.
      Client sees branded report without logging in.
      No Sharkly branding on shared view.

- [ ] **Agency dashboard**
      For Pro users with multiple projects: aggregated view across all client sites.
      Total impressions, content published, active clusters per client.
      Quick-switch between projects from single screen.

### V3

- [ ] **Scheduled client reports**
      Automatically generate and email branded performance reports to clients.
      Weekly or monthly. User sets recipient email per project.
      Report includes: traffic summary, ranking changes, content published,
      AI-interpreted highlights, next month priorities.

---

---

## CATEGORY 11 — AI INTELLIGENCE LAYER

---

### Launch

- [ ] **Dual model architecture**
      GPT-4o-mini: article generation, focus page brief content, meta descriptions,
      FAQ generation, schema output, section rewrites.
      Claude Haiku 4.5: topic strategy, authority fit classification, AI insight blocks,
      performance interpretation, CRO suggestions, cluster reasoning.
      Model selection is invisible to user — they just see "AI."

- [ ] **AI insight blocks throughout app**
      Every major screen has an AI insight block with contextual guidance.
      Dashboard: what to do this week.
      Strategy: why these topics in this order.
      Cluster: funnel balance assessment.
      Workspace: what's missing from this content.
      Performance: what the data means and what to do next.

- [ ] **Plain English throughout**
      All AI output must be jargon-free. No "keyword difficulty," say "how hard it is to rank."
      No "domain authority," say "how strong your site currently is."
      Glossary tooltips on any technical term that must be shown.

- [ ] **Brand voice integration**
      All generated content applies: tone setting, industry terms to include,
      terms to avoid. Stored in brand_voice record. Applied as system prompt context
      to every GPT-4o-mini call.

### Launch

- [ ] **AI next action suggestions**
      Always visible in dashboard: top 3 specific actions ranked by impact.
      Not generic advice — specific: "Add internal link from [article A] to [focus page]
      using anchor text '[keyword]'."
      Powered by Haiku analyzing cluster state and GSC data.

- [ ] **Loading step sequences**
      All AI generation shows step-by-step progress list (never a spinner alone).
      Steps describe what's actually happening: "Analyzing SERP results..."
      "Identifying entity gaps..." "Writing introduction..."

### V2

- [ ] **AI memory per project**
      Store learned context per project: what topics performed well, what tone
      worked, what the business has said about their customers.
      Feed as context into future generations to improve relevance over time.

- [ ] **Competitor intelligence digest**
      Weekly AI summary: "Your competitors published 3 new articles this week.
      [Competitor] is targeting [keyword] you haven't covered yet."
      Powered by periodic Serper monitoring of competitor domains.

### V3

- [ ] **Proactive rank drop alerts**
      When a tracked keyword drops more than 3 positions: detect automatically.
      Push notification or email: "Your focus page dropped from #8 to #12.
      Here's why and what to fix." Include specific AI action plan.

- [ ] **Algorithm update detection**
      Monitor for broad ranking volatility across tracked keywords.
      Flag potential algorithm update impact. Surface affected pages.
      "Broad volatility detected — 4 of your pages show unusual movement."

### V4

- [ ] **Autonomous weekly SEO execution**
      With user permission: AI automatically identifies lowest-effort highest-impact
      action each week and executes it (generates content, suggests fixes).
      Sends weekly summary of what was done and results.

- [ ] **Auto internal link insertion**
      After new content is published: automatically identify and suggest
      internal link insertions in existing content. One-click to approve and apply.
      Reduces the manual effort of maintaining a healthy internal link structure.

- [ ] **AI-driven meta title A/B testing**
      For pages with sufficient impression data: generate meta title and description
      variants and track which performs better via GSC CTR data over time.
      System automatically surfaces the winning variant after 30 days.
      Replaces the manual guesswork of optimizing titles.

---

---

## CATEGORY 12 — SETTINGS & BRAND VOICE

---

### Launch

- [ ] **Brand voice settings**
      Tone selector: Professional, Friendly, Conversational, Bold, Authoritative.
      Industry terms to always include (tag input).
      Terms to never use (tag input).
      Sample output preview that regenerates when settings change.
      Saved to brand_voice table per project.

- [ ] **User profile settings**
      Update full name, email, password, avatar.
      Delete account option with confirmation.

### Launch

- [ ] **Notification preferences**
      Toggle: rank drop alerts, weekly summary, credit low warning,
      cluster completion notification.
      Email and in-app notification options.

- [ ] **Integration management**
      Connect/disconnect each integration.
      Show connection status, last sync time, data scope.
      Re-authorize if token expired.

- [ ] **Plan and billing page**
      Current plan display with next billing date.
      Credit balance and usage breakdown.
      Upgrade/downgrade options.
      Link to Stripe Customer Portal for payment method management.
      Invoice history.

### V2

- [ ] **Team settings (V2 feature)**
      Invite team members by email.
      Role-based access: Admin (full access), Editor (content only), Viewer (read-only).
      Team member list with last active date.
      Remove team member option.

- [ ] **API access (Pro tier)**
      Generate API key for Pro users.
      Allows external tools to pull cluster data, rankings, content status.
      Rate limited. Usage logged.

---

## FEATURE COUNT BY PHASE

| Phase       | Features                                                          |
| ----------- | ----------------------------------------------------------------- |
| Launch      | ~80 features — full product shipping day one                      |
| Post-Launch | ~10 features — retention depth + CRO Studio add-on                |
| V2          | ~30 features — competitive intelligence, new integrations, agency |
| V3          | ~20 features — analytics, autonomous layer, platform maturity     |

---

## LAUNCH CRITICAL PATH

These systems must work end-to-end before launch.
Everything is interconnected — build in this order.

1. Onboarding → project creation (already working)
2. Topic strategy generation (already working)
3. Cluster creation with React Flow map (already working)
4. Focus page brief + article generation (already working)
5. Tiptap editor + live UPSA score (already working)
6. **UPSA scoring fixes** — H2 contamination penalty + keyword density penalty (corrects existing scores)
7. **Page type classification** — `classifyPageType()` stored on pages table
8. **Destination page field on clusters** — DB migration + cluster creation prompt
9. **Cluster intelligence layer** — all 7 warnings + health scoring
10. **Customer journey map / funnel visualizer** — full spec, default cluster view
11. **System 1 CRO checklist** — full 8-item detection engine + CRO tab UI
12. **Author/EEAT field** — one DB field, feeds every generation prompt
13. **Schema markup generator** — Article, FAQ, Product, LocalBusiness, BreadcrumbList
14. **EEAT scored checklist** — Trust & Authority tab in technical SEO
15. **Technical audit depth additions** — all new issue types from gaps register
16. **SEO decision tree** — "Diagnose This Page" button
17. **Weekly priority stack** — data-driven task list
18. **Page-level GSC attribution** — wiring existing data to workspace sidebar
19. **Shopify companion app** — OAuth + embedded UI + one-click publish (non-negotiable for app store)
20. Credit system + Stripe billing (already working)

**Launch is done when:** A store owner can sign up, see their entire content strategy
as a visual funnel, understand exactly what to write and why, see their scores,
get a specific weekly action plan, and publish directly to their store.
The full picture. Not a stripped-down version.

---

## TECH STACK REFERENCE

| Layer       | Technology                                    |
| ----------- | --------------------------------------------- |
| Frontend    | React 18 + Vite + TypeScript                  |
| Routing     | React Router v6                               |
| Styling     | Tailwind CSS + shadcn/ui                      |
| State       | Zustand                                       |
| Database    | Supabase (Postgres)                           |
| Auth        | Supabase Auth (email + Google OAuth)          |
| Flow map    | React Flow (reactflow)                        |
| Editor      | Tiptap                                        |
| Charts      | Recharts                                      |
| Content AI  | GPT-4o-mini (OpenAI)                          |
| Strategy AI | Claude Haiku 4.5 (Anthropic)                  |
| SERP data   | Serper.dev                                    |
| Payments    | Stripe (direct) + Shopify Billing (app store) |
| Hosting     | TBD (Vercel recommended)                      |

---

_Sharkly — Shark Engine Optimization_
_"SEO made easy — for people who aren't SEO people."_

---

---

## CATEGORY 13 — SHOPIFY APP STORE COMPLIANCE

---

This is a critical technical and legal requirement.
Sharkly is an SEO SaaS with a Shopify integration — NOT a Shopify app that does SEO.
The Shopify app is a free connector only. All real functionality lives on sharkly.co.

### Launch

- [ ] **Shopify companion app (free connector)**
      The Shopify App Store listing is a free app that connects a merchant's store
      to their Sharkly account. It must provide genuine standalone value inside
      Shopify admin or Shopify will reject it.
      The app does NOT handle subscription billing — that goes through Stripe on sharkly.co.
      Required because: Shopify mandates all charges to merchants go through Shopify Billing API
      (20% revenue share, or 15% under $1M). Companion model routes primary revenue through
      Stripe where Shopify takes nothing.

- [ ] **Shopify OAuth authentication**
      Merchant installs free app from Shopify App Store.
      App authenticates via Shopify OAuth.
      On auth: create or link Sharkly account, connect store to project in Sharkly.
      Redirect merchant to sharkly.co to complete setup and choose a paid plan.

- [ ] **Lightweight embedded UI in Shopify admin**
      Shopify requires the app to have real functionality inside the admin — not just
      redirect to an external site. Build embedded UI using Shopify App Bridge.
      Embedded screens (minimal, functional):
  - Connection status (store connected / not connected to Sharkly)
  - Active cluster summary — which cluster is in progress, % complete
  - Content publish queue — articles ready to publish, one-click publish button
  - Link to open full Sharkly dashboard (opens sharkly.co in new tab)
    This satisfies Shopify's standalone value requirement while keeping the real
    product on sharkly.co.

- [ ] **Store data sync via Shopify API**
      When store is connected: pull store data into Sharkly project automatically.
      Data pulled:
  - Store name, primary domain, store description
  - Product list (title, description, handle, category)
  - Collection list (title, description, handle)
  - Existing blog posts (title, handle, published status)
  - Sitemap URLs
    Used for: pre-populating strategy with product/collection opportunities,
    product description rewriter, collection page optimizer, content audit.

- [ ] **Direct publish to Shopify blog**
      From Sharkly workspace: publish article directly to Shopify blog with one click.
      Map Sharkly content fields to Shopify Article API fields.
      Set: title, body_html, tags, author, published status, SEO meta fields.
      Show publish status in workspace (draft / scheduled / published).

### Launch

- [ ] **Shopify Billing API (mirror tiers)**
      For merchants who prefer to manage billing inside Shopify:
      Mirror all four Sharkly tiers through Shopify Billing API as RecurringApplicationCharge.
      Same prices as sharkly.co. Shopify revenue share factored into margin for this channel.
      Overage top-ups via UsageCharge API.
      This is optional — primary billing still through Stripe on sharkly.co.

- [ ] **Shopify product description bulk publisher**
      After rewriting product descriptions in Sharkly: push updated descriptions
      back to Shopify product records via Shopify Admin API.
      Bulk update — select multiple products, push all at once.
      Preview changes before confirming push.

- [ ] **Shopify collection page publisher**
      After generating collection page SEO copy in Sharkly: push to Shopify
      collection body_html field via API.
      Preview before publishing.

- [ ] **Shopify app listing requirements**
      App must meet all Shopify app review requirements:
  - Privacy policy URL
  - App icon (1024x1024)
  - App listing screenshots (min 3)
  - Detailed app description explaining standalone value
  - Support email
  - GDPR webhook endpoints (customer data request, customer erasure, shop erasure)
  - App must not iframe sharkly.co directly — must use App Bridge for embedded UI

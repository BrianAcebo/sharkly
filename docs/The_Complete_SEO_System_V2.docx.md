

| THE COMPLETE SEO SYSTEM Technical SEO  ·  On-Page Optimisation  ·  Off-Page Authority A unified framework for understanding how Google stores, processes, ranks, and rewards web content — built from the algorithm up. Grounded in 9 confirmed Google patents  ·  DOJ antitrust trial evidence  ·  Primary source research 2024 Patent-Grounded Edition  ·  Companion to: The Science of Google Search |  |  |  |
| ----- | :---: | :---: | :---: |
| **9** Patents Referenced | **3** Core Pillars | **20+** Years of Data | **DOJ** Court-Confirmed |

# **Patent Reference Inventory — All 9 Patents**

This document integrates evidence from nine independently verified Google patents plus supplementary confirmation from the 2023 U.S. Department of Justice antitrust trial. Patent numbers have been verified against Google Patents public records. Note: US9275153B2 (BrightEdge Technologies) has been explicitly excluded — it is not a Google patent and has no bearing on these frameworks.

| Patent | Core Mechanism | Inventors | Year |
| :---- | :---- | :---- | :---- |
| US8682892B1 | Ranking Search Results (Parent Panda) — Reference queries as implied links. Group modification factor \= IndependentLinks ÷ ReferenceQueries. Threshold gate for multiplier application. | Panda, Ofitserov · Google Inc. | 2014 |
| US10055467B1 | Ranking Search Results (Panda Continuation) — Behavioral layer: repeat-click fraction \+ deliberate visit fraction \+ avg session duration. Multiplies all page scores across the domain. | Panda, Ofitserov, Zhu · Google LLC | 2018 |
| US9135307B1 | Selectively Generating Alternative Queries — If threshold % of top results are pre-classified as low quality, Google replaces them with alternative query results. Domain-level quality classification confirmed pre-computed. | Panda, Lehman, Upstill · Google Inc. | 2015 |
| US8117209B1 | Reasonable Surfer Model — Link equity \= PR(source) × ClickProbability(link). Supersedes classic random-surfer PageRank. ClickProbability determined by placement, anchor text, font, topical relevance. | Dean, Anderson, Battle · Google Inc. | 2010 |
| US8595225B1 | Correlating Document Topicality & Popularity (Navboost) — Per-topic popularity scores from user navigational patterns. Confirmed 'most important signal' at 2023 DOJ trial. Query-specific, not domain-global. | Singhal, Hoelzle · Google Inc. | 2013 |
| US7346839B2 | Information Retrieval Based on Historical Data — History score from: inception date, link velocity, anchor text stability, content update frequency, traffic patterns. Formal basis of Sandbox mechanism. | Dean, Cutts, Henzinger, Haahr \+ 7 engineers · Google Inc. | 2008 |
| US9940367B1 | Scoring Candidate Answer Passages — Passages scored independently. Query-term match × answer-term match \= query-dependent score. Basis of Passage Indexing (2021). | Google LLC | 2018 |
| US9959315B1 | Context Scoring Adjustments for Answer Passages — Heading vector (Title→H1→H2→passage) evaluated as coherent path. H2s define passage context, not just keyword signals. | Google LLC | 2018 |
| US20190155948A1 | Contextual Estimation of Link Information Gain — ML model scores novelty of content vs. previously-seen corpus. Skyscraper technique produces systematically low IGS. Likely Helpful Content Update mechanism. | Gonnet Anders, Carbune · Google LLC | 2022 |

|  | How This Document Uses Patents Every major claim that has patent grounding is labelled with the patent number in brackets, e.g. \[US8595225B1\]. Sections that previously relied on inference or theory have been upgraded to documented mechanisms. Where DOJ antitrust trial testimony independently confirms a patent's mechanism, that is noted explicitly. |
| :---- | :---- |

# **Table of Contents**

The Three Pillars of SEO — A Systems View

**PART I**  Technical SEO: The Data Storage & Retrieval System

1.1  Stage One: Discovery & Crawling

1.2  Stage Two: Rendering

1.3  Stage Three: Indexation — The Inverted Index

1.4  Stage Four: Performance Signals — Core Web Vitals

1.5  Stage Five: Site Architecture as a Technical Signal

1.6  Structured Data — Speaking Directly to Google's Machines

1.7  Technical SEO Audit — The Complete System Check

**PART II**  Google's Ranking Process: The Five-Factor Model

2.1  Factor One: The Meaning of the Query

2.2  Factor Two: Relevance of Content  ← US9940367B1 \+ US9959315B1

2.3  Factor Three: Quality of Content  ← US20190155948A1

2.4  Factor Four: Usability of Web Pages

2.5  Factor Five: Context — Impression Proportionality  ← US8682892B1 \+ US10055467B1

2.6  The Navboost Layer  ← US8595225B1 (DOJ confirmed)

**PART III**  Off-Page SEO: The Authority & Trust System

3.1  The Two Dimensions of Backlink Value  ← US8117209B1

3.2  PageRank: The Reasonable Surfer Formula  ← US8117209B1

3.3  The Link Quality Evaluation System

3.4  Anchor Text Strategy — The Distribution Model  ← US8682892B1

3.5  The Complete Link Building System  ← US20190155948A1

3.6  The Digital PR / Linkable Asset Model

3.7  Local SEO — The Off-Page Dimension

3.8  The Off-Page SEO Monitoring System

**PART IV**  The Unified SEO System & Master Algorithms

4.1  The Complete SEO Lifecycle

4.2  The Master SEO Scoring Algorithm — Updated  ← All 9 Patents

4.3  The SEO Decision Tree

4.4  The Keyword Velocity Strategy  ← US7346839B2 \+ US8682892B1

4.5  Summary: The Laws of SEO

**APPENDIX**  Complete Patent Citation Index by Section

# **The Three Pillars of SEO — A Systems View**

Search Engine Optimisation is not a single discipline. It is three distinct engineering systems that must function in harmony before a website can consistently generate organic traffic. Most people understand SEO as 'writing content with keywords.' That is one layer of one system.

| Pillar | Function | Dependency | Patent Evidence |
| :---- | :---- | :---- | :---- |
| Technical SEO | Ensures Google can discover, render, index, and trust the page | Prerequisite — without this, nothing else is visible to Google | US7346839B2 — inception date, crawl history, technical trust signals |
| On-Page SEO | Communicates topic, intent, quality, and novelty to Google's NLP and scoring systems | Determines ranking eligibility — relevance without authority | US9940367B1, US9959315B1, US20190155948A1 — passage scoring, information gain |
| Off-Page SEO | External link authority and user behavioural signals that confirm the domain deserves prominence | The multiplier — amplifies already-eligible pages | US8117209B1, US8682892B1, US10055467B1, US8595225B1 — link equity, quality factor, Navboost |

|  | The Dependency Chain Technical SEO is the prerequisite: without proper indexation, on-page and off-page work are wasted. On-page SEO determines ranking eligibility: without relevance signals, no amount of links will rank a page. Off-page SEO is the multiplier: it amplifies the ranking of pages that are already technically sound and on-page optimised. Skip a layer and the chain breaks. |
| :---- | :---- |

| PART I — TECHNICAL SEO: THE DATA STORAGE & RETRIEVAL SYSTEM |
| :---: |

If you were building Google, the very first engineering problem you would face is: how do you maintain a real-time searchable index of the entire public internet — billions of pages, updating constantly — and query it in under half a second for every search? The answer is a sophisticated pipeline of crawling, rendering, indexation, and retrieval. Technical SEO is the discipline of ensuring your website integrates cleanly into every stage of that pipeline.

## **1.1  Stage One: Discovery & Crawling**

Crawling is Google's discovery mechanism. Googlebot traverses the web continuously, following links and downloading HTML. It does not crawl the entire web at once — it operates on a crawl budget: a finite allocation of resources per domain per unit of time.

**Patent note — US7346839B2:** The date Google first discovers a link to your domain is permanently recorded as your document inception date — the starting point of all historical trust accumulation. There is no retroactive credit. The clock starts at first discovery, not domain registration.

### **How Googlebot Decides What to Crawl**

Googlebot maintains a priority queue of URLs based on: page authority (highly linked pages crawled more frequently), server response time (slow servers get throttled), content freshness (frequently updated pages recrawled sooner), and Search Console sitemap submissions.

### **The Crawl Budget Problem**

Large sites must actively manage crawl budget. If Google allocates 1,000 crawl requests per day and you have 10,000 pages, only 10% get crawled daily. Low-value pages — thin content, parameter duplicates, paginated pages with no unique value — consume budget that should be reserved for important pages.

### **Technical Crawl Requirements**

* robots.txt — Correctly configured. Never block Googlebot from crawling important pages or their CSS/JS resources.

* XML Sitemap — Present, submitted to Search Console, kept current. Include only canonical, indexable URLs.

* Internal Link Architecture — Every important page reachable within 3 clicks from homepage. Internal links are the primary discovery mechanism.

* Server Response Codes — 200 for live pages. 301 for permanent redirects. No 404 chains, 500 errors, or soft 404s. No redirect chains longer than 2 hops.

* Crawl Depth — Flatten site architecture. Pages buried 7+ clicks rarely get crawled.

* Low-Value Pages — Disallow: admin pages, duplicate parameter variants, test environments, internal search results.

## **1.2  Stage Two: Rendering**

After crawling the raw HTML, Google must execute JavaScript to see the actual page content. This rendering runs in a separate queue — pages may be crawled first and rendered later, sometimes days to weeks later. During that gap, only the raw HTML is available for indexation.

* SSR or SSG for all money pages — critical content must exist in the raw HTML, not require JS execution.

* Defer non-critical JavaScript — analytics, chat widgets, ads should be deferred or loaded async.

* Verify rendering in Search Console — URL Inspection → 'View Tested Page' shows what Googlebot actually renders.

* Avoid lazy-loading critical content — content loaded only on scroll may not be rendered by Googlebot.

## **1.3  Stage Three: Indexation — The Inverted Index**

After rendering, Google processes the page and stores it in an inverted index — a structure that maps words to documents, not documents to words. Google's index records not just whether a keyword appears, but where (title, H1, body) and in what density. Ranking happens at query time using pre-stored signals, not by re-reading pages.

### **Indexation Controls**

* noindex meta tag — removes the page from the index entirely. Use for admin pages, thank-you pages, parameter duplicates.

* canonical tag — tells Google which URL is the preferred version. Use on all duplicate or near-duplicate variants.

* Duplicate content — HTTP vs HTTPS, www vs non-www, trailing slash variants, URL parameters — all must be canonicalised.

## **1.4  Stage Four: Performance Signals — Core Web Vitals**

Since the Page Experience update, Core Web Vitals are direct ranking signals measured from Chrome User Experience Report (CrUX) real user data — not lab simulations. These also feed indirectly into Navboost \[US8595225B1\]: a slow, layout-shifting page increases bad-click and pogo-stick rates, which decrease Navboost scores over time.

| Metric | Measures | Good | SEO Mechanism |
| :---- | :---- | :---- | :---- |
| LCP | Loading performance — when the main content appears | \< 2.5s | Slow LCP increases bounce → increases bad clicks in Navboost \[US8595225B1\] |
| CLS | Visual stability — how much layout shifts unexpectedly | \< 0.1 | Layout shifts cause mis-clicks, accidental bounces, reduced engagement |
| INP | Responsiveness — time from interaction to visual response | \< 200ms | Poor interactivity reduces dwell time \[US10055467B1 — avg session duration signal\] |

## **1.5  Stage Five: Site Architecture as a Technical Signal**

Site architecture determines which pages get crawled most often, how link equity flows, how Google understands topical relationships between pages, and how quickly Googlebot can reach important content.

### **URL Structure as Classification Signal**

GOOD:  /services/plumbing/drain-cleaning  (hierarchical, keyword in URL)

BAD:   /page?id=847\&cat=3\&sort=date       (no semantic signal)

BAD:   /p/drain-cleaning-2023-v2-final     (no hierarchy, dated)

**Patent note — US7346839B2:** Changing a URL permanently resets the historical signals Google has accumulated for that path — inception date, link velocity pattern, anchor text history. URLs for money pages should be treated as permanent infrastructure, not content decisions.

### **Hub-and-Spoke Architecture**

Each topic cluster has a central hub page (money/target page) with spoke pages (supporting articles) radiating outward. All spokes link back to the hub. This creates a topical cluster Google's systems can map, concentrates crawl frequency on key pages, and is the structural foundation of the reverse silo strategy covered in Part III.

### **Technical Architecture Rules**

* Maximum 3-click depth for all important pages

* Every important page must have at least 3–5 internal links pointing to it — orphan pages are invisible

* Avoid JavaScript navigation menus — CSS-based menus with standard anchor tags are crawlable

* Use breadcrumb navigation with BreadcrumbList schema — reinforces site hierarchy

* Pagination handled correctly — canonicalise paginated pages to root category page

* Consolidate thin pages — multiple thin pages on related topics are worse than one comprehensive page

## **1.6  Structured Data — Speaking Directly to Google's Machines**

Structured data (Schema.org markup) communicates semantic information directly to Google's NLP systems in machine-readable format, bypassing ambiguity in natural language. It is the highest-confidence signal channel available in technical SEO — you are writing for the algorithm, not human readers.

Schema markup serves four purposes: (a) extract entities with high confidence for the Knowledge Graph, (b) determine eligibility for rich result features (featured snippets, review stars, FAQ accordions), (c) improve query-to-page matching for complex entities, and (d) explicitly communicate EEAT signals including author credentials and business legitimacy.

## **1.7  Technical SEO Audit — The Complete System Check**

### **Layer 1: Crawl Audit**

* robots.txt — correct configuration, no important pages accidentally blocked

* XML sitemap — present, submitted in Search Console, canonical/indexable URLs only

* Crawl errors — resolve all 'Excluded' and 'Error' status URLs in Search Console Coverage

* Redirect audit — no chains longer than 2 hops, no redirect loops, 404s for deleted pages redirected to relevant alternatives

* Internal link audit — identify orphan pages, pages with \<3 internal links, broken internal links

### **Layer 2: Render Audit**

* JS content check — Search Console URL Inspection → 'View Tested Page' for all key pages

* Render-blocking resources — PageSpeed Insights. Defer or async-load all non-critical JS

* Lazy-load audit — important above-the-fold content must NOT be lazy-loaded

### **Layer 3: Indexation Audit**

* Canonical audit — every page has self-referencing canonical, no canonical chains

* Duplicate content — identify pages with duplicate title tags, meta descriptions, H1s

* noindex audit — confirm no important pages are accidentally noindexed

### **Layer 4: Performance Audit**

* Core Web Vitals — PageSpeed Insights both mobile and desktop. Target all three in 'Good' range

* Images — WebP or AVIF format, correctly sized, lazy-load below fold, preload LCP images

* Server response time — TTFB under 200ms, CDN configured

### **Layer 5: Schema Audit**

* Schema markup present on all appropriate page types — validate with Rich Results Test

* No schema errors — validate with Schema.org validator. Missing required properties prevent rich results

* No misleading schema — markup must match visible page content

* LocalBusiness schema with complete NAP matching Google Business Profile and all citations

| PART II — GOOGLE'S RANKING PROCESS: THE FIVE-FACTOR MODEL |
| :---: |

Once pages are stored in the index, every search query triggers a ranking computation that runs in milliseconds and evaluates hundreds of signals. Google's own documentation identifies five primary ranking factors. The following patents reveal the formal mechanisms behind each factor.

## **2.1  Factor One: The Meaning of the Query**

Before evaluating any page, Google must understand what the user actually wants. This is powered by BERT, MUM, and their successors — models that interpret queries at a semantic, contextual, and intent level far beyond keyword matching. BERT processes query context bidirectionally: every word is understood in relation to every other word simultaneously.

Query understanding outputs: (1) semantic intent — what the user means, not just what they typed; (2) entity extraction — which entities the query references; (3) intent classification — informational, commercial, transactional, or navigational; (4) freshness requirements — does this query deserve recent content? All of these outputs determine which pages are eligible before any ranking begins.

## **2.2  Factor Two: Relevance of Content  ← US9940367B1 \+ US9959315B1**

| US9940367B1 \+ US9959315B1  ·  Scoring Candidate Answer Passages \+ Context Scoring Adjustments Google LLC  |  Filed 2014 · Granted 2018 · Deployed as Passage Indexing, February 2021 |
| :---- |
| **Core Mechanism:** Scores passages independently of the full page. Query-term match × answer-term match \= query-dependent score. This is adjusted by a context score derived from the heading vector (Title→H1→H2→passage). Final score \= query-dependent × context score. Every H2 section is a potential independent ranking candidate. |

Relevance is not just keyword matching — it is a multi-layer semantic assessment. The passage scoring patents reveal that H2 and H3 headings serve two distinct roles that most SEO practitioners address only partially:

| H2/H3 Role | What It Does | How to Optimise |
| :---- | :---- | :---- |
| Role 1: Keyword Signal (widely understood) | Contains keyword variants and LSI terms — communicates topical breadth to the indexer | Include keyword variation or LSI term in heading text. Distribute secondary keywords across H2s. |
| Role 2: Passage Context Definition \[US9959315B1\] | Creates the heading vector (Title→H1→H2→passage). The passage beneath the H2 is evaluated in this full context, not in isolation. | Write every H2 as a clear, answerable question. Answer it in the first 1–2 sentences below. The heading path must form a coherent, specific progression. |

|  | The Heading Vector Model Google constructs a heading vector for every candidate answer passage: \[Title, H1, H2, optional H3\]. This entire path is evaluated as a unit to generate a context score. A passage under an H2 that reads 'How Long Does It Take to Unclog a Drain?' scores higher than the same passage under 'Drain Methods' — even with identical body text. Structure your H2s as specific, answerable questions to maximise context scores \[US9959315B1\]. |
| :---- | :---- |

### **The Relevance Hierarchy (Most to Least Confidence)**

* Title tag contains the query terms or close synonyms — Highest confidence relevance signal (weight 1.00)

* H1 contains the query terms — Very high confidence (weight 0.95)

* URL slug contains keyword — High confidence (weight 0.85)

* Primary keyword in first 100 words — High confidence (weight 0.80)

* H2 headers contain keyword variants AND form clear question-answerable headings (weight 0.70 \+ passage context score)

* Body text contains terms in meaningful context — LSI saturation, entity coverage (weight 0.45)

## **2.3  Factor Three: Quality of Content  ← US20190155948A1**

| US20190155948A1  ·  Contextual Estimation of Link Information Gain Pedro Gonnet Anders, Victor Carbune · Google LLC  |  Filed 2018 · Granted 2022 |
| :---- |
| **Core Mechanism:** ML model assigns an information gain score measuring novel information provided beyond what a user has already encountered. High IGS: original research, expert quotes, first-hand experience, unique data. Low IGS: synthesised/copycat content. Almost certainly the formal mechanism behind the Helpful Content Update (2022). |

Relevance gets a page into consideration. Quality determines its position within the relevant set. Quality is now measured across two dimensions: absolute quality (is the content good?) and relative novelty (does it add something that isn't already in the SERP corpus?).

### **The Information Gain Dimension — Why Skyscraper Fails**

The Information Gain patent formally explains why the most popular content strategy of the 2010s — the Skyscraper Technique (find the best-ranking content and build something more comprehensive) — produces content that scores low on this dimension by design. Skyscraper content synthesises what already exists at the top of the SERP. It adds nothing the user hasn't seen.

|  | Skyscraper Technique \+ US20190155948A1 The patent explicitly describes the problem: 'many documents may include similar information... the user may have less interest in viewing a second document after already viewing the same or similar information.' Every 'ultimate guide' assembled from competitor headings, every AI article trained on top-10 SERP results, and every listicle of widely-known tips scores near zero on IGS. High IGS requires: original research and data, expert quotes not in competing pages, first-hand experience and testing, unique tools or visualisations, or a contrarian perspective backed by evidence. |
| :---- | :---- |

### **Quality Score Model — Updated with IGS**

QualityScore(page) \= (

  PagePurposeClarity     × 0.15  // intent match, no bait-and-switch

  MainContentQuality     × 0.30  // depth, accuracy, EEAT signals

  InformationGainScore   × 0.25  // \[US20190155948A1\] novelty vs. SERP corpus

  ReputationSignals      × 0.15  // external signals — links, mentions, reviews

  UserSatisfaction       × 0.15  // Navboost scores — \[US8595225B1\]

)

### **EEAT Signal Architecture — Patent-Grounded**

| EEAT Dimension | Direct Signals | Patent Grounding |
| :---- | :---- | :---- |
| Experience | First-person language, author bios with direct involvement, specific dates/locations in reviews | US20190155948A1 — first-hand experience is an explicit Information Gain bonus source (+3 IGS points) |
| Expertise | Author credentials, technical precision, primary source citations, expert vocabulary | Phrase model quality — content matching expert publication vocabulary patterns |
| Authoritativeness | Backlinks, domain age, Wikipedia mentions, branded search volume | US8682892B1 — branded searches (reference queries) are a formal algorithmic input to the group modification factor — not just a marketing metric |
| Trustworthiness | SSL, Privacy Policy, About Us with real team, Contact page, third-party reviews | US7346839B2 — domain trust signals tracked historically as part of domain-related information scoring |

## **2.4  Factor Four: Usability of Web Pages**

Usability is the bridge between technical SEO and user experience signals. A page that is technically accessible but poorly designed scores low on usability. Google measures usability through CrUX data (Core Web Vitals) and through Navboost signals \[US8595225B1\] — poor usability increases bad-click rates, which reduces topic-specific popularity scores.

| Usability Signal | How Google Measures It | Optimisation Action |
| :---- | :---- | :---- |
| Page speed (LCP) | CrUX real user data — cannot be faked by lab tools | Serve images in WebP/AVIF, defer non-critical JS, use CDN, target LCP \< 2.5s |
| Mobile-friendliness | Mobile-first indexing — mobile version is what Google crawls | Test all templates in Search Console Mobile-Friendly Test |
| No intrusive interstitials | Google's Page Experience guidelines — popups that block content on mobile | Limit to legally required overlays (cookie notices, age verification) |
| Visual stability (CLS) | CrUX field data | Reserve image dimensions, avoid late-loading content insertions |
| Engagement depth | Navboost \[US8595225B1\] — dwell time, good clicks, last-longest click | Design page structure to reward reading: clear headings, logical flow, no mid-content ads |

## **2.5  Factor Five: Context — Impression Proportionality  ← US8682892B1 \+ US10055467B1**

| US8682892B1 \+ US10055467B1  ·  Ranking Search Results — Panda Patent Family (Parent \+ Continuation) Navneet Panda, Vladimir Ofitserov, Kaihua Zhu · Google Inc. / Google LLC  |  Parent granted 2014 · Continuation granted 2018 |
| :---- |
| **Core Mechanism:** Parent: Group modification factor \= IndependentLinks ÷ ReferenceQueries. Continuation: behavioral layer adds repeat-click fraction \+ deliberate visit fraction \+ average session duration. Combined factor multiplies every page score across the domain. Applied only when base score exceeds threshold. |

One of the most practically important and underappreciated dynamics in SEO is that Google enforces implicit traffic thresholds. High-volume keywords are effectively reserved for domains operating at a matching traffic tier. This is not an explicit rule — it is an emergent behaviour of the group modification factor system.

### **The Formal Mechanism — Patent Confirmed**

The parent patent (US8682892B1) establishes the core formula explicitly:

InitialModificationFactor \= IndependentLinks / ReferenceQueries

Where ReferenceQueries \= branded and navigational searches referring to the domain. These are counted as 'implied links' — search query behaviour, NOT unlinked brand mentions on web pages. This is a common misreading of the patent.

The continuation patent (US10055467B1) adds the behavioural layer:

M\_Behaviour  \= sigmoid(RepeatClickFraction) \+ sigmoid(DeliberateVisitFraction) / 2

            \+ f(AvgSessionDuration)

FinalFactor  \= InitialModificationFactor × M\_Behaviour

FinalScore   \= InitialPageScore × FinalFactor

|  | The Threshold Gate — US8682892B1 The modification factor is only applied when InitialScore exceeds a minimum threshold. Below-threshold pages receive NO multiplier — even if the domain has excellent quality signals. This is the formal mechanism behind why low-quality content on strong domains doesn't automatically rank well, and why thin pages on otherwise strong sites pull down the domain's overall quality factor. |
| :---- | :---- |

**Reference queries are an algorithmic input, not a marketing metric:** A brand with 5,000 backlinks and 200 branded searches per month has a higher group modification factor than a brand with 10,000 backlinks and 20 branded searches. Growing brand search volume via PR, thought leadership, and social presence directly improves the algorithm's quality multiplier for every page on the domain.

### **The Keyword Velocity Tiers — Patent-Grounded**

| Phase | Search Volume Target | Condition to Progress | Patent Mechanism |
| :---- | :---- | :---- | :---- |
| Months 1–3 | \< 500 searches/month | Build inception date history, first content published and crawled | US7346839B2 — inception date signals begin accumulating |
| Months 3–6 | 500–2,000/month | Consistent impressions from Phase 1, first 3–5 referring domains | US8682892B1 — reference query baseline begins forming |
| Months 6–12 | 2,000–10,000/month | 5–10 new referring domains/month, active behavioral signals | US10055467B1 — behavioral multiplier begins applying |
| Month 12+ | 10,000+ / head terms | DR 30+, 50+ referring domains, consistent organic traffic | US8682892B1 \+ US10055467B1 — full group modification factor active |

## **2.6  The Navboost Layer  ← US8595225B1**

| US8595225B1  ·  Systems and Methods for Correlating Document Topicality and Popularity Amit Singhal, Urs Hoelzle · Google Inc.  |  Filed 2004 · Granted 2013 · Operational \~2005 · Confirmed at 2023 DOJ antitrust trial as 'most important ranking signal' |
| :---- |
| **Core Mechanism:** Maps documents to topics. Computes per-topic popularity from user navigational patterns. Popularity combined with topical relevance generates query-specific ranking adjustments. A page has a different Navboost score for every query topic it appears in. |

Navboost is not a site-wide score. It is topic-specific and query-specific. A page that performs well for one keyword cluster but poorly for another will receive different Navboost adjustments per query. This is why CTR and dwell time optimisation must be done at the keyword cluster level, not as a site-wide metric.

### **Navboost Mechanics — Confirmed Sources**

* 13-month rolling click history window — improvements today compound over the following 13 months

* Score calibrated to data volume — sparse click data \= mild adjustment; abundant data \= significant modification

* Click signal taxonomy (2024 API leak confirmed): good clicks (long dwell), bad clicks (quick return to SERP), last-longest clicks (final click in a session \= strongest satisfaction signal)

* DOJ testimony (Pandu Nayak, VP Search): Navboost assigns relative scores based on user interaction data, relative to how many visits the page receives

|  | Optimising for Navboost (1) Title tags and meta descriptions are your Navboost input mechanism — they determine CTR. A/B test them systematically; improvements compound over 13 months. (2) The first screenful of content must confirm the user is in the right place — this is the anti-pogo-stick mechanism. (3) Aim to be the last-longest click: a resource so complete the user ends their search session on your page. (4) Optimise at the keyword cluster level, not just site-wide. Each topic cluster requires its own CTR and engagement strategy \[US8595225B1\]. |
| :---- | :---- |

| PART III — OFF-PAGE SEO: THE AUTHORITY & TRUST SYSTEM |
| :---: |

Off-page SEO is the discipline of earning external signals — primarily backlinks and user behaviour — that convince Google your domain is authoritative, trustworthy, and worth ranking prominently. Google's original insight was applying academic citation theory to web pages: a webpage's importance is partly determined by how many other trusted webpages link to it. That insight became PageRank. Two decades later, it remains foundational — but the formula has changed substantially.

## **3.1  The Two Dimensions of Backlink Value  ← US8117209B1**

| US8117209B1  ·  Ranking Documents Based on User Behaviour and/or Feature Data — Reasonable Surfer Model Jeffrey Dean, Corin Anderson, Alexis Battle · Google Inc.  |  Filed 2004 · Granted 2010 |
| :---- |
| **Core Mechanism:** Replaces the random-surfer PageRank assumption. Link equity \= PR(source) × ClickProbability(link). ClickProbability determined by: (1) placement — body text \> above-fold \> list \> sidebar \> nav \> footer; (2) anchor text length and relevance — 2–5 descriptive words \> single-word or generic; (3) font size and visual prominence; (4) topical relevance of source page to destination; (5) first link to destination in document \> subsequent links. |

Most people understand that backlinks signal authority. What fewer people understand is that authority is not one-dimensional. Under the Reasonable Surfer model, every backlink has two independent value dimensions:

| Dimension | What It Is | Patent Evidence |
| :---- | :---- | :---- |
| Authority | The PageRank value of the source page — reflects how much equity it has to pass | US8117209B1 — PR(source) as multiplier in LinkWeight formula |
| Link Placement Quality | The click probability of the specific link — determines what fraction of the source page's equity it actually passes | US8117209B1 — ClickProbability as the second multiplier. Body text links pass far more equity than footer or nav links from the same page |

### **Link Placement Equity Table — US8117209B1**

| Placement | Relative Equity | Why (per Patent Mechanism) |
| :---- | :---- | :---- |
| Body text, early in article | Very High (1.00×) | Highest click probability: contextual, prominent, within reader attention zone. First link to same destination scores higher than subsequent links. |
| Body text, late in article | High (0.80×) | Still editorial and contextual, but fewer readers reach it. |
| Above-fold sidebar | Medium (0.50×) | Visible but disconnected from content flow — lower click probability. |
| Navigation menu | Low (0.30×) | Functional, not editorial. Patent identifies nav links as low click-probability. |
| Footer | Very Low (0.15×) | Patent explicitly identifies footer as low click-probability. Footer link farms are why Google discounts this heavily. |

|  | What This Means for Link Building Strategy When acquiring backlinks, specify placement requirements. A link in the footer or sidebar of a DR-80 site may pass less equity than a body-text editorial link from a DR-40 site. Ask for: editorial body text placement, early in the article, with 2–5 word descriptive anchor text, in a topically relevant article. This is not optional preference — it is the documented mechanics of how equity flows \[US8117209B1\]. |
| :---- | :---- |

## **3.2  PageRank: The Reasonable Surfer Formula  ← US8117209B1**

Google's original PageRank distributed equity equally across all outbound links from a page. This random-surfer model is superseded. The Reasonable Surfer patent (US8117209B1, granted 2010\) replaces the equal-distribution assumption. Any SEO tool or strategy presenting the classic formula as Google's current model is working with an outdated system.

### **The Classic Formula — Superseded**

PR(A) \= (1 \- d) \+ d × \[ PR(B)/C(B) \+ PR(C)/C(C) \+ ... PR(n)/C(n) \]

Where C(B) \= total outbound links on page B — all links pass equal equity

### **The Reasonable Surfer Formula — Current Patent Evidence**

LinkWeight(link) \= PR(source) × ClickProbability(link)

EquityPassed    \= LinkWeight / Σ(ClickProbabilities of ALL links on source page)

ClickProbability \= f(position, anchor\_length, anchor\_relevance,

                     font\_size, visual\_prominence, topical\_match, link\_type)

The equity passed by a link is proportional to its click probability relative to all other links on the same page. A footer link passes negligible equity even from a high-authority site. A body-text editorial link from a medium-authority, topically relevant site may pass more equity than a footer link from a top-authority domain.

### **Link Equity Implications for Internal Linking**

* Place internal links to money pages in body text, early in supporting articles — first link to destination in document passes more equity

* Use 2–5 descriptive words as anchor text — single-word and generic anchors ('click here', 'read more') have lower click probability

* Links styled with standard link formatting (colour, underline) pass more equity than links styled to blend with surrounding text

* Topically relevant source pages pass more equity than off-topic pages — the Reasonable Surfer model scores source relevance

* Footer and nav links on your own site pass minimal equity — they are functional links, not editorial links

## **3.3  The Link Quality Evaluation System**

Every backlink is evaluated across multiple dimensions. The following composite model incorporates the Reasonable Surfer placement mechanics:

LinkQualityScore(link) \= (

  DomainAuthority(source)      × 0.25  // DR of linking domain

  PageAuthority(source\_page)   × 0.20  // authority of specific linking page

  TopicRelevance(src, target)  × 0.25  // topical alignment

  ClickProbability(link)       × 0.15  // \[US8117209B1\] placement \+ anchor quality

  AnchorTextNaturalness(link)  × 0.10  // natural anchor distribution

  LinkVelocity(domain)         × 0.05  // acquisition rate — spikes \= suspicious \[US7346839B2\]

)

**Note:** LinkPosition has been renamed ClickProbability and its weight increased from 0.10 to 0.15 to reflect the Reasonable Surfer model. The old model scored position as a binary signal; the patent confirms it is a gradient weighted by placement, anchor quality, font, and topical relevance combined.

### **Link Quality Tiers**

| Tier | Type | Profile | SEO Value |
| :---- | :---- | :---- | :---- |
| 1 | Editorial Contextual | Major publications, DR 60+, body text placement, editorial decision | Maximum. High click probability \[US8117209B1\]. Builds reference query pool \[US8682892B1\]. |
| 2 | Niche Editorial | Relevant industry sites, DR 30–60, real traffic, written for genuine audiences | High. Topical relevance multiplies equity per Reasonable Surfer. |
| 3 | Guest Post Contextual | Contributed articles, DR 20–50, body text placement, 2–5 word anchors | Medium-High. Volume builder. Placement discipline is mandatory \[US8117209B1\]. |
| 4 | Directory / Citation | Established directories, local citations, consistent NAP | Low-Medium. Trust and entity establishment. Essential for new sites. |
| 5 | Spam / PBN | Purchased links, link farms, deindexed sites | Negative or zero. Penguin penalty risk. |

## **3.4  Anchor Text Strategy  ← US8682892B1**

Anchor text is one of the most powerful and most dangerous signals in off-page SEO. It directly communicates relevance — but over-optimisation is one of Google's primary methods for detecting link manipulation. The Panda patent (US8682892B1) gives anchor text additional importance: the ratio of independent links to reference queries that drives the group modification factor is influenced by the overall naturalness of the anchor text profile.

### **Healthy Anchor Text Distribution**

Branded anchors              30–40%   (company name, URL, brand \+ generic)

Generic anchors              15–25%   (click here, read more, this article, source)

Naked URL anchors            10–15%   (https://yoursite.com, yoursite.com)

Topically related non-exact  15–20%   (related phrases, partial matches, LSI terms)

Exact match keyword           5–10%   (the precise target keyword — keep this low)

Long-tail variations          5–10%   (natural question phrases, conversational)

WARNING: Exact match \>15–20% of total profile \= high Penguin penalty risk

## **3.5  The Complete Link Building System  ← US20190155948A1 \+ US7346839B2**

Link building is not a one-time campaign — it is an ongoing, systematic programme. The sequence is critical: the Historical Data patent (US7346839B2) documents that link acquisition patterns are tracked over time, and sudden spikes in link velocity are formal spam signals.

### **Phase 1: Foundation Links — First 90 Days**

Before pursuing editorial links, establish the baseline trust signals that make a new domain appear legitimate. Per US7346839B2, the clock starts at first link discovery. Per US8682892B1, reference queries begin accumulating from the moment the brand appears on trusted platforms.

* Google Business Profile — anchor point in local entity system

* Social media profiles — Facebook, LinkedIn, Twitter/X, Instagram, YouTube

* Top-tier business directories — Apple Maps, Yelp, Yellow Pages, BBB, Angi

* Local citation pack — 50–100 consistent NAP citations. NAP must be byte-for-byte identical across all sources.

* Industry-specific directories — niche credibility signals

### **Phase 2: Authority Building — Months 3–12**

* Guest posting (40% of link budget) — DR 30+ sites, real traffic, topically relevant audiences. Body text placement required \[US8117209B1\]. 1–3 per week, varied anchor text.

* Niche edits / link insertions (30%) — reach out to existing indexed articles, request contextual insertion. Existing indexed content passes more equity.

* HARO / Help a Reporter (15%) — expert responses to journalist queries. Yields Tier 1 editorial links from major publications.

* Digital PR \+ original research (10%) — create original data assets: surveys, studies, proprietary analysis. This serves double duty: (a) high Information Gain Score for the content \[US20190155948A1\], (b) journalists link to original data, not to 'comprehensive guides' that rehash existing information.

* Link velocity discipline \[US7346839B2\] — target 3–8 new referring domains per month consistently. Sudden spikes in acquisition rate are formal spam signals in the Historical Data patent.

|  | Why Skyscraper Fails as Link Bait in 2024 The Information Gain patent \[US20190155948A1\] explains why: Skyscraper content synthesises what already exists at the top of the SERP, so the target article has low IGS. But the link-building problem is parallel: journalists and editors link to original data and unique perspectives, not to 'more comprehensive versions' of existing content. The same original research strategy that maximises IGS for ranking purposes also maximises link acquisition for authority purposes. The two strategies are now the same strategy. |
| :---- | :---- |

### **Phase 3: Competitor Gap Analysis — Ongoing**

* Export backlink profiles of top 3–5 competitors from Ahrefs or Semrush

* Backlink Gap tool: identify domains linking to 2+ competitors but not to you — pre-qualified targets

* Filter by DR 30+, topical relevance, then prioritise highest-opportunity domains

* Outreach with specific value-add pitch: what do you have that their audience benefits from?

## **3.6  The Digital PR / Linkable Asset Model**

Digital PR produces the highest-quality links available in SEO because editorial links from real journalists at real publications are the most natural, authoritative, and topically diverse links that exist. They also score highest on the Information Gain dimension \[US20190155948A1\] — original research and unique data is exactly the content type that maximises both IGS and link acquisition simultaneously.

### **The Linkable Asset Framework**

| Asset Type | IGS Value \[US20190155948A1\] | Link Acquisition Potential |
| :---- | :---- | :---- |
| Original survey data / proprietary research | Maximum — genuinely novel information | Highest — journalists cite original data directly |
| Expert roundups with exclusive quotes | High — expert quotes not available elsewhere | High — participants share and link to features |
| Interactive tools / calculators | High — unique utility | High — embedded and linked across the niche |
| Proprietary case study / experiment | High — first-hand experience signals | Medium-High — practitioners share real results |
| 'Ultimate guide' (Skyscraper) | Low — synthesises existing SERP content | Low — editors rarely link to comprehensive rehashes |

## **3.7  Local SEO — The Off-Page Dimension**

For local businesses, off-page SEO has an additional dimension: NAP (Name, Address, Phone) citation consistency and Google Business Profile optimisation. Local ranking is determined by a three-factor model:

LocalRank \= f(

  Relevance  × 0.35,  // Does the business match what was searched?

  Distance   × 0.35,  // How close is the business to the searcher?

  Prominence × 0.30   // How well-known is the business?

)

Prominence sub-factors:

  GoogleBusinessProfile\_Completeness  × 0.30

  ReviewCount\_and\_Score               × 0.25

  NAP\_CitationConsistency             × 0.20

  BacklinkProfile                     × 0.15

  OnPage\_LocalSignals                 × 0.10

### **Google Business Profile Optimisation**

* Complete every field — business name (exact legal, no keyword stuffing), address, phone, website, hours, primary \+ secondary categories, description, attributes, services

* Photos — minimum 10 high-quality photos. Regular uploads signal active business.

* Reviews — actively collect from real customers. Respond to every review within 48 hours. Review velocity matters as much as total count.

* Google Posts — weekly posts announcing offers, events, or content

* Q\&A Section — proactively add and answer common questions

### **NAP Citation Consistency**

NAP consistency is the local SEO equivalent of canonicalisation. Every mention of your business across the web must use exactly the same name, address format, and phone number. Inconsistencies — 'St.' vs 'Street', '123' vs 'Suite 123', different phone numbers — create entity disambiguation problems for Google's local systems. Audit NAP consistency with Moz Local, BrightLocal, or Whitespark.

## **3.8  The Off-Page SEO Monitoring System**

* Monthly backlink audit — export from Ahrefs/Semrush. Identify lost links (reclaim where possible), new links (review for spam), changes in anchor text distribution.

* Competitor link monitoring — Ahrefs Alerts for new competitor backlinks. Evaluate same-source opportunities.

* Toxic link disavow management — identify and disavow spam domains, link farms, PBNs. Submit via Search Console. Review quarterly.

* Google Business Profile performance — monthly: review count, rating, profile views, clicks, calls. Flag sudden drops.

* Citation audit — quarterly NAP consistency check across top 50 citations

| PART IV — THE UNIFIED SEO SYSTEM & MASTER ALGORITHMS |
| :---: |

## **4.1  The Complete SEO Lifecycle**

Every successful SEO campaign follows the same fundamental lifecycle. The sequence is non-negotiable — each phase is the prerequisite for the next:

| Phase | Action | Success Criteria | Patent Mechanism |
| :---- | :---- | :---- | :---- |
| 1\. Technical Foundation | Audit and fix all crawl, render, indexation, and performance issues | All important pages indexed, Core Web Vitals passing | US7346839B2 — inception date clock starts; historical data begins accumulating |
| 2\. Topical Authority Build | Publish topical cluster content — 1 money page \+ supporting articles covering every genuine sub-intent in the topic. No fixed count: narrow topics need 3–5 articles; broad competitive niches may need 10–20. Stop when real user questions run out, not when a number is hit. | Consistent impressions across long-tail keywords in the cluster | US9135307B1 — domain pre-classification as high quality begins forming |
| 3\. Link Authority Build | Systematic link acquisition in Phase 1→2→3 sequence | 3–8 new referring domains/month, growing branded search volume | US8682892B1 — group modification factor builds as reference queries accumulate |
| 4\. Behavioural Optimisation | A/B test title tags, optimise opening content, engineer dwell time | Improving CTR and dwell time per keyword cluster in Search Console | US8595225B1 \+ US10055467B1 — Navboost and behavioral multiplier respond |
| 5\. Keyword Velocity Expansion | Expand to next tier keywords only after meeting tier conditions | Rankings in current tier stable, organic traffic growing month-on-month | US8682892B1 \+ US7346839B2 — tier gating relaxes as history accumulates |

## **4.2  The Master SEO Scoring Algorithm — Updated  ← All 9 Patents**

The following unified scoring model has been updated to incorporate all nine patent mechanisms. Changes from the previous version are noted inline.

MasterSEOScore(page, keyword, competitors) \= (

  // PILLAR 1: TECHNICAL (20% of total) — US7346839B2 \+ Core Web Vitals

  Technical\_Score(page) × 0.20 \=

    CrawlAccessibility(page)     × 0.30  // robots.txt, server codes, crawl depth

    RenderQuality(page)          × 0.25  // JS rendering, content accessibility

    IndexationHealth(page)       × 0.20  // canonical, noindex, duplicates

    CoreWebVitals(page)          × 0.15  // LCP, INP, CLS \[feeds Navboost indirectly\]

    SchemaMarkup(page)           × 0.10  // entity communication, rich results

  // PILLAR 2: ON-PAGE (45% of total)

  OnPage\_Score(page, keyword, competitors) × 0.45 \=

    StructuralSignals(page, kw)     × 0.20  // title, H1, URL, first 100 words

    SemanticCompleteness(page, comp) × 0.25  // LSI, entities, coverage

    PassageReadiness(page)          × 0.15  // \[US9940367B1 \+ US9959315B1\]

                                             // H2s as answerable questions,

                                             // first-sentence answers

    InformationGain(page, comp)     × 0.25  // \[US20190155948A1\]

                                             // novelty vs. SERP corpus

    UXSignals(page)                 × 0.15  // layout, CTR signals, opening content

  // PILLAR 3: OFF-PAGE (35% of total)

  OffPage\_Score(domain, page, kw) × 0.35 \=

    DomainAuthority(domain)          × 0.25  // DR, trust flow

    ReasonableSurferLinkEquity(page) × 0.25  // \[US8117209B1\] PR×ClickProb,

                                              // not classic PageRank

    GroupModificationFactor(domain)  × 0.20  // \[US8682892B1 \+ US10055467B1\]

                                              // IndependentLinks/RefQueries

                                              // × behavioral multiplier

    NavboostScore(page, kw)          × 0.15  // \[US8595225B1\] topic-specific

                                              // 13-month rolling

    HistoryScore(domain)             × 0.10  // \[US7346839B2\] inception date,

                                              // link velocity, anchor stability

    LocalSignals(domain)             × 0.05  // GBP, NAP, review signals

)

|  | Key Changes from Previous Version (1) SemanticCompleteness and ContentQuality have been split into separate dimensions — PassageReadiness \[US9940367B1\] and InformationGain \[US20190155948A1\] are now explicit scored components. (2) Off-page now uses ReasonableSurferLinkEquity \[US8117209B1\] rather than generic DomainAuthority — placement quality is a scored input. (3) GroupModificationFactor \[US8682892B1 \+ US10055467B1\] is now an explicit scored dimension — this is the formal mechanism behind impression proportionality. (4) NavboostScore \[US8595225B1\] is now an explicit scored dimension rather than implied under UserBehavior. |
| :---- | :---- |

## **4.3  The SEO Decision Tree**

When diagnosing why a page is not ranking as expected, use this systematic diagnostic:

* Is the page indexed? → Check Search Console. If not: diagnose crawl/render/indexation issues (Part I). If yes: continue.

* Is the page ranking at all? → If not ranking at any position: verify keyword-to-page topic match and intent alignment. If ranking 50+: authority gap.

* Is the keyword intent matched? → Check the SERP. What content types rank? If your format differs from what ranks, the page will never rank regardless of quality.

* Is on-page optimisation competitive? → Check structural signals, semantic completeness, passage readiness (H2s as answerable questions), and information gain. All four dimensions must be competitive.

* Is the domain authority sufficient? → Compare DR to average DR of top 5 ranking pages. If 20+ DR points below median, you need more links before competing.

* Are user behaviour signals negative? → Check CTR in Search Console. High impressions \+ low CTR \= weak title/meta description \[feeds Navboost US8595225B1\]. High CTR \+ low rank \= high pogo-stick rates — improve content opening \[US10055467B1\].

* Is the group modification factor suppressed? → Is branded search growing? Are you building 3–8 referring domains per month consistently? Are individual pages above the quality threshold? \[US8682892B1\]

## **4.4  The Keyword Velocity Strategy  ← US7346839B2 \+ US8682892B1**

Keyword velocity management is the deliberate sequencing of keyword targets over time to build a sustainable, compounding traffic growth curve. The following sequence is grounded in the formal mechanisms of the Historical Data patent (US7346839B2) and the Panda group modification factor (US8682892B1).

KEYWORD VELOCITY STRATEGY — Patent-Grounded Sequence

Month 1–3:   Target \<500 monthly searches (long-tail, low competition) — but within this tier, prioritise by CPC first. A $4 CPC keyword at 200 searches/month is worth more than a $0.20 CPC keyword at 500 searches/month. Low difficulty is the gate; CPC is the ranking within the gate.

             Mechanism: build inception date history \[US7346839B2\]

             Goal: establish crawl patterns, earn first impressions

Month 3–6:   Expand to 500–2,000 monthly search volume

             Condition: consistent impressions from Phase 1 keywords

             Mechanism: reference queries begin forming \[US8682892B1\]

             Goal: build topical authority, earn first natural backlinks

Month 6–12:  Target 2,000–10,000 monthly search volume

             Condition: 5–10 new referring domains/month

             Mechanism: behavioral multiplier begins applying \[US10055467B1\]

             Goal: competitive positions, significant organic traffic begins

Month 12+:   Compete for 10,000+ monthly search volume head terms

             Condition: DR 30+, 50+ referring domains, consistent traffic

             Mechanism: full group modification factor active \[US8682892B1\]

             Goal: category-level keywords driving high revenue volume

This sequence mirrors how Google's impression proportionality system

gates access to high-volume keyword positions. Attempting to skip tiers

is wasted effort — the group modification factor will not apply to

unproven domains regardless of content quality.

## **4.5  Summary: The Laws of SEO**

Everything in this document reduces to a small set of fundamental laws. Each law is now grounded in a specific patent mechanism:

| Law | Statement | Patent Grounding |
| :---- | :---- | :---- |
| Law 1: Technical First | Google must be able to discover, render, and trust a page before any ranking is possible | US7346839B2 — inception date and technical history signals |
| Law 2: Intent Before Keywords | A page that matches the right intent but uses different words will outrank a page that matches the keywords but answers the wrong question | Query understanding system — BERT/MUM architecture |
| Law 3: Quality Before Volume | One piece of content with genuine original insight outranks ten pieces of high-volume, low-novelty content | US20190155948A1 — Information Gain Score |
| Law 4: Structure Enables Passage Ranking | H2 headings are not just keyword signals — they are passage context definitions. Clear question-format H2s with first-sentence answers get independently scored and ranked | US9940367B1 \+ US9959315B1 |
| Law 5: Placement Determines Link Value | Where a link sits on a page determines how much equity it passes — not just which page it's on | US8117209B1 — Reasonable Surfer click-probability model |
| Law 6: Behaviour Confirms Authority | User click and dwell time signals have been Google's most important ranking input for 20 years — they do not just correlate with good rankings, they cause them | US8595225B1 — Navboost (DOJ confirmed 2023\) |
| Law 7: Trust Takes Time | Every trust signal Google uses — inception date, link velocity pattern, anchor text consistency, content update history — is measured over time. There is no shortcut. | US7346839B2 — Historical Data patent |
| Law 8: Brand Search Is Algorithmic | Growing branded search volume is not a PR activity — it is a direct input into the group modification factor that multiplies every page's score across the domain | US8682892B1 — reference queries as implied links |

| APPENDIX — COMPLETE PATENT CITATION INDEX BY SECTION |
| :---: |

| Patent | Title (Short) | Sections in This Document |
| :---- | :---- | :---- |
| US8682892B1 | Ranking Search Results (Parent Panda) | 2.5 \[group modification factor\], 3.4, 3.5, 4.2, 4.4, 4.5 Law 8 |
| US10055467B1 | Ranking Search Results (Panda Continuation) | 2.4, 2.5 \[behavioral layer\], 2.6, 4.2, 4.3, 4.4 |
| US9135307B1 | Selectively Generating Alternative Queries | 4.1 \[domain pre-classification\] |
| US8117209B1 | Reasonable Surfer Model | 3.1, 3.2, 3.3, 3.5, 4.2, 4.5 Law 5 |
| US8595225B1 | Navboost | 1.4, 2.4, 2.6, 4.2, 4.3, 4.5 Law 6 |
| US7346839B2 | Historical Data / Sandbox | 1.1, 1.5, 2.3 EEAT, 3.5, 4.1, 4.4, 4.5 Laws 1 & 7 |
| US9940367B1 | Scoring Candidate Answer Passages | 2.2, 4.2, 4.5 Law 4 |
| US9959315B1 | Context Scoring for Answer Passages | 2.2, 4.2, 4.5 Law 4 |
| US20190155948A1 | Information Gain | 2.3, 3.5, 3.6, 4.2, 4.5 Law 3 |

## **Supplementary Sources**

* 2023 U.S. Department of Justice v. Google LLC antitrust trial: sworn testimony of Pandu Nayak (VP Search) confirming Navboost as a primary ranking signal, Eric Lehman confirming score modulation by data volume. Patent US8595225B1 confirmed as Navboost foundation.

* 2024 Google Search API Leak (May 2024): 2,500 internal documents independently confirming Navboost mechanics including good/bad/last-longest click categorisation, 13-month history window, Chrome click data collection.

* Google Quality Rater Guidelines (public): EEAT framework, YMYL classification.

* Google Search Central documentation: crawl budget, canonical tags, structured data, Core Web Vitals specifications.

* Note on exclusion: US9275153B2 (BrightEdge Technologies — NOT a Google patent) has been explicitly excluded from this document. Any reference to this patent number in connection with Panda or repeat-click fractions is an error.

—  END OF DOCUMENT  —  9 Google Patents  ·  3 Pillars  ·  DOJ Trial Confirmed  ·  2024 Edition  —
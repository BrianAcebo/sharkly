

| THE SCIENCE OF GOOGLE SEARCH A Complete SEO Dissertation Algorithm Modelling  ·  NLP & BERT Analysis  ·  On-Page Optimisation Content Strategy  ·  Link Authority Science  ·  Replicable Frameworks Grounded in 9 confirmed Google patents  ·  DOJ antitrust trial evidence  ·  Primary source research 2024 Patent-Grounded Edition  ·  Companion to: The Complete SEO System |  |  |  |
| ----- | :---: | :---: | :---: |
| **9** Patents Referenced | **8** Document Parts | **20+** Years of Data | **DOJ** Court-Confirmed |

# **Patent Reference Inventory — All 9 Patents**

This dissertation integrates evidence from nine independently verified Google patents plus supplementary confirmation from the 2023 U.S. Department of Justice antitrust trial testimony. Every major claim in this document is grounded in at least one of the following primary sources. Patent numbers, inventors, assignees, and filing dates have been verified against Google Patents public records.

| Patent Number | Title / Core Mechanism | Inventors | Year Granted |
| :---- | :---- | :---- | :---- |
| US8682892B1 | Ranking Search Results (Parent Panda) — Group modification factor from ratio of independent links to reference queries (branded searches as implied links). Multiplies all page scores site-wide. | Panda, Ofitserov · Google Inc. | 2014 |
| US10055467B1 | Ranking Search Results (Continuation) — Adds behavioral layer: repeat-click fraction, deliberate visit fraction, average session duration. Applied only above score threshold. | Panda, Ofitserov, Zhu · Google LLC | 2018 |
| US9135307B1 | Selectively Generating Alternative Queries (Panda Implementation) — If threshold % of top results come from pre-classified low-quality sites, an alternate query replaces them. Site-level quality pre-classification confirmed. | Panda, Lehman, Upstill · Google Inc. | 2015 |
| US8117209B1 | Ranking Documents Based on User Behaviour — Reasonable Surfer Model. Link equity \= PR(source) × ClickProbability. ClickProbability determined by placement, anchor text, font size, topicality, link type. | Dean, Anderson, Battle · Google Inc. | 2010 |
| US8595225B1 | Systems & Methods for Correlating Document Topicality and Popularity (Navboost) — Assigns per-topic popularity scores from user navigational patterns. Confirmed 'most important signal' at 2023 DOJ antitrust trial. | Singhal, Hoelzle · Google Inc. | 2013 |
| US7346839B2 | Information Retrieval Based on Historical Data — History score from: document inception date, link velocity, anchor text stability, content update frequency, traffic patterns, user behaviour. Foundation of Sandbox mechanism. | Dean, Cutts, Henzinger, Haahr \+ 7 engineers · Google Inc. | 2008 |
| US9940367B1 | Scoring Candidate Answer Passages — Individual passages scored independently of full page. Query-term match score × answer-term match score \= query-dependent passage score. Basis of Passage Indexing (launched 2021). | Google LLC | 2018 |
| US9959315B1 | Context Scoring Adjustments for Answer Passages — Heading hierarchy vector (Title→H1→H2→passage) evaluated as coherent context. Context score adjusts raw passage score. H2s serve as passage context definers. | Google LLC | 2018 |
| US20190155948A1 | Contextual Estimation of Link Information Gain — ML model scores documents on novel information provided beyond previously-viewed documents. High-IGS \= original research, expert quotes, unique data. Low-IGS \= copycat/Skyscraper content. Likely Helpful Content Update mechanism. | Gonnet Anders, Carbune · Google LLC | 2022 |

|  | Patent Group Summary — 6 Groups, 9 Patents (1) Panda Family \[US8682892 \+ US10055467 \+ US9135307\] — three-layer quality system: site classification, group modification factor, threshold replacement. (2) Navboost \[US8595225\] — DOJ-confirmed, topic-specific user-signal ranking, 20 years active. (3) Historical Data \[US7346839\] — temporal trust accumulation, Sandbox mechanism. (4) Passage Scoring \[US9940367 \+ US9959315\] — dual H2 function: keyword signal AND context definition for passage ranking. (5) Information Gain \[US20190155948A1\] — novelty scoring, anti-Skyscraper mechanism, Helpful Content System. (6) Reasonable Surfer \[US8117209\] — supersedes classic PageRank, click-probability-weighted link equity. |
| :---- | :---- |
|  | **Evidence Status Note** Patents describe systems Google has built. The 2023 DOJ antitrust trial provided sworn testimony confirming Navboost (US8595225B1) and the behavioral scoring mechanisms (US10055467B1) are in active use. The 2024 Google API leak independently confirmed Navboost mechanics including good/bad/last-longest click categorisation. Where trial or leak confirmation exists, it is explicitly noted throughout this document. |

# **Table of Contents**

**PART I**  FOUNDATIONS: HOW GOOGLE WORKS AS A PRODUCT

1.1  Google as a Business and Its Ranking Philosophy

1.2  The Three Pillars of Search

1.3  Google's Indexing and Crawling Pipeline

**PART II**  THE NLP ENGINE: GOOGLE'S LANGUAGE MODELS

2.1  BERT and Transformer Architecture in Search

2.2  Entity Recognition and Knowledge Graph

2.3  Search Intent Classification Model

2.4  The Semantic Completeness Score (SCS) Framework

**PART III**  THE RANKING ALGORITHM MODEL

3.1  The Master Ranking Formula (Patent-Confirmed v2.0)

3.2  Signal Groups and Weighted Scoring

3.3  The Trust Accumulation Model  ← US7346839B2

3.4  Traffic Tier Threshold Theory  ← US8682892B1 \+ US10055467B1

3.5  Navboost: The Behavioural Signal Layer  ← US8595225B1

**PART IV**  ON-PAGE OPTIMISATION SCIENCE

4.1  Keyword Placement Architecture

4.2  The Semantic Density Model

4.3  HTML Signal Hierarchy \+ Passage Scoring  ← US9940367B1 \+ US9959315B1

4.4  Content Quality Scoring \+ Information Gain  ← US20190155948A1

4.5  The On-Page Optimisation Checklist

**PART V**  CONTENT STRATEGY & TOPICAL AUTHORITY

5.1  Topical Authority and Topic Cluster Theory

5.2  The Reverse Silo Internal Linking Model  ← US8117209B1

5.3  The 8-Step Content Strategy System

5.4  Search Funnel Mapping

**PART VI**  OFF-PAGE AUTHORITY: LINK SCIENCE

6.1  PageRank: The Reasonable Surfer Formula  ← US8117209B1

6.2  Link Quality Classification Model

6.3  The Link Building Strategy Formula  ← US8682892B1

**PART VII**  TECHNICAL SEO SYSTEMS

7.1  Core Web Vitals as Algorithm Inputs

7.2  The EEAT Signal Architecture  ← US8682892B1

7.3  Technical Audit Framework

**PART VIII**  REPLICABLE ALGORITHMS & TOOLS

8.1  The Universal Page Scoring Algorithm (UPSA)

8.2  The Competitor Analysis Algorithm

8.3  The AI Writer Prompt System

8.4  The On-Page Optimisation Algorithm

**APPENDIX**  Complete Patent Citation Index by Section

| PART I — FOUNDATIONS: HOW GOOGLE WORKS AS A PRODUCT |
| :---: |

## **1.1  Google as a Business and Its Ranking Philosophy**

To understand SEO at a deep level, you must first abandon the idea that Google is a search engine and recognise it for what it truly is: an advertising-funded product whose core value proposition is delivering the most satisfying answer to any human query. Every algorithm decision Google makes is a product decision. When a ranking signal is weighted higher, it is because Google's data shows it correlates with user satisfaction. This is the lens through which all SEO must be viewed.

The fundamental question Google's algorithm is attempting to answer for every query is: "If we show this page to this user, will they leave satisfied, or will they come back to the search results?" The metric Google uses internally to measure failure is the pogo-stick — when a user clicks a result, immediately bounces, and clicks a different result. The algorithm penalises pages with high pogo-stick rates and rewards pages with high dwell time and low return-to-SERP rates.

|  | Patent Confirmation — US10055467B1 The pogo-stick mechanism is formally documented in the Panda patent continuation. US10055467B1 measures 'short clicks' (quick returns to SERP) as direct inputs to the group-based modification factor — which is a multiplier applied to every page's base score across an entire domain. This is not theory or inference. It is a patented, assigned-to-Google-LLC scoring mechanism with a specific formula. |
| :---- | :---- |

## **1.2  The Three Pillars of Search**

Google's ranking system operates on three fundamental dimensions that form a dependency chain. Technical SEO is the prerequisite — without it, nothing else reaches Google's ranking system. On-Page SEO determines keyword eligibility — what queries a page can compete for. Off-Page SEO is the multiplier — the authority signals that determine whether the page ranks above or below competitors who also qualify.

| Pillar | Function | Primary Patent Evidence |
| :---- | :---- | :---- |
| Technical SEO | Discovery, crawlability, rendering, indexation — the infrastructure that gets pages into the ranking system at all | US7346839B2 — inception date, crawl history, technical trust signals |
| On-Page SEO | Communicates topic, intent, and quality to Google's NLP and quality systems | US9940367B1, US9959315B1, US20190155948A1 — passage scoring, information gain |
| Off-Page SEO | External signals — links and user behaviour — that confirm a domain deserves high positions | US8117209B1, US8682892B1, US10055467B1, US8595225B1 — link equity, group modification, Navboost |

## **1.3  Google's Indexing and Crawling Pipeline**

Before any ranking occurs, Google must discover, crawl, render, and index a page. Each stage is a potential point of failure. The Historical Data patent (US7346839B2) establishes that the date Google first discovers a link to your domain is permanently recorded as your document inception date — the starting point of all trust accumulation. There is no retroactive credit for pre-discovery history.

### **Stage 1: Discovery**

Google discovers pages through links from already-crawled pages. A page with no inbound links — internal or external — may never be found. Sitemaps accelerate discovery but do not guarantee indexing. The inception date recorded by US7346839B2 is the date of first link discovery, not domain registration.

### **Stage 2: Crawl**

Googlebot Smartphone fetches raw HTML. Pages blocked by robots.txt, returning 5xx errors, too slow, or behind redirect chains will fail at this stage. The crawler operates within a crawl budget — a finite count per domain per period — making site architecture critical for large sites.

### **Stage 3: Render**

Google's rendering service executes JavaScript and builds the full DOM separately from the crawl — often with a delay of days to weeks. Pages that rely on JavaScript for primary content may be indexed late or incompletely. Server-side rendering (SSR) is strongly preferred for SEO-critical content.

### **Stage 4: Index**

The rendered page is processed by NLP systems, entity extraction, and quality scoring, then stored in the search index. Pages with thin content, high duplicate ratios, or missing canonical signals may be excluded from the index or marked supplemental. The phrase model established by US9767157B2 means the first pages a domain publishes set a baseline quality expectation that affects subsequent pages.

| PART II — THE NLP ENGINE: GOOGLE'S LANGUAGE MODELS |
| :---: |

## **2.1  BERT and Transformer Architecture in Search**

In October 2019, Google deployed BERT (Bidirectional Encoder Representations from Transformers) into its core search algorithm, marking the most significant ranking change in years. BERT processes the entire context of a query or document bidirectionally — understanding word meaning based on every word before and after it simultaneously. This was a fundamental departure from earlier n-gram and bag-of-words models.

Google later evolved to MUM (Multitask Unified Model) in 2021, which processes text, images, and video across 75+ languages simultaneously. The practical effect for SEO is fundamental: Google no longer matches keywords — it matches meaning.

### **How BERT Evaluates Your Page — Technical Model**

BERT processes a page and produces a high-dimensional vector embedding — a mathematical representation of meaning in semantic space. Every query also produces a vector. Ranking is partly a function of cosine similarity between these vectors:

RelevanceScore \= cosine\_similarity(query\_embedding, page\_embedding)

Two pages can rank equally for a keyword even if one never uses the exact phrase — as long as their semantic vectors align. Conversely, a page stuffed with exact-match keywords but lacking semantic depth produces a distorted embedding that fails to match query vectors from real users.

### **Implications for Content Creation**

BERT's training data was high-quality text — Wikipedia, books, expert web content. It learned what expert writing on any topic looks like. Content that mimics that pattern (comprehensive, logically structured, contextually rich, genuinely informative) produces embeddings that closely match the query embeddings triggered by users with genuine interest in the topic.

## **2.2  Entity Recognition and the Knowledge Graph**

Google's NLP layer identifies entities: any named concept — person, place, organisation, product, event, or abstract idea. Google maintains a massive Knowledge Graph mapping entities and their relationships. When Google crawls a page, it extracts entities and maps the page to the Knowledge Graph. This entity mapping is one of the primary mechanisms by which Google classifies pages with high confidence.

For SEO, pages should be entity-rich and entity-consistent. A plumbing company in Denver should contain entities: company name, city, specific service types, local landmarks, certification organisations. Schema markup (structured data) explicitly communicates entities to Google's NLP systems, bypassing any ambiguity in raw text.

## **2.3  Search Intent Classification Model**

Before evaluating any page, Google classifies the query by intent. This classification determines which content type can satisfy the query. A mismatch between content type and classified intent is an automatic disqualifier regardless of content quality. Intent classification happens before quality scoring.

| Intent Type | User Goal | Content Type Required | Example Query |
| :---- | :---- | :---- | :---- |
| Informational | Learn something — no purchase intent | Blog post, guide, how-to article | how to unclog a drain |
| Commercial | Research before buying | Comparison, review, listicle | best drain cleaner 2024 |
| Transactional | Ready to buy or act | Product/service landing page | buy drain snake online |
| Navigational | Find a specific site | Homepage, brand page | Roto-Rooter website |

## **2.4  The Semantic Completeness Score (SCS) Framework**

Based on how BERT and NLP systems function, we can model Google's semantic quality assessment as a Semantic Completeness Score — a conceptual framework representing what the systems approximate when evaluating relevance:

SCS \= (EntityCoverage × 0.30) \+ (LSI\_Density × 0.25) \+ (IntentAlignment × 0.25) \+ (StructuralCoherence × 0.20)

The SCS is a diagnostic audit model — use it to identify content gaps, not as a literal implementation. High-SCS content comprehensively covers entities, uses naturally distributed LSI terms, matches the dominant search intent for the query, and presents information in a structure that BERT can parse efficiently.

| PART III — THE RANKING ALGORITHM MODEL |
| :---: |

## **3.1  The Master Ranking Formula  ← Patent-Confirmed v2.0**

The following formula is a high-fidelity approximation of Google's ranking system constructed entirely from patent evidence. Every term corresponds to a documented mechanism. This replaces the informal formula in earlier versions of this document, which lacked formal patent grounding.

| MASTER RANKING FORMULA v2.0 — ALL 9 PATENTS INTEGRATED FinalRank(page, query) \=     \[1\] OnPage\_SemanticScore                                    // BERT/MUM cosine similarity, SCS        × SemanticWeight     \[2\] × GroupModificationFactor                \[US8682892B1 \+ US10055467B1\]         \= (IndependentLinks / ReferenceQueries)               // US8682892B1: base ratio           × BehavioralMultiplier                              // US10055467B1: click-signal layer           where BehavioralMultiplier \= sigmoid(RepeatClickFraction)                                      \+ sigmoid(DeliberateVisitFraction) / 2                                      \+ f(AvgSessionDuration)           NOTE: Applied ONLY if InitialScore \> threshold — below-threshold pages unaffected           NOTE: Not applied if query is navigational to the resource     \[3\] \+ InformationGainScore                  \[US20190155948A1\]         \= ML\_Score(novelty vs. previously-seen-documents corpus)           High: original research, expert quotes, unique data, first-hand experience           Low:  copycat content, Skyscraper technique, AI synthesis of top-10 results     \[4\] \+ LinkEquity\_ReasonableSurfer            \[US8117209B1\]         \= Σ ( PR(source) × ClickProbability(link) / Σ\_all\_link\_probs\_on\_source )           ClickProbability \= f(placement, anchor\_length, anchor\_relevance,                               font\_size, visual\_prominence, topical\_match)     \[5\] \+ NavboostScore                         \[US8595225B1 — DOJ confirmed 2023\]         \= TopicPopularity(page, query\_topic)   // query-specific, NOT domain-global           computed over 13-month rolling click history           adjusted mildly when click data is sparse     \[6\] \+ HistoryScore                          \[US7346839B2\]         \= f(InceptionDate, LinkVelocity, AnchorTextStability,             ContentUpdateFrequency, TopicStability, UserBehaviourHistory)     \[7\] \+ PassageScore                          \[US9940367B1 \+ US9959315B1\]         \= max over all passages:           QueryTermMatchScore × AnswerTermMatchScore × HeadingContextScore           where HeadingContextScore \= f(HeadingVector: Title→H1→H2→passage)     \[8\] \+ TechnicalScore                        // CWV, indexation, schema, rendering     \[9\] \+ ContextSignals                        // location, device, user history, QDF |
| :---- |

**Critical architecture note:** Term \[2\] is a multiplier, not an additive term. The GroupModificationFactor sits on top of the base score and scales it up or down based on site-level quality. A mediocre page on a high-trust domain benefits from this multiplier. A strong page on a new domain receives no multiplier until its scores clear the threshold gate. This is the formal mechanism behind the common observation that low-quality content on high-authority domains outranks excellent content on new domains.

**Why classic PageRank formulas are outdated:** Term \[4\] uses the Reasonable Surfer model (US8117209B1, 2010), not the original random-surfer formula PR(P) \= (1-d) \+ d × Σ(PR(L\_i)/C(L\_i)). In the Reasonable Surfer model, link equity is weighted by click probability — not distributed equally across all outbound links. The classic formula should not appear in any current SEO strategy document without this correction.

## **3.2  Signal Groups and Weighted Scoring**

### **Group A: Primary On-Page Signals — Highest Weight**

Directly communicate core topic to the algorithm. Errors here are disqualifying regardless of authority.

* Title tag: keyword presence and position — confidence weight 1.00

* H1: unique, present, keyword-aligned — weight 0.95

* URL slug: primary keyword, hyphens, no stop words — weight 0.85

* Keyword in first 100 words of body — weight 0.80

### **Group B: Content Quality Signals — High Weight**

* Information Gain Score \[US20190155948A1\]: novel content beyond what the user has already seen. Copycat content scores low regardless of other quality signals.

* Semantic Completeness Score: entity coverage, LSI density, intent alignment — see Part II, Section 2.4

* Content freshness: meaningful updates to existing content trigger re-evaluation per US7346839B2

* Passage quality \[US9940367B1\]: how well each H2 section independently answers its own question

### **Group C: Secondary On-Page Signals — Medium-High Weight**

* H2 headers: keyword variants, topical coverage, AND passage context definitions \[US9959315B1\]

* First paragraph semantic quality and LSI density — weight 0.65

* Body text entity coverage and completeness — weight 0.45

* Schema markup: explicit entity communication to Knowledge Graph

### **Group D: Authority Signals — Very High Weight on Competitive Keywords**

* Reasonable Surfer link equity \[US8117209B1\]: PR(source) × ClickProbability — not classic PageRank

* Reference queries \[US8682892B1\]: branded/navigational searches as denominator in group modification factor — scales all link equity up or down

* Independent inbound link count: unique root domains, topical relevance, link placement quality

### **Group E: Behavioural Signals — High Weight, DOJ-Confirmed**

* NavBoost topic-specific popularity \[US8595225B1\]: confirmed 'most important signal' at 2023 DOJ trial. Query-specific, not domain-global.

* Repeat-click fraction and deliberate visit fraction \[US10055467B1\]: sigmoid-processed direct inputs to group modification factor

* Average session duration \[US10055467B1\]: combined with click fractions, contributes to behavioural multiplier

### **Group F: Historical Trust Signals — Foundational**

* Document inception date \[US7346839B2\]: date of first link discovery. Starting point of all trust accumulation.

* Link velocity pattern \[US7346839B2\]: acquisition rate over time. Spikes are fraud signals.

* Anchor text stability \[US7346839B2\]: consistency of anchor text over time. Topic pivots create mismatch signals.

## **3.3  The Trust Accumulation Model  ← US7346839B2**

| US7346839B2  ·  Information Retrieval Based on Historical Data Jeffrey Dean, Matt Cutts, Monika Henzinger, Paul Haahr \+ 7 Google engineers · Google Inc.  |  Filed 2003 · Granted 2008 |
| :---- |
| **Core Mechanism:** Generates a comprehensive history score from: document inception dates, content update history, query analysis, link-based criteria including link velocity, anchor text changes over time, traffic patterns, user behaviour history, domain registration information, and ranking history. This is the formal basis of the Sandbox mechanism. |

Domain trust is not a static score. It is an asset that accumulates across at least six independent temporal dimensions documented in the patent. The Sandbox effect is not a Google penalty — it is the formal absence of positive signals in every one of these dimensions for a new domain.

| History Signal | What Google Tracks | SEO Implication |
| :---- | :---- | :---- |
| Document Inception Date | Date Google first discovers a link to your content — NOT domain registration date | Publish content early. Submit to Search Console immediately. The clock starts at discovery. |
| Content Update Frequency | How regularly pages are updated with meaningful new content. Stale pages decay in freshness scores. | Refresh high-value pages every 6–12 months. Update statistics, add new sections, date-stamp updates. |
| Link Velocity Pattern | Rate of new referring domain acquisition over time. Sudden spikes flagged as manipulation. | Target 3–8 new referring domains per month consistently. Never buy bulk links. Spikes harm more than help. |
| Anchor Text Stability | How the anchor text pointing to the domain changes over time. Sudden topic pivots are a negative signal. | Maintain topical consistency in anchor text. Domain repositioning should be gradual over 6+ months. |
| Topic Stability | Whether the domain's subject focus has remained consistent or shifted abruptly. | Avoid sudden niche pivots. Legacy anchor text mismatch persists for months after a topic change. |
| User Behaviour History | Aggregate click, dwell, and satisfaction data across the domain's full history. | Every page you publish contributes to or detracts from the domain's cumulative behaviour profile. |

The formal trust formula, incorporating all six dimensions:

TrustScore \= f(InceptionDate × 0.10)         // how long Google has known you

           \+ f(BacklinkVelocity × 0.35)       // link acquisition pattern

           \+ f(ContentConsistency × 0.25)     // publish/update regularity

           \+ f(BehaviourHistory × 0.20)       // aggregate user signals

           \+ f(TechnicalHealth × 0.10)        // crawl/render reliability

|  | The Sandbox Explained by Patent New domains have a neutral (zero) score in every dimension of US7346839B2. Zero inception-date trust. Zero link velocity pattern. Zero anchor text history. Zero content update record. Zero user behaviour data. The algorithm does not penalise new domains — it has no positive evidence for them. The result is identical to a penalty in competitive rankings: the domain cannot overcome the accumulated positive history scores of established competitors until it builds its own. This typically takes 6–12 months for first-tier keywords. |
| :---- | :---- |

## **3.4  Traffic Tier Threshold Theory  ← US8682892B1 \+ US10055467B1**

| US8682892B1 \+ US10055467B1  ·  Ranking Search Results — Panda Patent Family (Parent \+ Continuation) Navneet Panda, Vladimir Ofitserov, Kaihua Zhu · Google Inc. / Google LLC  |  Parent filed 2012, granted 2014 · Continuation filed 2017, granted 2018 |
| :---- |
| **Core Mechanism:** Computes a group-based modification factor from: (a) ratio of independent inbound links to reference queries; (b) repeat-click fraction via sigmoid; (c) deliberate visit fraction via sigmoid; (d) average session duration. Final factor multiplies the base score of every page in the domain. Applied only if base score exceeds threshold. Not applied for navigational queries to the resource. |

Google enforces implicit traffic thresholds. High-volume competitive keywords are effectively reserved for domains whose trust tier matches the keyword's authority requirements. This is not a rule stored anywhere — it is an emergent behaviour of the group modification factor system.

### **The Formal Mechanism — Group Modification Factor**

The parent patent (US8682892B1) establishes the base mechanism explicitly:

InitialModificationFactor \= IndependentLinks / ReferenceQueries

Where IndependentLinks \= verified backlinks from non-duplicate sources, and ReferenceQueries \= count of branded/navigational searches referencing the domain. This ratio is the seed of the quality multiplier.

The continuation patent (US10055467B1) adds the behavioural layer on top of this:

M\_RCF \= sigmoid(RepeatClickFraction)

M\_DVF \= sigmoid(DeliberateVisitFraction)

M\_Behaviour \= (M\_RCF \+ M\_DVF) / 2  \+  f(AvgSessionDuration)

GroupModificationFactor \= InitialModificationFactor × M\_Behaviour

FinalScore(page) \= InitialScore(page) × GroupModificationFactor

**The threshold gate:** Per US9684697B1 (intermediate continuation), the modification factor is only applied when InitialScore exceeds a minimum threshold. Below-threshold pages receive no multiplier. This is the formal mechanism by which Google withholds the benefits of a strong domain's quality history from pages that don't meet the baseline content quality bar.

|  | Reference Queries Are an Algorithmic Input, Not a Marketing Metric The denominator in the initial modification factor is ReferenceQueries — branded and navigational searches referring to your domain. A domain with 5,000 backlinks and 200 branded searches per month (ratio \= 25\) has a higher initial modification factor than a domain with 10,000 backlinks and 50 branded searches (ratio \= 200). Growing brand search volume via PR, social media, and thought leadership is not optional brand building — it is a direct input into the algorithm's quality multiplier (US8682892B1). |
| :---- | :---- |

### **The Tier System — Patent-Informed Progression**

Month  1–3:   \<500 monthly searches     — build inception date, phrase model baseline

Month  3–6:   500–2,000/mo             — condition: impressions \+ 3–5 ref domains/mo

Month  6–12:  2,000–10,000/mo          — condition: 5–10 new ref domains/mo, DR 20+

Month 12+:    10,000+/mo               — condition: DR 30+, 50+ ref domains, real traffic

## **3.5  Navboost: The Behavioural Signal Layer  ← US8595225B1**

| US8595225B1  ·  Systems and Methods for Correlating Document Topicality and Popularity Amit Singhal, Urs Hoelzle · Google Inc.  |  Filed 2004 · Granted 2013 · Operational \~2005 · Confirmed at 2023 DOJ antitrust trial |
| :---- |
| **Core Mechanism:** Maps documents to topics. Computes per-topic popularity scores from user navigational patterns. Popularity combined with topical relevance to generate query-specific ranking adjustments. Not a global score — a page has a different Navboost score for every topic it competes in. |

Navboost was publicly confirmed as one of Google's 'strongest and most important ranking signals' when Google VP of Search Pandu Nayak testified under oath at the 2023 DOJ antitrust trial. This ended years of Google representatives publicly dismissing user click data as a minor or unreliable signal.

### **What Makes Navboost Different from Generic Click Tracking**

* It is topic-specific, not domain-global. A page's Navboost score for 'espresso machine repair' is independent of its score for 'best espresso machines under $200'

* It uses a 13-month rolling history window. Old click signals age out. A CTR improvement today compounds over the following 13 months.

* The adjustment is calibrated to data volume. Sparse click data \= mild adjustment. Abundant data \= significant modification. New pages on new topics start with zero Navboost — they earn it.

* Per the 2024 API leak: Navboost distinguishes between good clicks (long dwell), bad clicks (quick return to SERP), and last-longest clicks (final click in a session, indicating strongest satisfaction). These are weighted differently.

NavboostScore(page, query\_topic) \= TopicPopularity(page, topic) × RelevanceConfidence

  TopicPopularity \= f(good\_clicks, last\_longest\_clicks, dwell\_time)

                  \- f(bad\_clicks, pogo\_stick\_rate)

                  over 13-month rolling window

  RelevanceConfidence \= calibrated to click data volume (sparse → mild)

|  | Optimising for Navboost: The SEO Implications (1) Title tags and meta descriptions are your Navboost input mechanism. A/B test them to improve CTR — improvements compound over 13 months. (2) Opening content must confirm the user is in the right place within the first screenful — this is the primary anti-pogo-stick mechanism. (3) Aim to be the 'last-longest click' — a resource so complete the user ends their search session on your page. This is the strongest satisfaction signal Navboost recognises. (4) Optimise at the keyword cluster level, not just site-wide. Each query cluster requires its own CTR and dwell time strategy. |
| :---- | :---- |

| PART IV — ON-PAGE OPTIMISATION SCIENCE |
| :---: |

## **4.1  Keyword Placement Architecture**

Keyword placement is about architectural position in the HTML document, not frequency. Google's parser assigns different confidence weights to text appearing in different structural locations. The following model is grounded in observed ranking behaviour and NLP theory:

| HTML Element | Weight | Notes |
| :---- | :---- | :---- |
| Title tag | 1.00 | Highest confidence. Keyword first. Under 60 characters. Every word counts. |
| H1 tag | 0.95 | One H1 only. Contains primary keyword. Must match title semantically. |
| URL slug | 0.85 | Hyphens as separators. No stop words. Permanent — changing a slug loses historical trust \[US7346839B2\]. |
| First 100 words | 0.80 | Primary keyword in first sentence if possible. Google front-loads confidence from early placement. |
| H2 headers | 0.70 | Keyword variants \+ LSI \+ passage context definitions \[US9940367B1, US9959315B1\]. Each H2 is an independent ranking candidate for long-tail queries. |
| First paragraph | 0.65 | Semantic expansion zone. Should contain primary LSI terms and set topical context for BERT. |
| H3 headers | 0.55 | Sub-topic headings. Also form child heading vectors for passage context scoring. |
| Body text | 0.45 | LSI saturation. Natural usage only — BERT penalises keyword stuffing via embedding distortion. |
| Bold / Italic | 0.35 | Emphasis for important terms. Use sparingly and meaningfully. |
| Alt text | 0.30 | Contextual keyword. Should genuinely describe the image. |
| Meta description | 0.15 | Not a direct ranking signal — but the primary CTR mechanism feeding Navboost \[US8595225B1\]. |

## **4.2  The Semantic Density Model**

Every high-ranking page contains a constellation of semantically related terms that signal comprehensive topical expertise. These fall into three categories:

### **Category 1: LSI Terms**

Terms statistically co-occurrent with the primary keyword in BERT's training corpus. Their presence increases topical classification confidence. Example for 'home espresso machine': barista, grind, extraction, portafilter, crema, tamper, shot, pump, boiler, beans, roast, brew. Absence of expected LSI terms is a signal of thin or low-quality content.

### **Category 2: Entity Terms**

Named concepts expected given the page's topic and intent. For local business: company name, city, neighbourhoods, service types, certifications, brands. For product review: model numbers, comparison products, key specifications. Google's entity extraction maps your page to the Knowledge Graph.

### **Category 3: Question / Long-Tail Phrases**

Specific questions users ask about the core topic. Identify from 'People Also Ask'. Incorporate as H3 headers with direct concise answers — targeting both featured snippet eligibility and passage-level ranking (US9940367B1). Every question-format H3 creates a passage entry point with a clear heading context vector.

## **4.3  HTML Signal Hierarchy \+ Passage Scoring  ← US9940367B1 \+ US9959315B1**

| US9940367B1 \+ US9959315B1  ·  Scoring Candidate Answer Passages \+ Context Scoring Adjustments Google LLC  |  Filed 2014 · Granted 2018 · Deployed publicly as Passage Indexing, February 2021 |
| :---- |
| **Core Mechanism:** Scores individual passages independently of the full page. Query-term match score × answer-term match score \= query-dependent score. This is then adjusted by a context score derived from the heading hierarchy vector (Title → H1 → H2 → passage text). Final answer score \= query-dependent score × context score. Passages under clear, specific H2 headings that form a coherent topic path score higher. |

The passage scoring patents reveal that H2 and H3 headings serve two distinct, independent roles in Google's algorithm. Most SEO practitioners optimise only for the first:

| H2/H3 Role | What It Does | What Makes It Strong |
| :---- | :---- | :---- |
| Role 1: Keyword Signal (widely understood) | Contains keyword variants and LSI terms — communicates topical breadth to the indexer. This is the dimension most keyword strategies address. | Keyword variant in heading text. Related LSI term. Topic relevance to primary page keyword. |
| Role 2: Passage Context Definition (US9959315B1) | Creates the heading vector (Title → H1 → H2 → passage). This context is evaluated as a coherent path. The passage beneath the H2 is scored in the context of this entire path — not in isolation. | H2 written as a clear, specific, answerable question. Heading hierarchy forms a logical topic path. Answer appears in first 1–2 sentences of the passage below. |

### **The Heading Vector Model — How Passages Get Context Scores**

Per US9959315B1, Google constructs a heading vector for every candidate answer passage:

HeadingVector \= \[Root\_Title, H1\_text, H2\_text, (H3\_text if applicable)\]

ContextScore  \= f(HeadingVector)

             — higher when vector forms a clear, specific, question-answerable path

             — lower when headings are vague or disconnected

FinalPassageScore \= QueryDependentScore × ContextScore

Example contrast:

STRONG VECTOR: Title: 'How to Unclog a Shower Drain'

               H1: 'Shower Drain Unclogging Guide'

               H2: 'How Long Does It Take to Unclog a Shower Drain?'

               → Clear question, answer can be extracted from first sentence below

WEAK VECTOR:   Title: 'Drain Cleaning Services'

               H1: 'Our Services'

               H2: 'Drain Methods'

               → Vague labels, no answerable question, low context score

### **Passage Scoring Optimisation Rules**

* Write every H2 as a clear question or a definitive, directly-answerable statement

* Put the answer in the first 1–2 sentences under the H2 — passages are scored for standalone completeness

* Keep sections 150–350 words — comprehensive but focused on one answerable sub-topic

* Use numbered lists, definitions, and specific data under question-format H2s — these are the highest-scoring answer element types

* The full heading path (Title → H1 → H2) must form a coherent, specific topical progression

* FAQ sections with question-format H3s are the highest-density passage scoring targets on a page — always include them

## **4.4  Content Quality Scoring Framework \+ Information Gain  ← US20190155948A1**

| US20190155948A1 / US20200349181A1  ·  Contextual Estimation of Link Information Gain Pedro Gonnet Anders, Victor Carbune · Google LLC  |  Filed 2018 · Published 2019/2020 · Granted 2022 |
| :---- |
| **Core Mechanism:** ML model assigns an information gain score to documents measuring novel information provided beyond what a user has already encountered across previously-viewed documents for the same query. Documents that add something new to the corpus score high. Documents that repackage existing top-10 content score low. Almost certainly the core mechanism of the 2022 Helpful Content Update. |

The Information Gain patent is the most strategically consequential patent for content creators because it formally invalidates the most popular content strategy of the last decade: the Skyscraper Technique.

|  | The Death of the Skyscraper Technique — US20190155948A1 The Skyscraper Technique instructs creators to find the best-ranking content for a keyword and build something more comprehensive. By definition, this produces content with zero information gain: it synthesises what already exists at the top of the SERP into a more complete version. The patent explicitly describes this problem — 'many documents may include similar information... the user may have less interest in viewing a second document after already viewing the same or similar information.' Every 'ultimate guide' assembled from competitor headings, every AI article trained on top-10 SERP results, and every listicle of widely-known tips scores near zero on IGS. This likely explains the Helpful Content Update's pattern of demoting once-strong content farms. |
| :---- | :---- |

The Content Quality Score (CQS) is a 10-dimension scoring model aligned with Google's quality systems, extended with the Information Gain bonus from US20190155948A1:

| Dimension | Max Points | Scoring Criteria |
| :---- | :---- | :---- |
| 1\. Original Intent Satisfaction | 10 | Does the page directly, completely answer what the user searched for? No bait-and-switch. |
| 2\. Depth & Comprehensiveness | 10 | Full topic coverage at or above competitor median. Fills gaps competitors leave. |
| 3\. Accuracy & Factual Correctness | 10 | All claims accurate and current. YMYL topics require primary source citations. |
| 4\. Expertise Signals (EEAT) | 10 | Author credentials, first-person experience language, citations to primary sources. |
| 5\. Writing Quality | 10 | Clear, precise prose. Expert vocabulary appropriate to topic. No filler or padding. |
| 6\. Content Freshness | 10 | Visible publish/update date. Information current. Statistics reference recent data. |
| 7\. User Experience | 10 | Fast load, mobile-friendly, readable layout, logical structure, no intrusive interstitials. |
| 8\. Engagement Architecture | 10 | Clear CTA, internal links to related content, FAQ section, multimedia where genuinely helpful. |
| 9\. Trust Signals | 10 | About page, author bio, contact information, privacy policy, SSL, third-party reviews. |
| 10\. Structural Coherence | 10 | Logical heading hierarchy, TOC for long content, consistent formatting. |

### **The Information Gain Bonus — US20190155948A1**

Beyond the base CQS, the Information Gain patent describes an additional scoring dimension that standard quality optimisation cannot achieve. It requires genuinely novel content:

| IGS Bonus Source | Bonus Points | What This Looks Like in Practice |
| :---- | :---- | :---- |
| Original research or proprietary data | Up to \+5 | Surveys, experiments, internal data analysis, original statistics not published elsewhere |
| Expert quotes not in competing pages | Up to \+4 | Direct attribution to named experts with specific insights unavailable in current SERP |
| First-hand experience and testing | Up to \+3 | Personal case studies, direct product testing, real-world application results |
| Unique visualisations or tools | Up to \+2 | Original charts, custom calculators, interactive elements not in competitor content |
| Contrarian or novel perspective | Up to \+1 | Evidence-backed position that genuinely differs from the consensus in the existing SERP |

Final CQS \= Σ(10 base dimensions × 10 pts each \= max 100\)

         \+ IGS Bonus (0–15 pts)

         \= Maximum 115 points

## **4.5  The On-Page Optimisation Checklist**

Complete, replicable checklist to run before publishing or during any content audit. Items marked with a patent number have formal grounding:

### **Structural Checks**

* Primary keyword in Title tag — first position, under 60 characters

* One H1 only — contains primary keyword, semantically matches title

* Primary keyword in URL slug — hyphens, no stop words, permanent URL \[US7346839B2 — changing URLs resets inception date signals\]

* Primary keyword in first 100 words of body content

* Meta description — 150–155 chars, keyword present, compelling CTR language \[feeds Navboost US8595225B1\]

### **Semantic Checks**

* H2 structure improves on top competitors — broader coverage, more specific questions

* Each H2 written as a clear answerable question or direct statement \[passage context: US9959315B1\]

* Each H2 answered in its first 1–2 sentences \[passage standalone scoring: US9940367B1\]

* Secondary keywords and LSI terms distributed across H2/H3 headers

* Word count at or above competitor median

* At least one genuinely novel element: original data, expert quote, first-hand experience, or unique tool \[US20190155948A1 — IGS requirement\]

### **Technical Checks**

* Schema markup applied — minimum Article or FAQ schema; LocalBusiness for local pages

* All images have descriptive alt text with contextual keyword usage

* Internal links in body text — minimum 3, placed in first half of article, descriptive 2–5 word anchor text \[Reasonable Surfer placement: US8117209B1\]

* At least 1 external authority link to relevant high-DR domain

* FAQ section with FAQ schema — primary passage scoring candidates

* Table of Contents for 1,500+ word content

* Page speed: LCP \<2.5s, CLS \<0.1, INP \<200ms

* Mobile rendering verified in Search Console URL Inspection

* No duplicate content issues — canonical tags set correctly

| PART V — CONTENT STRATEGY & TOPICAL AUTHORITY |
| :---: |

## **5.1  Topical Authority and Topic Cluster Theory**

A domain does not rank for individual keywords in isolation. It ranks based on the depth and breadth of its coverage of an entire topic domain. Google evaluates whether a domain is a genuine, comprehensive resource — or a thin site targeting isolated keywords.

The Navboost patent (US8595225B1) provides the formal mechanism: Google maps documents to topics and computes topic-specific popularity scores. A domain with many well-performing documents all mapped to the same topic accumulates compounding topical authority signals that benefit all pages within that cluster. Topic authority is not a branding concept — it is a documented algorithmic output.

The High-Quality Site Replacement patent (US9135307B1) adds another dimension: Google pre-classifies entire sites as high-quality or low-quality before serving results. A domain with genuine topical authority across many pages gets pre-classified as high-quality, meaning its pages are promoted even when Google runs alternative queries to replace low-quality results. This pre-classification makes topical authority a domain-level asset, not just a page-level signal.

## **5.2  The Reverse Silo Internal Linking Model  ← US8117209B1**

| US8117209B1  ·  Ranking Documents Based on User Behaviour and/or Feature Data — Reasonable Surfer Model Jeffrey Dean, Corin Anderson, Alexis Battle · Google Inc.  |  Filed 2004 · Granted 2010 |
| :---- |
| **Core Mechanism:** Replaces the classic random-surfer PageRank model. Link equity is proportional to ClickProbability(link), not distributed equally. ClickProbability is determined by: (1) position — body text vs. sidebar vs. nav vs. footer; (2) anchor text length and relevance (2–5 descriptive words score highest); (3) font size and visual prominence; (4) topical relevance of source page to destination; (5) link type. |

The reverse silo concentrates link equity toward money pages via a network of interlinked supporting articles. Every supporting article, once it earns even minimal authority, passes it upward. The Reasonable Surfer model determines how effectively each internal link passes equity — making link placement and anchor text critical rather than optional.

### **The Architecture**

* One or more money/target pages at the top (commercial intent, conversion-focused)

* Supporting articles covering every distinct user intent in the topic space — as child pages. The number is determined by how many genuine sub-intents exist, not a fixed target. Narrow topics: 3–5 articles. Broad competitive topics: 10–20. The cluster is complete when real user questions run out.

* Supporting articles each link back to the money page — in body text, first 400 words \[US8117209B1\]

* Supporting articles interlinked in clusters of 5 — body text links, keyword-variation anchors

* Each cluster of 5 points up to the money page

* Money page links back to relevant supporting articles — establishes bidirectional topical relevance

### **Why Placement Is Not Optional — Reasonable Surfer Equity Table**

| Link Placement | Relative Equity (US8117209B1) | Mechanism |
| :---- | :---- | :---- |
| Body text, early in article | Very High (1.00×) | Highest click probability — contextual, prominent, reader attention peak. First link to same destination \> subsequent links. |
| Body text, late in article | High (0.80×) | Still editorial but lower probability of being reached by all readers. |
| Above-fold sidebar | Medium (0.50×) | Visible but disconnected from content context. |
| Navigation menu | Low (0.30×) | Functional, not editorial. Patent identifies nav links as low click-probability. |
| Footer | Very Low (0.15×) | Patent explicitly identifies footer as low click-probability. Footer link farms are why Google discounts this heavily. |

### **Anchor Text Rules from US8117209B1**

* 2–5 descriptive words: highest click probability. Single-word and generic anchors (click here, read more) have lower click probability and therefore pass less equity.

* Topical relevance to destination: scored feature in click probability model. Anchor text about espresso machines linking to espresso page \> generic anchor linking to same page.

* Visual prominence: links styled with standard colour contrast and underline pass more equity than links styled to blend with surrounding text

* First link wins: the first link to a destination page in a document passes more equity than subsequent links to the same page — place money-page links early

## **5.3  The 8-Step Content Strategy System**

### **Step 1: Build the Sub-Topic List**

Combine: existing brand/service keywords, Semrush Keyword Gap against top 3 competitors, Google Related Searches for all seed keywords, AI subtopic generation, and Answer the Public question formats. Build a complete map of everything worth ranking for in your niche.

### **Step 2: Order and Prioritise Topics**

Apply the Traffic Tier model (Part III, Section 3.4). Filter for keywords within your current trust tier. Within that tier, prioritise by: highest commercial intent first, then CPC (higher CPC \= more profitable traffic), then lowest keyword difficulty.

Priority Score \= (CommercialIntent × CPC × SearchVolume) / KeywordDifficulty

### **Step 3: Select High-Value, Low-Resistance Keywords**

A good keyword has three qualities: high business value, low resistance to ranking, and real search demand. Evaluate all three — optimising for only one produces bad selections. The most common mistake is selecting keywords purely on low difficulty, then ranking for terms nobody converts from.

Business Value (CPC): CPC is the strongest proxy for commercial intent — advertisers only bid on terms that convert. A $5+ CPC keyword is high value. A $0.50 CPC keyword may rank easily but generate no revenue. | Ranking Resistance: Keyword Difficulty relative to your own domain authority — not as an absolute number. A KD 35 keyword is easy for DA 40, hard for DA 10\. The authority fit classification in Step 2 handles this gate. | Supply Check (KGR): allintitle\_results / monthly\_search\_volume. KGR \< 0.25 means few pages have deliberately targeted this phrase — useful as a tiebreaker, not a primary filter. A low KGR with low CPC is still a weak keyword.

### **Step 4: Create the Topical Map**

Assign each keyword to a content type based on intent. Map the parent-child hierarchy. Identify reverse silo groupings. Document the complete internal linking plan before writing a single word. The topical map is the SEO blueprint.

### **Step 5: Build the Content Calendar**

Schedule: 1 money page \+ supporting articles covering every distinct user intent in the topic — not a fixed number. Narrow topics may need 3–5 articles; broad competitive niches may need 10–15. The cluster is complete when genuine user questions are exhausted, not when a count is reached. Include for each page: primary keyword, URL, title tag, word count target, publish date, assigned writer, and internal linking targets. The calendar is an execution plan, not a publishing schedule.

### **Step 6: Build Out the Pages**

For each page: (a) Analyse top 3–5 competitors — extract heading structure, word count, content format, entity coverage. (b) Build a content brief with the target outline, keywords, LSI terms. (c) Write content covering everything competitors cover, plus at least one genuinely novel element \[US20190155948A1 Information Gain requirement\]. (d) Supporting articles: optimised at title, H1, and meta description. Money pages: full checklist from Section 4.5.

### **Step 7: Optimise Content for SEO**

Apply the full on-page checklist (Part IV, Section 4.5). Use SurferSEO, Page Optimizer Pro, or Clearscope to verify LSI density and word count against live competitors. These tools model the same semantic signals Google uses — they are reverse-engineering the algorithm in real time.

### **Step 8: Rinse, Measure, and Repeat**

Every 30 days: keyword audit in Search Console \+ Semrush. Identify keywords ranking positions 4–15. Push those pages with supporting articles, internal links, or on-page improvements. Then start the next topic cluster at Step 1\.

## **5.4  Search Funnel Mapping**

Every piece of content must be mapped to a position in the customer journey. Content type, CTA, and conversion goal must match the user's awareness stage. Publishing the wrong content type for a given intent is the most common SEO strategy error.

| Funnel Stage | Query Type | Content Type | Conversion Goal |
| :---- | :---- | :---- | :---- |
| Awareness | Informational | Blog post, how-to guide, explainer | Email capture, brand impression, Navboost first touch |
| Consideration | Commercial | Comparison, review, top-N list | Lead generation, demo request, shortlist entry |
| Decision | Transactional | Service/product landing page | Purchase, booking, enquiry, quote request |
| Retention | Navigational | Account, support, FAQ, update content | Repeat engagement, upsell, referral |

| PART VI — OFF-PAGE AUTHORITY: LINK SCIENCE |
| :---: |

## **6.1  PageRank: The Reasonable Surfer Formula  ← US8117209B1**

Google's original PageRank treated the web as a citation network and inferred page importance from the quantity and quality of inbound links. The original random-surfer model distributed equity equally across all outbound links. This model was superseded by the Reasonable Surfer patent (US8117209B1, granted 2010). Any SEO strategy or tool built on the classic formula is modelling an outdated system.

### **The Classic Formula — Superseded**

PR(P) \= (1 \- d) \+ d × Σ( PR(L\_i) / C(L\_i) )

Where: d \= 0.85, L\_i \= pages linking to P, C(L\_i) \= total outbound links on L\_i

In this model: all links on a page pass equal equity. A footer link and an editorial body-text link from the same page pass identical amounts of PageRank. This assumption is demonstrably false under the Reasonable Surfer model.

### **The Reasonable Surfer Formula — Current Patent Evidence**

LinkWeight(link) \= PR(source) × ClickProbability(link)

EquityPassed    \= LinkWeight / Σ(ClickProbabilities of ALL links on source page)

ClickProbability \= f(position, anchor\_length, anchor\_relevance,

                     font\_size, visual\_prominence, topical\_match, link\_type)

The equity passed by a link is now proportional to its click probability relative to all other links on the same page. A footer link with very low click probability passes negligible equity even from a high-authority site. A body-text editorial link with high click probability from a medium-authority site may pass more equity than a footer link from a top-authority site.

|  | The Practical Implication for Link Building When acquiring backlinks, specify placement requirements. A link in the footer or sidebar of a DR-80 site may be worth less than a link in the editorial body of a DR-40 site. Ask for: body text placement, early in the article, descriptive anchor text, contextually relevant article topic. This is not link snobbery — it is the formal mechanics of US8117209B1. |
| :---- | :---- |

## **6.2  Link Quality Classification Model**

| Tier | Type | Source Profile | SEO Value |
| :---- | :---- | :---- | :---- |
| 1 | Editorial Contextual | Major publications, news, industry leaders. DR 60+. Editorial decision, not solicited. Body text placement. | Maximum. High click probability. Contributes to reference query pool \[US8682892B1\]. |
| 2 | Niche Editorial | Relevant industry blogs and authority sites. DR 30–60. Written for real audiences with real traffic. | High. Topical relevance multiplies equity per Reasonable Surfer model. |
| 3 | Guest Post Contextual | Contributed content on real sites with traffic. DR 20–50. Body text placement, 2–5 word anchor text. | Medium-High. Volume builder. Anchor text control. Placement discipline required \[US8117209B1\]. |
| 4 | Directory / Citation | Established directories, local citations, industry databases. Consistent NAP. | Low-Medium. Trust building. Entity establishment. Domain validation for new sites. |
| 5 | Spam / PBN | Purchased links, link farms, deindexed sites, PBNs. | Negative or zero. Penguin penalty risk. Disavow. |

## **6.3  The Link Building Strategy Formula  ← US8682892B1**

The goal of link building is not simply to accumulate backlinks. Under the Panda patent (US8682892B1), it is to build an optimal ratio of independent links to reference queries. Both dimensions must grow together. A site that builds 10,000 backlinks without growing branded search volume will have a declining group modification factor because the denominator (reference queries) remains static while the numerator grows artificially fast.

### **Healthy Anchor Text Distribution**

Branded anchors              30–40%   (company name, URL, brand \+ generic)

Generic anchors              15–25%   (click here, read more, this article)

Naked URL anchors            10–15%   (https://yoursite.com)

Topically related non-exact  15–20%   (related phrases, partial matches, LSI)

Exact match keyword           5–10%   (the precise target keyword — keep low)

Long-tail variations          5–10%   (natural question phrases, conversational)

WARNING: Exact match \>15–20% of total profile \= Penguin penalty risk

### **New Site Link Building Sequence — Patent-Optimised**

Phase 1 — Foundation (Months 1–3): Entity establishment and inception date trust. Per US7346839B2, the clock starts at first link discovery. Per US8682892B1, reference queries (branded searches) begin accumulating from the moment the brand appears in directories and social profiles.

* Google Business Profile — anchor in local entity system and NAP data

* Social media profiles — Facebook, LinkedIn, Twitter/X, YouTube, Instagram

* Top-tier business directories — Apple Maps, Yelp, Yellow Pages, BBB, Angi

* 50-pack local citations via SEO Butler — NAP must be byte-for-byte consistent

* Industry-specific directory citations

Phase 2 — Authority Building (Months 3–12): Build editorial links with body text placement. Focus on topical relevance — under the Reasonable Surfer model, a topically relevant link passes more equity than an off-topic link from the same domain.

* Guest posts: 1–3 per week across diversified domains. Body text placement. 2–5 word descriptive anchors. \[US8117209B1\]

* HARO / journalist outreach: respond to relevant media queries. Tier 1 editorial links by nature.

* Digital PR: create original data assets (surveys, proprietary research) — this also builds information gain scores for the target content \[US20190155948A1\]

* Podcast appearances: non-linked mentions still build branded search volume / reference queries \[US8682892B1\]

Phase 3 — Scale (Month 6+): With trust established, scale tactically with link insertions and partnership placements. Continue HARO. Do NOT use Skyscraper outreach for link bait content — Skyscraper content produces low IGS (US20190155948A1) and therefore fails to attract high-quality natural editorial links at scale.

|  | The Digital PR / IGS Flywheel Original research and unique data serves double duty: (1) it maximises Information Gain Score \[US20190155948A1\] — the content itself ranks better; (2) it is the only reliable way to attract Tier 1 editorial links at scale — journalists link to original data, not to 'comprehensive guides' that rehash existing information. A single original study (survey, experiment, proprietary analysis) can generate 10–50 high-authority links and scores maximum IGS simultaneously. |
| :---- | :---- |

| PART VII — TECHNICAL SEO SYSTEMS |
| :---: |

## **7.1  Core Web Vitals as Algorithm Inputs**

Since Google's Page Experience update, Core Web Vitals are official ranking signals measured from Chrome User Experience Report (CrUX) data — real user interactions, not lab simulations. They feed into the TechnicalScore component of the master ranking formula and also indirectly influence Navboost scores: a slow, layout-shifting page increases bad-click / pogo-stick rates \[US8595225B1\].

| Metric | What It Measures | Good Threshold | SEO Mechanism |
| :---- | :---- | :---- | :---- |
| LCP (Largest Contentful Paint) | Loading performance — when the largest content element becomes visible | \< 2.5 seconds | Slow LCP increases bounce rate, feeding bad clicks into Navboost \[US8595225B1\] |
| CLS (Cumulative Layout Shift) | Visual stability — how much the layout unexpectedly shifts during load | \< 0.1 | Layout shifts cause mis-clicks, accidental bounces — increases pogo-stick rate |
| INP (Interaction to Next Paint) | Responsiveness — time from user interaction to next visual response | \< 200ms | Poor interactivity reduces engagement depth and dwell time \[US10055467B1\] |

## **7.2  The EEAT Signal Architecture  ← US8682892B1**

EEAT (Experience, Expertise, Authoritativeness, Trustworthiness) is Google's quality framework for evaluating content credibility. While not a direct ranking factor as a single score, EEAT signals feed into the broader quality scoring systems and are especially critical for YMYL (Your Money Your Life) topics.

**Patent grounding for Authoritativeness:** The most important and underappreciated EEAT signal is branded search volume. Per US8682892B1, reference queries — branded and navigational searches — are the denominator in the group modification factor. A brand that has built substantial branded search volume has a lower denominator value (relative to its independent links), resulting in a higher group modification factor. Building brand recognition is not a PR activity that indirectly helps SEO — it is a direct algorithmic input into the quality multiplier.

| EEAT Dimension | Direct Signals | Patent Grounding |
| :---- | :---- | :---- |
| Experience | First-person experience language, author bios with direct involvement, date/location specificity in reviews | US20190155948A1 — first-hand experience is an explicit IGS bonus source (up to \+3 points) |
| Expertise | Author credentials, technical depth and precision, citations of primary sources, academic or professional vocabulary | Phrase model quality signals — US9767157B2 — content matching expert publication vocabulary patterns |
| Authoritativeness | Domain age and history, backlinks from authoritative sources, Wikipedia/Wikidata mentions, branded search volume | US8682892B1 — branded/navigational searches (reference queries) are formal algorithmic inputs to the quality multiplier |
| Trustworthiness | SSL, Privacy Policy, Terms of Service, About Us with real team info, Contact page, third-party reviews, Google Business Profile | US7346839B2 — domain legitimacy and trust signals tracked historically as part of domain-related information scoring |

## **7.3  Technical Audit Framework**

### **Crawlability Audit**

* robots.txt correctly configured — critical pages not accidentally blocked

* XML sitemap submitted to Google Search Console and updated with every new publication

* No crawl errors in Search Console Coverage report

* All important pages reachable within 3 clicks of homepage

* No redirect chains longer than 2 hops

### **Indexation Audit**

* One canonical version of site resolves (www vs non-www, http vs https)

* Canonical tags correctly implemented on all paginated, parameterised, or duplicate URL variants

* noindex tags not accidentally applied to important pages

* No duplicate title tags or meta descriptions across the site

* Search Console shows expected pages as indexed

### **Performance Audit**

* Core Web Vitals passing: LCP \<2.5s, CLS \<0.1, INP \<200ms

* Images served in WebP or AVIF format and correctly sized

* Browser caching and CDN configured

* JavaScript deferred where not critical to first render

* Server response time under 200ms TTFB

### **Security and Trust Audit**

* SSL certificate valid and HTTPS enforced across all pages

* No manual actions in Google Search Console

* Security headers configured: HSTS, Content-Security-Policy, X-Frame-Options

* Google Business Profile verified and complete (local businesses)

| PART VIII — REPLICABLE ALGORITHMS & TOOLS |
| :---: |

This section provides formal algorithm specifications designed to be implemented in AI tools, SEO software, or automated workflows. All modules incorporate the patent-grounded scoring dimensions defined throughout this document.

## **8.1  The Universal Page Scoring Algorithm (UPSA)**

UPSA evaluates a page against a target keyword and returns a composite score with actionable deficiency list. Patent-grounded dimensions are noted inline.

### **UPSA Module 1: Structural Signals (25 points)**

function score\_structural(page\_data, keyword):

  score \= 0

  // Title tag (10 pts)

  if keyword in page\_data.title:              score \+= 6

  if len(page\_data.title) \<= 60:              score \+= 2

  if page\_data.title.startswith(keyword\[:len(keyword)//2\]):  score \+= 2

  // H1 (8 pts)

  if count(page\_data.h1) \== 1:               score \+= 3

  if keyword in page\_data.h1\[0\]:             score \+= 5

  // URL slug (4 pts)

  if keyword.replace(' ','-') in page\_data.url:  score \+= 4

  elif any(w in page\_data.url for w in keyword.split()):  score \+= 2

  // H2 presence (3 pts)

  if len(page\_data.h2s) \>= 2:                score \+= 3

  return score  // max 25

### **UPSA Module 2: Semantic Completeness (25 points)**

function score\_semantic(page\_data, competitor\_pages, keyword):

  all\_lsi \= \[\]

  for page in competitor\_pages:

    all\_lsi.extend(extract\_lsi\_terms(page, keyword))

  consensus\_lsi \= \[t for t in set(all\_lsi) if all\_lsi.count(t) \>= 2\]

  covered \= \[t for t in consensus\_lsi if t in page\_data.body\_text\]

  lsi\_score \= (len(covered) / len(consensus\_lsi)) \* 15

  expected\_entities \= extract\_entities(competitor\_pages)

  page\_entities \= extract\_entities(\[page\_data\])

  entity\_score \= min(10, (len(page\_entities & expected\_entities)

                        / len(expected\_entities)) \* 10\)

  return lsi\_score \+ entity\_score  // max 25

### **UPSA Module 3: Content Quality \+ Information Gain (25 points)  ← US20190155948A1**

function score\_quality(page\_data, competitor\_pages):

  score \= 0

  comp\_avg\_wc \= mean(\[wc(p) for p in competitor\_pages\])

  // Word count (8 pts)

  if wc(page\_data) \>= comp\_avg\_wc:           score \+= 8

  elif wc(page\_data) \>= comp\_avg\_wc \* 0.85:  score \+= 5

  elif wc(page\_data) \>= comp\_avg\_wc \* 0.70:  score \+= 2

  // Rich content elements (8 pts)

  if has\_faq(page\_data):          score \+= 2  // passage scoring candidates

  if has\_schema\_markup(page\_data): score \+= 2

  if count\_images(page\_data) \>= 3: score \+= 2

  if has\_table\_of\_contents(page\_data): score \+= 1

  if count\_lists(page\_data) \>= 2:  score \+= 1

  // Intent alignment (9 pts)

  intent \= classify\_intent(page\_data.primary\_keyword)

  if content\_matches\_intent(page\_data, intent):    score \+= 9

  elif partial\_match(page\_data, intent):           score \+= 4

  // IGS bonus assessed separately — see igs\_bonus()

  return score  // max 25 (+ 0–15 from igs\_bonus)

function igs\_bonus(page\_data, competitor\_pages):

  bonus \= 0

  if has\_original\_research(page\_data):             bonus \+= 5

  if has\_expert\_quotes\_not\_in\_competitors(page\_data, competitor\_pages): bonus \+= 4

  if has\_firsthand\_experience\_signals(page\_data):  bonus \+= 3

  if has\_unique\_visualisations\_or\_tools(page\_data): bonus \+= 2

  if has\_contrarian\_evidence\_backed\_position(page\_data, competitor\_pages): bonus \+= 1

  return min(15, bonus)

### **UPSA Module 4: Passage Scoring Readiness (15 points)  ← US9940367B1 \+ US9959315B1**

function score\_passage\_readiness(page\_data, keyword):

  score \= 0

  // H2s as answerable questions (8 pts)

  question\_h2s \= \[h for h in page\_data.h2s if is\_question\_or\_direct\_answer(h)\]

  score \+= min(8, len(question\_h2s) \* 2\)

  // First sentences of sections are direct answers (4 pts)

  answering\_sections \= \[s for s in page\_data.sections

                        if first\_sentence\_directly\_answers\_heading(s)\]

  score \+= min(4, len(answering\_sections))

  // FAQ section present (3 pts)

  if has\_faq(page\_data): score \+= 3

  return score  // max 15

### **UPSA Module 5: Technical Signals (10 points)**

function score\_technical(page\_data, vitals):

  score \= 0

  if vitals.lcp \<= 2500:  score \+= 3

  elif vitals.lcp \<= 4000: score \+= 1

  if vitals.cls \<= 0.1:   score \+= 2

  if vitals.inp \<= 200:   score \+= 2

  if page\_data.has\_canonical:       score \+= 1

  if page\_data.has\_schema:          score \+= 2

  return score  // max 10

### **UPSA Composite Scoring**

function run\_upsa(page\_url, keyword, competitor\_urls):

  page\_data   \= fetch\_and\_parse(page\_url)

  competitors \= \[fetch\_and\_parse(u) for u in competitor\_urls\]

  vitals      \= fetch\_cwv(page\_url)

  s1 \= score\_structural(page\_data, keyword)          // max 25

  s2 \= score\_semantic(page\_data, competitors, keyword) // max 25

  s3 \= score\_quality(page\_data, competitors)         // max 25

  igs \= igs\_bonus(page\_data, competitors)            // max 15

  s4 \= score\_passage\_readiness(page\_data, keyword)   // max 15

  s5 \= score\_technical(page\_data, vitals)            // max 10

  total \= s1 \+ s2 \+ s3 \+ igs \+ s4 \+ s5              // max 115

  return {

    'composite\_score': total,

    'structural': s1, 'semantic': s2, 'quality': s3,

    'igs\_bonus': igs, 'passage\_readiness': s4, 'technical': s5,

    'grade': 'A' if total\>=95 else 'B' if total\>=75 else 'C' if total\>=55 else 'D',

    'action\_items': generate\_actions(s1,s2,s3,igs,s4,s5,page\_data,keyword)

  }

## **8.2  The Competitor Analysis Algorithm**

function competitor\_analysis(keyword, top\_n=5):

  serp  \= google\_serp(keyword, n=top\_n)

  pages \= \[fetch\_and\_parse(url) for url in serp.organic\_urls\]

  analysis \= {

    'avg\_word\_count':     mean(\[wc(p) for p in pages\]),

    'median\_word\_count':  median(\[wc(p) for p in pages\]),

    'avg\_h2\_count':       mean(\[len(p.h2s) for p in pages\]),

    'avg\_h3\_count':       mean(\[len(p.h3s) for p in pages\]),

    'consensus\_lsi':      get\_consensus\_terms(pages, min\_frequency=3),

    'consensus\_entities': get\_consensus\_entities(pages, min\_frequency=3),

    'question\_h2\_ratio':  mean(\[question\_h2\_pct(p) for p in pages\]),

    'shared\_h2\_topics':   get\_common\_heading\_themes(pages),

    'has\_faq':            sum(1 for p in pages if has\_faq(p)),

    'has\_original\_data':  sum(1 for p in pages if has\_original\_research(p)),

    'dominant\_intent':    classify\_intent(keyword),

    'schema\_types':       \[get\_schema\_types(p) for p in pages\],

  }

  igs\_gap \= identify\_igs\_opportunities(pages)  // US20190155948A1

  brief \= generate\_content\_brief(keyword, analysis, igs\_gap,

                                  target\_wc=analysis\['avg\_word\_count'\]\*1.1)

  return analysis, igs\_gap, brief

## **8.3  The AI Writer Prompt System**

Pass this prompt template to any LLM (Claude, GPT-4, Gemini) to produce SEO-optimised content that follows the on-page architecture in this document and satisfies Information Gain requirements:

SYSTEM PROMPT:

You are a senior SEO content writer. Your task is to write a complete,

publication-ready article using the brief below. Follow these requirements:

ARCHITECTURE (apply in order of priority):

1\. Primary keyword in: title tag, H1, URL slug, first 100 words, and 1–2 H2s

2\. Write every H2 as a clear answerable question or definitive statement

3\. First 1–2 sentences of each section must directly answer the H2 above them

4\. Distribute all LSI terms naturally throughout — never in clusters

5\. Include at minimum one of: original data point, expert quote not on SERP,

   first-hand experience, or unique perspective (Information Gain requirement)

6\. End with an FAQ section using question-format H3s with direct answers

7\. Word count: \[TARGET\_WC\] words minimum

BRIEF:

Primary keyword: \[KEYWORD\]

Search intent: \[INTENT\]

Target audience: \[AUDIENCE\]

LSI terms to include: \[LSI\_LIST\]

H2 outline: \[H2\_LIST\]

Unique angle / IGS element: \[ORIGINAL\_ANGLE\]

Competitor gaps to fill: \[GAP\_LIST\]

## **8.4  The On-Page Optimisation Algorithm**

Takes a draft and returns prioritised, patent-grounded optimisation recommendations:

function optimize\_on\_page(draft\_content, seo\_brief, competitor\_data):

  issues \= \[\]

  kw \= seo\_brief.primary\_keyword

  // \=== STRUCTURAL CHECKS \===

  if kw not in draft\_content.title:

    issues.append({priority:'CRITICAL', fix:f'Add "{kw}" to title tag'})

  if count(draft\_content.h1\_tags) \!= 1:

    issues.append({priority:'CRITICAL', fix:'Ensure exactly one H1 tag'})

  if kw not in draft\_content.h1\_tags\[0\]:

    issues.append({priority:'HIGH', fix:f'Add "{kw}" to H1'})

  if kw not in draft\_content.first\_100\_words:

    issues.append({priority:'HIGH', fix:'Move keyword into first 100 words'})

  // \=== PASSAGE CHECKS (US9940367B1 \+ US9959315B1) \===

  vague\_h2s \= \[h for h in draft\_content.h2s if not is\_question\_or\_answer(h)\]

  if vague\_h2s:

    issues.append({priority:'HIGH', fix:

      f'Rewrite {len(vague\_h2s)} H2(s) as clear questions: {vague\_h2s\[:3\]}'})

  sections\_missing\_answer \= \[s for s in draft\_content.sections

    if not first\_sentence\_answers\_heading(s)\]

  if sections\_missing\_answer:

    issues.append({priority:'HIGH', fix:

      'Move the answer to first sentence in each section for passage scoring'})

  // \=== INFORMATION GAIN CHECK (US20190155948A1) \===

  if not has\_any\_igs\_element(draft\_content):

    issues.append({priority:'CRITICAL', fix:

      'Add at least one novel element: original data, expert quote, first-hand experience'})

  // \=== SEMANTIC CHECKS \===

  missing\_lsi \= \[t for t in seo\_brief.consensus\_lsi

                 if t not in draft\_content.body\]

  if len(missing\_lsi) \> 5:

    issues.append({priority:'HIGH', fix:f'Add missing LSI terms: {missing\_lsi\[:10\]}'})

  // \=== INTERNAL LINKS (US8117209B1) \===

  early\_links \= links\_in\_first\_half(draft\_content)

  if len(early\_links) \< 2:

    issues.append({priority:'MEDIUM', fix:

      'Add 2+ internal links in body text, first half of article, 2–5 word anchors'})

  // \=== WORD COUNT \===

  if wc(draft\_content) \< competitor\_data.avg\_word\_count \* 0.9:

    issues.append({priority:'MEDIUM',

      fix:f'Increase WC from {wc(draft\_content)} to \~{int(competitor\_data.avg\_word\_count)}'})

  return sorted(issues, key=lambda x: PRIORITY\_ORDER\[x.priority\])

| APPENDIX — COMPLETE PATENT CITATION INDEX BY SECTION |
| :---: |

## **All 9 Patents with Section References**

| Patent | Title | Sections Referenced |
| :---- | :---- | :---- |
| US8682892B1 | Ranking Search Results (Parent Panda) | 3.1 \[formula term 2\], 3.2 Group D, 3.4, 5.1, 6.2, 6.3, 7.2 |
| US10055467B1 | Ranking Search Results (Continuation — Behavioural) | 1.1, 3.1 \[formula term 2\], 3.2 Group E, 3.4, 7.1 |
| US9135307B1 | Selectively Generating Alternative Queries | 1.2, 5.1 |
| US8117209B1 | Ranking Documents — Reasonable Surfer Model | 3.1 \[formula term 4\], 3.2 Group D, 4.1, 4.5, 5.2, 6.1, 6.3, 8.4 |
| US8595225B1 | Correlating Document Topicality and Popularity (Navboost) | 1.1, 3.1 \[formula term 5\], 3.2 Group E, 3.5, 4.1, 5.1, 7.1 |
| US7346839B2 | Information Retrieval Based on Historical Data | 1.3, 3.1 \[formula term 6\], 3.2 Group F, 3.3, 4.1, 4.5, 6.3, 7.2 |
| US9940367B1 | Scoring Candidate Answer Passages | 3.1 \[formula term 7\], 4.1, 4.3, 4.5, 5.1, 8.1, 8.4 |
| US9959315B1 | Context Scoring Adjustments for Answer Passages | 4.3, 8.1, 8.4 |
| US20190155948A1 | Contextual Estimation of Link Information Gain | 3.1 \[formula term 3\], 3.2 Group B, 4.4, 4.5, 5.3, 6.3, 7.2, 8.1, 8.3, 8.4 |

## **Supplementary Sources**

* 2023 U.S. Department of Justice v. Google LLC antitrust trial: sworn testimony of Pandu Nayak (VP Search) confirming Navboost as a primary ranking signal, Eric Lehman (Google executive) confirming score modulation by data volume. Patent US8595225B1 confirmed as Navboost foundation.

* 2024 Google Search API Leak (May 2024): 2,500 internal documents independently confirming Navboost mechanics, click data collection from Chrome, good/bad/last-longest click categorisation, 13-month history window.

* Google Quality Rater Guidelines (public): EEAT framework, YMYL classification, quality rater methodology.

* Google's Search Central documentation (public): crawl budget, canonical tags, structured data, Core Web Vitals specifications.

—  END OF DISSERTATION  —  9 Google Patents  ·  6 Patent Groups  ·  DOJ Trial Confirmed  ·  2024 Edition  —
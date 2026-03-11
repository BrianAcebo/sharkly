  
**SHARKLY**

SHARK ENGINE OPTIMIZATION

**COMPLETE PRODUCT SPECIFICATION**

Master Build Document  ·  Beta through V4

For Cursor AI Development  ·  All Phases  ·  All Features

**Version 4.0 — Patent-Grounded Edition  ·  2026  ·  sharkly.co**

**Patent Foundation (9 Confirmed Google Patents):**

US8682892B1  ·  US10055467B1  (Panda — Group Modification Factor \+ Behavioral Layer)

US9135307B1  (Alternative Query Replacement — Domain Quality Pre-Classification)

US8117209B1  (Reasonable Surfer — Link Equity by Click Probability)

US8595225B1  (Navboost — Topic-Specific Behavioral Ranking, DOJ Confirmed 2023\)

US7346839B2  (Historical Data — Sandbox, Inception Date, Link Velocity)

US9940367B1  ·  US9959315B1  (Passage Scoring — H2 as Context Vectors)

US20190155948A1  (Information Gain Score — Anti-Skyscraper Mechanism)

# **SECTION 1: HOW TO USE THIS DOCUMENT**

## **1.1 For Cursor AI**

This is the single source of truth for building Sharkly across all phases. Every screen, data model, AI prompt, API call, component, and business rule is specified here. When building any feature, read the relevant section completely before writing code. Do not infer or improvise — if it is specified here, build it exactly as specified. If two sections appear to conflict, the later section takes precedence.

| ⚠️  CRITICAL: Section 8.5 (old scoring formula showing max 100\) is SUPERSEDED by Section 17\. The UPSA model in Section 17 is the only scoring formula that should be built. Max score is 115\. All seo\_score DB fields store values 0–115. |
| :---- |

## **1.2 Build Order Rule**

Follow Section 4 (Beta Critical Path) first. Build features in exact order. Do not begin V1 work until the entire Beta loop is tested end-to-end. Beta is complete when a user can: sign up → onboard → see strategy → start cluster → generate brief \+ article → pay $39/month.

## **1.3 Phase Definitions**

| Phase | Goal | Tier Unlocked | When Complete |
| :---- | :---- | :---- | :---- |
| Beta | Core loop. Validate demand. Must work perfectly. | Builder ($39) minimum | User completes full journey, pays $39 |
| V1 | Full product. All tiers chargeable with confidence. | All 4 tiers live | All tier features functional |
| V2 | Competitive intelligence depth. Moat starts building. | Pro differentiators | Advanced analytics \+ agency features |
| V3 | Revenue attribution. Autonomous suggestions. | Scale/Pro value increase | Revenue tracking \+ auto-suggestions |
| V4 | Self-running SEO. Platform maturity. | Pro retention play | Autonomous weekly execution |

| ⚠️  CRITICAL: What NOT To Do: Do not build V2 features during Beta. Do not "improve" features beyond their spec — ship the spec first. Do not show technical error messages to users. Do not use jargon (see Section 2.4 Language Rules). |
| :---- |

# **SECTION 2: PRODUCT VISION & PHILOSOPHY**

## **2.1 What Sharkly Is**

Sharkly is a full-stack AI Chief SEO Officer delivered as a SaaS. It takes a non-expert business owner from zero SEO knowledge to executing a professional-grade strategy — without needing to understand how any of it works. The product replaces what currently requires: Page Optimizer Pro ($79/mo) \+ Semrush ($129/mo) \+ an SEO agency ($2,000–5,000/mo).

Core capabilities:

* Audits the site and diagnoses what is holding it back

* Identifies the best keywords given current domain authority (grounded in US8682892B1's group modification factor threshold)

* Builds a complete content strategy and calendar

* Creates actual content with live SEO scoring (UPSA model, max 115 pts — see Section 17\)

* Monitors rankings and performance (Navboost CTR signals per US8595225B1)

* Tells the user exactly what to do next, always

## **2.2 The Apple vs Microsoft Principle**

Every feature, label, message, and tooltip must pass this test before shipping. Competitors show you data. Sharkly tells you what to do with it.

| Competitor Says (Microsoft) | Sharkly Says (Apple) |
| :---- | :---- |
| Important Terms Range: 3-6, Current Count: 0 🔴 | Your title is missing 3 key phrases Google expects here. |
| LSI coverage: 47% | Your page is missing 12 topic signals your competitors all have. |
| KD: 34 — DA: 28 | This keyword is a good match for where your site is right now. |
| NexGen EEAT score: 34/80 | Google may not fully trust this page yet. Add: an author bio, a contact page, a privacy policy. |

## **2.3 Language Rules (Non-Negotiable)**

These apply to every label, tooltip, error message, AI output, and empty state in the entire application.

| Never Say | Always Say Instead |
| :---- | :---- |
| Keyword difficulty | How hard it is to rank for this |
| Domain authority / DA | How strong your site currently is |
| LSI terms | Related topics Google expects to see |
| SERP | Google search results |
| Canonical tag | Preferred page version setting |
| Meta description | Google search preview description |
| Backlinks | Links from other websites |
| Algorithm | How Google ranks pages |
| ToFu / MoFu / BoFu | Awareness / Consideration / Conversion |
| PageRank | Page authority |
| Navboost | Click signal (internal term only — never show users) |
| Group modification factor | Site authority multiplier (internal term only) |
| IGS / Information Gain Score | Original content score (internal term only) |

## **2.4 The Product Promise**

"Tell us about your business and we'll build your entire SEO strategy, create the content, track what's working, and tell you exactly what to do next — in plain English, no expertise required." Every feature must deliver on this promise.

# **SECTION 3: PHASE OVERVIEW & FEATURE COUNTS**

| Category | Beta | V1 | V2 | V3 / V4 |
| :---- | :---- | :---- | :---- | :---- |
| 1 — Onboarding & Setup | 7 | 5 | 2 | — |
| 2 — Topic Strategy Engine | 6 | 4 | 7 | 2 |
| 3 — Content Engine | 9 | 11 | 4 | 2 |
| 4 — Cluster Management | 8 | 6 | 3 | — |
| 5 — Performance & Analytics | 1 | 7 | 4 | 3 |
| 6 — Technical SEO | — | 10 | 2 | 3 |
| 7 — CRO | 3 | 3 | 2 | — |
| 8 — Integrations | 1 | 3 | 2 | 2 |
| 9 — Credit & Billing | 7 | 5 | 2 | — |
| 10 — Agency & White-Label | — | 2 | 2 | 1 |
| 11 — AI Intelligence Layer | 4 | 2 | 2 | 2/3 |
| 12 — Settings & Brand Voice | 2 | 3 | 2 | — |
| 13 — Shopify App Store | 5 | 4 | — | — |
| TOTAL | 53 | 65 | 32 | 15/3 |

# **SECTION 4: BETA CRITICAL PATH**

| ⚠️  CRITICAL: Non-Negotiable Rule: Build these items in exact order. Do not start \#2 until \#1 is tested end-to-end. The Beta is only complete when the entire loop works without errors. |
| :---- |

| \# | Feature | Dependency | Why |
| :---- | :---- | :---- | :---- |
| 1 | Supabase Auth (email \+ Google OAuth) | None | Everything requires a user. |
| 2 | Onboarding — 5-step flow | Auth | Creates the project record all features reference. |
| 3 | Domain Authority fetch via Moz API or DataForSEO | Onboarding | REQUIRED before authority fit can classify anything. See Section 17.3. |
| 4 | Project creation in Supabase | Onboarding | Data foundation. Every feature reads from this. |
| 5 | Serper.dev SERP analysis | Project | Powers strategy, briefs, and scoring. |
| 6 | Topic strategy generation (Claude Haiku 4.5) | Serper \+ Project | First value moment. |
| 7 | Cluster creation with React Flow map | Topics | Core organizational unit. |
| 8 | Focus page brief generation (GPT-4o-mini) | Cluster \+ Serper | Primary high-credit action. |
| 9 | Article generation (GPT-4o-mini) | Cluster \+ Serper | Secondary content loop. |
| 10 | Tiptap WYSIWYG editor | Article gen | Content editing surface. |
| 11 | Live UPSA score (client-side, max 115\) | Tiptap | Closes feedback loop. See Section 17.1. |
| 12 | Credit system — deduction \+ balance | All AI actions | Required before Stripe. |
| 13 | Stripe — Builder \+ Growth tiers | Credit system | Revenue. Not a product without payment. |
| 14 | AI insight blocks (all 4 main screens) | All above | Makes product feel like a CSO. |
| 15 | Dashboard final assembly | All above | Integration point. |

## **4.2 Beta Success Criteria**

Beta is complete when this journey works end-to-end without errors:

1. User visits sharkly.co and clicks "Start free trial"

2. Signs up with email or Google (\< 60 seconds)

3. Completes 5-step onboarding: URL → business info → competitors → animated loading → strategy ready

4. Loading sequence makes REAL API calls (not faked): SERP analysis, DA fetch, competitor crawl, Haiku topic generation

5. Lands on dashboard. AI insight block shows specific, data-driven guidance.

6. Navigates to Strategy. Sees 15-25 topics prioritized by authority fit.

7. Clicks "Start Cluster" on an Achievable topic (15 credits deducted).

8. React Flow map populates with focus page node \+ initial article nodes (Sharkly suggests based on PAA and competitor structure — typically 3–8 for a narrow topic, more for a broad one).

9. Opens focus page in workspace. Generates brief (40 credits deducted).

10. Generates article (20 credits deducted). Sees it in Tiptap editor.

11. Live UPSA score (0-115) updates as user edits.

12. Credits run low → amber warning → upgrade prompt.

13. User completes Stripe checkout → $39/month Builder plan active.

# **SECTION 5: TECH STACK & ARCHITECTURE**

| Layer | Technology & Notes |
| :---- | :---- |
| Frontend Framework | React 18 \+ Vite \+ TypeScript. Strict TypeScript. No any types. |
| Routing | React Router v6. Data router pattern. Nested routes for app shell. |
| Styling | Tailwind CSS \+ shadcn/ui. Tailwind v3. shadcn/ui for base components. |
| State | Zustand. One store per domain: user, project, cluster, workspace. |
| Database | Supabase Postgres. RLS on all tables. Never bypass RLS. |
| Auth | Supabase Auth. Email \+ password \+ Google OAuth. |
| Visual Map | React Flow (reactflow) v11+. Custom node types. Dagre layout. |
| Content Editor | Tiptap v2. Custom extensions for SEO score integration. |
| Charts | Recharts v2. All performance charts. |
| Strategy AI | Claude Haiku 4.5 (Anthropic). Topics, authority fit, insights, CRO reasoning. |
| Content AI | GPT-4o-mini (OpenAI). Articles, briefs, metas, FAQs, schema, rewrites. |
| SERP Data | Serper.dev. Keyword research, competitor analysis, PAA. |
| Domain Authority | Moz API or DataForSEO. REQUIRED for Beta — see Section 17.3. |
| Payments | Stripe. Subscriptions \+ one-time overage credits. |
| Shopify Billing | Shopify Billing API. V1 — mirror tiers for App Store installs. |
| Hosting | Vercel. Frontend. Edge Functions for webhooks \+ heavy AI. |
| Storage | Supabase Storage. User avatars. White-label logos (V1). |

## **5.2 Environment Variables**

| VITE\_SUPABASE\_URL= VITE\_SUPABASE\_ANON\_KEY= SUPABASE\_SERVICE\_ROLE\_KEY=   \# server-side only, never expose to client OPENAI\_API\_KEY=              \# GPT-4o-mini ANTHROPIC\_API\_KEY=           \# Claude Haiku 4.5 SERPER\_API\_KEY=              \# serper.dev MOZ\_ACCESS\_ID=               \# Moz API (domain authority) — REQUIRED MOZ\_SECRET\_KEY=              \# Moz API secret \# OR if using DataForSEO: DATAFORSEO\_LOGIN= DATAFORSEO\_PASSWORD= STRIPE\_SECRET\_KEY= STRIPE\_PUBLISHABLE\_KEY= STRIPE\_WEBHOOK\_SECRET= STRIPE\_BUILDER\_PRICE\_ID=     \# $39/month STRIPE\_GROWTH\_PRICE\_ID=      \# $79/month STRIPE\_SCALE\_PRICE\_ID=       \# $119/month STRIPE\_PRO\_PRICE\_ID=         \# $169/month STRIPE\_OVERAGE\_PRODUCT\_ID=   \# one-time credit purchase |
| :---- |

# **SECTION 6: DATABASE SCHEMA (COMPLETE)**

Schema rules: All tables use UUID primary keys, created\_at \+ updated\_at timestamps, and RLS enabled. Users can only access their own data via user\_id or project\_id foreign keys.

## **Core Tables**

### **profiles**

| id                     uuid PK REFERENCES auth.users full\_name              text avatar\_url             text plan                   text DEFAULT 'free'  \-- free|builder|growth|scale|pro credits\_monthly        integer DEFAULT 0 credits\_remaining      integer DEFAULT 0 stripe\_customer\_id     text stripe\_subscription\_id text onboarding\_complete    boolean DEFAULT false created\_at / updated\_at timestamptz |
| :---- |

### **projects**

| id                     uuid PK user\_id                uuid REFERENCES profiles(id) ON DELETE CASCADE name                   text NOT NULL url                    text NOT NULL platform               text  \-- shopify|wordpress|webflow|woocommerce|custom|other niche                  text customer\_description   text domain\_authority       integer DEFAULT 0  \-- from Moz/DataForSEO (not estimated) onboarding\_complete    boolean DEFAULT false gsc\_connected          boolean DEFAULT false gsc\_site\_url           text gsc\_refresh\_token      text  \-- encrypted shopify\_domain         text shopify\_access\_token   text  \-- encrypted created\_at / updated\_at timestamptz |
| :---- |

### **domain\_authority\_history  ← NEW — Required for keyword velocity tier tracking**

| id                 uuid PK project\_id         uuid REFERENCES projects(id) ON DELETE CASCADE domain\_authority   integer  \-- from Moz or DataForSEO referring\_domains  integer  \-- from backlink API source             text  \-- 'moz'|'dataforseo'|'estimate' is\_fallback        boolean DEFAULT false  \-- true if API unavailable recorded\_at        timestamptz created\_at         timestamptz   \-- Purpose: Detect when DA crosses thresholds to unlock previously locked keyword tiers. \-- Without history, the keyword velocity tier system cannot detect progression. |
| :---- |

### **navboost\_signals  ← NEW — Required for Navboost Momentum Score**

| id              uuid PK project\_id      uuid REFERENCES projects(id) ON DELETE CASCADE keyword         text page\_url        text week\_start      date impressions     integer clicks          integer ctr             decimal(6,4) avg\_position    decimal(5,2) created\_at      timestamptz   \-- Purpose: Aggregate GSC data weekly to detect CTR decay patterns. \-- Raw daily performance\_data is not efficient for Navboost trend analysis across many keywords. \-- Populated by Edge Function running weekly after GSC sync. |
| :---- |

### **topics**

| id                 uuid PK project\_id         uuid REFERENCES projects(id) ON DELETE CASCADE title              text NOT NULL keyword            text NOT NULL monthly\_searches   integer keyword\_difficulty integer cpc                decimal(6,2) funnel\_stage       text  \-- tofu|mofu|bofu authority\_fit      text  \-- achievable|buildToward|locked priority\_score     decimal ai\_reasoning       text status             text DEFAULT 'queued'  \-- queued|active|complete|locked kgr\_score          decimal  \-- allintitle\_count / monthly\_searches allintitle\_count   integer cluster\_id         uuid REFERENCES clusters(id) created\_at / updated\_at timestamptz |
| :---- |

### **clusters**

| id              uuid PK project\_id      uuid REFERENCES projects(id) ON DELETE CASCADE topic\_id        uuid REFERENCES topics(id) title           text NOT NULL target\_keyword  text status          text DEFAULT 'active' completion\_pct  integer DEFAULT 0 created\_at / updated\_at timestamptz |
| :---- |

### **pages**

| id                            uuid PK cluster\_id                    uuid REFERENCES clusters(id) ON DELETE CASCADE project\_id                    uuid REFERENCES projects(id) type                          text  \-- focus|article title                         text keyword                       text funnel\_stage                  text status                        text DEFAULT 'draft'  \-- draft|review|published seo\_score                     integer DEFAULT 0  \-- UPSA score 0-115 (NOT 0-100) word\_count                    integer DEFAULT 0 target\_word\_count             integer meta\_title                    text meta\_description              text content                       jsonb  \-- Tiptap JSON content brief\_data                    jsonb  \-- competitor analysis, lsi\_terms\[\], entities\[\],                               \--   paa\_questions\[\], igs\_opportunity, term\_targets,                               \--   dominant\_intent, schema\_generated, competitors\_raw\[\] schema\_generated              boolean DEFAULT false published\_url                 text published\_at                  timestamptz position\_x                    float  \-- React Flow node position position\_y                    float last\_updated\_meaningful       timestamptz  \-- Updated when word count changes by \>10%                               \-- or H2 structure changes. Used for freshness tracking. created\_at / updated\_at       timestamptz   \-- IMPORTANT: seo\_score stores UPSA score max 115 (not 100). \-- last\_updated\_meaningful: set on save if abs(new\_word\_count \- old\_word\_count) / old\_word\_count \> 0.10 \--   OR if H2 count changes. This distinguishes meaningful updates from typo fixes. |
| :---- |

### **internal\_links**

| id                 uuid PK project\_id         uuid REFERENCES projects(id) cluster\_id         uuid REFERENCES clusters(id) from\_page\_id       uuid REFERENCES pages(id) to\_page\_id         uuid REFERENCES pages(id) anchor\_text        text placement\_hint     text  \-- 'intro' | 'body' | 'conclusion' equity\_multiplier  decimal  \-- from Reasonable Surfer table: 1.00, 0.80, 0.50, 0.30, 0.15 status             text DEFAULT 'pending'  \-- pending|implemented priority           text  \-- 'critical' | 'high' | 'medium' | 'low' created\_at / updated\_at timestamptz |
| :---- |

### **performance\_data**

| id              uuid PK project\_id      uuid REFERENCES projects(id) page\_url        text keyword         text date            date impressions     integer clicks          integer ctr             decimal(6,4) avg\_position    decimal(5,2) created\_at      timestamptz |
| :---- |

### **technical\_issues**

| id               uuid PK project\_id       uuid REFERENCES projects(id) issue\_type       text  \-- missing\_meta | duplicate\_title | thin\_content | broken\_link |                  \--   redirect\_chain | missing\_alt | canonical\_issue | schema\_error |                  \--   weak\_h2\_passage | missing\_igs\_elements | anchor\_text\_imbalance |                  \--   stale\_content | missing\_reverse\_silo\_link severity         text  \-- critical|warning|info affected\_url     text description      text  \-- plain English recommendation   text  \-- plain English fix resolved         boolean DEFAULT false crawl\_date       timestamptz |
| :---- |

Other tables (unchanged from V2): competitors, brand\_voice, credit\_transactions, content\_calendar, project\_memories — see original spec for schemas. No changes needed.

# **SECTION 7: EVERY SCREEN SPECIFIED**

## **7.1 Auth Screens**

/login: Centered card, dark navy background (\#0A1628). Email \+ password, Google OAuth, forgot password link. On submit: check onboarding\_complete → redirect to /onboarding or /dashboard. Error: "Invalid email or password" never specifying which field.

/signup: Same layout. On signup: create profile record, set free plan. Send verification email. Redirect to /onboarding.

## **7.2 Onboarding (5-Step Flow)**

| ⚠️  CRITICAL: Step 4 loading must make REAL API calls. Do not fake it. Real SERP analysis \+ real competitor crawl \+ real DA fetch via Moz/DataForSEO \+ real Haiku generation. The data shown in Step 5 must be real. |
| :---- |

| Step | Display Text | API Call | Notes |
| :---- | :---- | :---- | :---- |
| 1 | Scanning your website... | Fetch sitemap, count pages, detect platform |  |
| 2 | Checking your site health... | robots.txt, JS framework detection |  |
| 3 | Measuring your site strength... | Moz API or DataForSEO — fetch domain authority | Store in domain\_authority\_history |
| 4 | Analyzing \[competitor 1 domain\]... | Serper.dev crawl, extract headings, estimate DA |  |
| 5 | Analyzing \[competitor 2 domain\]... | Same |  |
| 6 | Finding keyword opportunities... | SERP analysis for top competitor keywords |  |
| 7 | Classifying your opportunities... | Claude Haiku authority fit classification | Apply new domain protocol if DA ≤ 5 |
| 8 | Building your strategy... | Generate 15-25 prioritized topics \+ save to DB |  |

| New Domain Protocol (DA \= 0–5): If Moz/DataForSEO returns DA ≤ 5, override authority fit: Achievable Now \= KD ≤ 15, Build Toward \= KD 16–30, Locked \= KD \> 30\. Show: "Your site is brand new — we've found \[N\] keywords you can realistically target in your first 3 months. These are terms your competitors aren't defending hard and Google is still deciding who to rank." See Section 17.3 for full logic. |
| :---- |

## **7.3 Dashboard (/dashboard)**

Full-width AI Strategist Insight Block (dark navy, teal left border, white text). Decision tree from Section 17.5 determines content priority. Priority 0 (if GSC connected): Navboost CTR decay warning fires before all else.

Stats Row — 4 Cards:

| Card | Label | Source | Empty State |
| :---- | :---- | :---- | :---- |
| 1 | Keywords Tracked | Count of topics with status=active | "0 — start your first cluster" |
| 2 | Avg. Position | GSC average (Growth+) or "—" | "Connect Search Console" |
| 3 | Content Published | pages with status=published | "0 — publish your first article" |
| 4 | SEO Score (0–115) | Average seo\_score, published pages | "N/A — publish content first" |

SEO Growth Stage Panel (new — V1): Below the stats row. Shows current phase (1/2/3/4) with plain-English milestone. "You're in Stage \[N\] of 4\. \[What unlocks Stage N+1\]." See Section 17.8 for logic.

## **7.4 Strategy (/strategy)**

Two-view toggle: Topics View | Keywords View. Filter pills: All | Achievable Now | Build Toward | BoFu | MoFu | ToFu | Quick Wins.

Quick Wins \= the highest-value achievable keywords right now. Defined by ALL of: authority\_fit \= achievable, funnel\_stage \= mofu or bofu, AND at least one of: (a) KGR \< 0.25 (low supply of optimised competition), (b) CPC \> $2 (high advertiser demand \= high commercial value), (c) priority\_score in top 25% of achievable topics. The KGR filter alone is insufficient — a keyword can have low allintitle competition but zero business value. High CPC is the strongest signal of commercial value because advertisers only bid on terms that convert. See Section 17.4 for the complete Quick Wins scoring logic.

| Authority Locked Tooltip (Updated Copy): "Google has already tested this keyword with millions of searches. It only shows results from websites with a proven track record of satisfying searchers for similar topics. Your site is building that track record right now — these keywords will unlock as your content and audience grow." Science: US8682892B1 group modification factor threshold gate. |
| :---- |

## **7.5–7.6 Clusters (/clusters and /clusters/:id)**

Cluster Health Bar adds: Reverse Silo Status indicator. "Missing links to focus page: \[N\] articles" shown as amber warning. ReverseSiloAlert component (see Section 12.2) fires when any article lacks a link to the focus page.

Internal Links Tab (updated): Table adds columns for Placement (Body-early ★★★★★ / Body-late ★★★★ / Other ★) and Equity Estimate (from Reasonable Surfer table). Flag generic anchors ("click here", "read more") in red. Flag footer/nav placements in amber.

## **7.7 Workspace (/workspace/:id) — Most Important Screen**

Editor left (60%), intelligence panel right (40%, collapsible). Live UPSA score badge (0–115) in header.

### **SEO Score Tab (Right Panel) — Updated**

Score displays as X/115 (NOT X/100). Score breakdown shows all 4 modules:

| Module | Points | Patent | What It Measures |
| :---- | :---- | :---- | :---- |
| Module 1 — Structural | 0–40 | Inverted index weights | Keyword in title (+15), H1 (+15), first 100 words (+10) |
| Module 2 — Semantic | 0–20 | SCS formula | Entity coverage (12 pts) \+ LSI term coverage (8 pts) |
| Module 3 — Content Quality | 0–25 | US20190155948A1 \+ US9940367B1 | H2 passage readiness (8 pts), word count (8 pts), PAA coverage (5 pts), rich elements (4 pts) |
| Module 4 — UX Signals | 0–15 | US8117209B1 | Internal links (8 pts), meta description (4 pts), schema (3 pts) |
| IGS Bonus | 0–15 | US20190155948A1 | Original research (+5), expert quotes (+4), first-hand experience (+3), unique viz (+2), contrarian (+1) |
| TOTAL MAX | 115 | All 9 patents | — |

| Skyscraper Warning fires when IGS bonus \= 0 AND word count \> 300\. Display: "⚠ Skyscraper Alert: Your content covers the same ground as every competitor. Add original data, an expert quote, or first-hand experience to differentiate and earn the information gain bonus." This is a persistent amber banner in the SEO tab until at least 1 IGS signal is detected. |
| :---- |

### **Entities Tab — Three-Section Panel**

Section 1 — Related Topics (LSI Terms): "Related Topics Google Expects to See." Two columns: Covered (green pills) | Missing (red pills with competitor usage count on hover). "Add all missing" button.

Section 2 — Key Concepts (Entities): "Key Concepts to Establish Expertise." Same layout. Must-cover entities starred (appear in 3+ competitors).

Section 3 — Questions to Answer (PAA): "Questions Your Audience Is Asking." Each shows: Answered (green check if H3 exists) or Unanswered. "Add as FAQ item" button.

### **Word Count Range Visualizer (New)**

Horizontal bar in workspace header. MIN marker (70% of target), TARGET marker (100%), MAX marker (130%). Dot showing current position. Color: gray if under min, green if in range, amber if over max. Label: "Your target is \~\[X\] words. You're at \[Y\] words."

### **PassageReadyIndicator (New — per H2 in brief)**

Small inline indicator on each H2 row in workspace brief. Green check (✓) if H2 starts with a question word or ends with "?". Gray X if not. Tooltip: "Question-format headings help Google find the answer to show in search results. See Section 17.1 for why this matters."

## **7.8 Performance (/performance) — Growth+ tier**

Unchanged from V2 spec. Adds Re-Optimization Queue card above rankings table.

### **Re-Optimization Queue — "Ready to Promote"**

Criteria: pages ranking positions 4–15 in GSC with SEO score \< 85 AND keyword with ≥ 500 monthly impressions.

| Column | Data | Notes |  |
| :---- | :---- | :---- | :---- |
| Page | Page title (links to workspace) |  |  |
| Current Position | Avg GSC position | Amber for 4–7, light for 8–15 |  |
| Potential | Could reach top 3 badge | Based on position proximity |  |
| Top Fix | Single highest-impact improvement | Plain English: "Add FAQ section" not "Increase Module 3 score" |  |
| Action | "Optimize Now" button → workspace | 25 credits for AI-powered optimization |  |

### **Navboost Momentum Panel**

Per-keyword CTR trend (13-week trailing). Status badges: 🟢 Building / 🟡 Flat / 🔴 Weakening. Tooltip: "Google's click signal compounds over 13 months. Improving CTR today builds ranking power through \[date \+13 months\]." Action: "Optimize Title" for 🔴 keywords (3 credits).

## **7.9 Technical SEO (/technical) — Scale+ tier**

Issue types now include: Weak H2 Passage Quality (pages where \< 50% of H2s are passage-ready), Missing IGS Elements (pages with IGS score \= 0), Anchor Text Imbalance (exact-match anchors \> 15%), Stale Content (last\_updated\_meaningful \> 6 months \+ rank drop), Missing Reverse Silo Link (article not linking to focus page).

### **Brand Search Signal Panel (Scale+)**

Branded search volume trend from GSC alongside backlink count trend. Ratio indicator (brand searches / backlinks). Status: Healthy / Growing / ⚠ Ratio Declining. Recommendations: "Ways to grow branded search volume" — PR, social media, podcast appearances.

Science: US8682892B1 — Brand searches are a direct input into Google's quality multiplier for the entire site.

# **SECTION 8: ALL AI PROMPTS SPECIFIED**

## **8.1 Topic Strategy Generation — Claude Haiku 4.5**

Called during: onboarding step 4, strategy regeneration. Model: claude-haiku-4-5 | Max tokens: 4000 | Cost: 15 credits

| SYSTEM: You are an expert SEO strategist. Write in plain English — never use jargon. Your job: find keyword opportunities for a business and classify each one honestly based on their current site strength.   IMPORTANT: Authority fit is based on Google's threshold gate mechanism. "Locked" does not mean harder — it means Google's algorithm literally withholds the domain-authority multiplier for new sites competing for high-volume terms (US8682892B1). Be honest about this in your reasoning.   USER: Business: {business\_name} What they offer: {niche\_description} Target customers: {customer\_description} Website: {url} | Site strength: {da}/100 | Platform: {platform}   Top competitor keywords found: {competitor\_1\_domain}: {top\_keywords} {competitor\_2\_domain}: {top\_keywords} {competitor\_3\_domain}: {top\_keywords}   SERP data: {serp\_data}   Generate ALL genuine keyword opportunities (typically 15-30, but stop when real opportunities run out — do not pad with weak keywords to hit a number). Return JSON array only, no preamble: \[{   "title": "human-readable topic title",   "keyword": "exact target keyword",   "monthly\_searches": number,   "keyword\_difficulty": 0-100,   "cpc": dollar\_amount,   "funnel\_stage": "tofu|mofu|bofu",   "authority\_fit": "achievable|buildToward|locked",   "priority\_score": number,   "ai\_reasoning": "2-sentence plain English explanation" }\]   Authority fit rules (apply strictly):   Standard: achievable \= KD \<= DA+10 | buildToward \= KD \<= DA+25 | locked \= KD \> DA+25   NEW DOMAIN OVERRIDE (if da \<= 5):     achievable \= KD \<= 15 | buildToward \= KD \<= 30 | locked \= KD \> 30   Priority score \= (intent\_weight \* cpc \* log10(searches+1)) / (kd/100 \+ 0.1) intent\_weight: bofu=3, mofu=2, tofu=1 Sort descending by priority\_score. Achievable topics first. |
| :---- |

## **8.2 Focus Page Brief Generation — GPT-4o-mini**

Cost: 40 credits. Model: gpt-4o-mini | Max tokens: 4000

| ⚠️  CRITICAL: This prompt is updated from V2. H2 formatting (US9940367B1 \+ US9959315B1) and IGS requirements (US20190155948A1) are now enforced. The old V2 prompt is superseded. |
| :---- |

| SYSTEM: You are an expert SEO content strategist and copywriter. Write in plain language — no SEO jargon.   CRITICAL — H2 HEADING FORMAT (Patent US9940367B1 \+ US9959315B1): Every H2 MUST be written as a specific, answerable question.   CORRECT: "How Long Does Drain Cleaning Take?"   WRONG:   "Our Drain Cleaning Process"   CORRECT: "What Causes a Blocked Drain in Older Homes?"   WRONG:   "Causes of Blocked Drains" The guidance text under each H2 must instruct the writer to answer the H2 question directly in the FIRST 1-2 sentences of that section.   CRITICAL — INFORMATION GAIN (Patent US20190155948A1): Every brief must include an "igs\_opportunity" field identifying at least one novel element the page must include that competitors do NOT have. Options: original data point, expert quote with attribution, first-hand experience marker, unique tool, contrarian evidence-backed position. If no opportunity is detectable, flag explicitly: "⚠ IGS GAP: All top-ranking pages cover the same ground. Original data or first-hand experience required to differentiate."   CRITICAL — INTERNAL LINKS (Patent US8117209B1 — Reasonable Surfer): All recommended internal links must appear in body text, preferably in the first 400 words. Anchor text: 2-5 descriptive words. Never recommend footer or navigation links as SEO internal links.   USER: Target keyword: {keyword} Business: {business\_name} — {niche} Target customers: {customer\_description} Brand tone: {tone} | Include terms: {include\_terms} | Avoid: {exclude\_terms}   Competitor analysis: Competitor 1 ({url}): {word\_count} words, H2s: {h2\_list} Competitor 2 ({url}): {word\_count} words, H2s: {h2\_list} Competitor 3 ({url}): {word\_count} words, H2s: {h2\_list}   Target word count: {target\_wc} (competitor average × 1.1) NLP entities from top 10 results: {entities} Related questions from Google (PAA): {paa\_questions} Related keywords (LSI): {related\_keywords}   Return JSON: {   "sections": \[{     "type": "H1|H2|H3|intro|cta|faq|schema",     "heading": "heading text — H2s MUST be answerable questions",     "guidance": "what to write (2-3 sentences, first sentence answers H2)",     "entities": \["entity1","entity2"\],     "word\_count\_target": number,     "cro\_note": "conversion tip or null",     "is\_passage\_ready": true/false  // true if heading is a question   }\],   "lsi\_terms": \[{ "term": "...", "competitor\_count": N, "importance\_pct": N }\],   "entities": \[{ "term": "...", "competitor\_count": N, "importance\_pct": N, "must\_cover": true/false }\],   "paa\_questions": \[{ "question": "...", "answered\_in\_content": false }\],   "igs\_opportunity": "specific novel element OR '⚠ IGS GAP' message",   "schema\_type": "LocalBusiness|Article|FAQ|Service|Product",   "meta\_title\_suggestion": "under 60 chars, keyword first",   "meta\_description\_suggestion": "150-160 chars, keyword \+ CTA",   "term\_targets": {     "avg\_word\_count": N, "target\_word\_count": N, "avg\_h2\_count": N,     "avg\_h3\_count": N, "avg\_images": N, "faq\_prevalence": N, "toc\_prevalence": N   },   "dominant\_intent": "informational|commercial|transactional",   "competitors\_raw": \[{ "url": "...", "word\_count": N, "h1": "...",     "h2s": \[...\], "has\_faq": bool, "has\_schema": bool }\] } |
| :---- |

## **8.3 Article Generation — GPT-4o-mini**

Cost: 20 credits. Model: gpt-4o-mini | Max tokens: 3000

| SYSTEM: You are an expert content writer creating SEO-optimized articles. Write naturally and helpfully — never keyword stuff. Use specified brand voice. Write in markdown format.   CRITICAL — H2 HEADING FORMAT (Patent US9940367B1 \+ US9959315B1): \- Write every H2 as a clear, specific, answerable question \- Answer each H2's question directly in the FIRST 1-2 sentences of that section \- This creates passage context vectors that Google can score independently   CORRECT: "\#\# How Long Does Drain Cleaning Take?"   First sentence: "Most drain cleaning jobs take 1-2 hours..."   WRONG: "\#\# Our Drain Cleaning Process"   CRITICAL — INFORMATION GAIN (Patent US20190155948A1): If an igs\_opportunity is provided, incorporate it naturally. The article MUST contain at least one element NOT present in all top-ranking competitor pages. Options:   \- Original data point ("In our experience, X% of cases involve...")   \- Expert quote with attribution (20+ words, "According to \[name\]...")   \- First-hand experience ("We tested this and found...")   \- Unique comparison table   \- Contrarian evidence-backed position ("Despite common advice, actually...")   CRITICAL — INTERNAL LINKS (Patent US8117209B1): Include 3+ internal link placeholders: \[INTERNAL LINK: anchor text | destination topic\] Place these in body text paragraphs, preferably in the first half of the article. Anchor text: 2-5 descriptive words. Never generic ("click here", "read more").   USER: Write a {target\_word\_count}-word article targeting: {keyword} Business: {business\_name} — {niche} Brand tone: {tone} | Include: {include\_terms} | Avoid: {exclude\_terms} Structure (improve on competitors): {competitor\_heading\_structure} Must cover entities: {must\_cover\_entities} Should cover (LSI): {should\_cover\_entities} Questions to answer (use as H3 subsections): {paa\_questions} Information gain opportunity: {igs\_opportunity}   Requirements: \- One H1 containing the keyword \- 5-8 H2 sections, ALL written as specific answerable questions \- Answer each H2 in the first 1-2 sentences of that section \- H3s under relevant H2s for PAA questions \- Keyword in first 100 words \- FAQ section at end (3-5 questions from PAA, H3 format) \- Strong opening paragraph \- Concluding paragraph with clear next step \- Written for: {customer\_description} \- Keyword frequency: natural (under 3% of word count) |
| :---- |

## **8.4 AI Dashboard Insight — Claude Haiku 4.5**

Called on: dashboard, strategy, cluster detail, workspace load. Model: claude-haiku-4-5 | Max tokens: 300 | Cost: 2 credits

| SYSTEM: You are a friendly expert SEO strategist giving one specific, actionable insight. 2-3 sentences maximum. No jargon. Name actual pages, keywords, and actions. Sound like a smart colleague, not a dashboard.   USER (context varies by screen): Project: {name} | Site strength: {da}/100 | Platform: {platform} Keyword velocity phase: {phase\_1\_2\_3\_4} Active clusters: {cluster\_summary} Recent activity: {recent\_actions} Top opportunities from strategy: {top\_3\_topics} \[If GSC connected\]:   Rankings data: {gsc\_summary}   Pages with CTR \< 2% AND impressions \> 100 AND declining trend: {navboost\_risk\_pages}   Pages not indexed after 4 weeks: {unindexed\_count}   Pages ranking 4-15: {near\_ranking\_pages}   Pages with SEO score \< 70: {low\_score\_pages}   Clusters missing funnel stages: {funnel\_gaps}   Articles missing link to focus page: {missing\_focus\_links}   Evaluate in order (Priority 0 \= highest urgency):   Priority 0: CTR decay (navboost\_risk\_pages) → Navboost warning with page name   Priority 1: Unindexed pages → indexation fix   Priority 2: Near-ranking pages (4-15) → specific optimization action   Priority 3: Content type mismatch → funnel stage correction   Priority 4: Low SEO scores → top 3 content fixes   Priority 5: Funnel gaps → specific article to create   Priority 6: Missing internal links → specific link to add   Priority 7: Default → next strategy action   Return ONE specific recommendation. Name the actual page and actual fix. Plain English only. 2-3 sentences max. No bullet points. |
| :---- |

## **8.5 SEO Score Formula — SUPERSEDED**

| ⚠️  CRITICAL: The old Section 8.5 scoring formula (max 100 points) is SUPERSEDED and MUST NOT be used. The correct formula is defined in Section 17.1 (UPSA Model, max 115 points). This section is retained only to flag the conflict. Build from Section 17.1. |
| :---- |

## **8.6 CRO Optimization — GPT-4o-mini**

Cost: 3 credits. Model: gpt-4o-mini | Max tokens: 500

| SYSTEM: You are a conversion rate optimization expert. Review the page and suggest specific, actionable improvements for failing CRO items. Plain English. Business owner audience.   USER: Page type: {focus\_page|article} Target keyword: {keyword} Business: {business\_name} — {niche} Failing CRO items: {failing\_items} Current H1: {h1} Current CTAs: {cta\_list}   For each failing item: suggest specific copy or structural change. Maximum 3 suggestions. Each: 1-2 sentences. Specific, actionable. |
| :---- |

## **8.7 Meta Title \+ Description Generator — GPT-4o-mini**

Cost: 3 credits per set of 3 options.

| SYSTEM: Generate SEO meta titles and descriptions optimized for CTR. Keyword in title within first 30 characters. Description: 150-160 chars. Important: titles that get clicks but trigger quick bounces HURT rankings via Navboost (US8595225B1). Make accurate promises, not just clickbait.   USER: Keyword: {keyword} Page title: {page\_title} Business: {business\_name} | Tone: {tone} Target audience: {customer\_description}   Return JSON: {   "titles": \["option 1 (≤60 chars)", "option 2 (≤60 chars)", "option 3 (≤60 chars)"\],   "descriptions": \["option 1 (150-160 chars)", "option 2", "option 3"\] } |
| :---- |

# **SECTION 9: ALL API INTEGRATIONS**

## **9.1 Serper.dev — SERP Analysis**

Used for: keyword research, competitor analysis, PAA, related searches. Cost: 5 credits per call. Never make more than 1 call per user action.

| POST https://google.serper.dev/search Headers: { "X-API-KEY": SERPER\_API\_KEY, "Content-Type": "application/json" } Body: { "q": keyword, "gl": "us", "hl": "en", "num": 10 }   Extract: \- organic\[0-4\].title/link/snippet  — competitor analysis \- peopleAlsoAsk\[\].question         — PAA questions \- relatedSearches\[\].query          — LSI / related keywords   // For KGR scoring (allintitle): Body: { "q": "allintitle:" \+ keyword, "gl": "us", "hl": "en", "num": 1 } Extract: searchInformation.totalResults → divide by monthly\_searches → kgr\_score |
| :---- |

## **9.2 Moz API — Domain Authority (REQUIRED for Beta)**

| ⚠️  CRITICAL: This integration is required for Beta, not V3. Without real DA data, every authority fit classification is wrong. Serper.dev does NOT return DA. Site age means nothing. Must be called at onboarding. |
| :---- |

| // Option A: Moz API (recommended — terminology matches "DA" used in UI) // \~$10/month for limited calls. Call once at onboarding, once monthly.   POST https://lsapi.seomoz.com/v2/url\_metrics Authorization: Basic base64(MOZ\_ACCESS\_ID:MOZ\_SECRET\_KEY) Body: {   "targets": \["example.com/"\],   "cols": \["domain\_authority", "referring\_domains"\] } Response: { results: \[{ "domain\_authority": 32, "referring\_domains": 145 }\] }   // Option B: DataForSEO Backlinks API (cheaper at scale) POST https://api.dataforseo.com/v3/backlinks/domain\_metrics/live Authorization: Basic base64(LOGIN:PASSWORD) Body: { "targets": \["example.com"\], "include\_subdomains": true }   // After fetching: INSERT INTO domain\_authority\_history (project\_id, domain\_authority,   referring\_domains, source, recorded\_at) UPDATE projects SET domain\_authority \= \[result\] WHERE id \= \[project\_id\]   // Call schedule: // \- On onboarding completion (required, synchronous) // \- Monthly background refresh (Supabase cron Edge Function) // \- On user-triggered re-audit (costs 10 credits) |
| :---- |

## **9.3 Google Search Console — V1 (Growth+ tier)**

| OAuth 2.0. Scope: https://www.googleapis.com/auth/webmasters.readonly Store encrypted refresh token in Supabase. Pull via Search Analytics API. Cache in performance\_data table. Refresh daily via background Edge Function.   // Navboost signals aggregation (runs weekly after GSC sync): // Group performance\_data by keyword \+ page\_url \+ week // Upsert to navboost\_signals table // Used for: CTR decay detection, Navboost Momentum Score feature |
| :---- |

## **9.4 Stripe Webhooks**

| Event | Action |
| :---- | :---- |
| checkout.session.completed | Activate subscription, set plan, set credits |
| customer.subscription.updated | Update plan and credits\_monthly |
| customer.subscription.deleted | Downgrade to free, keep all data for 60 days |
| invoice.payment\_failed | Alert user, maintain access for 3 days grace period |
| payment\_intent.succeeded | For overage purchases: add credits immediately |

# **SECTION 10: CREDIT & BILLING SYSTEM**

## **10.1 Credit Cost Reference**

| Action | Credits | API Behind It |
| :---- | :---- | :---- |
| SERP analysis (per keyword) | 5 | 1 Serper.dev call |
| Topic cluster plan (15-25 topics) | 15 | 3-5 Serper \+ 1 Claude Haiku |
| Focus page brief | 40 | 3 Serper \+ 1 GPT-4o-mini |
| Article generation (\~1,000 words) | 20 | 1 GPT-4o-mini |
| Section rewrite (per section) | 5 | 1 GPT-4o-mini |
| Meta title \+ description | 3 | 1 GPT-4o-mini |
| CRO optimization / CTR optimization | 3 | 1 GPT-4o-mini |
| Optimize existing page (AI recommendations) | 25 | 2 Serper \+ 1 GPT-4o-mini (see Section 10.4) |
| Technical site audit | 10 | Crawl \+ GPT-4o-mini analysis |
| AI performance interpretation | 2 | 1 Claude Haiku |
| Strategy regeneration | 15 | 3-5 Serper \+ 1 Claude Haiku |
| Re-audit project (full crawl \+ DA refresh) | 10 | Full crawl \+ Moz/DataForSEO \+ analysis |
| Keyword lookup modal | 5 | 1 Serper \+ 1 Haiku |
| Keyword volume refresh (per topic) | 2 | 1 Serper call |

## **10.2 Credit Check Enforcement**

14. Client shows CreditBadge with cost before user clicks

15. On click: Edge Function verifies credits\_remaining server-side

16. If sufficient: deduct credits, proceed with API call

17. If insufficient: return 402 error, trigger InsufficientCreditsModal

18. On completion: log to credit\_transactions

19. NEVER deduct credits before API call succeeds. If API fails, refund credits.

## **10.3 Insufficient Credits Modal**

* "You need X credits for this" — specific number

* "You have Y credits remaining this month"

* "Buy extra credits" → Stripe one-time, $0.05/credit, minimum 50 ($2.50)

* "Upgrade your plan" → /settings/billing

* "Cancel" to dismiss

## **10.4 "Optimize Existing Page" — Fully Specced (25 credits)**

This credit action was undefined in V2. Full spec:

Trigger: "Optimize Now" button in Re-Optimization Queue (position 4-15 pages), or "Optimize" from workspace when page already has content.

Action: GPT-4o-mini analyzes existing content \+ current SERP competitors → returns: top 3 content improvements ordered by ranking impact, suggested title rewrite for CTR improvement (Navboost-aware), missing entities to add, missing IGS opportunity.

Output: LoadingStepsModal while processing → optimization plan displayed in workspace SEO tab as collapsible "Optimization Plan" card. User can click "Apply Section Improvement" per recommendation → 5 credits each.

## **10.5 Plan Credit Allocations**

| Plan | Monthly Credits | Approx Clusters/Month | Overage Rate |
| :---- | :---- | :---- | :---- |
| Builder ($39) | 250 | \~1 full cluster \+ edits | $0.05/credit |
| Growth ($79) | 600 | \~2-3 full clusters | $0.05/credit |
| Scale ($119) | 1,100 | \~4-5 full clusters | $0.05/credit |
| Pro ($169) | 2,500 | \~10+ full clusters | $0.05/credit |

# **SECTION 11: TIER GATING RULES**

## **11.1 Feature Access Matrix**

| Feature | Builder $39 | Growth $79 | Scale $119 / Pro $169 |
| :---- | :---- | :---- | :---- |
| AI topic discovery \+ strategy | ✓ | ✓ | ✓ |
| Competitor analysis (3 URLs) | ✓ | ✓ | ✓ |
| Visual topic cluster map | ✓ | ✓ | ✓ |
| Focus page brief \+ article writer | ✓ | ✓ | ✓ |
| Live UPSA score (0–115, all modules) | ✓ | ✓ | ✓ |
| Passage Readiness score in workspace | ✓ | ✓ | ✓ |
| Skyscraper / IGS warning in workspace | ✓ | ✓ | ✓ |
| Three-section entity panel (LSI/Entity/PAA) | ✓ | ✓ | ✓ |
| Schema \+ meta generator | ✓ | ✓ | ✓ |
| Shopify \+ WordPress publishing | ✓ | ✓ | ✓ |
| Credits / month | 250 | 600 | 1,100 / 2,500 |
| Google Search Console | — | ✓ | ✓ |
| Rankings dashboard \+ CTR optimization | — | ✓ | ✓ |
| Navboost Momentum Score | — | ✓ | ✓ |
| Internal link suggestions \+ equity table | — | ✓ | ✓ |
| Re-Optimization Queue | — | ✓ | ✓ |
| Full site technical audit | — | — | ✓ |
| H2 Passage Quality Checker (site-wide) | — | — | ✓ |
| Information Gain Checker (site-wide) | — | — | ✓ |
| Anchor Text Profile Health | — | — | ✓ |
| Brand Search Signal Tracker | — | — | ✓ |
| Core Web Vitals monitoring | — | — | ✓ |
| White-label PDF reports | — | — | Pro only |
| Multi-site agency dashboard | — | — | Pro only |
| Credit rollover (up to 500\) | — | — | Pro only |
| API access | — | — | Pro only |

| CRITICAL TIER GATING CLARIFICATION: The UPSA live score, Passage Readiness module, Skyscraper Warning, and IGS warning in the WORKSPACE (during content creation) are ALL-TIER features — they help users create good content. The H2 Passage Quality Checker and Information Gain Checker as SITE-WIDE AUDITS (scanning all published pages at once) are Scale+ features. These are two distinct things. Do not conflate them. |
| :---- |

# **SECTION 12: COMPONENT LIBRARY**

## **12.1 Design Tokens**

| colors: {   shark:   "\#0A1628",  // Primary dark — headers, sidebar, dark CTAs   teal:    "\#00C2A8",  // Brand accent — scores, highlights, CTAs   coral:   "\#FF6B6B",  // Error, critical, locked states   gold:    "\#FFB347",  // Warning, build-toward, in-progress   navy50:  "\#F0F4FF",  // Light background tint   teal10:  "\#E6FAF8",  // Patent callout backgrounds   gray700: "\#343A40",  // Body text   gray500: "\#6C757D",  // Muted text   gray300: "\#DEE2E6",  // Borders, dividers } spacing: 4px base unit (4, 8, 12, 16, 24, 32, 48, 64\) radius: 4px inputs, 8px default, 12px cards, 999px pills/badges |
| :---- |

## **12.2 Required Global Components (Build These First)**

### **SEOScoreBadge (Updated)**

Props: score (0–115). Display: large number badge. Color: \<50 \= red, 50–74 \= amber, 75–89 \= green, 90–115 \= teal pulse. Label: "\[N\]/115". Tooltip: "Your content quality score. Max 115 includes information gain bonus."

### **NavboostWarning**

Shown when CTR \< 2% with declining 4-week trend. Amber badge: "Click rate declining — Google is tracking this. Rewrite title now." Links to CTR optimization action (3 credits).

### **PassageReadyIndicator**

Small inline indicator on each H2 row in workspace brief. Green check (✓) if isPassageReadyH2() returns true. Gray X if not. Tooltip: "Question-format headings help Google find the answer to show in search results."

### **ReverseSiloAlert**

Shown on cluster detail when any article lacks a link to the focus page. Amber persistent banner: "\[N\] articles don't link to your main page — authority isn't flowing correctly." Link to Internal Links tab.

### **AuthorityFitBadge**

Props: fit (achievable|buildToward|locked). Display: "Ready Now" (green), "Build Toward" (amber), "Not Yet" (gray). NEVER show raw strings to user.

### **FunnelTag**

Props: stage (tofu|mofu|bofu). Display: "Awareness" (blue), "Consideration" (purple), "Conversion" (green). NEVER show "tofu/mofu/bofu" to user.

### **LoadingStepsModal**

Full-screen overlay. Step list with real action descriptions. Active step: pulsing teal dot. Complete: green checkmark. NEVER use plain spinner for AI generation — always use this component.

### **SEOGrowthStagePanel**

Dashboard component. Shows: Stage \[N\] of 4, stage name, what currently qualifies user for this stage, what is needed to unlock Stage N+1. Updates when domain\_authority\_history detects threshold crossing.

# **SECTION 13: SEO INTELLIGENCE ENGINE**

The SEO scoring, entity extraction, authority fit classification, and competitor analysis are not just features — they are the core intelligence that makes Sharkly different from a content generator. The science behind every formula comes from the SEO dissertation, The Complete SEO System, and 9 confirmed Google patents. Section 17 contains the definitive technical reference — read Section 17 before building any feature in this section.

## **13.1 Authority Fit Classification**

| function classifyAuthorityFit(keywordDifficulty, domainAuthority) {   // New domain override (DA ≤ 5 \= brand new site with no trust history)   if (domainAuthority \<= 5\) {     if (keywordDifficulty \<= 15\) return "achievable"     if (keywordDifficulty \<= 30\) return "buildToward"     return "locked"   }   // Standard classification   const gap \= keywordDifficulty \- domainAuthority   if (gap \<= 10\) return "achievable"   // Ready Now   if (gap \<= 25\) return "buildToward"  // Build Toward — 3-6 months   return "locked"                      // Not Yet — multiplier withheld }   // Science: US8682892B1 \+ US10055467B1 threshold gate mechanism. // Below-threshold pages receive NO GroupModificationFactor multiplier. // "Locked" is not just harder — the algorithm literally withholds the multiplier. |
| :---- |

## **13.2 Priority Score Formula**

| function calcPriority(topic) {   const w \= { bofu: 3, mofu: 2, tofu: 1 }   const intentWeight \= w\[topic.funnel\_stage\] || 1   const cpcValue \= Math.max(topic.cpc || 0.5, 0.5)   const volScore \= Math.log10(topic.monthly\_searches \+ 1\)   const diffPenalty \= topic.keyword\_difficulty / 100 \+ 0.1   return (intentWeight \* cpcValue \* volScore) / diffPenalty }   // BoFu weighted 3× — conversion keywords drive revenue. // CPC as commercial value proxy. // Log scale prevents high-volume domination. // Difficulty in denominator — harder \= lower priority. |
| :---- |

## **13.3 SEO Score — SUPERSEDED**

| ⚠️  CRITICAL: The old calculateSEOScore() function (max 100 points) is superseded. Build from Section 17.1 (UPSA 4-module model, max 115). |
| :---- |

## **13.4 HTML Signal Weight Hierarchy**

This is why certain signals score more points than others. Derived from the inverted index structure.

| HTML Position | Relative Weight | Why |
| :---- | :---- | :---- |
| Title tag (meta\_title) | 1.00 — Highest | First signal in inverted index. Highest confidence relevance. |
| H1 tag | 0.95 — Near highest | Primary visible heading. Single on page \= strong signal. |
| URL slug | 0.85 — Very high | Hierarchical structure signal to crawler. |
| First 100 words | 0.80 — High | Topic establishment. Google expects keyword early. |
| H2 headers | 0.70 — High | Section structure. Passage context vector (US9940367B1). |
| H3 headers | 0.55 — Medium | Sub-section context. |
| Body text | 0.45 — Medium | Content depth. Frequency matters less than position. |
| Alt text | 0.30 — Lower | Image context. Counted but lower weight. |
| Meta description | 0.15 — CTR only | Not a ranking signal — affects click-through rate only. |

## **13.5 Decision Tree — See Section 17.5**

The complete decision tree with all 8 priority levels is defined in Section 17.5. Summary: Navboost CTR decay is Priority 0 (highest urgency). Section 8.4 shows the Haiku prompt implementing this tree.

## **13.6 Keyword Velocity Tiers**

| Phase | Timeframe | Target Keyword Range | Mechanism (Patent) |
| :---- | :---- | :---- | :---- |
| 1 | Month 1-3 | \< 500 monthly searches | US7346839B2 inception date — zero trust history. Target only long-tail. |
| 2 | Month 3-6 | 500-2,000 searches | US8682892B1 reference query baseline forming. Brand searches accumulating. |
| 3 | Month 6-12 | 2,000-10,000 searches | US10055467B1 behavioral multiplier begins applying. 5-10 new referring domains/month. |
| 4 | Month 12+ | 10,000+ head terms | US8682892B1 full group modification factor. DR 30+, 50+ referring domains. |
| UI requirement: Show "SEO Growth Stage" indicator on dashboard. "You're in Stage \[N\] of 4\. Here's what unlocks Stage \[N+1\]." See Section 12.2 SEOGrowthStagePanel component and Section 17.8 for stage detection logic. |  |  |  |

## **13.7 Cluster Size — The Real Rule**

| 📌  PATENT: US8682892B1: Google groups related pages and evaluates the group's collective quality. The patent specifies no minimum page count. What it rewards is topical completeness — whether the cluster satisfies the full range of user intent around a topic. A 4-page cluster that completely covers a narrow topic is stronger than a 20-page cluster with thin, redundant content. |
| :---- |

There is no target number of supporting articles. The correct cluster size is: the number of distinct user intents and questions in this topic space that deserve their own dedicated page.

| Cluster Size | When It's Right |
| :---- | :---- |
| 3–5 articles | Narrow, local, or product-specific topics. Example: "emergency drain cleaning in \[city\]" — there are only 4–5 genuine sub-intents (cost, process, DIY vs pro, when to call). Adding more pages manufactures topics that don't exist. |
| 6–10 articles | Mid-breadth topics with genuine sub-intent variety. Example: "home drain maintenance" — seasonal advice, different pipe types, prevention methods, product reviews. Each article answers a distinct question. |
| 11–20 articles | Broad competitive niches where a competitor has established comprehensive topical authority. Example: "plumbing" as a broad category. Even here, every article must answer a real question — not just fill a number. |
| 20+ articles | Only for very broad subject-matter authority plays in highly competitive niches. Each page still needs a distinct user intent. If you're inventing intents to hit a number, stop. |

| Sharkly cluster generation: The AI suggests supporting article topics based on PAA questions, competitor H2 analysis, and related searches — not a fixed count. The suggestion stops when genuine user intents are exhausted. Users can always add more articles manually if they identify an intent the AI missed. |
| :---- |

# **SECTION 14: GLOBAL UX RULES**

## **14.1 Loading States**

* AI generation (topic strategy, brief, article): LoadingStepsModal component ALWAYS. Never plain spinner.

* Data fetching (non-AI): Skeleton loaders. Never blank screens.

* Instant UI actions (saving, toggling): Optimistic updates. Update UI immediately, sync to DB in background.

* AI insight blocks: Show previous/cached insight while new one loads. Never blank.

## **14.2 Error Messages — Technical → Plain English**

| Technical Error | Show This Instead |
| :---- | :---- |
| Request failed with status 429 | We're a bit busy — try again in a moment |
| Network error / Failed to fetch | Check your internet connection and try again |
| row violates row-level security policy | Something went wrong saving. Try again. |
| OpenAI error: context\_length\_exceeded | That content was too long to process. Try a shorter article. |
| Stripe error: card\_declined | Your payment didn't go through. Check your card details. |
| supabase: JWT expired | Your session expired. Please sign in again. |
| Serper API rate limit | We couldn't get search data right now. Try again in a minute. |
| Moz/DataForSEO API error | We couldn't measure your site strength right now. Using estimate. |

## **14.3 Responsive Design**

Primary: desktop (SEO is desktop work). Functional: tablet. Mobile: show "Best experienced on desktop" banner in workspace. Navigation collapses to hamburger below md (768px). Breakpoints: sm=640, md=768, lg=1024, xl=1280.

## **14.4 Performance Requirements**

* Initial page load: \< 3s on average connection

* AI generation feedback: stream responses where possible — show first tokens immediately

* SEO score recalculation: debounced 500ms — never blocks typing

* Moz/DataForSEO DA call: called once at onboarding \+ monthly — NEVER on every page load

* Supabase queries: always use select() with explicit column lists — never select \*

# **SECTIONS 15–16: USER JOURNEY & FEATURE CATALOG**

| These sections are carried forward intact from the Sharkly Complete Product Spec V3, which correctly specified the full user journey (Day 1 through Month 3+) and the complete feature catalog for Categories 1–13 including all patent amendment notes. The V4 spec supersedes V3 on all SEO science, scoring formulas, DB schema, API integrations, and AI prompts. For the user journey and feature catalog content, refer to V3 Sections 15–16, which are correct and unchanged. |
| :---- |

# **SECTION 17: SEO SCIENCE REFERENCE — WHAT CURSOR NEEDS TO KNOW**

| ⚠️  CRITICAL: This is the most important section for building Sharkly correctly. Every formula, heuristic, and algorithm that touches SEO science is defined here. When building any scoring function, classification system, or AI prompt related to SEO, read this section first. This overrides any conflicting spec elsewhere. |
| :---- |

## **17.1 The UPSA Model — Universal Page Scoring Algorithm (Max 115 Points)**

| 📌  PATENT: US9940367B1 \+ US9959315B1 (Passage Scoring) ground Module 1 H2 scoring. US20190155948A1 (Information Gain) grounds the IGS bonus. US8682892B1 (Panda) grounds the overall scoring threshold logic. US8117209B1 (Reasonable Surfer) grounds Module 4 link scoring. |
| :---- |

The workspace live SEO score IS the UPSA score. Max is 115, NOT 100\. All places displaying or storing the score must use 0–115.

### **UPSA Module Point Breakdown**

| Module | Max Points | Components | Patent |
| :---- | :---- | :---- | :---- |
| 1 — Structural Signals | 40 | Title keyword (15) \+ H1 keyword (15) \+ First 100 words (10) | Inverted index weights |
| 2 — Semantic Completeness | 20 | Entity coverage (12) \+ LSI term coverage (8) | SCS formula |
| 3 — Content Quality | 25 | H2 passage readiness (8) \+ Word count vs target (8) \+ PAA coverage (5) \+ Rich elements (4) | US20190155948A1, US9940367B1 |
| 4 — UX Signals | 15 | Internal links (8) \+ Meta description (4) \+ Schema (3) | US8117209B1 |
| IGS Bonus | 0–15 | Original research (+5) \+ Expert quotes (+4) \+ First-hand experience (+3) \+ Unique viz (+2) \+ Contrarian (+1) | US20190155948A1 |
| TOTAL MAX | 115 | All signals combined | All 9 patents |

| function calculateUPSAScore(tiptapContent, page) {   const kw    \= page.keyword.toLowerCase()   const body  \= extractPlainText(tiptapContent)   const h1s   \= extractH1s(tiptapContent)   const h2s   \= extractH2s(tiptapContent)   const links \= extractInternalLinks(tiptapContent)   let score   \= 0     // MODULE 1 — Structural Signals (40 pts)   if (page.meta\_title?.toLowerCase().includes(kw)) score \+= 15   if (h1s.some(h \=\> h.toLowerCase().includes(kw)))  score \+= 15   if (body.slice(0, 500).toLowerCase().includes(kw)) score \+= 10     // MODULE 2 — Semantic Completeness (20 pts)   const entities   \= page.brief\_data?.entities   || \[\]   const lsiTerms   \= page.brief\_data?.lsi\_terms  || \[\]   const covered    \= entities.filter(e \=\> body.toLowerCase().includes(e.term.toLowerCase())).length   const lsiCovered \= lsiTerms.filter(t \=\> body.toLowerCase().includes(t.term.toLowerCase())).length   score \+= Math.round((covered    / Math.max(entities.length,  1)) \* 12\)   score \+= Math.round((lsiCovered / Math.max(lsiTerms.length, 1)) \*  8\)     // MODULE 3 — Content Quality / IGS (25 pts)   // H2 passage readiness: 2 pts per question-format H2, max 8 pts   const passageReadyH2s \= h2s.filter(h \=\> isPassageReadyH2(h)).length   score \+= Math.min(passageReadyH2s \* 2, 8\)     // Word count vs target   const words \= countWords(body)   const ratio \= words / (page.target\_word\_count || 1000\)   if      (ratio \>= 1.0)  score \+= 8   else if (ratio \>= 0.85) score \+= 5   else if (ratio \>= 0.70) score \+= 2     // PAA questions answered: 2 pts each, max 5 pts   const paaQuestions \= page.brief\_data?.paa\_questions || \[\]   const answeredPAA  \= paaQuestions.filter(q \=\> {     const qWords \= q.question.toLowerCase().split(" ").slice(0,4).join(" ")     return body.toLowerCase().includes(qWords)   }).length   score \+= Math.min(answeredPAA \* 2, 5\)     // Rich content elements: 1 pt each, max 4 pts   const hasFAQ      \= /faq|frequently asked/i.test(body)                    ? 1 : 0   const hasTable    \= body.includes("\<table") || /\\|.\*\\|.\*\\|/.test(body)   ? 1 : 0   const listsCount  \= (body.match(/\<\[uo\]l/gi) || \[\]).length   const hasLists    \= listsCount \>= 2                                        ? 1 : 0   const hasExtLink  \= links.filter(l \=\> \!l.includes(page.project?.url)).length \> 0 ? 1 : 0   score \+= hasFAQ \+ hasTable \+ hasLists \+ hasExtLink     // MODULE 4 — UX Signals (15 pts)   if      (links.length \>= 3\) score \+= 8   else if (links.length \>= 1\) score \+= 4   if (page.meta\_description)                score \+= 4   if (page.brief\_data?.schema\_generated)    score \+= 3     // IGS BONUS — Information Gain Score (+0 to \+15)   const igs \= calculateIGS(body)   score \+= igs     return Math.min(115, Math.round(score)) }   // Run this after every save where word count changes by \>10% or H2 structure changes: // UPDATE pages SET last\_updated\_meaningful \= NOW() WHERE id \= \[page\_id\] |
| :---- |

### **isPassageReadyH2 — H2 Question Detection Heuristic**

| 📌  PATENT: US9940367B1 \+ US9959315B1: Google evaluates the heading vector (Title → H1 → H2 → passage) as a coherent path. H2s written as specific answerable questions create stronger passage context vectors than vague topical labels — even with identical content underneath. |
| :---- |

| function isPassageReadyH2(heading) {   const text \= heading.toLowerCase().trim()   const questionWords \= \[     "how", "what", "why", "when", "which", "can",     "does", "is", "are", "do", "will", "should"   \]   return text.endsWith("?") || questionWords.some(w \=\> text.startsWith(w \+ " ")) }   // Examples that PASS: // "How Long Does Drain Cleaning Take?"      → ends with ? // "What Causes a Blocked Drain?"           → ends with ? // "How to Choose a Plumber"                → starts with "how " // "Is DIY Drain Cleaning Safe?"            → ends with ?   // Examples that FAIL: // "Our Drain Cleaning Process"             → no question marker // "About Blocked Drains"                   → no question marker // "Causes of Blocked Drains"               → no question marker   // Use in technical audit: // Page score \= passage-ready H2s / total H2s // Flag if score \< 0.50 → issue\_type: "weak\_h2\_passage" |
| :---- |

### **calculateIGS — Information Gain Score Heuristics**

| 📌  PATENT: US20190155948A1 (Information Gain Score): Pages that add something the user hasn't already seen score positively on IGS. Skyscraper content — better versions of the same information — scores near zero. These are client-side heuristics (imperfect proxies). They catch most genuine IGS content. IGS score is indicative, not definitive: 0 is a warning, not a verdict. |
| :---- |

| function calculateIGS(body) {   let igs \= 0   const lowerBody \= body.toLowerCase()     // \+5: Original research/data signals   const dataSignals \= \[     "%", "survey", "we found", "our data", "our study",     "in our experience", "we tested", "our analysis", "our research",     "according to our", "X out of Y"   \]   if (dataSignals.some(s \=\> lowerBody.includes(s))) igs \+= 5     // \+4: Expert quotes with attribution   const quotePattern \= /"\[^"\]{20,}"/.test(body) &&     /according to|said|explained|told us|noted|shared/.test(lowerBody)   if (quotePattern) igs \+= 4     // \+3: First-hand experience signals   const firstPersonExp \=     /\\b(I|we)\\b.{0,50}(tested|tried|used|found|noticed|experienced|discovered)/i.test(body)   if (firstPersonExp) igs \+= 3     // \+2: Unique visualization (table or significant list structure)   const hasTable \= body.includes("\<table") || /\\|.\*\\|.\*\\|/.test(body)   if (hasTable) igs \+= 2     // \+1: Contrarian perspective with signal words   const contrarianSignals \= \[     "however,", "contrary to", "despite popular", "actually,",     "in reality,", "the truth is", "this is wrong", "myth:"   \]   if (contrarianSignals.some(s \=\> lowerBody.includes(s))) igs \+= 1     return Math.min(15, igs) }   // SKYSCRAPER WARNING: fires when igs \=== 0 AND word count \> 300 // Display: "⚠ Skyscraper Alert: Your content covers the same ground as every // competitor. Add original data, an expert quote, or first-hand experience // to differentiate and earn the information gain bonus." |
| :---- |

## **17.2 Navboost CTR Decay Detection Algorithm**

| 📌  PATENT: US8595225B1 — Navboost patent (confirmed by DOJ antitrust testimony 2023). Google stores topic-specific CTR data in a 13-month rolling window. CTR below expected baseline for a query-page pair is a negative ranking signal. A page at position 8 with declining CTR is being actively demoted — regardless of its SEO score. This is not theoretical — it is confirmed court evidence. |
| :---- |

| // Run weekly via Supabase cron or triggered when GSC data syncs   function detectNavboostDecay(projectId) {   const signals  \= await getNavboostSignals(projectId, 13\) // 13 weeks   const warnings \= \[\]     for (const keywordGroup of groupByKeyword(signals)) {     const recent4   \= keywordGroup.slice(-4)     const avgPos    \= mean(keywordGroup.map(w \=\> w.avg\_position))       if (       mean(recent4.map(w \=\> w.impressions))  \> 100 &&       avgPos                                  \< 15  &&       mean(recent4.map(w \=\> w.ctr))           \< 0.02 &&       isTrendDeclining(recent4.map(w \=\> w.ctr))     ) {       warnings.push({         keyword:  keywordGroup\[0\].keyword,         page\_url: keywordGroup\[0\].page\_url,         severity: "critical",         message: \`Your page for "${keywordGroup\[0\].keyword}" is getting seen           but not clicked. Google is tracking this. Rewrite the title and           description now — every week this stays low weakens your ranking           for the next 13 months.\`       })     }   }   return warnings }   function isTrendDeclining(ctrs) {   if (ctrs.length \< 3\) return false   // Linear regression slope — negative slope \= declining   const n    \= ctrs.length   const sumX \= n \* (n \- 1\) / 2   const sumY \= ctrs.reduce((a, b) \=\> a \+ b, 0\)   const sumXY= ctrs.reduce((sum, y, x) \=\> sum \+ x \* y, 0\)   const sumX2= ctrs.reduce((sum, \_, x) \=\> sum \+ x \* x, 0\)   const slope= (n \* sumXY \- sumX \* sumY) / (n \* sumX2 \- sumX \* sumX)   return slope \< \-0.001 // declining if negative by meaningful margin } |
| :---- |

## **17.3 Domain Authority Estimation — Real Data Required**

| ⚠️  CRITICAL: Beta dependency. Serper.dev does NOT return DA. GSC does NOT return DA. The authority fit classification powers the entire strategy engine — without real DA, every "Achievable"/"Build Toward"/"Locked" classification is potentially wrong. Must be called at onboarding. |
| :---- |

| async function fetchDomainAuthority(domain) {   try {     // Option A: Moz API     const response \= await fetch("https://lsapi.seomoz.com/v2/url\_metrics", {       method: "POST",       headers: {         "Authorization": "Basic " \+ btoa(MOZ\_ACCESS\_ID \+ ":" \+ MOZ\_SECRET\_KEY),         "Content-Type": "application/json"       },       body: JSON.stringify({         targets: \[domain \+ "/"\],         cols: \["domain\_authority", "referring\_domains"\]       })     })     const data \= await response.json()     return {       domain\_authority:  data.results\[0\].domain\_authority,       referring\_domains: data.results\[0\].referring\_domains,       source: "moz"     }   } catch (error) {     // Fallback: rough estimate. Only use if API unavailable. Flag in UI.     return { domain\_authority: 5, referring\_domains: 0,              source: "estimate", is\_fallback: true }   } }   // NEW DOMAIN PROTOCOL (da \<= 5): // Achievable: KD \<= 15  (not DA+10) // Build Toward: KD 16-30 // Locked: KD \> 30 // Show message: "Your site is brand new — we've found \[N\] keywords you can // realistically target in your first 3 months. These are the terms your // competitors aren't defending hard and Google is still deciding who to rank." |
| :---- |

## **17.4 High-Value Keyword Identification — The Complete Framework**

KGR is one signal, not the definition of a good keyword. The goal is always: highest business value \+ lowest resistance. These are three separate dimensions that must be evaluated together.

### **The Three Dimensions of Keyword Value**

| Dimension | What It Measures | Best Signal |
| :---- | :---- | :---- |
| Business Value | Will ranking for this actually make money? | CPC — advertisers only bid on terms that convert. High CPC \= proven commercial intent. $5+ CPC \= high value. $0.50 CPC \= low value regardless of volume. |
| Ranking Resistance | How hard is it to break into the top 10? | Keyword Difficulty (KD) — but must be read relative to your own DA, not as an absolute. KD 35 is easy for DA 40, hard for DA 10\. Authority fit classification handles this. |
| Supply vs Demand | Is the competition optimised for this exact term? | KGR (allintitle / monthly\_searches) — low KGR means few pages have intentionally targeted this phrase. Useful signal but secondary to value. |

| The most dangerous mistake in keyword selection is optimising only for low difficulty. Low difficulty \+ low CPC \+ low volume \= easy to rank, zero business impact. A keyword worth targeting must score on business value first, then resistance second. |
| :---- |

### **Quick Wins Scoring — Full Algorithm**

| // Quick Wins \= highest-value keywords you can realistically rank for right now. // Scored on three signals. Any one strong signal qualifies — not all three required.   function scoreQuickWin(topic, domainAuthority) {   const fit \= classifyAuthorityFit(topic.keyword\_difficulty, domainAuthority)   if (fit \!== "achievable") return null  // Must be achievable — non-negotiable   if (\!\["mofu", "bofu"\].includes(topic.funnel\_stage)) return null  // Must have commercial intent     let quickWinScore \= 0   const signals \= \[\]     // Signal 1: High CPC — proven commercial value   // CPC \> $5: very high value (+3)   // CPC $2-5: high value (+2)   // CPC $0.50-2: moderate (+1)   if      (topic.cpc \>= 5\)    { quickWinScore \+= 3; signals.push("High advertiser demand") }   else if (topic.cpc \>= 2\)    { quickWinScore \+= 2; signals.push("Moderate advertiser demand") }   else if (topic.cpc \>= 0.5)  { quickWinScore \+= 1; signals.push("Low advertiser demand") }     // Signal 2: KGR \< 0.25 — low supply of optimised competition   // (run allintitle: Serper query to get this)   if (topic.kgr\_score \!== null) {     if      (topic.kgr\_score \< 0.10)  { quickWinScore \+= 3; signals.push("Very low competition supply") }     else if (topic.kgr\_score \< 0.25)  { quickWinScore \+= 2; signals.push("Low competition supply") }     else if (topic.kgr\_score \< 0.50)  { quickWinScore \+= 1; signals.push("Moderate competition supply") }   }     // Signal 3: Priority score in top tier — best balance of intent, value, and volume   if (topic.priority\_score \> 10\)  { quickWinScore \+= 2; signals.push("High overall priority") }   else if (topic.priority\_score \> 5\)  { quickWinScore \+= 1; signals.push("Good overall priority") }     if (quickWinScore \=== 0\) return null  // No meaningful signal — not a Quick Win     return {     is\_quick\_win: true,     quick\_win\_score: quickWinScore,     signals: signals,  // Used in tooltip to explain WHY it is a Quick Win   } }   // KGR implementation (if running allintitle query): KGR \= allintitle\_results / monthly\_search\_volume // Query Serper.dev with "allintitle:\[keyword\]" → searchInformation.totalResults // Store as kgr\_score on topics table. May be null if allintitle query not run.   // Quick Win tooltip (plain English — use signals array): // "This keyword has \[High advertiser demand\] and \[Low competition supply\]. // It's within your site's current strength range. Strong starting point."   // IMPORTANT: KGR alone does not make a Quick Win. // A KGR \< 0.25 keyword with $0.10 CPC and tofu intent has almost no business value. // The framework ranks CPC first because that is the most honest proxy for revenue potential. |
| :---- |

### **Keyword Selection Hierarchy — What to Prioritise**

When choosing which keywords to target first, apply this hierarchy in order:

| Priority | What to Look For |
| :---- | :---- |
| 1st — Authority Fit | Is this keyword achievable for your current site strength? If not, skip it entirely regardless of how attractive it looks. Locked keywords waste time and budget. |
| 2nd — Commercial Intent | Is this mofu or bofu? Informational keywords build traffic. Commercial and transactional keywords build revenue. Always fill the funnel from conversion intent upward. |
| 3rd — Business Value (CPC) | High CPC means advertisers have tested and proven this keyword converts to money. A $10 CPC keyword is worth 20× more attention than a $0.50 CPC keyword at the same difficulty. |
| 4th — Volume vs Difficulty Balance | Higher volume at the same difficulty \= better return. But do not chase volume if it requires exceeding your authority tier. A 200-search/month keyword you can rank for beats a 2,000-search keyword you cannot. |
| 5th — KGR (Supply Check) | Low KGR confirms few pages have deliberately targeted this phrase. Useful as a tiebreaker between similar keywords. Not a standalone selection criterion. |

## **17.5 The Complete AI Decision Tree (8 Priority Levels)**

Claude Haiku evaluates conditions in order and returns the FIRST matching recommendation. This supersedes Section 13.5.

| Priority | Condition (GSC required for 0-3) | Recommendation Generated |
| :---- | :---- | :---- |
| 0 (URGENT) | Page impressions \> 100, position \< 15, CTR \< 2%, 4-week declining trend | Navboost CTR decay warning. Names specific page. "Rewrite the title and description now." |
| 1 | Page exists but not indexed after 4+ weeks | Google hasn't found this page yet. Check internal links and sitemap submission. |
| 2 | Page indexed, zero impressions after 6+ weeks | Not being shown in results — likely needs more internal links or backlinks. |
| 3 | Content type mismatch: funnel\_stage conflicts with SERP dominant\_intent | This content type may be wrong for this keyword. Google is ranking \[X type\] for this. |
| 4 | SEO score \< 70 | Content quality score is \[X\]. Improving to 70+ significantly helps ranking. \[Top 3 fixes.\] |
| 5 | Ranking positions 4-15 | \[Page\] is ranking \#\[X\] — close to page 1\. Fastest path: \[specific fix from score breakdown.\] |
| 6 | High impressions, CTR \< 2% (stable or improving) | People are seeing this page but not clicking. Improve the title and description. |
| 7 (Default) | None of the above match | Next up in your strategy: \[highest priority achievable topic\]. |

## **17.6 Internal Link Suggestion Algorithm**

| 📌  PATENT: US8117209B1 — Reasonable Surfer Model: Link equity \= PR(source) × ClickProbability(link). Click probability correlates strongly with placement. Body-early links receive 1.00× equity. Footer links receive 0.15×. Placement is a first-class SEO variable, not a UX preference. |
| :---- |

| // Run when: cluster content is generated/updated, or user opens Internal Links tab   function generateInternalLinkSuggestions(cluster, existingLinks) {   const suggestions \= \[\]   const focusPage   \= cluster.pages.find(p \=\> p.type \=== "focus")   const articles    \= cluster.pages.filter(p \=\> p.type \=== "article")     // CRITICAL — Reverse Silo Rule: every article MUST link to focus page   for (const article of articles) {     const hasLink \= existingLinks.some(       l \=\> l.from\_page\_id \=== article.id && l.to\_page\_id \=== focusPage.id     )     if (\!hasLink) {       suggestions.push({         from\_page\_id:      article.id,         to\_page\_id:        focusPage.id,         anchor\_text:       generateVariationAnchor(focusPage.keyword),         placement\_hint:    "intro",  // First 400 words         equity\_multiplier: 1.00,         priority:          "critical",         note:              "Add in the first 2 paragraphs — highest link equity"       })     }   }     // Focus page must link back to at least 3 articles   const focusOutLinks \= existingLinks.filter(l \=\> l.from\_page\_id \=== focusPage.id)   if (focusOutLinks.length \< 3\) {     for (const article of articles.slice(0, 3 \- focusOutLinks.length)) {       suggestions.push({         from\_page\_id:      focusPage.id,         to\_page\_id:        article.id,         anchor\_text:       article.keyword,         placement\_hint:    "body",         equity\_multiplier: 0.80,         priority:          "high"       })     }   }     // Article-to-article mesh within groups of 5   const groups \= chunkArray(articles, 5\)   for (const group of groups) {     for (let i \= 0; i \< group.length; i++) {       for (let j \= 0; j \< group.length; j++) {         if (i \!== j) {           const hasLink \= existingLinks.some(             l \=\> l.from\_page\_id \=== group\[i\].id && l.to\_page\_id \=== group\[j\].id           )           if (\!hasLink) {             suggestions.push({               from\_page\_id:      group\[i\].id,               to\_page\_id:        group\[j\].id,               anchor\_text:       extractDescriptiveAnchor(group\[j\]),               placement\_hint:    "body",               equity\_multiplier: 0.80,               priority:          "medium"             })           }         }       }     }   }   return suggestions }   // Anchor text helper functions: function generateVariationAnchor(keyword) {   // Use a natural 2-5 word phrase based on the keyword   // Never exact-match every time — vary naturally   // Examples: "drain cleaning services" → "professional drain cleaning"   //   OR "local drain cleaning" OR "drain cleaning cost"   const words \= keyword.split(" ")   if (words.length \<= 3\) return keyword // short keywords: use as-is   return words.slice(0, 3).join(" ")   // longer: use first 3 words }   function extractDescriptiveAnchor(page) {   // Return the page keyword as anchor (2-5 words)   const words \= page.keyword.split(" ")   return words.slice(0, Math.min(5, words.length)).join(" ") }   // Reasonable Surfer Equity Table (for UI display): // Body text early in article  → 1.00× (Very High) // Body text late in article   → 0.80× (High) // Above-fold sidebar          → 0.50× (Medium) // Navigation menu             → 0.30× (Low) // Footer                      → 0.15× (Very Low) |
| :---- |

## **17.7 Three-Category Semantic Model**

Both the SEO Dissertation and competitive analysis established that semantic terms fall into THREE distinct categories. All spec references to "entities" use this model.

| Category | What It Is | Where Used in UI |
| :---- | :---- | :---- |
| LSI Terms | Terms statistically co-occurring with the keyword. Increase topical classification confidence. From 2+ competitors \= consensus LSI. | Workspace Entities Tab — "Related Topics" section. LSI coverage score in Module 2\. |
| Entity Terms | Named concepts: businesses, locations, certifications, brands, specific products. In 3+ competitors \= must-cover. | Workspace Entities Tab — "Key Concepts" section. Entity coverage score in Module 2\. |
| PAA Questions | Actual questions users ask, sourced from Google's People Also Ask. Extracted from Serper.dev during brief generation. | Focus Page Brief — H3 sections. FAQ generation. Workspace Entities Tab — Section 3\. |

## **17.8 SEO Growth Stage Detection Logic**

Powers the SEOGrowthStagePanel component on dashboard. Shows user which velocity phase they are in.

| function detectGrowthStage(project, domainAuthorityHistory, gscData) {   const da \= project.domain\_authority   const currentHistory \= domainAuthorityHistory.find(h \=\> h.project\_id \=== project.id)   const referringDomains \= currentHistory?.referring\_domains || 0     // Phase 4: Full group modification factor unlocked   if (da \>= 30 && referringDomains \>= 50 && gscData?.hasConsistentTraffic) {     return {       phase: 4,       label: "Stage 4 — Full Authority",       description: "Your site has a proven track record. Head-term keywords are now realistic.",       nextUnlock: null     }   }   // Phase 3: Behavioral multiplier beginning to apply   if (referringDomains \>= 20 && gscData?.monthlyNewReferrals \>= 5\) {     return {       phase: 3,       label: "Stage 3 — Building Momentum",       description: "Google's authority multiplier is starting to apply to your pages.",       nextUnlock: "Reach 50 referring domains and consistent monthly traffic."     }   }   // Phase 2: Brand signals forming   if (gscData?.hasBrandedSearchVolume || da \>= 10\) {     return {       phase: 2,       label: "Stage 2 — Trust Building",       description: "Brand search signals are forming — this phase rewards consistent publishing.",       nextUnlock: "Earn 5+ new referring domains per month for 3 consecutive months."     }   }   // Phase 1: New domain — no trust history   return {     phase: 1,     label: "Stage 1 — Getting Started",     description: "Focus on low-competition keywords under 500 searches/month.",     nextUnlock: "Publish consistently and get your first few links from other websites."   } } |
| :---- |

## **17.9 Content Freshness Tracking Logic**

| 📌  PATENT: US7346839B2 (Historical Data): Google tracks content update frequency as a historical signal. Meaningful updates trigger re-evaluation. Stale pages decay in freshness scores. This is why "just update the date" doesn't work — the patent confirms Google distinguishes meaningful from superficial changes. |
| :---- |

| // Update last\_updated\_meaningful on page save when: // 1\. Word count changes by \> 10% from previous value // 2\. H2 count changes (structure change) // 3\. New sections added (heading structure changes significantly)   // In the save handler: function shouldUpdateFreshness(oldPage, newContent) {   const oldWords \= oldPage.word\_count   const newWords \= countWords(extractPlainText(newContent))   const wordCountChange \= Math.abs(newWords \- oldWords) / Math.max(oldWords, 1\)     const oldH2Count \= extractH2s(oldPage.content).length   const newH2Count \= extractH2s(newContent).length     return wordCountChange \> 0.10 || oldH2Count \!== newH2Count }   // Technical audit: flag pages where: // last\_updated\_meaningful \< NOW() \- interval '6 months' // AND (avg\_position \> previous\_avg\_position OR avg\_position IS NULL) // issue\_type: "stale\_content" // description: "This page hasn't been meaningfully updated in 6+ months. // Google tracks content freshness — older unchanged pages can lose ranking // priority over time." |
| :---- |

## **17.10 Anchor Text Profile Health**

| 📌  PATENT: US8682892B1: Anchor text profile naturalness influences the group modification factor. Unnatural exact-match anchor profiles signal manipulation and can trigger algorithmic penalties. |
| :---- |

| // Runs as part of technical audit (Scale+) // Analyzes all internal\_links records for a project   function analyzeAnchorTextProfile(projectId, internalLinks) {   const total   \= internalLinks.length   if (total \=== 0\) return null     const generic       \= internalLinks.filter(l \=\> isGenericAnchor(l.anchor\_text)).length   const branded       \= internalLinks.filter(l \=\> isBrandedAnchor(l.anchor\_text, project.name)).length   const exactMatch    \= internalLinks.filter(l \=\> isExactMatchAnchor(l.anchor\_text, l.to\_page?.keyword)).length     const genericPct    \= generic    / total   const brandedPct    \= branded    / total   const exactMatchPct \= exactMatch / total     // Target ranges:   // Branded:     30-40%   // Generic:     15-25%   // Exact match: 5-10% (flag if \> 15%)     const issues \= \[\]   if (exactMatchPct \> 0.15) {     issues.push({       type: "anchor\_text\_imbalance",       severity: "warning",       description: \`${Math.round(exactMatchPct \* 100)}% of your internal links use the         exact keyword as anchor text. This looks unnatural to Google.\`,       recommendation: "Vary anchor text. Use descriptive phrases like 'drain cleaning tips'",         "instead of the exact keyword 'drain cleaning services' every time."     })   }   return { genericPct, brandedPct, exactMatchPct, issues } }   function isGenericAnchor(text) {   const generic \= \["click here", "read more", "here", "this article", "this page", "learn more"\]   return generic.includes(text.toLowerCase().trim()) } |
| :---- |

## **17.11 Nine-Patent Quick Reference**

Every feature that implements a patent should cite it. Authoritative mapping:

| Patent | What It Governs | Sharkly Features It Powers |
| :---- | :---- | :---- |
| US8682892B1 | Panda — group modification factor \+ authority threshold gate | Authority Fit classification, Locked keyword mechanism, Keyword Velocity Tiers Phase 2+, Anchor Text Profile Health |
| US10055467B1 | Behavioral multiplier layer on top of Panda | Keyword Velocity Phase 3, CTR compound scoring |
| US9135307B1 | Alternative query replacement — domain quality pre-classification | New domain protocol, why new sites get fewer opportunities shown |
| US8117209B1 | Reasonable Surfer — link equity by click probability | Internal link suggestion engine, equity multiplier table, anchor text rules, placement enforcement |
| US8595225B1 | Navboost — topic-specific CTR behavioral ranking (DOJ confirmed 2023\) | Navboost Momentum Score, CTR decay detection, 13-month rolling window, CTR optimization urgency framing |
| US7346839B2 | Historical Data — Sandbox, inception date, link velocity | Keyword Velocity Phase 1, new domain protocol, content freshness tracking |
| US9940367B1 | Passage Scoring Part 1 — heading vector evaluation | H2 passage readiness scoring, question-format H2 enforcement in prompts |
| US9959315B1 | Passage Scoring Part 2 — Title → H1 → H2 → passage coherence path | UPSA Module 3, Passage Readiness indicator, brief H2 format rules |
| US20190155948A1 | Information Gain Score — anti-Skyscraper mechanism | IGS bonus (+15), Skyscraper Warning, IGS opportunity in briefs, Information Gain Checker audit |

# **APPENDIX: QUICK REFERENCE**

## **Route Summary**

| Route | Auth Required | Tier | Phase |
| :---- | :---- | :---- | :---- |
| /login, /signup, /forgot-password | No | Any | Beta |
| /onboarding | Yes | Any | Beta |
| /dashboard | Yes | Any | Beta |
| /strategy | Yes | Any | Beta |
| /clusters | Yes | Any | Beta |
| /clusters/:id | Yes | Any | Beta |
| /workspace/:id | Yes | Any | Beta |
| /performance | Yes | Growth+ | V1 |
| /technical | Yes | Scale+ | V1 |
| /calendar | Yes | Any | V1 |
| /projects | Yes | Any | V1 |
| /settings/integrations | Yes | Any | V1 |
| /settings/credits | Yes | Any | Beta |
| /settings/billing | Yes | Any | V1 |
| /settings/brand-voice | Yes | Any | Beta |
| /settings/profile | Yes | Any | Beta |
| /settings/notifications | Yes | Any | V1 |

## **Pre-Build Checklist — Before Writing Any Code**

Fixes that must be in place before Beta starts:

20. Moz API or DataForSEO added as required integration (Beta dependency, not V3)

21. New domain protocol (DA ≤ 5\) implemented in classifyAuthorityFit()

22. isPassageReadyH2() heuristic implemented in UPSA scoring function

23. calculateIGS() heuristic implemented in UPSA scoring function

24. H2 formatting \+ IGS instructions added to Section 8.2 brief prompt and 8.3 article prompt

25. Navboost CTR decay added as Priority 0 in decision tree (Section 17.5)

26. All seo\_score DB fields updated to store 0–115 (not 0–100)

27. domain\_authority\_history and navboost\_signals tables added to schema

28. countAnsweredPAA(), generateVariationAnchor(), extractDescriptiveAnchor() helper functions defined

Should fix before V1:

29. generateInternalLinkSuggestions() algorithm implemented (Section 17.6)

30. ReverseSiloAlert component implemented as hard warning

31. Tier gating confirmed: workspace IGS/H2 \= all tiers; site-wide audit versions \= Scale+

32. SEOGrowthStagePanel component implemented (Section 12.2 \+ 17.8)

33. content freshness tracking via last\_updated\_meaningful (Section 17.9)

34. Anchor text profile health audit implemented (Section 17.10)

**SHARKLY**

*"SEO made easy — for people who aren't SEO people."*

Version 4.0  ·  Patent-Grounded Edition  ·  Beta through V4  ·  2026  ·  sharkly.co
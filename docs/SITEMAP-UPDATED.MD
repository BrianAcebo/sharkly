# Sharkly — Full Product Sitemap

# Every route, screen, modal, and state in the application

# Last Updated: 2026

---

## MARKETING SITE — sharkly.co

/ — Homepage
/pricing — Pricing page
/features — Features overview
/blog — Blog index
/blog/:slug — Blog post
/about — About
/contact — Contact
/privacy — Privacy policy
/terms — Terms of service
/changelog — Product updates

---

## AUTH — sharkly.co/auth

/login — Login (email + password, Google OAuth)
/signup — Sign up (email + password, Google OAuth)
/forgot-password — Request password reset email
/reset-password — Set new password (via email link)
/verify-email — Email verification holding screen

---

## ONBOARDING — sharkly.co/onboarding

/onboarding — Step 1: Enter website URL
/onboarding — Step 2: Business profile (name, niche, platform, customer description)
/onboarding — Step 3: Add competitor URLs (up to 3)
/onboarding — Step 4: Scanning animation (live loading sequence)
/onboarding — Step 5: Strategy ready (summary + CTA to dashboard)

---

## APP — app.sharkly.co

---

### DASHBOARD

/dashboard
├── AI strategist insight block (what to do this week)
├── Credits warning banner (if < 20% remaining)
├── Stats row (keywords, avg position, content published, CRO score)
├── Active cluster card (progress, funnel balance, continue working CTA)
├── Quick wins list (top 3 priority actions)
└── Topic queue table (first 4 topics, link to full strategy)

---

### STRATEGY

/strategy
├── AI strategist insight block
├── Filter pills (All, Achievable Now, Build Toward, BoFu, MoFu, ToFu, Quick Wins)
├── Topic table (all topics, sortable, draggable to reorder)
│ ├── Row: active cluster → "View Cluster" CTA
│ ├── Row: achievable → "Start Cluster" CTA (costs 15 credits)
│ └── Row: locked → disabled state with lock icon
├── Load more (pagination)
├── VIEW TOGGLE: Topics view | Keywords view
│
├── TOPICS VIEW (existing default)
│ ├── AI strategist insight block
│ ├── Filter pills
│ └── Topic table
│
├── KEYWORDS VIEW (new)
├── All keywords across all clusters in one flat table
├── Columns: keyword, cluster, article, searches, difficulty,
│ buyer intent, funnel stage
├── Filter pills (All Clusters, individual cluster names, funnel stage)
├── Sort by any column
└── "Research a keyword" input → triggers keyword lookup modal

MODALS:
├── Confirm regenerate strategy (costs 15 credits)
├── Add topic manually (keyword input → SERP analysis → insert into list)
├── Topic detail drawer (AI reasoning, volume, KD, CPC, authority fit explanation)
├── Keyword lookup modal (5 credits)
│ ├── Metrics card (searches, difficulty, buyer intent, authority fit)
│ ├── Related keyword pills (6-8 suggestions)
│ └── Add to Strategy / Add to Cluster CTAs
└── (existing modals remain)

---

### CLUSTERS

/clusters
├── Grid of all clusters (active, in progress, complete)
├── Each card: cluster title, topic, completion %, CRO score, last edited
└── "+ New Cluster" → triggers topic selection modal

MODALS:
└── Select topic to start cluster (picks from strategy list)

/clusters/:id — Cluster Detail
├── Page header (breadcrumb, title, stats, action buttons)
├── Cluster health bar (funnel coverage, CRO score, authority fit, completion)
│
├── TABS — Content List view:
├── Table: title, keyword, monthly searches, difficulty,
│ buyer intent, funnel stage, status, SEO score, word count, action
├── "Research a keyword" input at bottom → triggers keyword lookup modal
│
├── LEFT: Mini nav tabs
│ ├── Visual Map (default)
│ ├── Content List
│ ├── Internal Links
│ └── Cluster Settings
│
├── CENTER: React Flow visual map
│ ├── Focus page node (dark, cyan border)
│ ├── Article nodes (color-coded by funnel stage)
│ ├── Edges (dashed = planned link, solid = implemented link)
│ ├── Background dot grid
│ └── Zoom / pan / fit controls
│
└── RIGHT: Detail panel (slides in on node click)
├── Node info (keyword, volume, KD, funnel, status)
├── AI reasoning block
├── CRO suggestions (money page only)
└── Actions (Open in Workspace, Remove from Cluster)

MODALS:
├── Add article to cluster (keyword input)
├── Confirm generate all content (credit cost summary)
├── Confirm remove article
└── Cluster settings (rename, delete cluster)

TABS — Content List view:
└── Table: title, keyword, funnel, status, SEO score, word count, action

TABS — Internal Links view:
├── Table: from page, anchor text, to page, placement, equity estimate, implemented status
│   ├── Placement column: Body-early (★★★★★) / Body-late (★★★★) / Other (★)
│   └── Equity estimate based on Reasonable Surfer placement model [US8117209B1]
├── Mark as implemented toggle
├── Add manual link (draw connection between two pages)
└── ⚠ Flags: generic anchors ("click here"), footer/nav placements, multiple links to same destination

TABS — Cluster Settings:
├── Rename cluster
├── Change target keyword
└── Delete cluster (confirm modal)

---

### WORKSPACE

/workspace/:id — Content Editor
├── Page header
│ ├── Breadcrumb (cluster → page title)
│ ├── Inline editable page title
│ ├── Mode tabs: Focus Page Brief | Article Editor
│ ├── Live SEO score
│ └── Action buttons (Export, Generate)
│
├── LEFT/CENTER: Editor area
│ │
│ ├── MONEY PAGE BRIEF MODE
│ │ ├── Word count progress bar
│ │ ├── Section cards (H1, H2s, CTA, FAQ, Schema)
│ │ │ ├── Section type badge
│ │ │ ├── Heading text
│ │ │ ├── Content guidance
│ │ │ ├── Entity tags (covered / missing)
│ │ │ ├── CRO flag (if applicable)
│ │ │ └── Rewrite section button (5 credits)
│ │ └── JSON-LD schema block (copy to clipboard)
│ │
│ └── ARTICLE EDITOR MODE
│ ├── EMPTY STATE (no content yet)
│ │ └── Generate article CTA (20 credits)
│ └── EDITOR WITH CONTENT
│ ├── Sticky toolbar (Bold, Italic, H1-H3, Lists, Link)
│ ├── Tiptap WYSIWYG content area
│ └── Regenerate button (20 credits)
│
└── RIGHT: Intelligence panel (280px)
├── Tabs: SEO | Competitors | CRO | Entities
│
├── SEO TAB
│ ├── Overall score (large display, 0–115)
│ ├── Score breakdown by dimension:
│ │   ├── Structural (0–25): title, H1, URL, first 100 words
│ │   ├── Semantic (0–25): LSI coverage, entity coverage
│ │   ├── Content Quality (0–25): word count, FAQ, schema, intent
│ │   ├── Information Gain Bonus (0–15) [US20190155948A1]
│ │   │   ├── IGS elements detected / missing
│ │   │   └── ⚠ Skyscraper Warning (if 0 original elements found)
│ │   ├── Passage Readiness (0–15) [US9940367B1 + US9959315B1]
│ │   │   ├── H2s as answerable questions: X/Y
│ │   │   ├── First-sentence answers: X/Y sections
│ │   │   └── FAQ section: present / missing
│ │   └── Technical (0–10): schema, canonical, internal links
│
├── COMPETITORS TAB
│ ├── 3 competitor cards (domain, word count, heading count)
│ └── Your target comparison pill
│
├── CRO TAB
│ ├── Score (X/8 complete)
│ └── Checklist (8 items with pass/fail/partial status)
│
└── ENTITIES TAB
├── Covered entities (green pills)
└── Missing entities (red pills, hover = competitor mention count)

MODALS:
├── Export options (copy markdown, copy plain text, download .txt, download .md)
├── Confirm regenerate (credit cost warning)
└── Meta generator modal
├── 3 meta title options
├── 3 meta description options
├── Character count indicators
└── Copy button per option

---

### PERFORMANCE

/performance
├── Page header (date range pills: 30d / 90d / All time)
├── AI analyst insight block
├── Stats row (impressions, clicks, avg CTR, avg position)
│
├── TWO COLUMN:
│ ├── LEFT: Traffic chart (Recharts line, clicks over time)
│ └── RIGHT: Top pages list (by clicks)
│
├── NAVBOOST MOMENTUM PANEL [US8595225B1]
│ ├── Per-keyword CTR trend (13-week trailing)
│ ├── Status badges: 🟢 Building / 🟡 Flat / 🔴 Weakening
│ ├── Tooltip: "Google's click signal compounds over 13 months.
│ │           Improving CTR today builds ranking power through [date]."
│ └── Action: "Optimize Title" for 🔴 keywords
│
├── Rankings table
│ ├── Columns: keyword, position, change, impressions, CTR, momentum, action
│ ├── Row action: "Optimize CTR" if CTR < 2% (3 credits)
│ ├── Row action: "View Page" if position dropped
│ └── Row action: "Monitor" otherwise
│
└── GSC NOT CONNECTED STATE (Builder tier)
└── Upgrade callout → "Connect Search Console on Growth plan"

MODALS:
└── CTR optimization modal
├── Current meta title + description
├── 3 AI-suggested replacements
├── Character count indicators
└── Apply button (saves to page record)

---

### TECHNICAL SEO (Scale tier)

/technical
├── AI insight block (summary of current site health)
├── Health score (X/100 overall)
├── Last crawl timestamp + "Run New Crawl" button (10 credits)
│
├── Issue categories (tabs or accordion):
│ ├── Missing metas (count badge)
│ ├── Duplicate content (count badge)
│ ├── Thin content (count badge)
│ ├── Broken links (count badge)
│ ├── Redirect issues (count badge)
│ ├── Image SEO (count badge)
│ ├── Core Web Vitals (count badge)
│ ├── H2 Passage Quality (count badge) [NEW — US9940367B1 + US9959315B1]
│ └── Information Gain Issues (count badge) [NEW — US20190155948A1]
│
├── Issues table (filtered by active category)
│ ├── Columns: issue, affected page, severity, recommended fix
│ ├── Severity: Critical / Warning / Info (color coded)
│ └── Row action: "Fix" → opens relevant workspace or external link
│
├── BRAND SEARCH PANEL [NEW — US8682892B1]
│ ├── Branded search volume trend (from GSC)
│ ├── Backlink count trend
│ ├── Ratio indicator (brand searches / backlinks)
│ ├── Status: Healthy / Growing / ⚠ Ratio Declining
│ └── Recommendations: "Ways to grow branded search volume"
│
└── SCALE NOT CONNECTED STATE (Growth and below)
└── Upgrade callout → "Unlock technical SEO on Scale plan"

MODALS:
└── Bulk fix metas modal
├── List of pages missing metas
├── AI-generate all missing metas (3 credits × page count)
└── Review and confirm before applying

---

### SETTINGS

/settings — redirects to /settings/integrations

/settings/integrations
├── Google Search Console (connect / manage / disconnect)
├── Shopify (connect / manage / disconnect)
├── WordPress (connect / manage / disconnect)
└── Google Analytics (coming soon — greyed out)

/settings/credits
├── Current plan card (plan name, price, renewal date)
├── Credits balance (large display + progress bar)
├── Buy overage credits (Stripe payment, $0.05/credit)
├── Credit usage breakdown (by action type this month)
├── Credit usage chart (daily bar chart)
└── Transaction history table (date, action, credits used)

/settings/billing
├── Current plan details
├── Upgrade / downgrade plan options
├── Next billing date and amount
├── Link to Stripe Customer Portal (payment method, invoices)
└── Cancel subscription option (confirm modal)

/settings/brand-voice
├── Tone selector (Professional / Friendly / Conversational / Bold / Authoritative)
├── Industry terms to always include (tag input)
├── Terms to never use (tag input)
├── Sample AI output preview (regenerates on setting change)
└── Save button

/settings/profile
├── Full name (editable)
├── Email (editable, requires re-verification)
├── Avatar upload
├── Change password
└── Delete account (confirm modal with "type DELETE to confirm")

/settings/notifications
├── Rank drop alerts (toggle + threshold: any drop / >3 positions / >5 positions)
├── Weekly SEO summary email (toggle)
├── Credit low warning (toggle + threshold: 20% / 10%)
├── Cluster completion notification (toggle)
└── New site health issues (toggle)

/settings/team — Coming Soon (V2)
├── Locked overlay with "Coming in V2" message
└── Join waitlist CTA

---

### PROJECT SETTINGS

/projects — All projects overview (V1)
├── Project cards (name, URL, platform, active cluster, last activity)
├── "+ New Project" button
└── Switch active project

Project settings (sheet slideout drawer, not a route)
├── Edit project name, URL, niche, platform, customer description
├── Manage competitor URLs (add / remove)
├── Re-audit button (re-run full site scan, 10 credits) — next to Edit on each site card
└── Delete project (confirm modal)

---

## SHOPIFY EMBEDDED APP — Shopify Admin

/admin/apps/sharkly — App home (embedded via Shopify App Bridge)
├── Connection status card (store connected / not connected)
├── Active cluster summary (title, % complete)
├── Publish queue (articles ready to publish, one-click publish)
└── "Open Sharkly Dashboard" CTA → opens app.sharkly.co in new tab

---

## GLOBAL UI ELEMENTS (present throughout app)

SIDEBAR (all authenticated screens):
├── Logo + brand name
├── Project name + URL (current project)
├── Credits indicator (progress bar + remaining count)
├── Credits warning (if < 20%)
├── Main nav (Dashboard, Strategy, Clusters, Performance, Technical)
├── Active cluster section (if cluster is in progress)
│ └── Sub-items: Focus Page, Articles (count), Internal Links
└── Bottom: Settings, User avatar + name + plan badge

GLOBAL MODALS:
├── Insufficient credits modal
│ ├── Action that was attempted
│ ├── Credits needed vs credits remaining
│ ├── "Buy overage credits" CTA ($0.05/credit)
│ └── "Upgrade plan" CTA
├── Loading steps modal (all AI generation actions)
│ ├── Step-by-step progress list
│ ├── Current step highlighted with pulsing dot
│ └── Completed steps with green checkmark
└── Confirm action modal (generic — used for destructive actions)
├── Action description
├── Warning text if applicable
└── Confirm / Cancel buttons

TOAST NOTIFICATIONS:
├── Success: content saved, published, credits purchased
├── Error: API failure, insufficient credits, connection error
└── Info: credits reset, rank movement detected

EMPTY STATES (all major screens have designed empty states):
├── No clusters yet → "Start your first cluster" CTA
├── No performance data → "Connect Search Console" CTA
├── No technical data → "Run your first site audit" CTA
└── No projects yet → redirect to onboarding

---

## ROUTE SUMMARY

| Route                             | Auth Required | Tier Required |
| --------------------------------- | :-----------: | :-----------: |
| /login, /signup, /forgot-password |      No       |       —       |
| /onboarding                       |      Yes      |      Any      |
| /dashboard                        |      Yes      |      Any      |
| /strategy                         |      Yes      |      Any      |
| /clusters                         |      Yes      |      Any      |
| /clusters/:id                     |      Yes      |      Any      |
| /workspace/:id                    |      Yes      |      Any      |
| /performance                      |      Yes      |    Growth+    |
| /technical                        |      Yes      |    Scale+     |
| /settings/\*                      |      Yes      |      Any      |
| /projects                         |      Yes      |      Any      |
| /admin/apps/sharkly               |    Shopify    |      Any      |

---

## PAGE COUNT

| Section                   | Pages / Routes |
| ------------------------- | :------------: |
| Marketing site            |       10       |
| Auth                      |       5        |
| Onboarding                |  1 (5 steps)   |
| Dashboard                 |       1        |
| Strategy                  |       1        |
| Clusters (index + detail) |       2        |
| Workspace                 |       1        |
| Performance               |       1        |
| Technical SEO             |       1        |
| Settings                  |       6        |
| Project settings          |       2        |
| Shopify embedded app      |       1        |
| **Total**                 |     **32**     |

---

_Sharkly — Shark Engine Optimization_
_"SEO made easy — for people who aren't SEO people."_

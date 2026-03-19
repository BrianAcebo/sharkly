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

/strategy — Targets Overview
├── Page header: "Your Strategy" + "Add Target" button
├── AI strategist insight block (site-level — which target to focus on next)
├── Targets grid (cards)
│ ├── Card: target name, destination page label, destination URL
│ ├── Card: topic count (X topics · Y unlocked · Z in progress)
│ ├── Card: cluster count + completion summary
│ ├── Card: GSC impressions trend sparkline (Growth+ only)
│ └── Card CTA: "View Topics" → /strategy/:target_id
├── Empty state: "You haven't defined any targets yet"
│ ├── Explanation: "A target is a page you want to rank — a service, product, or
│ │ area of your business. Sharkly builds a content plan around each one."
│ └── "Add your first target" CTA → Add Target modal
└── KEYWORDS VIEW toggle (global — all keywords across all targets, flat table)
├── Columns: keyword, target, cluster, article, searches, difficulty,
│ buyer intent, funnel stage
├── Filter pills (All Targets, individual target names, funnel stage)
├── Sort by any column
└── "Research a keyword" input → triggers keyword lookup modal

MODALS:
├── Add Target modal
│ ├── Step 1: "What are you trying to rank?"
│ │ ├── Target name (e.g. "Cyber Crime Investigation", "Hydrating Moisturizer")
│ │ ├── Destination page URL (the page you want to drive traffic to)
│ │ ├── Destination page label (short name — shown in UI and content briefs)
│ │ └── Seed keywords (optional — defaults to target name if blank)
│ └── Step 2: Confirmation + "Generate Topic Plan" CTA (15 credits)
├── Edit Target modal (name, destination URL, destination label, seed keywords)
├── Confirm delete target (warns: deletes all associated topics and clusters)
└── Keyword lookup modal (5 credits)
├── Metrics card (searches, difficulty, buyer intent, authority fit)
├── Related keyword pills (6-8 suggestions)
└── Add to Strategy / Add to Cluster CTAs

---

/strategy/:target_id — Target Detail (Topic Plan)
├── Page header
│ ├── Breadcrumb: Strategy → [Target Name]
│ ├── Target name (editable inline)
│ ├── Destination page pill: label + URL (opens in new tab)
│ └── Action buttons: Edit Target | Regenerate Topics (15 credits) | Add Topic
│
├── AI strategist insight block (target-scoped — what to work on in this target)
│
├── UNLOCKED TOPICS section
│ ├── Section label: "Ready to Build" + count badge
│ ├── Filter pills (All, Commercial, Informational, Transactional)
│ ├── Topic table
│ │ ├── Row: # | Topic title | Funnel | Searches/mo | KD | CPC | Status | Action
│ │ ├── Row status: Active Cluster → "View Cluster" CTA
│ │ ├── Row status: Ready → "Start Cluster" CTA (15 credits)
│ │ └── Row: click anywhere → Topic detail drawer
│ └── Sort by: Priority Score (default) | Volume | Difficulty | CPC
│
├── LOCKED TOPICS section (collapsed by default)
│ ├── Section label: "Unlocks As You Grow" + count badge
│ ├── Collapsed state: single row showing count + impression threshold needed
│ ├── Expanded state: dimmed topic rows with lock icon
│ │ └── Each row: topic title + "Needs ~X monthly impressions to unlock"
│ └── Expand/collapse toggle
│
└── VIEW TOGGLE: Topics view (default) | Keywords view
└── Keywords view: all keywords within this target's clusters, flat table

MODALS:
├── Topic detail drawer
│ ├── Topic title + primary keyword
│ ├── AI reasoning (plain English — why this topic, why now)
│ ├── Metrics: volume, KD, CPC, funnel stage, discovery sources
│ ├── Authority fit explanation (why locked/unlocked at current tier)
│ ├── "Start Cluster" CTA (15 credits) — if not yet started
│ └── "View Cluster" CTA — if cluster exists
├── Add topic manually (keyword input → SERP analysis → insert into list)
└── Confirm regenerate topics (warns: replaces existing unlocked topics, keeps active clusters)

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
├── Cluster health bar (funnel coverage, CRO score, authority fit, completion,
│ destination connection status: Connected / Partial / Disconnected)
│
├── LEFT: Mini nav tabs
│ ├── Customer Journey (default — NEW)
│ ├── Link Architecture (React Flow map)
│ ├── Content List
│ ├── Internal Links
│ └── Cluster Settings
│
├── CUSTOMER JOURNEY TAB (default — NEW)
│ ├── Three-column layout: Awareness | Consideration | Decision
│ ├── Page cards per column:
│ │ ├── Page title + keyword
│ │ ├── UPSA score + CRO score
│ │ ├── GSC: impressions, clicks, CTR, position (Growth+)
│ │ └── Status badge
│ ├── SEO anchor highlighted: "★ — This is where you rank"
│ ├── Traffic flow arrow: anchor → destination (shows GSC click volume)
│ ├── Destination page card:
│ │ ├── LOCKED STATE (base subscription):
│ │ │ ├── Lock icon
│ │ │ ├── Personalised upsell copy using actual GSC click volume:
│ │ │ │ "X visitors went here last month — see what's stopping them from converting."
│ │ │ └── Upgrade CTA → CRO add-on
│ │ └── UNLOCKED STATE (CRO add-on active):
│ │ ├── CRO score
│ │ ├── Last audit date
│ │ └── "Open in CRO Studio" CTA
│ ├── Cluster intelligence warning banners (top 2 warnings shown here)
│ └── WARNING 7 BANNER: full-width red banner when BoFu focus page detected:
│ "Critical: Your focus page is targeting a transactional keyword — this fights itself."
│
├── LINK ARCHITECTURE TAB (React Flow — was default)
│ ├── Focus page node (dark, cyan border)
│ ├── Article nodes (color-coded by funnel stage)
│ ├── Destination page node (outside cluster boundary, directional arrows from focus page) [NEW]
│ ├── Edges (dashed = planned link, solid = implemented link)
│ ├── Background dot grid
│ └── Zoom / pan / fit controls
│
├── CONTENT LIST TAB
│ └── Table: title, keyword, funnel, status, SEO score, word count, action
│
├── INTERNAL LINKS TAB
│ ├── Table: from page, anchor text, to page, placement, equity estimate, implemented status
│ │ ├── Placement: Body-early (★★★★★) / Body-late (★★★★) / Other (★)
│ │ └── Equity estimate based on Reasonable Surfer [US8117209B1]
│ ├── Destination link suggestions (NEW — type: contextual_destination_link)
│ ├── Mark as implemented toggle
│ ├── Add manual link (draw connection between two pages)
│ └── ⚠ Flags: generic anchors, footer/nav placements, multiple links to same destination
│
├── INTELLIGENCE TAB (NEW)
│ ├── Cluster health score + status (Strong / Needs Work / Critical Issues)
│ ├── Active warnings list (all warnings that fired, with explanations)
│ └── Each warning: severity badge, plain-English explanation, recommended action
│
└── RIGHT: Detail panel (slides in on node click — Link Architecture tab only)
├── Node info (keyword, volume, KD, funnel, status)
├── AI reasoning block
├── CRO suggestions (money page only)
└── Actions (Open in Workspace, Remove from Cluster)

MODALS:
├── Add article to cluster (keyword input)
├── Add destination page (NEW — "Does this cluster have a destination page?")
│ ├── URL field + label field
│ └── Skip option
├── Confirm generate all content (credit cost summary)
├── Confirm remove article
└── Cluster settings (rename, delete cluster)

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
│ │ ├── Structural (0–25): title, H1, URL, first 100 words
│ │ ├── Semantic (0–25): LSI coverage, entity coverage
│ │ ├── Content Quality (0–25): word count, FAQ, schema, intent
│ │ ├── Information Gain Bonus (0–15) [US20190155948A1]
│ │ │ ├── IGS elements detected / missing
│ │ │ └── ⚠ Skyscraper Warning (if 0 original elements found)
│ │ ├── Passage Readiness (0–15) [US9940367B1 + US9959315B1]
│ │ │ ├── H2s as answerable questions: X/Y
│ │ │ ├── First-sentence answers: X/Y sections
│ │ │ └── FAQ section: present / missing
│ │ └── Technical (0–10): schema, canonical, internal links
│
├── COMPETITORS TAB
│ ├── 3 competitor cards (domain, word count, heading count)
│ └── Your target comparison pill
│
├── CRO TAB
│ ├── "Optimize CRO" button → opens CRO Studio with this page pre-loaded
│ │ ├── Passes: page_url, page_type: 'seo_page', destination_url (from target)
│ │ ├── Shown only if page has a URL set
│ │ └── If no URL set: prompt "Add your page URL to run a CRO audit"
│ ├── If page has been audited in CRO Studio: shows last CRO score + audit date
│ │ └── "View full audit →" link to /cro-studio/:audit_id
│ └── If never audited: empty state — "Run a CRO audit to see how well this
│ page hands off visitors to your destination page."
│
│ NOTE: The CRO tab skeleton (8-item checklist) has been removed.
│ CRO auditing now happens in CRO Studio. See cro-studio.md.
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

### ECOMMERCE SEO

/ecommerce — Ecommerce hub
├── Header: "Ecommerce" + Add Product + Add Collection + Import from Shopify (if connected)
├── Tabs: Products (default) | Collections
├── Products table
│ ├── Columns: Name | Keyword | Target | SEO Health | Status | Action
│ ├── Bulk select checkboxes + sticky "Generate selected" bottom bar with credit cost
│ └── Each row links to /ecommerce/:id
├── Collections table (same structure)
├── Empty state — no Shopify, no items: Add Product / Add Collection / Connect Shopify CTAs
└── Empty state — Shopify connected, no items: Import from Shopify CTA

MODALS:
├── Add Product modal
│ ├── Product name (required)
│ ├── Product URL (optional — needed for SEO crawl checks)
│ ├── Existing description (optional paste)
│ └── Target selector (optional)
├── Add Collection modal
│ ├── Collection name (required)
│ ├── Collection URL (optional)
│ ├── Existing intro text (optional paste)
│ └── Target selector (optional)
└── Import from Shopify modal
├── Tab: Products — pulls top 250 via Shopify Admin API, checkbox list
├── Tab: Collections — pulls all collections, checkbox list
├── Amber dot on collections with no existing intro text
└── "Import selected" button — free (0 credits)

---

/ecommerce/:id — Product or Collection Workspace
├── Two-column layout (65% editor / 35% SEO checks)
│
├── LEFT PANEL — editor (65%)
│ ├── Header row
│ │ ├── Product/collection name (editable inline)
│ │ ├── Keyword field (editable inline — placeholder "Set target keyword")
│ │ ├── Target selector (sets destination_page_url on that Target record)
│ │ ├── "Publish to Shopify" button (cyan — Shopify connected + content exists)
│ │ ├── "Copy HTML" button (no Shopify connected + content exists)
│ │ └── "Generate" button (10 credits)
│ │
│ ├── Keyword assignment block (shown until keyword is set)
│ │ ├── Keyword input field
│ │ ├── "Check SERP" — 5 credits (top 3 keyword suggestions, volume + difficulty)
│ │ └── "Set manually" — free
│ │
│ ├── Description editor (Tiptap — same component as main workspace)
│ │ ├── Before generation: existing_content shown read-only as "Current — will be rewritten"
│ │ ├── After generation: Tiptap editor, same toolbar as workspace
│ │ ├── Word count indicator: target 350–400 (products) / 150–200 (collections)
│ │ └── Autosave
│ │
│ └── Schema block (collapsible, below editor)
│ ├── Product: Product + Offer schema
│ ├── Collection: CollectionPage + BreadcrumbList schema
│ └── Copy-to-clipboard button
│
├── RIGHT PANEL — SEO checks (35%)
│ ├── "Re-check" button (free — re-crawls URL)
│ ├── Pass/fail summary: "X / 6 checks passing"
│ ├── Check 1: Keyword in page title (weight 1.00)
│ ├── Check 2: Keyword in H1 (weight 0.95)
│ ├── Check 3: Keyword in URL slug (weight 0.85) — warning if GSC impressions exist
│ ├── Check 4: Meta description present + 150–160 chars
│ ├── Check 5: Description originality (manufacturer copy detection)
│ ├── Check 6: Product/CollectionPage schema present
│ ├── Duplicate variants warning (products only — variant_count > 3)
│ └── Pagination canonical warning (collections only — products_count > 50)
│
└── Publish modal (on "Publish to Shopify")
├── Destination: {product name} at {store}.myshopify.com/products/{handle}
├── Checkbox: Overwrite existing description
├── Checkbox: Update meta title + meta description
└── Confirm / Cancel

---

### CRO STUDIO (Post-Launch — CRO Add-On)

**Full spec:** `cro-studio.md` — single source of truth for all CRO functionality.

/cro-studio — CRO Studio Home
├── Nav item: "CRO Studio 🎯" (locked/greyed for base subscribers — clicking opens upgrade modal)
│
├── LOCKED STATE (base subscribers):
│ ├── Lock overlay with CRO add-on upsell
│ └── Personalised copy: "X visitors hit your destination pages last month"
│ (uses GSC click data where available)
│
└── UNLOCKED STATE (CRO add-on active):
├── Header: "CRO Studio" + "[ + Add Page ]" button
├── Tabs: [ SEO Pages ] [ Destination Pages ]
│
├── SEO PAGES TAB
│ ├── Lists all audited SEO pages (focus pages + articles)
│ ├── Each card: page label, URL, CRO score (X/5), handoff status,
│ │ last audit date, issue count
│ └── Empty state: "Open any focus page or article in the Workspace
│ and click 'Optimize CRO' to start an audit"
│
├── DESTINATION PAGES TAB
│ ├── Lists all audited destination pages
│ ├── Each card: page label, URL, connected target name, CRO score (X/10),
│ │ last audit date, issue count
│ └── Empty state: "Click 'Open in CRO Studio' from any cluster's
│ Customer Journey tab, or add a URL manually below"
│
└── Re-audit prompt badge on cards where audit is >30 days old

MODALS:
└── Add Page modal (from "+ Add Page" button or standalone entry)
├── Step 1: Page URL input
├── Step 2: Page type selector
│ ├── "SEO Page" — focus page or article (ranks and warms the lead)
│ └── "Destination Page" — product, service, or signup page (converts)
├── Step 3 (SEO Page only): Destination URL input
│ ├── "Which page should visitors go to from this page?"
│ └── Helper: "This should be the product or service page you want to sell"
├── Validation on submit:
│ ├── Structural check — flags if declared type doesn't match page structure
│ └── For SEO pages: checks if destination URL is present as first link
│ in first 400 words. Warns if not — does not block submission.
└── Upgrade modal (base subscribers)
├── "X visitors hit your destination pages last month"
└── Stripe add-on purchase CTA (+$29/month)

---

/cro-studio/:audit_id — Page Audit View

**Routing:** Same route handles both page types. UI adapts based on `page_type`.

├── SHARED HEADER (both page types)
│ ├── Page label + URL (↗ opens in new tab)
│ ├── Page type badge: "SEO Page" or "Destination Page"
│ ├── Connected target/cluster pill (if connected — links to cluster detail)
│ ├── CRO Score (large display — only score shown)
│ ├── Last audited date
│ ├── [ Re-audit page ] (1 credit)
│ └── [ Get Fixes ] / [ Generate All Fixes ] (3 credits SEO / 6 credits destination)
│
├── SEO PAGE AUDIT VIEW
│ ├── 🔴 Critical Issues
│ │ └── Destination handoff failures, funnel mismatch warnings
│ ├── 🟡 Improvements
│ │ └── CTA commitment level, emotional hook, CTA presence
│ ├── ✅ Strong — working well
│ └── Generated fixes panel (inline expansion per item)
│ ├── 2-3 copy options per fix with exact words
│ ├── Placement instruction per option
│ ├── Copy-to-clipboard
│ └── ⚠ Note on every fix: "This fix should not require shortening
│ your article or changing your keyword focus"
│
└── DESTINATION PAGE AUDIT VIEW
├── 🔴 PAGE STRUCTURE VIOLATIONS (shown first if violations exist)
│ └── Trust-after-CTA, CTA-below-fold violations
├── AUDIT REPORT (10-step journey)
│ ├── 🔴 Critical Issues (failed required journey steps)
│ ├── 🟡 Improvements (partial steps)
│ └── ✅ Strong (passing steps — keep these)
├── COGNITIVE BIAS INVENTORY (collapsed section)
│ ├── 11 biases — present ✅ / missing ❌
│ └── Advisory only — not scored
├── SEO BASICS (collapsed section)
│ └── References runSeoChecks() results from ecommerce workspace
│ (keyword in title, H1, URL, meta description, originality, schema)
│ — read-only display, "Edit in Ecommerce workspace →" link
└── Generated fixes panel (same structure as SEO page — inline expansion)

---

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
│ │ Improving CTR today builds ranking power through [date]."
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
│ ├── H2 Passage Quality (count badge) [US9940367B1 + US9959315B1]
│ ├── Information Gain Issues (count badge) [US20190155948A1]
│ ├── Mobile-First Issues (count badge) [NEW]
│ ├── Crawl Budget Waste (count badge) [NEW — tag/archive/parameter pages]
│ ├── Link Velocity (count badge) [NEW — US7346839B2]
│ └── Intrusive Interstitials (count badge) [NEW]
│
├── Issues table (filtered by active category)
│ ├── Columns: issue, affected page, severity, recommended fix
│ ├── Severity: Critical / Warning / Info (color coded)
│ └── Row action: "Fix" → opens relevant workspace or external link
│
├── TRUST & AUTHORITY TAB [NEW — EEAT]
│ ├── EEAT overall score (X/100)
│ ├── Four sections: Expertise / Experience / Authoritativeness / Trustworthiness
│ ├── Each item: pass/fail indicator + one plain-English fix per failing item
│ └── YMYL badge (if niche detected — stricter requirements shown automatically)
│
├── BRAND SEARCH PANEL [US8682892B1]
│ ├── Branded search volume trend (from GSC)
│ ├── Backlink count trend
│ ├── Ratio indicator: brand searches / backlinks [CORRECTED FRAMING]
│ ├── Status: Healthy / Growing / ⚠ Ratio Declining
│ │ (warning fires when backlinks growing 3× faster than branded searches)
│ └── Recommendations: "Ways to grow your brand search volume"
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
├── Content Voice section [NEW]
│ ├── "Who is the expert behind this content?" (author_bio field)
│ └── Helper: "This makes your content sound like it comes from a real expert —
│ which helps with Google's trust signals."
├── Business Profiles section [NEW]
│ ├── Google Business Profile URL
│ ├── Facebook URL
│ ├── LinkedIn URL
│ ├── Yelp URL
│ └── Wikidata URL (optional — advanced)
├── Review Data section [NEW]
│ ├── Google review count
│ ├── Google average rating
│ └── Google Place ID
├── Manage competitor URLs (add / remove)
├── Re-audit button (re-run full site scan, 10 credits)
└── Delete project (confirm modal)

---

### CRO STUDIO (Post-Launch — CRO Add-On)

/cro-studio — CRO Studio home (locked for base subscribers)
├── LOCKED STATE (base subscription):
│ ├── Lock overlay with CRO add-on upsell
│ └── Upgrade CTA → CRO add-on ($29/month)
│
└── UNLOCKED STATE (CRO add-on active):
├── Destination pages list (all clusters with destination_page_url)
│ ├── Each card: destination label, cluster name, CRO score, last audit date
│ └── "Re-audit" prompt when audit >30 days old
└── "Add destination page" CTA for clusters without one

/cro-studio/:destination_id — Destination Page Audit
├── Page header (destination label, cluster name, CRO score)
├── "Run Audit" / "Re-audit" button (1 credit)
│
├── AUDIT REPORT (after audit runs):
│ ├── Critical Issues (red) — must fix
│ ├── Improvements (amber) — should fix
│ └── Strong (green) — working well
│
├── Page Architecture section (shown first — element sequence violations)
│
├── Generated fixes panel:
│ ├── Each failing item expandable inline
│ ├── 2–3 copy options per fix (exact words)
│ ├── Placement instructions ("Place this above the fold, before any images")
│ └── Copy-to-clipboard per option
│
└── "Generate All Fixes" button (6 credits)

NOTES:

- CRO Studio audits both SEO pages (focus pages + articles) and destination pages
- Both page types use live URL fetch — rendered HTML only, not Tiptap content
- SEO pages get a 5-item light CRO audit (handoff, CTA fit, funnel mismatch, hook, CTA present)
- Destination pages get a 10-step Optimal Selling Journey audit + cognitive bias inventory
- No UPSA score anywhere in CRO Studio
- No content editor — users implement fixes in their own CMS
- No combined SEO + CRO score — they are always separate numbers

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
├── Main nav:
│ ├── Dashboard
│ ├── Strategy ← lands on /strategy (Targets overview)
│ ├── Clusters
│ ├── Ecommerce ← /ecommerce (all users — empty state handles onboarding)
│ ├── Performance
│ ├── Technical
│ └── CRO Studio 🎯 (locked/greyed for base subscribers — post-launch add-on)
├── Active cluster section (if cluster in progress)
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

| Route                             | Auth Required |      Tier Required       |
| --------------------------------- | :-----------: | :----------------------: |
| /login, /signup, /forgot-password |      No       |            —             |
| /onboarding                       |      Yes      |           Any            |
| /dashboard                        |      Yes      |           Any            |
| /strategy                         |      Yes      |           Any            |
| /strategy/:target_id              |      Yes      |           Any            |
| /clusters                         |      Yes      |           Any            |
| /clusters/:id                     |      Yes      |           Any            |
| /workspace/:id                    |      Yes      |           Any            |
| /ecommerce                        |      Yes      |           Any            |
| /ecommerce/:id                    |      Yes      |           Any            |
| /performance                      |      Yes      |         Growth+          |
| /technical                        |      Yes      |          Scale+          |
| /cro-studio                       |      Yes      | CRO Add-On (post-launch) |
| /cro-studio/:audit_id             |      Yes      | CRO Add-On (post-launch) |
| /settings/\*                      |      Yes      |           Any            |
| /projects                         |      Yes      |           Any            |
| /admin/apps/sharkly               |    Shopify    |           Any            |

---

## PAGE COUNT

| Section                   | Pages / Routes |
| ------------------------- | :------------: |
| Marketing site            |       10       |
| Auth                      |       5        |
| Onboarding                |  1 (5 steps)   |
| Dashboard                 |       1        |
| Strategy                  |       2        |
| Clusters (index + detail) |       2        |
| Workspace                 |       1        |
| Ecommerce SEO             |       2        |
| Performance               |       1        |
| Technical SEO             |       1        |
| CRO Studio (post-launch)  |       2        |
| Settings                  |       6        |
| Project settings          |       2        |
| Shopify embedded app      |       1        |
| **Total**                 |     **37**     |

---

_Sharkly — Shark Engine Optimization_
_"SEO made easy — for people who aren't SEO people."_

# Sharkly — Product Roadmap

## Authoritative build sequence from launch through V3

## Last updated: March 2026

---

## ⚠️ FOR CURSOR — READ THIS FIRST

**This is the correct roadmap file. Ignore `PRODUCT-ROADMAP-UPDATED.MD` — it is the old spec-format document and has been superseded by this file.**

**Strategy architecture — Targets (read this before touching anything in /strategy):**
The strategy layer uses a Targets architecture. `/strategy` is a Targets overview grid, not a flat topic list. Each Target has a name, a destination page URL, and a seed keyword set. Targets generate Topic Plans at `/strategy/:target_id`. Topics produce clusters. The old flat "Topics" screen is gone — everything is scoped under a Target. `destination_page_url` is set at the Target level and inherited by all clusters under that Target. Do not build or reference a flat `/strategy` topic list anywhere.

**What's already built:** See the `CURRENT STATE` section immediately below. Everything in the ✅ list is confirmed working in the codebase. Do not rebuild these.

**Where to start:** Jump to `## LAUNCH — Builder + Growth Tiers` and begin at `L1`. Work through L1–L5 in order. These are the 12 things that must be built before Shopify app store submission.

**Partially built (needs completing, not rebuilding):**

- 🔶 CRO Studio — `cro_audits` table + audit backend not yet built (this is L1 — see updated spec)
- 🔶 Shopify companion app — OAuth + embedded UI needed (this is L6)
- 🔶 Content calendar — shell exists, leave for V2, don't touch
- 🔶 Usage analytics chart — leave for post-launch

**Do not build anything in Post-Launch Sprint 1, Sprint 2, V2, or V3 until all L1–L5 items are complete and working.**

---

## How to Read This Document

Features are organized by release phase. Each phase maps to a specific tier in the pricing catalog.
The launch phase represents what must be built before the Shopify app store submission.
Post-launch sprints fill out the tiers to their full catalog promise.
V2 and beyond expand the product into new capability areas.

**Source documents referenced:**

- `cro-studio.md` — CRO Studio full spec (covers both SEO page light CRO and destination page full CRO — replaces system-1-cro-layer.md and system-2-cro-product.md which are deleted)
- `cluster-intelligence-layer.md` — 7-warning cluster audit system
- `architecture-b-downstream-product-page.md` — Destination page data model
- `reverse-silo-architecture.md` — Linking architecture + nav/footer dilution
- `funnel-visualizer.md` — Customer journey map UI spec
- `product-gaps-master.md` — 34-item gap register

---

## CURRENT STATE (Pre-Launch Alpha)

### Already Built and Working

```
✅ Onboarding, site setup, competitor input, DA estimation
✅ Topic strategy engine — now Targets architecture (/strategy → Targets overview → /strategy/:target_id → Topic Plan)
✅ Focus page briefs + article generation (UPSA scoring, word count targeting)
✅ Tiptap editor with auto-save
✅ Cluster creation + React Flow map + funnel tagging + health bar
✅ Credit system (balance, check, deduction, display, warnings)
✅ Brand voice settings, user profile, AI insight blocks
✅ Multi-site support + switcher
✅ Dashboard, strategy keywords view (keywords table on /strategy — spans all Targets)
✅ Keyword lookup modal
✅ Meta title/description sidebar
✅ Section rewrite, FAQ generation
✅ Internal link engine + suggestions tab
✅ Google Search Console OAuth + data sync
✅ Rankings dashboard, Navboost score, CTR optimization modal
✅ Technical audit (crawler, issues list, detection types)
✅ Stripe billing, upgrade flow, overage credits
✅ Settings — brand voice, notifications, integrations, team invites, billing
✅ Loading step sequences, AI next action suggestions
```

### Partially Built

```
🔶 CRO Studio — cro_audits table + audit backend not yet built. Workspace CRO tab skeleton exists but is being removed (CRO now lives in CRO Studio only — see cro-studio.md)
🔶 Content calendar — shell exists, no functionality
🔶 Shopify companion app — OAuth + embedded UI needed
🔶 Usage analytics chart — table exists, chart missing
```

---

---

## LAUNCH — Builder + Growth Tiers

### What must be complete before Shopify app store submission.

---

### BUILDER TIER GAPS (must ship at launch)

#### L1. CRO Studio — Live Page Audit Tool

**Spec:** `cro-studio.md` — single source of truth. `system-1-cro-layer.md` and `system-2-cro-product.md` are deleted.
**What it is:** A live URL audit tool for two page types — SEO pages (focus pages + articles, light CRO) and destination pages (product/service/signup pages, full CRO). Fetches rendered HTML via URL fetch. Completely separate from the Workspace. The Workspace CRO tab skeleton is removed as part of this build.
**Tier:** CRO Add-on ($29/month, any plan) — post-launch
**Key architectural decisions:**

- CRO Studio audits live pages only — it reads rendered HTML, not Tiptap content
- SEO pages get a 5-item light CRO audit focused on destination handoff and CTA fit
- Destination pages get the full 10-step Optimal Selling Journey audit + cognitive bias inventory
- The critical handoff check: first in-body link in first 400 words must be the destination URL
- Entry from Workspace via "Optimize CRO" button (context pre-filled) or standalone URL entry

**Build order from spec:**

1. DB migration — `cro_audits` table
2. `fetchAndParseURL()` utility
3. `checkDestinationHandoff()` — first-link-in-400-words
4. `evaluateSEOPageCRO()` — 5-item SEO page checklist
5. `evaluateOptimalSellingJourney()` — 10-step destination page audit
6. `detectArchitectureSequence()` — structural violation checks
7. `detectCognitiveBiases()` — 11-bias inventory
8. `runCROAudit()` orchestrator
9. AI fix generation endpoint (two prompts — SEO page / destination page)
10. Frontend — nav item with gate, home screen (two tabs), Add Page modal
11. Frontend — SEO page audit view
12. Frontend — Destination page audit view
13. Frontend — Generated fixes panel (inline, copy-to-clipboard)
14. Frontend — "Optimize CRO" button in Workspace
15. Frontend — "Open in CRO Studio" wiring from Cluster Detail
16. Remove Workspace CRO tab skeleton

---

#### L2. Schema Markup Generator ✅

**What it is:** JSON-LD schema generation for Article, FAQ, Product, LocalBusiness, and BreadcrumbList types. Copy-paste ready output.
**Tier:** Builder (all plans)
**Status:** Not built. Simple JSON-LD template generation — low complexity.
**Build:** Template functions per schema type, triggered by page_type. Output as formatted JSON-LD in a copyable code block in the workspace sidebar.

---

#### L3. Destination Page Field on Targets ✅

**Spec:** `architecture-b-downstream-product-page.md`
**What it is:** `destination_page_url` and `destination_page_label` live on the **targets table**, not the clusters table. A Target represents a business objective — a product, service, or area the user wants to rank for — and its destination is the page they want visitors to end up on. All clusters under that Target automatically serve that destination. There is no per-cluster destination field.
**Tier:** Builder (all plans)
**DB migration:**

```sql
-- On the targets table (created as part of the Targets architecture)
ALTER TABLE targets ADD COLUMN destination_page_url text;
ALTER TABLE targets ADD COLUMN destination_page_label text;
```

**UI:** Set during Target creation (`/strategy` → Add Target modal):

- Step 1 of Add Target: target name + seed keywords
- Step 2: "What page do you want visitors to end up on?" — destination URL + label (e.g. "Hydrating Moisturizer Collection")
- Skip option — destination can be added later via Edit Target
- All clusters created under this Target inherit the destination automatically. No destination field on individual clusters.

**Downstream behavior (no separate feature needed):**
Once the destination is set on a Target, two things happen automatically as part of existing systems:

- **Internal link engine** — when generating link suggestions for a cluster's focus page, includes one outbound link to `target.destination_page_url` as part of the standard suggestion set. The focus page is always the bridge: ToFu articles → focus page → destination. This is the reverse silo in practice.
- **Focus page brief + content generation** — destination URL and label are injected into the generation prompt so the AI knows to include a natural contextual link to the destination page within the focus page content.

---

#### L4. Customer Journey Map (Funnel Visualizer — Simplified Launch Version) ✅

**Spec:** `funnel-visualizer.md`
**What it is:** Three-column visual layout showing pages at their funnel stage (Awareness / Consideration / Decision), GSC data per page card, destination page node at bottom.
**Tier:** Builder (all plans)
**Launch scope (simplified):**

- Three-column layout with page cards
- UPSA and CRO scores on cards
- GSC impressions/clicks per card (once Growth tier wired)
- Destination page card — locked state for base, unlocked with CRO add-on
- Basic traffic flow arrow from anchor to destination
- Warning 7 red banner (BoFu focus page detection)
  **Defer to post-launch:** Full subscription gating animations, personalised upsell copy with click volumes, full cluster intelligence banners in visualizer
  **Build order:** From `funnel-visualizer.md` steps 1-10. Steps 11-13 post-launch.

---

#### L5. Weekly Priority Stack ✅

**What it is:** Data-driven personalised task list generated from the user's actual UPSA scores, GSC data (Growth+), cluster intelligence warnings, and re-optimization queue. Shown every time the user opens Sharkly.
**Tier:** Builder (all plans — base version uses UPSA + cluster warnings. Full version uses GSC data on Growth+)
**Build:** Read existing data sources, rank by revenue impact, format as prioritised list with direct action buttons. Categories: High Impact (red), Medium Impact (amber), Keep Going (green). Maximum 6 items. Updates on each page load.

---

#### L6. Shopify Companion App

**Spec:** Shopify App Bridge embedded UI inside Shopify Admin.
**What it is:** A minimal embedded panel inside Shopify Admin with one job — connect the merchant's Shopify store to their Sharkly account via OAuth and send them to Sharkly to do everything else. Also serves as a Shopify App Store discovery channel for new users.
**Tier:** Builder (all plans)
**This is non-negotiable for Shopify app store launch.** Everything else can be imperfect. This cannot.

**Status:**

- ✅ OAuth flow built
- ✅ Shopify Admin API (blogs, articles, products, collections)
- 🔶 Embedded UI (App Bridge) — still needed for app store submission

---

**What the embedded app does:**

Nothing except OAuth connection and a link to Sharkly. All SEO work, content generation, publishing, and ecommerce SEO happens inside app.sharkly.co — not here.

**Embedded UI — two states only:**

**Not connected:**

> Connect your Shopify store to Sharkly to start optimizing your content and product pages.
>
> `[Connect to Sharkly]` — triggers OAuth, stores access token, redirects to app.sharkly.co

**Connected:**

> Your store is connected to Sharkly.
> [store-name].myshopify.com · Connected as [account email]
>
> `[Open Sharkly →]` — opens app.sharkly.co in new tab
>
> Small text: "All SEO tools, content generation, and publishing are done from the Sharkly dashboard."

That's the entire embedded UI. No queues, no scores, no editor, no dashboard.

---

**App Store discovery flow (new users):**

Merchant finds Sharkly on App Store → installs → embedded app loads → "Connect to Sharkly" → two paths:

- **Has Sharkly account:** OAuth flow → store connects to existing account → redirect to app.sharkly.co/dashboard
- **No Sharkly account:** OAuth initiates → redirects to sharkly.co/signup?shopify_store={store_domain} → signup form → account created → OAuth completes automatically → redirect to app.sharkly.co/dashboard with store already connected

The `shopify_store` param on signup pre-fills the store URL and auto-completes OAuth after account creation so the merchant never has to manually enter their store or connect again.

---

**App Bridge technical requirements (for app store review):**

- `@shopify/app-bridge-react` — session token authentication, not cookie-based
- Polaris design system — matches Shopify Admin visually (minimal components needed given the simple UI)
- No external redirects without App Bridge navigation API

**GDPR webhooks — required by Shopify or the app will be rejected:**

- `POST /webhooks/shopify/customers-redact` — Sharkly stores no customer data, respond 200
- `POST /webhooks/shopify/shop-redact` — fires on uninstall, clear `shopify_access_token` and `shopify_store_domain` from sites table
- `POST /webhooks/shopify/customers-data-request` — respond with what is stored: store domain + access token only, no customer PII

**Uninstall webhook:** On `app/uninstalled` — null out `shopify_access_token`, `shopify_store_domain`, `shopify_connected_at` on the sites record. Do not delete the site or any content.

---

**Remaining build:**

1. App Bridge setup — `@shopify/app-bridge-react`, session token auth
2. Two-state embedded UI — not connected / connected + Open Sharkly
3. OAuth completion → store token saved to sites table
4. Signup flow — `?shopify_store=` param handling + auto-OAuth after account creation
5. GDPR webhook endpoints — all three, respond correctly
6. Uninstall webhook — clear tokens, preserve site data
7. App Store listing — icon, screenshots, description copy

---

UPDATES

#### L6. Shopify Companion App

**What it is:** Minimal embedded panel inside Shopify Admin — OAuth connection
and a link to Sharkly. All SEO work happens in app.sharkly.co. Also serves as
a Shopify App Store discovery channel.
**Tier:** Builder (all plans)
**This is non-negotiable for app store submission.**

**Status:**

- ✅ OAuth flow built
- ✅ Uninstall webhook (tokens cleared)
- ✅ REST → GraphQL migration (all Shopify API calls use GraphQL Admin API)
- ✅ App Bridge embedded UI (script + session token support, Polaris two-state UI)
- ✅ GDPR webhooks (customers/redact, shop/redact, customers/data_request)
- ✅ signup?shopify_store= param (auto-OAuth after account creation)
- 🔶 App listing assets (icon, screenshots, screencast, privacy policy, help docs)

**Embedded UI — two states only:**

Not connected:

> Connect your Shopify store to Sharkly.
> [Connect to Sharkly] — OAuth flow → tokens saved → redirect to app.sharkly.co

Connected:

> [store].myshopify.com · Connected as [email]
> [Open Sharkly →]

**Discovery flow (new users from App Store):**
Install → embedded app → Connect → no account: redirect to
sharkly.co/signup?shopify_store={domain} → signup → OAuth completes
automatically → lands in Sharkly with store connected.

**Remaining build — in order:**

1. App listing: 1200×1200 icon, screenshots, English screencast,
   privacy policy URL, help docs, 5 search terms
2. Partner Dashboard: emergency contact email + phone; register webhook URLs; set App URL to embed
3. Test credentials: provide Sharkly account with credits for reviewers

**Not needed:**

- Theme extension — Sharkly doesn't inject into the storefront
- Deep linking — no theme blocks to activate
- Billing API — keep subscriptions on Stripe/Sharkly, app is free to install
- Protected customer data — Sharkly stores no customer PII

---

#### L6b. Ecommerce SEO

**Spec:** `ecommerce-seo-spec.md`
**What it is:** Lightweight ecommerce SEO feature area. Product and collection page keyword assignment, basic on-page SEO checks, description generation, schema output, and publish-back to Shopify. Shopify is the CMS — Sharkly handles the SEO layer on top.
**Tier:** Builder and above — all plans
**Status:** Spec complete. Not yet started. Build after L6 Shopify OAuth is stable.

**This feature is isolated.** No changes to Workspace.tsx, pages.ts, or any existing controller. New files only.

**New files:**

- `sql/migrations/ecommerce_pages.sql`
- `api/src/controllers/ecommerce.ts`
- `api/src/routes/ecommerce.ts`
- `src/pages/Ecommerce.tsx`
- `src/pages/EcommerceWorkspace.tsx`

**DB:** New `ecommerce_pages` table. Target connection uses existing `targets.destination_page_url` field — no schema change.

**Build order (14 steps — see spec):**

1. DB migration
2. API controller — 6 endpoints
3. API routes + register in app.ts
4. `/ecommerce` hub — list, tabs, table, modals
5. `/ecommerce/:id` workspace — editor, keyword assignment, schema block
6. SEO checks right panel (6 checks)
7. Publish modal + Shopify API calls
8. Sidebar nav item + React Router routes
9. Product/Collection badge in Target detail view

**Credit costs:** SERP check = 5, product description = 10, collection intro = 10, import/publish/re-check = free

**Key design decisions:**

- Nav item always visible — no platform gating. Empty state handles onboarding.
- Products and collections are destination pages — attaching one to a Target writes the URL to `targets.destination_page_url`
- Six basic SEO checks only — same level as supporting articles, not UPSA
- Shopify publish writes `body_html` + `global.title_tag` + `global.description_tag` metafields
- WooCommerce: V2

---

#### L7. Author / EEAT Field on Projects ✅

**Spec:** `product-gaps-master.md` — B1
**What it is:** Default author bio at the project level, with a per-brief override
at generation time. Project default covers solo operators. Per-brief override covers
multi-author businesses without building a full author management system.
**Tier:** Builder (all plans)

**DB:**

```sql
ALTER TABLE projects ADD COLUMN author_bio text;
ALTER TABLE pages ADD COLUMN author_bio_override text;
```

**Resolution logic:**

```javascript
const authorContext = page.author_bio_override ?? project.author_bio ?? null;
```

**UI — Project Settings:** "Who is the expert behind this content?" under Content
Voice section. Helper text explains it can be changed per article.

**UI — Brief generation:** Author field pre-fills from project.author_bio, editable
inline before generation. If changed, saves to pages.author_bio_override for that
page only.

**Build:** Two DB fields + resolution logic + prompt injection + two UI touch points.
Still a small build. Disproportionate quality impact on every article generated.

---

#### L8. URL Slug Change Warning ✅

**Spec:** `product-gaps-master.md` — B3
**What it is:** Hard warning (requires typed confirmation "CHANGE URL") when user edits the URL of a published page with ranking data.
**Tier:** Builder (all plans)
**Build:** Trigger on published_url field edit when page.status === 'published'. Modal with explanation of historical trust destruction. Typed confirmation required.

---

#### L9. AI Detection Education Tooltip ✅

**Spec:** `product-gaps-master.md` — B2
**What it is:** Persistent info card near content output explaining that AI detection flags don't affect Google rankings.
**Tier:** Builder (all plans)
**Build:** UI copy decision. Info card component near content output. Dismissable, persistent on first view. 20 minutes to implement.

---

### GROWTH TIER GAPS (must ship at launch)

#### L10. Page-Level GSC Attribution in Workspace ✅

**What it is:** Impressions, clicks, CTR, and average position shown per individual page inside the workspace. Currently GSC data is connected but not wired to individual page views.
**Tier:** Growth (and above)
**Build:** Read from existing GSC sync, match by URL, display in workspace sidebar. Data is already there — just needs wiring to the page-level UI.

---

#### L11. Re-Optimization Queue ✅

**What it is:** Identifies pages ranking in positions 4-15 with UPSA score below 85. Prioritised list with "fix this" action linking directly to the workspace for that page.
**Tier:** Growth (and above)
**Build:** Query pages WHERE gsc_position BETWEEN 4 AND 15 AND upsa_score < 85. Sort by impression volume (highest impact first). Display as queue in Performance screen and in Weekly Priority Stack. "Open in Workspace" action per item.

---

#### L12. Cluster Architecture Warnings (Warnings 1-4) ✅

**Spec:** `cluster-intelligence-layer.md`
**What it is:** The first four cluster intelligence warnings — over-linking to money pages, missing reverse silo connections, funnel stage imbalance, external equity leakage.
**Tier:** Growth (and above)
**Launch scope:** Warnings 1-4 only. Warnings 5-7 post-launch.
**Build:** From `cluster-intelligence-layer.md` detection functions 1-4. Wire to cluster detail view intelligence panel. Connect top 2 warnings to funnel visualizer banner.

---

### LAUNCH DEFER — Scale and Pro

**Scale tier ships at launch with what's already built:**

- Full site technical audit ✅
- Broken link scanner ✅
- Image SEO scanner ✅
- Core Web Vitals monitoring ✅
- H2 passage quality checker ✅
- Information gain checker ✅ (IGS issues now wired to Technical UI)
- Weekly site health monitoring ⚠️ (not implemented — no cron for weekly re-crawl; manual crawl only)

**New Scale features (post-launch Sprint 1) — labeled "coming soon" at launch:**
Content health additions, link health additions, EEAT audit, brand search tracker expansion

**Pro tier:** Waitlist only at launch. "For agencies and professionals — join the waitlist."

**CRO Add-on:** Waitlist only at launch. "Coming soon — join the waitlist."

---

---

## POST-LAUNCH SPRINT 1 (~6 weeks after launch)

### Complete the Scale Tier

#### S1-1. Content Refresh Queue ✅

**Spec:** `product-gaps-master.md` — V1.6
**Tier:** Scale
**Build:** Detect pages where last_updated_meaningful > 6 months AND GSC position trending down. "Refresh Queue" section in Performance screen with "Refresh" action → workspace. Targeted refresh brief generation (re-run SERP, surgical additions) — future enhancement.

---

#### S1-3. EEAT Scored Checklist ✅

**Spec:** `product-gaps-master.md` — V1.1
**Tier:** Scale
**DB:** `sites.eeat_score`, `sites.eeat_checklist`, `crawl_history.crawled_urls` (see `2026-03-10_eeat_s1_3.sql`)

**Build:** 10-item checklist across all four EEAT dimensions. Detection functions per item. Trust & Authority panel in Technical SEO screen. Each failing item has one plain-English fix. Evaluated automatically after crawl; re-evaluate on demand. Items `expert_vocabulary_present`, `first_hand_signals`, `third_party_reviews_linked`, `citations_to_sources` skipped (require entity/IGS/review data — coming soon).

---

#### S1-4. Author + Expertise Schema (Person Schema) ✅

**Spec:** `product-gaps-master.md` — V1.4a
**Tier:** Scale
**Build:** Person schema JSON-LD on article pages with name + description (author_bio). Embedded in Article schema as "author" property. Reads from `page.author_bio_override ?? site.author_bio`. sameAs ready when S1-5 adds profile URLs.

---

#### S1-5. AggregateRating + sameAs Schema ✅

**Spec:** `product-gaps-master.md` — V1.4b, V1.4c
**Tier:** Scale
**DB:** `sites.google_review_count`, `google_average_rating`, `gbp_url`, `facebook_url`, `linkedin_url`, `twitter_url`, `yelp_url`, `wikidata_url` (see `2026-03-10_aggregate_rating_same_as_s1_5.sql`)

**Build:** AggregateRating on LocalBusiness when review count + rating set. sameAs on LocalBusiness from business profiles. "Your business profiles" section in Site Settings. MetaSidebar + Schema Generator both output full LocalBusiness with these fields.

---

#### S1-6. YMYL Niche Detection ✅

**Spec:** `product-gaps-master.md` — V1.4d
**Tier:** Scale
**Build:** Niche classifier (law, medical, financial, health, etc.) sets `sites.is_ymyl`. Flag in Site Settings when YMYL. Article generation gets YMYL prompt block (cite sources, credentials, disclaimers). EEAT panel shows YMYL notice when stricter requirements apply.

---

#### S1-7. Toxic Link Detection + Disavow ✅

**Spec:** `product-gaps-master.md` — V2.3 (pulled forward to Scale)
**Tier:** Scale
**Build:** Backlink quality audit via DataForSEO/Moz. Score each referring domain. Flag toxic links with explanation. Generate disavow file in Google's format. "These 8 links may be hurting your authority — here's the file to submit to Google."

---

#### S1-8. Internal Link Gap Analysis ✅

**Spec:** `product-gaps-master.md` — V1 list item
**Tier:** Scale
**Build:** Map entire internal link structure across all pages in a project. Identify: articles with no link to focus page, focus pages with no link to destination, clusters with broken link chains. Prioritised gap list with direct fix actions.

---

#### S1-9. Nav + Footer Dilution Warning ✅

**Spec:** `reverse-silo-architecture.md`
**Tier:** Scale
**Build:** Detect total nav link count on crawled pages. Apply equity multiplier formula (nav = 0.30x, footer = 0.15x). Fire site-level warning when nav overhead exceeds threshold. Shopify-specific recommendation for mega-menu stores.

---

#### S1-10. Brand Search Signal Tracker (Full) ✅

**Tier:** Scale
**Build:** Track branded search volume from GSC. Calculate ratio against backlink growth rate. Fire warning when links growing 3x faster than brand searches. Display trend chart. Connect to EEAT checklist as authoritativeness signal.

---

#### S1-11. Cluster Architecture Warnings 5-7 ✅

**Spec:** `cluster-intelligence-layer.md`
**Tier:** Growth (extends L12)
**Build:** Warning 5 (orphaned product page), Warning 6 (cluster-wide funnel mismatch), Warning 7 (BoFu focus page — the red banner). Wire Warning 7 to funnel visualizer as full-width red banner. Implemented in clusterIntelligence service + FunnelVisualizer.

---

### Launch CRO Add-On

#### S1-12. CRO Studio + System 2 Full Audit

**Spec:** `cro-studio.md`, `system-2-cro-product.md`
**Tier:** CRO Add-on ($29/month, any plan)
**Build order from specs:**

1. Add CRO Studio to main navigation — gated by subscription
2. CRO Studio home screen — destination pages list
3. Individual destination page view — CRO score header
4. Wire System 2 audit functions (5 audit dimensions)
5. Audit report display — critical/improvements/strong
6. Generated fixes panel — inline expansion, copy-to-clipboard
7. Page architecture issues section (shows first)
8. URL fetch for live page content
9. Credits consumption per action
10. Subscription gate — locked nav + upgrade modal
11. Connect destination page cards in funnel visualizer to CRO Studio routes
12. Funnel visualizer full subscription gating (locked destination card with personalised upsell copy)

---

---

## POST-LAUNCH SPRINT 2 (~3 months after launch)

### V1 Technical + Scoring Depth

#### S2-1. H2 Contamination Penalty — UPSA Scoring Fix ✅

**Spec:** `product-gaps-master.md` — V1.2b
**Tier:** All plans (UPSA correction)
**Status:** Done.
**Build:** Change UPSA Module 3 from additive-only to bidirectional. Penalize pages where <30% of H2s are passage-ready. This is a scoring fix, not a new feature — but it changes scores across all existing pages.

---

#### S2-2. Keyword Density Penalty — UPSA Scoring Fix ✅

**Spec:** `product-gaps-master.md` — V1.2e
**Tier:** All plans (UPSA correction)
**Status:** Done.
**Build:** Add bidirectional density scoring. Above 3% density = -5 pts + `keyword_stuffing` audit issue. Add density indicator to workspace with plain-English guidance.

---

#### S2-3. Keyword Cannibalization Detection ✅

**Spec:** `product-gaps-master.md` — V1.2a
**Tier:** Growth (cluster intelligence layer)
**Status:** Done.
**Build:** `normalizeKeyword()` comparison across all pages in project. Fires in cluster intelligence panel and strategy screen when adding new keyword. "2 pages are competing for the same keyword — consolidate or differentiate."

---

#### S2-4. IGS Domain-Level Consequence Warning ✅

**Spec:** `product-gaps-master.md` — V1.2c
**Tier:** Scale
**Status:** Done.
**Build:** (1) Pre-generation warning when IGS opportunity field is empty. (2) Site-level IGS health indicator in technical audit — ratio of low-IGS published pages to total.

---

#### S2-5. Topical Dilution Warning ✅

**Spec:** `product-gaps-master.md` — V1.2d
**Tier:** Growth
**Status:** Done.
**Build:** Entity overlap check when user adds new topic to strategy. <20% overlap with existing content = amber warning. Confirmable — user can proceed but must acknowledge.

---

#### S2-6. Brand Search Ratio Correction ✅

**Spec:** `product-gaps-master.md` — V1.2f
**Tier:** Growth (correction to existing Brand Search Panel)
**Status:** Done.
**Build:** Add ratio indicator. Warning when backlinks growing 3x faster than branded searches. Reframe panel around ratio health, not just growth.

---

#### S2-7. Crawl Budget Waste Detection ✅

**Spec:** `product-gaps-master.md` — V1.2g
**Tier:** Scale
**Status:** Done.
**Build:** Detect tag pages, author archives, paginated archives, parameter duplicates in crawl results. New issue types: `thin_tag_pages`, `author_archive_pages`, `pagination_waste`, `parameter_duplicates`. noindex recommendations with plain-English explanation.

---

#### S2-8. Redirect Chain Depth Detection ✅

**Spec:** `product-gaps-master.md` — V1.3a
**Tier:** Scale
**Status:** Done.
**Build:** Detection function in crawler. Issues flagged at >2 hops. Plain-English: "A 4-step redirect was found. Shorten this to a direct redirect."

---

#### S2-9. Mobile-First Indexing Check ✅

**Spec:** `product-gaps-master.md` — V1.3b
**Tier:** Scale
**Status:** Done.
**Build:** Check viewport meta, hidden content, touch target sizes, horizontal scroll. New issue types added to technical audit.

---

#### S2-10. Duplicate Title + Meta Detection Sitewide ✅

**Spec:** `product-gaps-master.md` — V1.3c
**Tier:** Scale
**Status:** Done.
**Build:** `detectDuplicateTitles()` and `detectDuplicateMetas()` across all crawled pages. Issue types: `duplicate_title_tag`, `duplicate_meta_description`. "These 3 pages share the same title — Google can't tell them apart."

---

#### S2-11. Pagination Canonical Tag Check ✅

**Spec:** `product-gaps-master.md` — V1.3d
**Tier:** Scale
**Status:** Done.
**Build:** Detect paginated pages without canonical tags. Critical for Shopify collection pages with large product ranges.

---

#### S2-12. Image Optimization Audit (Full) ✅

**Spec:** `product-gaps-master.md` — V1.3e
**Tier:** Scale
**Status:** Done.
**Build:** WebP format check, LCP preload check, above-fold lazy-load check. Extends existing image SEO scanner.

---

#### S2-13. Intrusive Interstitial Detection ✅

**Spec:** `product-gaps-master.md` — V1.3g
**Tier:** Scale
**Status:** Done.
**Build:** Detect viewport-covering overlays excluding cookie consent and legally required gates. Issue type: `intrusive_interstitial`.

---

#### S2-14. Link Velocity Monitoring ✅

**Spec:** `product-gaps-master.md` — V1.3h
**Tier:** Scale
**Status:** Done.
**Build:** Monthly referring domain growth rate. Warning when current month >5x historical average AND >20 new domains. Via DataForSEO/Moz. Lives in backlink section of technical SEO screen.

---

#### S2-15. SEO Decision Tree — "Diagnose This Page" ✅

**Spec:** `product-gaps-master.md` — V1.5
**Tier:** Growth
**Status:** Done.
**Build:** 7-step diagnostic flow triggered by "Diagnose This Page" button in workspace. Reads GSC + UPSA + audit data. Outputs one primary diagnosis + first action. Steps: indexation → ranking position → intent match → content quality → domain authority → CTR signals → GroupModificationFactor.

---

#### S2-16. Publishing Cadence Guidance ✅

**Spec:** `product-gaps-master.md` — O3
**Tier:** Builder (all plans)
**Status:** Done.
**Build:** Simple recommended cadence display based on growth stage. Track whether user is hitting it. Surface in Weekly Priority Stack.

---

#### S2-17. Laws of SEO — Contextual Education ✅

**Spec:** `product-gaps-master.md` — O1
**Tier:** All plans (ongoing)
**Status:** Done.
**Build:** 8 Laws surfaced as contextual tooltips at relevant product moments. Not a glossary. Each law appears where the feature it explains is being used.

---

### Launch Pro Tier

#### S2-18. White-Label PDF Reports

**Tier:** Pro
**Build:** PDF generation for strategy reports, cluster summaries, performance reports. User logo + branding. Via existing PDF generation infrastructure.

---

#### S2-19. Multi-Site Management Dashboard

**Tier:** Pro
**Build:** Cross-project dashboard showing all sites in one view. Aggregate health indicators. Quick-switch with context preservation.

---

#### S2-20. Competitor Content Monitoring

**Tier:** Pro
**Build:** Monitor competitor domains for new content targeting tracked keywords. Alert when competitor publishes on a keyword in the user's strategy. "Your competitor just published on 'best ecommerce platform for SEO' — a keyword in your strategy."

---

#### S2-21. Content Gap Reports

**Tier:** Pro
**Build:** Keywords competitors rank for that user has zero content for. Prioritized by opportunity score. One-click "Create cluster for this keyword."

---

#### S2-22. Revenue Attribution (GA4)

**Tier:** Pro
**Build:** GA4 connection. Map organic sessions to conversion events. Show which articles and focus pages are generating actual sales. The number that justifies the entire SEO investment.

---

### Funnel Visualizer — Full Spec

**Spec:** `funnel-visualizer.md`
**Tier:** All plans
**Status:** On hold — core funnel (steps 1–10) shipped; steps 11–13 deferred.

**Done:** Steps 1–10 (funnel stage classification, three-column layout, page cards, destination locked/unlocked UI, GSC data on cards, traffic-flow arrow, cluster intelligence top-2 warnings, W7 BoFu red banner, empty states), Step 12 (Connect destination page prompt).

**Remaining when resumed:** Step 11 — full subscription gating with personalised upsell copy using actual GSC click volumes; Step 13 — React Flow tab restructure (funnel as default, "Link Architecture" as secondary tab).

---

---

## V2 (~6 months post-launch)

### New Capability Areas

#### V2.0. Seasonal Opportunity Detector

**Tier:** Scale
**Build:** Cross-reference existing content keywords against seasonal search trend data. Flag upcoming seasonal peaks 6-8 weeks ahead. Surface in Weekly Priority Stack for Scale users.

---

#### V2.1. JS Rendering Detection ✅

**Spec:** `product-gaps-master.md` — V1.3f
**Tier:** Scale
**Status:** Done.
**Build:** Compare raw HTML crawl vs rendered DOM (Playwright headless). Flag when rendered content is 2x+ larger than raw HTML. Issue type `js_rendered_content`. Max 10 headless checks per crawl. Critical for JS-heavy Shopify themes.

---

#### V2.2. Local SEO Module

**Spec:** `product-gaps-master.md` — V2.1
**Tier:** Potentially "Sharkly Local" as a distinct add-on or product tier
**Build:** GBP completeness score, NAP consistency checker, review velocity tracking, LocalBusiness schema validation, local keyword entity detection, Local Pack ranking tracker. Potentially a GeoGrid visibility map.

---

#### V2.3. Competitor Backlink Gap Analysis

**Spec:** `product-gaps-master.md` — V2.2
**Tier:** Pro or Scale
**Build:** Pull competitor backlink profiles. Find domains linking to 2+ competitors but not to user. Score by relevance + DA + link type. Export as prioritised outreach list.

---

#### V2.4. Digital PR / Linkable Asset Strategy

**Spec:** `product-gaps-master.md` — V2.4
**Tier:** Pro
**Build:** Content type classifier in strategy phase. Flag which topics could be elevated to linkable assets. "This topic would work well as original research — content like this earns 10-50x more links."

---

#### V2.5. Competitor DR Gap Diagnosis

**Spec:** `product-gaps-master.md` — V2.5
**Tier:** Growth
**Build:** Compare user DA vs median DA of top-5 ranking pages for target keyword. If gap >20 DR points: "Publishing more content won't get you there yet — you need more external links first." Surfaces in brief generation flow and keyword research.

---

#### V2.6. AI Chat Assistant with Function Calling ✅

**Tier:** Growth (base) / Scale (advanced)
**Build:** Conversational interface that can read project data, trigger audits, explain findings, suggest next actions. Function calling to existing Sharkly data and actions.

---

#### V2.7. Bulk Article Generation Queue

**Tier:** Scale / Pro
**Build:** Queue multiple article generations. Run overnight. Results ready in the morning. Credit consumption upfront with confirmation.

---

#### V2.8. WooCommerce Integration

**Tier:** Builder (all plans)
**Build:** OAuth connection, product/collection sync, blog publish. Matches Shopify integration feature parity.

---

#### V2.9. Content Calendar (Functional)

**Tier:** Growth
**Build:** Planned publish dates per article. Publishing cadence visualization. Overdue articles flagged. Calendar view with status indicators.

---

#### V2.10. Cluster Operations — Duplicate, Merge, Archive

**Tier:** Growth
**Build:** Duplicate a cluster as a template. Merge two clusters (combine pages, recalculate focus). Archive without deletion.

---

#### V2.11. Position History Graph

**Tier:** Growth
**Build:** 90-day position history chart per keyword. Algorithm update dates overlaid as vertical markers. "Your ranking dropped on March 5 — this aligns with a confirmed Google update."

---

#### V2.12. A/B Meta Title Testing

**Tier:** Scale
**Build:** Two meta title variants per page. Track CTR on each via GSC. Declare winner after statistical significance. Auto-apply winning variant.

---

---

## V3 (~12 months post-launch)

#### V3.1. Site-Level Architectural Intelligence

**Spec:** `product-gaps-master.md` — V3.1
**Tier:** Scale / Pro
**Note:** Data model must support inter-cluster relationships from V1 — add `parent_cluster_id` to clusters table early.
**Build:** Full site equity flow map. How clusters relate to each other. Which clusters feed which money pages. Site-wide topical authority coverage vs gaps. The "see your whole SEO system" view.

---

#### V3.2. Auto Content Refresh on Rank Drops

**Tier:** Scale
**Build:** When GSC detects a ranking decline on a published page, automatically generate a refresh brief and notify the user. "Your 'Shopify SEO Guide' dropped from position 3 to 7. We've prepared a refresh brief."

---

#### V3.3. ROI Calculator

**Tier:** Growth / Scale
**Build:** Estimate revenue impact of ranking improvements. Based on keyword search volume, estimated CTR at target position, site average conversion rate, average order value. "Getting this page from position 8 to position 3 is worth approximately $X/month."

---

#### V3.4. Webflow Integration

**Tier:** Builder (all plans)
**Build:** OAuth, CMS collection sync, publish. Third publishing integration after Shopify and WordPress.

---

#### V3.5. Zapier / Webhook Support

**Tier:** Pro
**Build:** Trigger Zapier workflows on Sharkly events — new article published, ranking drop, audit complete, credit threshold reached.

---

#### V3.6. Wikipedia / Wikidata Entity Guidance

**Spec:** `product-gaps-master.md` — V3.2
**Tier:** Scale
**Build:** Step-by-step guidance for establishing business entity in Wikidata. Surfaces in EEAT checklist as advanced trust signal.

---

#### V3.7. Keyword Velocity Progression Roadmap

**Spec:** `product-gaps-master.md` — V3.5
**Tier:** Growth
**Build:** Show user's current growth stage, what they need for the next stage, projected timeline. Based on existing growth stage detection function — extend to show the forward path.

---

#### V3.8. Scheduled Client Reports

**Tier:** Pro
**Build:** Automated weekly/monthly PDF reports sent to client email addresses. White-labeled. Includes performance data, completed actions, next priorities.

---

#### V3.9. Proactive Rank Drop Alerts + Algorithm Update Detection

**Tier:** Scale
**Build:** Real-time alerts when ranking drops exceed threshold. Algorithm update detection via correlation with industry-wide ranking volatility data. "A Google update appears to have rolled out — here's how it affected your site."

---

---

## FEATURE TIER REFERENCE

Complete map of every feature to its pricing tier.

| Feature                                                 | Tier           |
| ------------------------------------------------------- | -------------- |
| AI topic discovery                                      | Builder        |
| Priority roadmap                                        | Builder        |
| Authority scoring ("Can I rank for this?")              | Builder        |
| Competitor analysis (up to 3)                           | Builder        |
| Topic cluster planning                                  | Builder        |
| Visual topic map (React Flow)                           | Builder        |
| Customer journey map (funnel visualizer)                | Builder        |
| AI SEO anchor writer                                    | Builder        |
| AI article writer                                       | Builder        |
| SEO content briefs                                      | Builder        |
| Tiptap content editor                                   | Builder        |
| Real-time UPSA score (0-115)                            | Builder        |
| Skyscraper / IGS warning                                | Builder        |
| CRO Studio "Optimize CRO" entry from Workspace          | CRO Add-on     |
| Meta title + description generator                      | Builder        |
| Schema markup generator                                 | Builder        |
| FAQ section generator                                   | Builder        |
| Ecommerce SEO area (/ecommerce)                         | Builder        |
| Product description optimizer                           | Builder        |
| Collection page content generator                       | Builder        |
| Ecommerce SEO checks (6 basic checks per page)          | Builder        |
| Product/collection schema generation                    | Builder        |
| Shopify import (products + collections)                 | Builder        |
| Ecommerce bulk description generation                   | Builder        |
| Destination page field on targets (via Target creation) | Builder        |
| Shopify publishing                                      | Builder        |
| WordPress publishing                                    | Builder        |
| Copy + download export                                  | Builder        |
| Weekly priority stack                                   | Builder        |
| Brand voice settings                                    | Builder        |
| Author / EEAT field                                     | Builder        |
| URL slug change warning                                 | Builder        |
| AI detection education tooltip                          | Builder        |
| Publishing cadence guidance                             | Builder        |
| Laws of SEO contextual education                        | All plans      |
| GSC integration (OAuth, connect property to site)       | Builder        |
| Page-level GSC traffic data (Performance dashboard)     | Growth         |
| Keyword rankings dashboard (Rankings page)              | Growth         |
| Traffic chart                                           | Growth         |
| Position change alerts                                  | Growth         |
| AI performance analyst                                  | Growth         |
| CTR optimization (Navboost)                             | Growth         |
| Navboost momentum score                                 | Growth         |
| Re-optimization queue                                   | Growth         |
| Top performing pages                                    | Growth         |
| Internal link suggestions + placement                   | Growth         |
| Link status tracking                                    | Growth         |
| Cluster architecture warnings 1-4                       | Growth         |
| Cluster architecture warnings 5-7                       | Growth (S1)    |
| Keyword cannibalization detection                       | Growth (S2)    |
| Topical dilution warning                                | Growth (S2)    |
| Brand search ratio correction                           | Growth (S2)    |
| SEO decision tree ("Diagnose This Page")                | Growth (S2)    |
| Competitor DR gap diagnosis                             | Growth (V2)    |
| Content calendar                                        | Growth (V2)    |
| Cluster operations (duplicate, merge)                   | Growth (V2)    |
| Position history graph                                  | Growth (V2)    |
| Keyword velocity progression roadmap                    | Growth (V3)    |
| Full site technical audit                               | Scale          |
| Broken link scanner                                     | Scale          |
| Redirect problem finder                                 | Scale          |
| Canonical tag audit                                     | Scale          |
| Structured data checker                                 | Scale          |
| Duplicate title + meta detection                        | Scale          |
| Thin content finder                                     | Scale          |
| Missing titles + descriptions finder                    | Scale          |
| Weekly site health monitoring                           | Scale          |
| H2 passage quality checker                              | Scale          |
| Information gain checker                                | Scale          |
| Image SEO scanner                                       | Scale          |
| Core Web Vitals monitoring                              | Scale          |
| Content refresh queue                                   | Scale (S1)     |
| Seasonal opportunity detector                           | Scale (S1)     |
| EEAT scored checklist                                   | Scale (S1)     |
| Author + expertise schema (Person)                      | Scale (S1)     |
| AggregateRating + sameAs schema                         | Scale (S1)     |
| YMYL niche detection                                    | Scale (S1)     |
| Toxic link detection + disavow                          | Scale (S1)     |
| Internal link gap analysis                              | Scale (S1)     |
| Nav + footer dilution warning                           | Scale (S1)     |
| Brand search signal tracker (full)                      | Scale (S1)     |
| H2 contamination penalty fix (UPSA)                     | All plans (S2) |
| Keyword density penalty fix (UPSA)                      | All plans (S2) |
| IGS domain-level consequence warning                    | Scale (S2)     |
| Crawl budget waste detection                            | Scale (S2)     |
| Redirect chain depth detection                          | Scale (S2)     |
| Mobile-first indexing check                             | Scale (S2)     |
| Pagination canonical tag check                          | Scale (S2)     |
| Image optimization audit (full)                         | Scale (S2)     |
| Intrusive interstitial detection                        | Scale (S2)     |
| Link velocity monitoring                                | Scale (S2)     |
| JS rendering detection                                  | Scale (V2)     |
| Local SEO module                                        | Add-on / V2    |
| Competitor backlink gap analysis                        | Pro / V2       |
| Site-level architectural intelligence                   | Scale / V3     |
| Auto content refresh on rank drops                      | Scale / V3     |
| ROI calculator                                          | Growth / V3    |
| Wikipedia / Wikidata guidance                           | Scale / V3     |
| Keyword velocity roadmap                                | Growth / V3    |
| Proactive rank drop alerts                              | Scale / V3     |
| White-label PDF reports                                 | Pro (S2)       |
| Multi-site management dashboard                         | Pro (S2)       |
| Competitor content monitoring                           | Pro (S2)       |
| Content gap reports                                     | Pro (S2)       |
| Revenue attribution (GA4)                               | Pro (S2)       |
| Digital PR / linkable asset strategy                    | Pro (V2)       |
| Scheduled client reports                                | Pro (V3)       |
| Zapier / webhook support                                | Pro (V3)       |
| CRO Studio — SEO page audit (handoff + CTA fit)         | CRO Add-on     |
| CRO Studio — destination page full audit                | CRO Add-on     |
| 10-step Optimal Selling Journey audit                   | CRO Add-on     |
| Destination handoff check (first link in 400 words)     | CRO Add-on     |
| Exact copy fixes + placement instructions               | CRO Add-on     |
| Cognitive bias inventory (11 signals)                   | CRO Add-on     |
| Page architecture violation detection                   | CRO Add-on     |
| AI chat assistant                                       | V2             |
| Bulk article generation queue                           | V2             |
| WooCommerce integration                                 | V2             |
| A/B meta title testing                                  | V2             |
| Webflow integration                                     | V3             |

---

## BUILD SEQUENCE SUMMARY

```
LAUNCH (~8 weeks)
  L1.  System 1 CRO checklist
  L2.  Schema markup generator
  L3.  Destination page field on targets
  L4.  Customer journey map (simplified)
  L5.  Weekly priority stack
  L6.  Shopify companion app ← highest priority
  L6b. Ecommerce SEO feature area ← after L6 OAuth is stable
  L7.  Author / EEAT field
  L8.  URL slug change warning
  L9.  AI detection tooltip
  L10. Page-level GSC in workspace
  L11. Re-optimization queue
  L12. Cluster architecture warnings 1-4
```

---

_Sharkly — Shark Engine Optimization_
_Every feature grounded in Google patent research, the 2023 DOJ antitrust trial, and the 2024 Search API leak._

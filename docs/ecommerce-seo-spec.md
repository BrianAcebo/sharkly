# Sharkly — Ecommerce SEO Feature Spec

**Version:** 1.0 | **Last updated:** March 2026  
**Tier:** Builder and above — all plans  
**Platform:** Shopify first, WooCommerce V2

---

## ⚠️ FOR CURSOR — READ THIS FIRST

This is a **standalone feature area**. It does not touch the existing Workspace, pages.ts controller, clusters architecture, or any existing component. The ecommerce system has its own routes, its own controller (`ecommerce.ts`), its own DB table (`ecommerce_pages`), and its own React components. Reuse shared utilities only — do not modify them.

**Shared utilities to import (do not duplicate, do not modify):**
- `api/src/utils/competitorFetch.ts` — competitor page crawling + H2 extraction
- `api/src/utils/serper.ts` — SERP lookups
- `api/src/lib/supabase.ts` — DB client
- Tiptap editor component — reuse as-is
- `CreditBadge` component — reuse as-is

---

## What This Is

A lightweight ecommerce SEO feature area. It handles product and collection page SEO — keyword assignment, basic on-page checks, description generation, schema output, and publish-back to Shopify.

**Shopify is the CMS. Sharkly handles the SEO layer on top of it.**

Product and collection pages are destination URLs — the pages that topic clusters point to via the existing Target architecture. This feature makes that connection explicit, adds basic SEO health checks (same level as a supporting article, not UPSA), generates optimized descriptions, and publishes back to Shopify.

### Core workflow

1. **Import** products and collections from Shopify (or add manually)
2. **Assign a target keyword** to each product/collection
3. **Run basic SEO checks** — keyword in title, H1, URL, meta, schema, description originality
4. **Generate optimized description** — original copy, correct schema, competitor-informed
5. **Publish back to Shopify** (or copy HTML if no integration)

### What it is NOT

- Not a replacement for Shopify — Shopify stores and serves the content
- Not UPSA scoring — destination pages get basic checks only, same as supporting articles
- Not a brief/cluster system — no focus pages, no internal link engine for ecommerce pages
- Not analytics — GSC handles search performance; Shopify handles store performance
- Not overengineered — this is a feature addition, not a separate product

---

## Target Connection

Product and collection pages are destination URLs — exactly what the existing `targets.destination_page_url` field was designed for.

When a user attaches a product/collection to a Target in the ecommerce area, Sharkly writes the product URL to `targets.destination_page_url` on that Target record. No schema change — this field already exists.

The cluster's content strategy (focus page + supporting articles) points toward this product/collection as the conversion destination. The reverse silo architecture already handles the linking: articles → focus page → destination URL.

**In `/strategy/:target_id`:** The destination page pill already shows the URL. When that URL matches an `ecommerce_pages` record, add a small `Product ✓` or `Collection ✓` badge that links to `/ecommerce/:id`. No other changes to Target detail view.

---

## Routes

```
/ecommerce          — Hub: product + collection list
/ecommerce/:id      — Product or collection workspace
```

Add to sidebar nav between Clusters and Performance. Visible to all authenticated users with an active project — no platform gating.

---

## Database

### New table: `ecommerce_pages`

```sql
CREATE TABLE ecommerce_pages (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id               uuid REFERENCES sites(id) ON DELETE CASCADE,
  organization_id       uuid REFERENCES organizations(id) ON DELETE CASCADE,
  type                  text NOT NULL,        -- 'product' | 'collection'
  name                  text NOT NULL,
  keyword               text,                 -- assigned target keyword
  url                   text,                 -- live page URL for crawl checks
  existing_content      text,                 -- imported or pasted existing description
  content               jsonb,                -- Tiptap JSON (generated output)
  schema_json           text,                 -- generated JSON-LD
  word_count            integer DEFAULT 0,
  meta_title            text,
  meta_description      text,
  seo_checks            jsonb,                -- stored results of the 6 SEO checks
  status                text DEFAULT 'no_content', -- no_content | draft | published
  shopify_product_id    text,
  shopify_collection_id text,
  published_url         text,
  published_at          timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE ecommerce_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON ecommerce_pages
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));
```

### No other schema changes

The Target connection uses the existing `targets.destination_page_url` field. No new columns, no join tables.

---

## Shopify API Scopes Required

Collections are covered by `read_products` and `write_products`. The scopes `read_collections` and `write_collections` do not exist.

```
read_products        — pull product list, titles, descriptions, variants
write_products       — update product body_html and SEO metafields
read_content         — pull blogs, articles (for publish)
write_content        — create/update articles
```

### Data pulled from Shopify (only what is SEO-relevant)

| Field | Used for |
|---|---|
| `product.title` | Display name, keyword in title check |
| `product.body_html` | Existing description — rewrite target, duplicate content check |
| `product.handle` | URL slug — keyword in URL check |
| `product.variants` | Variant count — duplicate content warning if variants > 3 |
| `product.status` | Skip archived/draft in audit |
| `collection.title` | Display name |
| `collection.body_html` | Existing intro text |
| `collection.handle` | URL slug check |
| `collection.products_count` | Pagination canonical warning if > 50 |

**Not pulled:** Sales, revenue, orders, inventory, customer data, analytics. None of this is SEO-relevant.

---

## `/ecommerce` — Hub Screen

Full-width page. Same chrome as the rest of the app (sidebar, top nav).

### Header

- Page title: "Ecommerce"
- "Add Product" button (outline)
- "Add Collection" button (outline)
- "Import from Shopify" button (primary, cyan) — shown only when Shopify is connected

### Tabs

- **Products** (default)
- **Collections**

### Table columns (both tabs)

| Column | Content | Notes |
|---|---|---|
| Name | Product/collection name | Links to `/ecommerce/:id` |
| Keyword | Assigned target keyword | Editable inline |
| Target | Which Target this is the destination for | Dropdown from targets table |
| SEO Health | Pass/fail pill e.g. "4 / 6 passing" | Shown if URL is set |
| Status | No description / Draft / Published | Color-coded badge |
| Action | "Open" \| "Generate" \| "Publish" | Context-sensitive |

### Empty states

**No Shopify connected, no items:**
> Add your product and collection pages to check their basic SEO and generate optimized descriptions. You can add them manually or connect Shopify to import your store automatically.
> `[Add Product]` `[Add Collection]` `[Connect Shopify →]`

**Shopify connected, nothing imported yet:**
> Your Shopify store is connected. Import your products and collections to get started.
> `[Import from Shopify]` `[Add manually]`

### Bulk generation

User selects multiple rows via checkboxes. "Generate selected" button appears in a sticky bottom bar with credit cost ("Generate descriptions for 12 products — 120 credits"). Confirm before running. Jobs execute sequentially. Progress shown inline per row. Failed rows stay in error state — others continue.

---

## Add & Import Modals

### Add Product modal (manual)

- Product name (required)
- Product URL on their site (optional — needed for SEO crawl checks)
- Existing description (optional paste → stored as `existing_content`)
- Target selector (optional — can be set inside workspace)

Creates `ecommerce_pages` record with `type = 'product'`.

### Add Collection modal (manual)

- Collection name (required)
- Collection URL (optional)
- Existing intro text (optional paste)
- Target selector (optional)

### Import from Shopify modal

Two tabs: Products | Collections.

**Products tab:**
- Pulls top 250 products via `GET /products.json?limit=250`
- Checkbox list: product title, existing description length, collection it belongs to
- "Select all" toggle
- On import: creates `ecommerce_pages` record per product, stores `shopify_product_id`, pulls `body_html` into `existing_content`

**Collections tab:**
- Pulls all collections via `GET /collections.json`
- Checkbox list: collection title, product count, has existing intro text (yes/no)
- Collections with no intro text flagged with amber dot — highest priority

**Re-import behavior:** If a product/collection already has an `ecommerce_pages` record (matched by `shopify_product_id` or `shopify_collection_id`), re-import updates `existing_content` from Shopify but does not overwrite generated content or assigned keyword. Safe to re-import at any time.

---

## `/ecommerce/:id` — Workspace

Two-column layout. Left panel: main editor area (65%). Right panel: SEO checklist (35%).

### Left panel — header row

- Product/collection name — editable inline
- Keyword field — editable inline, required, prominent. Placeholder: "Set target keyword"
- Target selector — dropdown from `targets` table. Selecting a Target writes this page's URL to `targets.destination_page_url`
- "Publish to Shopify" button — primary (cyan), shown only when Shopify connected and content exists
- "Copy HTML" button — shown when no Shopify connected and content exists
- "Generate" button — 10 credits

### Keyword assignment block

Shown when no keyword is set. Inline above the description area.

```
What keyword should this page rank for?

[ keyword input field ]

[ Check SERP — 5 credits ]    [ Set manually — free ]
```

"Check SERP" runs a Serper search on the product name, returns top 3 keyword suggestions with monthly volume and difficulty. User selects one or types their own keyword. SERP check is optional.

### Description editor

**Before generation:**
- If `existing_content` is set: show in a read-only collapsible block labeled "Current description — will be rewritten"
- If no `existing_content`: show empty state with Generate button

**After generation:**
- Tiptap editor with generated content — same editor component as main workspace
- Same toolbar: Bold, Italic, H2, H3, Lists, Link
- Word count indicator: "387 / 400 words target" (products), "195 / 200 words target" (collections)
- Autosave — same behavior as workspace
- Existing description shown collapsed above editor labeled "Original — replaced"

### Schema block

Collapsible section below the editor. Generated alongside the description — user does not trigger it separately.

```json
// Product schema
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "...",
  "description": "...",
  "brand": { "@type": "Brand", "name": "..." },
  "offers": {
    "@type": "Offer",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}

// Collection schema
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "...",
  "description": "...",
  "url": "...",
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://store.com" },
      { "@type": "ListItem", "position": 2, "name": "Collection Name" }
    ]
  }
}
```

Copy-to-clipboard button. Instructions: "Paste this into your Shopify theme's `<head>` or use a script tag app."

---

## Right Panel — SEO Checks

Six basic checks. Run automatically when a URL is set and keyword is assigned. Results stored in `ecommerce_pages.seo_checks` (jsonb). "Re-check" button at top of panel re-runs on demand.

These are **not UPSA scores**. Product and collection pages are destination pages — they get the same basic optimization level as a supporting article per the dissertation (keyword in title weight 1.00, keyword in H1 weight 0.95, keyword in URL weight 0.85).

Each check shows: ✅ Pass | ❌ Fail | ⚠ Warning — with a plain-English explanation and fix instruction.

### Check 1 — Keyword in page title
- **Pass:** keyword (or close variant) found in the `<title>` tag. Crawled from the live URL.
- **Fail:** "Add your keyword to the page title. For Shopify products, edit the SEO title field under Search Engine Listing in the product editor."
- **Weight:** 1.00 (dissertation Section 5.1)

### Check 2 — Keyword in H1
- **Pass:** target keyword present in the page's H1. For Shopify, the product title IS the H1.
- **Fail:** "Your H1 doesn't contain the target keyword. For Shopify products, the product title becomes the H1 — update the product title."
- **Weight:** 0.95

### Check 3 — Keyword in URL slug
- **Pass:** keyword words present in the URL path (via `product.handle` for Shopify)
- **Fail:** "URL doesn't reflect your target keyword."
- **Warning (if GSC data shows impressions):** "This page has existing search rankings — changing the URL resets accumulated trust signals [US7346839B2]. Only change the slug for brand new pages."

### Check 4 — Meta description
- **Pass:** meta description exists, 150–160 characters
- **Fail:** "No meta description. Add one to improve click-through rate from search results."
- **Warning:** "Too short (X chars) / Too long (X chars)"

### Check 5 — Description originality
- **Pass:** generated/edited description is original
- **Fail:** "Your current description appears to be manufacturer copy — it likely appears on many other sites, which hurts rankings. Use the Generate button to create an original description."
- Detection: if `existing_content` is short (<100 words), identical to a known pattern, or matches common manufacturer copy patterns → flag it. No external API needed.

### Check 6 — Product/CollectionPage schema
- **Pass:** structured data detected in page source (crawled from URL)
- **Fail:** "No Product schema detected. Copy the JSON-LD block below and paste it into your Shopify theme, or use a schema app."

### Duplicate variants warning (products only — shown below the 6 checks)

Shown when Shopify is connected and `variant_count > 3`:

> ⚠ This product has [N] variants. If they share the same description, Google may treat them as duplicate pages. Consider adding canonical tags on variant URLs pointing to the main product URL.

### Pagination canonical warning (collections only — shown below the 6 checks)

Shown when `collection.products_count > 50`:

> ⚠ This collection has [N] products. Shopify generates paginated URLs (`?page=2`) and filter URLs that Google may treat as duplicate collection pages. Ensure your theme adds canonical tags pointing to the root collection URL.

---

## Generation

### Product description — 10 credits

**Endpoint:** `POST /api/ecommerce/:id/generate-product`

**Process:**
1. Run Serper search on `keyword`
2. Fetch top 3 competitor product pages via `competitorFetch` (same utility as main app)
3. Extract competitor H2s, word counts
4. Generate 350–400 word original description + Product schema

**Prompt:**

```
PAGE TYPE: Product Description

EXISTING DESCRIPTION TO REWRITE (do not copy — rewrite completely):
{existing_content}

DUPLICATE CONTENT RULE: Manufacturer descriptions appear on thousands of sites.
Every sentence must be completely original. Zero phrases from the existing
description should survive. This is an on-page ranking factor.

PRODUCT CONTEXT:
Product name: {name}
Target keyword: {keyword}
Business: {site_name} — {niche}
Brand tone: {tone}

COMPETITOR PRODUCT PAGES (identify entity gaps — do not copy structure):
{competitor_block}

REQUIREMENTS:
- Keyword in first sentence, naturally
- Lead with the single most important benefit, not a feature list
- Include 1–2 specific use cases ("ideal for X who need Y")
- 350–400 words. Do NOT exceed 440 words.
- No vague superlatives without backing ("amazing", "incredible")
- End with a benefit-summary sentence — no explicit CTA
- Output HTML only: <p>, <ul>, <li>, <strong> tags
```

### Collection intro — 10 credits

**Endpoint:** `POST /api/ecommerce/:id/generate-collection`

**Process:** Same Serper + competitorFetch flow. Analyzes competitor collection pages for the keyword.

**Prompt:**

```
PAGE TYPE: Collection Page Intro

COLLECTION CONTEXT:
Collection name: {name}
Target keyword: {keyword}
Business: {site_name} — {niche}
Brand tone: {tone}
Existing intro (rewrite if present, start fresh if empty):
{existing_content}

HARD LIMIT: 200 words maximum. This text appears above a product grid —
it must be concise and immediately useful.

REQUIREMENTS:
- Keyword in first sentence
- Mention 2–3 specific product types or use cases in this collection
- No generic "Welcome to our collection" openers
- No question H2s — this is not an article
- Suggest one internal link to a related collection using placeholder: [LINK: collection name]
- Output HTML only: <p>, <ul>, <li> tags — no headings
```

---

## API Controller

All ecommerce endpoints live in a new file: `api/src/controllers/ecommerce.ts`

**Do NOT add these to `pages.ts`.** Completely separate.

Register routes in `api/src/routes/ecommerce.ts` and add one `app.use()` in `api/src/app.ts`.

```
POST /api/ecommerce/:id/generate-product     — description + schema
POST /api/ecommerce/:id/generate-collection  — intro + schema
POST /api/ecommerce/:id/publish-shopify      — publish to Shopify
POST /api/ecommerce/import-shopify           — import products/collections
GET  /api/ecommerce/shopify-products         — fetch product list from Shopify
GET  /api/ecommerce/shopify-collections      — fetch collection list from Shopify
```

---

## Publish Flow

### Publish to Shopify

Confirmation modal before pushing:

```
Publishing: {product name}
{store}.myshopify.com/products/{handle}

[ ] Overwrite existing description
[ ] Update meta title + meta description

[ Cancel ]   [ Publish ]
```

**Product — API call:**
```
PUT /admin/api/2024-01/products/{shopify_product_id}.json

{
  "product": {
    "id": {shopify_product_id},
    "body_html": {generated HTML},
    "metafields": [
      { "namespace": "global", "key": "title_tag", "value": {meta_title}, "type": "single_line_text_field" },
      { "namespace": "global", "key": "description_tag", "value": {meta_description}, "type": "single_line_text_field" }
    ]
  }
}
```

**Collection — API call:**
```
PUT /admin/api/2024-01/collections/{shopify_collection_id}.json

{
  "collection": {
    "id": {shopify_collection_id},
    "body_html": {generated HTML},
    "metafields": [
      { "namespace": "global", "key": "title_tag", "value": {meta_title}, "type": "single_line_text_field" },
      { "namespace": "global", "key": "description_tag", "value": {meta_description}, "type": "single_line_text_field" }
    ]
  }
}
```

Meta title/description writes to `global.title_tag` and `global.description_tag` — the Shopify fields that control `<title>` and `<meta name="description">` on the storefront. Every Sharkly-published page gets correct meta tags automatically.

On success: update `status` to `'published'`, save `published_at`, show success toast.

### Copy HTML (no Shopify)

"Copy HTML" copies Tiptap output to clipboard. No modal. Toast: "HTML copied to clipboard."

---

## Credit Costs

| Action | Credits |
|---|---|
| SERP keyword check | 5 |
| Product description generation | 10 |
| Collection intro generation | 10 |
| Shopify import | 0 |
| Re-run SEO checks | 0 |
| Publish to Shopify | 0 |
| Bulk generate (N products) | 10 × N |

Add to `api/src/utils/credits.ts` and `ui/app/src/lib/credits.ts`:
```
PRODUCT_DESCRIPTION_GENERATION = 10
COLLECTION_INTRO_GENERATION = 10
```

---

## Build Order

Build in this sequence. Do not skip ahead.

| Step | What | Files |
|---|---|---|
| 1 | DB migration — `ecommerce_pages` table + RLS | `sql/migrations/ecommerce_pages.sql` |
| 2 | API controller — all 6 endpoints | `api/src/controllers/ecommerce.ts` |
| 3 | API routes | `api/src/routes/ecommerce.ts` |
| 4 | Register routes in Express | `api/src/app.ts` — add one import + `use()` |
| 5 | `/ecommerce` hub — list, tabs, table | `src/pages/Ecommerce.tsx` |
| 6 | Add Product / Add Collection modals | `src/pages/Ecommerce.tsx` (inline) |
| 7 | Import from Shopify modal | `src/pages/Ecommerce.tsx` (inline) |
| 8 | `/ecommerce/:id` workspace | `src/pages/EcommerceWorkspace.tsx` |
| 9 | SEO checks right panel | `src/pages/EcommerceWorkspace.tsx` |
| 10 | Schema block + copy button | `src/pages/EcommerceWorkspace.tsx` |
| 11 | Publish modal + Shopify API calls | `api/src/controllers/ecommerce.ts` |
| 12 | Sidebar nav item | `src/components/common/Sidebar.tsx` |
| 13 | Add routes to React Router | `src/App.tsx` — add 2 routes |
| 14 | Product/Collection badge in Target detail | `src/pages/TargetDetail.tsx` — small addition only |

---

## Out of Scope

Do not build these as part of this spec:

- UPSA scoring for ecommerce pages
- Content briefs for products
- Internal link engine for ecommerce pages
- Rank tracking per product (that is the Performance screen via GSC)
- Sales, revenue, or inventory data from Shopify
- Shopify theme editing
- WooCommerce (V2)
- CRO Studio integration (destination pages are already handled by CRO Studio separately)

---

_Sharkly — Shark Engine Optimization_

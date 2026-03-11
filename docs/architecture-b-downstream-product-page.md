# Sharkly — Architecture B: Downstream Product Page
## Data Model, Internal Link Engine, and Brief Generation Changes

---

## What This Is

The current spec assumes the focus page IS the money/conversion page for all clusters (Architecture A). This is correct for service businesses but wrong for ecommerce and SaaS — where the informational focus page is separate from the product or signup page.

Architecture B adds support for clusters where the product page sits downstream of the cluster as a destination — not as part of the cluster itself.

```
Architecture A (current — service businesses):
Supporting articles → Focus page (SEO + CRO) → Conversion

Architecture B (new — ecommerce, SaaS):
Supporting articles → Focus page (informational, ranks) → Product page (pure CRO, converts)
```

This is a small data model addition that unlocks a completely different and very common use case without changing the fundamental cluster architecture.

---

## Data Model Changes

### Clusters Table

```sql
-- New fields on clusters table
ALTER TABLE clusters ADD COLUMN architecture text DEFAULT 'A';
-- 'A' = focus page is the money/service page (current default — all existing clusters)
-- 'B' = informational focus page, product/signup page is a downstream destination

ALTER TABLE clusters ADD COLUMN destination_page_url text;
-- Only populated when architecture = 'B'
-- The URL of the product page / signup page that sits outside the cluster
-- Example: 'https://sharkly.io/signup' or 'https://store.com/products/cooling-sheets'
-- This is what the internal link engine uses to suggest contextual links
-- This is what the cluster intelligence layer uses to detect orphaned product pages

ALTER TABLE clusters ADD COLUMN destination_page_label text;
-- Human-readable name for the destination page
-- Example: 'Sharkly Signup', 'Cooling Sheets Product Page'
-- Used in UI and plain-English output — never expose raw URLs to users in copy
```

### No Changes to Pages Table
The product/destination page in Architecture B is NOT a row in the pages table. It is an external URL. It lives outside the cluster. Sharkly does not generate content for it (it may be a Shopify product page, a SaaS signup page, etc.). The cluster points TO it — it does not own it.

---

## UI Changes — Cluster Settings

When a user creates or edits a cluster, they see a new field:

**Cluster Type** (radio or toggle):
- "This is a service or local business page" → Architecture A (default)
- "This content leads to a separate product or signup page" → Architecture B

**If Architecture B selected**, a new field appears:
- "Product page URL" — text input for the destination URL
- "Page label" — short name for the destination ("My Product Page", "Signup Page")
- Helper text: "This is the page your content is ultimately driving visitors toward. We'll make sure your linking structure sends the right visitors there at the right time."

---

## Internal Link Engine Changes

The internal link suggestion engine currently suggests links between pages within the cluster. For Architecture B clusters it needs one additional behaviour.

### New Suggestion Type: Contextual Destination Link

When generating internal link suggestions for a supporting article in an Architecture B cluster, the engine includes ONE suggestion for a contextual link to the destination page — but only when the content provides a genuinely natural moment.

```javascript
function generateDestinationLinkSuggestion(article, cluster) {
  // Only for Architecture B clusters with a destination URL
  if (cluster.architecture !== 'B' || !cluster.destination_page_url) return null

  // Only suggest if article is MoFu or BoFu type — never on ToFu articles
  if (article.page_type === 'tofu_article') return null

  // Only suggest if article doesn't already have a destination page link
  const alreadyLinked = article.internal_links?.some(
    link => link.destination_url === cluster.destination_page_url
  )
  if (alreadyLinked) return null

  return {
    type: 'destination_link',
    destination_url: cluster.destination_page_url,
    destination_label: cluster.destination_page_label,
    suggested_placement: 'body_contextual',
    suggestion_text: `Add one contextual mention of ${cluster.destination_page_label} where it fits naturally — where the reader is most solution-aware. This is the moment to reference your product. Do not force it.`,
    anchor_guidance: `Use descriptive anchor text that explains what the destination page offers. Avoid generic anchors like "click here" or "learn more".`,
    limit: 1 // never suggest more than one destination link per article
  }
}
```

### Focus Page Destination Links

For Architecture B clusters, the focus page brief generation and internal link suggestions must explicitly include links to the destination page.

```javascript
function generateFocusPageDestinationLinks(focusPage, cluster) {
  if (cluster.architecture !== 'B' || !cluster.destination_page_url) return null

  return {
    type: 'focus_to_destination',
    recommendations: [
      {
        placement: 'above_fold_cta',
        description: `Primary CTA button linking to ${cluster.destination_page_label}`,
        anchor_text: `See how ${cluster.destination_page_label} works` // example
      },
      {
        placement: 'body_contextual_early',
        description: `Contextual body link in first 30% of content — most authoritative placement`,
      },
      {
        placement: 'bottom_cta',
        description: `Second CTA at bottom of page — catches visitors who read everything`
      }
    ],
    total_links: '2-3', // range — not every focus page needs exactly 3
    note: 'These are the only links the focus page should send to the destination. Do not add more — equity concentration matters.'
  }
}
```

---

## Brief Generation Changes

### Supporting Articles in Architecture B Clusters

The CRO context block injected into supporting article briefs (from System 1) changes based on cluster architecture.

**Additional instruction for Architecture B supporting articles (MoFu and BoFu only):**
```
DESTINATION PAGE CONTEXT:
This article is part of a cluster that leads to {destination_page_label}.
Where contextually natural — where the reader is most solution-aware —
include one mention of {destination_page_label} with a link.
This should feel like a natural recommendation, not a sales pitch.
If no natural moment exists, do not force it. Omit entirely.
Never include more than one reference to the destination page.
ToFu articles: Do not mention the destination page at all.
```

**For ToFu articles in Architecture B clusters:**
```
DESTINATION PAGE CONTEXT:
This article leads toward {destination_page_label} but the reader is not ready
to hear about it yet. Do not mention or link to the destination page.
Your job is to answer the question completely and build trust.
The journey to the destination page starts here — but it starts with information, not sales.
```

### Focus Page in Architecture B Clusters

The focus page brief gets a different CRO context block than a standard service/money page:

```
CRO CONTEXT FOR THIS PAGE (Architecture B — Informational Focus Page):
This page ranks for the head term and sends qualified visitors to {destination_page_label}.
Structure:
1. Above fold: H1 with keyword + clear CTA linking to {destination_page_label}
   ("See how {destination_page_label} solves this →")
2. First scroll: Depth on the topic — full informational coverage
3. Middle: Entities, H2s, FAQ, schema — SEO depth for ranking
4. Contextual body links: Reference {destination_page_label} 1-2 times where natural
5. Bottom CTA: Second link to {destination_page_label} — catch visitors who read everything

This page does two jobs: rank for the head term AND convert qualified readers.
It does NOT need to be a hard-sell page. It needs to be the best answer to the head term
AND clearly point readers toward the next step when they're ready.
```

---

## Cluster Health Bar Changes

The existing cluster health bar shows aggregate SEO and CRO scores across cluster pages. For Architecture B clusters, add one additional indicator:

**Destination Connection Status:**
- 🟢 Green: Focus page links to destination page AND at least one supporting article links contextually
- 🟡 Amber: Focus page links to destination page but no supporting articles have contextual links yet
- 🔴 Red: No pages in cluster link to destination page (orphaned product page — also flagged by cluster intelligence layer)

Display in cluster health bar as a small pill: "Product Page — Connected / Partial / Disconnected"

---

## Cluster Intelligence Layer Integration

The cluster intelligence layer (see `cluster-intelligence-layer.md`) reads `clusters.destination_page_url` and `clusters.architecture` to power two of its six warnings:

- **Warning 5 (Orphaned Product Page):** Fires when `architecture = 'B'` and `destination_page_url` exists but no cluster pages link to it
- **Warning 1 (Over-Linking to Money Page):** Uses `destination_page_url` to identify which links in supporting articles are pointing directly to the product page vs. the focus page

Both warnings reference the destination label in their plain-English output — never the raw URL.

---

## Example: Sharkly's Own Architecture B Cluster

This is the canonical example for testing and documentation.

```
Cluster: "Ecommerce SEO"
Architecture: B
Destination page: https://sharkly.io/signup
Destination label: "Sharkly"

Supporting articles:
- "How to optimize Shopify for SEO" (MoFu)
  → Links to focus page (primary — non-negotiable)
  → ONE contextual link to Sharkly signup: "Tools like Sharkly automate 
    the entire Shopify SEO process" — natural, solution-aware moment
  
- "WooCommerce SEO essentials" (MoFu)  
  → Links to focus page (primary)
  → ONE contextual link to Sharkly: natural moment in content
  
- "What is ecommerce SEO" (ToFu)
  → Links to focus page only
  → NO link to Sharkly — reader not solution-aware yet

Focus page: "Best ecommerce platforms for SEO"
  → Receives equity from all supporting articles
  → Above fold: CTA → Sharkly signup ("See how Sharkly handles ecommerce SEO")
  → Body: 1-2 contextual references to Sharkly
  → Bottom: Second CTA → Sharkly signup

Product page: https://sharkly.io/signup
  → Pure CRO — converts whoever arrives
  → Receives one strong link from focus page (highest authority in cluster)
  → Receives contextual links from 2 supporting articles (natural, solution-aware)
  → Does not need to rank — needs to convert
```

---

## Build Order for Cursor

1. Add `architecture` and `destination_page_url` and `destination_page_label` fields to clusters table (Supabase migration)
2. Update cluster creation and edit UI — add Architecture A/B selector + destination URL field
3. Update internal link suggestion engine — add `generateDestinationLinkSuggestion()` for Architecture B articles
4. Update brief generation — inject Architecture B CRO context blocks based on cluster architecture field
5. Update cluster health bar — add destination connection status indicator
6. Ensure cluster intelligence layer (Warning 1 and Warning 5) reads from `destination_page_url`
7. Update React Flow map in cluster view — show destination page as a node outside the cluster boundary with directional arrows from focus page

---

## What Does NOT Change

- The fundamental cluster architecture (reverse silo, equity flow, supporting articles → focus page) does not change for Architecture B. The difference is only what the focus page points to downstream.
- All existing Architecture A clusters default to `architecture = 'A'` with `destination_page_url = null`. No migration needed for existing data.
- The internal link engine's core logic (page-to-page suggestions within the cluster) does not change. Architecture B only adds one new suggestion type on top of existing behaviour.
- The UPSA scoring does not change. Page-level scoring is architecture-agnostic.

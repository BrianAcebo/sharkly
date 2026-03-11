# Sharkly — Cluster Intelligence Layer (Build Spec)
## Cluster-Level Architectural Audit System

---

## What This Is

The cluster intelligence layer is a system that looks at an entire cluster as a unit — not individual pages — evaluates the equity flow pattern, checks funnel coherence, and surfaces architectural issues as prioritised plain-English recommendations.

This is distinct from everything currently in the spec. The existing internal link suggestion engine operates page-to-page. The existing UPSA operates page-level. The existing cluster health bar aggregates page scores. None of them evaluate the relationships between pages or whether the cluster is functioning as a coherent system.

No existing SEO tool does this well. Ahrefs shows a link graph. Semrush shows internal link issues. Neither interprets the graph against the user's business goal and explains what the architecture is doing to their results in plain English.

---

## Where It Lives in the UI

The cluster intelligence layer lives in the **cluster detail view** as a new insight block. It is not a separate page. It is not a new navigation item. It sits within the existing cluster view — below the React Flow map and above the page list — as a collapsible insight panel.

**Label:** Something like "Is your cluster working together?" or "Cluster Health Check" — never "Link Equity Analysis" or "Cluster Architecture Audit." That is Semrush language.

**Output format:** One insight block. Three to five plain-English findings maximum. Each finding: one sentence describing the problem, one sentence explaining why it matters to the business, one specific action. Prioritised by revenue impact.

---

## The Six Warnings — Detection Logic and Plain-English Output

### Warning 1: Over-Linking to Money / Product Pages

**What it detects:** More than one supporting article per cluster linking directly to the product or money page. Or more than 30% of supporting articles containing a direct product page link.

**Detection:**
```javascript
function detectOverLinkingToMoneyPage(cluster) {
  const supportingArticles = cluster.pages.filter(p => p.type === 'article')
  const articlesWithProductLink = supportingArticles.filter(p => 
    p.internal_links?.some(link => link.destination_url === cluster.destination_page_url ||
    link.destination_url === cluster.focus_page?.url && cluster.architecture === 'A' && link.is_money_page_link)
  )
  
  const ratio = articlesWithProductLink.length / supportingArticles.length
  const threshold = 0.30 // more than 30% = over-linking

  if (articlesWithProductLink.length > 1 || ratio > threshold) {
    return {
      severity: 'high',
      articles_affected: articlesWithProductLink.map(p => p.title),
      count: articlesWithProductLink.length,
      total: supportingArticles.length
    }
  }
  return null
}
```

**Plain-English output:**
> "{N} of your articles link directly to your product page. This is splitting your ranking power instead of concentrating it through your main content page. Remove direct product links from these articles and let your main page send one strong link instead — that one link is worth more than all {N} of these combined."

**Specific action:** Lists the article titles affected. "Remove the product page link from each of these articles."

---

### Warning 2: Missing Reverse Silo Connections

**What it detects:** Supporting articles that do not have a link to the cluster's focus page. These articles are generating content but contributing zero equity to the cluster's ranking goal.

**Detection:**
```javascript
function detectMissingReverseSiloLinks(cluster) {
  const supportingArticles = cluster.pages.filter(p => p.type === 'article')
  const focusPageUrl = cluster.focus_page?.url

  const articlesWithoutFocusLink = supportingArticles.filter(p =>
    !p.internal_links?.some(link => link.destination_url === focusPageUrl)
  )

  if (articlesWithoutFocusLink.length > 0) {
    return {
      severity: articlesWithoutFocusLink.length >= supportingArticles.length * 0.5 ? 'high' : 'medium',
      articles_affected: articlesWithoutFocusLink.map(p => p.title),
      connected: supportingArticles.length - articlesWithoutFocusLink.length,
      total: supportingArticles.length
    }
  }
  return null
}
```

**Plain-English output:**
> "{N} of your {total} articles don't link back to your main content page. Your main page is only receiving ranking power from {connected} articles instead of all {total}. Each missing connection is leaving ranking power on the table."

**Specific action:** Lists unconnected article titles. "Add a contextual link to your main page in each of these articles."

---

### Warning 3: Funnel Stage Imbalance

**What it detects:** A cluster with too many ToFu articles and not enough MoFu or BoFu content to move visitors through the funnel. Awareness traffic exists but there is no conversion infrastructure to capture it.

**Detection:**
```javascript
function detectFunnelImbalance(cluster) {
  const pages = cluster.pages
  const tofu = pages.filter(p => p.page_type === 'tofu_article').length
  const mofu = pages.filter(p => p.page_type === 'mofu_article' || p.page_type === 'mofu_comparison').length
  const bofu = pages.filter(p => p.page_type === 'bofu_article' || p.page_type === 'service_page' || p.page_type === 'money_page').length
  const total = pages.length

  // Flag if cluster is heavily ToFu weighted with no MoFu bridge
  if (tofu >= 5 && mofu === 0) {
    return { type: 'no_mofu_bridge', tofu, mofu, bofu, total }
  }
  // Flag if ToFu far exceeds BoFu with no MoFu transition
  if (tofu > bofu * 4 && mofu < 2) {
    return { type: 'tofu_heavy', tofu, mofu, bofu, total }
  }
  return null
}
```

**Plain-English output (no_mofu_bridge):**
> "Your cluster has {tofu} informational articles but nothing in between them and your main page to guide readers toward a decision. You're attracting awareness traffic with nowhere to take it. Add 1-2 comparison or consideration pages between your blog posts and your main content page."

**Plain-English output (tofu_heavy):**
> "Your cluster is {tofu} awareness articles and {bofu} conversion page. You have a lot of traffic coming in at the top with very little to catch them as they move toward a decision. Add MoFu content — 'best options for X', 'how to choose X', or comparison pages — to bridge the gap."

---

### Warning 4: Equity Leaking Externally from Focus Page

**What it detects:** The focus page has outbound links to external sites without nofollow attributes. Equity built through months of supporting article work is being passed to external sites.

**Detection:**
```javascript
function detectExternalEquityLeak(cluster) {
  const focusPage = cluster.focus_page
  if (!focusPage) return null

  const externalLinksWithoutNofollow = focusPage.external_links?.filter(link => 
    !link.is_nofollow && !link.is_sponsored
  ) || []

  if (externalLinksWithoutNofollow.length > 2) {
    return {
      severity: 'medium',
      count: externalLinksWithoutNofollow.length,
      links: externalLinksWithoutNofollow.map(l => ({ url: l.url, anchor: l.anchor_text }))
    }
  }
  return null
}
```

**Plain-English output:**
> "Your main content page has {count} links to external websites without protection. Ranking power you've built through months of content work is flowing out to other sites. Add rel='nofollow' to these links or remove them — that power should stay in your system."

**Specific action:** Lists the external URLs. "Add nofollow to each of these links in your CMS."

---

### Warning 5: Orphaned Product / Money Page

**What it detects:** A cluster where the product or money page exists but has no internal links pointing to it from the cluster. It has no path to receive trust signals or equity from the content system.

**Detection:**
```javascript
function detectOrphanedProductPage(cluster) {
  // Architecture B: check if destination_page_url has any links pointing to it
  if (cluster.architecture === 'B' && cluster.destination_page_url) {
    const allPages = cluster.pages
    const pagesLinkingToProduct = allPages.filter(p =>
      p.internal_links?.some(link => link.destination_url === cluster.destination_page_url)
    )
    
    if (pagesLinkingToProduct.length === 0) {
      return { type: 'no_links_to_product', destination: cluster.destination_page_url }
    }
  }

  // Architecture A: check if focus page has a conversion CTA
  if (cluster.architecture === 'A') {
    const focusPage = cluster.focus_page
    const hasCTA = focusPage?.cro_checklist?.items?.['2']?.status === 'pass'
    if (!hasCTA) {
      return { type: 'focus_page_no_cta' }
    }
  }
  return null
}
```

**Plain-English output (no_links_to_product):**
> "Your product page isn't connected to your content cluster. It has no path to receive ranking power or trust signals from your articles. Add one strong contextual link from your main content page to your product page."

**Plain-English output (focus_page_no_cta):**
> "Your main content page has no call to action. Visitors who arrive from your supporting articles have nowhere to go. Add a contact button, phone number, or booking link above the fold."

---

### Warning 6: Cluster-Wide Funnel Mismatch (CTAs Wrong for Page Types)

**What it detects:** Multiple supporting articles in the cluster have hard CTAs when their page type is ToFu or MoFu. These pages are generating pogo-stick signals and suppressing rankings across the cluster.

**Detection:**
```javascript
function detectClusterWideFunnelMismatch(cluster) {
  const supportingArticles = cluster.pages.filter(p => p.type === 'article')
  
  const mismatchedPages = supportingArticles.filter(p => {
    const isInformational = p.page_type === 'tofu_article' || p.page_type === 'mofu_article'
    const hasHardCTA = p.cro_checklist?.funnel_mismatch === 'hard_cta_on_tofu' || 
                       p.cro_checklist?.funnel_mismatch === 'hard_cta_on_mofu'
    return isInformational && hasHardCTA
  })

  if (mismatchedPages.length >= 2) {
    return {
      severity: 'high',
      count: mismatchedPages.length,
      pages: mismatchedPages.map(p => p.title)
    }
  }
  return null
}
```

**Plain-English output:**
> "{count} of your articles are pushing visitors to buy before they're ready. This is causing them to leave, which tells Google your pages aren't satisfying their search. This is hurting your rankings on these pages. Soften the CTAs on these articles to match what the reader actually needs at that stage."

**Specific action:** Lists page titles. "Change each of these CTAs from a purchase/contact request to a soft offer — a free guide, a 'learn more' link, or an email capture."

---

## Cluster Intelligence Score

Each warning has a severity level — high, medium, low. The cluster intelligence layer produces an overall architectural health indicator displayed alongside the existing cluster health bar.

```javascript
function calculateClusterArchitectureHealth(warnings) {
  const severityWeights = { high: 30, medium: 15, low: 5 }
  let deductions = 0

  warnings.forEach(warning => {
    deductions += severityWeights[warning.severity] || 10
  })

  const score = Math.max(0, 100 - deductions)
  
  if (score >= 80) return { label: 'Strong', color: 'green', score }
  if (score >= 50) return { label: 'Needs Work', color: 'amber', score }
  return { label: 'Critical Issues', color: 'red', score }
}
```

**Display:** Not shown as a number. Shown as a label — "Strong", "Needs Work", "Critical Issues" — with a colour indicator. The plain-English findings list below it tells the user exactly what to fix.

---

## When the Cluster Intelligence Layer Runs

- On cluster detail page load (read from stored results, don't recalculate on every load)
- Recalculates when: a page is added or removed from the cluster, internal links on any cluster page are updated, page_type classification changes on any cluster page, cro_checklist updates on any cluster page
- Stored as `cluster_intelligence` JSONB on the clusters table

---

## Database Changes Required

```sql
-- Add to clusters table
ALTER TABLE clusters ADD COLUMN cluster_intelligence jsonb;
-- Structure:
-- {
--   evaluated_at: timestamp,
--   architecture: 'A' | 'B',
--   warnings: [
--     {
--       type: string,          -- warning identifier
--       severity: 'high' | 'medium' | 'low',
--       message: string,       -- plain-English finding
--       action: string,        -- specific action to take
--       affected_pages: []     -- page titles or URLs affected
--     }
--   ],
--   health: {
--     label: 'Strong' | 'Needs Work' | 'Critical Issues',
--     color: 'green' | 'amber' | 'red',
--     score: number
--   }
-- }

ALTER TABLE clusters ADD COLUMN architecture text DEFAULT 'A';
-- 'A' = focus page is the money page
-- 'B' = informational focus page, product page is downstream destination
-- Set at cluster creation, editable by user
```

---

## UI Specification

**Location:** Cluster detail view. Below the React Flow map. Above the page list table.

**Collapsed state:** "Cluster Health Check — {label}" with colour dot. Expand chevron.

**Expanded state:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IS YOUR CLUSTER WORKING TOGETHER?
Last checked: {date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 CRITICAL — Fix first

  [Warning 1 finding — one sentence]
  Why it matters: [one sentence]
  Action: [specific step]
  Pages affected: Article 1, Article 2, Article 3

🟡 NEEDS ATTENTION

  [Warning 2 finding]
  Why it matters: [one sentence]
  Action: [specific step]

✅ WORKING WELL

  All {N} articles link to your main content page ✓
  No equity leaking to external sites ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Maximum 5 findings displayed. If more exist, show top 5 by severity. "See all findings" link expands the rest.

---

## Warning 7: Focus Page is a BoFu / Transactional Keyword

**What it detects:** The cluster's focus page is targeting a buying-intent (BoFu/transactional) keyword rather than a research-stage (MoFu/consideration) keyword. This means the page is trying to rank AND convert simultaneously — doing both jobs poorly.

**The core problem:** A page targeting "cyber crime investigation Hollywood FL" needs to be short, fast, and CRO-optimised to convert the visitor. But to rank for that keyword it needs depth, entities, H2 structure, and word count. These requirements directly contradict each other. The page ends up too long to convert well and not deep enough to rank competitively.

**The correct architecture:** The BoFu/transactional keyword belongs on the destination page (CRO only). The focus page should target a MoFu research-stage keyword — "how to choose a cyber crime investigator" or "best cyber crime investigator Miami" — that ranks for the evaluation-stage query and hands off to the destination page.

**Detection:**
```javascript
function detectBoFuFocusPage(cluster) {
  const focusPage = cluster.focus_page
  if (!focusPage) return null

  const isBoFuIntent = (
    focusPage.page_type === 'money_page' ||
    focusPage.dominant_intent === 'transactional' ||
    focusPage.funnel_stage === 'bofu'
  )

  // Additional signal: keyword contains local modifier + service name
  // (classic transactional pattern: "service + location")
  const keywordIsTransactional = /\b(near me|in [a-z]+|[a-z]+ fl|[a-z]+ ny|hire|book|buy|get a quote|cost|price|pricing)\b/i
    .test(focusPage.target_keyword)

  if (isBoFuIntent || keywordIsTransactional) {
    return {
      severity: 'critical', // red banner — highest severity warning
      focus_page_title: focusPage.title,
      focus_page_keyword: focusPage.target_keyword,
      funnel_stage: focusPage.funnel_stage,
      dominant_intent: focusPage.dominant_intent
    }
  }
  return null
}
```

**Plain-English output (red full-width banner in funnel visualizer — not just the intelligence panel):**
> "Your SEO anchor is targeting a buying-intent keyword. Pages like this struggle to rank because Google expects informational depth here — but they also struggle to convert because that same depth gets in the way of a quick decision. This page is trying to do two jobs at once and doing neither well."
>
> "Consider: make '{current keyword}' your destination page keyword (conversion only) and create a new SEO anchor targeting a research-stage keyword like 'how to choose {service}' or 'best {service} for {situation}'."

**Why this is Warning 7 (not Warning 1):**
This is the most strategically important warning but it requires the most context to act on. Warnings 1-6 are tactical fixes — add a link here, remove a link there. Warning 7 requires the user to rethink their cluster architecture. It is surfaced prominently (red banner in the funnel visualizer) but with more explanation than the other warnings because the action required is bigger.

---

## Updated Scoring — Warning 7 is Always Critical

```javascript
function calculateClusterArchitectureHealth(warnings) {
  const severityWeights = { critical: 40, high: 30, medium: 15, low: 5 }
  let deductions = 0

  warnings.forEach(warning => {
    deductions += severityWeights[warning.severity] || 10
  })

  // Warning 7 (BoFu focus page) always forces 'Critical Issues' status
  // regardless of other warnings — it is a fundamental architecture problem
  const hasBoFuFocusPage = warnings.some(w => w.type === 'bofu_focus_page')
  if (hasBoFuFocusPage) {
    return { label: 'Critical Issues', color: 'red', score: 0 }
  }

  const score = Math.max(0, 100 - deductions)
  if (score >= 80) return { label: 'Strong', color: 'green', score }
  if (score >= 50) return { label: 'Needs Work', color: 'amber', score }
  return { label: 'Critical Issues', color: 'red', score }
}
```

---

## Build Order for Cursor

1. Add `cluster_intelligence` and `architecture` fields to clusters table (Supabase migration)
2. Write the seven detection functions — each returns a warning object or null
3. Write `calculateClusterArchitectureHealth(warnings)` — returns health label and score, Warning 7 always forces Critical Issues
4. Write `evaluateClusterIntelligence(cluster)` — runs all seven detections, assembles result, stores to `cluster_intelligence`
5. Wire evaluation trigger to cluster page load + cluster change events
6. Build cluster intelligence UI panel in cluster detail view
7. Connect to existing cluster health bar (add architecture health as second indicator alongside existing health bar)
8. Wire Warning 7 to funnel visualizer as a red full-width banner (separate from the intelligence panel — surfaces in both places)

---

## Relationship to Other Systems

- **Reads from:** `pages.page_type`, `pages.cro_checklist`, `pages.internal_links`, `pages.funnel_stage`, `pages.dominant_intent`, `clusters.destination_page_url`, `clusters.architecture`
- **Feeds into:** Cluster detail view UI, cluster health bar (secondary indicator), funnel visualizer warning banners
- **Does not replace:** The internal link suggestion engine (that operates page-to-page). The cluster intelligence layer audits existing links. The suggestion engine recommends new links. They complement each other.
- **Reference document:** `reverse-silo-architecture.md` — the six architectural rules that all detection logic is based on
- **Related document:** `architecture-b-downstream-product-page.md` — the data model for the destination_page_url field this system reads from
- **Related document:** `funnel-visualizer.md` — Warning 7 surfaces as a red banner in the funnel visualizer, not just the intelligence panel

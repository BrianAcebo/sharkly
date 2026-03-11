# Sharkly — System 1: CRO Layer (Beta Build Spec)
## The Light CRO Layer Inside the SEO Tool

---

## What This Is

System 1 is not a CRO product. It is a conversion layer built on top of Sharkly's existing SEO content tool. It does three things:

1. Audits every page against an 8-item conversion checklist
2. Adjusts the checklist requirements based on the page's intent type — invisibly
3. Fires a plain-English warning when the CTA type conflicts with the page's funnel stage

Users never see the classification logic. They see plain-English results. That is the Apple principle — intelligence under the hood, clarity on the surface.

**Why it exists in Beta (not V2):** SEO rankings take 3–6 months to appear. CRO produces visible results immediately. A user who rewrites their CTA based on Sharkly's suggestion and gets two more calls that week stays subscribed through the months their rankings are silently building. This is a retention mechanism, not a feature addition.

**Pricing:** Included in base subscription. Do not paywall. Users who need it most are the ones most likely to churn — paywalling accelerates that churn.

**What Sharkly is NOT building:** A landing page builder. Sharkly audits the page, scores it, generates the specific copy fixes, and gives plain-English placement instructions. The user implements in their own CMS.

---

## The Three-Step User Experience

**Step 1 — Audit**
Page is analyzed against the 8-item checklist. Each item returns pass / partial / fail / N/A based on page type. Score displayed as X / Y where Y = applicable items only.

**Step 2 — Generate**
For each failing item, Sharkly generates the specific copy the user needs. Not a whole page — just the broken piece. Weak H1 → 3 stronger options. Missing trust signal → a credibility statement built from their business info. Wrong CTA → the right CTA copy for this funnel stage.

**Step 3 — Instruct**
For each fix, one plain-English instruction on placement. "Replace your current H1 with option 2. Place it above everything else on the page, before any images." User goes and does it in their own CMS.

---

## Page Type Classification

This is the master upstream classifier. It runs at brief generation and stores the result. Every downstream system reads from it. The user never sees it — they just see smarter results.

### The Six Types

| Type | Keyword Pattern | Funnel Stage | Primary Job |
|---|---|---|---|
| `tofu_article` | "what is X", "how does X work", "X causes" | ToFu | Rank, inform, hook emotionally |
| `mofu_article` | "best X for Y", "how to choose X", "X reviews" | MoFu | Rank, build consideration |
| `mofu_comparison` | "X vs Y", "X alternative", "compare X" | MoFu | Rank, enable evaluation |
| `bofu_article` | "when to hire X", "X cost", "X near me" | BoFu | Rank, push toward decision |
| `service_page` | commercial focus keyword, local service | BoFu | Rank AND convert simultaneously |
| `money_page` | transactional focus keyword, product/booking | BoFu | Convert (light rank) |

### Classification Logic

```javascript
function classifyPageType(keyword, funnel_stage, dominant_intent, page_role) {
  // page_role: 'focus' | 'article' (existing field on pages table)

  if (page_role === 'focus') {
    if (dominant_intent === 'transactional') return 'money_page'
    if (keyword.match(/vs|versus|alternative|compare/i)) return 'mofu_comparison'
    if (funnel_stage === 'bofu') return 'service_page'
    if (funnel_stage === 'mofu') return 'mofu_comparison'
    return 'service_page' // default for focus pages
  }

  if (page_role === 'article') {
    if (keyword.match(/vs|versus|alternative|compare/i)) return 'mofu_comparison'
    if (funnel_stage === 'bofu') return 'bofu_article'
    if (funnel_stage === 'mofu') return 'mofu_article'
    return 'tofu_article' // default for supporting articles
  }
}
```

### When It Runs
- Called during brief generation — result stored as `page_type` on `pages` table
- Re-runs if keyword or funnel_stage changes
- User cannot see or change this field directly (internal only)

---

## Database Changes Required

```sql
-- Add to pages table
ALTER TABLE pages ADD COLUMN page_type text;
-- Values: 'tofu_article' | 'mofu_article' | 'mofu_comparison' | 
--         'bofu_article' | 'service_page' | 'money_page'
-- Set at brief generation. Re-evaluated if keyword changes.

ALTER TABLE pages ADD COLUMN cro_checklist jsonb;
-- Structure:
-- {
--   evaluated_at: timestamp,
--   page_type: string,
--   score: number,        -- sum of pass(1) + partial(0.5), N/A excluded
--   max_score: number,    -- count of applicable items (not N/A)
--   items: {
--     "1": { status: 'pass'|'partial'|'fail'|'na', evidence: string },
--     "2": { status: ..., evidence: ... },
--     ...
--     "8": { status: ..., evidence: ... }
--   }
-- }

ALTER TABLE pages ADD COLUMN cro_score integer DEFAULT 0;
-- Derived from cro_checklist for easy querying
-- Used by cluster health bar and dashboard widgets
-- Stored as percentage: Math.round((score / max_score) * 100)
```

---

## The CRO Requirements Map

This determines which items are required, optional, or N/A per page type. The checklist scoring uses this map — N/A items are excluded from the denominator entirely.

```javascript
const CRO_REQUIREMENTS = {
  money_page: {
    1: 'required', 2: 'required', 3: 'required', 4: 'required',
    5: 'required', 6: 'optional', 7: 'required', 8: 'required'
  },
  service_page: {
    1: 'required', 2: 'required', 3: 'required', 4: 'required',
    5: 'required', 6: 'optional', 7: 'required', 8: 'required'
  },
  mofu_comparison: {
    1: 'required', 2: 'required', 3: 'required', 4: 'required',
    5: 'required', 6: 'required', 7: 'required', 8: 'required'
  },
  bofu_article: {
    1: 'required', 2: 'required', 3: 'required', 4: 'required',
    5: 'required', 6: 'optional', 7: 'required', 8: 'required'
  },
  mofu_article: {
    1: 'required', 2: 'required', 3: 'optional', 4: 'required',
    5: 'optional', 6: 'optional', 7: 'optional', 8: 'required'
  },
  tofu_article: {
    1: 'required', 2: 'optional', 3: 'optional', 4: 'required',
    5: 'na',       6: 'na',       7: 'na',       8: 'required'
  }
}
```

**Scoring rule:** `required` items that fail = fail. `optional` items that fail = no penalty, shown as suggestion. `na` items = excluded from score and displayed as greyed out.

---

## The 8-Item Checklist — Full Detection Logic

### Item 1: Clear H1 With Target Keyword
**Applies to:** All page types (required everywhere)

| Status | Condition |
|---|---|
| Pass | Exactly one H1 exists AND target keyword or close variant present in H1 |
| Partial | H1 exists but target keyword absent |
| Fail | No H1, or more than one H1 on page |

**Detection:** `extractH1s(content)` — already exists in `seoScore.ts`. Reuse directly.

**Evidence string examples:**
- Pass: `"H1 found: 'Drain Cleaning Services London' — keyword match confirmed"`
- Partial: `"H1 found but target keyword 'drain cleaning London' not present"`
- Fail: `"No H1 tag found on this page"`

---

### Item 2: Hero CTA Above the Fold
**Applies to:** Required for service_page, money_page, bofu_article, mofu_comparison, mofu_article. Optional for tofu_article.

**The fold definition:** First 20% of plain text content by character count.

**CTA phrase lists by commitment level:**

```javascript
const CTA_PHRASES = {
  hard: [
    'get a quote', 'book now', 'book a', 'call us', 'call now',
    'buy now', 'order now', 'start now', 'get started', 'sign up',
    'schedule', 'request a', 'claim your', 'get your free'
  ],
  medium: [
    'see how', 'learn how', 'get a demo', 'free assessment',
    'free consultation', 'find out', 'discover', 'explore',
    'watch how', 'see results', 'get a free'
  ],
  soft: [
    'download', 'subscribe', 'get the guide', 'free guide',
    'read more', 'learn more', 'get the free', 'grab the',
    'join', 'get access', 'get our free'
  ]
}
```

**Pass criteria by page type:**

| Page Type | Pass Condition | Fail Condition |
|---|---|---|
| money_page / service_page | Hard CTA detected in first 20% | No CTA in first 20% |
| bofu_article | Hard OR medium CTA in first 20% | No CTA in first 20% |
| mofu_comparison / mofu_article | Medium OR soft CTA in first 20% | Hard CTA (mismatch) OR no CTA |
| tofu_article | Soft CTA in first 20% OR no CTA | Hard CTA (mismatch — triggers funnel warning) |

**Partial:** CTA exists but found after the 20% mark — "CTA present but below the fold."

**Detection:** Scan first 20% of `extractPlainText(content)` for phrase matches (case-insensitive).

---

### Item 3: Trust Signals Section
**Applies to:** Required for service_page, money_page, bofu_article, mofu_comparison. Optional for mofu_article, tofu_article.

**Trust signal types and detection patterns:**

```javascript
const TRUST_PATTERNS = {
  reviews_ratings: /\d[\d,]*\s*(\+\s*)?(reviews?|ratings?|stars?)|★|rated\s+\d/i,
  credentials: /certif|licens|accredit|award|member\s+of|approved\s+by/i,
  experience: /\d+\s*(years?\s*(of\s*)?(experience|in\s+business)|year\s+track)/i,
  founded: /since\s+\d{4}|established\s+\d{4}|founded\s+in\s+\d{4}/i,
  client_numbers: /\d[\d,]*\s*\+?\s*(clients?|customers?|businesses?|projects?|homeowners?)/i,
  guarantees: /guarantee|warranty|money[\s-]back|satisfaction\s+guarantee|risk[\s-]free/i
}
```

| Status | Condition |
|---|---|
| Pass | 2 or more trust signal types detected |
| Partial | Exactly 1 trust signal type detected |
| Fail | 0 trust signal types detected |

**BoFu/service page note:** Trust signals must appear BEFORE the primary CTA to pass fully. If trust signals are detected but all appear after the first CTA in the content, status = Partial with evidence note: "Trust signals found but appear after your CTA — move them above the call to action."

**Detection:** Run all patterns against `extractPlainText(content)`. Count distinct pattern categories matched.

---

### Item 4: FAQ With Schema Markup
**Applies to:** All page types (required everywhere)

| Status | Condition |
|---|---|
| Pass | FAQ section detected AND `schema_generated = true` on page record AND FAQ schema type included |
| Partial | FAQ section detected but no schema markup |
| Fail | No FAQ section detected |

**FAQ detection:** `/faq|frequently asked questions?/i` in content — already exists in UPSA. Reuse.

**Schema check:** Read `page.brief_data.schema_types` array — check for `'FAQ'` inclusion. This field already exists on pages from brief generation.

---

### Item 5: Testimonials or Case Studies
**Applies to:** Required for service_page, money_page, bofu_article, mofu_comparison. Optional for mofu_article. N/A for tofu_article.

**Specificity matters for BoFu pages.** A named testimonial with a specific result passes. A generic quote fails.

```javascript
const TESTIMONIAL_PATTERNS = {
  // Named attribution: — John S. or , Sarah M. or "said John"
  named: /—\s*[A-Z][a-z]+[\s,]|,\s*[A-Z][a-z]+\s+[A-Z]\.?|said\s+[A-Z][a-z]+/,
  // Specific result: percentages, dollar amounts, time improvements
  specific_result: /\d+\s*%|\$[\d,]+|\d+x\s*(more|faster|better)|saved\s+\d+/i,
  // Generic quote signals: quotation marks with attribution
  generic_quote: /"[^"]{20,}"|\u201C[^\u201D]{20,}\u201D/,
  // Case study signals
  case_study: /case\s+study|client\s+story|results?|before\s+and\s+after/i
}
```

| Page Type | Pass | Partial | Fail |
|---|---|---|---|
| money_page / service_page / bofu_article | Named testimonial OR specific result detected | Generic quote detected, no name or result | No testimonial content |
| mofu_comparison / mofu_article | Any testimonial or case study reference | — | No testimonial content |

---

### Item 6: Comparison or Alternatives Section
**Applies to:** Required for mofu_comparison. Optional for service_page, money_page, bofu_article. N/A for tofu_article, mofu_article.

```javascript
const COMPARISON_PATTERNS = {
  language: /\bvs\.?\b|\bversus\b|compared?\s+to|alternative|unlike|better\s+than|difference\s+between|why\s+(choose|us|we)/i,
  table: /\|.+\||\<table/i  // markdown table or HTML table
}
```

| Status | Condition |
|---|---|
| Pass | Comparison language detected AND/OR comparison table present |
| Partial | Light comparison language but no structured section or table |
| Fail (mofu_comparison only) | No comparison content on a page classified as comparison type |
| N/A | tofu_article, mofu_article |

---

### Item 7: Social Proof (Numbers, Awards, Media Mentions)
**Applies to:** Required for service_page, money_page, bofu_article, mofu_comparison. Optional for mofu_article. N/A for tofu_article.

**Specificity rule:** Quantified social proof passes. Vague claims score zero.

```javascript
const SOCIAL_PROOF_PATTERNS = {
  // Quantified: "500+ clients", "4.9 stars", "#1 rated"
  quantified: /\d[\d,]*\+?\s*(clients?|customers?|reviews?|projects?|businesses?)|[\d.]+\s*(?:out\s*of\s*5|\/\s*5|\s*stars?)|#\s*1\s+rated|top\s+\d+/i,
  // Awards and recognition
  awards: /award|winner|recognized|accredited|featured\s+in|as\s+seen\s+in|best\s+of\s+\d{4}/i,
  // Media mentions (major outlets or "as seen in" pattern)
  media: /featured\s+in|as\s+seen\s+in|mentioned\s+in|covered\s+by/i
}

const VAGUE_ONLY_PATTERNS = /industry[\s-]leading|trusted\s+by\s+businesses|market[\s-]leading|world[\s-]class/i
```

| Status | Condition |
|---|---|
| Pass | At least one quantified social proof OR award OR media mention detected |
| Partial | Only vague claims detected ("industry leading" with no numbers) |
| Fail | No social proof detected |

---

### Item 8: Contact / Conversion CTA at Bottom
**Applies to:** All page types (required everywhere)

**The bottom definition:** Last 15% of plain text content by character count.

**Pass criteria by page type:**

| Page Type | Pass Condition |
|---|---|
| money_page / service_page | Hard CTA detected in last 15% |
| bofu_article | Hard OR medium CTA in last 15% |
| mofu_comparison / mofu_article | Medium OR soft CTA in last 15% |
| tofu_article | Any CTA or "next step" prompt in last 15% |

**Partial condition (all page types):** CTA found in last 15% but identical text to the top CTA — no reinforcement added. Evidence: "Bottom CTA is identical to your top CTA — add urgency or a different angle at the bottom."

**Detection:** Scan last 15% of `extractPlainText(content)` using same CTA_PHRASES lists as Item 2.

---

## Funnel Mismatch Warning

This is separate from the checklist score. It fires as a standalone warning banner above the checklist when detected.

### When It Fires

| Condition | Warning Text |
|---|---|
| Hard CTA detected on `tofu_article` | "Your CTA is too aggressive for this type of page. This visitor just found your content — they're not ready to buy. A hard sell here will cause them to leave, which also hurts your Google ranking. Replace with a soft offer like a free guide or email sign-up." |
| Hard CTA detected on `mofu_article` | "Your CTA is pushing for a commitment this visitor isn't ready to make. They're still comparing options. Use a medium-commitment offer like a free consultation or demo instead." |
| No CTA of any kind on `service_page` or `money_page` | "This page has no call to action. Visitors reading this page are ready to contact you — they have no way to do so. Add a phone number, contact form link, or booking button above the fold immediately." |
| Soft-only CTA on `money_page` or `service_page` | "Your only CTA is a low-commitment offer. Visitors on this page are ready to hire or buy — give them a direct way to do it. Add a 'Get a Quote' or 'Book Now' button." |

### Detection Logic

```javascript
function detectFunnelMismatch(content, page_type) {
  const first20 = extractFirst20Percent(content)
  const hasHardCTA = CTA_PHRASES.hard.some(p => first20.toLowerCase().includes(p))
  const hasMediumCTA = CTA_PHRASES.medium.some(p => first20.toLowerCase().includes(p))
  const hasSoftCTA = CTA_PHRASES.soft.some(p => first20.toLowerCase().includes(p))
  const hasAnyCTA = hasHardCTA || hasMediumCTA || hasSoftCTA

  if ((page_type === 'tofu_article') && hasHardCTA) return 'hard_cta_on_tofu'
  if ((page_type === 'mofu_article') && hasHardCTA) return 'hard_cta_on_mofu'
  if ((page_type === 'service_page' || page_type === 'money_page') && !hasAnyCTA) return 'no_cta_on_money'
  if ((page_type === 'service_page' || page_type === 'money_page') && hasSoftCTA && !hasHardCTA && !hasMediumCTA) return 'soft_only_on_money'

  return null // no mismatch
}
```

**Important:** The funnel mismatch warning is not part of the CRO score. It is displayed as a separate coloured banner — red for `hard_cta_on_tofu` and `no_cta_on_money`, amber for others. It can coexist with checklist items that are passing.

---

## Scoring Function

```javascript
function calculateCROScore(checklist, page_type) {
  const requirements = CRO_REQUIREMENTS[page_type]
  let score = 0
  let maxScore = 0

  for (let i = 1; i <= 8; i++) {
    const req = requirements[i.toString()]
    const item = checklist.items[i.toString()]

    if (req === 'na') continue // excluded entirely

    if (req === 'required') {
      maxScore += 1
      if (item.status === 'pass') score += 1
      if (item.status === 'partial') score += 0.5
    }

    if (req === 'optional') {
      // Optional items don't add to maxScore
      // But passing them adds a bonus (encourages but doesn't penalise)
      if (item.status === 'pass') score += 0.5
      if (item.status === 'partial') score += 0.25
    }
  }

  return {
    score: Math.round(score * 10) / 10,
    max_score: maxScore,
    percentage: Math.round((score / maxScore) * 100)
  }
}
```

**Display:** `"5 / 7"` — score out of applicable required items. Optional bonuses appear as `"5.5 / 7"` or shown separately as "+0.5 bonus."

---

## When the Evaluation Runs

Same trigger as UPSA re-scoring: fires when word count changes by more than 10% OR when H2 structure changes. Do not run on every keystroke — debounce to content save events.

```javascript
// Trigger in workspace content onChange handler
if (shouldRecalculateSEO(prevContent, newContent)) {
  await Promise.all([
    recalculateUPSA(page),
    evaluateCROChecklist(page, newContent)  // add this
  ])
}
```

---

## Updated Section 8.6 — AI Suggestion Prompt (Intent-Aware)

Fires when user clicks "Get Specific Fixes" button. Cost: 3 credits. Uses GPT-4o-mini.

```
SYSTEM:
You are a conversion rate optimization expert writing for small business owners.
Your job is to give specific, actionable fixes for failing conversion elements.
Write in plain English. No jargon. No generic advice.
Give the exact copy or structural change — name actual words they should use.
Maximum 3 suggestions total across all failing items.
Each suggestion must be 1-2 sentences.

USER:
Page type: {page_type}
Business: {business_name} — {niche}
Target keyword: {target_keyword}
Target customer: {customer_description}

Failing CRO items:
{failing_items}
[For each: item name, what was detected or not detected, why it matters for this page type]

Current H1: {h1}
Current CTAs detected: {detected_ctas}
Current trust signals detected: {detected_trust_signals}

INTENT RULES — follow these strictly:
- tofu_article: Suggest soft CTAs only. Examples: "Download the free guide", "Get the checklist", email opt-ins. Never suggest "Book Now", "Get a Quote", or any purchase/contact pressure.
- mofu_article / mofu_comparison: Suggest medium-commitment CTAs. Examples: "See how it works", "Get a free assessment", "Book a no-obligation call". Build trust before the ask.
- bofu_article / service_page / money_page: Suggest hard CTAs with urgency. Trust signals and social proof must appear before the CTA. Examples: "Get a Free Quote Today", "Call Us Now — We Answer 24/7", "Book Your Free Survey This Week".

For each failing item:
- State what is missing in one sentence
- Give the exact copy or structural change
- If suggesting copy, write the actual words: not "add a testimonial" but "Add this line: 'Over 200 London homeowners trust us — see their stories below'"
```

---

## UI Specification — CRO Tab in Workspace

The CRO tab already exists in the sitemap at `Workspace → Intelligence Panel → CRO Tab`. Currently it only shows `cro_note` from briefs. Replace and extend as follows.

### Tab Layout (top to bottom)

**1. Score Block**
```
CRO Score
[ 5 / 7 ]
Service Page
```
Large number display. Page type shown as subtext in plain English — not the internal type code. Map: `service_page` → "Service Page", `tofu_article` → "Informational Article", `money_page` → "Money Page", etc.

**2. Funnel Mismatch Warning (conditional)**
Red or amber banner shown ABOVE the checklist if `detectFunnelMismatch()` returns non-null. Plain-English text from the warning map above. Dismissable per session only — reappears if content changes and mismatch persists.

**3. Checklist (8 items)**

Each item displays:
- ✅ Green — Pass — item name + brief evidence string
- ⚠️ Amber — Partial — item name + what's partially present
- ❌ Red — Fail — item name + what's missing (this is what feeds the AI prompt)
- — Grey — N/A — item name + "Not required for this page type"

Optional items that are passing show ✅ with a small "bonus" badge. Optional items that are failing show as a greyed suggestion, not a red fail.

**4. "Get Specific Fixes" Button**
Shown below checklist. Only active when at least one required item is failing. Shows credit cost: "3 credits."

On click:
- Fires Section 8.6 AI prompt with all failing required items
- Returns plain-English suggestions
- Each suggestion displays inline below its corresponding checklist item
- Suggestions persist until content changes significantly (>10% word count shift)

**5. Brief Guidance (collapsed section)**
The existing `cro_note` fields from brief sections. Kept — labelled as "Brief Guidance" in a collapsed accordion. Still useful context even after checklist is evaluated.

---

## Brief Generation Changes

The brief generation prompt (Section 8.2) needs a single new block added, injected based on page type classification at generation time.

**For `tofu_article`:**
```
CRO CONTEXT FOR THIS PAGE:
This is a top-of-funnel informational page. The reader is not ready to buy.
Do not include any hard-sell language or high-commitment CTAs.
Build authority. Answer the question completely.
Guide the reader to their next step with a low-commitment prompt only
(email capture, downloadable guide, "learn more" link).
End sections with curiosity or education, not purchase pressure.
```

**For `mofu_article` / `mofu_comparison`:**
```
CRO CONTEXT FOR THIS PAGE:
This is a consideration-stage page. The reader is weighing their options.
They are using logic to decide. Address objections directly.
Include a medium-commitment CTA (free consultation, demo, assessment).
Build trust through specifics — numbers, credentials, case study references.
Do not pressure toward immediate purchase.
```

**For `service_page` / `bofu_article` / `money_page`:**
```
CRO CONTEXT FOR THIS PAGE:
This is a bottom-of-funnel page. The reader is close to a decision.
Structure the page in layers:
1. Above the fold: H1 + hard CTA + one trust signal (phone number or review count)
2. First scroll: Problem identification + emotional hook
3. Middle: Full SEO content, entities, FAQ, depth
4. Bottom: Testimonials with specific results + urgency signal + second hard CTA
Every section brief must include guidance on trust building, objection removal,
and CTA placement. Treat every section as an opportunity to move the reader closer.
```

This CRO context block is injected as a system-level instruction at the top of the brief generation prompt, before section briefs are generated.

---

## Cluster Health Bar Integration

The `cro_score` field (stored as percentage 0–100) already feeds the cluster health bar per the existing spec. No new work required here beyond populating the field correctly from `calculateCROScore()`.

Cluster-level CRO aggregate (average across all focus pages in cluster) is V1, not Beta. Do not build now.

---

## Build Order for Cursor

1. Add `page_type`, `cro_checklist`, `cro_score` fields to `pages` table (Supabase migration)
2. Write `classifyPageType()` — call during brief generation, store result
3. Write `extractPlainText(content)` helper if not already available (strips HTML/markdown)
4. Write `evaluateCROChecklist(page, content)` — runs all 8 detection functions, returns checklist JSONB
5. Write `calculateCROScore(checklist, page_type)` — returns score, max_score, percentage
6. Write `detectFunnelMismatch(content, page_type)` — returns mismatch type or null
7. Wire evaluation trigger to content save event (alongside existing UPSA trigger)
8. Update workspace CRO tab UI — score block, mismatch banner, checklist display, Get Fixes button
9. Update Section 8.6 AI prompt to be intent-aware (replace existing prompt)
10. Inject CRO context block into brief generation prompts (Section 8.2) based on page type
11. Populate `cro_score` field from calculation result for cluster health bar consumption

---

## Key Decisions Locked

- SEO score (UPSA) and CRO score are always displayed as two separate numbers. Never combined into a single unified score. Reason: they represent genuinely opposing forces on many page types. A unified score hides which half of the problem needs fixing.
- CRO is included in base subscription. Not paywalled at any tier. Reason: it is a retention mechanism — the users most likely to churn are the ones who need it most.
- Sharkly does not build pages. It audits, generates copy fixes, and instructs placement. The user implements in their own CMS.
- The full CRO product (System 2) is V2/V3. Do not conflate with System 1.

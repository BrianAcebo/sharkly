# Sharkly — CRO Studio

## The Live Page Audit Tool — CRO Add-On

---

## ⚠️ FOR CURSOR — READ THIS FIRST

**This file supersedes `system-1-cro-layer.md` and `system-2-cro-product.md` entirely. Both of those files are deleted. Do not reference them. This is the single source of truth for all CRO functionality in Sharkly.**

**CRO Studio is an auditing tool only.** It fetches live page HTML via URL and audits what is actually rendered on the page. It does not create content. It does not edit the user's pages. It does not touch the Workspace, briefs, or article generation.

**The CRO tab in the Workspace (skeleton) is also replaced by this system.** CRO evaluation for SEO pages is now done in CRO Studio, not the Workspace. The Workspace CRO tab skeleton should be removed.

---

## Why CRO Studio Exists as a Separate Product Space

The Workspace creates briefs and generates article content — it only ever sees Tiptap document content. It has no visibility into the actual rendered page. A Shopify product page may have reviews injected by Judge.me, a sticky add-to-cart bar, a countdown timer from a third-party app, a FAQ section rendered by a Liquid snippet. None of that exists in Tiptap. None of it can be audited from the Workspace.

CRO Studio fetches the live URL and parses rendered HTML. It sees everything. That is why it must be separate.

---

## The Fundamental Architecture

```
Workspace     → Creates briefs + AI articles. Reads Tiptap content only.
CRO Studio    → Audits live pages via URL fetch. Reads rendered HTML only.
```

No overlap. No shared audit logic. CRO Studio does not know or care what the Workspace generated — it only reads what is live on the page.

---

## Funnel Architecture Context (Read Before Building)

Sharkly uses a reverse silo interlinking structure:

```
Supporting Articles (ToFu — informational)
  └─► Focus Page (MoFu — comparison/category — HEAVY SEO)
          └─► Destination Page (BoFu — product/service/signup — HEAVY CRO)
```

**The key insight:** The destination page does not need to earn its rankings independently. It inherits link equity from the focus page. The focus page does the heavy SEO lifting. The destination page is freed from SEO burden and can be a pure conversion environment.

This means:

- **Focus pages** need heavy SEO (UPSA) + light CRO (funnel handoff, CTA appropriateness)
- **Supporting articles** need heavy SEO (UPSA) + light CRO (soft CTAs, no hard-sell)
- **Destination pages** need light SEO (6-check `runSeoChecks()` already exists in `ecommerce.ts`) + heavy CRO (full conversion audit)

SEO and CRO are in tension. A page optimised for ranking with long-form content does not convert the same way a short, sharp, emotionally-driven page does. CRO Studio is built around this tension — it knows which pages serve which master.

---

## The Two Page Types in CRO Studio

### Page Type A — SEO Page

Focus pages and supporting articles. Primary job: rank and warm the lead. Pass the warmed visitor to the destination page.

**Light CRO audit.** Does NOT penalise long-form content. Does NOT check keyword density or word count. Protects rankings at all costs.

**What it checks:**

1. Destination handoff — is the destination page URL the first link in the first 400 words of body content? (Critical — this is the reverse silo in practice)
2. CTA appropriateness — does the CTA commitment level match funnel stage?
3. Funnel mismatch — does anything on this page fight the ranking strategy?
4. Emotional hook — is there something above the fold that engages the reader before the content?
5. CTA presence — is there at least one CTA placed at the appropriate stage?

**What it does NOT check (deliberate absences):**

- Word count — long-form is correct here
- Keyword density — that's UPSA's job
- Trust signals depth — light on this page, heavy on destination
- Urgency signals — premature on a ranking page

### Page Type B — Destination Page

Product pages, service pages, signup pages. Primary job: convert the warm visitor that the focus page sent.

**Full CRO audit.** Light SEO already handled by `runSeoChecks()` in `ecommerce.ts` — CRO Studio references those results, does not re-run them.

**What it checks:** The 11-step Optimal Selling Journey, AIDA + MAP framework, cluster journey panel, and persuasion profile with bias coherence analysis (see full specification below).

---

## Access and Navigation

**Base subscription:** CRO Studio nav item is visible but greyed with a lock icon. Clicking opens the upgrade modal. Never hidden.

**CRO add-on active ($29/month, any plan):** CRO Studio appears as a fully functional top-level nav item.

```
Navigation:
[ Dashboard ] [ Strategy ] [ Clusters ] [ Ecommerce ] [ Performance ] [ CRO Studio 🎯 ]
```

---

## Entry Points

### Entry Point 1 — From Workspace (context-aware, recommended path)

An **"Optimize CRO"** button appears in the Workspace intelligence panel for focus pages and supporting articles. Clicking routes to CRO Studio pre-populated with:

- `page_url` — the current page's URL
- `page_type: 'seo_page'`
- `destination_url` — pulled from `targets.destination_page_url` via cluster → target chain
- `cluster_id` — for back-navigation and cluster journey panel

No manual input required. Audit runs immediately on arrival.

### Entry Point 2 — From Cluster Detail

The **"Open in CRO Studio"** CTA on the destination page card in the Customer Journey tab routes here with:

- `page_url` — `targets.destination_page_url`
- `page_type: 'destination_page'`
- `cluster_id` — used to build the cluster journey panel

### Entry Point 3 — Standalone (manual)

User adds any URL directly from the CRO Studio home screen:

1. Enter the page URL
2. Select page type: **SEO Page** or **Destination Page**
3. If Destination Page: select page subtype (SaaS/signup, Ecommerce product, Service/booking)
4. If SEO Page: enter the destination page URL

**On submit:** system validates structure, warns if declared type doesn't match detected structure, checks handoff for SEO pages.

---

## The Cluster Journey Panel

**Shown at the top of every destination page audit view when a cluster connection exists. Hidden for standalone audits.**

This panel shows the user how their destination page fits into the complete funnel — what psychological state a visitor is in when they arrive, and what the destination page actually needs to accomplish given what the upstream pages already handled.

### What It Displays

A three-node horizontal flow showing each page in the cluster:

```
[ Supporting Article ]  →  [ Focus Page ]  →  [ Destination Page ]
  ToFu / Informational      MoFu / Comparison    BoFu / Convert

  AIDA: Attention           AIDA: Interest +      AIDA: Action
  MAP: Motivation           Desire                MAP: Prompt only
                            MAP: Ability

  Visitor mindset:          Visitor mindset:      Visitor mindset:
  "I have a problem,        "I'm comparing        "I'm ready — give
   what are options?"        options, who's best?" me a reason NOW"
```

Each node shows: page label + URL (links out), AIDA stage, MAP stage, visitor psychological state (1 plain-English sentence), and CRO score badge if that page has been audited.

**If a page in the cluster hasn't been audited yet:** show the node with a "Not yet audited" state and an "Audit this page" CTA that routes to a new audit for that page.

### Why This Panel Matters for the Audit

The psychological state of a visitor arriving at the destination page is entirely determined by what the upstream pages already did. If the SEO funnel worked correctly:

- **Motivation** (desire to solve the problem) was established in the supporting articles
- **Ability** (belief they can act — objections handled, comparisons made) was established in the focus page
- **Prompt** is the destination page's only real job

A destination page doing Motivation or Ability work is compensating for a broken upstream funnel. The audit uses this context to generate smarter insights and flag misplaced work:

> "Your page spends significant copy explaining why SEO matters (Motivation). If visitors arrive from your focus page, they already know this. This copy is doing work your focus page should have done — and it's delaying your CTA."

### AIDA + MAP Mapping Per Page Type

| Page type          | AIDA stage           | MAP stage            | Primary psychological job                                                                         |
| ------------------ | -------------------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| `tofu_article`     | Attention + Interest | Motivation           | Activate awareness. Visitor may not know they have a problem. Hook emotionally. Never hard-sell.  |
| `mofu_article`     | Interest + Desire    | Motivation + Ability | Build consideration. Visitor knows the problem. Help them evaluate solutions. Address objections. |
| `mofu_comparison`  | Desire               | Ability              | Enable decision-making. Visitor is comparing options. Answer "why you over others?" Remove doubt. |
| `bofu_article`     | Desire + Action      | Ability + Prompt     | Push toward decision. Visitor is nearly ready. Remove final barriers.                             |
| `service_page`     | Desire + Action      | Ability + Prompt     | Establish trust AND convert simultaneously — a harder dual job.                                   |
| `destination_page` | Action               | Prompt only          | Convert only. Motivation and Ability are already handled upstream.                                |

**Audit implication:** If a `destination_page` is detected doing heavy Motivation work (extensive "why this problem matters" copy, awareness-building content), the audit flags it as a funnel architecture issue, not a CRO issue.

---

## The 11-Step Optimal Selling Journey

Updated from 10 to 11 steps. **Step 6b (Pricing) is inserted between Feature Depth and Social Proof.**

Pricing answers the MAP Ability question ("can I afford this / is this worth it?") — it is a logical step. But how pricing is _presented_ is emotional — anchoring, framing, and decoy effects all operate on the pricing block. The audit checks both: is pricing present and correctly placed, and is it presented with emotional framing tools.

The correct sequence for the logical phase:

1. **Features** convince the visitor the product is worth something
2. **Pricing** answers "can I afford it / is this fair for what I just saw?"
3. **Social proof** eases the tension that pricing creates — "others paid this and got results"

If pricing appears before features, the visitor is asked to evaluate cost before value is established. If pricing appears after social proof, the sequence is disrupted. The audit checks placement order, not just presence.

| Step | Phase           | Type                        | What is audited                                                                                                   |
| ---- | --------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1    | Emotional       | Emotional                   | Attention — enticing above-fold headline + visual hook                                                            |
| 2    | Emotional       | Emotional                   | Design trust — professional, credible first impression                                                            |
| 3    | Emotional       | Emotional                   | Credibility — expertise and trust signals before the ask                                                          |
| 4    | Emotional       | Emotional                   | Problem identification — customer pain clearly named                                                              |
| 5    | Emotional       | Emotional                   | Solution introduction — how this product fixes the problem                                                        |
| 6    | Logical         | Logical                     | Feature depth — detail that justifies the decision logically                                                      |
| 6b   | Logical         | Logical + Emotional framing | Pricing — present, placed after features, with emotional framing (anchoring / daily cost / decoy / risk-reversal) |
| 7    | Logical         | Logical                     | Social proof — placed after pricing to ease tension. "Others paid this and got results."                          |
| 8    | Emotional close | Emotional                   | Offer/value — discount, bonus, or perceived-value incentive                                                       |
| 9    | Emotional close | Emotional                   | Urgency — reason to act now, not later                                                                            |
| 10   | Emotional close | Emotional                   | Friction removal — checkout/conversion path is fast and obvious                                                   |

**Score:** 11 steps (1–10 + 6b), each pass/fail. Score displayed as X / 11.

### Step 6b — Pricing Audit Detail

Checks:

- **Presence:** Is there a pricing section, price point, or cost indication on the page?
- **Placement:** Does it appear after the feature section and before social proof?
- **Emotional framing:** Is at least one present?
  - Anchoring (original/competitor price visible before actual price)
  - Daily cost framing ("$1.29/day" or equivalent)
  - Decoy effect (3+ pricing tiers with a clear winner)
  - Loss aversion / risk-reversal near pricing (money-back guarantee, free trial)

**Pass:** Present, correctly placed, at least one emotional framing method detected.
**Partial:** Present, correctly placed, but no emotional framing. Shown as improvement, not critical.
**Fail:** Absent, or placed before features, or placed after social proof.

---

## Page Architecture Violations

Shown first, before journey steps. These are structural sequencing errors — elements in the wrong order regardless of their individual quality.

**Violations detected:**

- Trust signals appear after the CTA
- First CTA appears below 40% of page content
- Pricing appears before features
- Social proof appears before pricing (breaks the tension-then-resolution sequence)
- Problem identification appears after solution

---

## The Persuasion Profile

### Overview

The Persuasion Profile is an active analytical panel — not just "present / missing" but "coherent / conflicting / recommended for this page type."

**Three outputs:**

1. Which of the 11 biases are active on this page
2. A **Coherence Score** — are the active biases pointing in the same direction or fighting each other?
3. **Recommended set** — which 4–5 biases are most appropriate for this specific page type and funnel position

### The 11 Biases Tracked

| Bias ID                  | Label                  | What it is (shown to user on expand)                                                                                     |
| ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `anchoring`              | Anchoring              | People rely on the first number they see. An original price before a discounted price makes the discount feel larger.    |
| `scarcity`               | Scarcity effect        | Limited availability makes things more desirable. "Only 3 left" or "offer ends Friday" triggers loss aversion.           |
| `social_proof`           | Social proof           | People follow others in uncertainty. Reviews, customer counts, and testimonials reduce perceived risk.                   |
| `loss_aversion`          | Loss aversion          | Losses feel ~2x stronger than gains. Money-back guarantees and free trials reduce the perceived risk of acting.          |
| `decoy`                  | Decoy effect           | A third pricing option makes one of two other options more attractive. Used in pricing tiers to guide the choice.        |
| `endowment`              | Endowment effect       | People value things more once they feel ownership. Free trials and account setup before payment exploit this.            |
| `bandwagon`              | Bandwagon effect       | People do things because others are doing them. "47 stores signed up this week" gives social permission to act.          |
| `framing`                | Framing effect         | How information is presented changes perception. "$1.29/day" feels very different from "$39/month".                      |
| `hyperbolic_discounting` | Hyperbolic discounting | Immediate rewards beat future ones. "Start in 60 seconds" is more compelling than "results in 3 months".                 |
| `recency`                | Recency effect         | People weight the last thing they read most heavily. What sits immediately before the CTA determines whether they click. |
| `default_bias`           | Default bias           | People accept pre-selected options. Pre-selecting the recommended plan or annual billing increases conversion.           |

Each bias card is expandable. For **missing** biases, the expansion shows:

- What it is (plain English)
- Why it matters for this specific page
- How to add it (concrete implementation guidance)
- An example line of copy
- A "Generate fix" button (1 credit) that produces 2–3 copy options tailored to the business

For **present** biases, the expansion shows what was detected and confirms the evidence.

### Bias Coherence Analysis

Not all biases work together. The audit evaluates not just which are present but whether they are coherent as a set.

#### Conflict Pairs — create cognitive dissonance when used together

| Pair                                 | Why they conflict                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `scarcity` + `endowment`             | "Almost gone" and "take your time, try it first" send opposite urgency signals                                      |
| `anchoring` + `framing` (daily cost) | Showing a high anchor then reframing as "$1.29/day" can feel manipulative if the math is visible on the same screen |
| `default_bias` + `decoy`             | Pre-selecting an option AND using a decoy to nudge toward it is a double manipulation — perceptive visitors feel it |
| `bandwagon` + `scarcity`             | "Everyone's using this" contradicts "almost gone" — if it's so popular, why is it running out?                      |

#### Synergy Pairs — amplify each other

| Pair                                 | Why they work together                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| `social_proof` + `bandwagon`         | Reviews say it's good; bandwagon says everyone's already using it. Quality + popularity. |
| `scarcity` + `recency`               | Urgency as the last thing before the CTA is maximum-impact placement                     |
| `anchoring` + `loss_aversion`        | Original price + money-back guarantee = "worth more than you're paying, zero risk"       |
| `framing` + `hyperbolic_discounting` | "$1.29/day, start now" — tiny cost + immediate reward                                    |
| `endowment` + `default_bias`         | Account setup + pre-selected paid plan = invested visitor + path of least resistance     |
| `social_proof` + `loss_aversion`     | "4,000 stores trust us — and if it doesn't work, you get your money back"                |

### Recommended Bias Sets by Page Subtype

| Page subtype        | Recommended biases                                                              | Why                                                                                      |
| ------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `saas_signup`       | `social_proof`, `loss_aversion`, `framing`, `hyperbolic_discounting`, `recency` | Trust + risk removal + low perceived cost + immediate reward + strong close              |
| `ecommerce_product` | `social_proof`, `scarcity`, `anchoring`, `bandwagon`, `loss_aversion`           | Reviews + urgency + price anchoring + popularity + returns policy                        |
| `service_booking`   | `social_proof`, `loss_aversion`, `endowment`, `recency`, `framing`              | Trust-heavy — service purchases require more credibility. Free consultation = endowment. |

### Overoptimisation Warning

The audit warns when too many biases are active simultaneously — choice overload is itself one of the documented cognitive biases. The audit flags:

- **More than 6 active biases:** "Your page is using many persuasion signals simultaneously. This can create noise rather than clarity. Focus on your strongest 4–5 signals."
- **Any active conflict pair:** specific warning naming the pair and recommending which to keep based on page subtype
- **Active biases outside the recommended set:** shown as advisory only, not scored

### Coherence Score

Displayed in the stats strip as: `Coherence: Strong / Mixed / Conflicting`

- **Strong:** Active biases all from recommended set, no conflict pairs, 6 or fewer active
- **Mixed:** Off-recommendation signals present or minor conflict, but no hard conflicts
- **Conflicting:** One or more active conflict pairs detected

Coherence is advisory — it does not affect the CRO score. It communicates that more signals is not always better.

---

## The Audit Report Layout — Destination Page

Rendered in order:

1. **Cluster Journey Panel** (if cluster connected)
2. **Page Architecture Violations** (if any — shown before journey steps)
3. **11-Step Journey Audit** (Critical failing steps / Improvements / Strong)
4. **Persuasion Profile** (bias cards sorted: missing first, present collapsed below)

**Two-column layout:**

- Left column (wider): architecture violations + journey audit + persuasion profile
- Right column (sticky): fix priority list (top 3 actions ranked by impact) + SEO basics reference card

---

## Generated Fixes Panel

When the user clicks "Generate fix" on any item — journey step, architecture violation, or missing bias — the fix appears inline below that item. No page navigation. No modal.

Each generated fix has:

- 2–3 copy options with exact words
- One specific placement instruction per option
- Copy-to-clipboard per option
- For bias fixes: one sentence explaining the psychological mechanism ("This works because the brain defaults to the first number it sees — the anchor makes your actual price feel like a discount")

Sharkly does not edit the user's page. They implement fixes in their own CMS.

---

## AI Fix Generation Prompts

### SEO Page Fix Prompt

```
SYSTEM:
You are a conversion rate optimization expert writing fixes for an SEO page —
a page whose PRIMARY job is to rank in Google, not to convert.
Every fix MUST preserve the page's ranking potential.
Never suggest shortening content, removing keyword mentions, or adding
high-commitment sales language.
Write in plain English. Give exact copy — not generic advice.

USER:
Page type: {page_type}
Page URL: {url}
Target keyword: {keyword}
Destination page: {destination_url} — {destination_label}
Funnel stage: {funnel_stage}
AIDA stage for this page: {aida_stage}
MAP stage for this page: {map_stage}

Failing CRO items: {failing_items}
Current detected CTAs: {detected_ctas}
First link in first 400 words: {first_link_url} (expected: {destination_url})

RULES:
- ToFu (Motivation): soft CTAs only — lead magnets, guides, email opt-ins
- MoFu (Ability): medium-commitment CTAs — free assessment, demo, no-obligation call
- BoFu / focus pages (Ability + Prompt): destination page link placement + medium CTAs
- Never suggest "Book Now", "Buy Now", or purchase pressure on any SEO page
- For handoff fix: write the exact anchor text and surrounding sentence

For each failing item: state what's missing, give exact copy, include placement,
confirm "This change will not require shortening the article or changing the keyword focus."
```

### Destination Page Fix Prompt

```
SYSTEM:
You are a conversion rate optimization expert writing fixes for a destination page
whose ONLY job is to convert visitors. This page does not need to rank.

Apply the Optimal Selling Journey framework:
Emotional hook → Logical justification (features → pricing → social proof)
→ Emotional close.
Pricing raises tension. Social proof resolves it. Never reverse this sequence.
Write in plain English. Give exact copy. Maximum 3 options per fix.

USER:
Page URL: {url}
Business: {business_name} — {niche}
Connected cluster: {cluster_name}
Target customer: {customer_description}
Page subtype: {page_subtype}
Visitor context: Arrived from {upstream_page_type}.
  Completed AIDA stages upstream: {completed_aida_stages}
  Remaining job for destination page: Prompt only.

Failing journey steps: {failing_steps}
Current H1: {h1}
Current CTAs detected: {detected_ctas}
Pricing detected: {pricing_detected} — placement: {pricing_placement}
Pricing framing detected: {pricing_framing}
Trust signals detected: {detected_trust_signals}
Urgency signals: {detected_urgency}
Social proof: {detected_social_proof}
Active biases: {active_biases}
Conflicting bias pairs active: {conflict_pairs}

JOURNEY RULES:
- Steps 1-5 (Emotional): engage old brain. Hook, trust, problem, solution.
  Never use logic here.
- Step 6 (Features): justify with specifics before mentioning price.
- Step 6b (Pricing): present after features, with emotional framing.
  Use anchoring, daily cost frame, decoy, or risk-reversal near price.
- Step 7 (Social proof): place after pricing to ease the tension cost creates.
- Steps 8-10 (Emotional close): incentive, urgency, friction removal.

BIAS RULES:
- Do not suggest a bias that conflicts with an already active bias.
  Active conflicts: {conflict_pairs}
- For each bias fix include one sentence on the psychological mechanism.

Output: exact copy, precise placement, psychological reason.
```

---

## Audit Trigger Logic

```javascript
async function runCROAudit(audit_page) {
	const content = await fetchAndParseURL(audit_page.url);

	if (audit_page.page_type === 'seo_page') {
		const handoff = checkDestinationHandoff(content, audit_page.destination_url, 400);
		const ctaFit = checkCTAFunnelFit(content, audit_page.funnel_stage);
		const funnelMismatch = detectFunnelMismatch(content, audit_page.page_type);
		const emotionalHook = detectEmotionalHookAboveFold(content);
		const ctaPresent = detectCTAPresent(content);

		return {
			page_type: 'seo_page',
			audited_at: new Date(),
			cro_score: calculateSEOPageCROScore({
				handoff,
				ctaFit,
				funnelMismatch,
				emotionalHook,
				ctaPresent
			}),
			checklist: { handoff, ctaFit, funnelMismatch, emotionalHook, ctaPresent }
		};
	}

	if (audit_page.page_type === 'destination_page') {
		const journeyAudit = evaluateOptimalSellingJourney(content); // 11 steps incl. 6b
		const architectureViolations = detectArchitectureSequence(content);
		const biasInventory = detectCognitiveBiases(content);
		const biasCoherence = evaluateBiasCoherence(biasInventory, audit_page.page_subtype);

		return {
			page_type: 'destination_page',
			audited_at: new Date(),
			cro_score: calculateDestinationCROScore(journeyAudit), // out of 11
			architecture_violations: architectureViolations,
			journey_checklist: journeyAudit,
			bias_inventory: biasInventory,
			bias_coherence: biasCoherence
		};
	}
}

function evaluateBiasCoherence(biasInventory, page_subtype) {
	const activeBiases = biasInventory.filter((b) => b.present).map((b) => b.bias_id);

	const CONFLICT_PAIRS = [
		['scarcity', 'endowment'],
		['anchoring', 'framing'],
		['default_bias', 'decoy'],
		['bandwagon', 'scarcity']
	];
	const SYNERGY_PAIRS = [
		['social_proof', 'bandwagon'],
		['scarcity', 'recency'],
		['anchoring', 'loss_aversion'],
		['framing', 'hyperbolic_discounting'],
		['endowment', 'default_bias'],
		['social_proof', 'loss_aversion']
	];
	const RECOMMENDED = {
		saas_signup: ['social_proof', 'loss_aversion', 'framing', 'hyperbolic_discounting', 'recency'],
		ecommerce_product: ['social_proof', 'scarcity', 'anchoring', 'bandwagon', 'loss_aversion'],
		service_booking: ['social_proof', 'loss_aversion', 'endowment', 'recency', 'framing']
	};

	const conflicts = CONFLICT_PAIRS.filter(
		([a, b]) => activeBiases.includes(a) && activeBiases.includes(b)
	).map(([a, b]) => ({ pair: [a, b] }));

	const synergies = SYNERGY_PAIRS.filter(
		([a, b]) => activeBiases.includes(a) && activeBiases.includes(b)
	);

	const score = conflicts.length > 0 ? 'conflicting' : activeBiases.length > 6 ? 'mixed' : 'strong';

	return {
		score,
		active_count: activeBiases.length,
		conflicts,
		synergies,
		recommendations: RECOMMENDED[page_subtype] ?? RECOMMENDED.saas_signup,
		overoptimised: activeBiases.length > 6
	};
}
```

---

## Destination Handoff Check — Technical Spec

```javascript
function checkDestinationHandoff(content, destination_url, word_limit = 400) {
	const bodyText = extractBodyContent(content);
	const first400Words = getFirstNWords(bodyText, word_limit);
	const links = extractLinksFromSection(first400Words);
	const firstLink = links[0];

	if (!firstLink) {
		return {
			status: 'fail',
			evidence: 'No links found in the first 400 words of body content.',
			first_link_found: null,
			destination_match: false
		};
	}

	const normalizedFirst = normalizeUrl(firstLink.href);
	const normalizedDestination = normalizeUrl(destination_url);

	if (normalizedFirst === normalizedDestination) {
		return {
			status: 'pass',
			evidence: `First in-body link correctly points to destination: ${firstLink.href}`,
			first_link_found: firstLink.href,
			anchor_text: firstLink.text,
			destination_match: true
		};
	}

	return {
		status: 'fail',
		evidence: `First in-body link points to ${firstLink.href}, not to destination ${destination_url}. Link equity is flowing to the wrong page.`,
		first_link_found: firstLink.href,
		destination_match: false
	};
}
```

---

## Credits Model

| Action                                                              | Credits |
| ------------------------------------------------------------------- | ------- |
| Run full audit (auto on first open)                                 | 1       |
| Re-audit after changes                                              | 1       |
| Generate single fix (journey step, architecture violation, or bias) | 1       |
| Get all fixes — SEO page                                            | 3       |
| Generate all fixes — destination page                               | 6       |
| Generate FAQ (5 Q+A) for destination page                           | 2       |
| Generate testimonial request email                                  | 1       |

---

## What CRO Studio Does NOT Have

- **No UPSA score.** SEO scoring lives in the Workspace.
- **No brief generation.** CRO Studio does not create content.
- **No content editor / Tiptap.** Users implement fixes in their own CMS.
- **No internal link suggestions.** That's the Workspace internal link engine.
- **No word count guidance on destination pages.** Short is correct.
- **No keyword density check on destination pages.** Destination pages are optimised for humans.
- **No combined SEO + CRO score.** They represent opposing forces. A unified score hides which half needs fixing.

---

## Database Schema

```sql
CREATE TABLE cro_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  site_id uuid REFERENCES sites(id),

  page_url text NOT NULL,
  page_type text NOT NULL CHECK (page_type IN ('seo_page', 'destination_page')),
  page_subtype text,   -- 'saas_signup' | 'ecommerce_product' | 'service_booking'
  page_label text,

  cluster_id uuid REFERENCES clusters(id),
  target_id uuid REFERENCES targets(id),
  destination_url text,

  cro_score integer,        -- seo_page: 0–5. destination_page: 0–11.
  max_score integer,
  checklist jsonb,
  architecture_violations jsonb,
  bias_inventory jsonb,
  bias_coherence jsonb,     -- { score, active_count, conflicts, synergies, recommendations, overoptimised }

  audited_at timestamptz,
  audit_error boolean DEFAULT false,
  audit_error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX cro_audits_org_idx ON cro_audits(organization_id, updated_at DESC);
CREATE INDEX cro_audits_cluster_idx ON cro_audits(cluster_id);
```

---

## Relationship to Other Systems

- **UPSA / seoScore.ts** — Heavy SEO scoring. Lives in Workspace only. CRO Studio never calls it.
- **runSeoChecks() / ecommerce.ts** — Light SEO 6-check system for destination pages. CRO Studio references results in a collapsed "SEO Basics" card — does not re-run them.
- **targets.destination_page_url** — Read to pre-populate destination URL and run handoff check.
- **targets + clusters** — Read by `buildClusterJourneyData()` to build the three-node cluster journey panel.
- **Funnel Visualizer / Customer Journey tab** — "Open in CRO Studio" CTA routes here with context pre-filled.
- **Workspace** — "Optimize CRO" button routes here with context pre-filled.

---

## Build Order for Cursor

1. ✅ DB migration — `cro_audits` table with `page_subtype` and `bias_coherence` columns
2. ✅ Backend — `fetchAndParseURL()` utility
3. ✅ Backend — `checkDestinationHandoff()` — first-link-in-400-words
4. ✅ Backend — `evaluateSEOPageCRO()` — 5-item SEO page checklist
5. ✅ Backend — `evaluateOptimalSellingJourney()` — 11 steps including 6b (pricing)
6. ✅ Backend — `detectArchitectureSequence()` — structural violations including pricing placement
7. ✅ Backend — `detectCognitiveBiases()` — 11-bias inventory
8. ✅ Backend — `evaluateBiasCoherence()` — conflict/synergy/coherence/overoptimisation analysis
9. ✅ Backend — `buildClusterJourneyData()` — reads cluster + target, returns three-node funnel data
10. ✅ Backend — `runCROAudit()` orchestrator
11. ✅ Backend — AI fix generation endpoint — SEO page prompt, destination page prompt, bias fix generation
12. ✅ Frontend — CRO Studio nav item with subscription gate
13. ✅ Frontend — CRO Studio home screen — two tabs (SEO Pages / Destination Pages)
14. ✅ Frontend — Add Page modal — URL, page type, page subtype (destination), destination URL (SEO), validation
15. ✅ Frontend — Cluster Journey Panel — three-node horizontal flow with AIDA/MAP/mindset labels per node
16. ✅ Frontend — SEO Page audit view — header, 5-item checklist, fix panel
17. ✅ Frontend — Destination Page audit view — architecture violations, 11-step journey, persuasion profile
18. ✅ Frontend — Persuasion Profile — bias cards expandable (what/why/how/example for missing), coherence score, conflict warnings with named pairs, synergy callouts, recommended set, overoptimisation warning
19. ✅ Frontend — Generated fixes panel — inline, 2-3 options, copy-to-clipboard, psychological mechanism note on bias fixes
20. ✅ Frontend — Fix priority sidebar — top 3 actions ranked by impact
21. ✅ Frontend — SEO Basics reference card
22. ✅ Frontend — "Optimize CRO" button in Workspace
23. ✅ Frontend — "Open in CRO Studio" CTA wiring in Cluster Detail
24. ✅ Frontend — Re-audit prompt when audit > 30 days old
25. ✅ Wire credits consumption
26. ✅ Remove Workspace CRO tab skeleton

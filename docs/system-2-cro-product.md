# Sharkly — System 2: Full CRO Product (V2 Design Spec)
## The CRO Add-On — Audit, Generate, Instruct

---

## What This Is

System 2 is a separate product tier built on top of the existing Sharkly SEO tool. It is not a landing page builder. It is a full conversion audit and guidance system — Sharkly analyzes what the user has built, diagnoses every conversion failure, generates the exact copy to fix each one, and tells the user precisely where to put it.

The user builds their own page in their own CMS. Sharkly's job is to make that page convert.

**Why it exists at V2 and not Beta:** The CRO add-on is only valuable to a user who already has traffic or is close to having it. That means they need to have gotten value from the SEO tool first. Shipping the add-on before users have experienced SEO value means selling to people who aren't ready for it. By V2, users who stayed subscribed have rankings beginning to move — now they need to convert that traffic. The demand is real and earned, not assumed.

**Pricing:** Add-on bundle on top of base subscription. Exact price to be determined by V2, but the model is: base SEO subscription + CRO add-on. The add-on only works when the customer already believes in Sharkly's value. System 1 earns that belief. System 2 monetizes it.

**The value proposition in one sentence:**
"We make sure the content you're ranking doesn't waste the traffic."

---

## The Business Case

### The Retention Problem System 2 Solves at Scale

System 1 bridges the 3–6 month SEO delay with immediate diagnostic value. System 2 bridges it with actual revenue impact. The difference:

- System 1: "Your page has no trust signals above the fold." — The user knows the problem.
- System 2: "Here is the exact sentence to add, exactly where to put it, and here is the copy for your H1, your CTA, your testimonial request email, and your FAQ." — The user fixes the problem completely.

System 1 is diagnosis. System 2 is treatment. A user who implements System 2 fixes and sees their conversion rate improve has a visceral, measurable reason to stay subscribed. They are no longer paying for future rankings. They made money this month because of Sharkly.

### The Market Gap

- Semrush and Ahrefs: SEO only. No conversion guidance.
- Unbounce and Instapage: Landing page builders. No SEO. No content strategy. No intent awareness.
- Generic CRO tools (Hotjar, Optimizely): Require traffic data, A/B tests, developer setup. Completely inaccessible to small businesses.

Nobody connects SEO intent to conversion strategy in a single tool. Nobody tells a small business owner: "This page ranked for a commercial keyword — here is the exact CRO architecture it needs to convert the visitors who are arriving from that search." Sharkly does.

---

## What System 2 Is NOT

- Not a landing page builder. No drag-and-drop. No hosted pages. No templates to fill in.
- Not an A/B testing tool. No split testing infrastructure.
- Not a heatmap or analytics tool. No tracking code, no session recordings.
- Not a popups or email capture tool. No embeddable widgets.

System 2 generates words and instructions. The user implements. This constraint is a feature, not a limitation — it keeps the product simple, keeps Sharkly positioned as an intelligence tool, and avoids the complexity that killed the landing page builder attempt.

---

## The Three-Step System (Expanded for V2)

### Step 1 — Full Conversion Audit

The user submits a URL or works from existing workspace content. System 2 runs a comprehensive audit across five dimensions — significantly deeper than the System 1 checklist.

**Dimension 1: Page Architecture Audit**
Is the page structured in the right sequence for its page type? (See Sequential Page Architecture section below.)

**Dimension 2: Intent-Matched CRO Checklist**
The full 8-item checklist from System 1, but with deeper detection and richer evidence.

**Dimension 3: Funnel Coherence Audit**
Do the CTAs, trust signals, objection removal, and commitment level all match where this visitor is in their journey?

**Dimension 4: Psychological Triggers Audit**
Are the right cognitive biases being activated at the right moments? (See Persuasion Layer section below.)

**Dimension 5: Objection Removal Audit**
Are the specific objections a visitor at this funnel stage has being addressed before they encounter the CTA?

Output: A full audit report — scored, prioritised by revenue impact, plain-English findings.

### Step 2 — Generate

For each failing audit item, Sharkly generates the specific copy. Not suggestions — actual usable words.

| Failing Item | What Gets Generated |
|---|---|
| Weak or missing H1 | 3 H1 options with keyword, emotional hook, and clarity |
| Missing or wrong CTA | 3 CTA options matched to funnel stage and business type |
| No trust signals | A credibility statement built from business info (years, clients, reviews) |
| No testimonials | A testimonial request email template + 2 example testimonials in the right format |
| No FAQ | 5 FAQ questions + answers based on the most common objections at this funnel stage |
| No urgency signal | 3 urgency/scarcity line options appropriate to the business type |
| Weak social proof | A specific social proof statement using their business data |
| Poor page opening | A rewritten above-fold section — emotional hook + problem identification |

All generation is powered by Claude (same as brief generation). Pulls from `business_name`, `niche`, `customer_description`, `author_bio`, and page content. Credits consumed per generation run.

### Step 3 — Instruct

For every generated piece of copy, one plain-English placement instruction. Never assumes CMS knowledge. Written for a business owner, not a developer.

Examples:
- "Copy this H1 and paste it as the very first line on your page — before any images, before your navigation, before anything else."
- "Add this sentence directly above your 'Get a Quote' button. It should be the last thing they read before they click."
- "Put this FAQ section after your main service description but before your final CTA. Use your website's accordion or FAQ block."
- "This testimonial goes in its own section with a light background colour to make it stand out. Place it between your service list and your contact form."

---

## Sequential Page Architecture

This is the core insight that separates System 2 from any existing tool. Different page types need fundamentally different content sequences. Most small business pages are structured for SEO coverage (information top to bottom) when they should be structured for the visitor's decision journey.

### Service / Money Page Architecture
These pages must do two jobs simultaneously — rank AND convert. The structure resolves the tension by serving different visitor states at different scroll depths.

```
ABOVE THE FOLD (visitor is ready NOW — convert immediately)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
H1 with target keyword
Hard CTA (phone number + "Get a Quote" button)
One trust signal (review count or years in business)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIRST SCROLL (visitor needs slight convincing — emotional hook)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Problem identification — speak their pain directly
Why this problem matters / cost of inaction
Your solution framed as relief, not a service list
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MIDDLE SECTION (Google reads this + logical-brain visitor researching)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Full SEO content — entities, H2s, topical depth
Process / how it works
Credentials and experience details
FAQ with schema markup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSION CLOSE (visitor read everything — now close them)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Specific named testimonials with results
Urgency or scarcity signal
Second hard CTA — different angle from the top CTA
Risk removal (guarantee, no-obligation language)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Ecommerce Product Page Architecture
Primary job is conversion. Light SEO. Fast and frictionless.

```
ABOVE THE FOLD
━━━━━━━━━━━━━━
Product name (H1) + primary image
Price with anchoring (original price shown first if discounted)
Add to cart button — prominent, high contrast
Star rating + review count (social proof, immediate)
━━━━━━━━━━━━━━
FIRST SCROLL
━━━━━━━━━━━━━━
Key benefits (3–5 bullet points — outcomes, not features)
Scarcity signal if applicable ("Only 8 left" / "Ships today if ordered by 3pm")
Trust signals — guarantee, returns policy, secure checkout badge
━━━━━━━━━━━━━━
MIDDLE
━━━━━━━━━━━━━━
Full product description (SEO value + logical-brain detail)
Size/variant guide if relevant
━━━━━━━━━━━━━━
BOTTOM
━━━━━━━━━━━━━━
Customer reviews section (specific, named, result-oriented)
Frequently bought together / related products (upsell)
Second add to cart button
━━━━━━━━━━━━━━
```

### ToFu Article Architecture
Primary job is ranking and trust-building. Conversion is secondary — soft only.

```
ABOVE THE FOLD
━━━━━━━━━━━━━━
H1 — clear, keyword-present, answers the search intent
Author bio / publication credibility (EEAT signal)
━━━━━━━━━━━━━━
OPENING
━━━━━━━━━━━━━━
Emotional hook — speak the pain or curiosity directly
Promise of what this article delivers
━━━━━━━━━━━━━━
BODY
━━━━━━━━━━━━━━
Full SEO content — depth, entities, H2s as answerable questions
Internal links to cluster focus page (equity flow)
FAQ with schema
━━━━━━━━━━━━━━
BOTTOM
━━━━━━━━━━━━━━
Soft CTA only — "Want to go deeper? Download the free guide."
OR internal link to MoFu/BoFu page with clear next-step framing
━━━━━━━━━━━━━━
```

**The audit checks page architecture sequence.** If a service page has its testimonials above the fold and the problem statement buried in the middle, that is an architecture failure — not just a missing element. System 2 detects sequence violations, not just presence/absence.

---

## The Persuasion Layer (Cognitive Bias Audit)

Sourced directly from the Neuroscience of Selling framework. The 15 cognitive biases are active at different funnel stages. System 2 detects which ones are present and which critical ones are missing for the page type.

### The Optimal Selling Journey (10 Steps)
From the neuroscience source material — the sequence that works with brain biology:

1. Enticing content / emotional hook (old brain — emotion)
2. Well-designed, credible page appearance (old brain — trust)
3. Showcase expertise and credentials (old brain — authority)
4. Identify the customer's problem (old brain — pain activation)
5. Describe the solution (old brain — relief)
6. Go into depth on how it works (logical brain — features/process)
7. Testimonials and reviews that confirm it works (logical brain — validation)
8. Discount, bonus, or relevant offer (old brain — reward)
9. Urgency signal (old brain — scarcity/fear of missing out)
10. Frictionless checkout/contact (old brain — ease)

This sequence maps to the Sequential Page Architecture above. Steps 1–5 are above-fold and first-scroll. Steps 6–7 are the middle section. Steps 8–10 are the conversion close.

### Detectable Bias Signals

System 2 scans content for the presence or absence of these signals. Detection is regex/pattern-based on plain text.

```javascript
const PERSUASION_SIGNALS = {

  // SCARCITY (Step 9 — drives action)
  // Active at: BoFu, money pages, product pages
  scarcity: {
    patterns: /limited\s+(time|offer|stock|spots?)|only\s+\d+\s+(left|remaining|available)|ends?\s+(soon|sunday|\w+day)|before\s+(it's|they're)\s+gone|this\s+week\s+only|expires?/i,
    funnel_stages: ['money_page', 'service_page', 'bofu_article'],
    impact: 'high'
  },

  // SOCIAL PROOF (Step 7 — validates decision)
  // Active at: MoFu and BoFu
  social_proof: {
    patterns: /\d[\d,]*\+?\s*(clients?|customers?|reviews?|five[\s-]star)|★|\d+\s*\/\s*5\s*stars?|as\s+seen\s+in|featured\s+in/i,
    funnel_stages: ['service_page', 'money_page', 'bofu_article', 'mofu_comparison'],
    impact: 'high'
  },

  // LOSS AVERSION (removes purchase barrier)
  // Active at: MoFu and BoFu
  loss_aversion: {
    patterns: /money[\s-]back\s+guarantee|risk[\s-]free|no\s+(obligation|commitment|contract)|free\s+cancellation|nothing\s+to\s+lose|full\s+refund/i,
    funnel_stages: ['service_page', 'money_page', 'mofu_comparison'],
    impact: 'high'
  },

  // ANCHORING (price perception)
  // Active at: product pages, pricing sections
  anchoring: {
    patterns: /was\s+\$[\d,]+|rrp\s*:?\s*\$[\d,]+|save\s+\$[\d,]+|originally\s+\$[\d,]+|crossed-out price pattern/i,
    funnel_stages: ['money_page'],
    impact: 'medium'
  },

  // AUTHORITY (Steps 2–3 — credibility)
  // Active at: all BoFu, MoFu comparison
  authority: {
    patterns: /certif|licens|award|featured\s+in|accredit|years?\s+(of\s+)?experience|established\s+\d{4}|as\s+seen\s+in/i,
    funnel_stages: ['service_page', 'money_page', 'bofu_article', 'mofu_comparison'],
    impact: 'high'
  },

  // URGENCY (Step 9 — prompt to act now)
  // Active at: BoFu, product pages
  urgency: {
    patterns: /today\s+only|act\s+now|don't\s+(wait|miss)|limited\s+availability|call\s+now|book\s+today|respond\s+within|available\s+this\s+week/i,
    funnel_stages: ['service_page', 'money_page', 'bofu_article'],
    impact: 'medium'
  },

  // RECIPROCITY (lead magnet, free value)
  // Active at: ToFu, MoFu
  reciprocity: {
    patterns: /free\s+(guide|download|checklist|consultation|assessment|report|ebook)|download\s+the|get\s+the\s+free/i,
    funnel_stages: ['tofu_article', 'mofu_article'],
    impact: 'medium'
  },

  // PROBLEM IDENTIFICATION (Step 4 — pain activation)
  // Active at: all pages
  problem_identification: {
    patterns: /\b(struggling|frustrated|tired\s+of|sick\s+of|dealing\s+with|problem\s+with|challenge|pain\s+point)\b/i,
    funnel_stages: ['service_page', 'tofu_article', 'mofu_article'],
    impact: 'medium'
  }
}
```

### Persuasion Score Display

Not shown as a score — shown as a checklist of present/missing signals appropriate to the page type. For each missing critical signal, one plain-English explanation of why it matters and one example of how to add it.

Example output for a service page missing scarcity and loss aversion:

> **Missing: Risk Removal Signal**
> Visitors on this page are being asked to commit before you've removed their fear of making the wrong decision. Add a no-obligation guarantee near your CTA.
> *Suggested copy: "No obligation. No contract. If you're not satisfied after your first visit, you pay nothing."*

> **Missing: Urgency Signal**
> Nothing is prompting your visitor to act now rather than think about it and forget. Add a soft urgency line near your bottom CTA.
> *Suggested copy: "We typically book out 2–3 weeks — secure your slot before the calendar fills."*

---

## Objection Removal Audit

From the conversion rates source material: 80–90% of visitors have objections that prevent purchase. Most pages never address them. System 2 identifies which objections are standard for the page's funnel stage and checks whether the content addresses them.

### Objection Map by Funnel Stage

**ToFu objections** (denial stage — "I don't know if I even have this problem")
- "Is this actually relevant to me?"
- "Is this serious enough to do something about?"
- Sharkly checks: Does the content identify the problem and validate its severity?

**MoFu objections** (evaluation stage — "Why you over someone else?")
- "How do I know you're qualified?"
- "What if it doesn't work for my situation?"
- "What do other people like me say about this?"
- Sharkly checks: Credentials present? Case study or testimonial? Comparison section?

**BoFu objections** (commitment stage — "What if this goes wrong?")
- "How much does this actually cost?"
- "What happens after I contact you?"
- "What if I'm not satisfied?"
- "How quickly can you actually help me?"
- Sharkly checks: Pricing transparency, process explanation, guarantee, response time.

### Detection Logic

```javascript
const OBJECTION_CHECKS = {
  tofu_article: [
    { objection: 'Is this relevant to me?', check: () => hasProblemIdentification(content) },
    { objection: 'Is this serious?', check: () => hasCostOfInaction(content) }
  ],
  mofu_comparison: [
    { objection: 'Why you vs others?', check: () => hasComparisonSection(content) },
    { objection: 'Are you qualified?', check: () => hasCredentials(content) },
    { objection: 'Social proof?', check: () => hasTestimonials(content) }
  ],
  service_page: [
    { objection: 'How much does it cost?', check: () => hasPricingReference(content) },
    { objection: 'What happens after I contact you?', check: () => hasProcessExplanation(content) },
    { objection: 'What if I\'m not satisfied?', check: () => hasGuarantee(content) },
    { objection: 'Are you legitimate?', check: () => hasTrustSignals(content) }
  ],
  money_page: [
    { objection: 'Is this secure?', check: () => hasSecuritySignal(content) },
    { objection: 'Can I return it?', check: () => hasReturnPolicy(content) },
    { objection: 'What do others think?', check: () => hasReviews(content) }
  ]
}

// Detection helpers
function hasPricingReference(content) {
  return /pricing|from\s+\$[\d,]+|starting\s+at|cost|quote|estimate|per\s+(month|year|hour|job)/i.test(content)
}
function hasProcessExplanation(content) {
  return /(step\s+\d|how\s+it\s+works|what\s+happens\s+(next|after)|our\s+process|what\s+to\s+expect)/i.test(content)
}
function hasGuarantee(content) {
  return /guarantee|warranty|money[\s-]back|risk[\s-]free|satisfaction|no\s+obligation/i.test(content)
}
function hasSecuritySignal(content) {
  return /secure|encrypted|ssl|safe\s+checkout|protected|256[\s-]bit/i.test(content)
}
function hasReturnPolicy(content) {
  return /return|refund|exchange|30[\s-]day|money[\s-]back/i.test(content)
}
function hasCostOfInaction(content) {
  return /(if\s+(you\s+)?(don't|ignore|wait)|left\s+untreated|gets\s+worse|cost\s+of|without\s+(treatment|action|help))/i.test(content)
}
```

---

## Full Audit Report — Output Format

The audit report is the primary deliverable of System 2. It replaces the simple checklist view with a comprehensive prioritised action plan.

### Report Structure

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE CONVERSION REPORT
[Business Name] — [Page Title]
Page Type: Service Page  |  SEO Score: 84/115  |  CRO Score: 3/8
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL ISSUES — Fix these first. Highest revenue impact.

🔴 No trust signals before your CTA
   Your visitors are being asked to commit before they have any 
   reason to trust you. Your competitors all show review counts 
   or credentials before asking for contact.
   → Generate Fix (1 credit)

🔴 No urgency signal at the bottom
   Nothing is prompting your visitor to act now. They will think 
   about it and forget.
   → Generate Fix (1 credit)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPROVEMENTS — Fix these after the critical issues.

🟡 FAQ doesn't address pricing objection
   Your FAQ has 4 questions but none of them address "how much 
   does this cost?" — the most common reason visitors leave 
   without contacting you.
   → Generate Fix (1 credit)

🟡 Testimonials are generic — no names or results
   Your testimonials don't build trust because they aren't 
   specific. "Great service!" tells a visitor nothing. A named 
   testimonial with a result does.
   → Generate Fix (1 credit)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STRONG — Keep these as they are.

✅ H1 is clear with target keyword
✅ Hero CTA is present above the fold
✅ FAQ section with schema markup present

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GENERATE ALL FIXES  (4 credits)
```

Each "Generate Fix" button fires a targeted generation prompt for that specific item. "Generate All Fixes" batches them in one API call.

---

## Generation Prompts — System 2

These are deeper and more specific than the System 1 Section 8.6 prompt. Each failing item type has its own targeted prompt.

### Master System Prompt (all generations)
```
You are a conversion copywriter for small businesses.
You write plain, direct, human English.
No buzzwords. No corporate language. No generic phrases.
Every word must be specific to this business, this customer, this page.
Write as if you know this business personally.
Always generate exactly the number of options requested.
Format each option clearly numbered.
```

### H1 Generation Prompt
```
Business: {business_name} — {niche}
Location: {location} (if local business)
Target keyword: {target_keyword}
Target customer: {customer_description}
Current H1: {current_h1}
Page type: {page_type}

Generate 3 H1 options. Each must:
- Contain the target keyword or a natural variant
- Be under 65 characters
- For service/money pages: lead with the customer's outcome, not the service name
- For informational pages: answer the search query directly and create curiosity
- Sound like a human wrote it, not a marketing department

Bad example: "Professional Drain Cleaning Services in London"
Good example: "London Drain Cleaning — Fixed Fast, No Hidden Costs"
```

### CTA Generation Prompt
```
Business: {business_name} — {niche}
Page type: {page_type}
Funnel stage intent: {intent_description}
Current CTA (if any): {current_cta}
Customer description: {customer_description}

Generate 3 CTA options appropriate for a {page_type}.

Commitment level rules:
- tofu_article: Soft only. Lead magnet, email capture, "read more". Never "buy" or "contact".
- mofu: Medium. Free consultation, assessment, demo. Lower perceived risk, higher perceived value.
- service_page / money_page / bofu: Hard. Direct action. Phone number, quote, book, buy. Add urgency where natural.

For each CTA option provide:
1. The button text (under 6 words)
2. The supporting line that appears directly above the button (1 sentence)
3. Where on the page to place it
```

### Trust Signal Generation Prompt
```
Business: {business_name}
Years in business: {years} (if known from project settings)
Niche: {niche}
Location: {location}
Author/owner bio: {author_bio}

Generate 3 trust signal options. Each is a single line of credibility copy.
Must be specific — use actual numbers or credentials where available.
If years/numbers unknown, generate a template with [FILL IN] placeholders.

Examples of good trust signals:
- "Trusted by 400+ London homeowners since 2011"
- "5-star rated across 180 Google reviews"
- "Licensed and insured — NICEIC approved contractor"
- "12 years fixing [niche] problems across [location]"

Generate options across these types: experience-based, volume-based, credential-based.
```

### Testimonial Request Email Template
```
Business: {business_name}
Niche: {niche}
Customer description: {customer_description}

Generate a short email template the business owner can send to past customers 
to request a specific, useful testimonial.

The email must:
- Be casual and personal, not corporate
- Ask for 3 specific things: their name, what problem they had, what result they got
- Be under 150 words
- Include a subject line

Also generate 2 example testimonials showing what a good response looks like.
A good testimonial has: a name, a specific problem, a specific result, and sounds human.

Bad: "Great service, would recommend!" — Sarah
Good: "I'd been putting off fixing my drainage for two years. These guys came same-day 
       and had it sorted in 90 minutes. Haven't had a problem since." — James T., Croydon
```

### FAQ Generation Prompt
```
Business: {business_name}
Niche: {niche}
Page type: {page_type}
Funnel stage: {funnel_stage}
Target keyword: {target_keyword}
Customer description: {customer_description}

Generate 5 FAQ questions and answers for this page.
Each question must be something a real visitor at this funnel stage actually asks.

For {funnel_stage} pages, the most common unanswered objections are:
{objection_list_for_funnel_stage}

Rules:
- Questions must be written exactly as a customer would ask them, not how an SEO tool would
- Answers must be 2–4 sentences — enough to remove the objection, not an essay
- At least one question must address cost or pricing
- At least one question must address what happens after they contact/buy
- Tone must match {business_name}'s voice

Format for schema markup compatibility:
Q: [Question]
A: [Answer]
```

### Urgency / Scarcity Generation Prompt
```
Business: {business_name}
Niche: {niche}
Page type: {page_type}
Business model: {service_based | ecommerce | saas}

Generate 3 urgency or scarcity signals appropriate for this business.

Rules:
- Must be honest — do not fabricate scarcity that doesn't exist
- Service businesses: use booking availability, response time, or seasonal demand
- Ecommerce: use stock levels, shipping cutoffs, or limited offers
- SaaS: use trial expiry, onboarding slots, or pricing tier limits
- Never use fake countdown timers or manufactured urgency
- Keep each line under 20 words

Examples:
- "We're typically booked 2–3 weeks out — secure your spot today"
- "Free site audit available this week — only 5 slots remaining"
- "Same-day response guaranteed when you call before 2pm"
```

---

## Page Architecture Detector

System 2 checks whether the page content is sequenced correctly for its type — not just whether elements are present, but whether they appear in the right order.

```javascript
function detectArchitectureSequence(content, page_type) {
  const sections = splitIntoSections(content) // array of content chunks by approximate position
  const positions = {
    cta_first: findFirstCTAPosition(content),      // 0-1 normalized position
    trust_first: findFirstTrustSignalPosition(content),
    testimonial_position: findTestimonialPosition(content),
    problem_statement: findProblemStatementPosition(content),
    faq_position: findFAQPosition(content),
    urgency_position: findUrgencyPosition(content)
  }

  const violations = []

  if (page_type === 'service_page' || page_type === 'money_page') {
    // Trust must come before CTA
    if (positions.trust_first > positions.cta_first) {
      violations.push({
        type: 'trust_after_cta',
        message: 'Your trust signals appear after your CTA. Visitors are being asked to commit before they have a reason to trust you. Move your credentials or review count above your contact button.'
      })
    }
    // CTA must be in first 25% of page
    if (positions.cta_first > 0.25) {
      violations.push({
        type: 'cta_below_fold',
        message: 'Your first CTA appears too far down the page. Visitors who are ready to contact you right now have no way to do so when they land. Add a CTA in the first section.'
      })
    }
    // Testimonials should be near the bottom (conversion close)
    if (positions.testimonial_position < 0.4) {
      violations.push({
        type: 'testimonials_too_high',
        message: 'Your testimonials appear near the top of the page. They are most powerful as a conversion close — move them to the bottom section above your final CTA.'
      })
    }
  }

  if (page_type === 'tofu_article') {
    // Problem statement should be near the top
    if (positions.problem_statement > 0.3) {
      violations.push({
        type: 'no_emotional_hook',
        message: 'Your article doesn\'t address the reader\'s pain in the opening. Lead with the problem — why does this matter to them? — before going into information.'
      })
    }
  }

  return violations
}
```

Architecture violations are displayed at the top of the audit report as a separate section — "Page Structure Issues" — because they require restructuring, not just adding copy.

---

## Database Changes for System 2

```sql
-- Extend pages table
ALTER TABLE pages ADD COLUMN cro_v2_audit jsonb;
-- Full System 2 audit result
-- {
--   audited_at: timestamp,
--   page_type: string,
--   architecture_violations: array,
--   persuasion_signals: { present: [], missing: [] },
--   objection_coverage: { covered: [], uncovered: [] },
--   critical_issues: array,
--   improvements: array,
--   passing: array,
--   generated_fixes: { item_key: { copy: string, instruction: string, generated_at: timestamp } }
-- }

ALTER TABLE pages ADD COLUMN cro_v2_score integer DEFAULT 0;
-- Composite score across all 5 audit dimensions
-- Displayed as percentage

-- Projects table extension (for generation context)
ALTER TABLE projects ADD COLUMN author_bio text;
-- "Who is writing/running this business? Role, experience, credentials."
-- Feeds into all System 2 generation prompts as {author_bio}

ALTER TABLE projects ADD COLUMN business_years integer;
-- Years in business — used in trust signal generation

ALTER TABLE projects ADD COLUMN business_location text;
-- Primary service location — used in local trust signals and CTA copy
```

---

## UI Specification — System 2

System 2 lives as a separate section from the existing workspace. It has its own route.

### Route
`/workspace/[pageId]/cro` — separate from the existing SEO intelligence panel.

### Screen Layout

**Header**
Page title + CRO V2 badge + Run Full Audit button (credits cost shown).

**Architecture Issues block** (shows first if violations exist)
Red banner with each architecture violation listed. Each has a "Generate Fix" button.

**Audit Report block**
Three sections: Critical Issues (red), Improvements (amber), Strong (green).
Each issue has: plain-English description, why it matters, "Generate Fix" button.
"Generate All Fixes" batch button at the bottom.

**Generated Fixes panel** (right side or below, expands on generation)
For each generated fix:
- The copy (H1 options, CTA options, etc.) displayed clearly
- The placement instruction in a highlighted box
- "Copy to clipboard" button for each option

**Persuasion Signals block** (collapsed by default, expandable)
List of expected signals for this page type. Present = green checkmark. Missing = amber with one-line explanation and suggested copy.

**Objection Coverage block** (collapsed by default)
List of objections for this funnel stage. Covered = green. Uncovered = shows the objection question + "Generate Answer" button.

---

## Credits Model for System 2

| Action | Credits |
|---|---|
| Run Full Audit | 2 credits |
| Generate single fix (H1, CTA, trust signal, urgency) | 1 credit each |
| Generate FAQ (5 questions + answers) | 2 credits |
| Generate testimonial template + examples | 1 credit |
| Generate All Fixes (full page) | 6 credits |
| Re-run audit after changes | 1 credit |

System 2 is higher credit consumption than System 1 because the generation is deeper, more specific, and more valuable. The credit model incentivises the add-on tier which includes higher credit allocation.

---

## Key Decisions Locked

- System 2 is a V2 add-on. Do not build before Beta or V1.
- Pricing is add-on bundle on top of base subscription. Unlock only after users have experienced System 1 value.
- System 2 is an audit and generation tool. Never a page builder. Users implement in their own CMS.
- SEO score and CRO score remain separate. System 2 displays both alongside each other on the audit report but never combines them.
- The Sequential Page Architecture insight is the core differentiator. No existing tool tells users that their service page structure is wrong for the visitor journey — only that individual elements are missing.
- The persuasion layer (cognitive bias audit) is a System 2 exclusive. Do not include in System 1. It requires the fuller context and generation capability of the V2 product to be useful.
- Author bio / business years / location fields added to projects table at System 2 build time. These unlock specificity in all generation prompts that System 1 cannot achieve with generic context.

---

## Relationship to System 1

System 1 and System 2 are additive, not duplicative.

| Capability | System 1 | System 2 |
|---|---|---|
| 8-item checklist | ✅ Full | ✅ Deeper detection |
| Intent-aware scoring | ✅ | ✅ |
| Funnel mismatch warning | ✅ | ✅ + architecture violations |
| AI copy suggestions | ✅ Basic (3 credits) | ✅ Full generation per item |
| Page architecture sequence audit | ❌ | ✅ |
| Cognitive bias / persuasion audit | ❌ | ✅ |
| Objection removal audit | ❌ | ✅ |
| Testimonial request email | ❌ | ✅ |
| Urgency/scarcity generation | ❌ | ✅ |
| Full prioritised audit report | ❌ | ✅ |

A user running System 1 gets a scored checklist and basic suggestions. A user running System 2 gets a complete conversion strategy for their page — every failure diagnosed, every fix generated, every placement instructed.

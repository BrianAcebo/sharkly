# Sharkly — Local SEO Module (Build Spec)
## The Local Business Rankings System — V2 Add-On

---

## What This Is

The Local SEO module is a dedicated product layer for businesses that derive revenue from a defined geographic area — local service businesses, brick-and-mortar stores, multi-location businesses. For these users, the Google Local Pack (the three-listing map result) is often more valuable than organic rankings. A plumber who appears in the Local Pack for "emergency plumber London" generates more calls than one who ranks #1 organically for the same term.

The signals that determine Local Pack rankings are fundamentally different from the signals that determine organic rankings. The existing Sharkly UPSA, cluster architecture, and content engine optimise for organic. The Local SEO module optimises for the Local Pack — and makes both systems aware of each other.

**Why it's V2:** Local SEO requires data inputs that don't exist in the current data model — Google Business Profile connection, NAP field set, review data. The existing user base needs to get value from the core SEO product first. By V2, local service businesses will have seen organic traction and be asking the next question: "Why am I not in the map pack?" That's the moment this module answers.

**Pricing:** Add-on (similar to CRO Studio model) OR included in Scale tier — decision deferred to V2 pricing review.

---

## Research Grounding

The Local Pack ranking model is documented in the Complete SEO System (section 3.7):

```
LocalRank = f(
  Relevance  × 0.35,   // Does the business match what was searched?
  Distance   × 0.35,   // How close is the business to the searcher?
  Prominence × 0.30    // How well-known is the business online?
)

Prominence sub-factors:
  GoogleBusinessProfile_Completeness  × 0.30
  ReviewCount_and_Score               × 0.25
  NAP_CitationConsistency             × 0.20
  BacklinkProfile                     × 0.15
  OnPage_LocalSignals                 × 0.10
```

**Distance** is not actionable — it's determined by the searcher's location. Sharkly does nothing with Distance.

**Relevance** is partially addressed by the existing content engine — keyword targeting and entity coverage already improve relevance signals. Local SEO adds the GBP-side of relevance (categories, services, description).

**Prominence** is the primary actionable surface. Four of the five Prominence sub-factors are directly actionable and none of them are covered by the existing spec.

**Patent grounding:**
- NAP citations as entity establishment signals — US7346839B2 (Historical Data). Every citation creates a link discovery event. Consistent NAP resolves entity disambiguation in Google's Knowledge Graph.
- GBP as reference query anchor — US8682892B1 (Panda). A verified GBP listing with regular activity contributes to the branded search signal pool that feeds the group modification factor.
- Review velocity — not directly patent-grounded, but confirmed in Google's own local ranking documentation and the Quality Rater Guidelines as a Prominence sub-signal.
- Local entity schema — US9940367B1 + US9959315B1 (passage scoring). LocalBusiness schema with sameAs markup formally connects the business entity to Google's Knowledge Graph, enabling richer context signals across all pages.

---

## Scope — What This Module Does

Sharkly is an audit-and-guidance tool. The Local SEO module follows the same principle — it does not manage GBP, does not submit citations, does not collect reviews. It tells the user what is wrong and what to do, with specificity.

**In scope:**
- GBP completeness audit with scored checklist
- NAP consistency fields and mismatch detection
- Review score and velocity tracking
- LocalBusiness + AggregateRating + sameAs schema generation
- Local keyword entity detection in content
- On-page local signals audit per page
- Local content strategy guidance (service area pages, location landing pages)

**Not in scope:**
- GBP management / direct API write access
- Citation submission service
- Review solicitation automation
- Local rank tracking (separate from GSC)

---

## Niche Detection — When Local SEO Module Activates

The module is not relevant for pure ecommerce or SaaS businesses with no geographic service area. It activates based on two signals:

```javascript
function detectLocalBusiness(project) {
  const localIndicators = [
    // Platform signal
    project.platform === 'local_service',

    // Niche keyword patterns
    /\b(plumb|electr|hvac|dentist|lawyer|solicitor|accountant|
       physio|landscap|clean|pest|locksmith|roofer|builder|
       restaurant|salon|clinic|garage|mechanic)\b/i
      .test(project.niche),

    // Explicit location in business description or keywords
    project.customer_description?.match(
      /\b(in|near|around|serving|based in|located in)\s+[A-Z][a-z]+/
    ),

    // User has filled in GBP URL in project settings
    !!project.gbp_url
  ]

  // Two or more signals = local business
  return localIndicators.filter(Boolean).length >= 2
}
```

When `detectLocalBusiness()` returns true:
- Local SEO tab appears in the Technical screen (or its own nav item — see UI section)
- Local content strategy guidance is injected into brief generation
- LocalBusiness schema is added to the schema generator output
- EEAT checklist gains local-specific items (GBP verified, NAP present, reviews linked)

---

## Data Model Changes

```sql
-- Extend projects table with local business fields
ALTER TABLE projects ADD COLUMN is_local_business boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN gbp_url text;
-- Google Business Profile URL — required for local module
-- Format: https://www.google.com/maps/place/...

ALTER TABLE projects ADD COLUMN business_address text;
-- Full address as it should appear consistently across ALL citations
-- Format: "123 Main Street, Suite 100, Miami, FL 33101"
-- This is the canonical NAP address — used for mismatch detection

ALTER TABLE projects ADD COLUMN business_phone text;
-- Canonical phone number — format as displayed on site and GBP
-- Format: "(305) 555-0100" — must match across all citations byte-for-byte

ALTER TABLE projects ADD COLUMN business_name_canonical text;
-- The exact legal business name as it appears on GBP
-- Separate from project.name (which may be a short display name)

ALTER TABLE projects ADD COLUMN service_areas text[];
-- Array of city/neighbourhood names the business serves
-- Example: ["Miami", "Coral Gables", "Coconut Grove", "South Miami"]
-- Used for service area page strategy and local entity detection

ALTER TABLE projects ADD COLUMN google_place_id text;
-- Enables direct GBP data lookups via Places API if available
-- Optional but unlocks richer GBP audit capabilities

ALTER TABLE projects ADD COLUMN google_review_count integer;
ALTER TABLE projects ADD COLUMN google_average_rating numeric(3,1);
-- Set manually by user or via Places API if place_id is available
-- Used for AggregateRating schema generation and review velocity tracking

ALTER TABLE projects ADD COLUMN review_velocity_target integer DEFAULT 4;
-- Target new reviews per month — user configurable
-- Default 4/month (achievable for most local businesses)

-- Local SEO audit storage
ALTER TABLE projects ADD COLUMN local_seo_audit jsonb;
-- {
--   evaluated_at: timestamp,
--   gbp_score: number,          -- 0-100 GBP completeness
--   nap_score: number,          -- 0-100 NAP consistency
--   review_score: number,       -- 0-100 review health
--   schema_score: number,       -- 0-100 local schema completeness
--   on_page_score: number,      -- 0-100 on-page local signals
--   overall_score: number,      -- weighted composite
--   checklist: { item_key: { status, evidence, fix } },
--   warnings: []
-- }
```

---

## The GBP Completeness Audit

### Checklist Items

```javascript
const GBP_CHECKLIST = {
  gbp_claimed_verified: {
    label: 'GBP claimed and verified',
    weight: 15,
    detect: (data) => data.gbp_url && data.gbp_verified,
    fix: 'Claim and verify your Google Business Profile at business.google.com. Verification takes 1–2 weeks by postcard or phone.'
  },

  primary_category_set: {
    label: 'Primary business category set correctly',
    weight: 12,
    detect: (data) => !!data.gbp_primary_category,
    fix: 'Set your primary category to the most specific category that describes your core service. Wrong category is one of the most common Local Pack ranking failures.'
  },

  business_description_complete: {
    label: 'Business description with keywords (750 chars)',
    weight: 8,
    detect: (data) => data.gbp_description?.length >= 400,
    fix: 'Write a 400–750 character business description. Include your primary service, location, and 2–3 keywords naturally. Do not keyword-stuff — write for customers first.'
  },

  photos_minimum: {
    label: 'Minimum 10 photos uploaded',
    weight: 8,
    detect: (data) => (data.gbp_photo_count || 0) >= 10,
    fix: 'Upload at least 10 high-quality photos: storefront, interior, team, work examples. Photos are a Prominence signal — businesses with more photos get more profile views.'
  },

  hours_set: {
    label: 'Opening hours complete and accurate',
    weight: 6,
    detect: (data) => data.gbp_hours_set,
    fix: 'Add your full opening hours including holidays. Incomplete hours reduce profile conversions and may hurt Local Pack eligibility.'
  },

  services_listed: {
    label: 'Services list complete',
    weight: 6,
    detect: (data) => (data.gbp_services_count || 0) >= 5,
    fix: 'Add every service you offer as a separate service item. Each service is an additional relevance signal for related queries.'
  },

  qa_answered: {
    label: 'Q&A section seeded with common questions',
    weight: 5,
    detect: (data) => (data.gbp_qa_count || 0) >= 3,
    fix: 'Add 3–5 questions and answers yourself in the Q&A section. Common questions: pricing, process, service area, response time. Do not leave Q&A empty — unmonitored Q&A fills with spam.'
  },

  posts_recent: {
    label: 'Google Post published in last 7 days',
    weight: 5,
    detect: (data) => {
      if (!data.gbp_last_post_date) return false
      const daysSince = (Date.now() - new Date(data.gbp_last_post_date)) / 86400000
      return daysSince <= 7
    },
    fix: 'Publish a Google Post every week. Even a short update about a recent job, seasonal offer, or tip counts. Regular posting signals an active, trustworthy business.'
  }
}
```

---

## NAP Consistency Audit

NAP consistency is the local SEO equivalent of canonical URL management. Every mention of the business name, address, and phone across the web must be byte-for-byte identical to the canonical record. Inconsistencies create entity disambiguation problems — Google cannot confidently associate a citation with the business entity, reducing Prominence.

```javascript
function auditNAPConsistency(project) {
  const canonical = {
    name: project.business_name_canonical,
    address: project.business_address,
    phone: project.business_phone
  }

  const issues = []

  // Check NAP fields are populated
  if (!canonical.name) {
    issues.push({
      severity: 'critical',
      type: 'nap_name_missing',
      message: 'No canonical business name set.',
      fix: 'Add your exact legal business name in Project Settings — Local SEO. This must match your GBP listing exactly.'
    })
  }

  if (!canonical.address) {
    issues.push({
      severity: 'critical',
      type: 'nap_address_missing',
      message: 'No canonical business address set.',
      fix: 'Add your full business address in Project Settings. Format it exactly as it appears on your GBP listing — this is the format all citations must match.'
    })
  }

  if (!canonical.phone) {
    issues.push({
      severity: 'critical',
      type: 'nap_phone_missing',
      message: 'No canonical phone number set.',
      fix: 'Add your primary business phone number. Use the same format everywhere — e.g. "(305) 555-0100" not "305-555-0100".'
    })
  }

  // Check on-page NAP presence (reads from crawled pages)
  const contactPage = project.crawled_pages?.find(p =>
    p.url.includes('/contact') || p.url.includes('/about')
  )

  if (!contactPage) {
    issues.push({
      severity: 'high',
      type: 'no_contact_page',
      message: 'No contact page detected.',
      fix: 'Create a Contact or About page with your full NAP information. This is a Trustworthiness signal for both local rankings and EEAT.'
    })
  } else {
    // Check canonical NAP appears on contact page
    if (!contactPage.content?.includes(canonical.phone)) {
      issues.push({
        severity: 'high',
        type: 'phone_not_on_contact_page',
        message: 'Your phone number does not appear on your contact page.',
        fix: `Add your phone number (${canonical.phone}) to your contact page. It must match your GBP listing exactly.`
      })
    }
  }

  return issues
}
```

**Plain-English education for users:**

> "NAP stands for Name, Address, Phone. Every time your business appears online — Yelp, Yellow Pages, local directories — it must use the exact same name, address, and phone number as your Google Business Profile. 'St.' vs 'Street', missing 'Suite 100', or a different phone format all count as inconsistencies. Google uses these mentions to confirm your business is real and trustworthy. Inconsistencies confuse Google's system and reduce your chances of appearing in the map results."

---

## Review Health Audit

```javascript
function auditReviewHealth(project) {
  const { google_review_count, google_average_rating, review_velocity_target } = project
  const issues = []

  // Review count thresholds
  if (!google_review_count || google_review_count < 10) {
    issues.push({
      severity: 'critical',
      type: 'insufficient_reviews',
      count: google_review_count || 0,
      message: `You have ${google_review_count || 0} Google reviews. Businesses with fewer than 10 reviews are rarely competitive in the Local Pack.`,
      fix: 'Send a review request to your last 20 customers this week. A direct Google review link makes it one tap for the customer. See the review request template below.'
    })
  } else if (google_review_count < 25) {
    issues.push({
      severity: 'medium',
      type: 'low_review_count',
      count: google_review_count,
      message: `${google_review_count} reviews is a start — most Local Pack competitors in competitive niches have 50+.`,
      fix: 'Set a goal of 4 new reviews per month. Make it a standard part of your job completion process — send a review link same day as project handoff.'
    })
  }

  // Rating threshold
  if (google_average_rating && google_average_rating < 4.0) {
    issues.push({
      severity: 'critical',
      type: 'low_rating',
      rating: google_average_rating,
      message: `Your ${google_average_rating}-star average is below the 4.0 threshold. Google significantly reduces Local Pack visibility for businesses below 4 stars.`,
      fix: 'Respond to every negative review professionally and specifically. For a recent bad review: acknowledge the issue, apologise genuinely, offer to make it right offline. Do not argue or dismiss. Then focus on generating new positive reviews to raise the average.'
    })
  }

  // Review velocity guidance
  issues.push({
    severity: 'info',
    type: 'review_velocity_guidance',
    message: `Review velocity — not just total count — is a ranking signal. Consistent new reviews signal an active, trusted business.`,
    fix: `Your target: ${review_velocity_target} new reviews per month. Set a calendar reminder to check your review count on the 1st of each month.`
  })

  return issues
}
```

---

## Local Schema Generation

Extends the existing Schema Markup Generator (L2) with local-specific types.

### LocalBusiness Schema

```javascript
function generateLocalBusinessSchema(project) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",  // or more specific: "Plumber", "Dentist", etc.
    "name": project.business_name_canonical,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": extractStreet(project.business_address),
      "addressLocality": extractCity(project.business_address),
      "addressRegion": extractState(project.business_address),
      "postalCode": extractZip(project.business_address),
      "addressCountry": project.country_code || "US"
    },
    "telephone": project.business_phone,
    "url": project.website_url,
    "sameAs": buildSameAsArray(project)
    // sameAs connects the entity to GBP, social profiles, directories
  }

  // Add AggregateRating if review data exists
  if (project.google_review_count && project.google_average_rating) {
    schema["aggregateRating"] = {
      "@type": "AggregateRating",
      "ratingValue": project.google_average_rating,
      "reviewCount": project.google_review_count,
      "bestRating": "5",
      "worstRating": "1"
    }
  }

  return schema
}

function buildSameAsArray(project) {
  const sameAs = []
  if (project.gbp_url)       sameAs.push(project.gbp_url)
  if (project.facebook_url)  sameAs.push(project.facebook_url)
  if (project.linkedin_url)  sameAs.push(project.linkedin_url)
  if (project.yelp_url)      sameAs.push(project.yelp_url)
  if (project.wikidata_url)  sameAs.push(project.wikidata_url)
  return sameAs
}
```

**Why sameAs matters:** The sameAs property explicitly tells Google's Knowledge Graph that all of these profiles refer to the same entity. This resolves entity disambiguation — the core mechanism behind NAP consistency at the schema level. It directly contributes to the Authoritativeness dimension of EEAT and feeds into the group modification factor via entity recognition.

---

## On-Page Local Signals Audit

For each page, detect whether local entity signals are present. This reads from the existing UPSA content analysis.

```javascript
function auditOnPageLocalSignals(page, project) {
  const content = page.plain_text_content
  const issues = []

  // City/location entity in content
  const serviceAreasPresent = project.service_areas?.filter(area =>
    content.toLowerCase().includes(area.toLowerCase())
  ) || []

  if (serviceAreasPresent.length === 0 && project.service_areas?.length > 0) {
    issues.push({
      type: 'no_local_entity',
      severity: 'high',
      message: 'This page has no location mentions.',
      fix: `Add your primary service area (${project.service_areas[0]}) naturally in the content — in the H1, first paragraph, and at least once in the body. Local pages without location entities don't register as locally relevant.`
    })
  }

  // Phone number on page
  const phonePattern = /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/
  if (!phonePattern.test(content)) {
    issues.push({
      type: 'no_phone_on_page',
      severity: 'medium',
      message: 'No phone number detected on this page.',
      fix: 'Add your phone number to this page — ideally above the fold as part of the CTA. For local service businesses, the phone number IS the conversion goal on most pages.'
    })
  }

  // LocalBusiness schema present
  if (!page.has_local_business_schema) {
    issues.push({
      type: 'no_local_schema',
      severity: 'high',
      message: 'No LocalBusiness schema on this page.',
      fix: 'Add the LocalBusiness schema generated by Sharkly to this page. Schema markup directly communicates your business entity to Google — it is the fastest path to entity establishment.'
    })
  }

  return issues
}
```

---

## Local Content Strategy

The Local SEO module adds a content strategy layer specifically for local businesses — service area pages and location landing pages. These are distinct from the cluster content strategy and follow different rules.

### Service Area Pages

For businesses serving multiple locations (e.g. "Miami Plumber" also serving Coral Gables, Coconut Grove):

```javascript
function generateServiceAreaStrategy(project) {
  if (!project.service_areas || project.service_areas.length <= 1) return null

  return {
    recommendation: 'service_area_pages',
    explanation: `You serve ${project.service_areas.length} areas. A dedicated page for each location helps you appear in the Local Pack for searches in each area — not just your primary location.`,

    pages_to_create: project.service_areas.map(area => ({
      title: `${project.primary_service} in ${area}`,
      url_slug: `${slugify(project.primary_service)}-${slugify(area)}`,
      requirements: [
        `Unique content for ${area} — at least 300 words`,
        `Mention ${area} in H1, first paragraph, and 3+ times in body`,
        `Include local landmarks, neighbourhoods, or known references to ${area}`,
        `Embed a Google Map showing your service area covering ${area}`,
        `Add LocalBusiness schema with ${area} in the service area field`,
        'Same phone number and address as main site — NAP consistency'
      ],
      warning: `Do NOT copy-paste content from your main page and swap out the city name. Google detects doorway pages. Each service area page must have genuinely unique information about serving that specific area.`
    }))
  }
}
```

**Brief generation injection for service area pages:**

```
LOCAL CONTENT CONTEXT:
This is a service area page for {area_name}.
Primary job: rank for "{primary_service} in {area_name}" and related local queries.
Requirements:
- Mention {area_name} naturally in H1, first paragraph, and throughout body
- Reference local context specific to {area_name} — neighbourhoods, landmarks, local references
- Include phone number and address early on page
- Do NOT simply substitute the city name into generic content — write genuinely for this location
- Add an FAQ section addressing questions local customers in {area_name} actually ask
```

---

## Local SEO Score — Composite

```javascript
function calculateLocalSEOScore(audit) {
  const weights = {
    gbp:      0.30,
    nap:      0.20,
    reviews:  0.25,
    schema:   0.15,
    on_page:  0.10
  }

  const scores = {
    gbp:     calculateGBPScore(audit.gbp_checklist),
    nap:     calculateNAPScore(audit.nap_issues),
    reviews: calculateReviewScore(audit.review_data),
    schema:  calculateSchemaScore(audit.schema_checklist),
    on_page: calculateOnPageLocalScore(audit.on_page_issues)
  }

  const composite = Object.keys(weights).reduce((total, key) => {
    return total + (scores[key] * weights[key])
  }, 0)

  return {
    score: Math.round(composite),
    breakdown: scores,
    label: composite >= 80 ? 'Strong' : composite >= 50 ? 'Needs Work' : 'Critical Issues'
  }
}
```

---

## Review Request Template Generation

One of the highest-value outputs for local businesses — a template they can immediately use to ask existing customers for reviews.

```javascript
// Generates a personalised review request message
// Cost: 1 credit. Reads from project business data.

const REVIEW_REQUEST_PROMPT = `
Write a short, friendly SMS or email asking a customer to leave a Google review.

Business: {business_name}
Service provided: {niche}
Tone: {brand_voice}

Requirements:
- Maximum 3 sentences
- Include a direct link placeholder: [YOUR GOOGLE REVIEW LINK]
- Sound human — not like a corporate template
- Do not offer incentives for reviews (against Google's terms)
- End with the business owner's first name if provided

Example output format:
"Hi [Name], it was great working with you on [job]. If you have a moment,
a quick Google review would mean a lot to us — it helps other [city] homeowners
find us when they need help. [YOUR GOOGLE REVIEW LINK] — Thanks, [First Name]"
`
```

---

## UI — Where Local SEO Lives

### Navigation

Local SEO does not get its own top-level nav item. It lives inside the Technical screen as a tab — alongside the existing audit tabs.

```
Technical screen tabs:
[ Site Health ]  [ On-Page ]  [ Local SEO ]  [ Schema ]
                                    ↑
                     Only visible when is_local_business = true
```

When `is_local_business` is false, the Local SEO tab is hidden entirely. No locked state — just absent. Non-local businesses have no use for this module and showing it creates confusion.

### Local SEO Tab Layout

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOCAL SEARCH PRESENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Local Pack Score: 62 / 100     ██████░░░░    Needs Work

┌─────────────┬─────────────┬──────────────┐
│ GBP          │ Reviews     │ Local Schema │
│ 70 / 100     │ 45 / 100    │ 80 / 100     │
│ 3 issues     │ 2 issues    │ 1 issue      │
└─────────────┴─────────────┴──────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CRITICAL

  ❌ You have 6 Google reviews — not enough to be
     competitive in the Local Pack.
     Why it matters: Review count is the second-biggest
     Prominence factor. Competitors in your area have 40+.
     Action: Use the review request template below →
     [ Generate Review Request ] (1 credit)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟡 NEEDS ATTENTION

  ⚠️  No Google Posts in the last 7 days.
      Action: Publish a post about a recent job or offer.

  ⚠️  NAP address not found on your contact page.
      Action: Add your full address to your contact page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ WORKING WELL

  ✅ GBP verified and claimed
  ✅ Primary category set correctly
  ✅ LocalBusiness schema present with sameAs markup
  ✅ Phone number on all key pages

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ VIEW SERVICE AREA STRATEGY ]
[ REGENERATE LOCAL SCHEMA ]
[ GENERATE REVIEW REQUEST TEMPLATE ]
```

### Project Settings — Local Business Section

New section in Project Settings (sheet slideout drawer):

```
LOCAL BUSINESS SETUP
━━━━━━━━━━━━━━━━━━━━

Is this a local service business?    [ Yes / No toggle ]

If yes:

Business name (exact, as on GBP)     [                    ]
Business address (canonical)         [                    ]
Business phone (canonical format)    [                    ]
Google Business Profile URL          [                    ]
Service areas (add up to 10)         [ + Add area ]

Google reviews
  Review count                       [      ]
  Average rating                     [      ]
  Google Place ID (optional)         [                    ]

Business profiles (for schema sameAs)
  Facebook URL                       [                    ]
  LinkedIn URL                       [                    ]
  Yelp URL                           [                    ]
  Wikidata URL (advanced)            [                    ]
```

Helper text under NAP fields:
> "These must match your Google Business Profile exactly — including capitalisations, abbreviations (St. vs Street), and phone format. Inconsistencies across directories hurt your map rankings."

---

## Relationship to Existing Systems

**EEAT module (S1-3 in roadmap):** The EEAT scored checklist gains local-specific items when `is_local_business = true` — GBP verified, NAP consistent, reviews present. These are trustworthiness dimension items. The Local SEO module and EEAT module share data but score separately.

**Schema generator (L2):** LocalBusiness, AggregateRating, and sameAs schema types are added to the L2 generator output. The local module provides the data; the schema generator formats the JSON-LD.

**Technical audit crawler:** The crawler gains two local-specific checks — NAP presence on contact page, and local entity signals on service pages. These feed into the local on-page score.

**Brief generation:** When `is_local_business = true` and a page is a service or money page, brief generation injects local context (location entities, phone CTA, LocalBusiness schema reminder). Service area page briefs get the dedicated local brief injection.

**AggregateRating + sameAs schema (roadmap S1-5):** That sprint item is now the technical implementation of what this module needs. S1-5 should be built as part of this module's data model — they're the same thing.

---

## Build Order for Cursor

1. DB migration — add all local business fields to projects table
2. `detectLocalBusiness()` — niche classifier, wire to project creation
3. Local Business Setup section in Project Settings
4. `auditGBPCompleteness()` — GBP checklist with scoring
5. `auditNAPConsistency()` — canonical NAP detection + contact page check
6. `auditReviewHealth()` — review count/rating/velocity checks
7. `generateLocalBusinessSchema()` — LocalBusiness + AggregateRating + sameAs JSON-LD
8. `auditOnPageLocalSignals()` — reads from existing crawler data
9. `calculateLocalSEOScore()` — composite score from all dimensions
10. Local SEO tab UI in Technical screen
11. Review request template generation (Claude prompt, 1 credit)
12. `generateServiceAreaStrategy()` — service area page recommendations
13. Brief generation injection for local pages and service area pages
14. Wire local items into EEAT checklist (trustworthiness dimension)
15. Connect local schema output to existing Schema Generator (L2) interface

---

## What the Local SEO Module Communicates

The module's deepest product value is education: most local service businesses have no idea the Local Pack and organic results are different systems with different ranking factors. They optimise their website and wonder why they're not in the map. Sharkly is the tool that explains the difference, scores both systems separately, and tells them exactly what to fix in each.

Plain-English framing in the UI throughout:
- "Local Pack" not "Google Maps results" — consistent terminology
- "Map rankings" and "search rankings" as the two distinct systems
- "Google Business Profile" not "GMB" (deprecated) or "GBP listing"
- Never "citations" without an explanation — always "directory listings"

---

_Sharkly — Shark Engine Optimization_
_Local SEO module grounded in the three-factor Local Pack model: Relevance × 0.35, Distance × 0.35, Prominence × 0.30_

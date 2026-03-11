# Sharkly — Funnel Visualizer (UI Spec)
## Customer Journey Visualization — Cluster Detail View

---

## What This Is

The funnel visualizer is a visual representation of the customer journey built by a Sharkly cluster. It shows every page at its correct funnel stage, GSC performance data flowing through each stage, and the destination page at the bottom — locked or unlocked based on subscription.

It is not a separate screen. It lives in the cluster detail view, replacing or sitting alongside the existing React Flow cluster map. It is the primary UI surface that communicates the two-job model to users:

- SEO anchor and supporting articles → rank and build trust
- Destination page → convert whoever arrives

It is also the primary upsell surface for the CRO add-on.

---

## Core Design Principles

**1. Never use SEO jargon in the UI**
No "equity flow", no "Architecture B", no "reverse silo". Plain English throughout.

**2. The product makes the decisions**
Users never choose funnel stages. The system classifies every page automatically based on page_type and keyword intent. The visualizer shows the result — it does not ask for input.

**3. The locked destination page creates the desire**
A base subscriber can see their destination page in the funnel. They can see traffic flowing toward it. They cannot see what happens when traffic arrives. That gap sells the add-on without a single sales pitch.

**4. GSC data makes it real**
Without performance data the funnel is just a diagram. With impressions and clicks at each stage it becomes a live picture of their business. Users understand immediately where their audience is and where they're losing them.

---

## Layout

The funnel visualizer is a three-column layout representing the three funnel stages. Each column contains the pages at that stage. A destination page node sits below all three columns, connected by a single arrow from the SEO anchor.

```
┌─────────────────────────────────────────────────────────────────────┐
│  YOUR CUSTOMER JOURNEY                          Last updated: today  │
├──────────────────┬──────────────────────────┬────────────────────────┤
│   AWARENESS      │     CONSIDERATION        │   (no column here)     │
│   Building       │     SEO Anchor ★         │                        │
│   recognition    │     This is where you    │                        │
│                  │     rank and earn trust  │                        │
├──────────────────┼──────────────────────────┤                        │
│  📄 Article 1    │  📄 Focus Page           │                        │
│  UPSA: 87        │  UPSA: 94                │                        │
│  847 impr        │  2,341 impr              │                        │
│  23 clicks       │  187 clicks              │                        │
│                  │                          │                        │
│  📄 Article 2    │                          │                        │
│  UPSA: 91        │                          │                        │
│  612 impr        │         ↓                │                        │
│  18 clicks       │   187 visitors sent →    │                        │
│                  │                          │                        │
│  📄 Article 3    │                          │                        │
│  UPSA: 78 ⚠️     │                          │                        │
│  203 impr        │                          │                        │
│  6 clicks        │                          │                        │
├──────────────────┴──────────────────────────┴────────────────────────┤
│                                                                       │
│  🔒 DESTINATION PAGE                                                  │
│  universalinvestigationsagency.com/services/cyber-crime-investigation │
│                                                                       │
│  "Your SEO anchor is sending visitors here.                           │
│   You don't know what happens next."                                  │
│                                                                       │
│  [ Unlock CRO Studio ]                                                │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Page Cards

Each page in the funnel renders as a card. Card content varies by page type.

### SEO Anchor / Article Card (base subscription)

```
┌─────────────────────────────┐
│ 📄 How to Choose a Cyber    │
│    Crime Investigator        │
│                              │
│ UPSA: 94 / 115   ████████░░ │
│ CRO:  6 / 8      ███████░░░ │
│                              │
│ GSC (last 28 days):          │
│ 2,341 impressions            │
│ 187 clicks  (8.0% CTR)       │
│ Avg position: 4.2            │
│                              │
│ [ Open in Workspace ]        │
└─────────────────────────────┘
```

### SEO Anchor / Article Card — Warning State

```
┌─────────────────────────────┐
│ ⚠️ Signs You've Been Hacked  │
│                              │
│ UPSA: 78 / 115   ███████░░░ │
│ CRO:  3 / 8      ███░░░░░░░ │
│                              │
│ GSC (last 28 days):          │
│ 203 impressions              │
│ 6 clicks  (3.0% CTR)         │
│ Avg position: 18.4           │
│                              │
│ ⚠️ Low UPSA — needs work     │
│ [ Open in Workspace ]        │
└─────────────────────────────┘
```

### Destination Page Card — Locked (base subscription)

```
┌─────────────────────────────┐
│ 🔒 Destination Page          │
│                              │
│ cyber-crime-investigation    │
│                              │
│ CRO Score: ??/??             │
│ ░░░░░░░░░░ LOCKED            │
│                              │
│ 187 visitors sent here       │
│ Conversion rate: unknown     │
│                              │
│ "Your SEO is working.        │
│  Is your page converting?"   │
│                              │
│ [ Unlock CRO Studio ]        │
└─────────────────────────────┘
```

### Destination Page Card — Unlocked (CRO add-on)

```
┌─────────────────────────────┐
│ 🎯 Destination Page          │
│                              │
│ cyber-crime-investigation    │
│                              │
│ CRO Score: 4 / 8  ████░░░░░ │
│                              │
│ 187 visitors sent here       │
│ 4 critical issues found      │
│                              │
│ [ Open in CRO Studio ]       │
└─────────────────────────────┘
```

---

## The Traffic Flow Arrow

A single directional arrow connects the SEO anchor card to the destination page card. The arrow label shows the click volume from GSC:

```
SEO Anchor
[187 clicks last 28 days]
        │
        │  → 187 visitors sent to your destination page
        ↓
Destination Page
[conversion rate: unknown / locked]
```

When CRO Studio is unlocked and a conversion rate is available (via GSC goal tracking or manual input), the arrow shows:

```
        │  → 187 visitors
        ↓
Destination Page
[~12 conversions estimated]
```

This is the only analytics Sharkly shows. Page-level GSC data + the traffic handoff between anchor and destination. No site-wide analytics. No dashboards. Scoped entirely to what matters for the cluster's job.

---

## Funnel Stage Labels

Each column has a plain-English label. No SEO jargon.

| Column | Header | Subtext |
|---|---|---|
| Left | AWARENESS | "Readers finding out they have a problem" |
| Centre | CONSIDERATION ★ | "Readers researching their options — this is where you rank" |
| Destination | DECISION | "Readers ready to act — this is where you convert" |

The ★ on the Consideration column marks the SEO anchor as the ranking engine of the cluster. One sentence tooltip on hover: "This is your SEO anchor. It does the ranking work and sends qualified visitors to your destination page."

---

## Cluster Intelligence Warnings in the Funnel View

The cluster intelligence layer warnings surface here as a banner above the funnel, not as a separate panel. Maximum 2 warnings shown in the funnel view — full list available in the cluster intelligence panel below.

```
⚠️  3 of your articles don't link to your SEO anchor. Fix these to maximise 
    your ranking power.  [ See which articles → ]

⚠️  Your SEO anchor hasn't been updated in 8 months and rankings are 
    declining.  [ Refresh this page → ]
```

Warning 7 (focus page is BoFu/transactional) renders as a full-width red banner:

```
🔴  Your SEO anchor is targeting a buying-intent keyword. Pages like this 
    struggle to rank AND struggle to convert — they're trying to do both jobs 
    at once. Consider making this your destination page and creating a new 
    consideration-stage anchor.  [ Learn more ]
```

---

## Empty / Incomplete States

### No destination page attached

```
┌─────────────────────────────────────────────────┐
│  + Connect your destination page                 │
│                                                  │
│  "Do you have a page you want this cluster       │
│   to send visitors toward? A product page,       │
│   signup page, or booking page?"                 │
│                                                  │
│  [ Add destination page ]  [ Skip for now ]      │
└─────────────────────────────────────────────────┘
```

### No GSC data yet

Page cards show UPSA and CRO scores but no impression/click data. Small label: "GSC data available after pages are published and indexed — usually 2-4 weeks."

### New cluster — no pages yet

The funnel renders with empty card slots at each stage with placeholder text:

```
AWARENESS              CONSIDERATION ★           
─────────────────────────────────────────────────
[ + Add articles ]     [ + Add SEO anchor ]      

These pages build       This page ranks for your  
awareness and send      main keyword and sends    
traffic to your         visitors to your          
anchor.                 destination.              
```

---

## Subscription Gating — Exact Behaviour

### Base subscription

- All SEO anchor and article cards: fully visible, fully interactive
- Destination page card: visible, greyed out, locked icon, upsell prompt
- "Open in CRO Studio" button: replaced with "Unlock CRO Studio"
- CRO score on destination card: shown as "??/?? LOCKED"
- Traffic arrow: shows GSC click volume but destination outcome is "unknown"

### CRO add-on active

- Destination page card: fully visible, CRO score shown
- "Open in CRO Studio" button: active, routes to CRO Studio
- Traffic arrow: shows full handoff data
- No locked states anywhere

### Upsell prompt copy (destination card locked state)

> "Your SEO anchor sent {N} visitors to this page last month. You don't know how many of them contacted you — or why the others left. CRO Studio audits this page and tells you exactly what to fix."

> [ Start free audit — unlock CRO Studio ]

The number {N} is pulled from GSC click data for the anchor page. Personalised, specific, and creates immediate desire. Not a generic "upgrade to unlock features" — it's "here is the specific thing you're missing."

---

## Relationship to React Flow Cluster Map

The React Flow map (existing) shows the linking architecture — nodes and arrows representing page-to-page link relationships. The funnel visualizer shows the business architecture — funnel stages, performance data, and the customer journey.

Both live in the cluster detail view. The funnel visualizer is the default view (primary tab). The React Flow map is a secondary tab labelled "Link Architecture" for users who want to see the linking structure.

```
Cluster Detail View tabs:
[ Customer Journey ]  [ Link Architecture ]  [ Intelligence ]
      ↑ default            ↑ React Flow          ↑ Cluster warnings
      Funnel visualizer    existing               full list
```

---

## Build Order for Cursor

1. Create funnel stage classification helper — reads `page_type` from pages table, assigns to AWARENESS / CONSIDERATION / DECISION column
2. Build three-column funnel layout component
3. Build page card component — SEO anchor/article variant
4. Build destination page card — locked variant (base subscription)
5. Build destination page card — unlocked variant (CRO add-on)
6. Wire GSC data to page cards (impressions, clicks, CTR, position per page)
7. Build traffic flow arrow component — reads GSC click data from anchor
8. Build cluster intelligence warning banners (top 2 warnings surfaced here)
9. Build Warning 7 detection and red banner (BoFu focus page warning)
10. Build empty/incomplete states
11. Build subscription gate logic — reads user plan, shows locked/unlocked states
12. Add "Connect destination page" prompt for clusters without destination
13. Restructure cluster detail view tabs — funnel as default, React Flow as secondary

---

## Database Reads

No new database fields required. Reads from:
- `pages.page_type` — funnel stage classification
- `pages.upsa_score` — UPSA card display
- `pages.cro_score` — CRO card display
- `pages.gsc_data` — impressions, clicks, CTR, position
- `clusters.destination_page_url` — destination card
- `clusters.destination_page_label` — destination card label
- `clusters.cluster_intelligence` — warning banners
- `user.subscription_tier` — gating logic

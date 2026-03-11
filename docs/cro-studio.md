# Sharkly — CRO Studio (Product Space Spec)
## The Destination Page Workspace — CRO Add-On Only

---

## What This Is

The CRO Studio is a completely separate product space from the Workspace. It is the environment where destination pages live, get audited, and get fixed. No SEO scoring happens here. No UPSA. No brief generation. No internal link engine.

The CRO Studio has one job: tell the user what is stopping their destination page from converting the traffic their SEO cluster is sending it, and give them the exact copy to fix it.

---

## The Fundamental Rule

```
SEO Anchor / Article → Workspace only. Never enters CRO Studio.
Destination Page → CRO Studio only. Never enters Workspace.
```

This is enforced at the routing level. A destination page URL cannot be opened in the Workspace. An anchor page or article cannot be opened in the CRO Studio. The separation is absolute.

---

## Access

- **Base subscription:** CRO Studio does not exist in the navigation. The destination page card in the funnel visualizer shows a locked state with an upsell prompt. Clicking "Unlock CRO Studio" routes to the upgrade flow.
- **CRO add-on active:** CRO Studio appears in the main navigation. All destination pages across all clusters are accessible here.

---

## Navigation

CRO Studio appears as a top-level navigation item alongside Dashboard, Strategy, Clusters, and Performance.

```
Navigation:
[ Dashboard ]  [ Strategy ]  [ Clusters ]  [ Performance ]  [ CRO Studio 🎯 ]
```

If base subscription only, the CRO Studio nav item is visible but greyed with a lock icon. Clicking it opens the upgrade modal — not a 404, not hidden entirely. The user knows it exists. That's intentional.

---

## CRO Studio Home Screen

Lists all destination pages across all clusters. Each row shows:

```
┌──────────────────────────────────────────────────────────────────────┐
│ DESTINATION PAGES                                    [ + Add page ]   │
├──────────────────────────────────────────────────────────────────────┤
│ 🎯 Sharkly Signup Page                                               │
│    sharkly.io/signup                                                 │
│    Cluster: Ecommerce SEO  │  CRO Score: 4/8  ████░░░░  │  4 issues │
│    Last audited: 2 days ago                                          │
│    [ Open ]                                                          │
├──────────────────────────────────────────────────────────────────────┤
│ 🎯 Cyber Crime Investigation Service                                 │
│    universalinvestigations.com/services/cyber-crime                  │
│    Cluster: Cyber Crime SEO  │  CRO Score: 3/8  ███░░░░░  │  5 issues│
│    Last audited: 14 days ago  ⚠️ Re-audit recommended               │
│    [ Open ]                                                          │
└──────────────────────────────────────────────────────────────────────┘
```

A destination page can be connected to one cluster or exist independently (a user may want to audit a page they built before using Sharkly). The "+ Add page" button adds a destination page URL directly — it doesn't require a cluster connection.

---

## CRO Studio — Individual Page View

This is the primary working environment. Everything is about one destination page.

### Header

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🎯 Sharkly Signup Page                                               │
│    sharkly.io/signup  ↗                                              │
│    Connected cluster: Ecommerce SEO cluster                          │
│                                                                      │
│    CRO Score: 4 / 8     ████░░░░░░    Last audited: 2 days ago      │
│                                                                      │
│    [ Re-audit page ]  (1 credit)    [ Generate all fixes ] (6 credits)│
└──────────────────────────────────────────────────────────────────────┘
```

The CRO score displayed here is the only score this page ever receives. There is no UPSA. There is no SEO score. There is no combined score. The message is clear: this page is measured purely on its ability to convert.

### Page Architecture Issues (shown first if violations exist)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔴 PAGE STRUCTURE ISSUES — Fix these before individual items         │
├──────────────────────────────────────────────────────────────────────┤
│ Your trust signals appear after your CTA. Visitors are being asked   │
│ to sign up before they have a reason to trust you.                   │
│ → Move your credentials or review count above your signup button.    │
│                                   [ Generate fix ]  (1 credit)       │
├──────────────────────────────────────────────────────────────────────┤
│ Your first CTA doesn't appear until 40% down the page. Visitors who  │
│ are ready to sign up right now have no way to do so when they land.  │
│ → Add a CTA in the first section of your page.                       │
│                                   [ Generate fix ]  (1 credit)       │
└──────────────────────────────────────────────────────────────────────┘
```

### Audit Report

Three sections: Critical Issues (red), Improvements (amber), Strong (green).

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔴 CRITICAL — Fix these first                                        │
├──────────────────────────────────────────────────────────────────────┤
│ ❌ No trust signals before your CTA                                  │
│    Visitors are being asked to commit before they have any reason    │
│    to trust you.                                                     │
│                                   [ Generate fix ]  (1 credit)       │
├──────────────────────────────────────────────────────────────────────┤
│ ❌ No urgency signal at the bottom                                   │
│    Nothing is prompting your visitor to act now rather than later.   │
│                                   [ Generate fix ]  (1 credit)       │
├──────────────────────────────────────────────────────────────────────┤
│ 🟡 IMPROVEMENTS                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ ⚠️  FAQ doesn't address pricing objection                            │
│    The most common reason visitors leave without converting is cost  │
│    uncertainty. Your FAQ doesn't address it.                         │
│                                   [ Generate fix ]  (1 credit)       │
├──────────────────────────────────────────────────────────────────────┤
│ ✅ STRONG — Keep these                                               │
├──────────────────────────────────────────────────────────────────────┤
│ ✅ H1 is clear with target keyword                                   │
│ ✅ Hero CTA present above the fold                                   │
│ ✅ FAQ section with schema markup present                            │
└──────────────────────────────────────────────────────────────────────┘

[ Generate all fixes ]  (4 credits)
```

### Generated Fixes Panel

When the user clicks "Generate fix" on any item, the fix appears inline below that item. No page navigation. No modal. The copy appears where the problem was identified.

```
│ ❌ No trust signals before your CTA                                  │
│    [Generated fix — click to expand ▼]                               │
│                                                                      │
│    ┌────────────────────────────────────────────────────────────┐   │
│    │ OPTION 1 — Experience-based                                 │   │
│    │ "Trusted by 400+ ecommerce stores since 2022"               │   │
│    │                                                             │   │
│    │ 📍 PLACEMENT: Add this line directly above your signup      │   │
│    │ button. It should be the last thing they read before        │   │
│    │ they click.                                                 │   │
│    │                              [ Copy ]                       │   │
│    ├────────────────────────────────────────────────────────────┤   │
│    │ OPTION 2 — Review-based                                     │   │
│    │ "4.9 stars across 180 reviews — see what store owners say"  │   │
│    │                                                             │   │
│    │ 📍 PLACEMENT: Same position — directly above signup button. │   │
│    │                              [ Copy ]                       │   │
│    └────────────────────────────────────────────────────────────┘   │
```

Each generated fix has:
- 2-3 copy options
- One specific placement instruction per option
- A copy-to-clipboard button
- No "save" or "apply" — Sharkly does not edit the user's page. They implement in their own CMS.

---

## What CRO Studio Does NOT Have

These are deliberate absences — not missing features:

- **No UPSA score.** Destination pages are not scored on SEO depth.
- **No brief generation.** Sharkly does not write the destination page from scratch.
- **No internal link suggestions.** The destination page is outside the cluster linking architecture.
- **No word count guidance.** Short is correct for destination pages. Length is never penalised or rewarded.
- **No keyword density check.** Destination pages are optimised for humans, not Google.
- **No content editor / Tiptap.** Users write and edit their destination page in their own CMS. Sharkly only audits and generates copy suggestions.

The absence of these features IS the message. A user opening a destination page in CRO Studio and seeing no UPSA score, no keyword guidance, no word count — immediately understands: this page plays by different rules. Its job is different.

---

## Audit Trigger

The CRO audit runs when:
- User opens a destination page in CRO Studio for the first time (auto-runs, 1 credit)
- User clicks "Re-audit page" after making changes (1 credit)
- More than 30 days since last audit (prompted but not automatic — user confirms)

The audit reads the destination page content via URL fetch. It does not require the user to paste content — Sharkly fetches and parses the live page.

```javascript
// Audit trigger
async function runCROAudit(destination_page) {
  const content = await fetchAndParseURL(destination_page.url)
  const audit = await evaluateCROChecklist(content, destination_page)
  const architectureIssues = detectArchitectureSequence(content, 'money_page')
  const persuasionGaps = detectPersuasionSignals(content, 'money_page')
  const objectionGaps = detectObjectionCoverage(content, 'money_page')
  
  return {
    audited_at: new Date(),
    cro_score: calculateCROScore(audit),
    architecture_violations: architectureIssues,
    checklist: audit,
    persuasion_signals: persuasionGaps,
    objection_coverage: objectionGaps
  }
}
```

---

## Credits Model

| Action | Credits |
|---|---|
| Run full audit (auto on first open) | 1 credit |
| Re-audit after changes | 1 credit |
| Generate single fix | 1 credit |
| Generate FAQ (5 Q+A) | 2 credits |
| Generate testimonial request email | 1 credit |
| Generate all fixes (full page) | 6 credits |

Credits are consumed from the user's monthly allocation. CRO add-on tier includes higher monthly credit allocation than base subscription specifically because CRO Studio is more generation-intensive.

---

## The Message the CRO Studio Sends

By existing as a completely separate space with completely different scoring, CRO Studio communicates the core product philosophy without a single word of explanation:

Your SEO pages and your conversion page are different things. They have different jobs. They are measured differently. They are improved differently.

A user who works in both the Workspace and CRO Studio for one month will understand this intuitively — not because Sharkly explained it but because the product made them experience it.

---

## Build Order for Cursor

1. Add CRO Studio to main navigation — gated by subscription tier
2. Create CRO Studio home screen — lists destination pages by cluster
3. Create individual destination page view — header with CRO score
4. Wire System 2 audit functions to CRO Studio (from `system-2-cro-product.md`)
5. Build audit report display — critical/improvements/strong sections
6. Build generated fixes panel — inline expansion, copy-to-clipboard
7. Build page architecture issues section (shows first if violations exist)
8. Wire URL fetch for live page content (audit reads live page, not pasted content)
9. Build credits consumption for each action
10. Build subscription gate — locked nav item + upgrade modal for base subscribers
11. Build "Re-audit" prompt when audit is older than 30 days
12. Connect destination page cards in funnel visualizer to CRO Studio routes

---

## Relationship to Other Documents

- **System 2 CRO Product** (`system-2-cro-product.md`) — the audit logic, detection functions, and generation prompts that power the CRO Studio. CRO Studio is the UI container. System 2 is the engine inside it.
- **Funnel Visualizer** (`funnel-visualizer.md`) — the entry point. Clicking "Open in CRO Studio" from a destination page card routes here.
- **System 1 CRO Layer** (`system-1-cro-layer.md`) — runs on SEO anchors and articles in the Workspace. Completely separate from CRO Studio. The 8-item checklist in the Workspace CRO tab is a lighter version of the same audit — appropriate for pages whose primary job is ranking, not converting.

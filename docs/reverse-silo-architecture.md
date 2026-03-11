# Sharkly — Reverse Silo Architecture & Linking Mechanics
## The Intellectual Foundation for the Internal Link Engine and Cluster Intelligence Layer

---

## What the Reverse Silo Actually Does

Based on the Reasonable Surfer patent (US8117209B1) — link equity flows by click probability. A link in the body of an article, early, with descriptive anchor text passes significantly more equity than a footer or nav link.

The reverse silo works because:

```
Every supporting article links to the focus page
→ Focus page accumulates maximum internal equity
→ Focus page ranks for the competitive head term
→ Supporting articles rank for the long-tail terms
→ The whole cluster rises together
```

The focus page is the equity collector. That is its structural role. Everything else in the cluster exists to serve that function.

---

## The Two Cluster Architectures

Most tools treat all clusters identically. Sharkly must distinguish between two fundamentally different structures because they have different linking rules, different brief formats, and different internal link engine behavior.

### Architecture A — Focus Page IS the Money Page

```
Supporting articles (SEO, long-tail)
    ↓ ↓ ↓ ↓ ↓
Focus page = Service/Money page (SEO + CRO simultaneously)
    ↓
Conversion (sign up, buy, book, call)
```

**When to use:** Service businesses. Local businesses. Any business where the head term is commercial and the focus page itself is the conversion destination.

**Example:** A plumber whose focus page is "Drain Cleaning London" — this page ranks for the commercial head term AND converts the visitor. Supporting articles like "How to unblock a drain" and "Signs you need a professional plumber" feed equity into it.

**Linking rules for Architecture A:**
- All supporting articles → focus page (non-negotiable, primary link)
- Focus page → conversion action (phone number, form, booking) — no separate product page
- Focus page → supporting articles (reverse — distributes equity back down)
- Supporting articles → other supporting articles in cluster (mesh linking)

---

### Architecture B — Focus Page is Informational, Product Page is Separate

```
Supporting articles (SEO, long-tail)
    ↓ ↓ ↓ ↓ ↓
Focus page (informational, ranks for head term)
    ↓
Product/conversion page (pure CRO, downstream destination, outside cluster)
```

**When to use:** Ecommerce businesses. SaaS products. Any business where the focus page is informational and the actual purchase/signup happens on a separate page.

**Example — Sharkly's own content strategy:**
- Supporting articles: "How to optimize Shopify for SEO", "WooCommerce SEO essentials"
- Focus page: "Best ecommerce platforms for SEO" — informational, ranks for head term
- Product page: "Sharkly — Sign Up" — pure CRO, downstream destination

**The problem with Architecture B:** Every additional click between reader and conversion loses people. The focus page must do enough convincing that the visitor clicks through AND then converts on the product page.

**Linking rules for Architecture B:**
- All supporting articles → focus page (primary link, equity building — non-negotiable)
- Focus page → product page: one strong contextual link early in body + CTA above fold + CTA at bottom (2-3 total references)
- Supporting articles → product page: ONLY where contextually natural, maximum ONE per article, never forced
- Product page → focus page: one link in footer or "learn more" section (keeps equity circulating)
- Product page is NOT part of the cluster. It is the downstream destination.

---

## Pattern A vs Pattern B — The Pure SEO Mechanics Question

This is the question of how supporting articles should link when a product page exists downstream.

### Pattern A — Funnel Through Focus Page Only
```
Supporting articles → Focus page → Product page
```
Every supporting article links ONLY to the focus page. Focus page links to product page.

### Pattern B — Everyone Points to Product Page
```
Supporting articles → Focus page
Supporting articles → Product page  (simultaneously)
Focus page → Product page
```

### The Answer: Pattern A is the Foundation

**Why Pattern B hurts:**
Every outbound link on a page divides the equity that page passes. In Pattern B, every supporting article splits its equity between the focus page and the product page. The focus page gets less equity. It ranks worse. That is a direct, measurable trade-off.

**Why Pattern A wins:**
- Focus page gets maximum equity concentration from every supporting article
- Focus page ranks as well as it possibly can for the commercial head term
- Product page receives equity from ONE high-authority source — the focus page
- One strong link from a high-authority page beats ten weak links from lower-authority pages (US8117209B1)

**The critical insight most people miss:**
The product page does not need to RANK. It needs to CONVERT. The SEO question of how much equity the product page accumulates is largely irrelevant — its job is to convert whoever arrives from the cluster. Ranking power for the product page comes from the quality of the focus page link, not the quantity of links from supporting articles.

### The Optimal Structure

```
Supporting articles
    ↓ (all equity concentrated here)
Focus page ← maximum authority, ranks for head term
    ↓ (one strong contextual link, early in body)
Product page ← receives one high-value link from most authoritative page in cluster
    + natural contextual links from 2-3 supporting articles where genuinely relevant
```

Supporting articles link to the product page ONLY when:
1. The context makes it genuinely natural — a sentence that would feel wrong without mentioning the product
2. The reader is in a solution-aware mindset at that point in the article
3. It serves the reader, not an SEO strategy
4. It does not exceed one product page link per article

---

## The "Always Be Selling" Fallacy — Why It Hurts Both Conversions AND Rankings

This is the most important principle for Sharkly to teach users through its tooling.

**The instinct:** Link to the product page from every article. If someone is learning about bed sheets and hot flashes, offer them the bed sheets. Always be selling.

**The reality:** This is an ad mindset applied to the wrong channel.

In ads you interrupt someone — so you pitch immediately because you might not get another chance. In SEO they came to you. They typed a specific query. Google sent them because that query matched your content's intent. If you ignore that intent signal and pitch them anyway, you break the trust that made them click.

**The double damage:**
1. The visitor wasn't ready. They feel sold to. They leave. You lost the conversion.
2. Google measured that dissatisfaction. Short click. Pogo-stick. Navboost records a negative signal against your page for that query. You lost the ranking for every future visitor too.

**The counterintuitive truth:**
Serving the reader's actual intent completely IS the sales strategy in SEO. A satisfied reader who got exactly what they searched for will:
- Stay longer → positive Navboost signal → rankings improve
- Click internal links because they trust you → equity flows correctly through the cluster
- Come back when they ARE ready to buy → brand recognition → direct traffic
- Convert at a higher rate when they reach the money page → high intent + established trust

**The blog post's job:** Not to sell. To be the best possible answer to the query. To earn enough trust that when this person IS ready to buy, they remember the brand that helped them.

**Where a soft product mention IS appropriate on a ToFu article:**
Not a CTA. A natural solution reference buried in relevant content.

Example — bed sheets brand writing about hot flashes at night:
> "The thread count and material of your sheets directly affects how much heat they trap. Bamboo and percale cotton tend to sleep significantly cooler than polyester blends."

That sentence does the work without being a sales pitch. No "Shop Now" button needed. The information itself is the brand signal. That is the difference between always-be-selling and always-be-relevant.

---

## The Six Architectural Rules — Locked for the Internal Link Engine

These six rules are the complete specification for how the internal link engine and cluster intelligence layer must evaluate linking patterns.

**Rule 1:** Supporting articles have one primary link destination — the focus page. Direct links to product pages from supporting articles are only appropriate when contextually natural and must never exceed one per article.

**Rule 2:** The focus page is the equity collector. It must receive links from every supporting article. It sends one strong contextual link to the product/money page. That one link, from the most authoritative page in the cluster, is worth more than all supporting articles linking to the product page simultaneously.

**Rule 3:** Hard CTAs on ToFu pages are a funnel mismatch. Always flag. Soft CTAs only on informational content. This is not just a CRO issue — it actively hurts rankings via Navboost pogo-stick signals.

**Rule 4:** More links to the money page is NOT better. The system must warn when direct product page links from supporting articles exceed the threshold (more than one per article, or more than 30% of articles linking directly).

**Rule 5:** The product page's ranking power comes from the quality and authority of the focus page link, not the quantity of links from supporting articles. This must be communicated to users who instinctively want to link from everywhere.

**Rule 6:** External links from high-equity pages — focus pages especially — must be nofollowed unless intentional. Equity leaving the cluster is equity not working for the user.

---

## The Bed Sheets Example — Full Cluster Illustrated

This is the canonical example for explaining cluster architecture to users and for testing the internal link engine logic.

```
"Why am I hot at night" (ToFu article)
→ Links to focus page ("best bed sheets for hot flashes")
→ NO link to product page — reader not ready, would feel pushy
→ Navboost signal: long dwell time, reader satisfied, positive signal

"Cotton vs bamboo sheets for temperature regulation" (MoFu article)
→ Links to focus page (equity building)
→ ONE contextual link to product page — natural solution reference
   "Our cooling bamboo sheets are designed specifically for this"
→ Reader is evaluating — this link serves them, not the SEO strategy

"Best bed sheets for hot flashes" (Focus page — MoFu/BoFu)
→ Receives equity from all supporting articles
→ Links to product page 2-3 times — this is the conversion handoff
→ Ranks for the commercial head term
→ Reader arrives pre-warmed by trust established in supporting articles

Product page "Shop Cooling Bed Sheets"
→ Receives one strong link from focus page (high authority source)
→ Receives contextual links from 2-3 relevant supporting articles
→ Pure CRO — converts whoever arrives
→ Does not need to rank — needs to convert
```

---

## Plain-English Translations for User-Facing Output

These are the exact framings Sharkly uses when surfacing architectural insights to users. Never use SEO jargon.

| Technical concept | Plain-English output |
|---|---|
| Equity dilution from over-linking | "More links to your product page is actually hurting it. Concentrate all your article links on your main content page — one strong link from there is worth more than ten weak links from everywhere." |
| Pattern A vs Pattern B | "Your blog posts build trust and rankings. Your product page makes sales. Don't ask your blog posts to do both — they'll fail at both." |
| Pogo-stick from intent mismatch | "This page is informational — your visitor isn't ready to buy yet. A hard sell here will hurt both your conversion and your ranking." |
| Always-be-selling fallacy | "Your CTA is too aggressive for this type of page. Readers aren't ready to buy — they're looking for information. Soften this or remove it." |
| Equity leaking externally | "Your main content page is sending ranking power to external sites. Add nofollow to these links or remove them — that power should stay in your content system." |

---

## What This Means for Sharkly's Architecture

### Current State of the Spec
The current spec assumes Architecture A for all clusters — the focus page IS the money page. This is correct for service businesses but wrong for ecommerce and SaaS. Architecture B has no data model support, no internal link engine handling, and no brief generation differentiation.

### What Needs to Exist
1. A cluster-level field indicating Architecture A or B (see `architecture-b-downstream-product-page.md`)
2. An internal link engine that applies the six rules above when evaluating and suggesting links
3. A cluster intelligence layer that audits the actual linking graph against these rules and surfaces violations as plain-English findings (see `cluster-intelligence-layer.md`)
4. Brief generation that knows whether it is writing for Architecture A or B and adjusts CRO context accordingly

### The Bigger Principle
Sharkly is building a system that teaches small business owners how their site works as a machine — not as a collection of individual pages. Most users come in thinking "I need better pages." The insight Sharkly delivers is "you need a better system." That is a fundamentally more valuable and stickier product than a page-level SEO checker.

---

## Nav and Footer Link Dilution — The Silent Equity Drain

This section covers a related mechanic that directly affects how the cluster intelligence layer counts equity connections and how the technical audit flags page-level issues.

### What Navbar and Footer Links Actually Do

Based on US8117209B1 — the Reasonable Surfer patent calculates equity as:

```
Equity passed = PageRank(source page) × ClickProbability(link)
```

Navbar and footer links score low on almost every ClickProbability factor:

- **Placement** — header and footer are the lowest-equity positions. The patent explicitly distinguishes body text links from navigational links.
- **Anchor text** — navbar links use generic labels ("Home", "Products", "Services"). These tell Google almost nothing about the destination page's topic.
- **Click probability** — real users almost never click navbar links while reading an article. The Reasonable Surfer model is built on actual user behaviour data.
- **Topical relevance** — a navbar link to "Products" from a blog post about hot flashes has zero topical connection to the surrounding content.

**The equity multiplier table (already in Sharkly spec, Section 17):**

```
Body text early in article  → 1.00× (Very High)
Body text late in article   → 0.80× (High)
Above-fold sidebar          → 0.50× (Medium)
Navigation menu             → 0.30× (Low)
Footer                      → 0.15× (Very Low)
```

A footer link passes 15% of what a body text link passes. A navbar link passes 30%. Not zero — but nearly irrelevant for equity purposes relative to a well-placed contextual body link.

### What Navbar and Footer Links DO Matter For

They are not worthless — just not for equity transfer:

- **Crawlability** — Googlebot follows navbar and footer links to discover pages. For discovery purposes these links are necessary.
- **Sitewide structural signals** — A link in the navbar of every page signals to Google that destination is architecturally important. Homepage, main service pages, and key category pages belong in the navbar for this reason.
- **User navigation Navboost** — If someone reads an article, clicks to the product page via the footer, and stays 3 minutes — that is a positive behavioural signal regardless of how little equity the footer link passed.

### The Dilution Mechanic — How Nav Bloat Hurts Body Links

Every page has a finite equity pool. The formula divides it across every outbound link — internal and external, body text and navigation, meaningful and irrelevant. Every link takes a share.

**Simple example:**
```
Page with clean architecture (3 body links):
Body link share = 1/3 = 33% of available equity to target

Page with bloated nav/footer (17 links total):
Body link share = 1/17 = 5.9% of available equity to target
```

That is a 5-6x difference from the same article — just from nav and footer bloat.

**The more accurate probability-weighted calculation:**

Google is not naive about this. The Reasonable Surfer model uses probability-weighted division, not simple link counting:

```
Each link's share = its click probability / sum of all links' click probabilities

Example page:
- 1 body link          (1.00×)
- 10 navbar links      (0.30× each = 3.00 total)
- 6 footer links       (0.15× each = 0.90 total)

Total weighted pool = 1.00 + 3.00 + 0.90 = 4.90

Body link's share = 1.00 / 4.90 = 20.4%

vs clean page with 3 body links:
Body link's share = 1.00 / 3.00 = 33.3%
```

Still a meaningful difference. Still worth caring about. Not as catastrophic as pure link counting suggests — but real and compounding at scale.

### The Shopify / Ecommerce Problem

Large navigation menus are extremely common on small business websites. Shopify stores especially tend to have:

- Top navbar: 6-8 items
- Mega menu dropdowns: 20-30 additional links
- Footer: 4-5 columns of links (policies, categories, social, contact)
- Sometimes a secondary navbar for categories

A standard Shopify theme can easily add 40-50 navigational links to every single page sitewide — every article, every product page, every collection page — all carrying that overhead before a single piece of content links anywhere.

This compounds across the entire site. If a site has 50 articles all with 40 nav links all trying to pass equity to the focus page — the cumulative equity reaching the focus page is a fraction of what a leaner site architecture would deliver. The site with clean minimal navigation has a structurally more efficient equity distribution system. Over time that compounds into meaningfully better rankings for the same content quality.

**Impact by page type:**
- **Supporting articles** — Most affected. Their entire job is to pass equity to the focus page. Nav bloat directly reduces how much they can pass.
- **Focus pages** — Also affected. They receive equity from many sources so individual dilution matters less on the receiving end. But their own nav bloat reduces how much they pass forward to the product page.
- **Product pages** — Least affected from an equity-sending perspective (they are the destination). But receive less total equity if every upstream page is diluted.

### What the Cluster Intelligence Layer Must Know

When evaluating a cluster's equity flow, the cluster intelligence layer must:

1. **Count only body text links as meaningful equity connections** — navbar and footer links between cluster pages do not count as reverse silo connections for equity purposes
2. **Ignore navbar and footer links** when calculating which supporting articles are connected to the focus page
3. **Flag nav-only connections** — if a page's ONLY link to the focus page is through the navbar, fire a specific warning

**Plain-English output for nav-only connection:**
> "Your article links to your main content page through your navigation menu — but not in the content itself. Navigation links pass almost no ranking power. Add a contextual mention in the body of the article where it fits naturally."

### Two Audit Warnings to Build

**Warning Type 1 — Page-level (cluster intelligence layer / workspace):**

Trigger: Total link count on a supporting article exceeds 25 links.

```javascript
function detectNavFooterDilution(page) {
  const totalLinks = page.all_links?.length || 0
  const bodyLinks = page.internal_links?.filter(l => l.placement === 'body').length || 0
  const navFooterLinks = totalLinks - bodyLinks

  if (totalLinks > 25 && navFooterLinks > bodyLinks * 2) {
    return {
      total_links: totalLinks,
      nav_footer_count: navFooterLinks,
      body_link_share_pct: Math.round((1.00 / totalLinks) * 100)
    }
  }
  return null
}
```

**Plain-English output:**
> "This page has {total_links} links on it — mostly from your navigation and footer. Your main content link is only getting {body_link_share_pct}% of the ranking power this page could pass. Consider using a simpler navigation template on your blog posts."

**Warning Type 2 — Site-level (technical SEO audit, Scale tier):**

Trigger: Crawler finds consistent nav/footer link counts above 25 across all or most pages sitewide.

```javascript
function detectSitewideNavBloat(crawlResults) {
  const pages = crawlResults.pages
  const pagesWithHighNavCount = pages.filter(p => {
    const navFooterLinks = (p.nav_links || 0) + (p.footer_links || 0)
    return navFooterLinks > 20
  })
  const ratio = pagesWithHighNavCount.length / pages.length

  if (ratio > 0.7) { // more than 70% of pages affected
    const avgNavLinks = Math.round(
      pagesWithHighNavCount.reduce((sum, p) => sum + (p.nav_links || 0) + (p.footer_links || 0), 0)
      / pagesWithHighNavCount.length
    )
    return { pages_affected: pagesWithHighNavCount.length, avg_nav_links: avgNavLinks }
  }
  return null
}
```

**Plain-English output:**
> "Your navigation adds {avg_nav_links} links to every page on your site. This reduces the effectiveness of your internal linking strategy across all your content. Streamlining your navigation — especially on blog post pages — would improve how efficiently your articles build ranking power for your main pages."

**Shopify-specific recommendation (fire when platform = Shopify):**
> "Shopify blog posts and product pages often share the same navigation template. Consider using a minimal navigation theme for blog posts — they don't need a full mega menu. Articles are there to rank and pass ranking power, not to navigate. A leaner template means more of that power reaches where it needs to go."

### Plain-English Translations to Add to User-Facing Output Table

| Technical concept | Plain-English output |
|---|---|
| Nav-only link to focus page | "Your article links to your main page through the navigation menu — not in the content. Navigation links pass almost no ranking power. Add a mention in the body text." |
| High total link count on article | "This page has {N} links on it before a reader even starts your article. This weakens how much ranking power your article passes. Simplify your navigation on blog pages." |
| Sitewide nav bloat | "Your navigation adds {N} links to every page. This is reducing your entire internal linking strategy's effectiveness. Streamline your blog page template." |
| Why nav links don't count as SEO links | "Navigation links don't count as SEO links. Google can see them but they pass almost no ranking power. Your content needs to mention your key pages naturally — that's where the real value comes from." |

# V1 + Nice-to-Haves Build Plan

## Current Status
- ✅ GSC Integration complete
- ✅ Multi-project context already in place
- ⏳ Starting Phase 1: Foundational Features

---

## Phase 1: Foundational Features (PRIORITY)

### 1.1 Multi-project support
- **Status**: ✅ Already implemented via `SiteContext`
- **What it does**: Allows users to manage multiple sites/projects
- **DB**: `user_selected_sites` table
- **Files**: `src/contexts/SiteContext.tsx`, `src/hooks/useSites.ts`

### 1.2 Rankings Dashboard
**Files to create/modify**:
- [ ] `src/pages/Rankings.tsx` - Main rankings page (Growth+ tier)
- [ ] `src/components/rankings/RankingsTable.tsx` - Keywords table
- [ ] `src/components/rankings/PositionChange.tsx` - Green/red position indicators
- [ ] `src/hooks/useRankings.ts` - Fetch GSC rankings data
- [ ] `src/components/rankings/CTROptimizationModal.tsx` - Suggest meta titles/descriptions

**Database**:
- Use existing `performance_data` table (already has GSC data)
- Add queries to aggregate by page + keyword

**API Backend**:
- `api/src/routes/rankings.ts` - New route
- `api/src/controllers/rankingsController.ts` - Fetch rankings, CTR optimization suggestions

**Features**:
- Sortable keyword table (keyword, position, change, impressions, CTR)
- Color-coded position changes (green up, red down)
- CTR optimization action (3 credits) if CTR < 2%
- Navboost Momentum Score display (🟢 Building / 🟡 Flat / 🔴 Weakening)

### 1.3 Stripe Subscription Integration
**Files to create**:
- [ ] `src/pages/Billing.tsx` - Upgrade/downgrade plans
- [ ] `src/components/billing/StripePricingCards.tsx` - Plan selection
- [ ] `src/hooks/useStripeCheckout.ts` - Checkout handler
- [ ] `api/src/controllers/stripeController.ts` - New endpoints
- [ ] `api/src/routes/stripe.ts` - Stripe routes

**Features**:
- Stripe Checkout integration
- Plan selection (Builder/Growth/Scale/Pro)
- Overage credit purchase ($0.05/credit)
- Webhooks for subscription updates
- Stripe Customer Portal link

### 1.4 Settings Pages
**Files to modify/create**:
- [ ] `src/pages/SettingsIntegrations.tsx` - GSC, Shopify, WordPress status
- [ ] `src/pages/SettingsBilling.tsx` - Billing, plan, usage
- [ ] `src/pages/SettingsNotifications.tsx` - Notification preferences
- [ ] `src/pages/SettingsProfile.tsx` - User profile, avatar

---

## Phase 2: Technical SEO (Scale+ tier)

### 2.1 Site Crawler
**Files to create**:
- [ ] `api/src/services/crawlerService.ts` - Website crawler logic
- [ ] `api/src/controllers/crawlerController.ts` - Crawler endpoints
- [ ] `src/pages/Technical.tsx` - Technical SEO dashboard
- [ ] `src/components/technical/CrawlStatus.tsx` - Crawler progress

**Features**:
- Crawl all indexable pages
- Detect: missing metas, duplicates, thin content (<300 words), broken links
- Store results in `technical_issues` table

### 2.2 Technical Issues List
- Display issues by category
- One-click fixes for common issues
- Severity levels: Critical/Warning/Info

### 2.3-2.5 Patent-Grounded Audits
- H2 Passage Quality Checker [US9940367B1]
- Information Gain Checker [US20190155948A1]
- Brand Search Signal Tracker [US8682892B1]

---

## Phase 3: Integrations (V1)

### 3.1 Shopify Integration
- OAuth flow
- Direct publish to Shopify blog
- Product description rewriter
- Collection page optimizer

### 3.2 WordPress Integration
- OAuth via WordPress REST API
- Direct publish
- Category mapping

### 3.3 Shopify Billing API
- Mirror tiers through Shopify for app store

---

## Phase 4: Content Generation

### 4.1-4.5 Content Features
- Meta title/description generator (3 credits)
- FAQ generation
- Product description rewriter (10 credits)
- Section-level regeneration (5 credits)
- Tone adjustment (5 credits)

---

## Phase 5: Advanced Features

### 5.1 Internal Link Suggestion [US8117209B1]
- Reasonable Surfer equity model
- Placement enforcement (body-early, body-late, etc.)

### 5.2-5.5 Nice-to-Haves
- Buyer-intent CTA generator
- Content calendar
- White-label PDF exports (Pro tier)
- Seasonal opportunity detection

---

## Database Migrations Needed

```sql
-- Already have:
- gsc_tokens
- performance_data
- navboost_signals
- sites
- user_selected_sites

-- Need to add:
- technical_issues
- credit_transactions (if not exists)
- integrations (shopify, wordpress)
```

---

## Environment Variables to Add

```
# Stripe
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_BUILDER_PRICE_ID
STRIPE_GROWTH_PRICE_ID
STRIPE_SCALE_PRICE_ID
STRIPE_PRO_PRICE_ID

# Shopify
SHOPIFY_CLIENT_ID
SHOPIFY_CLIENT_SECRET

# WordPress
WORDPRESS_CLIENT_ID
WORDPRESS_CLIENT_SECRET
```

---

## Tier Gating

| Feature | Builder | Growth | Scale | Pro |
|---------|---------|--------|-------|-----|
| Rankings dashboard | ❌ | ✅ | ✅ | ✅ |
| Performance | ❌ | ✅ | ✅ | ✅ |
| Technical SEO | ❌ | ❌ | ✅ | ✅ |
| White-label | ❌ | ❌ | ❌ | ✅ |
| Monthly credits | 250 | 600 | 1,100 | 2,500 |

---

## Estimated Effort

- Phase 1: 5-7 days
- Phase 2: 7-10 days
- Phase 3: 5-7 days
- Phase 4: 3-5 days
- Phase 5: 3-5 days

**Total: ~4-5 weeks**

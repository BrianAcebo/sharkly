# Technical SEO Audit System

## Overview

Sharkly includes a comprehensive technical SEO audit system that automatically analyzes websites during onboarding and provides detailed findings with actionable recommendations. The audit runs asynchronously and can be re-triggered anytime to track improvements.

## Audit Dimensions

### 1. Crawlability Check (Pre-audit Validation)
Verifies the site is accessible and crawlable before running the full audit.

**Checks include:**
- DNS resolution
- SSL/TLS certificate validation (HTTPS)
- HTTP connectivity and status codes
- robots.txt parsing and Googlebot allowance
- WAF/firewall detection (Cloudflare, Sucuri, Wordfence)
- Meta tag inspection (noindex, nofollow)
- Redirect chain detection

**Output:**
- `isCrawlable: boolean` - Can the site be audited?
- Issue list with solutions for each blocker
- Response time measurement

**Skip audit if:** DNS fails, 4xx/5xx errors, authentication required, critical SSL issues

---

### 2. Technical Crawl (Site Scanning)
Crawls up to 50 pages during onboarding (up to 500 for manual audits) and detects technical issues.

**Issues Detected (17+ types):**

| Issue | Severity | Impact |
|-------|----------|--------|
| Missing page title | Critical | No search listing |
| Missing H1 | Warning | Poor structure |
| Missing meta description | Warning | Reduced CTR |
| Missing canonical | Warning | Duplicate content risk |
| Noindex/nofollow tags | Critical | Pages hidden from Google |
| Broken links | Warning | Crawl waste, user friction |
| Redirect chains | Warning | Crawl budget waste |
| Slow response (>3s) | Warning | Poor rankings |
| SSL mismatch | Critical | Trust issues |
| Thin content (<300 words) | Warning | Low relevance |
| Duplicate content | Warning | Indexation issues |
| Missing schema | Info | Lost rich snippets |
| Lazy-loaded content | Warning | May not index |
| Large pages (>5MB) | Warning | Slow load |
| Too many links (>1000) | Warning | Crawl waste |
| JS-only content | Warning | May not index |
| Soft 404 (no title/H1) | Warning | Not properly indexed |

**Output:**
- Total pages crawled
- Issues grouped by type and severity
- Average response time
- SSL coverage percentage
- Indexable pages percentage

---

### 3. Domain Authority Estimation
Estimates site authority on 0-100 scale.

**Methods (priority order):**
1. **Moz API** (if `MOZ_API_KEY` configured)
   - Real DA score from Moz
   - Confidence: HIGH

2. **Heuristic Estimation** (fallback)
   - TLD bonus (.edu/.gov = +15, .com/.org = +5)
   - Domain length scoring
   - Base score: 20-50
   - Confidence: LOW

**Use cases:**
- Determine achievable keywords
- Set realistic SEO timeline
- Compare vs competitors
- Prioritize link building

---

### 4. Core Web Vitals Estimation
Estimates Google's key page experience metrics.

**Metrics:**
- **LCP** (Largest Contentful Paint)
  - Target: <2.5s (good)
  - 2.5-4s (needs improvement)
  - >4s (poor)

- **CLS** (Cumulative Layout Shift)
  - Target: <0.1 (good)
  - 0.1-0.25 (needs improvement)
  - >0.25 (poor)

- **INP** (Interaction to Next Paint)
  - Target: <200ms (good)
  - 200-500ms (needs improvement)
  - >500ms (poor)

**Status:** good / needs_improvement / poor

---

### 5. Indexation Status Check
Verifies Google has indexed pages and estimates crawl budget.

**Data points:**
- Pages indexed (from GSC if connected)
- Total pages on site
- Estimated monthly crawl budget
- GSC connection status

**Note:** Requires Google Search Console to be connected for live data

---

### 6. Analysis & Recommendations
Synthesizes all findings into actionable insights.

**Audit Score (0-100):**
- Start: 100
- Deduct: -5 per critical issue
- Deduct: -1 per warning/info issue
- Deduct: up to -20 for poor CWV
- Deduct: up to -10 for <95% SSL coverage
- Deduct: up to -15 for <80% indexability

**Health Status:**
- 🟢 **Good**: Score >60, <5 critical issues
- 🟡 **Warning**: Score 30-60 or 5+ critical issues
- 🔴 **Critical**: Score <30 or not crawlable

**Recommendations (3-8 per audit):**
- Fix critical issues first
- Expand thin content pages
- Improve page load speed
- Fix broken links
- Add missing metadata
- Build backlinks (if DA low)
- Add structured data

---

## Integration with Onboarding

### Automatic Audit Flow
1. User completes payment
2. User fills site info (URL, business name, etc.)
3. **Site created** → audit starts in background
4. **Onboarding completes** (non-blocking)
5. **Dashboard shows** audit score, health status
6. **Full report available** when audit completes (2-10 min)

### Benefits
- Immediate site health visibility
- No action required from user
- Actionable insights ready on day 1
- Can re-run anytime to track progress

---

## Database Schema

### sites table (additions)
```sql
last_audit_at              TIMESTAMP     -- When last audit ran
audit_score                INTEGER       -- 0-100
audit_health_status        TEXT          -- critical/warning/good
domain_authority_estimated INTEGER       -- 0-100
pages_crawled_count        INTEGER       -- Pages in last audit
critical_issues_count      INTEGER       -- Count
crawlability_status        TEXT          -- Status
```

### audit_results table (new)
Stores complete audit history for trending and comparison.

**Crawlability** (7 fields):
- is_crawlable, site_reachable, dns_resolvable, ssl_valid, status_code, robots_exists, bot_allowed, response_time, issues (JSONB)

**Crawl Results** (9 fields):
- total_pages, total_issues, critical_issues, warning_issues, info_issues, avg_response_time, pages_with_ssl, indexable_pages, issues_by_type (JSONB)

**Domain Authority** (3 fields):
- estimated, method, confidence

**Core Web Vitals** (4 fields):
- lcp_estimate, cls_estimate, inp_estimate, status

**Indexation** (4 fields):
- pages_indexed, total_pages, crawl_budget, gsc_connected

**Overall** (4 fields):
- overall_score, health_status, recommendations (array), created_at

---

## API Endpoints

### Get Latest Audit
```
GET /api/audit/:siteId/latest
```

**Response:**
```json
{
  "audit": {
    "id": "uuid",
    "siteId": "uuid",
    "createdAt": "2025-03-02T...",
    "crawlabilityCheck": { ... },
    "crawlResults": { ... },
    "domainAuthority": { ... },
    "coreWebVitals": { ... },
    "indexationStatus": { ... },
    "overallScore": 72,
    "healthStatus": "good",
    "recommendations": [ ... ]
  },
  "inProgress": false
}
```

If no audit exists yet: `audit: null, inProgress: true`

### Get Audit History
```
GET /api/audit/:siteId/history
```

**Response:**
```json
{
  "audits": [
    {
      "id": "uuid",
      "overall_score": 72,
      "health_status": "good",
      "created_at": "2025-03-02T...",
      "crawl_total_pages": 47,
      "crawl_total_issues": 8
    }
  ]
}
```

Returns last 10 audits for trending.

### Trigger Audit
```
POST /api/audit/:siteId/run
```

**Response:**
```json
{
  "ok": true,
  "message": "Audit started in background"
}
```

Audit runs async. Check `/latest` endpoint to see results.

---

## Implementation Details

### Services
- `technicalAuditService.ts` - Orchestrates full audit pipeline
- `crawlabilityChecker.ts` - Pre-audit validation
- `crawlerService.ts` - Technical crawl (existing)

### Controllers
- `auditController.ts` - API handlers
- `onboarding.ts` - Triggers audit after site creation

### Routes
- `audit.ts` - Audit endpoints

---

## Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Crawlability check | 2-5s | DNS + HTTP request |
| Technical crawl (50 pages) | 3-15s | Depends on site speed |
| DA estimation | <1s | Moz API or local calc |
| Full audit | 10-30s | All steps combined |
| API response | <100ms | DB lookup |

**Optimization:** Audit runs async during onboarding, doesn't block payment flow.

---

## Configuration

### Optional Environment Variables
```
MOZ_API_KEY          # For real Domain Authority data
SERPER_API_KEY       # For search competitor analysis
CLAUDE_API_KEY       # For recommendations (future)
```

### Adjustable Parameters
In `technicalAuditService.ts`:
```typescript
CRAWL_CONFIG = {
  MAX_PAGES_PER_SITE: 500,           // Max pages to crawl
  TIMEOUT_MS: 30000,                 // Request timeout
  SLOW_RESPONSE_THRESHOLD: 3000,     // ms (slow page = 3s+)
  LARGE_PAGE_THRESHOLD: 5242880,     // 5MB
  MAX_LINKS_PER_PAGE: 1000,
}
```

---

## Future Enhancements

### Phase 1 (Quick Wins)
- [ ] Show "fix this" buttons for common issues
- [ ] Track issue history over time
- [ ] Compare audit scores vs date
- [ ] Export audit as PDF

### Phase 2 (Advanced)
- [ ] Scheduled automatic re-audits (weekly/monthly)
- [ ] Alert user when critical issues appear
- [ ] Compare DA to competitors
- [ ] Link audit findings to content recommendations
- [ ] Real GSC integration for indexed pages count

### Phase 3 (AI-Powered)
- [ ] Auto-fix suggestions with estimated impact
- [ ] Prioritization based on traffic potential
- [ ] Competitor audit comparison
- [ ] Predictive scoring (if you fix X, score will be Y)

---

## Troubleshooting

### Audit Shows "Not Crawlable"
**Check:**
- Domain DNS is resolving
- Site is publicly accessible (no auth required)
- SSL certificate is valid
- Site isn't returning 4xx/5xx errors
- robots.txt isn't blocking Google

**Solution:** Fix the blocking issue and re-run audit

### Audit Takes Too Long
**Likely:** Site is slow or has many pages
**Solution:** Audit should complete within 5-10 minutes
- Check server logs for errors
- Consider CDN for faster response
- Reduce page count if >500

### DA Seems Too Low/High
**If using heuristic:** Low confidence estimate
**Solution:** Connect Moz API for real DA scores

### GSC Data Not Showing
**Likely:** GSC not connected
**Solution:** User needs to connect Google Search Console in settings

---

## Testing Checklist

- [ ] Create new site through onboarding
- [ ] Verify audit starts automatically
- [ ] Check `/api/audit/:siteId/latest` after 30s
- [ ] Verify audit_results table is populated
- [ ] Manually trigger `POST /api/audit/:siteId/run`
- [ ] Check audit history endpoint
- [ ] Verify RLS prevents users from seeing other orgs' audits
- [ ] Test with site that has crawlability issues
- [ ] Verify recommendations are generated
- [ ] Check score calculation accuracy

---

## Support

For questions or issues:
1. Check audit logs: `SELECT * FROM audit_results WHERE site_id = '...'`
2. Review crawlability check first (most issues caught there)
3. Verify site is publicly accessible
4. Check API response times in logs

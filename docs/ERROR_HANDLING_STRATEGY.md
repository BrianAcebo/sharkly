# Error Handling Strategy for Technical Audit

## Overview

Instead of using fallback estimates when third-party APIs fail, we now display clear, transparent error messages to users. This ensures they understand exactly what data is unavailable and why.

---

## Backend Error Tracking

### 1. **Technical Audit Service** (`api/src/services/technicalAuditService.ts`)

#### Error Collection
Each API call is wrapped in try-catch, capturing errors in an `apiErrors` object:

```typescript
const apiErrors: Record<string, string> = {}; // Track all API failures

try {
    daEstimate = await this.estimateDomainAuthority(siteUrl);
} catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    apiErrors['domainAuthority'] = errorMsg;
    daEstimate = {
        estimated: 0,
        method: 'error',
        confidence: 'low',
        error: errorMsg  // Include error in result
    };
}
```

#### Error Storage
Errors are stored in **both** the metric object AND the consolidated `apiErrors` field:

```typescript
{
    domainAuthority: {
        estimated: 0,
        method: 'error',
        error: 'Failed to fetch Domain Authority: Network timeout'
    },
    coreWebVitals: {
        lcpEstimate: 0,
        status: 'poor',
        error: 'Could not fetch Core Web Vitals from Google PSI: Invalid API key'
    },
    apiErrors: {
        'domainAuthority': 'Failed to fetch Domain Authority: Network timeout',
        'coreWebVitals': 'Could not fetch Core Web Vitals from Google PSI: Invalid API key'
    }
}
```

### 2. **Audit Controller** (`api/src/controllers/auditController.ts`)

Returns error information to frontend alongside other data:

```typescript
const formattedAudit = {
    // ... other fields
    domainAuthority: {
        estimated: audit.domain_authority_estimated,
        method: audit.domain_authority_method,
        error: audit.domain_authority_error || undefined  // Include error if present
    },
    coreWebVitals: {
        lcpEstimate: audit.cwv_lcp_estimate,
        error: audit.cwv_error || undefined
    },
    indexationStatus: {
        // ... 
        error: audit.indexation_error || undefined
    },
    apiErrors: audit.api_errors || {}  // Full error log
};
```

### 3. **Database Migration** (`sql/migrations/2025-03-02_add_api_errors_to_audit.sql`)

Stores error messages permanently:

```sql
ALTER TABLE public.audit_results
ADD COLUMN IF NOT EXISTS domain_authority_error TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cwv_error TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS indexation_error TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS api_errors JSONB DEFAULT '{}'::jsonb;
```

Each column stores:
- `domain_authority_error`: Error from Moz API
- `cwv_error`: Error from Google PSI API
- `indexation_error`: Error from GSC check
- `api_errors`: JSON map of all errors for analysis

---

## Frontend Error Display

### 1. **Audit Results Page** (`src/pages/AuditResults.tsx`)

#### Domain Authority Section
When API fails:

```
┌─────────────────────────────────────────────┐
│ ⚠️  API Error                               │
│ Could not fetch Domain Authority from      │
│ Moz API: Network timeout                   │
│                                             │
│ Please try running the audit again.        │
└─────────────────────────────────────────────┘
```

Shows red background (`bg-red-50` light, `bg-red-900/20` dark) with:
- AlertCircle icon
- Error message from backend
- Clear instruction to retry

#### Core Web Vitals Section
Similar error display:

```
┌─────────────────────────────────────────────┐
│ ⚠️  API Error                               │
│ Could not fetch Core Web Vitals from       │
│ Google PageSpeed Insights: Invalid API key │
│                                             │
│ Please try running the audit again.        │
└─────────────────────────────────────────────┘
```

#### Indexation Status Section
Shows specific instructions:

```
┌─────────────────────────────────────────────┐
│ ⚠️  Check Failed                            │
│ Failed to fetch GSC data: Not connected    │
│                                             │
│ Connect Google Search Console to see       │
│ indexation data.                           │
└─────────────────────────────────────────────┘
```

### 2. **Audit Hook** (`src/hooks/useAudit.ts`)

Interfaces updated to include optional error fields:

```typescript
export interface AuditDomainAuthority {
    estimated: number;
    method: string;
    confidence: 'low' | 'medium' | 'high';
    error?: string;  // NEW: Error message if API failed
}

export interface AuditCoreWebVitals {
    lcpEstimate: number;
    clsEstimate: number;
    inpEstimate: number;
    status: 'good' | 'needs_improvement' | 'poor';
    error?: string;  // NEW: Error message if API failed
}

export interface AuditIndexationStatus {
    pagesIndexed: number | null;
    totalPages: number;
    estimatedCrawlBudget: string;
    gscConnected: boolean;
    error?: string;  // NEW: Error message if check failed
}

export interface AuditResult {
    // ... other fields
    apiErrors?: Record<string, string>;  // NEW: Full error log
}
```

---

## API Failure Scenarios

### Scenario 1: Moz API Down

**What happens:**
- Audit catches error from Moz
- Stores "Moz API error: 503 Service Unavailable"
- DA shown as 0 with error badge
- Other metrics (CWV, indexation) continue normally

**User sees:**
- Red error box in Domain Authority section
- Other sections show real data
- Can still see crawlability, issues, recommendations
- Clear message to retry when Moz is back up

### Scenario 2: Invalid Google PSI Key

**What happens:**
- Audit catches error "Invalid API key"
- Stores error in database
- CWV shown as 0 with error badge
- DA and indexation continue normally

**User sees:**
- Red error box in Core Web Vitals section
- Instruction to check environment variable
- Can still see other audit data

### Scenario 3: GSC Not Connected

**What happens:**
- Check fails gracefully (expected condition)
- Stores error "GSC not connected"
- Shows as "⚠️ Not Connected" instead of red error

**User sees:**
- Yellow/warning status in Indexation section
- Clear message to connect GSC
- Crawl budget shown as "unknown"

### Scenario 4: Network Timeout During Crawl

**What happens:**
- Crawl fails (not an API call)
- Service continues with other checks
- Crawl results show 0 pages
- Other metrics calculated from partial data

**User sees:**
- Crawlability section shows connection error
- Recommendations still generated
- CAN still continue audit if wanted

---

## No Fallbacks - Full Transparency

### What We Changed From:

❌ **Before:**
```typescript
// If Moz fails, estimate DA
try {
    daEstimate = await getMozDA();
} catch {
    // Fallback to heuristic
    daEstimate = estimateDAFromDomain();  // Could be ±20 points off!
}
```

Problems:
- Estimates could be wildly inaccurate
- User doesn't know it's an estimate
- Might take action based on wrong data
- No way to know API failed

### ✅ **Now:**
```typescript
try {
    daEstimate = await getMozDA();
} catch (e) {
    apiErrors['domainAuthority'] = e.message;
    // Store error, don't estimate
    daEstimate = {
        estimated: 0,
        method: 'error',
        error: e.message  // User sees this
    };
}
```

Benefits:
- User sees exactly what went wrong
- No false confidence in inaccurate data
- Can monitor which APIs fail
- Can take action (retry, check API keys, etc.)

---

## Monitoring & Debugging

### Error Logs in Database

Query audits with errors:

```sql
SELECT 
    id, 
    site_id, 
    created_at, 
    api_errors
FROM audit_results
WHERE api_errors != '{}';
```

### Console Logs

All API calls logged:

```
[TechnicalAudit] Fetching DA from Moz for: example.com
[TechnicalAudit] Got DA from Moz: 45
[TechnicalAudit] Fetching CWV from Google PSI for: https://example.com
[TechnicalAudit] Got CWV from PSI: { lcp: 2100, cls: 0.08, inp: 150 }
[TechnicalAudit] DA fetch failed: Moz API error: Network timeout
```

### Frontend Error Display

Users see:
- Which API failed
- Why it failed (with technical details)
- What to do next
- Can retry audit

---

## API Failure Messages

### Domain Authority (Moz API)
- `"Invalid API key"` → Check `MOZ_API_KEY` in .env
- `"Network timeout"` → Moz API is slow/down
- `"Rate limited"` → Too many requests
- `"Domain not found"` → Moz doesn't have data on this domain

### Core Web Vitals (Google PSI API)
- `"Invalid API key"` → Check `GOOGLE_PSI_API_KEY` in .env
- `"Quota exceeded"` → Daily quota hit
- `"Invalid URL"` → Site URL is malformed
- `"No loading experience data"` → Google has no CWV data

### Indexation Status (GSC)
- `"GSC not connected"` → User needs to connect in settings
- `"Failed to fetch GSC data"` → GSC API error
- `"Organization not found"` → Database lookup failed

---

## Best Practices

1. **Always Show Errors**: Don't hide API failures from users
2. **Be Specific**: Include actual error message, not generic "Something went wrong"
3. **Be Actionable**: Tell user what to do (retry, check keys, connect GSC, etc.)
4. **Log Everything**: Store errors in DB for monitoring
5. **No Estimates**: If API fails, show error, not estimate
6. **Independent APIs**: One failure doesn't block others

---

## Testing

To test error handling:

### Test Moz API Failure
```bash
# Set invalid key
export MOZ_API_KEY="invalid"
# Run audit → Should see "Invalid API key" error
```

### Test Google PSI Failure
```bash
# Set invalid key
export GOOGLE_PSI_API_KEY="invalid"
# Run audit → Should see "Invalid API key" error
```

### Test GSC Missing
```bash
# Don't connect GSC
# Run audit → Should show "GSC not connected" (not an error, expected)
```

---

## Summary

Instead of falling back to inaccurate estimates when APIs fail, we now:
- ✅ Capture the actual error
- ✅ Store it in the database
- ✅ Return it to the frontend
- ✅ Display it clearly to the user
- ✅ Tell them how to fix it
- ✅ Let other metrics continue working

This ensures **complete transparency** and **data integrity** - users see exactly what's real data vs. what's unavailable.

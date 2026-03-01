# Google Search Console (GSC) Integration — Complete Implementation Guide

## Overview

This guide covers the complete GSC integration for Sharkly, including OAuth token management, site selection, encrypted token storage, automated daily syncing, and performance data display.

**Status**: All 5 components have been implemented and are ready for deployment.

---

## 1. Database Migrations

### Location
`sql/migrations/2025-02-26_gsc_tokens_and_performance.sql`

### Tables Created

#### `gsc_tokens`
Stores user's Google Search Console OAuth tokens (one per user).

```sql
Columns:
- id (uuid, PK)
- user_id (uuid, FK to auth.users, UNIQUE)
- site_url (text, nullable) — User's selected SC property URL
- encrypted_refresh_token (text) — AES-256-GCM encrypted (via Edge Function)
- access_token (text) — Expires in 1 hour, refreshed via gsc-sync
- access_token_expires_at (timestamptz)
- last_synced_at (timestamptz) — When gsc-sync last ran for this user
- created_at, updated_at (timestamptz)

Indexes:
- idx_gsc_tokens_user_id
- idx_gsc_tokens_site_url

RLS: Users can only see/modify their own tokens
```

#### `performance_data`
Caches Search Analytics data (query, page, date, clicks, impressions, CTR, position).

```sql
Columns:
- id (uuid, PK)
- user_id (uuid, FK)
- site_url (text)
- date (date)
- query (text) — Search query
- page (text) — URL that appeared in results
- clicks (int)
- impressions (int)
- ctr (numeric)
- position (numeric)
- created_at, updated_at (timestamptz)

Constraint: UNIQUE(user_id, site_url, date, query, page)

Indexes:
- idx_performance_data_user_id
- idx_performance_data_site_url
- idx_performance_data_date
- idx_performance_data_user_site_date

RLS: Users read their own; service role inserts/updates
```

#### `navboost_signals` (Optional, V2)
Aggregated CTR trends for Navboost warnings (declining CTR detection).

---

## 2. Site Picker Modal

### Location
`src/components/gsc/GSCPropertyPicker.tsx`

### How It Works

1. **Trigger**: After OAuth callback, if user's refresh token is present
2. **Fetch**: Calls `GET /webmasters/v3/sites` with the access token
3. **Display**: List of user's Search Console properties
4. **Select**: User picks one property to track
5. **Save**: Property URL is saved to `gsc_tokens.site_url`

### Key Features

- Fetches properties in real-time from Google's API
- Shows permission level for each property
- Handles errors gracefully (no properties, permission denied)
- Disables "Continue" button until a property is selected

### Integration

Rendered in `src/pages/Oauth/Callback.tsx` after OAuth completes.

---

## 3. Encryption Edge Function

### Location
`supabase/functions/encrypt-gsc-token/index.ts`

### How It Works

**Before Production**, refresh tokens must be encrypted:

```
Request:  POST /functions/v1/encrypt-gsc-token
Body:     { "refresh_token": "1//0..." }
Response: { "encrypted": "base64(iv || ciphertext)" }
```

### Algorithm

- **Cipher**: AES-256-GCM
- **IV**: 12 random bytes (generated per encryption)
- **Output**: base64(IV || ciphertext) for easy storage

### Deployment

1. Deploy function: `supabase functions deploy encrypt-gsc-token`
2. Set environment variables in Supabase Dashboard → Edge Functions → Manage secrets:
   ```
   ENCRYPTION_KEY=<32-character random string>
   ```

### Integration

Called in `src/pages/Oauth/Callback.tsx` when user selects a property:

```typescript
const encrypted = await encryptRefreshToken(refreshToken);
await saveGSCToken(userId, siteUrl, encrypted, accessToken);
```

---

## 4. GSC Sync Edge Function

### Location
`supabase/functions/gsc-sync/index.ts`

### How It Works

```
POST /functions/v1/gsc-sync
↓
1. Fetch all gsc_tokens with non-null site_url
2. For each token:
   a. Decrypt refresh_token
   b. Exchange for new access_token (Google OAuth)
   c. Call Search Analytics API (28 days of data)
   d. Parse response into performance_data format
   e. UPSERT into performance_data (overwrites on conflict)
   f. Update last_synced_at
3. Return summary { synced: N, rows_inserted: M }
```

### Environment Variables

Required in Supabase Dashboard → Edge Functions → Manage secrets:

```
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
ENCRYPTION_KEY=<same-as-above>
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### Google Search Analytics API

**Endpoint**: `https://www.googleapis.com/webmasters/v3/sites/{site_url}/searchAnalytics/query`

**Request**:
```json
{
  "startDate": "2026-01-26",
  "endDate": "2026-02-23",
  "dimensions": ["query", "page", "date"],
  "rowLimit": 25000
}
```

**Response**:
```json
{
  "rows": [
    {
      "keys": ["query", "page", "date"],
      "clicks": 10,
      "impressions": 100,
      "ctr": 0.1,
      "position": 5.0
    }
  ]
}
```

### Deployment

```bash
supabase functions deploy gsc-sync
```

Then configure daily sync in PostgreSQL (via Supabase Dashboard → SQL Editor):

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule gsc-sync to run daily at 2 AM UTC
SELECT cron.schedule(
  'gsc-sync-daily',
  '0 2 * * *',
  $$
  SELECT
    http_post(
      'https://<your-project>.supabase.co/functions/v1/gsc-sync',
      '{}'::jsonb,
      'application/json',
      jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      )
    )
  $$
);
```

**Note**: This requires the `http` extension in PostgreSQL.

### Alternative: Manual Trigger

For testing or immediate sync:

```bash
curl -X POST https://<your-project>.supabase.co/functions/v1/gsc-sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <service-role-key>"
```

---

## 5. Performance Data Hook & Display

### Hook: `usePerformanceData`

**Location**: `src/hooks/usePerformanceData.ts`

**Usage**:
```typescript
const {
  records,           // Raw PerformanceRecord[]
  byPage,            // Aggregated by page
  byQuery,           // Aggregated by query
  topPages,          // Top 10 by clicks
  topQueries,        // Top 10 by clicks
  totalClicks,       // Sum of all clicks
  totalImpressions,  // Sum of all impressions
  avgCtr,            // Average CTR (%)
  avgPosition,       // Average position
  loading,           // Boolean
  error,             // String | null
  refetch            // () => Promise<void>
} = usePerformanceData({
  siteUrl: "https://example.com",
  days: 28,
  enabled: true
});
```

### Updates to Performance Page

**Location**: `src/pages/Performance.tsx`

**What Changed**:

1. **Stats Cards**: Display real `totalClicks`, `totalImpressions`, `avgCtr`, `avgPosition`
2. **Traffic Chart**: Aggregated clicks by month from `trafficData` (computed from `records`)
3. **Top Pages**: Renders first 5 pages from `topPages` with clicks, impressions, position
4. **Top Queries/Keywords**: Renders top 10 keywords with position, impressions, clicks, CTR
5. **Re-Optimization Queue**: Filters pages with position 4–15, ≥500 impressions, ≥ 85 SEO score
6. **Navboost Momentum**: Shows top 5 queries with CTR and trend status (placeholder for now)

---

## Workflow: User Connects GSC

### Step 1: Click "Connect Search Console" (Coming Soon)

User clicks button to initiate OAuth flow. This redirects to:

```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=...
  redirect_uri=.../oauth/callback
  scope=https://www.googleapis.com/auth/webmasters.readonly
  access_type=offline
  prompt=consent
```

### Step 2: Approve Scopes

User grants permission to "View Search Console data" (read-only).

### Step 3: OAuth Callback

```
.../oauth/callback?code=<auth_code>&state=...
↓
Supabase exchanges code for:
- access_token (1 hour TTL)
- refresh_token (never expires)
↓
Session has provider_refresh_token & provider_token
```

### Step 4: Site Picker Modal

If `provider_refresh_token` is present:

```
GSCPropertyPicker opens
↓
Fetch list from Google Webmasters API
↓
User selects property (e.g., "https://example.com")
↓
encryptRefreshToken() → sends to encrypt-gsc-token function
↓
saveGSCToken(userId, siteUrl, encrypted, accessToken)
↓
gsc_tokens row created with site_url = "https://example.com"
```

### Step 5: First Sync (Manual or Automatic)

```
gsc-sync edge function runs
↓
For user's gsc_tokens:
  - Decrypt refresh_token
  - Exchange for new access_token
  - Fetch 28 days of Search Analytics
  - UPSERT into performance_data
  - Update last_synced_at
↓
Performance page now shows real data
```

---

## Deployment Checklist

### Before Going Live

- [ ] **Database**: Apply migration `2025-02-26_gsc_tokens_and_performance.sql` via Supabase Dashboard or `supabase db push`
- [ ] **Google Cloud Console**: Create OAuth 2.0 credentials (OAuth 2.0 Client ID for Web app)
  - Redirect URI: `https://your-domain.com/oauth/callback`
- [ ] **Environment Variables**:
  - `VITE_GOOGLE_CLIENT_ID` (frontend, public)
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (server secrets)
  - `ENCRYPTION_KEY` (32-char random string for AES-256)
  - `GOOGLE_SCOPES` (if configurable)
- [ ] **Deploy Edge Functions**:
  ```bash
  supabase functions deploy encrypt-gsc-token
  supabase functions deploy gsc-sync
  ```
- [ ] **PostgreSQL Extensions**: Ensure `http` extension is enabled for pg_cron (if using cron):
  ```sql
  CREATE EXTENSION IF NOT EXISTS http;
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  ```
- [ ] **Cron Job**: Schedule daily sync at 2 AM UTC (or manually test first)
- [ ] **Test Flow**:
  1. OAuth sign-in with Google
  2. Site picker appears
  3. Select property
  4. Data syncs automatically
  5. Performance page displays metrics

---

## Encryption & Security Notes

### Refresh Token Encryption

- **Storage**: `gsc_tokens.encrypted_refresh_token` (AES-256-GCM encrypted)
- **Key**: Server-side `ENCRYPTION_KEY` (never exposed to frontend)
- **IV**: Random 12 bytes per encryption (stored in output)
- **When**: Before saving to DB
- **Accessed**: Only in gsc-sync function via decrypt() call

### Access Token

- **Storage**: `gsc_tokens.access_token` (plaintext, 1-hour TTL)
- **Refresh**: Before use in gsc-sync, via Google OAuth refresh flow
- **Note**: Could optionally encrypt too (not critical since 1-hour expiry)

### RLS Policies

- `gsc_tokens`: Users can only view/modify their own
- `performance_data`: Users can only read; service role can write
- `navboost_signals`: Users can only read; service role can write

---

## Monitoring & Troubleshooting

### Check Sync Status

```sql
SELECT user_id, site_url, last_synced_at, created_at
FROM gsc_tokens
ORDER BY last_synced_at DESC;
```

### View Performance Data

```sql
SELECT COUNT(*) as record_count, user_id, site_url
FROM performance_data
GROUP BY user_id, site_url;
```

### Check Edge Function Logs

Supabase Dashboard → Edge Functions → gsc-sync → Logs

Common issues:
- `"Token refresh failed"` → refresh_token may be expired or invalid
- `"Permission denied"` → Google OAuth scope mismatch
- `"Encryption error"` → ENCRYPTION_KEY not set or invalid

---

## Future Enhancements (V2+)

1. **Navboost Signals** → Compute 13-week CTR trends, detect declining keywords
2. **Re-Optimization Queue** → Integrate with SEO scoring (pages 4–15, score < 85)
3. **Manual Sync Button** → Allow users to trigger sync on-demand
4. **Multiple Properties** → Track multiple GSC properties per user
5. **Incremental Sync** → Only fetch dates since `last_synced_at` (faster, cheaper)
6. **Webhooks** → Real-time alerts when CTR drops or position changes
7. **Comparison Charts** → Week-over-week, month-over-month trends

---

## References

- [Google Search Console API](https://developers.google.com/webmaster-tools)
- [Search Analytics API](https://developers.google.com/webmaster-tools/search-console-api-original/v3/searchanalytics)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase pg_cron](https://supabase.com/docs/guides/database/postgresql/extensions#pg_cron)

# GSC Integration Setup Checklist

## Quick Start (30 minutes)

### Phase 1: Google Cloud Setup (5 min)

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create new OAuth 2.0 Client ID (Web app)
- [ ] Add authorized redirect URI: `https://your-domain.com/oauth/callback`
- [ ] Copy `Client ID` and `Client Secret`

### Phase 2: Supabase Database (5 min)

- [ ] Navigate to Supabase Dashboard → SQL Editor
- [ ] Copy entire contents of `sql/migrations/2025-02-26_gsc_tokens_and_performance.sql`
- [ ] Paste and run the migration
- [ ] Verify: `SELECT * FROM gsc_tokens;` (should return empty table)

### Phase 3: Environment Variables (5 min)

**Frontend** (`.env.local` or `.env`):
```
VITE_GOOGLE_CLIENT_ID=your-client-id-here
```

**Supabase Dashboard** → Edge Functions → Manage secrets:
```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
ENCRYPTION_KEY=<generate 32 random chars, e.g., "AbCdEfGhIjKlMnOpQrStUvWxYz123456">
```

### Phase 4: Deploy Edge Functions (10 min)

```bash
# Option 1: Via CLI (recommended)
supabase functions deploy encrypt-gsc-token
supabase functions deploy gsc-sync

# Option 2: Via Supabase Dashboard
# Copy code from supabase/functions/* and paste into dashboard
```

Verify deployment:
```bash
supabase functions list
```

### Phase 5: Test the Flow (5 min)

1. Start app: `npm run dev`
2. Go to `/signin` → "Sign in with Google"
3. Approve permissions
4. After OAuth callback, "Select Search Console Property" modal should appear
5. Select a property
6. Check Supabase: `SELECT * FROM gsc_tokens;` should show your entry

### Phase 6: Enable Daily Sync (Optional, for now)

#### Option A: PostgreSQL Cron (Recommended)

```sql
-- In Supabase SQL Editor, run:

CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verify extensions:
SELECT extname FROM pg_extension WHERE extname IN ('http', 'pg_cron');

-- Schedule sync for 2 AM UTC daily:
SELECT cron.schedule(
  'gsc-sync-daily',
  '0 2 * * *',
  $$
  SELECT
    http_post(
      'https://<PROJECT_ID>.supabase.co/functions/v1/gsc-sync',
      '{}'::jsonb,
      'application/json',
      jsonb_build_object(
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
      )
    )
  $$
);

-- List schedules:
SELECT * FROM cron.job;
```

Replace:
- `<PROJECT_ID>` with your Supabase project ID (from URL)
- `<SERVICE_ROLE_KEY>` with your service role key (Settings → API keys → service_role)

#### Option B: Manual Test Sync

```bash
curl -X POST https://<PROJECT_ID>.supabase.co/functions/v1/gsc-sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

After ~30 seconds:
```sql
SELECT COUNT(*) FROM performance_data;
```

Should show records if GSC has data.

---

## Verification Steps

### 1. Check OAuth is Working

```sql
SELECT id, user_id, site_url, encrypted_refresh_token, last_synced_at
FROM gsc_tokens
WHERE site_url IS NOT NULL;
```

**Expected**: One row per user who completed setup, with `site_url` populated.

### 2. Check Performance Data is Syncing

```sql
SELECT COUNT(*) as total_records, user_id, site_url
FROM performance_data
GROUP BY user_id, site_url;
```

**Expected**: Thousands of records if GSC has data for the property.

### 3. Check Front-end Display

Go to `/performance` → Should show:
- Stats: Impressions, Clicks, CTR, Position (with real numbers, not "—")
- Traffic chart: Line chart with clicks by month
- Top Pages: List of pages with clicks, impressions, position
- Keyword Rankings: Table of keywords with position, impressions, CTR

If showing empty states, check logs:

```sql
SELECT * FROM gsc_tokens WHERE site_url IS NOT NULL LIMIT 1;
```

Is `site_url` NULL? If yes, the site picker didn't save. Is `last_synced_at` NULL? If yes, sync hasn't run yet.

---

## Common Issues & Fixes

### Issue: "Site picker modal doesn't appear after OAuth"

**Cause**: `provider_refresh_token` not returned by Google

**Fix**:
1. Check OAuth flow includes `access_type=offline&prompt=consent`
2. Verify redirect URI in Google Cloud Console matches exactly
3. Try signing out completely and re-authenticating

### Issue: "No performance data showing on Performance page"

**Cause**: Either GSC not synced yet, or `site_url` is NULL

**Fix**:
```sql
-- Check token status:
SELECT id, site_url, last_synced_at FROM gsc_tokens;

-- If site_url is NULL: User didn't complete site picker
-- If last_synced_at is NULL: Sync hasn't run yet

-- Force manual sync:
curl -X POST ... (see above)
```

### Issue: "Sync Edge Function returns 500 error"

**Check logs**:
1. Supabase Dashboard → Edge Functions → gsc-sync → Logs
2. Common errors:
   - `"ENCRYPTION_KEY not set"` → Add to secrets
   - `"Token refresh failed"` → User's refresh token is invalid (rare)
   - `"Permission denied"` → OAuth scope issue (verify `webmasters.readonly`)

### Issue: "Performance page still shows '— ' for stats"

**Check**:
```typescript
// In Performance.tsx, add debug log:
console.log('siteUrl:', siteUrl);
console.log('hasGscData:', hasGscData);
console.log('records:', records);
```

If `siteUrl` is null, the hook never runs (check gsc_tokens table).
If `records` is empty, sync hasn't completed or has no data.

---

## Security Checklist

- [ ] **ENCRYPTION_KEY** is 32 random characters (not guessable)
- [ ] **ENCRYPTION_KEY** is stored in Supabase secrets (not in code)
- [ ] **Google credentials** are in secrets (not in code)
- [ ] **Refresh tokens** are encrypted before storage
- [ ] **RLS policies** are enabled on all tables
- [ ] **Service role key** is used only in Edge Functions
- [ ] **HTTPS** is enabled in production

---

## Performance Notes

### Data Volume

With 28 days of data:
- **Small site** (~100 keywords/day): ~2.8K records
- **Medium site** (~1K keywords/day): ~28K records
- **Large site** (10K keywords/day): ~280K records

Google's API returns max 25,000 rows per request. If a site has more, implement pagination (not yet in gsc-sync).

### Query Performance

```sql
-- Recommended indexes (already created in migration):
CREATE INDEX idx_performance_data_user_site_date ON performance_data(user_id, site_url, date);
CREATE INDEX idx_performance_data_page ON performance_data(page);
CREATE INDEX idx_performance_data_query ON performance_data(query);
```

These ensure fast filtering in hooks and Performance page.

### Daily Sync Cost

With pg_cron running daily:
- ~5 seconds per user (API call + decryption + upsert)
- ~10-100 KB of data per request (gzipped)
- ~0.01 edge function invocation

Minimal cost; can optimize later with incremental sync.

---

## Next Steps (After Verification)

1. **Test on staging** before production
2. **Monitor logs** for first 24 hours
3. **Train team** on Performance page features
4. **Document GSC sync** for ops (daily cron, manual backup sync)
5. **Plan V2**: Navboost warnings, declining CTR alerts, re-optimization queue filters

---

## Support

For issues:
1. Check **GSC_INTEGRATION_GUIDE.md** (detailed docs)
2. Review **Supabase logs** (Edge Functions section)
3. Query **database tables** directly to debug
4. Test **gsc-sync manually** to isolate sync issues
5. Check **browser console** for frontend errors

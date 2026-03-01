# Google Search Console (GSC) Integration - Implementation Status

## ✅ Completed

### 1. Database Schema
- Created `gsc_tokens` table to store encrypted refresh tokens and GSC properties per site
- Created `performance_data` table to cache GSC analytics data
- Created `navboost_signals` table for derived metrics
- Proper RLS policies in place for data security

### 2. Backend Services
- **Encryption**: `api/src/utils/encryption.ts` - AES-256-GCM encryption for refresh tokens
- **GSC Service**: `api/src/services/gscService.ts` - Handles all GSC API interactions:
  - `syncAllPerformanceData()` - Syncs data for all connected sites
  - `syncSitePerformanceData(token)` - Syncs data for a specific site
  - `saveGSCToken()` - Encrypts and saves tokens
  - `deleteGSCToken()` - Removes connection
  - `refreshAccessToken()` - Refreshes expired tokens
  - `fetchSearchAnalyticsData()` - Pulls data from Google API

### 3. OAuth Flow
- Backend-only OAuth flow to prevent session interference
- No `express-session` - using in-memory cache with CSRF protection
- Endpoints:
  - `GET /api/gsc/oauth/start` - Initiates OAuth, redirects to Google
  - `GET /api/gsc/oauth/callback` - Handles Google redirect, caches tokens
  - `GET /api/gsc/properties` - Returns cached properties for selection
  - `POST /api/gsc/save` - Saves selected property to DB

### 4. Frontend UI
- **GSCConnectionManager** (`src/components/gsc/GSCConnectionManager.tsx`) - Connect/disconnect UI
- **GSCSelectProperty** (`src/pages/GSCSelectProperty.tsx`) - Property selection after OAuth
- **Performance Page** (`src/pages/Performance.tsx`) - Displays synced data:
  - Traffic chart (clicks over time)
  - Top pages by clicks
  - Re-Optimization Queue (pages 4-15, ready to promote)
  - Top keywords by CTR
  - Keyword Rankings table
- **Skeleton loaders** - Visual feedback during loading
- **Proper empty states** - Shows "Connect GSC" if not connected, empty charts if connected but no data

### 5. Data Display
- Uses custom hooks:
  - `usePerformanceData()` - Fetches performance metrics for a site
  - `useGSCStatus()` - Checks if a site has GSC connected
- Displays metrics: clicks, impressions, CTR, position
- 28-day rolling window of data

### 6. Frontend Integration
- Site detail form shows GSC connection UI when site is selected
- Connect GSC button redirects to OAuth flow
- Disconnect with confirmation modal
- Error handling and toast notifications
- Data auto-refetches when page regains focus (after OAuth)

---

## 🔄 Needs Setup

### 1. Cron Job (Daily Sync)
**Status**: Ready but needs to be enabled

**What to do**:
1. Apply the migration: `sql/migrations/2025-02-27_gsc_cron_job.sql`
2. In Supabase dashboard:
   - Go to SQL Editor
   - Run the migration (or copy the setup commands)
   - This enables `pg_cron` and `http` extensions

3. **Option A: Using CRON_API_KEY (Secure)**
   - Generate a random secure key
   - Add to `.env`: `CRON_API_KEY="your-random-key"`
   - Add to Supabase project settings
   - Uncomment and configure the cron.schedule call in the migration

4. **Option B: No API Key (Local dev)**
   - Keep CRON_API_KEY commented out
   - Sync endpoint is publicly accessible
   - Fine for local testing, not recommended for production

**How it works**:
- Runs every day at midnight UTC
- Makes HTTP POST to `/api/gsc/sync`
- Backend calls `gscService.syncAllPerformanceData()`
- Pulls last 28 days of data from Google
- Stores in `performance_data` table
- Updates `last_synced_at` timestamp

---

## 📋 Testing Checklist

- [ ] Manual sync: `POST /api/gsc/sync` returns synced sites and rows inserted
- [ ] OAuth flow: Connect GSC account, select property, save successfully
- [ ] Data display: Performance page shows data after sync
- [ ] Empty state: Freshly connected GSC shows empty charts, not "Connect GSC"
- [ ] Disconnect: Can disconnect and reconnect without issues
- [ ] Token refresh: Old tokens automatically refresh via Google OAuth
- [ ] Encryption: Tokens are stored encrypted in `gsc_tokens` table
- [ ] Cron job: Scheduled sync runs at midnight UTC (check Supabase logs)

---

## 🔐 Security Notes

1. **Refresh tokens**: Encrypted with AES-256-GCM before storage
2. **Access tokens**: Stored temporarily, auto-refreshed
3. **CSRF protection**: State parameter in OAuth flow
4. **RLS policies**: Users only see data from their organization's sites
5. **Cron API key**: Optional Bearer token authentication for the sync endpoint

---

## 🚀 Production Deployment

Before going live:

1. Set `CRON_API_KEY` environment variable on all backends (Fly, etc.)
2. Enable the cron job in Supabase with the API key
3. Update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` with production values
4. Ensure `FRONTEND_URL` and `BACKEND_URL` are correct
5. Test the OAuth flow end-to-end
6. Verify cron job runs and syncs data

---

## 📊 Data Available After Sync

Once connected and synced, the Performance page displays:
- **Clicks**: Total clicks from search results
- **Impressions**: Times shown in search results
- **CTR**: Click-through rate percentage
- **Position**: Average ranking position
- **Top pages**: By clicks, impressions, position
- **Top queries**: By CTR, position
- **Re-optimization queue**: Pages ready to promote (4-15 position, 500+ impressions)

All data is filtered by the 28-day rolling window and specific site.

# GSC Connection — Per-Site Integration

## Architecture (Fixed)

GSC tokens are now **per-site**, not per-user.

```
Organization
  ├── Site A
  │   └── gsc_token (site_id = siteA.id)
  │       ├── gsc_property_url = "https://example.com"
  │       ├── encrypted_refresh_token
  │       └── last_synced_at
  │
  └── Site B
      └── gsc_token (site_id = siteB.id)
          ├── gsc_property_url = "https://other.com"
          ├── encrypted_refresh_token
          └── last_synced_at
```

Each site can connect to **one** GSC property.
Multiple sites can belong to the same organization.

---

## Database Schema (Corrected)

### gsc_tokens
```sql
- site_id (FK to sites.id) — UNIQUE, not user_id
- gsc_property_url (text) — The GSC property URL
- encrypted_refresh_token (text) — AES-256-GCM encrypted
- access_token (text) — 1-hour TTL
- last_synced_at (timestamptz)
```

### performance_data
```sql
- site_id (FK to sites.id) — Which site owns this data
- gsc_property_url (text) — Denormalized for queries
- query, page, date, clicks, impressions, ctr, position
```

RLS ensures users only see data for sites in their organization.

---

## User Flow

### 1. User is in Site Settings/Detail page
```
Site: "My Blog" (site_id = abc123)
Status: "Not connected"
```

### 2. User clicks "Connect Google Search Console"
```
Trigger OAuth flow with Google
```

### 3. User approves permissions
```
Gets back: access_token + refresh_token
Redirect to same site settings page with ?code=... or store in sessionStorage
```

### 4. Encrypt & Save
```
Frontend:
  - encryptRefreshToken() → Edge Function
  - Save to gsc_tokens table with:
    - site_id = abc123
    - gsc_property_url = "https://myblog.com"
    - encrypted_refresh_token = base64(...)
    - access_token = "ya29.a0..."
```

### 5. Display Status
```
Site: "My Blog"
Status: "✅ Connected to https://myblog.com"
Last synced: 2026-02-26 at 2:15 AM
```

### 6. View Performance Data
```
User navigates to /performance
Performance page fetches performance_data for selectedSite.id
Shows real metrics, charts, rankings
```

---

## What Needs to Be Built

### 1. GSC Connection Component
Location: `src/components/gsc/GSCConnectionManager.tsx`

```typescript
interface Props {
  siteId: string;
  siteName: string;
}

export function GSCConnectionManager({ siteId, siteName }: Props) {
  // Check if site has GSC token
  // If yes: Show "Connected" status with disconnect button
  // If no: Show "Connect Google Search Console" button
  
  // On click: Start OAuth flow
  // After OAuth: Save to gsc_tokens with site_id
  // Show success message
}
```

### 2. Site Settings Page Integration
Location: Update `src/pages/Sites/SiteDetail.tsx` (or site settings)

```typescript
<section className="GSC Integration">
  <h3>Google Search Console</h3>
  <GSCConnectionManager 
    siteId={selectedSite.id} 
    siteName={selectedSite.name} 
  />
</section>
```

### 3. OAuth Handling
Location: Update `src/pages/Oauth/Callback.tsx`

```typescript
// After OAuth, if we have gsc_property_url in params:
// 1. Encrypt refresh_token
// 2. Save to gsc_tokens with site_id from sessionStorage/query param
// 3. Redirect back to site settings page
```

---

## Implementation Checklist

- [ ] Create `GSCConnectionManager` component
- [ ] Add to site settings/detail page
- [ ] Update OAuth callback to handle site-specific save
- [ ] Store `gsc_property_url` in sessionStorage or query param during OAuth
- [ ] Add "Connect" and "Disconnect" buttons
- [ ] Show connection status
- [ ] Add last_synced_at timestamp display
- [ ] Test full flow end-to-end

---

## Key Differences from Previous Design

| Before | After |
|--------|-------|
| GSC connected to user account | GSC connected to site |
| Only 1 GSC per user | Each site has own GSC |
| Site picker in OAuth callback | OAuth callback just handles auth |
| Saved in OAuth flow | Saved in site settings |

---

## Code References

### Database Schema (Already Created)
File: `sql/migrations/2025-02-26_gsc_tokens_and_performance.sql`
- Uses `site_id` ✅
- RLS based on organization ✅

### Encryption Function (Ready)
File: `supabase/functions/encrypt-gsc-token/index.ts`
- Call this when saving GSC token ✅

### Sync Function (Ready)
File: `supabase/functions/gsc-sync/index.ts`
- Reads from gsc_tokens, syncs performance_data ✅

### Hook (Ready)
File: `src/hooks/usePerformanceData.ts`
- Takes `siteId`, fetches performance_data ✅

### Performance Page (Ready)
File: `src/pages/Performance.tsx`
- Calls hook with `selectedSite.id` ✅

---

## Testing

1. **Create site in app**
   - Go to /sites, add new site

2. **Go to site settings**
   - Click on site, navigate to settings

3. **Connect GSC**
   - Click "Connect Google Search Console"
   - Browser redirects to Google consent screen
   - User approves
   - Redirects back to site settings

4. **Verify save**
   - Check database:
     ```sql
     SELECT site_id, gsc_property_url, last_synced_at 
     FROM gsc_tokens;
     ```

5. **View performance data**
   - Go to /performance
   - Should show real data from gsc_tokens + performance_data

6. **Check daily sync**
   - Wait for cron job (2 AM UTC)
   - Or manually trigger via curl
   - Verify performance_data updated

---

## Notes

- **Per-site approach allows**:
  - Users with multiple sites to connect different GSC properties
  - Teams to manage multiple properties
  - Org-level permissions (org members see all sites' data)

- **No breaking changes**:
  - Old OAuth callback still works
  - Just no longer tries to save GSC token there
  - GSC token saved in site settings instead

- **Performance hook is ready**:
  - Just needs `siteId` instead of `userId`
  - Already implemented and integrated

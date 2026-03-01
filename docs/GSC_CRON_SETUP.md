# GSC Cron Job Setup Guide

The daily GSC data sync is configured via Supabase's `pg_cron` scheduler.

## Prerequisites

- Supabase project set up
- Database migration applied: `sql/migrations/2025-02-27_gsc_cron_job.sql`
- Backend API running with `/api/gsc/sync` endpoint

## Cron Job Configuration

The cron job has been created and runs daily at midnight UTC. It will automatically sync all connected GSC sites.

```sql
SELECT cron.schedule(
  'gsc-sync-daily',
  '0 0 * * *',  -- Every day at midnight UTC
  $$
  SELECT
    extensions.http_post(
      'https://sharkly.co/api/gsc/sync',
      jsonb_build_object(),
      jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.api_key')
      )
    );
  $$
);
```

## Manual Testing

To manually trigger the sync without waiting for the scheduled time:

### Without API Key

```sql
SELECT extensions.http_post(
  'https://sharkly.co/api/gsc/sync',
  '{}'::text,
  jsonb_build_object('Content-Type', 'application/json')
);
```

### With API Key

If you have `CRON_API_KEY` set:

```sql
SELECT extensions.http_post(
  'https://sharkly.co/api/gsc/sync',
  '{}'::text,
  jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer your-cron-api-key-here'
  )
);
```

Expected response:
```json
{
  "success": true,
  "synced": 2,
  "rows_inserted": 1542,
  "timestamp": "2025-02-27T12:34:56.789Z"
}
```

## Verify the Cron Job

List scheduled jobs:

```sql
SELECT * FROM cron.job;
```

Check recent job runs:

```sql
SELECT * FROM cron.job_run_details 
WHERE job_id = (SELECT jobid FROM cron.job WHERE jobname = 'gsc-sync-daily')
ORDER BY end_time DESC 
LIMIT 10;
```

## Scheduling Details

- **Cron expression**: `'0 0 * * *'` = Every day at 00:00 UTC
- **Adjust for your timezone**: Use UTC hour offset
  - `'0 5 * * *'` = 5 AM UTC
  - `'0 12 * * *'` = 12 PM UTC (noon)
  - `'0 20 * * *'` = 8 PM UTC

## Monitoring

### Check Sync History

See which sites were synced and when:

```sql
SELECT site_id, last_synced_at, gsc_property_url 
FROM gsc_tokens 
ORDER BY last_synced_at DESC;
```

### Check Data Volume

See how much performance data was collected:

```sql
SELECT site_id, COUNT(*) as row_count, MAX(date) as latest_date
FROM performance_data
GROUP BY site_id
ORDER BY row_count DESC;
```

## Troubleshooting

### Manual trigger returns error

If you get an error like "function does not exist", try:

1. Verify the `http` extension is installed:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'http';
   ```

2. If not installed, create it:
   ```sql
   CREATE EXTENSION IF NOT EXISTS http;
   ```

### Cron job shows errors in run_details

Check the error details:

```sql
SELECT * FROM cron.job_run_details 
WHERE job_id = (SELECT jobid FROM cron.job WHERE jobname = 'gsc-sync-daily')
ORDER BY end_time DESC LIMIT 5;
```

Common issues:
- Backend API is unreachable
- Refresh tokens have expired
- Google OAuth credentials are invalid

### No data being synced

1. Verify at least one site has GSC connected:
   ```sql
   SELECT COUNT(*) FROM gsc_tokens WHERE gsc_property_url IS NOT NULL;
   ```

2. Check if tokens are still valid:
   ```sql
   SELECT site_id, access_token_expires_at FROM gsc_tokens;
   ```

3. Check backend logs for token refresh errors

## Clean Up

If you need to disable the cron job:

```sql
SELECT cron.unschedule('gsc-sync-daily');
```

To see all scheduled jobs:

```sql
SELECT * FROM cron.job;
```

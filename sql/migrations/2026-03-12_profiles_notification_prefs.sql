-- Notification preferences on profiles (Settings > Notifications).
-- Stores: rank_drop_alerts, weekly_summary, credit_low_warning, cluster_completion,
--         email_enabled, in_app_enabled (all booleans in a JSON object).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT NULL;

COMMENT ON COLUMN public.profiles.notification_prefs IS 'User notification preferences: rank_drop_alerts, weekly_summary, credit_low_warning, cluster_completion, email_enabled, in_app_enabled (booleans).';

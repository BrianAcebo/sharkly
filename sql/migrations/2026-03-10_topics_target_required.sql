-- Phase 1c: Make target_id required on topics
-- Run AFTER verifying backfill in 2026-03-10_topics_add_target_id.sql succeeded
-- Check: SELECT COUNT(*) FROM topics WHERE target_id IS NULL;  -- should be 0

ALTER TABLE public.topics
  ALTER COLUMN target_id SET NOT NULL;

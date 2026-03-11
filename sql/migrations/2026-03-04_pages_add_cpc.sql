-- Add CPC column to pages table.
-- This was missing from the original schema, causing CPC data from DataForSEO
-- to be dropped on article insert during cluster generation.

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS cpc decimal(8,2) DEFAULT NULL;

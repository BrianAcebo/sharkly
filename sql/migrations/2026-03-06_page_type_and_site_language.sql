-- Add page_type to pages table.
-- Stores the detected content format (e.g. "How-To Guide", "Comparison Listicle")
-- so the workspace knows what kind of page to build without re-deriving it.
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS page_type text DEFAULT NULL;

-- Add language and region to sites table.
-- Controls what language and regional dialect all content is generated in.
-- Defaults to US English, which matches the DataForSEO keyword data.
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS target_language text NOT NULL DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS target_region   text NOT NULL DEFAULT 'United States';

-- Per-site defaults for blog-to-video look (fonts + colors). UI merges with Sharkly base brand when unset.
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS video_branding jsonb;

COMMENT ON COLUMN public.sites.video_branding IS
  'Blog-to-video defaults: { "headingFontId", "bodyFontId", "colors": { background, primary_text, accent, gold, muted } }. Font ids match video-service/config/video_font_catalog.json.';

-- S2-4: IGS domain-level consequence warning (product-gaps V1.2c)
-- Site-level IGS health: ratio of low-IGS substantial pages to total substantial pages

ALTER TABLE public.crawl_history
ADD COLUMN IF NOT EXISTS igs_health jsonb;

COMMENT ON COLUMN public.crawl_history.igs_health IS 'S2-4: { ratio, status, message, lowCount, substantialCount } — computed per crawl';

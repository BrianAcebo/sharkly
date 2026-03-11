-- L12: Cluster Architecture Warnings (cluster-intelligence-layer.md)
-- Add cluster_intelligence JSONB and architecture column to clusters

ALTER TABLE public.clusters
  ADD COLUMN IF NOT EXISTS cluster_intelligence jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS architecture text DEFAULT 'A';

COMMENT ON COLUMN public.clusters.cluster_intelligence IS 'L12: Evaluated warnings (over-linking, missing silo links, funnel imbalance, equity leak). Stored as JSON.';
COMMENT ON COLUMN public.clusters.architecture IS 'A = focus is money page; B = focus is informational, product/destination downstream';

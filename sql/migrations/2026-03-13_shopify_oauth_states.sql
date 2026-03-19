-- OAuth state storage for Shopify install flow. Survives server restarts and scale-to-zero.
-- Replaces in-memory Map that caused invalid_state when Fly.io restarted or scaled.

CREATE TABLE IF NOT EXISTS public.shopify_oauth_states (
  state text PRIMARY KEY,
  site_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shopify_oauth_states IS 'OAuth state for Shopify install. 20 min TTL. Replaces in-memory storage to survive restarts.';
COMMENT ON COLUMN public.shopify_oauth_states.state IS 'Random state string for CSRF protection';
COMMENT ON COLUMN public.shopify_oauth_states.site_id IS 'Null for companion install; set when connecting from Settings with siteId';

-- RLS: only backend service role needs access (API uses service role)
ALTER TABLE public.shopify_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON public.shopify_oauth_states
  FOR ALL
  USING (true)
  WITH CHECK (true);

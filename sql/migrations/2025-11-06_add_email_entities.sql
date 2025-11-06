-- Consolidated leak entity
ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS confidence real,
  ADD COLUMN IF NOT EXISTS last_checked timestamptz;

DROP TABLE IF EXISTS public.leaks;

CREATE TABLE IF NOT EXISTS public.leaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  source text NOT NULL,
  content_snippet text,
  found_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  found_usernames jsonb NOT NULL DEFAULT '[]'::jsonb,
  found_password_hashes jsonb NOT NULL DEFAULT '[]'::jsonb,
  retrieved_at timestamptz,
  url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_leaks_org ON public.leaks(organization_id);
CREATE INDEX IF NOT EXISTS idx_leaks_fingerprint ON public.leaks(fingerprint);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS trg_leaks_updated_at ON public.leaks;
    CREATE TRIGGER trg_leaks_updated_at
      BEFORE UPDATE ON public.leaks
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

WITH email_sources AS (
  SELECT
    id AS email_id,
    organization_id,
    COALESCE(NULLIF(trim(address), ''), NULL) AS email_address,
    breach_hits,
    paste_mentions
  FROM public.emails
),
breach_prepared AS (
  SELECT
    es.email_id,
    es.organization_id,
    es.email_address,
    bh,
    NULLIF(trim(bh->>'name'), '') AS breach_name,
    COALESCE(NULLIF(trim(bh->>'source'), ''), 'breach') AS leak_source,
    NULLIF(trim(bh->>'description'), '') AS content_snippet,
    NULLIF(trim(bh->>'first_seen'), '')::timestamptz AS retrieved_at,
    NULLIF(trim(bh->>'last_seen'), '')::timestamptz AS last_seen,
    NULLIF(trim(bh->>'confidence'), '')::real AS confidence,
    CASE
      WHEN (bh->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN NULL
      ELSE NULLIF(trim(bh->>'id'), '')
    END AS external_id,
    md5(CONCAT_WS('|', 'breach', lower(COALESCE(bh->>'name', '')), lower(COALESCE(bh->>'source', '')), COALESCE(NULLIF(trim(bh->>'first_seen'), ''), ''), lower(COALESCE(es.email_address, '')))) AS fingerprint
  FROM email_sources es
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(es.breach_hits, '[]'::jsonb)) AS bh
  WHERE NULLIF(trim(bh->>'name'), '') IS NOT NULL
),
breach_upsert AS (
  INSERT INTO public.leaks (
    organization_id,
    fingerprint,
    source,
    content_snippet,
    found_emails,
    found_usernames,
    found_password_hashes,
    retrieved_at,
    url,
    metadata
  )
  SELECT
    bp.organization_id,
    fingerprint,
    leak_source,
    content_snippet,
    CASE WHEN bp.email_address IS NOT NULL THEN jsonb_build_array(bp.email_address) ELSE '[]'::jsonb END,
    '[]'::jsonb,
    '[]'::jsonb,
    retrieved_at,
    NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'kind', 'breach',
      'name', breach_name,
      'last_seen', last_seen,
      'external_id', external_id
    ))
  FROM breach_prepared bp
  ON CONFLICT (organization_id, fingerprint) DO UPDATE
    SET
      source = EXCLUDED.source,
      content_snippet = COALESCE(EXCLUDED.content_snippet, public.leaks.content_snippet),
      found_emails = CASE
        WHEN jsonb_array_length(COALESCE(public.leaks.found_emails, '[]'::jsonb)) > 0 THEN public.leaks.found_emails
        ELSE EXCLUDED.found_emails
      END,
      retrieved_at = COALESCE(EXCLUDED.retrieved_at, public.leaks.retrieved_at),
      metadata = jsonb_strip_nulls(public.leaks.metadata || EXCLUDED.metadata),
      updated_at = now()
  RETURNING id, organization_id, fingerprint
)
INSERT INTO public.entity_edges (
  source_type,
  source_id,
  target_type,
  target_id,
  transform_type,
  confidence_score,
  source_api,
  source_url,
  raw_reference_id,
  metadata,
  retrieved_at,
  created_at
)
SELECT
  'email',
  bp.email_id,
  'leak',
  bu.id,
  'email_breach_record',
  bp.confidence,
  'legacy_import',
  NULL,
  bp.external_id,
  jsonb_strip_nulls(jsonb_build_object(
    'kind', 'breach',
    'name', bp.breach_name,
    'external_id', bp.external_id,
    'last_seen', bp.last_seen
  )),
  COALESCE(bp.retrieved_at, now()),
  now()
FROM breach_prepared bp
JOIN breach_upsert bu
  ON bu.organization_id = bp.organization_id
 AND bu.fingerprint = bp.fingerprint
ON CONFLICT DO NOTHING;

WITH email_sources AS (
  SELECT
    id AS email_id,
    organization_id,
    COALESCE(NULLIF(trim(address), ''), NULL) AS email_address,
    paste_mentions
  FROM public.emails
),
paste_prepared AS (
  SELECT
    es.email_id,
    es.organization_id,
    es.email_address,
    pm,
    COALESCE(NULLIF(trim(pm->>'source'), ''), 'paste') AS leak_source,
    NULLIF(trim(pm->>'snippet'), '') AS content_snippet,
    NULLIF(trim(pm->>'first_seen'), '')::timestamptz AS retrieved_at,
    NULLIF(trim(pm->>'last_seen'), '')::timestamptz AS last_seen,
    NULLIF(trim(pm->>'confidence'), '')::real AS confidence,
    CASE
      WHEN (pm->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN NULL
      ELSE NULLIF(trim(pm->>'id'), '')
    END AS external_id,
    COALESCE(NULLIF(trim(pm->>'url'), ''), NULLIF(trim(pm->'paste'->>'url'), '')) AS leak_url,
    md5(CONCAT_WS('|', 'paste', lower(COALESCE(pm->>'paste_id', pm->'paste'->>'id', '')), lower(COALESCE(pm->>'snippet', '')), lower(COALESCE(pm->>'source', '')), COALESCE(NULLIF(trim(pm->>'first_seen'), ''), ''), lower(COALESCE(es.email_address, '')))) AS fingerprint,
    NULLIF(trim(COALESCE(pm->>'paste_id', pm->'paste'->>'id')), '') AS referenced_paste_id
  FROM email_sources es
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(es.paste_mentions, '[]'::jsonb)) AS pm
  WHERE COALESCE(NULLIF(trim(pm->>'paste_id'), ''), NULLIF(trim(pm->'paste'->>'id'), ''), NULLIF(trim(pm->>'snippet'), '')) IS NOT NULL
),
paste_upsert AS (
  INSERT INTO public.leaks (
    organization_id,
    fingerprint,
    source,
    content_snippet,
    found_emails,
    found_usernames,
    found_password_hashes,
    retrieved_at,
    url,
    metadata
  )
  SELECT
    pp.organization_id,
    fingerprint,
    leak_source,
    content_snippet,
    CASE WHEN pp.email_address IS NOT NULL THEN jsonb_build_array(pp.email_address) ELSE '[]'::jsonb END,
    '[]'::jsonb,
    '[]'::jsonb,
    retrieved_at,
    leak_url,
    jsonb_strip_nulls(jsonb_build_object(
      'kind', 'paste',
      'paste_id', referenced_paste_id,
      'last_seen', last_seen,
      'external_id', external_id
    ))
  FROM paste_prepared pp
  ON CONFLICT (organization_id, fingerprint) DO UPDATE
    SET
      source = EXCLUDED.source,
      content_snippet = COALESCE(EXCLUDED.content_snippet, public.leaks.content_snippet),
      found_emails = CASE
        WHEN jsonb_array_length(COALESCE(public.leaks.found_emails, '[]'::jsonb)) > 0 THEN public.leaks.found_emails
        ELSE EXCLUDED.found_emails
      END,
      retrieved_at = COALESCE(EXCLUDED.retrieved_at, public.leaks.retrieved_at),
      url = COALESCE(EXCLUDED.url, public.leaks.url),
      metadata = jsonb_strip_nulls(public.leaks.metadata || EXCLUDED.metadata),
      updated_at = now()
  RETURNING id, organization_id, fingerprint
)
INSERT INTO public.entity_edges (
  source_type,
  source_id,
  target_type,
  target_id,
  transform_type,
  confidence_score,
  source_api,
  source_url,
  raw_reference_id,
  metadata,
  retrieved_at,
  created_at
)
SELECT
  'email',
  pp.email_id,
  'leak',
  pu.id,
  'email_paste_mention',
  pp.confidence,
  'legacy_import',
  pp.leak_url,
  pp.external_id,
  jsonb_strip_nulls(jsonb_build_object(
    'kind', 'paste',
    'paste_id', pp.referenced_paste_id,
    'external_id', pp.external_id,
    'last_seen', pp.last_seen
  )),
  COALESCE(pp.retrieved_at, now()),
  now()
FROM paste_prepared pp
JOIN paste_upsert pu
  ON pu.organization_id = pp.organization_id
 AND pu.fingerprint = pp.fingerprint
ON CONFLICT DO NOTHING;

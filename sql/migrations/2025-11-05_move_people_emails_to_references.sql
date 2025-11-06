-- Ensure reference tables exist (idempotent)
CREATE TABLE IF NOT EXISTS public.emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  address text NOT NULL,
  domain text,
  first_seen timestamptz,
  breach_hits jsonb NOT NULL DEFAULT '[]'::jsonb,
  paste_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  profiles jsonb NOT NULL DEFAULT '[]'::jsonb,
  web_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, address)
);
CREATE INDEX IF NOT EXISTS idx_emails_org ON public.emails(organization_id);
CREATE INDEX IF NOT EXISTS idx_emails_address ON public.emails(address);

CREATE TABLE IF NOT EXISTS public.entity_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  transform_type text,
  source_api text,
  source_url text,
  raw_reference_id text,
  confidence_score real,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, target_type, target_id, transform_type)
);
CREATE INDEX IF NOT EXISTS idx_entity_edges_source ON public.entity_edges (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_entity_edges_target ON public.entity_edges (target_type, target_id);

-- Migrate existing person email data (supports legacy text column and json arrays)
WITH people_source AS (
  SELECT
    p.id,
    p.organization_id,
    COALESCE(
      CASE
        WHEN jsonb_typeof(to_jsonb(p)->'emails') = 'array' THEN to_jsonb(p)->'emails'
        ELSE NULL
      END,
      CASE
        WHEN COALESCE(NULLIF(to_jsonb(p)->>'email', ''), '') <> '' THEN jsonb_build_array(
          jsonb_build_object(
            'email', jsonb_build_object(
              'address', NULLIF(to_jsonb(p)->>'email', ''),
              'domain', NULLIF(split_part(to_jsonb(p)->>'email', '@', 2), '')
            )
          )
        )
        ELSE '[]'::jsonb
      END
    ) AS email_json
  FROM public.people p
),
normalized AS (
  SELECT
    ps.id AS person_id,
    ps.organization_id,
    LOWER(TRIM(email_obj->'email'->>'address')) AS address_lower,
    TRIM(email_obj->'email'->>'address') AS address,
    NULLIF(TRIM(COALESCE(email_obj->'email'->>'domain', split_part(email_obj->'email'->>'address', '@', 2))), '') AS domain,
    CASE
      WHEN COALESCE(TRIM(email_obj->'email'->>'first_seen'), '') = '' THEN NULL
      ELSE (email_obj->'email'->>'first_seen')::timestamptz
    END AS first_seen,
    COALESCE(email_obj->'breach_hits', '[]'::jsonb) AS breach_hits,
    COALESCE(email_obj->'paste_mentions', '[]'::jsonb) AS paste_mentions,
    COALESCE(email_obj->'profiles', '[]'::jsonb) AS profiles
  FROM people_source ps
  CROSS JOIN LATERAL jsonb_array_elements(
    ps.email_json
  ) email_obj
  WHERE TRIM(email_obj->'email'->>'address') <> ''
),
upserted AS (
  INSERT INTO public.emails (organization_id, address, domain, first_seen, breach_hits, paste_mentions, profiles)
  SELECT n.organization_id, n.address, n.domain, n.first_seen, n.breach_hits, n.paste_mentions, n.profiles
  FROM normalized n
  ON CONFLICT (organization_id, address) DO UPDATE
    SET domain = COALESCE(EXCLUDED.domain, public.emails.domain),
        first_seen = COALESCE(EXCLUDED.first_seen, public.emails.first_seen),
        breach_hits = CASE
          WHEN EXCLUDED.breach_hits = '[]'::jsonb THEN public.emails.breach_hits
          ELSE EXCLUDED.breach_hits
        END,
        paste_mentions = CASE
          WHEN EXCLUDED.paste_mentions = '[]'::jsonb THEN public.emails.paste_mentions
          ELSE EXCLUDED.paste_mentions
        END,
        profiles = CASE
          WHEN EXCLUDED.profiles = '[]'::jsonb THEN public.emails.profiles
          ELSE EXCLUDED.profiles
        END
  RETURNING id, organization_id, address
)
INSERT INTO public.entity_edges (
  source_type,
  source_id,
  target_type,
  target_id,
  transform_type,
  confidence_score,
  metadata,
  retrieved_at
)
SELECT DISTINCT
  'person',
  n.person_id,
  'email',
  e.id,
  'legacy_import',
  1.0,
  jsonb_build_object('imported', true),
  COALESCE(n.first_seen, now())
FROM normalized n
JOIN public.emails e
  ON e.organization_id = n.organization_id
 AND LOWER(e.address) = n.address_lower
ON CONFLICT DO NOTHING;

-- Drop deprecated JSON column now that references exist
ALTER TABLE public.people DROP COLUMN IF EXISTS emails;
ALTER TABLE public.people DROP COLUMN IF EXISTS email;
DROP TABLE IF EXISTS public.people_emails;


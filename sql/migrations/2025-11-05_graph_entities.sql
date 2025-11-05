-- Comprehensive entity schema for graph records + references
-- Safe/idempotent: uses IF NOT EXISTS and guards

-- 0) Helper: function-driven updated_at trigger hookup (if function exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    RAISE NOTICE 'update_updated_at_column() not found; skipping triggers';
  END IF;
END $$;

-- 1) Emails
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
CREATE INDEX IF NOT EXISTS idx_emails_web_mentions_gin ON public.emails USING GIN (web_mentions);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
  DROP TRIGGER IF EXISTS trg_emails_updated_at ON public.emails;
  CREATE TRIGGER trg_emails_updated_at BEFORE UPDATE ON public.emails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
END IF; END $$;

-- 2) Phones
CREATE TABLE IF NOT EXISTS public.phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  number_e164 text NOT NULL,
  country text,
  carrier text,
  line_type text,
  messaging_apps text[] NOT NULL DEFAULT '{}',
  spam_reports int,
  web_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number_e164)
);
CREATE INDEX IF NOT EXISTS idx_phones_org ON public.phones(organization_id);
CREATE INDEX IF NOT EXISTS idx_phones_number ON public.phones(number_e164);
CREATE INDEX IF NOT EXISTS idx_phones_web_mentions_gin ON public.phones USING GIN (web_mentions);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
  DROP TRIGGER IF EXISTS trg_phones_updated_at ON public.phones;
  CREATE TRIGGER trg_phones_updated_at BEFORE UPDATE ON public.phones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
END IF; END $$;

-- 3) Social Profiles
CREATE TABLE IF NOT EXISTS public.social_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  handle text NOT NULL,
  platform text NOT NULL,
  profile_url text,
  display_name text,
  bio text,
  posts jsonb NOT NULL DEFAULT '[]'::jsonb,
  followers_count int,
  following_count int,
  join_date timestamptz,
  location text,
  web_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, platform, handle)
);
CREATE INDEX IF NOT EXISTS idx_social_profiles_org ON public.social_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_social_profiles_handle ON public.social_profiles(handle);
CREATE INDEX IF NOT EXISTS idx_social_profiles_web_mentions_gin ON public.social_profiles USING GIN (web_mentions);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
  DROP TRIGGER IF EXISTS trg_social_profiles_updated_at ON public.social_profiles;
  CREATE TRIGGER trg_social_profiles_updated_at BEFORE UPDATE ON public.social_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
END IF; END $$;

-- 4) Usernames (optional separate catalog)
CREATE TABLE IF NOT EXISTS public.usernames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  value text NOT NULL,
  platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  web_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, value)
);
CREATE INDEX IF NOT EXISTS idx_usernames_org ON public.usernames(organization_id);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
  DROP TRIGGER IF EXISTS trg_usernames_updated_at ON public.usernames;
  CREATE TRIGGER trg_usernames_updated_at BEFORE UPDATE ON public.usernames
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
END IF; END $$;

-- 5) Addresses
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  street_1 text,
  street_2 text,
  city text,
  region text,
  postal_code text,
  country text,
  geo jsonb,
  web_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_addresses_org ON public.addresses(organization_id);
CREATE INDEX IF NOT EXISTS idx_addresses_web_mentions_gin ON public.addresses USING GIN (web_mentions);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
  DROP TRIGGER IF EXISTS trg_addresses_updated_at ON public.addresses;
  CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
END IF; END $$;

-- 6) Domains
CREATE TABLE IF NOT EXISTS public.domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  whois jsonb NOT NULL DEFAULT '{}'::jsonb,
  creation_date timestamptz,
  expiry_date timestamptz,
  dns_records jsonb NOT NULL DEFAULT '[]'::jsonb,
  subdomains jsonb NOT NULL DEFAULT '[]'::jsonb,
  hosting_provider text,
  techstack jsonb NOT NULL DEFAULT '[]'::jsonb,
  web_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
CREATE INDEX IF NOT EXISTS idx_domains_org ON public.domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_domains_name ON public.domains(name);
CREATE INDEX IF NOT EXISTS idx_domains_web_mentions_gin ON public.domains USING GIN (web_mentions);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
  DROP TRIGGER IF EXISTS trg_domains_updated_at ON public.domains;
  CREATE TRIGGER trg_domains_updated_at BEFORE UPDATE ON public.domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
END IF; END $$;

-- 7) IP Addresses
CREATE TABLE IF NOT EXISTS public.ip_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  address text NOT NULL,
  asn text,
  organization text,
  geo jsonb,
  open_ports jsonb NOT NULL DEFAULT '[]'::jsonb,
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  reputation jsonb NOT NULL DEFAULT '[]'::jsonb,
  first_seen timestamptz,
  last_seen timestamptz,
  web_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, address)
);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_org ON public.ip_addresses(organization_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_address ON public.ip_addresses(address);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_web_mentions_gin ON public.ip_addresses USING GIN (web_mentions);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
  DROP TRIGGER IF EXISTS trg_ip_addresses_updated_at ON public.ip_addresses;
  CREATE TRIGGER trg_ip_addresses_updated_at BEFORE UPDATE ON public.ip_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
END IF; END $$;

-- 8) Images
CREATE TABLE IF NOT EXISTS public.images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url text NOT NULL,
  hash jsonb,
  exif jsonb,
  faces_detected jsonb NOT NULL DEFAULT '[]'::jsonb,
  reverse_matches jsonb NOT NULL DEFAULT '[]'::jsonb,
  web_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, url)
);
CREATE INDEX IF NOT EXISTS idx_images_org ON public.images(organization_id);
CREATE INDEX IF NOT EXISTS idx_images_url ON public.images(url);
CREATE INDEX IF NOT EXISTS idx_images_web_mentions_gin ON public.images USING GIN (web_mentions);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
  DROP TRIGGER IF EXISTS trg_images_updated_at ON public.images;
  CREATE TRIGGER trg_images_updated_at BEFORE UPDATE ON public.images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
END IF; END $$;

-- 9) Paste / Leak
CREATE TABLE IF NOT EXISTS public.paste_leaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source text NOT NULL,
  content_snippet text,
  found_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  found_usernames jsonb NOT NULL DEFAULT '[]'::jsonb,
  found_password_hashes jsonb NOT NULL DEFAULT '[]'::jsonb,
  retrieved_at timestamptz,
  url text,
  web_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_paste_leaks_org ON public.paste_leaks(organization_id);
CREATE INDEX IF NOT EXISTS idx_paste_leaks_web_mentions_gin ON public.paste_leaks USING GIN (web_mentions);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
  DROP TRIGGER IF EXISTS trg_paste_leaks_updated_at ON public.paste_leaks;
  CREATE TRIGGER trg_paste_leaks_updated_at BEFORE UPDATE ON public.paste_leaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
END IF; END $$;

-- 10) Documents
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text,
  text text,
  metadata jsonb,
  entities_mentioned jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_url text,
  retrieved_at timestamptz,
  web_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_org ON public.documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_web_mentions_gin ON public.documents USING GIN (web_mentions);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
  DROP TRIGGER IF EXISTS trg_documents_updated_at ON public.documents;
  CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
END IF; END $$;

-- 11) Add web_mentions to existing tables
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS web_mentions jsonb NOT NULL DEFAULT '[]'::jsonb;
-- people already migrated earlier with web_mentions

-- 12) Junction tables (references)

-- Person <-> Email/Phone/Address/SocialProfile/Image
CREATE TABLE IF NOT EXISTS public.people_emails (
  person_id uuid REFERENCES public.people(id) ON DELETE CASCADE,
  email_id uuid REFERENCES public.emails(id) ON DELETE CASCADE,
  PRIMARY KEY (person_id, email_id)
);
CREATE TABLE IF NOT EXISTS public.people_phones (
  person_id uuid REFERENCES public.people(id) ON DELETE CASCADE,
  phone_id uuid REFERENCES public.phones(id) ON DELETE CASCADE,
  PRIMARY KEY (person_id, phone_id)
);
CREATE TABLE IF NOT EXISTS public.people_addresses (
  person_id uuid REFERENCES public.people(id) ON DELETE CASCADE,
  address_id uuid REFERENCES public.addresses(id) ON DELETE CASCADE,
  PRIMARY KEY (person_id, address_id)
);
CREATE TABLE IF NOT EXISTS public.people_profiles (
  person_id uuid REFERENCES public.people(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (person_id, profile_id)
);
CREATE TABLE IF NOT EXISTS public.people_images (
  person_id uuid REFERENCES public.people(id) ON DELETE CASCADE,
  image_id uuid REFERENCES public.images(id) ON DELETE CASCADE,
  PRIMARY KEY (person_id, image_id)
);

-- Business references
CREATE TABLE IF NOT EXISTS public.business_officers (
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.people(id) ON DELETE CASCADE,
  PRIMARY KEY (business_id, person_id)
);
CREATE TABLE IF NOT EXISTS public.business_addresses (
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  address_id uuid REFERENCES public.addresses(id) ON DELETE CASCADE,
  PRIMARY KEY (business_id, address_id)
);
CREATE TABLE IF NOT EXISTS public.business_domains (
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  domain_id uuid REFERENCES public.domains(id) ON DELETE CASCADE,
  PRIMARY KEY (business_id, domain_id)
);

-- Email references
CREATE TABLE IF NOT EXISTS public.email_profiles (
  email_id uuid REFERENCES public.emails(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (email_id, profile_id)
);
CREATE TABLE IF NOT EXISTS public.email_paste_leaks (
  email_id uuid REFERENCES public.emails(id) ON DELETE CASCADE,
  paste_id uuid REFERENCES public.paste_leaks(id) ON DELETE CASCADE,
  PRIMARY KEY (email_id, paste_id)
);

-- SocialProfile images
CREATE TABLE IF NOT EXISTS public.profile_images (
  profile_id uuid REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  image_id uuid REFERENCES public.images(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, image_id)
);

-- Domain <-> IP
CREATE TABLE IF NOT EXISTS public.domain_ips (
  domain_id uuid REFERENCES public.domains(id) ON DELETE CASCADE,
  ip_id uuid REFERENCES public.ip_addresses(id) ON DELETE CASCADE,
  PRIMARY KEY (domain_id, ip_id)
);



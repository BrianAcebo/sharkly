-- CRO Studio — persist password-gate hint when live fetch sees storefront password HTML

ALTER TABLE public.cro_audits ADD COLUMN IF NOT EXISTS crawl_warnings jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.cro_audits.crawl_warnings IS 'Live crawl metadata: { "likely_password_protected": true } when HTML matches a password gate';

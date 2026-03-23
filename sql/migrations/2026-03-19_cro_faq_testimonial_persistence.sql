-- CRO Studio — persist FAQ and testimonial email in cro_audits.
-- FAQ: [{ q, a }, ...] — 5 Q&A pairs for destination page.
-- Testimonial: { subject, body } — testimonial request email.

ALTER TABLE public.cro_audits ADD COLUMN IF NOT EXISTS faq_result jsonb;
ALTER TABLE public.cro_audits ADD COLUMN IF NOT EXISTS testimonial_result jsonb;

COMMENT ON COLUMN public.cro_audits.faq_result IS 'Generated FAQ: [{ q, a }, ...] — persisted after generation (2 credits)';
COMMENT ON COLUMN public.cro_audits.testimonial_result IS 'Generated testimonial request email: { subject, body } — persisted after generation (1 credit)';

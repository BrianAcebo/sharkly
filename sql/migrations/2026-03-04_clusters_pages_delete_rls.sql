-- Add DELETE RLS policies for clusters and pages tables.
-- Without these, Supabase silently blocks deletion (no error returned,
-- but zero rows affected) — making deletes appear to succeed but do nothing.

-- Users can delete clusters that belong to their organization's sites
CREATE POLICY "Users can delete clusters for their sites"
ON public.clusters
FOR DELETE
USING (
  site_id IN (
    SELECT s.id
    FROM public.sites s
    INNER JOIN public.user_organizations uo
      ON uo.organization_id = s.organization_id
    WHERE uo.user_id = auth.uid()
  )
);

-- Users can delete pages that belong to their organization's sites
CREATE POLICY "Users can delete pages for their sites"
ON public.pages
FOR DELETE
USING (
  site_id IN (
    SELECT s.id
    FROM public.sites s
    INNER JOIN public.user_organizations uo
      ON uo.organization_id = s.organization_id
    WHERE uo.user_id = auth.uid()
  )
);

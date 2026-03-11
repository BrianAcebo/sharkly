-- Allow users to delete topics that belong to their organization's sites.
-- Without this policy, Supabase RLS defaults to DENY for DELETE,
-- so topic deletion silently fails even with the correct site_id filter.

CREATE POLICY "Users can delete topics for their organization's sites"
ON public.topics
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

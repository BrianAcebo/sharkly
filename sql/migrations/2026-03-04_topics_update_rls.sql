-- Allow frontend users to UPDATE topics that belong to their organization's sites.
-- Without this, the Supabase client silently blocks updates (no error, 0 rows affected).
-- Required for: editing cluster keyword/title syncing back to the parent topic.

CREATE POLICY "Users can update topics for their organization's sites"
ON public.topics
FOR UPDATE
USING (
  site_id IN (
    SELECT s.id
    FROM public.sites s
    INNER JOIN public.user_organizations uo
      ON uo.organization_id = s.organization_id
    WHERE uo.user_id = auth.uid()
  )
)
WITH CHECK (
  site_id IN (
    SELECT s.id
    FROM public.sites s
    INNER JOIN public.user_organizations uo
      ON uo.organization_id = s.organization_id
    WHERE uo.user_id = auth.uid()
  )
);

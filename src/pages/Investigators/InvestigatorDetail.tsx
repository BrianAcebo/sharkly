import * as React from 'react';
import { useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import ComponentCard from '../../components/common/ComponentCard';
import { UserAvatar } from '../../components/common/UserAvatar';
import { supabase } from '../../utils/supabaseClient';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';

type ProfileRow = {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
  title?: string | null;
  phone?: string | null;
  location?: string | null;
};

export default function InvestigatorDetail() {
  const { id } = useParams();
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [role, setRole] = React.useState<string | null>(null);
  const [orgName, setOrgName] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', id).single();
        setProfile(p as unknown as ProfileRow);
        const { data: membership } = await supabase
          .from('user_organizations')
          .select('role, organizations(name)')
          .eq('user_id', id)
          .limit(1)
          .maybeSingle();
        setRole((membership as any)?.role ?? null);
        setOrgName((membership as any)?.organizations?.name ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || profile?.email || 'Investigator';

  return (
    <div>
      <PageMeta title={fullName} description="Investigator profile" />
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Investigator</h1>

        <ComponentCard>
          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : !profile ? (
            <div className="text-sm text-gray-500">Investigator not found.</div>
          ) : (
            <>
              <div className="flex items-start gap-4">
                <UserAvatar user={{ name: fullName, avatar: profile?.avatar ?? null }} size="lg" />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">{fullName}</h2>
                    {role && <Badge variant="secondary" className="capitalize">{role}</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{profile?.email}</p>
                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase text-gray-500">Organization</div>
                      <div className="text-sm">{orgName || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-gray-500">Title</div>
                      <div className="text-sm">{profile?.title || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-gray-500">Phone</div>
                      <div className="text-sm">{profile?.phone || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-gray-500">Location</div>
                      <div className="text-sm">{profile?.location || '—'}</div>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <a href={`/cases?assignee=${encodeURIComponent(id || '')}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">View cases for this investigator</a>
                </div>
              </div>
            </>
          )}
        </ComponentCard>
      </div>
    </div>
  );
}



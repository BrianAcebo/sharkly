import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { useAuth } from '../../contexts/AuthContext';
import useDebounce from '../../hooks/useDebounce';
import { searchSocialProfiles, createSocialProfile } from '../../api/social_profiles';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export default function SocialProfilesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; platform: string; handle: string; profile_url: string | null }>>([]);
  const debounced = useDebounce(q, 350);
  const [createOpen, setCreateOpen] = useState(false);
  const [platform, setPlatform] = useState('');
  const [handle, setHandle] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    let active = true;
    async function run() {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const rows = await searchSocialProfiles(user.organization_id, debounced, 24);
        if (!active) return;
        setResults(rows);
      } finally {
        if (active) setLoading(false);
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [user?.organization_id, debounced]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageMeta title="Social Profiles" description="Profiles directory" noIndex />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Social Profiles</h1>
        <div className="flex items-center gap-2">
          <div className="w-full max-w-sm">
            <Input placeholder="Search platforms/handles…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} title="Create social profile">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : results.length === 0 ? (
        <div className="text-sm text-muted-foreground">No profiles found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {results.map((p) => (
            <Card key={p.id} className="cursor-pointer" onClick={() => navigate(`/profiles/${p.id}`)}>
              <CardHeader>
                <div className="font-medium">{p.platform}</div>
              </CardHeader>
              <CardContent>
                <div className="text-sm">@{p.handle}</div>
                {p.profile_url ? <div className="text-xs text-muted-foreground truncate">{p.profile_url}</div> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create social profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Platform (e.g., linkedin)" value={platform} onChange={(e) => setPlatform(e.target.value)} />
            <Input placeholder="Handle (without @)" value={handle} onChange={(e) => setHandle(e.target.value.replace(/^@+/, ''))} />
            <Input placeholder="Profile URL (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!user?.organization_id) return;
                  if (!platform.trim() || !handle.trim()) {
                    toast.error('Platform and handle are required.');
                    return;
                  }
                  try {
                    const created = await createSocialProfile({
                      organization_id: user.organization_id,
                      profile: { platform: platform.trim(), handle: handle.trim(), profile_url: url.trim() || null }
                    });
                    toast.success('Social profile created.');
                    setCreateOpen(false);
                    navigate(`/profiles/${created.id}`);
                  } catch (e) {
                    console.error('Failed to create social profile', e);
                    toast.error('Failed to create social profile.');
                  }
                }}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



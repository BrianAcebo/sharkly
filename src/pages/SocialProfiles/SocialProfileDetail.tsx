import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Button } from '../../components/ui/button';
import ComponentCard from '../../components/common/ComponentCard';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Pencil, MoreHorizontal } from 'lucide-react';
import LinkedPeopleCard from '../../components/common/LinkedPeopleCard';
import { getSocialProfileById, updateSocialProfile, removeProfileFromPerson, type SocialProfileDetailResponse } from '../../api/social_profiles';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { toast } from 'sonner';
import { formatPersonName } from '../../utils/person';
import LinkedEmailsCard from '../../components/common/LinkedEmailsCard';
import LinkedUsernamesCard from '../../components/common/LinkedUsernamesCard';
import { removeProfileFromEmail, removeProfileFromUsername } from '../../api/social_profiles';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader as AlertHeader,
  AlertDialogTitle
} from '../../components/ui/alert-dialog';
import { deleteSocialProfile } from '../../api/social_profiles';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import LinkedImagesCard from '../../components/common/LinkedImagesCard';
import { supabase } from '../../utils/supabaseClient';
import { detachImageFromProfile } from '../../api/images';

export default function SocialProfileDetail() {
  const params = useParams();
  const id = params.id as string;
  const navigate = useNavigate();
  const { setTitle, setReturnTo } = useBreadcrumbs();

  const [data, setData] = useState<SocialProfileDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [platform, setPlatform] = useState('');
  const [handle, setHandle] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [followers, setFollowers] = useState('');
  const [following, setFollowing] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [location, setLocation] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkedImages, setLinkedImages] = useState<Array<{ id: string; url: string }>>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const detail = await getSocialProfileById(id);
        if (!active) return;
        setData(detail);
        const p = detail.profile.profile;
        setPlatform(p.platform || '');
        setHandle(p.handle || '');
        setProfileUrl(p.profile_url || '');
        setDisplayName(p.display_name || '');
        setBio(p.bio || '');
        setFollowers(p.followers_count != null ? String(p.followers_count) : '');
        setFollowing(p.following_count != null ? String(p.following_count) : '');
        setJoinDate(p.join_date || '');
        setLocation(p.location || '');
        setTitle(p.display_name || p.handle || p.platform || 'Social Profile');
        setReturnTo({ path: '/people', label: 'People' });
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, setTitle, setReturnTo]);

  // Load linked images (image -> social_profile)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!id) return;
      try {
        const { data: edges } = await supabase
          .from('entity_edges')
          .select('source_id')
          .eq('target_type', 'social_profile')
          .eq('target_id', id)
          .eq('source_type', 'image');
        const imageIds = (edges ?? []).map((e: { source_id: string }) => e.source_id);
        if (imageIds.length === 0) {
          if (!cancelled) setLinkedImages([]);
          return;
        }
        const { data: rows } = await supabase.from('images').select('id, url').in('id', imageIds);
        if (!cancelled) {
          setLinkedImages((rows ?? []).map((r) => ({ id: (r as { id: string }).id, url: (r as { url: string }).url })));
        }
      } catch (e) {
        console.error('Failed to load linked images for profile', e);
        if (!cancelled) setLinkedImages([]);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const headerTitle = useMemo(() => {
    const p = data?.profile.profile;
    return p?.display_name || p?.handle || p?.platform || 'Social Profile';
  }, [data?.profile.profile]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const updated = await updateSocialProfile(data.profile.id, {
        profile: {
          platform: platform,
          handle: handle,
          profile_url: profileUrl || null,
          display_name: displayName || null,
          bio: bio || null,
          followers_count: followers ? Number(followers) : null,
          following_count: following ? Number(following) : null,
          join_date: joinDate || null,
          location: location || null
        }
      });
      setData((cur) => (cur ? { ...cur, profile: updated } : cur));
      setEditOpen(false);
      toast.success('Profile updated.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (!data) return <div className="p-6">Not found.</div>;

  const p = data.profile.profile;

  return (
    <>
      <div className="space-y-6 p-6 mx-auto max-w-7xl">
        <PageMeta title={`Profile · ${headerTitle}`} description="Social profile detail" noIndex />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Social Profile</h1>
            <p className="text-sm text-muted-foreground">{p.platform} · {p.handle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Back</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDeleteOpen(true)}>Delete…</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <ComponentCard>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Details</h3>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
            <div>
              <div className="text-sm text-muted-foreground">Platform</div>
              <div className="font-medium">{p.platform || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Handle</div>
              <div className="font-medium">{p.handle || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Display name</div>
              <div className="font-medium">{p.display_name || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Profile URL</div>
              {p.profile_url ? (
                <a href={/^https?:\/\//i.test(p.profile_url) ? p.profile_url : `https://${p.profile_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {p.profile_url}
                </a>
              ) : (
                <div className="font-medium">—</div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Followers</div>
              <div className="font-medium">{p.followers_count ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Following</div>
              <div className="font-medium">{p.following_count ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Join date</div>
              <div className="font-medium">{p.join_date ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Location</div>
              <div className="font-medium">{p.location ?? '—'}</div>
            </div>
            <div className="md:col-span-3">
              <div className="text-sm text-muted-foreground">Bio</div>
              <div className="text-sm whitespace-pre-line">{p.bio || '—'}</div>
            </div>
          </div>
        </ComponentCard>

      <LinkedImagesCard
        title="Images"
        displayName={headerTitle}
        ownerId={id}
        organizationId={data?.profile.organization_id ?? ''}
        ownerType="profile"
        items={linkedImages.map((im) => ({ id: im.id, url: im.url, linkTo: `/images/${im.id}` }))}
        onUnlink={async (imageId) => {
          await detachImageFromProfile(imageId, id);
          setLinkedImages((prev) => prev.filter((x) => x.id !== imageId));
          toast.success('Image unlinked');
        }}
        onAttached={(i) => {
          setLinkedImages((prev) => {
            const map = new Map(prev.map((x) => [x.id, x]));
            map.set(i.id, { id: i.id, url: i.url });
            return Array.from(map.values());
          });
        }}
      />

        <LinkedPeopleCard
          displayName={p.handle || p.display_name || p.platform}
          items={data.people.map(({ edge, person }) => {
            const display = formatPersonName(person.name);
            return {
              id: person.id,
              name: display,
              avatar: person.avatar ?? null,
              linkTo: `/people/${person.id}`,
              transformType: edge.transform_type,
              confidenceScore: edge.confidence_score,
              retrievedAt: (edge as unknown as { retrieved_at?: string | null })?.retrieved_at ?? null,
              sourceUrl: (edge as unknown as { source_url?: string | null })?.source_url ?? null,
              sourceApi: (edge as unknown as { source_api?: string | null })?.source_api ?? null
            };
          })}
          onUnlink={async (personId) => {
            try {
              await removeProfileFromPerson(personId, data.profile.id);
              setData((cur) =>
                cur
                  ? { ...cur, people: cur.people.filter((link) => link.person.id !== personId) }
                  : cur
              );
              toast.success('Unlinked from person.');
            } catch (e) {
              console.error(e);
              toast.error('Failed to unlink.');
            }
          }}
        />

<LinkedEmailsCard
        title="Emails"
        displayName={p.handle || p.display_name || p.platform}
        ownerType="profile"
        ownerId={data.profile.id}
        organizationId={data.profile.organization_id}
        items={(data.emails ?? []).map((e) => ({
          id: e.email.id,
          address: e.email.address,
          domain: e.email.domain,
          linkTo: `/emails/${e.email.id}`,
          transformType: e.edge.transform_type ?? null,
          confidenceScore: e.edge.confidence_score ?? null
        }))}
        onUnlink={async (emailId) => {
          await removeProfileFromEmail(emailId, data.profile.id);
          const refreshed = await getSocialProfileById(id);
          setData(refreshed);
          toast.success('Email unlinked');
        }}
        onAttached={async () => {
          const refreshed = await getSocialProfileById(id);
          setData(refreshed);
        }}
      />

      <LinkedUsernamesCard
        title="Usernames"
        displayName={p.handle || p.display_name || p.platform}
        ownerId={data.profile.id}
        organizationId={data.profile.organization_id}
        ownerType="profile"
        items={(data.usernames ?? []).map((u) => ({
          id: u.username.id,
          value: u.username.value,
          linkTo: `/usernames/${u.username.id}`,
          transformType: u.edge.transform_type ?? null,
          confidenceScore: u.edge.confidence_score ?? null
        }))}
        onUnlink={async (usernameId) => {
          await removeProfileFromUsername(usernameId, data.profile.id);
          const refreshed = await getSocialProfileById(id);
          setData(refreshed);
          toast.success('Username unlinked');
        }}
        onAttached={async () => {
          const refreshed = await getSocialProfileById(id);
          setData(refreshed);
        }}
      />
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit social profile</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Platform</label>
              <Input value={platform} onChange={(e) => setPlatform(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Handle</label>
              <Input value={handle} onChange={(e) => setHandle(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Display name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Profile URL</label>
              <Input value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Bio</label>
              <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Followers</label>
              <Input type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Following</label>
              <Input type="number" value={following} onChange={(e) => setFollowing(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Join date</label>
              <Input value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertHeader>
            <AlertDialogTitle>Delete social profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this social profile and its direct edges. This action cannot be undone.
            </AlertDialogDescription>
          </AlertHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await deleteSocialProfile(id);
                  toast.success('Social profile deleted.');
                  navigate('/profiles');
                } catch (e) {
                  console.error(e);
                  toast.error('Failed to delete social profile.');
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}



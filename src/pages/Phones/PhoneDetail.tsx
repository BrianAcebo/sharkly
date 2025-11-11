import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Loader2, Pencil, MoreHorizontal } from 'lucide-react';
import ComponentCard from '../../components/common/ComponentCard';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import LinkedPeopleCard from '../../components/common/LinkedPeopleCard';
import { toast } from 'sonner';
import { getPhoneById, updatePhone, type PhoneDetailResponse } from '../../api/phones';
import { detachLeakFromPhone } from '../../api/leaks';
import { supabase } from '../../utils/supabaseClient';
import CaseWebMentions from '../../components/cases/CaseWebMentions';
import { formatE164Input, formatE164PhoneNumber } from '../../utils/phone';
import LinkedProfilesCard from '../../components/common/LinkedProfilesCard';
import LinkedLeaksCard from '../../components/common/LinkedLeaksCard';
import { removeProfileFromPhone } from '../../api/social_profiles';
import { normalizePersonName, formatPersonName } from '../../utils/person';
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
import { deletePhone } from '../../api/phones';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';

export default function PhoneDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const navigate = useNavigate();
  const { setTitle, setReturnTo } = useBreadcrumbs();

  const [data, setData] = useState<PhoneDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [numberE164, setNumberE164] = useState('');
  const [country, setCountry] = useState('');
  const [carrier, setCarrier] = useState('');
  const [lineType, setLineType] = useState<'mobile' | 'landline' | 'voip' | 'unknown'>('unknown');
  const [messagingApps, setMessagingApps] = useState<string>('');
  const [spamReports, setSpamReports] = useState('');

  const [linkedLeaks, setLinkedLeaks] = useState<Array<{ id: string; source: string; snippet: string | null }>>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const response = await getPhoneById(id);
        if (!active) return;
        setData(response);
        setTitle(response.phone.phone.number_e164 ?? response.phone.id);
        setReturnTo({ path: '/phones', label: 'Phones' });
        setNumberE164(response.phone.phone.number_e164 || '');
        setCountry(response.phone.phone.country ?? '');
        setCarrier(response.phone.phone.carrier ?? '');
        setLineType(response.phone.phone.line_type ?? 'unknown');
        setMessagingApps((response.phone.messaging_apps ?? []).join(', '));
        setSpamReports(response.phone.spam_reports != null ? String(response.phone.spam_reports) : '');
      } catch (err) {
        console.error(err);
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load phone.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id, setTitle, setReturnTo]);

  // Load linked leaks
  useEffect(() => {
    let cancelled = false;
    async function loadLeaks() {
      if (!id) return;
      try {
        const { data: edgeRows } = await supabase
          .from('entity_edges')
          .select('target_id')
          .eq('source_type', 'phone')
          .eq('source_id', id)
          .eq('target_type', 'leak');
        const leakIds = (edgeRows ?? []).map((e: { target_id: string }) => e.target_id);
        if (leakIds.length === 0) {
          if (!cancelled) setLinkedLeaks([]);
          return;
        }
        const { data: leakRows } = await supabase.from('leaks').select('id, source, content_snippet').in('id', leakIds);
        if (!cancelled) {
          const mapped =
            (leakRows ?? []).map((r: { id: string; source?: string; content_snippet?: string | null }) => ({
              id: r.id,
              source: r.source ?? 'leak',
              snippet: r.content_snippet ?? null
            })) ?? [];
          setLinkedLeaks(mapped);
        }
      } catch (e) {
        console.error('Failed to load linked leaks', e);
        if (!cancelled) setLinkedLeaks([]);
      }
    }
    void loadLeaks();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updatePhone(id, {
        number_e164: numberE164,
        country: country || null,
        carrier: carrier || null,
        line_type: lineType,
        messaging_apps: messagingApps
          ? messagingApps
              .split(/[,;]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
        spam_reports: spamReports ? Number(spamReports) : null
      });
      const refreshed = await getPhoneById(id);
      setData(refreshed);
      toast.success('Phone updated.');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to update phone.');
    } finally {
      setSaving(false);
    }
  };

  // removed legacy leak search effect

  const headerTitle = useMemo(() => data?.phone.phone.number_e164 ?? data?.phone.id ?? 'Phone', [data]);

  const [linkedProfiles, setLinkedProfiles] = useState<
    Array<{ id: string; platform: string; handle: string; linkTo: string; url?: string | null }>
  >([]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!data) return;
      try {
        const { data: edges, error: edgeErr } = await supabase
          .from('entity_edges')
          .select('id, target_id')
          .eq('source_type', 'phone')
          .eq('source_id', data.phone.id)
          .eq('target_type', 'social_profile');
        if (edgeErr) throw edgeErr;
        const profileIds = (edges ?? []).map((e) => e.target_id as string);
        if (profileIds.length) {
          const { data: profiles, error: profileErr } = await supabase
            .from('social_profiles')
            .select('id, platform, handle, profile_url')
            .in('id', profileIds);
          if (profileErr) throw profileErr;
          if (!active) return;
          setLinkedProfiles(
            (profiles ?? []).map((p) => {
              const row = p as { id: string; platform?: string; handle?: string; profile_url?: string | null };
              return {
                id: row.id,
                platform: row.platform ?? '',
                handle: row.handle ?? '',
                url: row.profile_url ?? null,
                linkTo: `/profiles/${row.id}`
              };
            })
          );
        } else {
          if (!active) return;
          setLinkedProfiles([]);
        }
      } catch (err) {
        console.error('Failed to load linked profiles for phone', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [data]);

  if (!id) {
    return <div className="p-6">Phone ID missing.</div>;
  }
  if (loading) {
    return <div className="p-6">Loading…</div>;
  }
  if (error) {
    return (
      <div className="p-6">
        <PageMeta title="Phone" description="Phone detail" noIndex />
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }
  if (!data) return null;

  const phone = data.phone;

  return (
    <>
      <div className="space-y-6 p-6 mx-auto max-w-7xl">
        <PageMeta title={`Phone · ${headerTitle}`} description="Phone detail" noIndex />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Phone</h1>
            <p className="text-sm text-muted-foreground">{formatE164PhoneNumber(phone.phone.number_e164)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
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
            <Button size="sm" variant="outline" onClick={() => setEditDetailsOpen(true)}>
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <div className="text-sm text-gray-600">E.164 Number</div>
                <div className="font-medium">{phone.phone.number_e164 || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Country</div>
                <div className="font-medium">{phone.phone.country || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Carrier</div>
                <div className="font-medium">{phone.phone.carrier || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Line type</div>
                <div className="font-medium capitalize">{phone.phone.line_type || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Messaging apps</div>
                <div className="font-medium">
                  {(phone.messaging_apps ?? []).length > 0 ? (phone.messaging_apps ?? []).join(', ') : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Spam reports</div>
                <div className="font-medium">{phone.spam_reports ?? 0}</div>
              </div>
            </div>
          </div>
        </ComponentCard>

        <LinkedPeopleCard
          displayName={phone.phone.number_e164}
          items={data.people.map(({ edge, person }) => ({
            id: person.id,
            name: formatPersonName(normalizePersonName(person.name)),
            avatar: person.avatar ?? null,
            linkTo: `/people/${person.id}`,
            transformType: edge.transform_type,
            confidenceScore: edge.confidence_score,
            retrievedAt: edge.retrieved_at ?? null,
            sourceApi: edge.source_api ?? null,
            sourceUrl: edge.source_url ?? null
          }))}
        />

        <LinkedProfilesCard
          title="Social Profiles"
          displayName={phone.phone.number_e164}
          ownerId={phone.id}
          organizationId={phone.organization_id}
          ownerType="phone"
          items={linkedProfiles.map((p) => ({
            id: p.id,
            platform: p.platform,
            handle: p.handle,
            url: p.url ?? null,
            linkTo: `/profiles/${p.id}`
          }))}
          onUnlink={async (profileId) => {
            await removeProfileFromPhone(phone.id, profileId);
            setLinkedProfiles((prev) => prev.filter((x) => x.id !== profileId));
            toast.success('Profile unlinked');
          }}
          onAttached={(p) => {
            setLinkedProfiles((prev) => {
              const map = new Map(prev.map((x) => [x.id, x]));
              map.set(p.id, {
                id: p.id,
                platform: p.platform,
                handle: p.handle,
                url: p.url ?? null,
                linkTo: `/profiles/${p.id}`
              });
              return Array.from(map.values());
            });
          }}
        />

        <LinkedLeaksCard
          title="Leaks"
          displayName={phone.phone.number_e164}
          ownerId={phone.id}
          organizationId={phone.organization_id}
          items={linkedLeaks.map((l) => ({
            id: l.id,
            source: l.source,
            snippet: l.snippet ?? null,
            linkTo: `/leaks/${l.id}`
          }))}
          onUnlink={async (leakId) => {
            await detachLeakFromPhone(leakId, phone.id);
            setLinkedLeaks((prev) => prev.filter((x) => x.id !== leakId));
            toast.success('Leak unlinked');
          }}
          onAttached={(l) => {
            setLinkedLeaks((prev) => {
              const map = new Map(prev.map((x) => [x.id, x]));
              map.set(l.id, { id: l.id, source: l.source, snippet: null });
              return Array.from(map.values());
            });
          }}
        />

        <div className="mx-auto mt-6 max-w-7xl">
        <CaseWebMentions entity={{ id: phone.id, type: 'phone', name: phone.phone.number_e164 }} allowManage showActions />
      </div>
      </div>

      {/* Edit Details Dialog */}
      <Dialog open={editDetailsOpen} onOpenChange={setEditDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">E.164 Number</label>
                <Input value={numberE164} onChange={(e) => setNumberE164(formatE164Input(e.target.value))} />
              </div>
              <div>
                <label className="text-sm font-medium">Country</label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Carrier</label>
                <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Line type</label>
                <Input value={lineType} onChange={(e) => setLineType(e.target.value as 'mobile' | 'landline' | 'voip' | 'unknown')} />
              </div>
              <div>
                <label className="text-sm font-medium">Messaging apps (comma separated)</label>
                <Input value={messagingApps} onChange={(e) => setMessagingApps(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Spam reports</label>
                <Input type="number" value={spamReports} onChange={(e) => setSpamReports(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDetailsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await handleSave();
                  setEditDetailsOpen(false);
                }}
                disabled={saving}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertHeader>
            <AlertDialogTitle>Delete phone?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this phone and its direct edges. This action cannot be undone.
            </AlertDialogDescription>
          </AlertHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await deletePhone(id);
                  toast.success('Phone deleted.');
                  navigate('/phones');
                } catch (e) {
                  console.error(e);
                  toast.error('Failed to delete phone.');
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



import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Separator } from '../../components/ui/separator';
import { Badge } from '../../components/ui/badge';
import { getEmailById, updateEmail, deleteEmail, type EmailDetailResponse } from '../../api/emails';
import type { EmailProfileRef } from '../../types/email';
import { removeEmailFromPerson } from '../../api/people';
import { toast } from 'sonner';
import { format } from 'date-fns';
import useDebounce from '../../hooks/useDebounce';
import {
	attachLeakToEmail,
	detachLeakFromEmail,
	createLeak,
	searchLeaks
} from '../../api/leaks';
import type { LeakSearchResult } from '../../types/leak';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '../../components/ui/dialog';
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
import { Loader2, Link2Off, Pencil, ArrowUpRight, MoreHorizontal } from 'lucide-react';
import ComponentCard from '../../components/common/ComponentCard';
import LinkedProfilesCard from '../../components/common/LinkedProfilesCard';
import LinkedPeopleCard from '../../components/common/LinkedPeopleCard';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import CaseWebMentions from '../../components/cases/CaseWebMentions';
import { handleSearchWebMentions } from '../../utils/webSearch';
import { supabase } from '../../utils/supabaseClient';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';

export default function EmailDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const navigate = useNavigate();
  const [data, setData] = useState<EmailDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [address, setAddress] = useState('');
  const [domain, setDomain] = useState('');
  const [firstSeen, setFirstSeen] = useState('');
  const [confidence, setConfidence] = useState('');
  const [lastChecked, setLastChecked] = useState('');

  const [manageLeaksOpen, setManageLeaksOpen] = useState(false);
  const [leakQuery, setLeakQuery] = useState('');
  const debouncedLeakQuery = useDebounce(leakQuery, 400);
  const [leakResults, setLeakResults] = useState<LeakSearchResult[]>([]);
  const [leakSearchLoading, setLeakSearchLoading] = useState(false);
  const [linkingLeakId, setLinkingLeakId] = useState<string | null>(null);
  const [detachingLeakId, setDetachingLeakId] = useState<string | null>(null);
  const { setTitle, setReturnTo } = useBreadcrumbs();
  const toAbsoluteUrl = (u?: string | null) => {
    if (!u) return null;
    return /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, '')}`;
  };

  const formatFirstSeen = (v?: string | null) => {
    if (!v) return null;
    const d = new Date(String(v).trim());
    if (Number.isNaN(d.getTime())) return v;
    const month = format(d, 'MMMM');
    const dayWithOrdinal = format(d, 'do');
    const year = format(d, 'yyyy');
    const time = format(d, 'h:mma').toLowerCase();
    const tzAbbr = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
      .formatToParts(d)
      .find((p) => p.type === 'timeZoneName')?.value ?? '';
    return `${month} ${dayWithOrdinal}, ${year} ${time} ${tzAbbr}`.trim();
  };

  const [newLeakSource, setNewLeakSource] = useState('');
  const [newLeakSnippet, setNewLeakSnippet] = useState('');
  const [newLeakRetrievedAt, setNewLeakRetrievedAt] = useState('');
  const [newLeakUrl, setNewLeakUrl] = useState('');
  const [creatingLeak, setCreatingLeak] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkedDomain, setLinkedDomain] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const response = await getEmailById(id);
        if (!active) return;
        setData(response);
        setAddress(response.email.email.address);
        setDomain(response.email.email.domain ?? '');
        setFirstSeen(response.email.email.first_seen ?? '');
        setConfidence(
          response.email.confidence != null ? response.email.confidence.toString() : ''
        );
        setLastChecked(response.email.last_checked ?? '');
        setTitle(response.email.email.address ?? response.email.id);
        setReturnTo({ path: '/emails', label: 'Emails' });
      } catch (err) {
        console.error(err);
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load email.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id, setTitle, setReturnTo]);

  // Load linked domain via entity_edges (email -> domain)
  useEffect(() => {
    let cancelled = false;
    async function loadDomain() {
      if (!id) return;
      try {
        const { data: edgeRows } = await supabase
          .from('entity_edges')
          .select('target_id')
          .eq('source_type', 'email')
          .eq('source_id', id)
          .eq('target_type', 'domain')
          .limit(1);
        const domainId = (edgeRows ?? [])[0]?.target_id as string | undefined;
        if (!domainId) {
          if (!cancelled) setLinkedDomain(null);
          return;
        }
        const { data: dom } = await supabase.from('domains').select('id, name').eq('id', domainId).single();
        if (!cancelled) setLinkedDomain(dom ? { id: dom.id as string, name: (dom.name as string) ?? '' } : null);
      } catch (e) {
        console.error('Failed to load linked domain for email', e);
        if (!cancelled) setLinkedDomain(null);
      }
    }
    void loadDomain();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const formattedFirstSeen = useMemo(() => {
    const value = data?.email.email.first_seen;
    if (!value) return null;
    try {
      return format(new Date(value), 'PPpp');
    } catch {
      return value;
    }
  }, [data?.email.email.first_seen]);

  const formattedLastChecked = useMemo(() => {
    const value = data?.email.last_checked;
    if (!value) return null;
    try {
      return format(new Date(value), 'PPpp');
    } catch {
      return value;
    }
  }, [data?.email.last_checked]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateEmail(id, {
        address,
        domain,
        first_seen: firstSeen,
        confidence: confidence.trim() === '' ? null : Number(confidence),
        last_checked: lastChecked || null
      });
      const refreshed = await getEmailById(id);
      setData(refreshed);
      setAddress(refreshed.email.email.address);
      setDomain(refreshed.email.email.domain ?? '');
      setFirstSeen(refreshed.email.email.first_seen ?? '');
      setConfidence(
        refreshed.email.confidence != null ? refreshed.email.confidence.toString() : ''
      );
      setLastChecked(refreshed.email.last_checked ?? '');
      toast.success('Email updated.');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to update email.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!manageLeaksOpen || !data) {
      setLeakResults([]);
      return;
    }

    const runSearch = async () => {
      setLeakSearchLoading(true);
      try {
        const results = await searchLeaks(
          data.email.organization_id,
          debouncedLeakQuery,
          10
        );
        setLeakResults(results);
      } catch (err) {
        console.error(err);
        toast.error('Failed to search leaks.');
      } finally {
        setLeakSearchLoading(false);
      }
    };

    void runSearch();
  }, [manageLeaksOpen, debouncedLeakQuery, data]);

  const handleUnlink = async (personId: string) => {
    if (!id) return;
    try {
      await removeEmailFromPerson(personId, id);
      const refreshed = await getEmailById(id);
      setData(refreshed);
      toast.success('Email unlinked from person.');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to unlink email.');
    }
  };

  const reloadEmail = async () => {
    if (!id) return;
    const refreshed = await getEmailById(id);
    setData(refreshed);
  };

  const handleDetachLeak = async (leakId: string) => {
    if (!data) return;
    setDetachingLeakId(leakId);
    try {
      await detachLeakFromEmail(leakId, data.email.id);
      toast.success('Leak detached from email.');
      await reloadEmail();
    } catch (err) {
      console.error(err);
      toast.error('Failed to detach leak.');
    } finally {
      setDetachingLeakId(null);
    }
  };

  const handleAttachExistingLeak = async (leakId: string) => {
    if (!data) return;
    setLinkingLeakId(leakId);
    try {
      await attachLeakToEmail(leakId, data.email.id, { transform_type: 'manual_link' });
      toast.success('Leak attached to email.');
      await reloadEmail();
      setManageLeaksOpen(false);
      setLeakQuery('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to attach leak.');
    } finally {
      setLinkingLeakId(null);
    }
  };

  const resetNewLeakForm = () => {
    setNewLeakSource('');
    setNewLeakSnippet('');
    setNewLeakRetrievedAt('');
    setNewLeakUrl('');
  };

  const handleCreateLeak = async () => {
    if (!data) return;
    const sourceTrimmed = newLeakSource.trim();
    if (!sourceTrimmed) {
      toast.error('Source is required.');
      return;
    }
    setCreatingLeak(true);
    try {
      const created = await createLeak({
        organization_id: data.email.organization_id,
        source: sourceTrimmed,
        content_snippet: newLeakSnippet.trim() || null,
        found_emails: [data.email.email.address],
        retrieved_at: newLeakRetrievedAt ? new Date(newLeakRetrievedAt).toISOString() : null,
        url: newLeakUrl.trim() || null,
        metadata: {}
      });
      await attachLeakToEmail(created.leak.id, data.email.id, { transform_type: 'manual_create' });
      toast.success('Leak created and attached.');
      await reloadEmail();
      resetNewLeakForm();
      setManageLeaksOpen(false);
      setLeakQuery('');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to create leak.');
    } finally {
      setCreatingLeak(false);
    }
  };

  if (!id) {
    return <div className="p-6">Email ID missing.</div>;
  }

  if (loading) {
    return <div className="p-6">Loading…</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <PageMeta title="Email" description="Email detail" noIndex />
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const email = data.email;

  return (
    <>
    <div className="space-y-6 p-6 mx-auto max-w-7xl">
      <PageMeta title={`Email · ${email.email.address}`} description="Email detail" noIndex />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Email</h1>
          <p className="text-sm text-muted-foreground">{email.email.address}</p>
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
          <Button size="sm" variant="outline" onClick={() => setEditDetailsOpen(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground">Address</div>
              <div className="font-medium">{email.email.address || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Domain</div>
              <div className="font-medium">
                {linkedDomain ? (
                  <Link to={`/domains/${linkedDomain.id}`} className="text-blue-600 hover:underline">
                    {linkedDomain.name}
                  </Link>
                ) : (
                  email.email.domain || '—'
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">First seen</div>
              <div className="font-medium">{formattedFirstSeen || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Confidence</div>
              <div className="font-medium">
                {email.confidence != null ? `${(email.confidence * 100).toFixed(0)}%` : '—'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Last checked</div>
              <div className="font-medium">{formattedLastChecked || '—'}</div>
            </div>
          </div>
        </div>
      </ComponentCard>

      <LinkedPeopleCard
        displayName={email.email.address}
        items={data.people.map(({ edge, person }) => {
            const display =
              person.name?.first || person.name?.given
                ? [person.name?.prefix, person.name?.first, person.name?.middle, person.name?.last, person.name?.suffix]
                    .filter(Boolean)
                    .join(' ') || person.id
                : (typeof person.name === 'string' ? person.name : person.id);
            return {
              id: person.id,
              name: display,
              avatar: person.avatar ?? null,
              linkTo: `/people/${person.id}`,
              transformType: edge.transform_type ?? null,
              confidenceScore: edge.confidence_score ?? null,
              retrievedAt: (edge as unknown as { retrieved_at?: string | null })?.retrieved_at ?? null,
              sourceUrl: (edge as unknown as { source_url?: string | null })?.source_url ?? null,
              sourceApi: (edge as unknown as { source_api?: string | null })?.source_api ?? null
            };
          })}
        onUnlink={(pid) => handleUnlink(pid)}
      />

      <ComponentCard>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Leaks</h3>
          <Button size="sm" variant="outline" onClick={() => setManageLeaksOpen(true)} disabled={!data}>
            <Pencil className="size-4" />
          </Button>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>
              Confidence:{' '}
              {email.confidence != null ? `${(email.confidence * 100).toFixed(0)}%` : '—'}
            </span>
            <span>
              Last checked:{' '}
              {formattedLastChecked ?? '—'}
            </span>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium">Breaches</p>
            {(() => {
              const breachLeaks = (email.leaks ?? []).filter((leak) => leak.kind === 'breach');
              if (breachLeaks.length === 0) {
                return <p className="mt-2 text-sm text-muted-foreground">No breach data.</p>;
              }
              return (
                <div className="mt-2 space-y-3">
                  {breachLeaks.map((leak) => {
                    const title = leak.title ?? leak.source ?? leak.leak.id;
                    return (
                      <div
                        key={`${leak.leak.id}-${leak.first_seen ?? leak.last_seen ?? 'breach'}`}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="uppercase">{leak.kind}</Badge>
                            <Link to={`/leaks/${leak.leak.id}`} className="text-base font-medium hover:underline">
                              {title}
                            </Link>
                            {leak.source ? <span className="text-muted-foreground text-sm">via {leak.source}</span> : null}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                            {leak.first_seen ? <span>First seen: {formatFirstSeen(leak.first_seen)}</span> : null}
                            {leak.confidence != null ? (
                              <span>{(leak.confidence * 100).toFixed(0)}% confidence</span>
                            ) : null}
                            {leak.url ? (
                              <a href={toAbsoluteUrl(leak.url) ?? '#'} target="_blank" rel="noopener noreferrer" className="underline">
                                View <ArrowUpRight className="size-4 inline-block" />
                              </a>
                            ) : null}
                          </div>
                          {leak.content_snippet ? (
                            <div className="mt-1 text-sm text-muted-foreground">{leak.content_snippet}</div>
                          ) : null}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={detachingLeakId === leak.leak.id}
                          onClick={() => handleDetachLeak(leak.leak.id)}
                        >
                          {detachingLeakId === leak.leak.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : null}
                          <Link2Off className="size-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium">Paste / Dump Mentions</p>
            {(() => {
              const pasteLeaks = (email.leaks ?? []).filter((leak) => leak.kind === 'paste');
              if (pasteLeaks.length === 0) {
                return <p className="mt-2 text-sm text-muted-foreground">No paste or leak mentions recorded.</p>;
              }
              return (
                <div className="mt-2 space-y-3">
                  {pasteLeaks.map((leak) => {
                    const title = leak.title ?? leak.leak.id;
                    return (
                      <div
                        key={`${leak.leak.id}-${leak.first_seen ?? 'paste'}`}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="uppercase">{leak.kind}</Badge>
                            <Link to={`/leaks/${leak.leak.id}`} className="text-base font-medium hover:underline">
                              {title}
                            </Link>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                            {leak.first_seen ? <span>first seen {formatFirstSeen(leak.first_seen)}</span> : null}
                            {leak.first_seen ? <span>first seen {formatFirstSeen(leak.first_seen)}</span> : null}
                            {leak.confidence != null ? (
                              <span>{(leak.confidence * 100).toFixed(0)}% confidence</span>
                            ) : null}
                            {leak.url ? (
                              <a href={toAbsoluteUrl(leak.url) ?? '#'} target="_blank" rel="noopener noreferrer" className="underline">
                                View source
                              </a>
                            ) : null}
                          </div>
                          {leak.content_snippet ? (
                            <div className="mt-1 text-sm text-muted-foreground">{leak.content_snippet}</div>
                          ) : null}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={detachingLeakId === leak.leak.id}
                          onClick={() => handleDetachLeak(leak.leak.id)}
                        >
                          {detachingLeakId === leak.leak.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : null}
                          <Link2Off className="size-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <Separator />
        </div>
      </ComponentCard>

      <LinkedProfilesCard
        title="Social Profiles"
        displayName={email.email.address}
        ownerId={email.id}
        organizationId={email.organization_id}
        ownerType="email"
        items={(email.profiles ?? []).map((p: EmailProfileRef) => ({
          id: (p as { id?: string }).id ?? `${p.platform ?? ''}-${p.handle ?? ''}`,
          platform: p.platform ?? '',
          handle: p.handle ?? '',
          url: p.url ?? null,
          linkTo: (p as { id?: string }).id ? `/profiles/${(p as { id?: string }).id}` : '#'
        }))}
        onUnlink={async (profileId) => {
          try {
            const { removeProfileFromEmail } = await import('../../api/social_profiles');
            await removeProfileFromEmail(email.id, profileId);
            const refreshed = await getEmailById(email.id);
            setData(refreshed);
            toast.success('Profile unlinked');
          } catch (err) {
            console.error('Failed to unlink profile from email', err);
            toast.error('Failed to unlink profile.');
          }
        }}
        onAttached={async () => {
          try {
            const refreshed = await getEmailById(email.id);
            setData(refreshed);
          } catch (err) {
            console.error('Failed to refresh after linking profile', err);
            toast.error('Linked successfully, but failed to refresh. Please reload.');
          }
        }}
      />

      <div className="mx-auto mt-6 max-w-7xl">
					<CaseWebMentions
            entity={{ id: email.id, type: 'email', name: email.email.address || email.id }}
            allowManage
            showActions
            onSearchWebMentions={() => handleSearchWebMentions('email', email.id, email.email.address || email.id)}
          />
				</div>
    </div>
    <Dialog open={manageLeaksOpen} onOpenChange={setManageLeaksOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage leaks</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Attach existing leak</label>
                <Input
                  placeholder="Search by source or snippet..."
                  value={leakQuery}
                  onChange={(event) => setLeakQuery(event.target.value)}
                />
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-2">
                {leakSearchLoading ? (
                  <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching…
                  </div>
                ) : leakResults.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">No leaks found.</p>
                ) : (
                  leakResults.map((leak) => (
                    <div key={leak.id} className="rounded-md border bg-card p-3">
                      <div className="font-medium">{leak.source}</div>
                      {leak.content_snippet ? (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {leak.content_snippet}
                        </div>
                      ) : null}
                      <div className="mt-2 flex items-center justify-between">
                        <Link
                          to={`/leaks/${leak.id}`}
                          className="text-xs text-blue-600 underline dark:text-blue-400"
                        >
                          View
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={linkingLeakId === leak.id || data?.email.leaks?.some((l) => l.leak.id === leak.id)}
                          onClick={() => handleAttachExistingLeak(leak.id)}
                        >
                          {linkingLeakId === leak.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : null}
                          Attach
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Create new leak</label>
                <Input
                  placeholder="Source"
                  value={newLeakSource}
                  onChange={(event) => setNewLeakSource(event.target.value)}
                />
                <Textarea
                  placeholder="Content snippet"
                  rows={4}
                  value={newLeakSnippet}
                  onChange={(event) => setNewLeakSnippet(event.target.value)}
                />
                <div className="rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
                  This leak will be created and automatically linked to{' '}
                  <span className="font-medium text-foreground">{email.email.address}</span>.
                </div>
                <Input
                  type="datetime-local"
                  value={newLeakRetrievedAt}
                  onChange={(event) => setNewLeakRetrievedAt(event.target.value)}
                />
                <Input
                  placeholder="URL"
                  value={newLeakUrl}
                  onChange={(event) => setNewLeakUrl(event.target.value)}
                />
              </div>
              <Button onClick={handleCreateLeak} disabled={creatingLeak}>
                {creatingLeak ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create leak
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={editDetailsOpen} onOpenChange={setEditDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Address</label>
                <Input value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Domain</label>
                <Input value={domain} onChange={(event) => setDomain(event.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">First seen</label>
                <Input
                  type="datetime-local"
                  value={firstSeen ? firstSeen.slice(0, 16) : ''}
                  onChange={(event) => setFirstSeen(event.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Confidence (0–1)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={confidence}
                  onChange={(event) => setConfidence(event.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last checked</label>
                <Input
                  type="datetime-local"
                  value={lastChecked ? lastChecked.slice(0, 16) : ''}
                  onChange={(event) => setLastChecked(event.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDetailsOpen(false)}>Cancel</Button>
              <Button onClick={async () => { await handleSave(); setEditDetailsOpen(false); }} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertHeader>
            <AlertDialogTitle>Delete email?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this email and its direct edges. This action cannot be undone.
            </AlertDialogDescription>
          </AlertHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await deleteEmail(id);
                  toast.success('Email deleted.');
                  navigate('/emails');
                } catch (e) {
                  console.error(e);
                  toast.error('Failed to delete email.');
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


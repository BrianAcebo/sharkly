import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { Badge } from '../../components/ui/badge';
import { getEmailById, updateEmail, type EmailDetailResponse } from '../../api/emails';
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
import { Loader2, Plus, Trash } from 'lucide-react';

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

  const [newLeakSource, setNewLeakSource] = useState('');
  const [newLeakSnippet, setNewLeakSnippet] = useState('');
  const [newLeakRetrievedAt, setNewLeakRetrievedAt] = useState('');
  const [newLeakUrl, setNewLeakUrl] = useState('');
  const [creatingLeak, setCreatingLeak] = useState(false);

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
    <div className="space-y-6 p-6">
      <PageMeta title={`Email · ${email.email.address}`} description="Email detail" noIndex />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Email</h1>
          <p className="text-sm text-muted-foreground">{email.email.address}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              {formattedFirstSeen && <p className="mt-1 text-xs text-muted-foreground">{formattedFirstSeen}</p>}
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
              {data.email.confidence != null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Stored confidence: {(data.email.confidence * 100).toFixed(0)}%
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Last checked</label>
              <Input
                type="datetime-local"
                value={lastChecked ? lastChecked.slice(0, 16) : ''}
                onChange={(event) => setLastChecked(event.target.value)}
                className="mt-1"
              />
              {formattedLastChecked && (
                <p className="mt-1 text-xs text-muted-foreground">{formattedLastChecked}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked People</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.people.length === 0 ? (
            <p className="text-sm text-muted-foreground">No people linked.</p>
          ) : (
            data.people.map(({ edge, person }) => (
              <div key={edge.id} className="flex items-start justify-between rounded-lg border p-4">
                <div>
                  <Link to={`/people/${person.id}`} className="text-base font-medium hover:underline">
                    {person.name?.first || person.name?.given ? (
                      <>
                        {[person.name?.prefix, person.name?.first, person.name?.middle, person.name?.last, person.name?.suffix]
                          .filter(Boolean)
                          .join(' ') || person.id}
                      </>
                    ) : (
                      person.id
                    )}
                  </Link>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {edge.transform_type ? <Badge variant="outline">{edge.transform_type}</Badge> : null}
                    {edge.confidence_score != null ? (
                      <span className="ml-2">Confidence: {(edge.confidence_score * 100).toFixed(0)}%</span>
                    ) : null}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleUnlink(person.id)}>
                  Unlink
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Additional Data</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setManageLeaksOpen(true)}
            disabled={!data}
          >
            <Plus className="mr-1 h-4 w-4" />
            Manage leaks
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {breachLeaks.map((leak) => {
                    const title = leak.title ?? leak.source ?? leak.leak.id;
                    return (
                      <li key={`${leak.leak.id}-${leak.first_seen ?? leak.last_seen ?? 'breach'}`} className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="uppercase">
                            {leak.kind}
                          </Badge>
                          <Link
                            to={`/leaks/${leak.leak.id}`}
                            className="font-medium text-blue-600 underline underline-offset-2 dark:text-blue-400"
                          >
                            {title}
                          </Link>
                          {leak.source ? (
                            <span className="text-muted-foreground">via {leak.source}</span>
                          ) : null}
                          {leak.first_seen ? (
                            <span className="text-muted-foreground">first seen {leak.first_seen}</span>
                          ) : null}
                          {leak.confidence != null ? (
                            <span className="text-muted-foreground">
                              {(leak.confidence * 100).toFixed(0)}% confidence
                            </span>
                          ) : null}
                        </div>
                        {leak.content_snippet ? (
                          <div className="text-sm text-muted-foreground">{leak.content_snippet}</div>
                        ) : null}
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={detachingLeakId === leak.leak.id}
                            onClick={() => handleDetachLeak(leak.leak.id)}
                          >
                            {detachingLeakId === leak.leak.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Trash className="mr-1 h-3 w-3" />
                            )}
                            Unlink
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
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
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {pasteLeaks.map((leak) => {
                    const title = leak.title ?? leak.leak.id;
                    return (
                      <li key={`${leak.leak.id}-${leak.first_seen ?? 'paste'}`} className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="uppercase">
                            {leak.kind}
                          </Badge>
                          <Link
                            to={`/leaks/${leak.leak.id}`}
                            className="font-medium text-blue-600 underline underline-offset-2 dark:text-blue-400"
                          >
                            {title}
                          </Link>
                          {leak.first_seen ? (
                            <span className="text-muted-foreground">first seen {leak.first_seen}</span>
                          ) : null}
                          {leak.confidence != null ? (
                            <span className="text-muted-foreground">
                              {(leak.confidence * 100).toFixed(0)}% confidence
                            </span>
                          ) : null}
                          {leak.url ? (
                            <a
                              href={leak.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground underline"
                            >
                              View source
                            </a>
                          ) : null}
                        </div>
                        {leak.content_snippet ? (
                          <div className="text-sm text-muted-foreground">{leak.content_snippet}</div>
                        ) : null}
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={detachingLeakId === leak.leak.id}
                            onClick={() => handleDetachLeak(leak.leak.id)}
                          >
                            {detachingLeakId === leak.leak.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Trash className="mr-1 h-3 w-3" />
                            )}
                            Unlink
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium">Profiles</p>
            {email.profiles && email.profiles.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {email.profiles.map((profile, index) => (
                  <li key={index}>
                    <span className="font-medium">
                      {profile.label || profile.handle || profile.id || 'Profile'}
                    </span>
                    {profile.platform ? (
                      <span className="ml-2 text-muted-foreground">{profile.platform}</span>
                    ) : null}
                    {profile.url ? (
                      <span className="ml-2 text-muted-foreground">{profile.url}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No linked profiles.</p>
            )}
          </div>
        </CardContent>
      </Card>
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
    </>
  );
}


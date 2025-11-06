import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Plus, Trash } from 'lucide-react';

import PageMeta from '../../components/common/PageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Separator } from '../../components/ui/separator';
import { Badge } from '../../components/ui/badge';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '../../components/ui/dialog';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { useAuth } from '../../contexts/AuthContext';
import useDebounce from '../../hooks/useDebounce';
import { getLeakById, updateLeak, attachLeakToEmail, detachLeakFromEmail } from '../../api/leaks';
import type { LeakDetail } from '../../types/leak';
import { searchEmails, type EmailSearchResult } from '../../api/emails';

const parseListInput = (value: string): string[] =>
	value
		.split(/[\r\n,]+/g)
		.map((item) => item.trim())
		.filter((item) => item.length > 0);

const formatDateInput = (value: string | null | undefined): string => {
	if (!value) return '';
	try {
		return new Date(value).toISOString().slice(0, 16);
	} catch {
		return '';
	}
};

const LeakDetailPage = () => {
	const params = useParams<{ id: string }>();
	const leakId = params.id ?? '';
	const { user } = useAuth();
	const { setTitle } = useBreadcrumbs();

	const [detail, setDetail] = useState<LeakDetail | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [editMode, setEditMode] = useState<boolean>(false);
	const [saving, setSaving] = useState<boolean>(false);

	const [source, setSource] = useState('');
	const [contentSnippet, setContentSnippet] = useState('');
	const [foundEmailsText, setFoundEmailsText] = useState('');
	const [foundUsernamesText, setFoundUsernamesText] = useState('');
	const [foundPasswordsText, setFoundPasswordsText] = useState('');
	const [retrievedAt, setRetrievedAt] = useState('');
	const [url, setUrl] = useState('');

	const [attachOpen, setAttachOpen] = useState(false);
	const [emailQuery, setEmailQuery] = useState('');
	const debouncedEmailQuery = useDebounce(emailQuery, 400);
	const [emailResults, setEmailResults] = useState<EmailSearchResult[]>([]);
	const [emailSearchLoading, setEmailSearchLoading] = useState(false);
	const [linkingEmailId, setLinkingEmailId] = useState<string | null>(null);

	const initializeForm = useCallback((leak: LeakDetail['leak']) => {
		setSource(leak.source ?? '');
		setContentSnippet(leak.content_snippet ?? '');
		setFoundEmailsText((leak.found_emails ?? []).join('\n'));
		setFoundUsernamesText((leak.found_usernames ?? []).join('\n'));
		setFoundPasswordsText((leak.found_password_hashes ?? []).join('\n'));
		setRetrievedAt(formatDateInput(leak.retrieved_at));
		setUrl(leak.url ?? '');
	}, []);

	const loadLeak = useCallback(async () => {
		if (!leakId) return;
		setLoading(true);
		try {
			const data = await getLeakById(leakId);
			setDetail(data);
			initializeForm(data.leak);
			setTitle(`Leak: ${data.leak.source ?? leakId}`);
		} catch (error) {
			console.error(error);
			toast.error(error instanceof Error ? error.message : 'Failed to load leak.');
		} finally {
			setLoading(false);
		}
	}, [initializeForm, leakId, setTitle]);

	useEffect(() => {
		void loadLeak();
	}, [loadLeak]);

	useEffect(() => {
		if (!attachOpen || !user?.organization_id) {
			setEmailResults([]);
			return;
		}

		const runSearch = async () => {
			setEmailSearchLoading(true);
			try {
				const results = await searchEmails(user.organization_id!, debouncedEmailQuery, 10);
				setEmailResults(results);
			} catch (error) {
				console.error(error);
				toast.error('Failed to search emails.');
			} finally {
				setEmailSearchLoading(false);
			}
		};

		void runSearch();
	}, [attachOpen, debouncedEmailQuery, user?.organization_id]);

	const linkedEmailIds = useMemo(() => {
		return new Set(detail?.emails.map((link) => link.email.id) ?? []);
	}, [detail]);

	const handleCancelEdit = () => {
		if (detail) {
			initializeForm(detail.leak);
		}
		setEditMode(false);
	};

	const handleSave = async () => {
		if (!detail) return;
		setSaving(true);
		try {
			const retrievedIso = retrievedAt ? new Date(retrievedAt).toISOString() : null;
			const updated = await updateLeak(detail.leak.id, {
				source,
				content_snippet: contentSnippet,
				found_emails: parseListInput(foundEmailsText),
				found_usernames: parseListInput(foundUsernamesText),
				found_password_hashes: parseListInput(foundPasswordsText),
				retrieved_at: retrievedIso,
				url: url.trim().length > 0 ? url.trim() : null
			});
			setDetail(updated);
			initializeForm(updated.leak);
			setEditMode(false);
			toast.success('Leak updated.');
		} catch (error) {
			console.error(error);
			toast.error(error instanceof Error ? error.message : 'Failed to update leak.');
		} finally {
			setSaving(false);
		}
	};

	const handleDetachEmail = async (emailId: string) => {
		if (!detail) return;
		try {
			await detachLeakFromEmail(detail.leak.id, emailId);
			toast.success('Email detached from leak.');
			void loadLeak();
		} catch (error) {
			console.error(error);
			toast.error('Failed to detach email.');
		}
	};

	const handleAttachEmail = async (emailId: string) => {
		if (!detail) return;
		setLinkingEmailId(emailId);
		try {
			await attachLeakToEmail(detail.leak.id, emailId, { transform_type: 'manual_link' });
			toast.success('Leak linked to email.');
			setAttachOpen(false);
			setEmailQuery('');
			void loadLeak();
		} catch (error) {
			console.error(error);
			toast.error('Failed to attach leak to email.');
		} finally {
			setLinkingEmailId(null);
		}
	};

	if (loading) {
		return (
			<div className="p-6 text-sm text-muted-foreground">
				Loading leak…
			</div>
		);
	}

	if (!detail) {
		return (
			<div className="p-6 text-sm text-muted-foreground">
				Leak not found.
			</div>
		);
	}

	const metadataEntries = Object.entries(detail.leak.metadata ?? {}).filter(
		([, value]) => value !== undefined
	);

	return (
		<div className="mx-auto max-w-4xl space-y-6 p-4">
			<PageMeta title={`Leak ${detail.leak.source}`} description="Leak detail" noIndex />

			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Leak: {detail.leak.source}</h1>
					<p className="text-sm text-muted-foreground">ID: {detail.leak.id}</p>
				</div>
				<div className="flex items-center gap-2">
					{editMode ? (
						<>
							<Button variant="outline" size="sm" onClick={handleCancelEdit}>
								Cancel
							</Button>
							<Button size="sm" onClick={handleSave} disabled={saving}>
								{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
								Save
							</Button>
						</>
					) : (
						<Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
							Edit
						</Button>
					)}
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Leak Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<label className="text-sm font-medium">Source</label>
							{editMode ? (
								<Input value={source} onChange={(event) => setSource(event.target.value)} />
							) : (
								<p className="text-sm font-medium">{detail.leak.source}</p>
							)}
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Retrieved at</label>
							{editMode ? (
								<Input
									type="datetime-local"
									value={retrievedAt}
									onChange={(event) => setRetrievedAt(event.target.value)}
								/>
							) : (
								<p className="text-sm text-muted-foreground">
									{detail.leak.retrieved_at ? new Date(detail.leak.retrieved_at).toLocaleString() : '—'}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">URL:</label>
							{editMode ? (
								<Input value={url} onChange={(event) => setUrl(event.target.value)} />
							) : detail.leak.url ? (
								<a
									href={detail.leak.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-blue-600 underline dark:text-blue-400 ml-2"
								>
									{detail.leak.url}
								</a>
							) : (
								<p className="text-sm text-muted-foreground">—</p>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium">Content snippet</label>
						{editMode ? (
							<Textarea
								value={contentSnippet}
								onChange={(event) => setContentSnippet(event.target.value)}
								rows={4}
							/>
						) : (
							<p className="whitespace-pre-line text-sm text-muted-foreground">
								{detail.leak.content_snippet ?? '—'}
							</p>
						)}
					</div>

					<Separator />

					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div>
							<div className="text-sm font-medium">Found emails</div>
							{editMode ? (
								<Textarea
									className="mt-2"
									value={foundEmailsText}
									onChange={(event) => setFoundEmailsText(event.target.value)}
									rows={4}
									placeholder="one per line"
								/>
							) : detail.leak.found_emails.length > 0 ? (
								<div className="mt-2 flex flex-wrap gap-2">
									{detail.leak.found_emails.map((email) => (
										<Badge key={email} variant="secondary">
											{email}
										</Badge>
									))}
								</div>
							) : (
								<p className="mt-2 text-sm text-muted-foreground">None recorded</p>
							)}
						</div>
						<div>
							<div className="text-sm font-medium">Found usernames</div>
							{editMode ? (
								<Textarea
									className="mt-2"
									value={foundUsernamesText}
									onChange={(event) => setFoundUsernamesText(event.target.value)}
									rows={4}
									placeholder="one per line"
								/>
							) : detail.leak.found_usernames.length > 0 ? (
								<div className="mt-2 flex flex-wrap gap-2">
									{detail.leak.found_usernames.map((username) => (
										<Badge key={username} variant="outline">
											{username}
										</Badge>
									))}
								</div>
							) : (
								<p className="mt-2 text-sm text-muted-foreground">None recorded</p>
							)}
						</div>
						<div>
							<div className="text-sm font-medium">Found password hashes</div>
							{editMode ? (
								<Textarea
									className="mt-2"
									value={foundPasswordsText}
									onChange={(event) => setFoundPasswordsText(event.target.value)}
									rows={4}
									placeholder="one per line"
								/>
							) : detail.leak.found_password_hashes.length > 0 ? (
								<div className="mt-2 flex flex-wrap gap-2">
									{detail.leak.found_password_hashes.map((hash, index) => (
										<Badge key={`${hash}-${index}`} variant="outline">
											{hash}
										</Badge>
									))}
								</div>
							) : (
								<p className="mt-2 text-sm text-muted-foreground">None recorded</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Linked emails</CardTitle>
					<Button size="sm" variant="outline" onClick={() => setAttachOpen(true)}>
						<Plus className="mr-1 h-4 w-4" />
						Attach email
					</Button>
				</CardHeader>
				<CardContent className="space-y-4">
					{detail.emails.length === 0 ? (
						<p className="text-sm text-muted-foreground">No emails linked to this leak.</p>
					) : (
						<div className="space-y-3">
							{detail.emails.map((link) => {
								const provenance = link.edge;
								const metadataEntries = Object.entries(provenance.metadata ?? {}).filter(
									([, value]) => value !== undefined
								);

								return (
									<div key={provenance.id} className="space-y-3 rounded-md border bg-card p-4">
										<div className="flex flex-wrap items-start justify-between gap-2">
											<div>
												<Link
													to={`/emails/${link.email.id}`}
													className="font-medium text-blue-600 underline underline-offset-2 dark:text-blue-400"
												>
													{link.email.address}
												</Link>
												{link.email.domain ? (
													<span className="ml-2 text-sm text-muted-foreground">
														({link.email.domain})
													</span>
												) : null}
											</div>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleDetachEmail(link.email.id)}
											>
												<Trash className="mr-1 h-4 w-4" />
												Unlink
											</Button>
										</div>
										<div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
											{provenance.transform_type ? (
												<div>
													<span className="font-medium text-foreground">Method:</span>{' '}
													{provenance.transform_type}
												</div>
											) : null}
											{provenance.source_api ? (
												<div>
													<span className="font-medium text-foreground">Source:</span>{' '}
													{provenance.source_api}
												</div>
											) : null}
											{provenance.confidence_score != null ? (
												<div>
													<span className="font-medium text-foreground">Confidence:</span>{' '}
													{(provenance.confidence_score * 100).toFixed(0)}%
												</div>
											) : null}
											{provenance.retrieved_at ? (
												<div>
													<span className="font-medium text-foreground">Retrieved:</span>{' '}
													{new Date(provenance.retrieved_at).toLocaleString()}
												</div>
											) : null}
											{provenance.raw_reference_id ? (
												<div>
													<span className="font-medium text-foreground">Raw reference:</span>{' '}
													{provenance.raw_reference_id}
												</div>
											) : null}
											{provenance.source_url ? (
												<div>
													<span className="font-medium text-foreground">URL:</span>{' '}
													<a
														href={provenance.source_url}
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-600 underline dark:text-blue-400"
													>
														{provenance.source_url}
													</a>
												</div>
											) : null}
										</div>
										{metadataEntries.length > 0 ? (
											<details className="rounded-md border bg-muted/40 p-2 text-xs">
												<summary className="cursor-pointer font-medium text-foreground">
													Additional metadata
												</summary>
												<pre className="mt-2 overflow-auto text-xs text-muted-foreground">
													{JSON.stringify(Object.fromEntries(metadataEntries), null, 2)}
												</pre>
											</details>
										) : null}
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Metadata</CardTitle>
				</CardHeader>
				<CardContent>
					{metadataEntries.length === 0 ? (
						<p className="text-sm text-muted-foreground">No metadata recorded.</p>
					) : (
						<pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
							{JSON.stringify(Object.fromEntries(metadataEntries), null, 2)}
						</pre>
					)}
				</CardContent>
			</Card>

			<Dialog open={attachOpen} onOpenChange={setAttachOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Attach leak to email</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<Input
							autoFocus
							placeholder="Search by email address"
							value={emailQuery}
							onChange={(event) => setEmailQuery(event.target.value)}
						/>
						<div className="max-h-64 overflow-y-auto space-y-2">
							{emailSearchLoading ? (
								<div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Searching…
								</div>
							) : emailResults.length === 0 ? (
								<p className="py-4 text-sm text-muted-foreground">No emails found.</p>
							) : (
								emailResults.map((result) => {
									const alreadyLinked = linkedEmailIds.has(result.id);
									return (
										<div
											key={result.id}
											className="flex items-center justify-between rounded-md border bg-card p-3"
										>
											<div>
												<div className="font-medium">{result.address}</div>
												{result.domain ? (
													<div className="text-xs text-muted-foreground">{result.domain}</div>
												) : null}
											</div>
											<Button
												size="sm"
												variant="outline"
												disabled={alreadyLinked || linkingEmailId === result.id}
												onClick={() => handleAttachEmail(result.id)}
											>
												{linkingEmailId === result.id ? (
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												) : null}
												{alreadyLinked ? 'Linked' : 'Attach'}
											</Button>
										</div>
									);
								})
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default LeakDetailPage;


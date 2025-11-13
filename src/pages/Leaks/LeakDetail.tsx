import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import PageMeta from '../../components/common/PageMeta';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Separator } from '../../components/ui/separator';
import { Badge } from '../../components/ui/badge';
// legacy dialog imports removed
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
// import { useAuth } from '../../contexts/AuthContext';
// import useDebounce from '../../hooks/useDebounce';
import { getLeakById, updateLeak, detachLeakFromEmail } from '../../api/leaks';
import type { LeakDetail } from '../../types/leak';
// import { searchEmails, type EmailSearchResult } from '../../api/emails';
import ComponentCard from '../../components/common/ComponentCard';
import LinkedEmailsCard from '../../components/common/LinkedEmailsCard';
import LinkedUsernamesCard from '../../components/common/LinkedUsernamesCard';
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
import { deleteLeak } from '../../api/leaks';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

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
	// const { user } = useAuth(); // not needed here
	const { setTitle, setReturnTo } = useBreadcrumbs();

	const [detail, setDetail] = useState<LeakDetail | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [editMode, setEditMode] = useState<boolean>(false);
	const [saving, setSaving] = useState<boolean>(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const [source, setSource] = useState('');
	const [contentSnippet, setContentSnippet] = useState('');
	const [foundEmailsText, setFoundEmailsText] = useState('');
	const [foundUsernamesText, setFoundUsernamesText] = useState('');
	const [foundPasswordsText, setFoundPasswordsText] = useState('');
	const [retrievedAt, setRetrievedAt] = useState('');
	const [url, setUrl] = useState('');

	// legacy attach state removed in favor of LinkedEmailsCard

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
			setTitle(data.leak.source ?? leakId);
			setReturnTo({ path: '/leaks', label: 'Leaks' });
		} catch (error) {
			console.error(error);
			toast.error(error instanceof Error ? error.message : 'Failed to load leak.');
		} finally {
			setLoading(false);
		}
	}, [initializeForm, leakId, setTitle, setReturnTo]);

	useEffect(() => {
		void loadLeak();
	}, [loadLeak]);

// legacy attach dialog removed

	// linkedEmailIds used in legacy dialog; no longer needed

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

	// detach handled by LinkedEmailsCard

	// attach handled by LinkedEmailsCard

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
		<div className="mx-auto max-w-7xl space-y-6 p-4">
			<PageMeta title={`Leak ${detail.leak.source}`} description="Leak detail" noIndex />

			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-semibold mb-3">Leak: {detail.leak.source}</h1>
					<p className="text-sm text-muted-foreground">ID: {detail.leak.id}</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={() => window.history.length > 1 ? window.history.back() : (location.href = '/leaks')}>
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

			<ComponentCard>
				<h3 className="text-lg font-semibold">Leak Information</h3>
				<div className="space-y-4">
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
				</div>
			</ComponentCard>
			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertHeader>
						<AlertDialogTitle>Delete leak?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete this leak and its direct edges. This action cannot be undone.
						</AlertDialogDescription>
					</AlertHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={deleting}
							onClick={async () => {
								setDeleting(true);
								try {
									await deleteLeak(detail!.leak.id);
									toast.success('Leak deleted.');
									// navigate back
									window.history.back();
								} catch (e) {
									console.error(e);
									toast.error('Failed to delete leak.');
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

			<LinkedEmailsCard
				title="Emails"
				displayName={detail.leak.source ?? detail.leak.id}
				ownerType="leak"
				ownerId={detail.leak.id}
				organizationId={detail.leak.organization_id!}
				items={detail.emails.map((link) => ({
					id: link.email.id,
					address: link.email.address,
					domain: link.email.domain,
					linkTo: `/emails/${link.email.id}`,
					transformType: link.edge.transform_type,
					confidenceScore: link.edge.confidence_score,
					retrievedAt: link.edge.retrieved_at ?? undefined,
					sourceApi: (link.edge as unknown as { source_api?: string | null }).source_api ?? null,
					sourceUrl: (link.edge as unknown as { source_url?: string | null }).source_url ?? null
				}))}
				onUnlink={async (emailId) => {
					try {
						await detachLeakFromEmail(detail.leak.id, emailId);
						toast.success('Email detached from leak.');
						void loadLeak();
					} catch (err) {
						console.error('Failed to detach email from leak', err);
						toast.error('Failed to detach email.');
					}
				}}
				onAttached={() => {
					void loadLeak();
				}}
			/>

			<LinkedUsernamesCard
				title="Usernames"
				displayName={detail.leak.source ?? detail.leak.id}
				ownerId={detail.leak.id}
				organizationId={detail.leak.organization_id!}
				items={(detail.usernames ?? []).map((u) => ({
					id: u.username.id,
					value: u.username.value,
					linkTo: `/usernames/${u.username.id}`,
					transformType: u.edge.transform_type ?? null,
					confidenceScore: u.edge.confidence_score ?? null,
					retrievedAt: u.edge.retrieved_at ?? null,
					sourceApi: u.edge.source_api ?? null,
					sourceUrl: u.edge.source_url ?? null
				}))}
				onUnlink={async (usernameId) => {
					try {
						const { detachUsernameFromLeak } = await import('../../api/leaks');
						await detachUsernameFromLeak(detail.leak.id, usernameId);
						toast.success('Username detached from leak.');
						void loadLeak();
					} catch (err) {
						console.error('Failed to detach username from leak', err);
						toast.error('Failed to detach username.');
					}
				}}
				onAttached={() => void loadLeak()}
			/>

			<ComponentCard>
				<h3 className="text-lg font-semibold">Metadata</h3>
				<div>
					{metadataEntries.length === 0 ? (
						<p className="text-sm text-muted-foreground">No metadata recorded.</p>
					) : (
						<pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
							{JSON.stringify(Object.fromEntries(metadataEntries), null, 2)}
						</pre>
					)}
				</div>
			</ComponentCard>

			{/* (Legacy attach dialog removed in favor of LinkedEmailsCard manage dialog) */}
		</div>
	);
};

export default LeakDetailPage;


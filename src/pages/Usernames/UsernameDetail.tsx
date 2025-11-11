import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Button } from '../../components/ui/button';
import ComponentCard from '../../components/common/ComponentCard';
import { Pencil, MoreHorizontal } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { getUsernameById, updateUsername, detachEmailFromUsername } from '../../api/usernames';
import type { UsernameDetailResponse } from '../../api/usernames';
import LinkedEmailsCard from '../../components/common/LinkedEmailsCard';
import LinkedProfilesCard from '../../components/common/LinkedProfilesCard';
import CaseWebMentions from '../../components/cases/CaseWebMentions';
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
import { deleteUsername } from '../../api/usernames';
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
import { detachImageFromUsername } from '../../api/images';

export default function UsernameDetailPage() {
	const params = useParams();
	const id = params.id as string;
	const navigate = useNavigate();
	const { setTitle, setReturnTo } = useBreadcrumbs();

	const [data, setData] = useState<UsernameDetailResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [linkedImages, setLinkedImages] = useState<Array<{ id: string; url: string }>>([]);

	const [value, setValue] = useState('');
	const [confidence, setConfidence] = useState<string>('');

	useEffect(() => {
		let active = true;
		(async () => {
			if (!id) return;
			setLoading(true);
			setError(null);
			try {
				const resp = await getUsernameById(id);
				if (!active) return;
				setData(resp);
				setValue(resp.username.value);
				setConfidence(resp.username.confidence != null ? String(resp.username.confidence) : '');
				setTitle(resp.username.value || resp.username.id);
				setReturnTo({ path: '/usernames', label: 'Usernames' });
			} catch (err) {
				console.error(err);
				if (!active) return;
				setError(err instanceof Error ? err.message : 'Failed to load username.');
			} finally {
				if (active) setLoading(false);
			}
		})();
		return () => {
			active = false;
		};
	}, [id, setReturnTo, setTitle]);

	useEffect(() => {
		let cancelled = false;
		async function loadImages() {
			try {
				const { data: edges } = await supabase
					.from('entity_edges')
					.select('source_id')
					.eq('target_type', 'username')
					.eq('target_id', id)
					.eq('source_type', 'image');
				const imageIds = (edges ?? []).map((e: { source_id: string }) => e.source_id);
				if (imageIds.length === 0) {
					if (!cancelled) setLinkedImages([]);
					return;
				}
				const { data: rows } = await supabase.from('images').select('id, url').in('id', imageIds);
				if (!cancelled)
					setLinkedImages(
						(rows ?? []).map((r) => ({
							id: (r as { id: string }).id,
							url: (r as { url: string }).url
						}))
					);
			} catch (e) {
				console.error('Failed to load linked images for username', e);
				if (!cancelled) setLinkedImages([]);
			}
		}
		void loadImages();
		return () => {
			cancelled = true;
		};
	}, [id]);

	if (!id) return <div className="p-6">Username ID missing.</div>;
	if (loading) return <div className="p-6">Loading…</div>;
	if (error) {
		return (
			<div className="p-6">
				<PageMeta title="Username" description="Username detail" noIndex />
				<div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
					{error}
				</div>
				<Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
					Back
				</Button>
			</div>
		);
	}
	if (!data) return null;

	const u = data.username;

	return (
		<>
			<div className="mx-auto max-w-7xl space-y-6 p-6">
				<PageMeta title={`Username · ${u.value}`} description="Username detail" noIndex />
				<div className="flex items-center justify-between">
					<div>
						<h1 className="mb-2 text-2xl font-semibold">Username</h1>
						<p className="text-muted-foreground text-sm">@{u.value}</p>
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
						<Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
							<Pencil className="h-4 w-4" />
						</Button>
					</div>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div>
							<div className="text-muted-foreground text-sm">Value</div>
							<div className="font-medium">{u.value}</div>
						</div>
						<div>
							<div className="text-muted-foreground text-sm">Confidence</div>
							<div className="font-medium">
								{u.confidence != null ? `${(u.confidence * 100).toFixed(0)}%` : '—'}
							</div>
						</div>
					</div>
				</ComponentCard>

				<LinkedImagesCard
					title="Images"
					displayName={`@${u.value}`}
					ownerId={id}
					organizationId={data?.username.organization_id ?? ''}
					ownerType="username"
					items={linkedImages.map((im) => ({ id: im.id, url: im.url, linkTo: `/images/${im.id}` }))}
					onUnlink={async (imageId) => {
						await detachImageFromUsername(imageId, id);
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

				<LinkedEmailsCard
					title="Emails"
					displayName={`@${u.value}`}
					ownerType="username"
					ownerId={u.id}
					organizationId={u.organization_id}
					items={data.emails.map((e) => ({
						id: e.email.id,
						address: e.email.address,
						domain: e.email.domain,
						linkTo: `/emails/${e.email.id}`,
						transformType: e.edge.transform_type ?? null,
						confidenceScore: e.edge.confidence_score ?? null,
						retrievedAt: e.edge.retrieved_at ?? null,
						sourceApi: e.edge.source_api ?? null,
						sourceUrl: e.edge.source_url ?? null
					}))}
					onUnlink={async (emailId) => {
						await detachEmailFromUsername(u.id, emailId);
						const refreshed = await getUsernameById(u.id);
						setData(refreshed);
						toast.success('Email unlinked');
					}}
					onAttached={async () => {
						const refreshed = await getUsernameById(u.id);
						setData(refreshed);
					}}
				/>

				<LinkedProfilesCard
					title="Social Profiles"
					displayName={`@${u.value}`}
					ownerId={u.id}
					organizationId={u.organization_id}
					ownerType="username"
					items={data.profiles.map((p) => ({
						id: p.profile.id,
						platform: p.profile.platform,
						handle: p.profile.handle,
						url: p.profile.profile_url,
						linkTo: `/profiles/${p.profile.id}`
					}))}
					onUnlink={async (profileId) => {
						const { removeProfileFromUsername } = await import('../../api/social_profiles');
						await removeProfileFromUsername(u.id, profileId);
						const refreshed = await getUsernameById(u.id);
						setData(refreshed);
						toast.success('Profile unlinked');
					}}
					onAttached={async () => {
						const refreshed = await getUsernameById(u.id);
						setData(refreshed);
					}}
				/>

				<CaseWebMentions
					entity={{ id: u.id, type: 'username', name: `@${u.value}` }}
					allowManage
					showActions
				/>
			</div>

			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Edit details</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							<div>
								<label className="text-sm font-medium">Value</label>
								<Input value={value} onChange={(e) => setValue(e.target.value)} />
							</div>
							<div>
								<label className="text-sm font-medium">Confidence (0–1)</label>
								<Input
									type="number"
									step="0.01"
									min="0"
									max="1"
									value={confidence}
									onChange={(e) => setConfidence(e.target.value)}
								/>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setEditOpen(false)}>
								Cancel
							</Button>
							<Button
								onClick={async () => {
									await updateUsername(u.id, {
										value,
										confidence: confidence.trim() === '' ? null : Number(confidence)
									});
									const refreshed = await getUsernameById(u.id);
									setData(refreshed);
									setEditOpen(false);
									toast.success('Username updated.');
								}}
							>
								Save
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertHeader>
						<AlertDialogTitle>Delete username?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete this username and its direct edges. This action cannot be
							undone.
						</AlertDialogDescription>
					</AlertHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={deleting}
							onClick={async () => {
								setDeleting(true);
								try {
									await deleteUsername(u.id);
									toast.success('Username deleted.');
									navigate('/usernames');
								} catch (e) {
									console.error(e);
									toast.error('Failed to delete username.');
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

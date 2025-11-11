import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { AuthLoadingState } from '../../contexts/AuthContext';
import { AuthLoading } from '../../components/AuthLoading';
import { updatePerson, getPersonById, deletePerson } from '../../api/people';
// import type { EmailRecord } from '../../types/email';
import type { PersonRecord } from '../../types/person';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { UserAvatar } from '../../components/common/UserAvatar';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '../../components/ui/dialog';
import { supabase } from '../../utils/supabaseClient';
import { Pencil, Zap, Coins, MapPin, Link2Off, ArrowRight, MoreHorizontal } from 'lucide-react';
import { getActionCost, ActionKey, isActionEnabled } from '../../constants/costs';
import CaseWebMentions from '../../components/cases/CaseWebMentions';
import LinkedProfilesCard from '../../components/common/LinkedProfilesCard';
import LinkedImagesCard from '../../components/common/LinkedImagesCard';
import { detachImageFromPerson } from '../../api/images';
import LinkedDocumentsCard from '../../components/common/LinkedDocumentsCard';
import EntityGraphCard from '../../components/common/EntityGraphCard';
import { detachDocumentFromPerson } from '../../api/documents';
import { removeProfileFromPerson } from '../../api/social_profiles';
import { buildPersonName, formatPersonName, normalizePersonName } from '../../utils/person';
import {
	listProperties,
	attachPropertyToPerson,
	removePropertyFromPerson,
	createProperty
} from '../../api/properties';
// import { searchEmails } from '../../api/emails';
import { removeEmailFromPerson, listPersonEmails } from '../../api/people';
import LinkedEmailsCard from '../../components/common/LinkedEmailsCard';
import type { PropertyRecord } from '../../types/property';
import { toast } from 'sonner';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import ComponentCard from '../../components/common/ComponentCard';
import { Tooltip } from '../../components/ui/tooltip';
import { handleSearchWebMentions } from '../../utils/webSearch';
import LinkedPhonesCard from '../../components/common/LinkedPhonesCard';
import { removePhoneFromPerson } from '../../api/phones';
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

export default function PersonDetail() {
	const params = useParams();
	const id = params.id as string;
	const [row, setRow] = useState<PersonRecord | null>(null);

	const [avatarOpen, setAvatarOpen] = useState(false);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { setTitle, setReturnTo } = useBreadcrumbs();
	// email draft helpers removed; email linking is managed via the dialog

	// Properties manage
	const [managePropsOpen, setManagePropsOpen] = useState(false);
	const [propQuery, setPropQuery] = useState('');
	const [propResults, setPropResults] = useState<PropertyRecord[]>([]);
	const [propLoading, setPropLoading] = useState(false);
	const [linkedProps, setLinkedProps] = useState<
		Array<{ id: string; address_full: string | null }>
	>([]);
	const [newPropAddress, setNewPropAddress] = useState('');
	const [creatingProp, setCreatingProp] = useState(false);

	// Emails state (list handled via LinkedEmailsCard manage)
	const [linkedEmails, setLinkedEmails] = useState<Array<{ id: string; address: string }>>([]);

	// Social profiles linked list
	const [linkedProfiles, setLinkedProfiles] = useState<Array<{ id: string; platform: string; handle: string; url: string | null }>>([]);
	// Phones linked list
	const [linkedPhones, setLinkedPhones] = useState<Array<{ id: string; number_e164: string }>>([]);
	// Images linked list
	const [linkedImages, setLinkedImages] = useState<Array<{ id: string; url: string }>>([]);

	// Section edit dialogs
	const [editDetailsOpen, setEditDetailsOpen] = useState(false);
	const [editAliasesOpen, setEditAliasesOpen] = useState(false);
	const [editTagsOpen, setEditTagsOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [linkedDocuments, setLinkedDocuments] = useState<Array<{ id: string; title: string }>>([]);

	// email draft helpers removed; email linking is managed via the dialog

	useEffect(() => {
		setReturnTo({ path: '/people', label: 'People' });
	}, [setReturnTo]);

	// Load documents referencing this person
	useEffect(() => {
		let cancelled = false;
		async function run() {
			try {
				const { data: edges } = await supabase
					.from('entity_edges')
					.select('source_id')
					.eq('target_type', 'person')
					.eq('target_id', id)
					.eq('source_type', 'document');
				const ids = (edges ?? []).map((e: { source_id: string }) => e.source_id);
				if (ids.length === 0) {
					if (!cancelled) setLinkedDocuments([]);
					return;
				}
				const { data: rows } = await supabase.from('documents').select('id, doc, metadata').in('id', ids);
				if (!cancelled) {
					setLinkedDocuments(
						(rows ?? []).map((r: { id: string; doc?: { type?: string }; metadata?: { author?: string | null } }) => {
							const t = r?.doc?.type ?? 'document';
							const a = r?.metadata?.author ?? '';
							return { id: r.id, title: a ? `${t}: ${a}` : t };
						})
					);
				}
			} catch (e) {
				console.error('Failed loading person documents', e);
				if (!cancelled) setLinkedDocuments([]);
			}
		}
		void run();
		return () => {
			cancelled = true;
		};
	}, [id]);
	useEffect(() => {
		let active = true;
		(async () => {
			const data = await getPersonById(id);
			if (!active) return;
			setRow(data);
			// Initialize linked emails list
			const emailsInit = (data.emails || []).map((e) => ({
				id: (e as { id: string }).id,
				address: (e as { email: { address: string } }).email.address
			})) as Array<{ id: string; address: string }>;
			setLinkedEmails(emailsInit);
			// Load linked properties
			try {
				const { data: edges } = await supabase
					.from('entity_edges')
					.select('target_id')
					.eq('source_type', 'person')
					.eq('source_id', id)
					.eq('target_type', 'property');
				const propIds =
					(edges as Array<{ target_id: string }> | null | undefined)?.map((e) => e.target_id) ?? [];
				if (propIds.length) {
					const { data: props } = await supabase
						.from('properties')
						.select('id,address_full')
						.in('id', propIds);
					const typedProps =
						(props as Array<{ id: string; address_full: string | null }> | null | undefined) ?? [];
					setLinkedProps(typedProps.map((p) => ({ id: p.id, address_full: p.address_full })));
				} else {
					setLinkedProps([]);
				}
			} catch (err) {
				console.error('Failed to load linked properties', err);
			}
			// Load linked social profiles
			try {
				const { data: edges, error: edgeErr } = await supabase
					.from('entity_edges')
					.select('id, target_id, transform_type, confidence_score, source_api, source_url, retrieved_at')
					.eq('source_type', 'person')
					.eq('source_id', id)
					.eq('target_type', 'social_profile');
				if (edgeErr) throw edgeErr;

				const profileIds = (edges ?? []).map((e) => e.target_id);
				if (profileIds.length) {
					const { data: profiles, error: profileErr } = await supabase
						.from('social_profiles')
						.select('id, platform, handle, profile_url')
						.in('id', profileIds);
					if (profileErr) throw profileErr;

					const mappedProfiles: Array<{ id: string; platform: string; handle: string; url: string | null }> = (profiles ?? []).map((p) => {
						return {
							id: p.id as string,
							platform: p.platform as string,
							handle: p.handle as string,
							url: (p.profile_url as string | null) ?? null
						};
					});
					setLinkedProfiles(mappedProfiles);
				} else {
					setLinkedProfiles([]);
				}
			} catch (err) {
				console.error('Failed to load linked social profiles', err);
			}
			// Load linked phones
			try {
				const { data: phoneEdgeRows, error: phoneEdgeErr } = await supabase
					.from('entity_edges')
					.select('target_id')
					.eq('source_type', 'person')
					.eq('source_id', id)
					.eq('target_type', 'phone');
				if (phoneEdgeErr) throw phoneEdgeErr;
				const phoneIds = (phoneEdgeRows ?? []).map((e) => (e as { target_id: string }).target_id);
				if (phoneIds.length > 0) {
					const { data: phoneRows, error: phoneErr } = await supabase
						.from('phones')
						.select('id, number_e164')
						.in('id', phoneIds);
					if (phoneErr) throw phoneErr;
					const mapped = (phoneRows ?? []).map((p) => ({
						id: (p as { id: string }).id,
						number_e164: (p as { number_e164: string }).number_e164
					}));
					setLinkedPhones(mapped);
				} else {
					setLinkedPhones([]);
				}
			} catch (err) {
				console.error('Failed to load linked phones', err);
				setLinkedPhones([]);
			}
			// Load linked images (image -> person)
			try {
				const { data: imgEdges, error: imgEdgeErr } = await supabase
					.from('entity_edges')
					.select('source_id')
					.eq('target_type', 'person')
					.eq('target_id', id)
					.eq('source_type', 'image');
				if (imgEdgeErr) throw imgEdgeErr;
				const imageIds = (imgEdges ?? []).map((e) => (e as { source_id: string }).source_id);
				if (imageIds.length > 0) {
					const { data: imgRows, error: imgErr } = await supabase.from('images').select('id, url').in('id', imageIds);
					if (imgErr) throw imgErr;
					setLinkedImages(
						(imgRows ?? []).map((r) => ({
							id: (r as { id: string }).id,
							url: (r as { url: string }).url
						}))
					);
				} else {
					setLinkedImages([]);
				}
			} catch (err) {
				console.error('Failed to load linked images', err);
				setLinkedImages([]);
			}
		})();
		return () => {
			active = false;
		};
	}, [id, setTitle]);

	if (!row) return <AuthLoading state={AuthLoadingState.LOADING} />;

	const nameParts = normalizePersonName(row.name);
	const displayName = formatPersonName(nameParts);

	const set = (updater: (cur: PersonRecord) => PersonRecord) =>
		setRow((cur) => (cur ? updater(cur) : cur));

	const updateNameParts = (
		changes: Partial<{
			first: string;
			last: string;
			middle: string | null;
			prefix: string | null;
			suffix: string | null;
		}>
	) => {
		set((cur) => {
			if (!cur) return cur;
			const current = normalizePersonName(cur.name);
			return {
				...cur,
				name: buildPersonName({
					first: changes.first ?? current.first,
					last: changes.last ?? current.last,
					middle: changes.middle !== undefined ? changes.middle : (current.middle ?? null),
					prefix: changes.prefix !== undefined ? changes.prefix : (current.prefix ?? null),
					suffix: changes.suffix !== undefined ? changes.suffix : (current.suffix ?? null)
				})
			};
		});
	};

	const save = async () => {
		if (!row) return;

		try {
			const namePayload = buildPersonName({
				first: nameParts.first,
				last: nameParts.last,
				middle: nameParts.middle ?? null,
				prefix: nameParts.prefix ?? null,
				suffix: nameParts.suffix ?? null
			});

			const updated = await updatePerson(row.id, {
				name: namePayload,
				avatar: row.avatar,
				location: row.location || {},
				devices: row.devices,
				social_profiles: row.social_profiles,
				aliases: row.aliases || [],
				tags: row.tags,
				confidence: row.confidence ?? null,
				first_seen: row.first_seen ?? null,
				last_seen: row.last_seen ?? null
			});
			setRow(updated);
		} finally {
			// no-op
		}
	};

	// email draft helpers removed; email linking is managed via the dialog

	const onAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0] || null;
		setAvatarFile(f);
		if (f) {
			const url = URL.createObjectURL(f);
			setAvatarPreview(url);
		} else {
			setAvatarPreview(null);
		}
	};

	const uploadAvatar = async () => {
		if (!row) return;
		if (!avatarFile) {
			setAvatarOpen(false);
			return;
		}
		try {
			const fileExt = avatarFile.name.split('.').pop();
			const fileName = `${row.id}-${Date.now()}.${fileExt}`;
			const { error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(fileName, avatarFile, {
					upsert: true,
					cacheControl: '3600',
					contentType: avatarFile.type
				});
			if (uploadError) throw uploadError;
			const {
				data: { publicUrl }
			} = supabase.storage.from('avatars').getPublicUrl(fileName);
			const updated = await updatePerson(row.id, { avatar: publicUrl });
			setRow(updated);
			setAvatarOpen(false);
			setAvatarFile(null);
			setAvatarPreview(null);
		} catch (e) {
			console.error('Avatar upload failed', e);
		}
	};

	return (
		<div>
			<PageMeta title={displayName} description="Person" noIndex />
			<div className="mx-auto max-w-7xl space-y-6 p-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="mb-2 text-2xl font-semibold">Person</h1>
						<p className="text-muted-foreground text-sm">{displayName}</p>
					</div>
					<div className="flex items-center gap-2">
						<Button size="sm" variant="outline" onClick={() => window.history.length > 1 ? window.history.back() : (location.href = '/people')}>
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

				<div className="space-y-4">
					<ComponentCard>
						<div className="mb-3 flex items-center justify-between">
							<h3 className="text-lg font-semibold">Details</h3>
							<Button size="sm" variant="outline" onClick={() => setEditDetailsOpen(true)}>
								<Pencil className="size-4" />
							</Button>
						</div>
						<div className="space-y-3">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div>
									<div className="text-sm text-gray-600">Type</div>
									<div className="font-medium capitalize">Person</div>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<div>
									<div className="text-sm text-gray-600">First name</div>
									<div className="font-medium">{nameParts.first || '-'}</div>
								</div>
								<div>
									<div className="text-sm text-gray-600">Middle name</div>
									<div className="font-medium">{nameParts.middle || '-'}</div>
								</div>
								<div>
									<div className="text-sm text-gray-600">Last name</div>
									<div className="font-medium">{nameParts.last || '-'}</div>
								</div>
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div>
									<div className="text-sm text-gray-600">Prefix</div>
									<div className="font-medium">{nameParts.prefix || '-'}</div>
								</div>
								<div>
									<div className="text-sm text-gray-600">Suffix</div>
									<div className="font-medium">{nameParts.suffix || '-'}</div>
								</div>
							</div>

							<div>
								<div className="mb-2 text-sm text-gray-600">Avatar</div>
								<UserAvatar
									user={{
										name: displayName,
										avatar: row.avatar || null
									}}
									size="lg"
								/>
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div>
									<div className="text-sm text-gray-600">First seen</div>
									<div className="font-medium">
										{row.first_seen ? new Date(row.first_seen).toLocaleString() : '-'}
									</div>
								</div>
								<div>
									<div className="text-sm text-gray-600">Last seen</div>
									<div className="font-medium">
										{row.last_seen ? new Date(row.last_seen).toLocaleString() : '-'}
									</div>
								</div>
							</div>
						</div>
					</ComponentCard>

					<ComponentCard>
						<div className="mb-3 flex items-center justify-between">
							<h3 className="text-lg font-semibold">Aliases</h3>
							<Button size="sm" variant="outline" onClick={() => setEditAliasesOpen(true)}>
								<Pencil className="size-4" />
							</Button>
						</div>
						<div className="flex flex-wrap gap-2">
							{(row.aliases || []).map((a, i) => (
								<span key={a + i} className="rounded border px-2 py-1 text-sm">
									{a}
								</span>
							))}
						</div>
					</ComponentCard>

					<ComponentCard>
						<div className="mb-3 flex items-center justify-between">
							<h3 className="text-lg font-semibold">Tags</h3>
							<Button size="sm" variant="outline" onClick={() => setEditTagsOpen(true)}>
								<Pencil className="size-4" />
							</Button>
						</div>
						<div className="flex flex-wrap gap-2">
							{(row.tags || []).map((t, i) => (
								<span key={t + i} className="rounded border px-2 py-1 text-sm">
									#{t}
								</span>
							))}
							{(!row.tags || row.tags.length === 0) && (
								<span className="text-sm text-gray-500">No tags</span>
							)}
						</div>
					</ComponentCard>

					{/* <ComponentCard>
						<h3 className="text-lg font-semibold">Devices</h3>
						<div className="space-y-1">
							{(row.devices || []).map((d, i) => (
								<div key={i} className="text-sm">
									{d.type} — {d.os} {d.last_used ? `(${d.last_used})` : ''}
								</div>
							))}
						</div>
					</ComponentCard> */}

					<LinkedPhonesCard
						title="Phones"
						displayName={displayName}
						ownerId={row.id}
						organizationId={row.organization_id!}
						items={linkedPhones.map((p) => ({
							id: p.id,
							number_e164: p.number_e164,
							linkTo: `/phones/${p.id}`
						}))}
						onUnlink={async (phoneId) => {
							await removePhoneFromPerson(row!.id, phoneId);
							setLinkedPhones((prev) => prev.filter((x) => x.id !== phoneId));
							toast.success('Phone unlinked');
						}}
						onAttached={(p) => {
							setLinkedPhones((prev) => {
								const map = new Map(prev.map((x) => [x.id, x]));
								map.set(p.id, { id: p.id, number_e164: p.number_e164 });
								return Array.from(map.values());
							});
						}}
					/>

					<LinkedProfilesCard
						title="Social Profiles"
						displayName={displayName}
						ownerId={row.id}
						organizationId={row.organization_id!}
						items={linkedProfiles.map((p) => ({
							id: p.id,
							platform: p.platform,
							handle: p.handle,
							url: p.url,
							linkTo: `/profiles/${p.id}`
						}))}
						onUnlink={async (profileId) => {
							await removeProfileFromPerson(row!.id, profileId);
							setLinkedProfiles((prev) => prev.filter((x) => x.id !== profileId));
							toast.success('Profile unlinked');
						}}
						onAttached={(p) => {
							setLinkedProfiles((prev) => {
								const map = new Map(prev.map((x) => [x.id, x]));
								map.set(p.id, { id: p.id, platform: p.platform, handle: p.handle, url: p.url ?? null });
								return Array.from(map.values());
							});
						}}
					/>

					{/* Linked Images */}
					<LinkedImagesCard
						title="Images"
						displayName={displayName}
						ownerId={row.id}
						organizationId={row.organization_id!}
						ownerType="person"
						items={linkedImages.map((im) => ({ id: im.id, url: im.url, linkTo: `/images/${im.id}` }))}
						onUnlink={async (imageId) => {
							await detachImageFromPerson(imageId, row.id);
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
					<LinkedDocumentsCard
						title="Documents"
						displayName={displayName}
						ownerId={row.id}
						organizationId={row.organization_id!}
						ownerType="person"
						items={linkedDocuments.map((d) => ({ id: d.id, title: d.title, linkTo: `/documents/${d.id}` }))}
						onUnlink={async (documentId) => {
							await detachDocumentFromPerson(documentId, row.id);
							setLinkedDocuments((prev) => prev.filter((x) => x.id !== documentId));
							toast.success('Document unlinked');
						}}
						onAttached={(d) => {
							setLinkedDocuments((prev) => {
								const map = new Map(prev.map((x) => [x.id, x]));
								map.set(d.id, { id: d.id, title: d.title });
								return Array.from(map.values());
							});
						}}
					/>
					<EntityGraphCard title="Graph" rootType="person" rootId={row.id} />
				</div>
				<ComponentCard>
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-semibold">Properties</h3>
						<div className="flex items-center gap-2">
							{isActionEnabled(ActionKey.DiscoverProperties) ? (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button size="sm" variant="outline">
											<Zap className="size-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuLabel>Perform Action</DropdownMenuLabel>
										<div className="flex justify-between gap-2">
											<div>
												<DropdownMenuItem className="group flex cursor-pointer items-center justify-between gap-2">
													Discover properties{' '}
													<MapPin className="invisible mr-2 size-3 text-gray-500 transition-all duration-200 group-hover:visible group-hover:translate-x-1" />
												</DropdownMenuItem>
											</div>
											<div className="w-20">
												<DropdownMenuItem disabled>
													<span className="border-l pl-3 text-sm text-gray-500">
														{getActionCost(ActionKey.DiscoverProperties)} <Coins className="ml-0.5 inline-block size-3" />
													</span>
												</DropdownMenuItem>
											</div>
										</div>
										<DropdownMenuSeparator />
										<DropdownMenuItem disabled>Actions will run for "{displayName}"</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							) : null}
							<Button size="sm" variant="outline" onClick={() => setManagePropsOpen(true)}>
								<Pencil className="size-4" />
							</Button>
						</div>
					</div>
					<div className="space-y-3">
						{linkedProps.length === 0 ? (
							<p className="text-muted-foreground text-sm">No properties linked.</p>
						) : (
							linkedProps.map((p) => (
								<div key={p.id} className="flex items-center justify-between rounded-lg border p-4">
									<Link
										to={`/properties/${p.id}`}
										className="group text-base font-medium text-blue-600 hover:underline"
									>
										{p.address_full || p.id}{' '}
										<ArrowRight className="invisible inline-block size-4 text-blue-600 transition-all duration-200 group-hover:visible group-hover:translate-x-1" />
									</Link>
									<Tooltip tooltipPosition="top" content="Unlink property">
										<Button
											size="sm"
											variant="ghost"
											onClick={async () => {
												await removePropertyFromPerson(p.id, row!.id);
												setLinkedProps((prev) => prev.filter((x) => x.id !== p.id));
												toast.success('Property unlinked');
											}}
										>
											<Link2Off className="size-4" />
										</Button>
									</Tooltip>
								</div>
							))
						)}
					</div>
				</ComponentCard>

				<LinkedEmailsCard
					title="Emails"
					displayName={displayName}
					ownerType="person"
					ownerId={row.id}
					organizationId={row.organization_id!}
					items={linkedEmails.map((e) => ({
						id: e.id,
						address: e.address,
						domain: e.address.includes('@') ? e.address.split('@')[1] ?? null : null,
						linkTo: `/emails/${e.id}`
					}))}
					onUnlink={async (emailId) => {
						await removeEmailFromPerson(row!.id, emailId);
						setLinkedEmails((prev) => prev.filter((x) => x.id !== emailId));
						toast.success('Email unlinked');
					}}
					onAttached={async () => {
						const refreshed = await listPersonEmails(row!.id);
						setLinkedEmails(refreshed.map((x) => ({ id: x.id, address: x.email.address })));
					}}
				/>

				<div className="mx-auto mt-6 max-w-7xl">
					<CaseWebMentions
						entity={{ id: row.id, type: 'person', name: displayName }}
						allowManage={true}
						showActions={true}
						onSearchWebMentions={() =>
							handleSearchWebMentions('person', row.id, formatPersonName(row.name))
						}
					/>
				</div>
			</div>
			{/* Manage Properties Dialog (rendered globally like EmailDetail Manage leaks) */}
			<Dialog open={managePropsOpen} onOpenChange={setManagePropsOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Manage properties</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<Input
									placeholder="Search address…"
									value={propQuery}
									onChange={async (e) => {
										const v = e.target.value;
										setPropQuery(v);
										if (!row?.organization_id || v.trim().length < 2) {
											setPropResults([]);
											return;
										}
										setPropLoading(true);
										try {
											const { results } = await listProperties(row.organization_id, v, 1, 10);
											setPropResults(results);
										} finally {
											setPropLoading(false);
										}
									}}
								/>
							</div>
							<div className="max-h-72 space-y-2 overflow-auto">
								{propLoading ? (
									<div className="text-muted-foreground text-sm">Searching…</div>
								) : (
									propResults.map((p) => (
										<div
											key={p.id}
											className="flex items-center justify-between rounded border p-3"
										>
											<div className="text-sm font-medium">{p.address_full || p.id}</div>
											<Button
												size="sm"
												variant="outline"
												onClick={async () => {
													await attachPropertyToPerson(p.id, row!.id);
													setLinkedProps((prev) =>
														Array.from(
															new Map(
																[...prev, { id: p.id, address_full: p.address_full }].map((x) => [
																	x.id,
																	x
																])
															)
														).map(([, v]) => v)
													);
													toast.success('Property linked');
												}}
											>
												Attach
											</Button>
										</div>
									))
								)}
							</div>
							<div className="space-y-2">
								<div className="text-sm font-medium">Currently linked</div>
								<div className="space-y-2">
									{linkedProps.map((p) => (
										<div
											key={p.id}
											className="flex items-center justify-between rounded border p-3"
										>
											<Link
												to={`/properties/${p.id}`}
												className="text-sm font-medium hover:underline"
											>
												{p.address_full || p.id}
											</Link>
											<Button
												size="sm"
												variant="ghost"
												onClick={async () => {
													await removePropertyFromPerson(p.id, row!.id);
													setLinkedProps((prev) => prev.filter((x) => x.id !== p.id));
													toast.success('Property unlinked');
												}}
											>
												Unlink
											</Button>
										</div>
									))}
								</div>
							</div>
						</div>
						<div className="space-y-3">
							<div className="space-y-2">
								<label className="text-sm font-medium">Create new property</label>
								<Input
									placeholder="Full address"
									value={newPropAddress}
									onChange={(e) => setNewPropAddress(e.target.value)}
								/>
								<div className="bg-muted/40 text-muted-foreground rounded-md border border-dashed p-3 text-xs">
									This property will be created and automatically linked to{' '}
									<span className="text-foreground font-medium">{displayName}</span>.
								</div>
							</div>
							<Button
								onClick={async () => {
									if (!row?.organization_id || !newPropAddress.trim()) {
										toast.error('Address is required.');
										return;
									}
									setCreatingProp(true);
									try {
										const created = await createProperty({
											organization_id: row.organization_id,
											address_full: newPropAddress.trim()
										});
										await attachPropertyToPerson(created.id, row.id);
										setLinkedProps((prev) =>
											Array.from(
												new Map(
													[...prev, { id: created.id, address_full: created.address_full }].map(
														(x) => [x.id, x]
													)
												)
											).map(([, v]) => v)
										);
										toast.success('Property created and linked.');
										setManagePropsOpen(false);
										setPropQuery('');
										setNewPropAddress('');
									} catch (err) {
										console.error(err);
										toast.error('Failed to create property.');
									} finally {
										setCreatingProp(false);
									}
								}}
								disabled={creatingProp}
							>
								{creatingProp ? 'Creating…' : 'Create property'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit Details Dialog */}
			<Dialog open={editDetailsOpen} onOpenChange={setEditDetailsOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Edit details</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							<div>
								<label className="text-sm font-medium">First name</label>
								<Input
									value={nameParts.first}
									onChange={(e) => updateNameParts({ first: e.target.value })}
								/>
							</div>
							<div>
								<label className="text-sm font-medium">Middle name</label>
								<Input
									value={nameParts.middle ?? ''}
									onChange={(e) =>
										updateNameParts({ middle: e.target.value ? e.target.value : null })
									}
								/>
							</div>
							<div>
								<label className="text-sm font-medium">Last name</label>
								<Input
									value={nameParts.last}
									onChange={(e) => updateNameParts({ last: e.target.value })}
								/>
							</div>
							<div>
								<label className="text-sm font-medium">Prefix</label>
								<Input
									value={nameParts.prefix ?? ''}
									onChange={(e) =>
										updateNameParts({ prefix: e.target.value ? e.target.value : null })
									}
								/>
							</div>
							<div>
								<label className="text-sm font-medium">Suffix</label>
								<Input
									value={nameParts.suffix ?? ''}
									onChange={(e) =>
										updateNameParts({ suffix: e.target.value ? e.target.value : null })
									}
								/>
							</div>
						</div>
						<div>
							<label className="text-sm font-medium">Avatar</label>
							<div className="mt-1">
								<Button size="sm" variant="outline" onClick={() => setAvatarOpen(true)}>
									Change image
								</Button>
							</div>
						</div>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">First seen</label>
								<Input
									type="datetime-local"
									value={(row.first_seen || '').slice(0, 16)}
									onChange={(e) => set((cur) => ({ ...cur!, first_seen: e.target.value }))}
								/>
							</div>
							<div>
								<label className="text-sm font-medium">Last seen</label>
								<Input
									type="datetime-local"
									value={(row.last_seen || '').slice(0, 16)}
									onChange={(e) => set((cur) => ({ ...cur!, last_seen: e.target.value }))}
								/>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setEditDetailsOpen(false)}>
								Cancel
							</Button>
							<Button
								onClick={async () => {
									await save();
									setEditDetailsOpen(false);
								}}
							>
								Save
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit Aliases Dialog */}
			<Dialog open={editAliasesOpen} onOpenChange={setEditAliasesOpen}>
				<DialogContent className="max-w-xl">
					<DialogHeader>
						<DialogTitle>Edit aliases</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						<div className="flex flex-wrap gap-2">
							{(row.aliases || []).map((a, i) => (
								<span
									key={a + i}
									className="flex items-center gap-2 rounded-lg border px-2 py-1 text-sm"
								>
									{a}
									<button
										onClick={() =>
											set((cur) => {
												const next = (cur.aliases || []).filter((x, idx) => idx !== i);
												return { ...cur!, aliases: next } as PersonRecord;
											})
										}
									>
										×
									</button>
								</span>
							))}
						</div>
						<div className="mt-2 flex max-w-md items-center gap-2">
							<Input
								placeholder="Add alias..."
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										const target = e.target as HTMLInputElement;
										const v = target.value.trim().replace(/\s+/g, ' ');
										if (!v) return;
										set((cur) => {
											const next = Array.from(new Set([...(cur.aliases || []), v]));
											return { ...cur!, aliases: next } as PersonRecord;
										});
										target.value = '';
									}
								}}
							/>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => setEditAliasesOpen(false)}>
								Close
							</Button>
							<Button
								onClick={async () => {
									await updatePerson(row!.id, { aliases: row!.aliases });
									setEditAliasesOpen(false);
									toast.success('Aliases updated.');
								}}
							>
								Save
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit Tags Dialog */}
			<Dialog open={editTagsOpen} onOpenChange={setEditTagsOpen}>
				<DialogContent className="max-w-xl">
					<DialogHeader>
						<DialogTitle>Edit tags</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						<div className="flex flex-wrap gap-2">
							{(row.tags || []).map((t, i) => (
								<span
									key={t + i}
									className="flex items-center gap-2 rounded-lg border px-2 py-1 text-sm"
								>
									#{t}
									<button
										onClick={() =>
											set((cur) => {
												const next = (cur.tags || []).filter((x, idx) => idx !== i);
												return { ...cur!, tags: next } as PersonRecord;
											})
										}
									>
										×
									</button>
								</span>
							))}
						</div>
						<div className="mt-2 flex max-w-md items-center gap-2">
							<Input
								placeholder="Add tag..."
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										const target = e.target as HTMLInputElement;
										const v = target.value.trim().replace(/\s+/g, '-').toLowerCase();
										if (!v) return;
										set((cur) => {
											const uniq = new Set([...(cur.tags || []), v]);
											return { ...cur!, tags: Array.from(uniq) } as PersonRecord;
										});
										target.value = '';
									}
								}}
							/>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => setEditTagsOpen(false)}>
								Close
							</Button>
							<Button
								onClick={async () => {
									await updatePerson(row!.id, { tags: row!.tags });
									setEditTagsOpen(false);
									toast.success('Tags updated.');
								}}
							>
								Save
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
			{/* Emails managed inside LinkedEmailsCard */}

			<Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change subject image</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col items-center space-y-4">
						<div className="relative">
							{avatarPreview || row.avatar ? (
								<img
									src={avatarPreview || row.avatar || ''}
									alt="preview"
									className="h-32 w-32 rounded-full border object-cover"
								/>
							) : (
								<div className="flex h-32 w-32 items-center justify-center rounded-full border text-sm text-gray-500">
									No image
								</div>
							)}
						</div>
						<input
							type="file"
							accept="image/*"
							onChange={onAvatarFileChange}
							ref={fileInputRef}
							className="hidden"
							id="subject-avatar-upload"
						/>
						<label
							htmlFor="subject-avatar-upload"
							className="cursor-pointer rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
						>
							{avatarPreview ? 'Choose different' : 'Choose image'}
						</label>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAvatarOpen(false)}>
							Cancel
						</Button>
						<Button onClick={uploadAvatar} disabled={!avatarFile}>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertHeader>
						<AlertDialogTitle>Delete person?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete this person and its direct edges. This action cannot be undone.
						</AlertDialogDescription>
					</AlertHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={deleting}
							onClick={async () => {
								setDeleting(true);
								try {
									await deletePerson(id);
									toast.success('Person deleted.');
									window.location.href = '/people';
								} catch (e) {
									console.error(e);
									toast.error('Failed to delete person.');
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
		</div>
	);
}

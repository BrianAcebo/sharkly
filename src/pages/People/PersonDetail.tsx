import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { AuthLoadingState } from '../../contexts/AuthContext';
import { AuthLoading } from '../../components/AuthLoading';
import { updatePerson, getPersonById, discoverEmailsForPerson } from '../../api/people';
import type { PersonRecord } from '../../types/person';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Separator } from '../../components/ui/separator';
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
import { Trash, Plus, Pencil, Zap, Coins, MapPin, Phone, Users, FileText, Building2, Mail, Search } from 'lucide-react';
import CaseWebMentions from '../../components/cases/CaseWebMentions';
import { buildPersonName, formatPersonName, normalizePersonName } from '../../utils/person';
import type { EmailRecord } from '../../types/email';
import type { SocialProfileRecord } from '../../types/social';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '../../components/ui/command';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';

const SOCIAL_PRESETS = [
	{ label: 'LinkedIn', platform: 'linkedin', urlPrefix: 'https://www.linkedin.com/in/' },
	{ label: 'Twitter / X', platform: 'twitter', urlPrefix: 'https://twitter.com/' },
	{ label: 'Instagram', platform: 'instagram', urlPrefix: 'https://www.instagram.com/' },
	{ label: 'Facebook', platform: 'facebook', urlPrefix: 'https://www.facebook.com/' },
	{ label: 'GitHub', platform: 'github', urlPrefix: 'https://github.com/' },
	{ label: 'Custom', platform: 'custom', urlPrefix: '' }
] as const;

const DEVICE_PRESETS = [
	{ label: 'Custom', type: '', os: '' },
	{ label: 'iPhone', type: 'phone', os: 'iOS' },
	{ label: 'Android Phone', type: 'phone', os: 'Android' },
	{ label: 'Mac', type: 'computer', os: 'macOS' },
	{ label: 'Windows PC', type: 'computer', os: 'Windows' },
	{ label: 'Linux PC', type: 'computer', os: 'Linux' },
	{ label: 'iPad', type: 'tablet', os: 'iPadOS' }
] as const;

const createBlankEmailDraft = (): EmailRecord => ({
	email: {
		address: '',
		domain: null,
		first_seen: null
	},
	leaks: [],
	profiles: []
});

export default function PersonDetail() {
	const params = useParams();
	const id = params.id as string;
	const [row, setRow] = useState<PersonRecord | null>(null);
	const [editMode, setEditMode] = useState(false);
	const [saving, setSaving] = useState(false);
	const [avatarOpen, setAvatarOpen] = useState(false);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { setTitle, setReturnTo } = useBreadcrumbs();
	const [emailDrafts, setEmailDrafts] = useState<EmailRecord[]>([createBlankEmailDraft()]);
	const [emailDiscoverLoading, setEmailDiscoverLoading] = useState(false);
	const [discoverResults, setDiscoverResults] = useState<EmailRecord[]>([]);

	const resetEmailDrafts = useCallback((source: PersonRecord | null) => {
		if (!source || !Array.isArray(source.emails) || source.emails.length === 0) {
			setEmailDrafts([createBlankEmailDraft()]);
			return;
		}

		setEmailDrafts(
			source.emails.map((email) => ({
				id: email.id,
				organization_id: email.organization_id,
				email: {
					address: email.email.address,
					domain: email.email.domain ?? null,
					first_seen: email.email.first_seen ?? null
				},
				leaks: email.leaks ?? [],
				profiles: email.profiles ?? []
			}))
		);
	}, []);

	useEffect(() => {
		setReturnTo({ path: '/people', label: 'People' });
	}, [setReturnTo]);

	useEffect(() => {
		let active = true;
		(async () => {
			const data = await getPersonById(id);
			if (!active) return;
			setRow(data);
			resetEmailDrafts(data);
			setTitle(formatPersonName(data.name));
		})();
		return () => {
			active = false;
		};
	}, [id, resetEmailDrafts, setTitle]);

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
		setSaving(true);
		try {
			const namePayload = buildPersonName({
				first: nameParts.first,
				last: nameParts.last,
				middle: nameParts.middle ?? null,
				prefix: nameParts.prefix ?? null,
				suffix: nameParts.suffix ?? null
			});

			const emailsPayload = emailDrafts.reduce<EmailRecord[]>((acc, entry) => {
				const address = entry.email.address.trim();
				if (!address) return acc;
				const existing = row.emails.find((email) => email.id === entry.id);
				acc.push({
					id: entry.id,
					organization_id:
						entry.organization_id ?? existing?.organization_id ?? row.organization_id,
					email: {
						address,
						domain: entry.email.domain
							? entry.email.domain.trim() || null
							: (existing?.email.domain ?? null),
						first_seen: entry.email.first_seen ?? existing?.email.first_seen ?? null
					},
					leaks: entry.leaks ?? existing?.leaks ?? [],
					profiles: entry.profiles ?? existing?.profiles ?? []
				});
				return acc;
			}, []);

			const updated = await updatePerson(row.id, {
				name: namePayload,
				emails: emailsPayload,
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
			resetEmailDrafts(updated);
			setEditMode(false);
		} finally {
			setSaving(false);
		}
	};

	const addEmailDraft = () => {
		setEmailDrafts((prev) => [...prev, createBlankEmailDraft()]);
	};

	const updateEmailDraft = (index: number, field: 'address' | 'domain', value: string) => {
		setEmailDrafts((prev) =>
			prev.map((entry, idx) => {
				if (idx !== index) return entry;

				if (field === 'address') {
					return {
						...entry,
						id: undefined,
						organization_id: undefined,
						email: {
							...entry.email,
							address: value
						}
					};
				}

				return {
					...entry,
					email: {
						...entry.email,
						domain: value.trim().length > 0 ? value : null
					}
				};
			})
		);
	};

	const removeEmailDraft = (index: number) => {
		setEmailDrafts((prev) => prev.filter((_, idx) => idx !== index));
	};

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

	const runEmailDiscovery = async () => {
		if (!row?.name.first || !row?.name.last) {
			toast.error('Person must have a first and last name to discover emails.');
			return;
		}
		setEmailDiscoverLoading(true);
		setDiscoverResults([]);
		try {
			const response = await discoverEmailsForPerson({
				firstName: row.name.first,
				lastName: row.name.last
			});
			const normalized = response.results
				.map((item) => item.address.trim())
				.filter((address, index, all) => address.length > 0 && all.indexOf(address) === index)
				.map((address) => ({
					email: {
						address,
						domain: address.includes('@') ? (address.split('@')[1] ?? null) : null,
						first_seen: null
					},
					leaks: [],
					profiles: []
				}));
			setDiscoverResults(normalized);
			if (normalized.length === 0) {
				toast.info('No emails found for this person.');
			} else {
				toast.success(`${normalized.length} emails discovered!`);
			}
		} catch (error) {
			console.error(error);
			toast.error(error instanceof Error ? error.message : 'Failed to discover emails.');
		} finally {
			setEmailDiscoverLoading(false);
		}
	};

	const handleSearchWebMentions = () => {
		if (!row) return;
		const query = formatPersonName(row.name);
		const params = new URLSearchParams({
			prefill: query,
			auto: '1',
			originType: 'person',
			originId: row.id
		});
		window.open(`/web-search?${params.toString()}`, '_blank', 'noopener,noreferrer');
	};

	return (
		<div>
			<PageMeta title={displayName} description="Person" noIndex />
			<div className="mx-auto max-w-5xl space-y-6 p-4">
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<h1 className="text-2xl font-semibold">{displayName}</h1>
					<div className="flex items-center gap-2">
						{!editMode ? (
							<>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button size="sm" variant="outline" disabled={emailDiscoverLoading}>
											{emailDiscoverLoading ? 'Running…' : <Zap className="size-4" />}
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuLabel>Perform Action</DropdownMenuLabel>
										<div className="flex justify-between gap-2">
											<div>
												<DropdownMenuItem
													className="cursor-pointer flex items-center justify-between gap-2 group"
													onClick={handleSearchWebMentions}
												>
													Search web mentions <Search className="size-3 mr-2 text-gray-500 group-hover:visible invisible group-hover:translate-x-1 transition-all duration-200" />
												</DropdownMenuItem>
												<DropdownMenuItem
													className="cursor-pointer flex items-center justify-between gap-2 group"
													onClick={() => {
														void runEmailDiscovery();
													}}
													disabled={emailDiscoverLoading}
												>
													Discover emails <Mail className="size-3 mr-2 text-gray-500 group-hover:visible invisible group-hover:translate-x-1 transition-all duration-200" />
												</DropdownMenuItem>
												<DropdownMenuItem className="cursor-pointer flex items-center justify-between gap-2 group">
													Discover properties <MapPin className="size-3 mr-2 text-gray-500 group-hover:visible invisible group-hover:translate-x-1 transition-all duration-200" />
												</DropdownMenuItem>
												<DropdownMenuItem className="cursor-pointer flex items-center justify-between gap-2 group">
													Discover phones <Phone className="size-3 mr-2 text-gray-500 group-hover:visible invisible group-hover:translate-x-1 transition-all duration-200" />
												</DropdownMenuItem>
												<DropdownMenuItem className="cursor-pointer flex items-center justify-between gap-2 group">
													Discover social profiles <Users className="size-3 mr-2 text-gray-500 group-hover:visible invisible group-hover:translate-x-1 transition-all duration-200" />
												</DropdownMenuItem>
												<DropdownMenuItem className="cursor-pointer flex items-center justify-between gap-2 group">
													Discover records <FileText className="size-3 mr-2 text-gray-500 group-hover:visible invisible group-hover:translate-x-1 transition-all duration-200" />
												</DropdownMenuItem>
												<DropdownMenuItem className="cursor-pointer flex items-center justify-between gap-2 group">
													Discover business relations <Building2 className="size-3 mr-2 text-gray-500 group-hover:visible invisible group-hover:translate-x-1 transition-all duration-200" />
												</DropdownMenuItem>
											</div>
											<div className="w-20">
												<DropdownMenuItem>
													<span className="border-l pl-3 text-sm text-gray-500">
														2 <Coins className="ml-0.5 inline-block size-3" />
													</span>
												</DropdownMenuItem>
												<DropdownMenuItem>
													<span className="border-l pl-3 text-sm text-gray-500">
														2 <Coins className="ml-0.5 inline-block size-3" />
													</span>
												</DropdownMenuItem>
												<DropdownMenuItem>
													<span className="border-l pl-3 text-sm text-gray-500">
														2 <Coins className="ml-0.5 inline-block size-3" />
													</span>
												</DropdownMenuItem>
												<DropdownMenuItem>
													<span className="border-l pl-3 text-sm text-gray-500">
														2 <Coins className="ml-0.5 inline-block size-3" />
													</span>
												</DropdownMenuItem>
												<DropdownMenuItem>
													<span className="border-l pl-3 text-sm text-gray-500">
														2 <Coins className="ml-0.5 inline-block size-3" />
													</span>
												</DropdownMenuItem>
												<DropdownMenuItem>
													<span className="border-l pl-3 text-sm text-gray-500">
														2 <Coins className="ml-0.5 inline-block size-3" />
													</span>
												</DropdownMenuItem>
												<DropdownMenuItem>
													<span className="border-l pl-3 text-sm text-gray-500">
														2 <Coins className="ml-0.5 inline-block size-3" />
													</span>
												</DropdownMenuItem>
											</div>
										</div>
										<DropdownMenuSeparator />
										<DropdownMenuItem disabled>
											Actions will run for "{displayName}"
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										resetEmailDrafts(row);
										setEditMode(true);
									}}
								>
									<Pencil className="size-4" />
								</Button>
							</>
						) : (
							<div className="flex items-center gap-2">
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										resetEmailDrafts(row);
										setEditMode(false);
									}}
								>
									Cancel
								</Button>
								<Button size="sm" onClick={save} disabled={saving}>
									{saving ? 'Saving...' : 'Save'}
								</Button>
							</div>
						)}
					</div>
				</div>

				{discoverResults.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Discovered Emails</CardTitle>
						</CardHeader>
						<CardContent>
							<ul className="space-y-2">
								{discoverResults.map((email, idx) => (
									<li
										key={email.email.address + idx}
										className="flex items-center justify-between rounded border p-2"
									>
										<span>{email.email.address}</span>
										<Button
											size="sm"
											variant="outline"
											onClick={() => setEmailDrafts((prev) => [...prev, email])}
										>
											Add as draft
										</Button>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				)}

				{!editMode ? (
					<div className="space-y-4">
						<div className="space-y-4 rounded-lg bg-white p-6 dark:bg-gray-900">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div>
									<div className="text-sm text-gray-600">Type</div>
									<div className="font-medium capitalize">Person</div>
								</div>
								<div>
									<div className="text-sm text-gray-600">Emails</div>
									<div className="space-y-1">
										{row.emails && row.emails.length > 0 ? (
											row.emails.map((email, idx) => (
												<Link
													to={`/emails/${email.id}`}
													key={email.email.address + idx}
													className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
												>
													{email.email.address}
												</Link>
											))
										) : (
											<div className="font-medium">-</div>
										)}
									</div>
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
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<div>
									<div className="text-sm text-gray-600">City</div>
									<div className="font-medium">{row.location?.city || '-'}</div>
								</div>
								<div>
									<div className="text-sm text-gray-600">Country</div>
									<div className="font-medium">{row.location?.country || '-'}</div>
								</div>
								<div>
									<div className="text-sm text-gray-600">IP</div>
									<div className="font-medium">{row.location?.ip || '-'}</div>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<div>
									<div className="text-sm text-gray-600">Confidence</div>
									<div className="font-medium">
										{typeof row.confidence === 'number'
											? `${Math.round(row.confidence * 100)}%`
											: '-'}
									</div>
								</div>
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

						<Separator />
						<div className="rounded-lg bg-white p-6 dark:bg-gray-900">
							<div className="text-base font-semibold">Aliases</div>
							<div className="mt-2 flex flex-wrap gap-2">
								{(row.aliases || []).map((a, i) => (
									<span key={a + i} className="rounded border px-2 py-1 text-sm">
										{a}
									</span>
								))}
							</div>
						</div>

						<div className="rounded-lg bg-white p-6 dark:bg-gray-900">
							<div className="text-base font-semibold">Tags</div>
							<div className="mt-2 flex flex-wrap gap-2">
								{(row.tags || []).map((t, i) => (
									<span key={t + i} className="rounded border px-2 py-1 text-sm">
										#{t}
									</span>
								))}
								{(!row.tags || row.tags.length === 0) && (
									<span className="text-sm text-gray-500">No tags</span>
								)}
							</div>
						</div>

						<Separator />
						<div className="rounded-lg bg-white p-6 dark:bg-gray-900">
							<div className="text-base font-semibold">Devices</div>
							<div className="space-y-1">
								{(row.devices || []).map((d, i) => (
									<div key={i} className="text-sm">
										{d.type} — {d.os} {d.last_used ? `(${d.last_used})` : ''}
									</div>
								))}
							</div>
						</div>

						<Separator />
						<div className="rounded-lg bg-white p-6 dark:bg-gray-900">
							<div className="text-base font-semibold">Social Profiles</div>
							<div className="space-y-1">
								{(row.social_profiles || []).map((s, i) => {
									const record = s as SocialProfileRecord;
									const profile = record.profile ?? {
										handle: '',
										platform: '',
										profile_url: ''
									};
									const platform = profile.platform ?? '';
									const username = profile.handle ?? '';
									const url = profile.profile_url ?? '';
									return (
										<div key={i} className="text-sm">
											{platform} — {username} {url ? `(${url})` : ''}
										</div>
									);
								})}
							</div>
						</div>
					</div>
				) : (
					<div className="space-y-10">
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
								<div>
									<label className="text-sm font-medium">Avatar</label>
									<div className="mt-1">
										<Button size="sm" variant="outline" onClick={() => setAvatarOpen(true)}>
											Change image
										</Button>
									</div>
								</div>
								<div className="md:col-span-3">
									<label className="text-sm font-medium">Emails</label>
									<div className="mt-2 space-y-2">
										{emailDrafts.length === 0 && (
											<p className="text-xs text-gray-500">No emails yet.</p>
										)}
										{emailDrafts.map((email, idx) => (
											<div
												key={`email-${idx}`}
												className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3"
											>
												<div className="flex-1">
													<Input
														placeholder="Email address"
														value={email.email.address}
														onChange={(e) => updateEmailDraft(idx, 'address', e.target.value)}
													/>
												</div>
												<div className="flex-1">
													<Input
														placeholder="Domain (optional)"
														value={email.email.domain ?? ''}
														onChange={(e) => updateEmailDraft(idx, 'domain', e.target.value)}
													/>
												</div>
												<div className="flex items-center gap-2">
													{email.id ? (
														<Link to={`/emails/${email.id}`}>
															<Button variant="outline" size="sm">
																View
															</Button>
														</Link>
													) : null}
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={() => removeEmailDraft(idx)}
														className="text-red-500 hover:text-red-600"
													>
														<Trash className="h-4 w-4" />
													</Button>
												</div>
											</div>
										))}
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={addEmailDraft}
											className="gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
										>
											<Plus className="h-4 w-4" />
											Add email
										</Button>
									</div>
								</div>
								<div>
									<label className="text-sm font-medium">Confidence (0–1)</label>
									<Input
										type="number"
										step="0.01"
										min={0}
										max={1}
										value={typeof row.confidence === 'number' ? row.confidence : ''}
										onChange={(e) => {
											const v = e.target.value;
											const num = v === '' ? null : Math.max(0, Math.min(1, Number(v)));
											set(
												(cur) =>
													({
														...cur!,
														confidence: Number.isNaN(num as number) ? null : (num as number | null)
													}) as PersonRecord
											);
										}}
									/>
								</div>
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
							<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
								<div>
									<label className="text-sm font-medium">City</label>
									<Input
										value={row.location?.city || ''}
										onChange={(e) =>
											set((cur) => ({
												...cur!,
												location: { ...cur!.location, city: e.target.value }
											}))
										}
									/>
								</div>
								<div>
									<label className="text-sm font-medium">Country</label>
									<Input
										value={row.location?.country || ''}
										onChange={(e) =>
											set((cur) => ({
												...cur!,
												location: { ...cur!.location, country: e.target.value }
											}))
										}
									/>
								</div>
								<div>
									<label className="text-sm font-medium">IP</label>
									<Input
										value={row.location?.ip || ''}
										onChange={(e) =>
											set((cur) => ({
												...cur!,
												location: { ...cur!.location, ip: e.target.value }
											}))
										}
									/>
								</div>
							</div>
						</div>

						<Separator />
						<div className="space-y-2">
							<div className="text-base font-semibold">Aliases</div>
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
						</div>

						<Separator />
						<div className="space-y-2">
							<div className="text-base font-semibold">Tags</div>
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
						</div>

						<Separator />
					<div className="mx-auto mt-6 max-w-5xl">
						<CaseWebMentions personId={row.id} allowManage />
						</div>

						<Separator />

						<div className="space-y-6">
							<div className="mb-5 text-base font-semibold">Social Profiles</div>
							<div className="space-y-3">
								{(row.social_profiles || []).map((sp, idx) => (
									<div
										key={idx}
										className="grid grid-cols-1 items-end justify-center gap-2 md:grid-cols-4"
									>
										<div className="flex flex-col gap-2">
											<label className="text-sm font-medium">Platform: </label>
											<Input
												placeholder="Platform (e.g., linkedin)"
												value={sp.profile?.platform || ''}
												disabled={SOCIAL_PRESETS.some(
													(p) =>
														p.platform === (sp.profile?.platform || '') && p.platform !== 'custom'
												)}
												onChange={(e) =>
													set((cur) => {
														const arr = [...(cur.social_profiles || [])];
														const existing = arr[idx] || { profile: { handle: '', platform: '' } };
														arr[idx] = {
															...existing,
															profile: { ...existing.profile, platform: e.target.value }
														};
														return { ...cur!, social_profiles: arr } as PersonRecord;
													})
												}
											/>
										</div>
										<div className="flex flex-col gap-2">
											<label className="text-sm font-medium">Username: </label>
											<Input
												placeholder="Username"
												value={sp.profile?.handle || ''}
												onChange={(e) =>
													set((cur) => {
														const arr = [...(cur.social_profiles || [])];
														const newUsername = e.target.value
															.replace(/[^a-zA-Z0-9._-]/g, '')
															.replace(/^@+/, '');
														const existing = arr[idx] || { profile: { handle: '', platform: '' } };
														let newUrl = existing.profile?.profile_url || '';
														const preset = SOCIAL_PRESETS.find(
															(p) => p.platform === existing.profile?.platform
														);
														if (preset && preset.platform !== 'custom') {
															newUrl = `${preset.urlPrefix}${newUsername.replace(/^@/, '')}`;
														}
														arr[idx] = {
															...existing,
															profile: {
																...existing.profile,
																handle: newUsername,
																profile_url: newUrl
															}
														};
														return { ...cur!, social_profiles: arr } as PersonRecord;
													})
												}
											/>
										</div>
										<div className="flex flex-col gap-2">
											<label className="text-sm font-medium">URL: </label>
											<Input
												placeholder="URL"
												value={sp.profile?.profile_url || ''}
												disabled={SOCIAL_PRESETS.some(
													(p) =>
														p.platform === (sp.profile?.platform || '') && p.platform !== 'custom'
												)}
												onChange={(e) =>
													set((cur) => {
														const arr = [...(cur.social_profiles || [])];
														const existing = arr[idx] || { profile: { handle: '', platform: '' } };
														arr[idx] = {
															...existing,
															profile: { ...existing.profile, profile_url: e.target.value }
														};
														return { ...cur!, social_profiles: arr } as PersonRecord;
													})
												}
											/>
										</div>
										<Button
											size="sm"
											className="mr-0 ml-auto w-fit"
											variant="outline"
											onClick={() =>
												set((cur) => {
													const arr = [...(cur.social_profiles || [])];
													arr.splice(idx, 1);
													return { ...cur!, social_profiles: arr } as PersonRecord;
												})
											}
										>
											<Trash className="size-4" />
										</Button>
									</div>
								))}
							</div>

							<Popover>
								<PopoverTrigger asChild>
									<Button size="sm" variant="outline">
										Add social profile
									</Button>
								</PopoverTrigger>
								<PopoverContent className="p-0" align="start">
									<Command>
										<CommandInput placeholder="Search platforms" />
										<CommandList>
											<CommandEmpty>No platforms</CommandEmpty>
											<CommandGroup>
												{SOCIAL_PRESETS.map((p) => (
													<CommandItem
														key={p.label}
														onSelect={() => {
															set((cur) => {
																const arr = [...(cur.social_profiles || [])];
																if (p.platform === 'custom') {
																	arr.push({
																		profile: { handle: '', platform: '', profile_url: '' }
																	});
																} else {
																	arr.push({
																		profile: {
																			handle: '',
																			platform: p.platform,
																			profile_url: p.urlPrefix
																		}
																	});
																}
																return { ...cur!, social_profiles: arr } as PersonRecord;
															});
														}}
													>
														{p.label}
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</div>

						<Separator />

						<div className="space-y-6">
							<div className="text-base font-semibold">Devices</div>
							<div className="space-y-3">
								{(row.devices || []).map((dev, idx) => {
									const isCustomDev = !(dev.type && dev.os);
									return (
										<div
											key={idx}
											className="grid grid-cols-1 items-end justify-center gap-2 md:grid-cols-4"
										>
											<div className="flex flex-col gap-2">
												<label className="text-sm font-medium">Type: </label>
												<Input
													placeholder="Type"
													value={dev.type || ''}
													disabled={!isCustomDev}
													onChange={(e) =>
														set((cur) => {
															const arr = [...(cur.devices || [])];
															const value = e.target.value.replace(/[^a-zA-Z0-9\s._-]/g, '');
															const existing = arr[idx] || { type: '', os: '' };
															arr[idx] = { ...existing, type: value } as {
																type: string;
																os: string;
																last_used?: string;
															};
															return { ...cur!, devices: arr } as PersonRecord;
														})
													}
												/>
											</div>
											<div className="flex flex-col gap-2">
												<label className="text-sm font-medium">Operating System: </label>
												<Input
													placeholder="OS"
													value={dev.os || ''}
													disabled={!isCustomDev}
													onChange={(e) =>
														set((cur) => {
															const arr = [...(cur.devices || [])];
															const value = e.target.value.replace(/[^a-zA-Z0-9\s._-]/g, '');
															const existing = arr[idx] || { type: '', os: '' };
															arr[idx] = { ...existing, os: value } as {
																type: string;
																os: string;
																last_used?: string;
															};
															return { ...cur!, devices: arr } as PersonRecord;
														})
													}
												/>
											</div>
											<div className="flex flex-col gap-2">
												<label className="text-sm font-medium">Last used: </label>
												<Input
													type="datetime-local"
													placeholder="Last used"
													value={(dev.last_used || '').slice(0, 16)}
													onChange={(e) =>
														set((cur) => {
															const arr = [...(cur.devices || [])];
															const existing =
																arr[idx] ||
																({ type: '', os: '', last_used: '' } as {
																	type: string;
																	os: string;
																	last_used?: string;
																});
															arr[idx] = { ...existing, last_used: e.target.value } as {
																type: string;
																os: string;
																last_used?: string;
															};
															return { ...cur!, devices: arr } as PersonRecord;
														})
													}
												/>
											</div>
											<Button
												className="mr-0 ml-auto w-fit"
												size="sm"
												variant="outline"
												onClick={() =>
													set((cur) => {
														const arr = [...(cur.devices || [])];
														arr.splice(idx, 1);
														return { ...cur!, devices: arr } as PersonRecord;
													})
												}
											>
												<Trash className="size-4" />
											</Button>
										</div>
									);
								})}
							</div>

							<Popover>
								<PopoverTrigger asChild>
									<Button size="sm" variant="outline">
										Add device
									</Button>
								</PopoverTrigger>
								<PopoverContent className="p-0" align="start">
									<Command>
										<CommandInput placeholder="Search device presets" />
										<CommandList>
											<CommandEmpty>No presets</CommandEmpty>
											<CommandGroup>
												{DEVICE_PRESETS.map((p) => (
													<CommandItem
														key={p.label}
														onSelect={() =>
															set((cur) => ({
																...cur!,
																devices: [
																	...(cur.devices || []),
																	{ type: p.type, os: p.os, last_used: '' } as {
																		type: string;
																		os: string;
																		last_used?: string;
																	}
																]
															}))
														}
													>
														{p.label}
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</div>
					</div>
				)}
			</div>
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
		</div>
	);
}

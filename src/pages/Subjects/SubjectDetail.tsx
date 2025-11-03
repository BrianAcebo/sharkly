import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { AuthLoadingState } from '../../contexts/AuthContext';
import { AuthLoading } from '../../components/AuthLoading';
import { getSubjectById, updateSubject, type SubjectRecord } from '../../api/subjects';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
//
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '../../components/ui/select';
import { Separator } from '../../components/ui/separator';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { UserAvatar } from '../../components/common/UserAvatar';
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
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '../../components/ui/dialog';
import { supabase } from '../../utils/supabaseClient';
import { useRef } from 'react';
import { Trash } from 'lucide-react';

export default function SubjectDetail() {
	const params = useParams();
	const id = params.id as string;
	const [row, setRow] = useState<SubjectRecord | null>(null);
	const [editMode, setEditMode] = useState(false);
	const [saving, setSaving] = useState(false);
	const [avatarOpen, setAvatarOpen] = useState(false);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [profilePresetOpen, setProfilePresetOpen] = useState(false);
	const [profilePresetQuery, setProfilePresetQuery] = useState('');
	const { setTitle, setReturnTo } = useBreadcrumbs();

	useEffect(() => {
		setTitle(row?.name || '');
		setReturnTo({ path: '/subjects', label: 'Subjects' });
	}, [row, setTitle, setReturnTo]);

	useEffect(() => {
		let active = true;
		(async () => {
			const data = await getSubjectById(id);
			if (!active) return;
			setRow(data);
		})();
		return () => {
			active = false;
		};
	}, [id]);

	if (!row) return <AuthLoading state={AuthLoadingState.LOADING} />;

	const set = (updater: (cur: SubjectRecord) => SubjectRecord) =>
		setRow((cur) => (cur ? updater(cur) : cur));

	const save = async () => {
		if (!row) return;
		setSaving(true);
		try {
            const updated = await updateSubject(row.id, {
				type: row.type,
				name: row.name,
				email: row.email,
				avatar: row.avatar,
				location: row.location || {},
				devices: row.devices,
				social_profiles: row.social_profiles,
                aliases: row.aliases || [],
				tags: row.tags
			});
			setRow(updated);
			setEditMode(false);
		} finally {
			setSaving(false);
		}
	};

	// Preset social platforms
	const SOCIAL_PRESETS = [
		{ label: 'LinkedIn', platform: 'linkedin', urlPrefix: 'https://www.linkedin.com/in/' },
		{ label: 'Twitter/X', platform: 'twitter', urlPrefix: 'https://twitter.com/' },
		{ label: 'Instagram', platform: 'instagram', urlPrefix: 'https://www.instagram.com/' },
		{ label: 'Facebook', platform: 'facebook', urlPrefix: 'https://www.facebook.com/' },
		{ label: 'GitHub', platform: 'github', urlPrefix: 'https://github.com/' },
		{ label: 'Custom', platform: 'custom', urlPrefix: '' }
	];

	// Device presets are inlined in the picker below; keep here for future reuse if needed

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
			const updated = await updateSubject(row.id, { avatar: publicUrl });
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
			<PageMeta title={row.name} description="Subject" noIndex />
			<div className="mx-auto max-w-5xl space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-semibold">{row.name}</h1>
					{!editMode ? (
						<Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
							Edit
						</Button>
					) : (
						<div className="flex items-center gap-2">
							<Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
								Cancel
							</Button>
							<Button size="sm" onClick={save} disabled={saving}>
								{saving ? 'Saving...' : 'Save'}
							</Button>
						</div>
					)}
				</div>

				{!editMode ? (
					<div className="space-y-4">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<div className="text-sm text-gray-600">Type</div>
								<div className="font-medium capitalize">{row.type}</div>
							</div>
							<div>
								<div className="text-sm text-gray-600">Email</div>
								<div className="font-medium">{row.email || '-'}</div>
							</div>
						</div>

						<div>
							<div className="mb-2 text-sm text-gray-600">Avatar</div>
							<UserAvatar
								user={{
									name: row.name,
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

            <Separator />
						<div>
							<div className="text-base font-semibold">Aliases</div>
							<div className="mt-2 flex flex-wrap gap-2">
								{(row.aliases || []).map((a, i) => (
									<span key={a + i} className="rounded border px-2 py-1 text-sm">
										{a}
									</span>
								))}
							</div>
						</div>

						<Separator />
						<div>
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
						<div>
							<div className="text-base font-semibold">Social Profiles</div>
							<div className="space-y-1">
								{(row.social_profiles || []).map((s, i) => (
									<div key={i} className="text-sm">
										{s.platform} — {s.username} {s.url ? `(${s.url})` : ''}
									</div>
								))}
							</div>
						</div>
					</div>
				) : (
					<div className="space-y-10">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<label className="text-sm font-medium">Type</label>
								<Select
									value={row.type}
									onValueChange={(v) =>
										set((cur) => ({ ...cur!, type: v as 'person' | 'company' }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="person">Person</SelectItem>
										<SelectItem value="company">Company</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<label className="text-sm font-medium">Name</label>
								<Input
									value={row.name}
									onChange={(e) => set((cur) => ({ ...cur!, name: e.target.value }))}
								/>
							</div>
							<div>
								<label className="text-sm font-medium">Email</label>
								<Input
									value={row.email || ''}
									onChange={(e) => set((cur) => ({ ...cur!, email: e.target.value }))}
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
						</div>

						{/* Aliases editor */}
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
													return { ...cur!, aliases: next } as SubjectRecord;
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
												return { ...cur!, aliases: next } as SubjectRecord;
											});
											target.value = '';
										}
									}}
								/>
							</div>
						</div>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
										set((cur) => ({ ...cur!, location: { ...cur!.location, ip: e.target.value } }))
									}
								/>
							</div>
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
												value={sp.platform || ''}
												disabled={SOCIAL_PRESETS.some(
													(p) => p.platform === (sp.platform || '') && p.platform !== 'custom'
												)}
												onChange={(e) =>
													set((cur) => {
														const arr = [...(cur.social_profiles || [])];
														arr[idx] = { ...arr[idx], platform: e.target.value };
														return { ...cur!, social_profiles: arr };
													})
												}
											/>
										</div>
										<div className="flex flex-col gap-2">
											<label className="text-sm font-medium">Username: </label>
											<Input
												placeholder="Username"
												value={sp.username || ''}
												onChange={(e) =>
													set((cur) => {
														const arr = [...(cur.social_profiles || [])];
														// Sanitize username: allow only letters, numbers, dot, underscore, hyphen
														const newUsername = e.target.value
															.replace(/[^a-zA-Z0-9._-]/g, '')
															.replace(/^@+/, '');
														let newUrl = arr[idx]?.url || '';
														const preset = SOCIAL_PRESETS.find(
															(p) => p.platform === arr[idx]?.platform
														);
														if (preset && preset.platform !== 'custom') {
															newUrl = `${preset.urlPrefix}${newUsername.replace(/^@/, '')}`;
														}
														arr[idx] = { ...arr[idx], username: newUsername, url: newUrl };
														return { ...cur!, social_profiles: arr };
													})
												}
											/>
										</div>
										<div className="flex flex-col gap-2">
											<label className="text-sm font-medium">URL: </label>
											<Input
												placeholder="URL"
												value={sp.url || ''}
												disabled={SOCIAL_PRESETS.some(
													(p) => p.platform === (sp.platform || '') && p.platform !== 'custom'
												)}
												onChange={(e) =>
													set((cur) => {
														const arr = [...(cur.social_profiles || [])];
														arr[idx] = { ...arr[idx], url: e.target.value };
														return { ...cur!, social_profiles: arr };
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
													return { ...cur!, social_profiles: arr };
												})
											}
										>
											<Trash className="size-4" />
										</Button>
									</div>
								))}
							</div>

							<Popover open={profilePresetOpen} onOpenChange={setProfilePresetOpen}>
								<PopoverTrigger asChild>
									<Button size="sm" variant="outline" onClick={() => setProfilePresetOpen(true)}>
										Add social profile
									</Button>
								</PopoverTrigger>
								<PopoverContent className="p-0" align="start">
									<Command>
										<CommandInput
											placeholder="Search platforms"
											value={profilePresetQuery}
											onValueChange={setProfilePresetQuery}
										/>
										<CommandList>
											<CommandEmpty>No platforms</CommandEmpty>
											<CommandGroup>
												{SOCIAL_PRESETS.filter((p) =>
													profilePresetQuery
														? p.label.toLowerCase().includes(profilePresetQuery.toLowerCase())
														: true
												).map((p) => (
													<CommandItem
														key={p.label}
														onSelect={() => {
															set((cur) => {
																const arr = [...(cur.social_profiles || [])];
																if (p.platform === 'custom') {
																	arr.push({ platform: '', username: '', url: '' });
																} else {
																	arr.push({
																		platform: p.platform,
																		username: '',
																		url: p.urlPrefix
																	});
																}
																return { ...cur!, social_profiles: arr };
															});
															setProfilePresetQuery('');
															setProfilePresetOpen(false);
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
															return { ...cur!, devices: arr };
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
															return { ...cur!, devices: arr };
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
															return { ...cur!, devices: arr };
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
														const arr = [...(cur.devices || [])];
														arr.splice(idx, 1);
														return { ...cur!, devices: arr };
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
												{[
													{ label: 'Custom', type: '', os: '' },
													{ label: 'iPhone', type: 'phone', os: 'iOS' },
													{ label: 'Android Phone', type: 'phone', os: 'Android' },
													{ label: 'Mac', type: 'computer', os: 'macOS' },
													{ label: 'Windows PC', type: 'computer', os: 'Windows' },
													{ label: 'Linux PC', type: 'computer', os: 'Linux' },
													{ label: 'iPad', type: 'tablet', os: 'iPadOS' }
												].map((p) => (
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

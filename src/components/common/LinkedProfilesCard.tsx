import ComponentCard from './ComponentCard';
import { Button } from '../ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '../ui/dropdown-menu';
 import {
	Coins,
	Pencil,
	Zap,
	Linkedin,
	Twitter,
	Facebook,
	Instagram,
	Globe,
	Github,
	Link2Off
} from 'lucide-react';
 import { Link } from 'react-router-dom';
import { getActionCost, ActionKey, ENABLE_ACTION_FLAGS } from '../../constants/costs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { useState } from 'react';
import { toast } from 'sonner';
import { searchSocialProfiles, createSocialProfile, attachProfileToPerson, attachProfileToPhone, attachProfileToEmail, attachProfileToUsername } from '../../api/social_profiles';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';

export type LinkedProfileItem = {
	id: string;
	platform: string;
	handle: string;
	url?: string | null;
	linkTo: string;
	transformType?: string | null;
	confidenceScore?: number | null;
};

export default function LinkedProfilesCard({
	title = 'Social Profiles',
	items,
	onUnlink,
	displayName,
	ownerId,
	organizationId,
	onAttached,
	ownerType = 'person'
}: {
	title?: string;
	items: LinkedProfileItem[];
	onUnlink: (profileId: string) => void | Promise<void>;
	displayName?: string;
	ownerId: string;
	organizationId: string;
	onAttached?: (item: { id: string; platform: string; handle: string; url?: string | null }) => void;
	ownerType?: 'person' | 'email' | 'phone' | 'username';
}) {
	const [manageOpen, setManageOpen] = useState(false);
	const [profileQuery, setProfileQuery] = useState('');
	const [profileResults, setProfileResults] = useState<Array<{ id: string; platform: string; handle: string; profile_url: string | null }>>([]);
	const [profileLoading, setProfileLoading] = useState(false);
	const [newProfilePlatform, setNewProfilePlatform] = useState('');
	const [newProfileHandle, setNewProfileHandle] = useState('');
	const [newProfileUrl, setNewProfileUrl] = useState('');
	const [creatingProfile, setCreatingProfile] = useState(false);
	const [newProfileUrlPrefix, setNewProfileUrlPrefix] = useState('');
	const [alsoCreateUsername, setAlsoCreateUsername] = useState(false);
	const [platformLocked, setPlatformLocked] = useState(false);
	const [selectedPresetLabel, setSelectedPresetLabel] = useState<string>('');

	const SOCIAL_PRESETS = [
		{ label: 'LinkedIn', platform: 'linkedin', urlPrefix: 'https://www.linkedin.com/in/' },
		{ label: 'Twitter / X', platform: 'twitter', urlPrefix: 'https://twitter.com/' },
		{ label: 'Instagram', platform: 'instagram', urlPrefix: 'https://www.instagram.com/' },
		{ label: 'Facebook', platform: 'facebook', urlPrefix: 'https://www.facebook.com/' },
		{ label: 'GitHub', platform: 'github', urlPrefix: 'https://github.com/' },
		{ label: 'Custom', platform: 'custom', urlPrefix: '' }
	] as const;

	const runSearch = async (v: string) => {
		if (!organizationId || v.trim().length < 2) {
			setProfileResults([]);
			return;
		}
		setProfileLoading(true);
		try {
			const results = await searchSocialProfiles(organizationId, v, 10);
			setProfileResults(results);
		} finally {
			setProfileLoading(false);
		}
	};

	const attachProfile = async (profileId: string, extras?: { transform_type?: string }) => {
		if (ownerType === 'phone') {
			await attachProfileToPhone(profileId, ownerId, { transform_type: extras?.transform_type ?? 'manual_link' });
		} else if (ownerType === 'email') {
			await attachProfileToEmail(profileId, ownerId, { transform_type: extras?.transform_type ?? 'manual_link' });
		} else if (ownerType === 'username') {
			await attachProfileToUsername(profileId, ownerId, { transform_type: extras?.transform_type ?? 'manual_link' });
		} else {
			// default to person for now
			await attachProfileToPerson(profileId, ownerId, { transform_type: extras?.transform_type ?? 'manual_link' });
		}
	};

	const getPlatformIcon = (platform: string) => {
		switch ((platform || '').toLowerCase()) {
			case 'linkedin':
				return Linkedin;
			case 'twitter':
			case 'x':
				return Twitter;
			case 'facebook':
				return Facebook;
			case 'instagram':
				return Instagram;
			case 'github':
				return Github;
			default:
				return Globe;
		}
	};

	const getPlatformColor = (platform: string) => {
		switch ((platform || '').toLowerCase()) {
			case 'linkedin':
				return 'bg-blue-600 text-white';
			case 'twitter':
			case 'x':
				return 'bg-sky-500 text-white';
			case 'facebook':
				return 'bg-blue-700 text-white';
			case 'instagram':
				return 'bg-pink-600 text-white';
			case 'github':
				return 'bg-gray-800 text-white';
			default:
				return 'bg-slate-600 text-white';
		}
	};

	const displayPlatform = (platform: string) => {
		switch ((platform || '').toLowerCase()) {
			case 'linkedin':
				return 'LinkedIn';
			case 'twitter':
			case 'x':
				return 'Twitter';
			case 'facebook':
				return 'Facebook';
			case 'instagram':
				return 'Instagram';
			case 'github':
				return 'GitHub';
			default:
				return platform || 'Custom';
		}
	};

	return (
		<ComponentCard>
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-lg font-semibold">{title}</h3>
				<div className="flex items-center gap-2">
					{ENABLE_ACTION_FLAGS[ActionKey.DiscoverProfiles] ? (
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
											Discover social profiles
										</DropdownMenuItem>
									</div>
									<div className="w-20">
 										<DropdownMenuItem disabled>
											<span className="border-l pl-3 text-sm text-gray-500">
 												{getActionCost(ActionKey.DiscoverProfiles)} <Coins className="ml-0.5 inline-block size-3" />
											</span>
										</DropdownMenuItem>
									</div>
								</div>
								<DropdownMenuSeparator />
								<DropdownMenuItem disabled>
									Actions will run for {displayName ?? 'selection'}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
					<Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
						<Pencil className="size-4" />
					</Button>
				</div>
			</div>
			<div className="space-y-3">
				{items.length === 0 ? (
					<p className="text-muted-foreground text-sm">No social profiles linked.</p>
				) : (
					items.map((p) => (
						<div key={p.id} className="flex items-center justify-between rounded-lg border p-4">
							<div className="flex min-w-0 items-center gap-3 space-x-3">
								<div className={`rounded-lg p-2 ${getPlatformColor(p.platform)}`}>
									{(() => {
										const Icon = getPlatformIcon(p.platform);
										return <Icon className="h-5 w-5" />;
									})()}
								</div>
								<div>
									<p className="font-medium">{displayPlatform(p.platform)}</p>
									<Link to={p.linkTo} className="text-sm font-medium hover:underline">
										@{p.handle}
									</Link>
								</div>
								<div className="text-muted-foreground mt-1 text-xs">
									{p.transformType ? (
										<span className="rounded border px-2 py-0.5"> {p.transformType} </span>
									) : null}
									{p.confidenceScore != null ? (
										<span className="ml-2">
											Confidence: {(p.confidenceScore * 100).toFixed(0)}%
										</span>
									) : null}
								</div>
							</div>
							<div className="flex items-center gap-1">
								<Button size="sm" variant="ghost" onClick={() => onUnlink(p.id)} title="Unlink">
									<Link2Off className="h-4 w-4" />
								</Button>
							</div>
						</div>
					))
				)}
			</div>

			<Dialog open={manageOpen} onOpenChange={setManageOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Manage social profiles</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div className="space-y-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Search and attach</label>
								<Input
									placeholder="Search by platform or handle..."
									value={profileQuery}
									onChange={async (e) => {
										const v = e.target.value;
										setProfileQuery(v);
										await runSearch(v);
									}}
								/>
							</div>
							<div className="max-h-72 space-y-2 overflow-auto">
								{profileLoading ? (
									<div className="text-sm text-muted-foreground">Searching…</div>
								) : (
									profileResults.map((pr) => (
										<div key={pr.id} className="flex items-center justify-between rounded border p-3">
											<div className="text-sm font-medium">
												{displayPlatform(pr.platform)} · @{pr.handle}
											</div>
											<Button
												size="sm"
												variant="outline"
												onClick={async () => {
													try {
														await attachProfile(pr.id, { transform_type: 'manual_link' });
														onAttached?.({
															id: pr.id,
															platform: pr.platform,
															handle: pr.handle,
															url: pr.profile_url
														});
														toast.success('Profile linked');
													} catch (err) {
														console.error('Failed to link profile', err);
														toast.error('Failed to link profile.');
													}
												}}
											>
												Attach
											</Button>
										</div>
									))
								)}
							</div>
							{items.length > 0 ? (
								<div className="space-y-2">
									<div className="text-sm font-medium">Currently linked</div>
									<div className="space-y-2">
										{items.map((lp) => (
											<div key={lp.id} className="flex items-center justify-between rounded border p-3">
												<Link to={lp.linkTo} className="text-sm font-medium hover:underline">
													{lp.platform} · @{lp.handle}
												</Link>
												<Button size="sm" variant="ghost" onClick={() => onUnlink(lp.id)}>
													Unlink
												</Button>
											</div>
										))}
									</div>
								</div>
							) : null}
						</div>
						<div className="space-y-3">
							<div className="space-y-2">
								<div className="text-sm font-medium">Create new profile</div>
								<div className="flex items-center gap-2">
									<Input
										placeholder="Platform (e.g., twitter)"
										value={selectedPresetLabel || newProfilePlatform}
										disabled={platformLocked}
										onChange={(e) => {
											// Only allow manual edits when not locked (custom)
											if (platformLocked) return;
											setNewProfilePlatform(e.target.value);
											setSelectedPresetLabel('');
											setNewProfileUrlPrefix('');
										}}
									/>
									<Popover>
										<PopoverTrigger asChild>
											<Button size="sm" variant="outline">
												Presets
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
																	setNewProfilePlatform(p.platform);
																	setSelectedPresetLabel(p.label);
																	const isCustom = p.platform === 'custom';
																	setPlatformLocked(!isCustom);
																	setNewProfileUrlPrefix(p.urlPrefix);
																	if (p.urlPrefix && !isCustom) {
																		const sanitized = newProfileHandle.replace(/^@+/, '');
																		setNewProfileUrl(`${p.urlPrefix}${sanitized}`);
																	} else {
																		setNewProfileUrl('');
																	}
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
								<Input
									placeholder="Handle (without @)"
									value={newProfileHandle}
									onChange={(e) => {
										const sanitized = e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').replace(/^@+/, '');
										setNewProfileHandle(sanitized);
										if (newProfileUrlPrefix) {
											setNewProfileUrl(`${newProfileUrlPrefix}${sanitized}`);
										}
									}}
								/>
								<Input
									placeholder="Profile URL"
									value={newProfileUrl}
									onChange={(e) => setNewProfileUrl(e.target.value)}
									disabled={Boolean(newProfileUrlPrefix)}
								/>
								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={alsoCreateUsername}
										onChange={(e) => setAlsoCreateUsername(e.target.checked)}
									/>
									<span>Also create a username record for this handle</span>
								</label>
								<div className="rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
									This profile will be created and automatically linked to <span className="font-medium text-foreground">{displayName ?? 'selection'}</span>.
								</div>
							</div>
							<Button
								onClick={async () => {
									if (!organizationId || !newProfilePlatform.trim() || !newProfileHandle.trim()) {
										toast.error('Platform and handle are required.');
										return;
									}
									setCreatingProfile(true);
									try {
										const created = await createSocialProfile({
											organization_id: organizationId,
											profile: {
												platform: newProfilePlatform.trim(),
												handle: newProfileHandle.trim(),
												profile_url: newProfileUrl.trim() || null
											}
										});
										await attachProfile(created.id, { transform_type: 'manual_create' });
										if (alsoCreateUsername) {
											const { createUsername } = await import('../../api/usernames');
											const { attachProfileToUsername } = await import('../../api/social_profiles');
											const createdUsername = await createUsername({
												organization_id: organizationId,
												value: newProfileHandle.trim()
											});
											await attachProfileToUsername(created.id, createdUsername.id, { transform_type: 'manual_create' });
											toast.success('Username also created and linked.');
										}
										onAttached?.({
											id: created.id,
											platform: displayPlatform(newProfilePlatform.trim()),
											handle: newProfileHandle.trim(),
											url: newProfileUrl.trim() || null
										});
										toast.success('Profile created and linked.');
										setNewProfilePlatform('');
										setNewProfileHandle('');
										setNewProfileUrl('');
										setNewProfileUrlPrefix('');
										setAlsoCreateUsername(false);
										setManageOpen(false);
									} catch (error) {
										// If duplicate (unique org+platform+handle), find existing and link it
										const err = error as { message?: string; code?: string | number; status?: string | number } | undefined;
										const message: string = err?.message ?? '';
										const code: string | number | undefined = err?.code ?? err?.status;
										const isDuplicate =
											code === 409 ||
											code === '23505' ||
											/duplicate key value/i.test(message) ||
											/unique constraint/i.test(message);
										if (isDuplicate) {
											try {
												const list = await searchSocialProfiles(organizationId, newProfileHandle.trim(), 10);
												const match = list.find(
													(p) =>
														(p.platform || '').toLowerCase() === newProfilePlatform.trim().toLowerCase() &&
														(p.handle || '').toLowerCase() === newProfileHandle.trim().toLowerCase()
												);
												if (match) {
													await attachProfile(match.id, { transform_type: 'manual_link' });
													onAttached?.({
														id: match.id,
														platform: displayPlatform(match.platform),
														handle: match.handle,
														url: match.profile_url ?? null
													});
													toast.success('Existing profile found and linked.');
													setManageOpen(false);
												} else {
													toast.error('Profile already exists, but it could not be found to link.');
												}
											} catch (linkErr) {
												console.error('Failed to link existing profile after duplicate', linkErr);
												toast.error('Failed to link existing profile.');
											}
										} else {
											console.error('Failed to create social profile', error);
											toast.error('Failed to create social profile.');
										}
									} finally {
										setCreatingProfile(false);
									}
								}}
								disabled={creatingProfile}
							>
								{creatingProfile ? 'Creating…' : 'Create profile'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</ComponentCard>
	);
}

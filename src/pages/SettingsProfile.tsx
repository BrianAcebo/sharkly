/**
 * Settings: Profile
 * Name, avatar, bio, phone, location — backed by the profiles table.
 */

import { useState, useEffect, useRef } from 'react';
import PageMeta from '../components/common/PageMeta';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import InputField from '../components/form/input/InputField';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { User, Camera, Loader2 } from 'lucide-react';

export default function SettingsProfile() {
	const { user, refreshUser } = useAuth();
	const fileRef = useRef<HTMLInputElement>(null);

	const [form, setForm] = useState({
		first_name: '',
		last_name: '',
		title: '',
		bio: '',
		phone: '',
		location: ''
	});
	const [avatarUrl, setAvatarUrl] = useState<string>('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [uploadingAvatar, setUploadingAvatar] = useState(false);

	useEffect(() => {
		if (!user) return;
		setForm({
			first_name: user.first_name ?? '',
			last_name: user.last_name ?? '',
			title: user.title ?? '',
			bio: user.bio ?? '',
			phone: user.phone ?? '',
			location: user.location ?? ''
		});
		setAvatarUrl(user.avatar ?? '');
		setLoading(false);
	}, [user]);

	const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
		setForm((f) => ({ ...f, [key]: e.target.value }));

	const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !user?.id) return;
		if (file.size > 2 * 1024 * 1024) {
			toast.error('Image must be under 2 MB');
			return;
		}
		setUploadingAvatar(true);
		try {
			const ext = file.name.split('.').pop();
			const path = `avatars/${user.id}.${ext}`;
			const { error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(path, file, { upsert: true });
			if (uploadError) throw uploadError;
			const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
			const publicUrl = urlData.publicUrl;
			await supabase.from('profiles').update({ avatar: publicUrl }).eq('id', user.id);
			setAvatarUrl(publicUrl);
			await refreshUser();
			toast.success('Avatar updated');
		} catch {
			toast.error('Failed to upload avatar');
		} finally {
			setUploadingAvatar(false);
		}
	};

	const save = async () => {
		if (!user?.id) return;
		setSaving(true);
		const { error } = await supabase
			.from('profiles')
			.update({
				first_name: form.first_name.trim(),
				last_name: form.last_name.trim(),
				title: form.title.trim(),
				bio: form.bio.trim(),
				phone: form.phone.trim(),
				location: form.location.trim()
			})
			.eq('id', user.id);
		setSaving(false);
		if (error) {
			toast.error('Failed to save profile');
		} else {
			await refreshUser();
			toast.success('Profile updated');
		}
	};

	const initials =
		[form.first_name[0], form.last_name[0]].filter(Boolean).join('').toUpperCase() || '?';

	return (
		<>
			<PageMeta title="Profile" description="Edit your profile" />

			<div className="flex items-center gap-3">
				<User className="size-5 text-gray-400" />
				<div>
					<h1 className="font-montserrat text-xl font-bold text-gray-900 dark:text-white">
						Profile
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						How your name and avatar appear in the app.
					</p>
				</div>
			</div>

			{loading ? (
				<div className="mt-8 flex justify-center">
					<Loader2 className="size-5 animate-spin text-gray-400" />
				</div>
			) : (
				<div className="mt-6 space-y-5">
					{/* Avatar */}
					<div className="flex items-center gap-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
						<div className="relative">
							{avatarUrl ? (
								<img
									src={avatarUrl}
									alt="Avatar"
									className="size-16 rounded-full object-cover ring-2 ring-brand-500/20"
								/>
							) : (
								<div className="flex size-16 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white">
									{initials}
								</div>
							)}
							<button
								onClick={() => fileRef.current?.click()}
								disabled={uploadingAvatar}
								className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:ring-gray-700"
							>
								{uploadingAvatar ? (
									<Loader2 className="size-3 animate-spin text-gray-500" />
								) : (
									<Camera className="size-3 text-gray-500" />
								)}
							</button>
						</div>
						<div>
							<p className="text-sm font-medium text-gray-900 dark:text-white">
								{[form.first_name, form.last_name].filter(Boolean).join(' ') || 'Your name'}
							</p>
							<p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
							<button
								onClick={() => fileRef.current?.click()}
								disabled={uploadingAvatar}
								className="mt-1.5 text-xs text-brand-500 hover:text-brand-600 disabled:opacity-50"
							>
								Change photo
							</button>
						</div>
						<input
							ref={fileRef}
							type="file"
							accept="image/jpeg,image/png,image/webp"
							className="hidden"
							onChange={handleAvatarUpload}
						/>
					</div>

					{/* Name + title */}
					<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
						<p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
							Basic info
						</p>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="first_name" className="text-sm">First name</Label>
								<InputField
									id="first_name"
									value={form.first_name}
									onChange={set('first_name')}
									placeholder="Jane"
									className="mt-1"
								/>
							</div>
							<div>
								<Label htmlFor="last_name" className="text-sm">Last name</Label>
								<InputField
									id="last_name"
									value={form.last_name}
									onChange={set('last_name')}
									placeholder="Smith"
									className="mt-1"
								/>
							</div>
							<div className="col-span-2">
								<Label htmlFor="title" className="text-sm">Job title <span className="text-gray-400">(optional)</span></Label>
								<InputField
									id="title"
									value={form.title}
									onChange={set('title')}
									placeholder="e.g. SEO Manager"
									className="mt-1"
								/>
							</div>
						</div>
					</div>

					{/* Contact + location */}
					<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
						<p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
							Contact
						</p>
						<div className="space-y-3">
							<div>
								<Label htmlFor="email" className="text-sm">Email</Label>
								<InputField
									id="email"
									value={user?.email ?? ''}
									disabled
									className="mt-1 cursor-not-allowed opacity-60"
								/>
								<p className="mt-1 text-[11px] text-gray-400">
									Email changes require re-verification. Contact support.
								</p>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="phone" className="text-sm">Phone <span className="text-gray-400">(optional)</span></Label>
									<InputField
										id="phone"
										value={form.phone}
										onChange={set('phone')}
										placeholder="+1 555 000 0000"
										className="mt-1"
									/>
								</div>
								<div>
									<Label htmlFor="location" className="text-sm">Location <span className="text-gray-400">(optional)</span></Label>
									<InputField
										id="location"
										value={form.location}
										onChange={set('location')}
										placeholder="New York, NY"
										className="mt-1"
									/>
								</div>
							</div>
						</div>
					</div>

					<div className="flex justify-end">
						<Button
							onClick={save}
							disabled={saving}
							className="bg-brand-500 hover:bg-brand-600 text-white"
						>
							{saving && <Loader2 className="mr-2 size-4 animate-spin" />}
							{saving ? 'Saving…' : 'Save profile'}
						</Button>
					</div>
				</div>
			)}
		</>
	);
}

/**
 * Settings: Profile
 * Name, avatar, contact — Security (password, email) — Data export — Danger zone (delete account).
 */

import { useState, useEffect, useRef } from 'react';
import PageMeta from '../components/common/PageMeta';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import InputField from '../components/form/input/InputField';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { User, Camera, Loader2, Lock, Mail, Eye, EyeOff, Download, AlertTriangle, Trash2, RefreshCw } from 'lucide-react';

interface PasswordFormData {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

interface EmailFormData {
	newEmail: string;
	password: string;
}

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

	const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	});
	const [isPasswordLoading, setIsPasswordLoading] = useState(false);
	const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

	const [emailForm, setEmailForm] = useState<EmailFormData>({ newEmail: '', password: '' });
	const [isEmailLoading, setIsEmailLoading] = useState(false);
	const [showEmailPassword, setShowEmailPassword] = useState(false);

	const [isExporting, setIsExporting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

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
		const raw = user.avatar ?? '';
		if (raw.startsWith('http')) {
			setAvatarUrl(raw);
		} else if (raw) {
			const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(raw);
			setAvatarUrl(publicUrl);
		} else {
			setAvatarUrl('');
		}
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

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			toast.error('New passwords do not match');
			return;
		}
		if (passwordForm.newPassword.length < 6) {
			toast.error('Password must be at least 6 characters');
			return;
		}
		setIsPasswordLoading(true);
		try {
			const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
			if (error) throw error;
			toast.success('Password updated');
			setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
		} catch (err) {
			console.error(err);
			toast.error('Failed to update password');
		} finally {
			setIsPasswordLoading(false);
		}
	};

	const handleEmailSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsEmailLoading(true);
		try {
			const { error } = await supabase.auth.updateUser({ email: emailForm.newEmail });
			if (error) throw error;
			toast.success('Verification email sent to new address');
			setEmailForm({ newEmail: '', password: '' });
		} catch (err) {
			console.error(err);
			toast.error('Failed to update email');
		} finally {
			setIsEmailLoading(false);
		}
	};

	const handleExportData = async () => {
		if (!user?.id) return;
		setIsExporting(true);
		try {
			const { data: profileData } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', user.id)
				.single();
			const { data: organizationData } = await supabase
				.from('user_organizations')
				.select('*, organization:organizations(*)')
				.eq('user_id', user.id);
			const exportData = {
				exportedAt: new Date().toISOString(),
				profile: profileData,
				organizations: organizationData
			};
			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `sharkly-data-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success('Data exported successfully');
		} catch (err) {
			console.error(err);
			toast.error('Failed to export data');
		} finally {
			setIsExporting(false);
		}
	};

	const handleDeleteAccount = async () => {
		if (!user?.id) return;
		setIsDeleting(true);
		try {
			const { error: profileError } = await supabase
				.from('profiles')
				.delete()
				.eq('id', user.id);
			if (profileError) throw profileError;
			const { error: signOutError } = await supabase.auth.signOut();
			if (signOutError) throw signOutError;
			toast.success('Account deleted successfully');
			window.location.href = '/';
		} catch (err) {
			console.error(err);
			toast.error('Failed to delete account. Please contact support if you need help.');
		} finally {
			setIsDeleting(false);
			setShowDeleteConfirm(false);
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
									To change your email, use the form in Security below.
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

					{/* Security: password + email */}
					<div className="space-y-5">
						<div className="flex items-center gap-3">
							<Lock className="size-5 text-gray-400" />
							<div>
								<h2 className="font-montserrat text-lg font-bold text-gray-900 dark:text-white">
									Security
								</h2>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Change your password or email address.
								</p>
							</div>
						</div>

						<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
							<p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
								<Lock className="size-3.5" /> Change password
							</p>
							<form onSubmit={handlePasswordSubmit} className="space-y-3 max-w-sm">
								<div>
									<Label htmlFor="currentPassword" className="text-sm">Current password</Label>
									<div className="relative mt-1">
										<InputField
											id="currentPassword"
											type={showPasswords.current ? 'text' : 'password'}
											value={passwordForm.currentPassword}
											onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
											placeholder="Current password"
											className="pr-10"
										/>
										<button
											type="button"
											onClick={() => setShowPasswords((s) => ({ ...s, current: !s.current }))}
											className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
										>
											{showPasswords.current ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
										</button>
									</div>
								</div>
								<div>
									<Label htmlFor="newPassword" className="text-sm">New password</Label>
									<div className="relative mt-1">
										<InputField
											id="newPassword"
											type={showPasswords.new ? 'text' : 'password'}
											value={passwordForm.newPassword}
											onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
											placeholder="New password"
											className="pr-10"
										/>
										<button
											type="button"
											onClick={() => setShowPasswords((s) => ({ ...s, new: !s.new }))}
											className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
										>
											{showPasswords.new ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
										</button>
									</div>
								</div>
								<div>
									<Label htmlFor="confirmPassword" className="text-sm">Confirm new password</Label>
									<div className="relative mt-1">
										<InputField
											id="confirmPassword"
											type={showPasswords.confirm ? 'text' : 'password'}
											value={passwordForm.confirmPassword}
											onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
											placeholder="Confirm new password"
											className="pr-10"
										/>
										<button
											type="button"
											onClick={() => setShowPasswords((s) => ({ ...s, confirm: !s.confirm }))}
											className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
										>
											{showPasswords.confirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
										</button>
									</div>
								</div>
								<Button type="submit" disabled={isPasswordLoading} className="bg-brand-500 hover:bg-brand-600 text-white">
									{isPasswordLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
									{isPasswordLoading ? 'Updating…' : 'Update password'}
								</Button>
							</form>
						</div>

						<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
							<p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
								<Mail className="size-3.5" /> Change email
							</p>
							<p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
								We’ll send a verification link to your new address. You’ll need to confirm before the change takes effect.
							</p>
							<form onSubmit={handleEmailSubmit} className="space-y-3 max-w-sm">
								<div>
									<Label htmlFor="newEmail" className="text-sm">New email address</Label>
									<InputField
										id="newEmail"
										type="email"
										value={emailForm.newEmail}
										onChange={(e) => setEmailForm((p) => ({ ...p, newEmail: e.target.value }))}
										placeholder="you@example.com"
										className="mt-1"
									/>
								</div>
								<div>
									<Label htmlFor="emailPassword" className="text-sm">Current password</Label>
									<div className="relative mt-1">
										<InputField
											id="emailPassword"
											type={showEmailPassword ? 'text' : 'password'}
											value={emailForm.password}
											onChange={(e) => setEmailForm((p) => ({ ...p, password: e.target.value }))}
											placeholder="Confirm with your password"
											className="pr-10"
										/>
										<button
											type="button"
											onClick={() => setShowEmailPassword((v) => !v)}
											className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
										>
											{showEmailPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
										</button>
									</div>
								</div>
								<Button type="submit" disabled={isEmailLoading} className="bg-brand-500 hover:bg-brand-600 text-white">
									{isEmailLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
									{isEmailLoading ? 'Sending…' : 'Send verification email'}
								</Button>
							</form>
						</div>
					</div>

					{/* Data management */}
					{/* <div className="space-y-5">
						<div className="flex items-center gap-3">
							<Download className="size-5 text-gray-400" />
							<div>
								<h2 className="font-montserrat text-lg font-bold text-gray-900 dark:text-white">
									Data management
								</h2>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Export your profile and organization data.
								</p>
							</div>
						</div>
						<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
							<p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
								Export your data
							</p>
							<p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
								Download a copy of your profile and organization data in JSON format.
							</p>
							<Button
								variant="outline"
								onClick={handleExportData}
								disabled={isExporting}
							>
								{isExporting && <Loader2 className="mr-2 size-4 animate-spin" />}
								{isExporting ? 'Exporting…' : 'Export data'}
							</Button>
						</div>
					</div>
					*/}

					{/* Danger zone */}
					{/* <div className="space-y-5">
						<div className="flex items-center gap-3">
							<AlertTriangle className="size-5 text-red-500 dark:text-red-400" />
							<div>
								<h2 className="font-montserrat text-lg font-bold text-red-600 dark:text-red-400">
									Danger zone
								</h2>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Irreversible actions.
								</p>
							</div>
						</div>
						<div className="rounded-xl border border-red-200 dark:border-red-800 bg-white p-5 dark:bg-gray-900">
							<p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">
								Delete account
							</p>
							<p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
								Permanently delete your account and profile. This cannot be undone. You will lose access to all organizations and data associated with this account.
							</p>
							<Button
								variant="destructive"
								onClick={() => setShowDeleteConfirm(true)}
							>
								<Trash2 className="mr-2 size-4" />
								Delete account
							</Button>
						</div>
					</div> */}
				</div>
			)}

			{/* Delete account confirmation modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
						<div className="mb-4 flex items-start gap-3">
							<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
								<Trash2 className="size-5 text-red-600 dark:text-red-400" />
							</div>
							<div>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
									Delete account
								</h3>
								<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
									Are you sure you want to delete your account? This action cannot be undone.
								</p>
							</div>
						</div>
						<p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
							All your data, including your profile and organization memberships, will be permanently removed.
						</p>
						<div className="flex gap-3">
							<Button
								type="button"
								variant="outline"
								onClick={() => setShowDeleteConfirm(false)}
								disabled={isDeleting}
								className="flex-1"
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={handleDeleteAccount}
								disabled={isDeleting}
								className="flex-1"
							>
								{isDeleting ? (
									<>
										<RefreshCw className="mr-2 size-4 animate-spin" />
										Deleting…
									</>
								) : (
									'Yes, delete my account'
								)}
							</Button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

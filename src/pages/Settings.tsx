import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import InputField from '../components/form/input/InputField';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';

import { 
	User, 
	Mail, 
	Lock, 
	Bell, 
	Shield, 
	Globe, 
	Trash2,
	Save,
	X,
	Eye,
	EyeOff,
	AlertTriangle,
	Upload,
	RefreshCw
} from 'lucide-react';
import PageMeta from '../components/common/PageMeta';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';

interface ProfileFormData {
	first_name: string;
	last_name: string;
	avatar: string;
}

interface PasswordFormData {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

interface EmailFormData {
	newEmail: string;
	password: string;
}

export default function SettingsPage() {
	const { user, updateUser } = useAuth();
	const [activeTab, setActiveTab] = useState('profile');
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Settings');
	}, [setTitle]);
	
	// Profile form state
	const [profileForm, setProfileForm] = useState<ProfileFormData>({
		first_name: '',
		last_name: '',
		avatar: ''
	});
	const [isProfileLoading, setIsProfileLoading] = useState(false);
	const [profileChanged, setProfileChanged] = useState(false);
	
	// Avatar upload state
	const [avatar, setAvatar] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	
	// Password form state
	const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	});
	const [isPasswordLoading, setIsPasswordLoading] = useState(false);
	const [showPasswords, setShowPasswords] = useState({
		current: false,
		new: false,
		confirm: false
	});
	
	// Email form state
	const [emailForm, setEmailForm] = useState<EmailFormData>({
		newEmail: '',
		password: ''
	});
	const [isEmailLoading, setIsEmailLoading] = useState(false);
	const [showEmailPassword, setShowEmailPassword] = useState(false);
	
	// Notification preferences
	const [notifications, setNotifications] = useState({
		email: true,
		push: true,
		marketing: false,
		// Lead notifications
		caseAssigned: true,
		caseStatusChange: true,
		caseFollowUp: true,
		caseQualification: true,
		// AI Assistant notifications
		aiInsights: true,
		conversationSummary: true,
		followUpSuggestions: true,
		performanceAnalytics: true,
		// Communication notifications
		newMessages: true,
		meetingReminders: true,
		taskDeadlines: true,
		teamMentions: true
	});
	
	// Push notification state
	const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
	const [isRequestingPermission, setIsRequestingPermission] = useState(false);
	
	// Data export
	const [isExporting, setIsExporting] = useState(false);
	
	// Danger zone
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (user) {
			setProfileForm({
				first_name: user.first_name || '',
				last_name: user.last_name || '',
				avatar: user.avatar || ''
			});
			
			// Set avatar preview if user has an avatar
			if (user.avatar) {
				// Check if avatar is already a full URL or just a filename
				if (user.avatar.startsWith('http')) {
					setAvatarPreview(user.avatar);
				} else {
					// Get the full URL for the avatar filename
					const { data: { publicUrl } } = supabase.storage
						.from('avatars')
						.getPublicUrl(user.avatar);
					setAvatarPreview(publicUrl);
				}
			}
		}
	}, [user]);

	const handleProfileChange = (field: keyof ProfileFormData, value: string) => {
		setProfileForm(prev => ({ ...prev, [field]: value }));
		setProfileChanged(true);
	};

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setAvatar(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setAvatarPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
		setProfileChanged(true);
	};

	const handleRemoveAvatar = () => {
		setAvatar(null);
		setAvatarPreview(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
		setProfileChanged(true);
	};

	const handleProfileSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;

		setIsProfileLoading(true);
		try {
			let avatarPath = profileForm.avatar;

			// Upload avatar if selected
			if (avatar) {
				// Generate a unique filename with user ID to prevent collisions
				const fileExt = avatar.name.split('.').pop();
				const fileName = `${Date.now()}.${fileExt}`;

				const { error: uploadError } = await supabase.storage
					.from('avatars')
					.upload(fileName, avatar, {
						upsert: true, // Allow overwriting if file exists
						cacheControl: '3600',
						contentType: avatar.type // Set proper content type
					});

				if (uploadError) {
					console.error('Avatar upload error:', uploadError);
					throw uploadError;
				}

				// Store just the file path
				avatarPath = fileName;
			}

			const { error } = await supabase
				.from('profiles')
				.update({
					first_name: profileForm.first_name,
					last_name: profileForm.last_name,
					avatar: avatarPath
				})
				.eq('id', user.id);

			if (error) throw error;

			// Update user context
			await updateUser();
			setProfileChanged(false);
			
			// Clear avatar state after successful upload
			if (avatar) {
				setAvatar(null);
				setAvatarPreview(null);
			}
			
			toast.success('Profile updated successfully');
		} catch (error) {
			console.error('Error updating profile:', error);
			toast.error('Failed to update profile');
		} finally {
			setIsProfileLoading(false);
		}
	};

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			toast.error('New passwords do not match');
			return;
		}

		if (passwordForm.newPassword.length < 6) {
			toast.error('Password must be at least 6 characters long');
			return;
		}

		setIsPasswordLoading(true);
		try {
			const { error } = await supabase.auth.updateUser({
				password: passwordForm.newPassword
			});

			if (error) throw error;

			toast.success('Password updated successfully');
			setPasswordForm({
				currentPassword: '',
				newPassword: '',
				confirmPassword: ''
			});
		} catch (error) {
			console.error('Error updating password:', error);
			toast.error('Failed to update password');
		} finally {
			setIsPasswordLoading(false);
		}
	};

	const handleEmailSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!user) return;

		setIsEmailLoading(true);
		try {
			const { error } = await supabase.auth.updateUser({
				email: emailForm.newEmail
			});

			if (error) throw error;

			toast.success('Verification email sent to new address');
			setEmailForm({
				newEmail: '',
				password: ''
			});
		} catch (error) {
			console.error('Error updating email:', error);
			toast.error('Failed to update email');
		} finally {
			setIsEmailLoading(false);
		}
	};

	// Check push notification permission on mount and refresh it
	useEffect(() => {
		const refreshPermission = () => {
			const currentPermission = Notification.permission;
			setPushPermission(currentPermission);
		};
		
		refreshPermission();
		
		// Also refresh when the page becomes visible (user might have changed permission in another tab)
		const handleVisibilityChange = () => {
			if (!document.hidden) {
				refreshPermission();
			}
		};
		
		document.addEventListener('visibilitychange', handleVisibilityChange);
		
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, []);

	const requestPushPermission = async () => {
		setIsRequestingPermission(true);
		try {
			const permission = await Notification.requestPermission();
			setPushPermission(permission);
			
			if (permission === 'granted') {
				toast.success('Push notifications enabled!');
				// Save to database
				await supabase
					.from('profiles')
					.update({ push_notifications_enabled: true })
					.eq('id', user?.id);
			} else if (permission === 'denied') {
				toast.error('Push notifications denied. You can enable them in your browser settings.');
			}
		} catch (error) {
			console.error('Error requesting push permission:', error);
			toast.error('Failed to enable push notifications');
		} finally {
			setIsRequestingPermission(false);
		}
	};

	const testPushNotification = async () => {
		// Check the actual browser permission, not just the cached state
		const currentPermission = Notification.permission;
		console.log('Testing push notification with permission:', currentPermission);
		console.log('Local state permission:', pushPermission);
		
		if (currentPermission === 'granted') {
			try {
				console.log('Attempting to send notification...');
				const notification = new Notification('Paperboat CRM', {
					body: 'This is a test notification to verify push notifications are working!',
					icon: '/images/logos/logo.svg',
					tag: 'test-notification'
				});
				console.log('Notification sent successfully');
				toast.success('Test notification sent!');
				
				// Auto-close after 5 seconds
				setTimeout(() => {
					notification.close();
				}, 5000);
			} catch (error) {
				console.error('Error sending test notification:', error);
				toast.error('Failed to send test notification');
			}
		} else {
			toast.error(`Push notifications not enabled. Current permission: ${currentPermission}`);
		}
	};

	const handleExportData = async () => {
		if (!user) return;

		setIsExporting(true);
		try {
			// Get user's data from various tables
			const { data: profileData } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', user.id)
				.single();

			const { data: organizationData } = await supabase
				.from('user_organizations')
				.select(`
					*,
					organization:organizations(*)
				`)
				.eq('user_id', user.id);

			// Create export object
			const exportData = {
				exportedAt: new Date().toISOString(),
				profile: profileData,
				organizations: organizationData,
				// Add more data as needed
			};

			// Create and download file
			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `paperboat-data-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toast.success('Data exported successfully');
		} catch (error) {
			console.error('Error exporting data:', error);
			toast.error('Failed to export data');
		} finally {
			setIsExporting(false);
		}
	};

	const handleDeleteAccount = async () => {
		if (!user) return;

		setIsDeleting(true);
		try {
			// Delete user data from profiles table
			const { error: profileError } = await supabase
				.from('profiles')
				.delete()
				.eq('id', user.id);

			if (profileError) throw profileError;

			// Sign out the user (this will delete the session)
			const { error: signOutError } = await supabase.auth.signOut();
			
			if (signOutError) throw signOutError;

			toast.success('Account deleted successfully');
			// Redirect to home page
			window.location.href = '/';
		} catch (error) {
			console.error('Error deleting account:', error);
			toast.error('Failed to delete account. Please contact support for assistance.');
		} finally {
			setIsDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	const tabs = [
		{ id: 'profile', label: 'Profile', icon: User },
		{ id: 'security', label: 'Security', icon: Shield },
		{ id: 'notifications', label: 'Notifications', icon: Bell },
		// { id: 'danger', label: 'Danger Zone', icon: AlertTriangle }
	];

	const renderTabContent = () => {
		switch (activeTab) {
			case 'profile':
				return (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-5 w-5" />
								Profile Information
							</CardTitle>
							<CardDescription>
								Update your personal information and profile details
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleProfileSubmit} className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											First Name
										</label>
										<InputField
											id="first_name"
											name="first_name"
											value={profileForm.first_name}
											onChange={(e) => handleProfileChange('first_name', e.target.value)}
											placeholder="Enter your first name"
											required
										/>
									</div>
									<div>
										<label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Last Name
										</label>
										<InputField
											id="last_name"
											name="last_name"
											value={profileForm.last_name}
											onChange={(e) => handleProfileChange('last_name', e.target.value)}
											placeholder="Enter your last name"
											required
										/>
									</div>
								</div>
								{/* Avatar Upload */}
								<div className="flex flex-col items-center space-y-4">
									<div className="relative">
										{avatarPreview ? (
											<div className="relative border-2 border-gray-300 dark:border-gray-700 rounded-full">
												<img
													src={avatarPreview}
													alt="Avatar preview"
													className="h-32 w-32 rounded-full object-cover"
												/>
												<Button
													variant="outline"
													size="icon"
													onClick={handleRemoveAvatar}
													className="absolute -top-2 -right-2 h-6 w-6"
												>
													<X className="h-3 w-3" />
												</Button>
											</div>
										) : (
											<div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700">
												<Upload className="h-8 w-8 text-gray-400" />
											</div>
										)}
									</div>
									<input
										type="file"
										accept="image/*"
										onChange={handleAvatarChange}
										ref={fileInputRef}
										className="hidden"
										id="avatar-upload"
									/>
									<label
										htmlFor="avatar-upload"
										className="cursor-pointer rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
									>
										{avatarPreview ? 'Change Avatar' : 'Upload Avatar'}
									</label>
								</div>
								<div className="flex gap-3">
									<Button 
										type="submit" 
										disabled={!profileChanged || isProfileLoading}
										loading={isProfileLoading}
										startIcon={<Save className="h-4 w-4" />}
									>
										{isProfileLoading ? 'Saving...' : 'Save Changes'}
									</Button>
									{profileChanged && (
										<Button
											type="button"
											variant="outline"
																					onClick={() => {
											setProfileForm({
												first_name: user?.first_name || '',
												last_name: user?.last_name || '',
												avatar: user?.avatar || ''
											});
											setProfileChanged(false);
											
											// Reset avatar state
											if (user?.avatar) {
												// Check if avatar is already a full URL or just a filename
												if (user.avatar.startsWith('http')) {
													setAvatarPreview(user.avatar);
												} else {
													// Get the full URL for the avatar filename
													const { data: { publicUrl } } = supabase.storage
														.from('avatars')
														.getPublicUrl(user.avatar);
													setAvatarPreview(publicUrl);
												}
											} else {
												setAvatarPreview(null);
											}
											setAvatar(null);
										}}
											startIcon={<X className="h-4 w-4" />}
										>
											Cancel
										</Button>
									)}
								</div>
							</form>
						</CardContent>
					</Card>
				);

			case 'security':
				return (
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Lock className="h-5 w-5" />
									Change Password
								</CardTitle>
								<CardDescription>
									Update your password to keep your account secure
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form onSubmit={handlePasswordSubmit} className="space-y-4">
									<div>
										<label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Current Password
										</label>
										<div className="relative">
											<InputField
												id="currentPassword"
												name="currentPassword"
												type={showPasswords.current ? 'text' : 'password'}
												value={passwordForm.currentPassword}
												onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
												placeholder="Enter current password"
												required
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="absolute right-2 top-1/2 transform -translate-y-1/2"
												onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
											>
												{showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
											</Button>
										</div>
									</div>
									<div>
										<label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											New Password
										</label>
										<div className="relative">
											<InputField
												id="newPassword"
												name="newPassword"
												type={showPasswords.new ? 'text' : 'password'}
												value={passwordForm.newPassword}
												onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
												placeholder="Enter new password"
												required
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="absolute right-2 top-1/2 transform -translate-y-1/2"
												onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
											>
												{showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
											</Button>
										</div>
									</div>
									<div>
										<label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Confirm New Password
										</label>
										<div className="relative">
											<InputField
												id="confirmPassword"
												name="confirmPassword"
												type={showPasswords.confirm ? 'text' : 'password'}
												value={passwordForm.confirmPassword}
												onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
												placeholder="Confirm new password"
												required
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="absolute right-2 top-1/2 transform -translate-y-1/2"
												onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
											>
												{showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
											</Button>
										</div>
									</div>
									<Button 
										type="submit" 
										disabled={isPasswordLoading}
										loading={isPasswordLoading}
										startIcon={<Save className="h-4 w-4" />}
									>
										{isPasswordLoading ? 'Updating...' : 'Update Password'}
									</Button>
								</form>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Mail className="h-5 w-5" />
									Change Email Address
								</CardTitle>
								<CardDescription>
									Update your email address. You'll need to verify the new email.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleEmailSubmit} className="space-y-4">
									<div>
										<label htmlFor="newEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											New Email Address
										</label>
										<InputField
											id="newEmail"
											name="newEmail"
											type="email"
											value={emailForm.newEmail}
											onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
											placeholder="Enter new email address"
											required
										/>
									</div>
									<div>
										<label htmlFor="emailPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Current Password
										</label>
										<div className="relative">
											<InputField
												id="emailPassword"
												name="emailPassword"
												type={showEmailPassword ? 'text' : 'password'}
												value={emailForm.password}
												onChange={(e) => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
												placeholder="Enter current password to confirm"
												required
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="absolute right-2 top-1/2 transform -translate-y-1/2"
												onClick={() => setShowEmailPassword(!showEmailPassword)}
											>
												{showEmailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
											</Button>
										</div>
									</div>
									<Button 
										type="submit" 
										disabled={isEmailLoading}
										loading={isEmailLoading}
										startIcon={<Save className="h-4 w-4" />}
									>
										{isEmailLoading ? 'Sending...' : 'Send Verification Email'}
									</Button>
								</form>
							</CardContent>
						</Card>
					</div>
				);

			case 'notifications':
				return (
					<div className="space-y-6">
						{/* Push Notification Setup */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Bell className="h-5 w-5" />
									Push Notifications
								</CardTitle>
								<CardDescription>
									Enable browser push notifications for real-time updates
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<div>
											<h4 className="font-medium">Browser Push Notifications</h4>
											<p className="text-sm text-gray-500">
												{pushPermission === 'granted' 
													? 'Push notifications are enabled' 
													: pushPermission === 'denied' 
														? 'Push notifications are blocked' 
														: 'Push notifications are not configured'
												}
											</p>
										</div>
										{pushPermission === 'default' && (
											<Button
												onClick={requestPushPermission}
												disabled={isRequestingPermission}
												loading={isRequestingPermission}
												variant="outline"
												size="sm"
											>
												{isRequestingPermission ? 'Requesting...' : 'Enable Push'}
											</Button>
										)}
									</div>
									
									{pushPermission === 'granted' && (
										<div className="flex gap-3">
											<Button
												onClick={testPushNotification}
												variant="outline"
												size="sm"
												startIcon={<Bell className="h-4 w-4" />}
											>
												Test Notification
											</Button>
											<Button
												onClick={() => setNotifications(prev => ({ ...prev, push: !prev.push }))}
												variant={notifications.push ? "default" : "outline"}
												size="sm"
											>
												{notifications.push ? 'Disable' : 'Enable'} Push
											</Button>
										</div>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Email Notifications */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Mail className="h-5 w-5" />
									Email Notifications
								</CardTitle>
								<CardDescription>
									Choose which email notifications you want to receive
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<div>
											<h4 className="font-medium">Email Notifications</h4>
											<p className="text-sm text-gray-500">Receive notifications via email</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												className="sr-only peer"
												checked={notifications.email}
												onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.checked }))}
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
										</label>
									</div>
									
									{notifications.email && (
										<div className="ml-6 space-y-3">
											<div className="flex items-center justify-between">
												<div>
													<h5 className="font-medium text-sm">Case Management</h5>
													<p className="text-xs text-gray-500">New cases, status changes, follow-ups</p>
												</div>
												<label className="relative inline-flex items-center cursor-pointer">
													<input
														type="checkbox"
														className="sr-only peer"
														checked={notifications.caseAssigned && notifications.caseStatusChange && notifications.caseFollowUp}
														onChange={(e) => {
															const checked = e.target.checked;
															setNotifications(prev => ({
																...prev,
																caseAssigned: checked,
																caseStatusChange: checked,
																caseFollowUp: checked
															}));
														}}
													/>
													<div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
												</label>
											</div>
											
											<div className="flex items-center justify-between">
												<div>
													<h5 className="font-medium text-sm">AI Assistant</h5>
													<p className="text-xs text-gray-500">Insights, summaries, suggestions</p>
												</div>
												<label className="relative inline-flex items-center cursor-pointer">
													<input
														type="checkbox"
														className="sr-only peer"
														checked={notifications.aiInsights && notifications.conversationSummary && notifications.followUpSuggestions}
														onChange={(e) => {
															const checked = e.target.checked;
															setNotifications(prev => ({
																...prev,
																aiInsights: checked,
																conversationSummary: checked,
																followUpSuggestions: checked
															}));
														}}
													/>
													<div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
												</label>
											</div>
											
											<div className="flex items-center justify-between">
												<div>
													<h5 className="font-medium text-sm">Team Communication</h5>
													<p className="text-xs text-gray-500">Messages, meetings, mentions</p>
												</div>
												<label className="relative inline-flex items-center cursor-pointer">
													<input
														type="checkbox"
														className="sr-only peer"
														checked={notifications.newMessages && notifications.meetingReminders && notifications.teamMentions}
														onChange={(e) => {
															const checked = e.target.checked;
															setNotifications(prev => ({
																...prev,
																newMessages: checked,
																meetingReminders: checked,
																teamMentions: checked
															}));
														}}
													/>
													<div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
												</label>
											</div>
										</div>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Marketing Communications */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Globe className="h-5 w-5" />
									Marketing & Updates
								</CardTitle>
								<CardDescription>
									Stay updated with new features and improvements
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<div>
											<h4 className="font-medium">Marketing Communications</h4>
											<p className="text-sm text-gray-500">Receive updates about new features and promotions</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												className="sr-only peer"
												checked={notifications.marketing}
												onChange={(e) => setNotifications(prev => ({ ...prev, marketing: e.target.checked }))}
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
										</label>
									</div>
								</div>
							</CardContent>
						</Card>

						<Button 
							onClick={() => toast.success('Notification preferences saved')}
							startIcon={<Save className="h-4 w-4" />}
							className="w-full"
						>
							Save All Preferences
						</Button>
					</div>
				);

			case 'preferences':
				return (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Globe className="h-5 w-5" />
								Data Management
							</CardTitle>
							<CardDescription>
								Export your data or manage your account
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
									<h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Export Your Data</h4>
									<p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
										Download a copy of your data in JSON format. This includes your profile information and organization details.
									</p>
									<Button
										onClick={handleExportData}
										disabled={isExporting}
										loading={isExporting}
										variant="outline"
										startIcon={<Globe className="h-4 w-4" />}
									>
										{isExporting ? 'Exporting...' : 'Export Data'}
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				);

			case 'danger':
				return (
					<Card className="border-red-200 dark:border-red-800">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
								<AlertTriangle className="h-5 w-5" />
								Danger Zone
							</CardTitle>
							<CardDescription>
								Irreversible and destructive actions
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
									<h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Delete Account</h4>
									<p className="text-sm text-red-600 dark:text-red-400 mb-4">
										Once you delete your account, there is no going back. Please be certain.
									</p>
									<Button
										variant="destructive"
										onClick={() => setShowDeleteConfirm(true)}
										startIcon={<Trash2 className="h-4 w-4" />}
									>
										Delete Account
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				);
			default:
				return null;
		}
	};

	if (!user) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<p className="text-gray-600 dark:text-gray-400">Please sign in to access settings</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<PageMeta title="Settings" description="Manage your account settings and preferences" />
			<div className="container mx-auto py-8 max-w-4xl">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-2">
						Manage your account settings, profile, and preferences
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
					{/* Sidebar Navigation */}
					<div className="lg:col-span-1">
						<nav className="space-y-2">
							{tabs.map((tab) => {
								const Icon = tab.icon;
								return (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
											activeTab === tab.id
												? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
												: 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
										}`}
									>
										<Icon className="h-5 w-5" />
										{tab.label}
									</button>
								);
							})}
						</nav>
					</div>

					{/* Main Content */}
					<div className="lg:col-span-3">
						{renderTabContent()}
					</div>
				</div>
			</div>

			{/* Delete Account Confirmation Modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
					<div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
						<div className="flex items-center space-x-3 mb-4">
							<div className="flex-shrink-0">
								<div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
									<Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
								</div>
							</div>
							<div>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
									Delete Account
								</h3>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Are you absolutely sure you want to delete your account?
								</p>
							</div>
						</div>
						
						<div className="mb-6">
							<p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
								<strong>Warning:</strong> This action cannot be undone.
							</p>
							<p className="text-sm text-gray-600 dark:text-gray-300">
								All your data, including cases, tasks, and account information will be permanently deleted. You will lose access to all organizations and data associated with this account.
							</p>
						</div>

						<div className="flex space-x-3">
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
										<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
										Deleting...
									</>
								) : (
									'Yes, Delete My Account'
								)}
							</Button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

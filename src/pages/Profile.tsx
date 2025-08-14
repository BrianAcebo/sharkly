import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';
import { 
	User, 
	Mail, 
	Building2, 
	Calendar,
	Edit3,
	Save,
	X,
	Upload,
	Activity,
	Target,
	MessageSquare,
	Clock,
	TrendingUp,
	Settings,
	Download,
	MapPin,
	Phone
} from 'lucide-react';
import PageMeta from '../components/common/PageMeta';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import UserAvatar from '../components/common/UserAvatar';
import { useProfileStats } from '../hooks/useProfileStats';

interface ProfileFormData {
	first_name: string;
	last_name: string;
	title: string;
	bio: string;
	phone: string;
	location: string;
	avatar: string;
}

export default function ProfilePage() {
	const { user, updateUser } = useAuth();
	const { setTitle } = useBreadcrumbs();
	const [isEditing, setIsEditing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	
	// Profile form state
	const [profileForm, setProfileForm] = useState<ProfileFormData>({
		first_name: '',
		last_name: '',
		title: '',
		bio: '',
		phone: '',
		location: '',
		avatar: ''
	});
	
	// Avatar upload state
	const [avatar, setAvatar] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Real-time profile statistics
	const { stats, recentActivity, loading: statsLoading } = useProfileStats();

	// Quick access to tasks
	const upcomingTasks: Array<{
		id: number;
		task: string;
		due: string;
		priority: string;
		action: () => void;
	}> = [
		{ id: 1, task: 'View all tasks', due: 'Manage your tasks', priority: 'link', action: () => window.location.href = '/tasks' },
		{ id: 2, task: 'Create new task', due: 'Add a new task', priority: 'link', action: () => window.location.href = '/tasks' },
		{ id: 3, task: 'Task insights', due: 'View your progress', priority: 'link', action: () => window.location.href = '/tasks' }
	];

	useEffect(() => {
		setTitle('Profile');
	}, [setTitle]);

	useEffect(() => {
		if (user) {
			setProfileForm({
				first_name: user.first_name || '',
				last_name: user.last_name || '',
				title: user.title || 'Sales Representative',
				bio: user.bio || 'Passionate about building relationships and closing deals.',
				phone: user.phone || '',
				location: user.location || 'San Francisco, CA',
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
	};

	const handleRemoveAvatar = () => {
		setAvatar(null);
		setAvatarPreview(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const handleSave = async () => {
		if (!user) return;

		setIsLoading(true);
		try {
			let avatarPath = profileForm.avatar;

			// Upload avatar if selected
			if (avatar) {
				const fileExt = avatar.name.split('.').pop();
				const fileName = `${Date.now()}.${fileExt}`;

				const { error: uploadError } = await supabase.storage
					.from('avatars')
					.upload(fileName, avatar, {
						upsert: true,
						cacheControl: '3600',
						contentType: avatar.type
					});

				if (uploadError) throw uploadError;
				avatarPath = fileName;
			}

			// Update all profile fields
			const updateData: {
				first_name: string;
				last_name: string;
				title: string;
				bio: string;
				phone: string;
				location: string;
				avatar: string | null;
			} = {
				first_name: profileForm.first_name,
				last_name: profileForm.last_name,
				title: profileForm.title,
				bio: profileForm.bio,
				phone: profileForm.phone,
				location: profileForm.location,
				avatar: avatarPath
			};

			const { error } = await supabase
				.from('profiles')
				.update(updateData)
				.eq('id', user.id);

			if (error) throw error;

			await updateUser();
			setIsEditing(false);
			
			if (avatar) {
				setAvatar(null);
				setAvatarPreview(null);
			}
			
			toast.success('Profile updated successfully');
		} catch (error) {
			console.error('Error updating profile:', error);
			toast.error('Failed to update profile');
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancel = () => {
		if (user) {
			setProfileForm({
				first_name: user.first_name || '',
				last_name: user.last_name || '',
				title: user.title || 'Sales Representative',
				bio: user.bio || 'Passionate about building relationships and closing deals.',
				phone: user.phone || '',
				location: user.location || 'San Francisco, CA',
				avatar: user.avatar || ''
			});
			
			if (user.avatar) {
				if (user.avatar.startsWith('http')) {
					setAvatarPreview(user.avatar);
				} else {
					const { data: { publicUrl } } = supabase.storage
						.from('avatars')
						.getPublicUrl(user.avatar);
					setAvatarPreview(publicUrl);
				}
			} else {
				setAvatarPreview(null);
			}
			setAvatar(null);
		}
		setIsEditing(false);
	};

	const getActivityIcon = (type: string) => {
		switch (type) {
			case 'lead': return <User className="h-4 w-4" />;
			case 'update': return <Edit3 className="h-4 w-4" />;
			case 'communication': return <MessageSquare className="h-4 w-4" />;
			case 'call': return <Phone className="h-4 w-4" />;
			default: return <Activity className="h-4 w-4" />;
		}
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'high': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
			case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
			case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
			case 'link': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
			default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
		}
	};

	if (!user) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-500 mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading profile...</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<PageMeta title="Profile" description="View and edit your profile information" />
			
			<div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
						<p className="text-gray-600 dark:text-gray-400 mt-1">Manage your personal information and view your activity</p>
					</div>
					<div className="flex items-center space-x-3">
						{isEditing ? (
							<>
								<Button
									onClick={handleCancel}
									variant="outline"
									disabled={isLoading}
								>
									<X className="h-4 w-4 mr-2" />
									Cancel
								</Button>
								<Button
									onClick={handleSave}
									loading={isLoading}
									startIcon={<Save className="h-4 w-4" />}
								>
									Save Changes
								</Button>
							</>
						) : (
							<Button
								onClick={() => setIsEditing(true)}
								startIcon={<Edit3 className="h-4 w-4" />}
							>
								Edit Profile
							</Button>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Left Column - Profile Info */}
					<div className="lg:col-span-1 space-y-6">
						{/* Profile Card */}
						<Card>
							<CardHeader className="text-center pb-4">
								<div className="relative mx-auto mb-4">
									{isEditing ? (
										<div className="relative">
											{avatarPreview ? (
												<img
													src={avatarPreview}
													alt="Profile preview"
													className="h-32 w-32 rounded-full object-cover mx-auto"
												/>
											) : (
												<UserAvatar 
													user={{ name: `${profileForm.first_name} ${profileForm.last_name}`, avatar: null }} 
													size="lg" 
												/>
											)}
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
										<UserAvatar 
											user={{ name: `${profileForm.first_name} ${profileForm.last_name}`, avatar: user.avatar }} 
											size="lg" 
										/>
									)}
									
									{isEditing && (
										<div className="mt-3">
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
												className="cursor-pointer inline-flex items-center px-3 py-1.5 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
											>
												<Upload className="h-4 w-4 mr-1" />
												{avatarPreview ? 'Change' : 'Upload'}
											</label>
										</div>
									)}
								</div>
								
								{isEditing ? (
									<div className="space-y-3">
										<input
											type="text"
											value={profileForm.first_name}
											onChange={(e) => handleProfileChange('first_name', e.target.value)}
											placeholder="First Name"
											className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
										/>
										<input
											type="text"
											value={profileForm.last_name}
											onChange={(e) => handleProfileChange('last_name', e.target.value)}
											placeholder="Last Name"
											className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
										/>
									</div>
								) : (
									<div>
										<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
											{profileForm.first_name} {profileForm.last_name}
										</h2>
										<p className="text-gray-600 dark:text-gray-400 mt-1">
											{profileForm.title}
										</p>
									</div>
								)}
							</CardHeader>
							
							<CardContent className="space-y-4">
								{isEditing ? (
									<div className="space-y-3">
										<input
											type="text"
											value={profileForm.title}
											onChange={(e) => handleProfileChange('title', e.target.value)}
											placeholder="Job Title"
											className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
										/>
										<textarea
											value={profileForm.bio}
											onChange={(e) => handleProfileChange('bio', e.target.value)}
											placeholder="Bio"
											rows={3}
											className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
										/>
									</div>
								) : (
									<p className="text-gray-600 dark:text-gray-400 text-center">
										{profileForm.bio || 'No bio added yet. Click "Edit Profile" to add one!'}
									</p>
								)}

								<div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
									<div className="flex items-center space-x-3">
										<Mail className="h-4 w-4 text-gray-400" />
										<span className="text-sm text-gray-600 dark:text-gray-400">
											{user.email}
										</span>
									</div>
									
									{isEditing ? (
										<input
											type="tel"
											value={profileForm.phone}
											onChange={(e) => handleProfileChange('phone', e.target.value)}
											placeholder="Phone Number"
											className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
										/>
									) : profileForm.phone ? (
										<div className="flex items-center space-x-3">
											<Phone className="h-4 w-4 text-gray-400" />
											<span className="text-sm text-gray-600 dark:text-gray-400">
												{profileForm.phone}
											</span>
										</div>
									) : null}
									
									{isEditing ? (
										<input
											type="text"
											value={profileForm.location}
											onChange={(e) => handleProfileChange('location', e.target.value)}
											placeholder="Location"
											className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
										/>
									) : (
										<div className="flex items-center space-x-3">
											<MapPin className="h-4 w-4 text-gray-400" />
											<span className="text-sm text-gray-600 dark:text-gray-400">
												{profileForm.location}
											</span>
										</div>
									)}
									
									<div className="flex items-center space-x-3">
										<Building2 className="h-4 w-4 text-gray-400" />
										<span className="text-sm text-gray-600 dark:text-gray-400">
											{user.organization?.name || 'Organization'}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Quick Actions */}
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Quick Actions</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/settings'}>
									<Settings className="h-4 w-4 mr-2" />
									Settings
								</Button>
								<Button variant="outline" className="w-full justify-start" onClick={() => {
									// TODO: Implement data export functionality
									toast.info('Data export feature coming soon!');
								}}>
									<Download className="h-4 w-4 mr-2" />
									Export Data
								</Button>
							</CardContent>
						</Card>


					</div>

					{/* Right Column - Activity & Stats */}
					<div className="lg:col-span-2 space-y-6">
						{/* Personal Stats */}
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<Card>
								<CardContent className="p-4 text-center">
									<Target className="h-8 w-8 text-brand-500 mx-auto mb-2" />
									{statsLoading ? (
										<div className="animate-pulse">
											<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
											<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
										</div>
									) : (
										<>
											<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.leadsCreated}</p>
											<p className="text-sm text-gray-600 dark:text-gray-400">Leads Created</p>
										</>
									)}
								</CardContent>
							</Card>
							
							<Card>
								<CardContent className="p-4 text-center">
									<MessageSquare className="h-8 w-8 text-green-500 mx-auto mb-2" />
									{statsLoading ? (
										<div className="animate-pulse">
											<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
											<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
										</div>
									) : (
										<>
											<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.conversations}</p>
											<p className="text-sm text-gray-600 dark:text-gray-400">Conversations</p>
										</>
									)}
								</CardContent>
							</Card>
							
							<Card>
								<CardContent className="p-4 text-center">
									<TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
									{statsLoading ? (
										<div className="animate-pulse">
											<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
											<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
										</div>
									) : (
										<>
											<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.conversionRate}%</p>
											<p className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</p>
										</>
									)}
								</CardContent>
							</Card>
							
							<Card>
								<CardContent className="p-4 text-center">
									<Clock className="h-8 w-8 text-purple-500 mx-auto mb-2" />
									{statsLoading ? (
										<div className="animate-pulse">
											<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
											<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
										</div>
									) : (
										<>
											<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.responseTime}</p>
											<p className="text-sm text-gray-600 dark:text-gray-400">Avg Response</p>
										</>
									)}
								</CardContent>
							</Card>
						</div>

						{/* Recent Activity */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Activity className="h-5 w-5" />
									Recent Activity
								</CardTitle>
								<CardDescription>Your latest actions and updates</CardDescription>
							</CardHeader>
							<CardContent>
								{statsLoading ? (
									<div className="space-y-4">
										{Array.from({ length: 3 }).map((_, index) => (
											<div key={index} className="flex items-center space-x-3 p-3 rounded-lg">
												<div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
												<div className="flex-1 space-y-2">
													<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
													<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
												</div>
												<div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
											</div>
										))}
									</div>
								) : recentActivity.length > 0 ? (
									<div className="space-y-4">
										{recentActivity.map((activity) => (
											<div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
												<div className="flex-shrink-0 text-gray-400">
													{getActivityIcon(activity.type)}
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium text-gray-900 dark:text-white">
														{activity.action}
													</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														{activity.target}
													</p>
												</div>
												<span className="text-xs text-gray-400">
													{activity.time}
												</span>
											</div>
										))}
									</div>
								) : (
									<div className="p-4 text-center text-gray-500">
										<p className="text-sm">No recent activity</p>
										<p className="text-xs text-gray-400 mt-1">Your activity will appear here</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Upcoming Tasks */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Calendar className="h-5 w-5" />
									Upcoming Tasks
								</CardTitle>
								<CardDescription>Tasks that need your attention</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{upcomingTasks.map((task) => (
										<button
											key={task.id}
											onClick={task.action}
											className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer text-left"
										>
											<div className="flex items-center space-x-3">
												<div className="w-2 h-2 rounded-full bg-gray-300"></div>
												<span className="text-sm font-medium text-gray-900 dark:text-white">
													{task.task}
												</span>
											</div>
											<div className="flex items-center space-x-2">
												<span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
													{task.priority}
												</span>
												<span className="text-xs text-gray-500 dark:text-gray-400">
													{task.due}
												</span>
											</div>
										</button>
									))}
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</>
	);
}

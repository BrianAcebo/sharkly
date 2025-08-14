import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';

import { toast } from 'sonner';
import UserAvatar from '../components/common/UserAvatar';
import { 
	Bell, 
	Check, 
	Trash2, 
	Search,
	RefreshCw,
	MessageSquare,
	Target,
	Bot,
	Calendar,
	Info,
	Clock
} from 'lucide-react';
import PageMeta from '../components/common/PageMeta';

interface Notification {
	id: string;
	user_id: string;
	type: 'lead' | 'ai' | 'communication' | 'system' | 'reminder';
	title: string;
	message: string;
	read: boolean;
	action_url?: string;
	created_at: string;
	metadata?: {
		lead_id?: string;
		conversation_id?: string;
		organization_id?: string;
		priority?: 'low' | 'medium' | 'high';
		due_date?: string;
	};
}

type NotificationFilter = 'all' | 'unread' | 'lead' | 'ai' | 'communication' | 'system' | 'reminder';

export default function NotificationsPage() {
	const { user } = useAuth();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

	// Mock notifications for now - replace with real data from Supabase
	const mockNotifications: Notification[] = [
		{
			id: '1',
			user_id: user?.id || '',
			type: 'lead',
			title: 'New Lead Assigned',
			message: 'John Smith from TechCorp has been assigned to you. This is a high-value prospect with 95% match score.',
			read: false,
			action_url: '/leads/123',
			created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
			metadata: {
				lead_id: '123',
				priority: 'high'
			}
		},
		{
			id: '2',
			user_id: user?.id || '',
			type: 'ai',
			title: 'AI Insights Ready',
			message: 'Your AI assistant has analyzed recent conversations and identified 3 follow-up opportunities.',
			read: false,
			action_url: '/assistant',
			created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
			metadata: {
				priority: 'medium'
			}
		},
		{
			id: '3',
			user_id: user?.id || '',
			type: 'reminder',
			title: 'Follow-up Due',
			message: 'Follow up with Sarah Johnson from InnovateTech is due today. AI suggests discussing their Q4 budget.',
			read: true,
			action_url: '/leads/456',
			created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
			metadata: {
				lead_id: '456',
				priority: 'high',
				due_date: new Date().toISOString()
			}
		},
		{
			id: '4',
			user_id: user?.id || '',
			type: 'communication',
			title: 'Team Mention',
			message: 'Mike Chen mentioned you in a conversation about the Enterprise deal strategy.',
			read: false,
			action_url: '/chat',
			created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
			metadata: {
				priority: 'medium'
			}
		},
		{
			id: '5',
			user_id: user?.id || '',
			type: 'system',
			title: 'Weekly Report Available',
			message: 'Your weekly sales performance report is ready. You\'ve exceeded your quota by 15%.',
			read: true,
			action_url: '/reports',
			created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
			metadata: {
				priority: 'low'
			}
		}
	];

	useEffect(() => {
		// Load notifications (using mock data for now)
		setNotifications(mockNotifications);
		setIsLoading(false);
	}, []);

	useEffect(() => {
		// Filter notifications based on active filter and search query
		let filtered = notifications;

		// Apply type filter
		if (activeFilter !== 'all') {
			if (activeFilter === 'unread') {
				filtered = filtered.filter(n => !n.read);
			} else {
				filtered = filtered.filter(n => n.type === activeFilter);
			}
		}

		// Apply search filter
		if (searchQuery) {
			filtered = filtered.filter(n => 
				n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				n.message.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}

		setFilteredNotifications(filtered);
	}, [notifications, activeFilter, searchQuery]);

	const getNotificationIcon = (type: string) => {
		switch (type) {
			case 'lead':
				return <Target className="h-5 w-5 text-blue-500" />;
			case 'ai':
				return <Bot className="h-5 w-5 text-purple-500" />;
			case 'communication':
				return <MessageSquare className="h-5 w-5 text-green-500" />;
			case 'system':
				return <Info className="h-5 w-5 text-gray-500" />;
			case 'reminder':
				return <Clock className="h-5 w-5 text-orange-500" />;
			default:
				return <Bell className="h-5 w-5 text-gray-500" />;
		}
	};

	const getPriorityColor = (priority?: string) => {
		switch (priority) {
			case 'high':
				return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
			case 'medium':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
			case 'low':
				return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
		}
	};

	const formatTimeAgo = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

		if (diffInMinutes < 1) return 'Just now';
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
		return `${Math.floor(diffInMinutes / 1440)}d ago`;
	};

	const markAsRead = async (notificationId: string) => {
		try {
			// Update local state
			setNotifications(prev => 
				prev.map(n => 
					n.id === notificationId ? { ...n, read: true } : n
				)
			);

			// TODO: Update in Supabase
			// await supabase
			// 	.from('notifications')
			// 	.update({ read: true })
			// 	.eq('id', notificationId);

			toast.success('Notification marked as read');
		} catch (error) {
			console.error('Error marking notification as read:', error);
			toast.error('Failed to mark notification as read');
		}
	};

	const markAllAsRead = async () => {
		setIsMarkingAllRead(true);
		try {
			// Update local state
			setNotifications(prev => 
				prev.map(n => ({ ...n, read: true }))
			);

			// TODO: Update in Supabase
			// await supabase
			// 	.from('notifications')
			// 	.update({ read: true })
			// 	.eq('user_id', user?.id);

			toast.success('All notifications marked as read');
		} catch (error) {
			console.error('Error marking all notifications as read:', error);
			toast.error('Failed to mark all notifications as read');
		} finally {
			setIsMarkingAllRead(false);
		}
	};

	const deleteNotification = async (notificationId: string) => {
		try {
			// Remove from local state
			setNotifications(prev => prev.filter(n => n.id !== notificationId));

			// TODO: Delete from Supabase
			// await supabase
			// 	.from('notifications')
			// 	.delete()
			// 	.eq('id', notificationId);

			toast.success('Notification deleted');
		} catch (error) {
			console.error('Error deleting notification:', error);
			toast.error('Failed to delete notification');
		}
	};

	const handleNotificationClick = (notification: Notification) => {
		// Mark as read if not already read
		if (!notification.read) {
			markAsRead(notification.id);
		}

		// Navigate to action URL if available
		if (notification.action_url) {
			window.location.href = notification.action_url;
		}
	};

	const filters: { key: NotificationFilter; label: string; count: number }[] = [
		{ key: 'all', label: 'All', count: notifications.length },
		{ key: 'unread', label: 'Unread', count: notifications.filter(n => !n.read).length },
		{ key: 'lead', label: 'Leads', count: notifications.filter(n => n.type === 'lead').length },
		{ key: 'ai', label: 'AI', count: notifications.filter(n => n.type === 'ai').length },
		{ key: 'communication', label: 'Team', count: notifications.filter(n => n.type === 'communication').length },
		{ key: 'reminder', label: 'Reminders', count: notifications.filter(n => n.type === 'reminder').length },
		{ key: 'system', label: 'System', count: notifications.filter(n => n.type === 'system').length }
	];

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
					<p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<PageMeta title="Notifications" description="View and manage your notifications" />
			<div className="container mx-auto px-4 py-8 max-w-6xl">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-2">
						Stay updated with your leads, AI insights, and team communications
					</p>
				</div>

				{/* Header Actions */}
				<div className="flex flex-col sm:flex-row gap-4 mb-6">
					<div className="flex-1">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
							<input
								type="text"
								placeholder="Search notifications..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
					</div>
					<div className="flex gap-3">
						<Button
							onClick={markAllAsRead}
							disabled={isMarkingAllRead || notifications.every(n => n.read)}
							loading={isMarkingAllRead}
							variant="outline"
							startIcon={<Check className="h-4 w-4" />}
						>
							{isMarkingAllRead ? 'Marking...' : 'Mark All Read'}
						</Button>
						<Button
							onClick={() => window.location.reload()}
							variant="outline"
							startIcon={<RefreshCw className="h-4 w-4" />}
						>
							Refresh
						</Button>
					</div>
				</div>

				{/* Filters */}
				<div className="flex flex-wrap gap-2 mb-6">
					{filters.map((filter) => (
						<button
							key={filter.key}
							onClick={() => setActiveFilter(filter.key)}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
								activeFilter === filter.key
									? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
									: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
							}`}
						>
							{filter.label}
							<span className="ml-2 px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs">
								{filter.count}
							</span>
						</button>
					))}
				</div>

				{/* Notifications List */}
				<div className="space-y-4">
					{filteredNotifications.length === 0 ? (
						<Card>
							<CardContent className="py-12 text-center">
								<Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
								<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
									No notifications found
								</h3>
								<p className="text-gray-500 dark:text-gray-400">
									{searchQuery 
										? 'Try adjusting your search terms' 
										: activeFilter !== 'all' 
											? 'Try changing your filter selection'
											: 'You\'re all caught up!'
									}
								</p>
							</CardContent>
						</Card>
					) : (
						filteredNotifications.map((notification) => (
							<Card 
								key={notification.id} 
								className={`transition-all duration-200 hover:shadow-md ${
									!notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : ''
								}`}
							>
								<CardContent className="p-6">
									<div className="flex items-start gap-4">
										<div className="flex-shrink-0 mt-1">
											{notification.metadata?.user ? (
												<UserAvatar user={notification.metadata.user} size="md" />
											) : (
												<div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
													{getNotificationIcon(notification.type)}
												</div>
											)}
										</div>
										
										<div className="flex-1 min-w-0">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<div className="flex items-center gap-3 mb-2">
														<h3 className={`font-medium ${
															!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
														}`}>
															{notification.title}
														</h3>
														{notification.metadata?.priority && (
															<span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(notification.metadata.priority)}`}>
																{notification.metadata.priority}
															</span>
														)}
													</div>
													<p className="text-gray-600 dark:text-gray-400 mb-3">
														{notification.message}
													</p>
													<div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
														<span>{formatTimeAgo(notification.created_at)}</span>
														{notification.metadata?.due_date && (
															<span className="flex items-center gap-1">
																<Calendar className="h-4 w-4" />
																Due: {new Date(notification.metadata.due_date).toLocaleDateString()}
															</span>
														)}
													</div>
												</div>
												
												<div className="flex items-center gap-2 ml-4">
													{!notification.read && (
														<Button
															onClick={() => markAsRead(notification.id)}
															variant="ghost"
															size="sm"
															className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
														>
															<Check className="h-4 w-4" />
														</Button>
													)}
													<Button
														onClick={() => deleteNotification(notification.id)}
														variant="ghost"
														size="sm"
														className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</div>
											
											{notification.action_url && (
												<Button
													onClick={() => handleNotificationClick(notification)}
													variant="outline"
													size="sm"
													className="mt-3"
												>
													View Details
												</Button>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						))
					)}
				</div>

				{/* Load More Button */}
				{filteredNotifications.length > 0 && (
					<div className="text-center mt-8">
						<Button
							variant="outline"
							onClick={() => toast.info('Load more functionality coming soon')}
						>
							Load More Notifications
						</Button>
					</div>
				)}
			</div>
		</>
	);
}

import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useNotifications } from '../hooks/useNotifications';
import { notificationService } from '../utils/notificationService';
import { toast } from 'sonner';
import UserAvatar from '../components/common/UserAvatar';
import { 
	Bell,
	CheckCircle,
	Info,
	Bug,
	TestTube,
	ChevronDown,
	ChevronRight,
	Trash2,
	RefreshCw,
	MessageSquare,
	Target,
	Bot,
	Calendar,
	Clock,
	Search
} from 'lucide-react';
import PageMeta from '../components/common/PageMeta';
import { formatDateSafe } from '../utils/dateUtils';

// Use the Notification interface from the context instead of defining our own
import { type Notification } from '../contexts/NotificationsContext';

type NotificationFilter = 'all' | 'unread' | 'lead' | 'ai' | 'communication' | 'system' | 'reminder';

export default function NotificationsPage() {
	const { 
		notifications, 
		loading: isLoading, 
		markAsRead, 
		markAllAsRead,
		deleteNotification: deleteNotificationFromContext,
		deleteAllNotifications: deleteAllNotificationsFromContext,
		testWebSocketConnection,
		testWebSocketDataReception
	} = useNotifications();
	const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
	const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
	const [isDeletingAll, setIsDeletingAll] = useState(false);

	const toggleNotification = (notificationId: string) => {
		const newExpanded = new Set(expandedNotifications);
		if (newExpanded.has(notificationId)) {
			newExpanded.delete(notificationId);
		} else {
			newExpanded.add(notificationId);
		}
		setExpandedNotifications(newExpanded);
	};

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





	const handleDeleteNotification = (notificationId: string) => {
		setNotificationToDelete(notificationId);
		setShowDeleteConfirm(true);
	};

	const confirmDeleteNotification = async () => {
		if (!notificationToDelete) return;
		
		setIsDeleting(true);
		try {
			await deleteNotificationFromContext(notificationToDelete);
			toast.success('Notification deleted');
		} catch (error) {
			console.error('Error deleting notification:', error);
			toast.error('Failed to delete notification');
		} finally {
			setIsDeleting(false);
			setShowDeleteConfirm(false);
			setNotificationToDelete(null);
		}
	};

	const cancelDeleteNotification = () => {
		setShowDeleteConfirm(false);
		setNotificationToDelete(null);
	};

	const handleDeleteAllNotifications = () => {
		setShowDeleteAllConfirm(true);
	};

	const confirmDeleteAllNotifications = async () => {
		setIsDeletingAll(true);
		try {
			await deleteAllNotificationsFromContext();
			toast.success('All notifications deleted');
		} catch (error) {
			console.error('Error deleting all notifications:', error);
			toast.error('Failed to delete all notifications');
		} finally {
			setIsDeletingAll(false);
			setShowDeleteAllConfirm(false);
		}
	};

	const cancelDeleteAllNotifications = () => {
		setShowDeleteAllConfirm(false);
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
					<div>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
						<p className="text-gray-600 dark:text-gray-400 mt-2">
							Stay updated with your leads, AI insights, and team communications
						</p>
						<div className="mt-3 flex items-center gap-4 text-sm">
							<span className="text-gray-500 dark:text-gray-400">
								Total: {notifications.length}
							</span>
							<span className="text-blue-600 dark:text-blue-400 font-medium">
								Unread: {notifications.filter(n => !n.read).length}
							</span>
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-green-500" />
								<span className="text-xs text-green-600 dark:text-green-400">
									Polling every 15s
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Header Actions */}
				<div className="flex flex-col sm:flex-row gap-4 mb-6">
					<div className="flex-1">
						<div className="relative">
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
							disabled={notifications.every(n => n.read)}
							variant="outline"
							startIcon={<CheckCircle className="h-4 w-4" />}
						>
							Mark All Read
						</Button>
						<Button
							onClick={handleDeleteAllNotifications}
							disabled={notifications.length === 0}
							variant="outline"
							className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20"
						>
							Delete All
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

				{/* Debug Section */}
				<Card className="mb-6 border-orange-200 dark:border-orange-800">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
							<Bug className="h-5 w-5" />
							Notification System Debug
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<h4 className="font-medium mb-2">System Status</h4>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span>Initialized:</span>
											<Badge variant={notificationService.getDebugInfo().isInitialized ? "default" : "destructive"}>
												{notificationService.getDebugInfo().isInitialized ? "Yes" : "No"}
											</Badge>
										</div>
										<div className="flex justify-between">
											<span>System Type:</span>
											<Badge variant="default">
												{notificationService.getDebugInfo().systemType}
											</Badge>
										</div>
										<div className="flex justify-between">
											<span>Reminder System:</span>
											<Badge variant="default">
												{notificationService.getDebugInfo().reminderCheckActive}
											</Badge>
										</div>
										<div className="flex justify-between">
											<span>Check Method:</span>
											<Badge variant="outline">
												{notificationService.getDebugInfo().reminderCheckInterval}
											</Badge>
										</div>
										<div className="flex justify-between">
											<span>Browser Permission:</span>
											<Badge variant={notificationService.getDebugInfo().browserPermission === 'granted' ? "default" : "destructive"}>
												{notificationService.getDebugInfo().browserPermission}
											</Badge>
										</div>
									</div>
								</div>
								<div>
									<h4 className="font-medium mb-2">Test Actions</h4>
									<div className="space-y-2">
										<Button
											onClick={() => notificationService.testNotificationSystem()}
											variant="outline"
											size="sm"
											startIcon={<TestTube className="h-4 w-4" />}
											className="w-full"
										>
											Test Notification System
										</Button>
										<Button
											onClick={() => notificationService.triggerReminderCheck()}
											variant="outline"
											size="sm"
											startIcon={<RefreshCw className="h-4 w-4" />}
											className="w-full"
										>
											Check Task Reminders Now
										</Button>
										<Button
											onClick={() => notificationService.debugTaskReminders()}
											variant="outline"
											size="sm"
											startIcon={<Search className="h-4 w-4" />}
											className="w-full"
										>
											Debug Task Reminders Table
										</Button>
										<Button
											onClick={testWebSocketConnection}
											variant="outline"
											size="sm"
											startIcon={<TestTube className="h-4 w-4" />}
											className="w-full"
										>
											Test Notification Sound
										</Button>
										<Button
											onClick={testWebSocketDataReception}
											variant="outline"
											size="sm"
											startIcon={<TestTube className="h-4 w-4" />}
											className="w-full"
										>
											Test Notification Creation
										</Button>
										<Button
											onClick={() => {
												const debugInfo = notificationService.getDebugInfo();
												console.log('🔍 Debug Info:', debugInfo);
												toast.info('Debug info logged to console');
											}}
											variant="outline"
											size="sm"
											startIcon={<Info className="h-4 w-4" />}
											className="w-full"
										>
											Log Debug Info
										</Button>
									</div>
								</div>
							</div>
							<div className="text-sm text-gray-600 dark:text-gray-400">
								<strong>Note:</strong> If you're not getting overdue task reminders, use the test button above to diagnose the issue. Check the browser console for detailed logs.
							</div>
						</div>
					</CardContent>
				</Card>

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
									{/* Clickable Header */}
									<div 
										onClick={() => toggleNotification(notification.id)}
										className="flex items-start gap-4 cursor-pointer"
									>
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
														{notification.priority && (
															<span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(notification.priority)}`}>
																{notification.priority}
															</span>
														)}
													</div>
													<p className="text-gray-600 dark:text-gray-400 mb-3">
														{notification.message}
													</p>
													<div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
														<span>{formatTimeAgo(notification.timestamp)}</span>
														{notification.metadata?.due_date && (
															<span className="flex items-center gap-1">
																<Calendar className="h-4 w-4" />
																Due: {formatDateSafe(notification.metadata.due_date, 'long')}
															</span>
														)}
													</div>
												</div>
												
												<div className="flex items-center gap-2 ml-4">
													{/* Expand/Collapse Icon */}
													{expandedNotifications.has(notification.id) ? (
														<ChevronDown className="h-4 w-4 text-gray-400" />
													) : (
														<ChevronRight className="h-4 w-4 text-gray-400" />
													)}
													
													{!notification.read && (
														<Button
															onClick={(e) => {
																e.stopPropagation();
																markAsRead(notification.id);
															}}
															variant="ghost"
															size="sm"
															className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
														>
															<CheckCircle className="h-4 w-4" />
														</Button>
													)}
													<Button
														onClick={(e) => {
															e.stopPropagation();
															handleDeleteNotification(notification.id);
														}}
														variant="ghost"
														size="sm"
														className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
														title="Delete notification"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</div>
											
											{notification.actionUrl && (
												<Button
													onClick={(e) => {
														e.stopPropagation();
														window.open(notification.actionUrl, '_blank');
													}}
													variant="outline"
													size="sm"
													className="mt-3"
												>
													View Details
												</Button>
											)}
										</div>
									</div>

									{/* Expandable Content */}
									{expandedNotifications.has(notification.id) && (
										<div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
											<div className="space-y-3">
												{/* Additional Details */}
												<div className="text-sm text-gray-600 dark:text-gray-400">
													<div className="grid grid-cols-2 gap-4">
														<div>
															<span className="font-medium">Type:</span>
															<span className="ml-2 capitalize">{notification.type}</span>
														</div>
														{notification.priority && (
															<div>
																<span className="font-medium">Priority:</span>
																<span className="ml-2 capitalize">{notification.priority}</span>
															</div>
														)}
														<div>
															<span className="font-medium">Status:</span>
															<span className="ml-2 capitalize">{notification.read ? 'Read' : 'Unread'}</span>
														</div>
													</div>
												</div>
												
												{/* Action Buttons */}
												<div className="text-sm">
													<div className="font-medium mb-2">Actions</div>
													<div className="flex gap-2">
														{(notification.metadata?.lead_id || notification.type === 'lead') && (
															<Button
																onClick={(e) => {
																	e.stopPropagation();
																	if (notification.metadata?.lead_id) {
																		window.location.href = `/leads/${notification.metadata?.lead_id}`;
																	} else {
																		window.location.href = `/leads`;
																	}
																}}
																variant="outline"
																size="sm"
																className="text-blue-600 hover:text-blue-700"
															>
																{notification.metadata?.lead_id ? 'View Lead' : 'View All Leads'}
															</Button>
														)}
														{(notification.metadata?.task_id || notification.type === 'reminder') && (
															<Button
																onClick={(e) => {
																	e.stopPropagation();
																	window.location.href = `/tasks`;
																}}
																variant="outline"
																size="sm"
																className="text-green-600 hover:text-green-700"
															>
																{notification.metadata?.task_id ? 'View Task' : 'View All Tasks'}
															</Button>
														)}
														{notification.type === 'ai' && (
															<Button
																onClick={(e) => {
																	e.stopPropagation();
																	window.location.href = `/assistant`;
																}}
																variant="outline"
																size="sm"
																className="text-purple-600 hover:text-purple-700"
															>
																View Assistant
															</Button>
														)}
														{notification.actionUrl && (
															<Button
																onClick={(e) => {
																	e.stopPropagation();
																	window.open(notification.actionUrl, '_blank');
																}}
																variant="outline"
																size="sm"
																className="text-gray-600 hover:text-gray-700"
															>
																View Details
															</Button>
														)}
													</div>
												</div>
											</div>
										</div>
									)}
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

			{/* Delete Single Notification Confirmation Modal */}
			{showDeleteConfirm && notificationToDelete && (
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
									Delete Notification
								</h3>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Are you sure you want to delete this notification?
								</p>
							</div>
						</div>
						
						<div className="mb-6">
							<p className="text-sm text-gray-600 dark:text-gray-300">
								This action cannot be undone. The notification will be permanently removed.
							</p>
						</div>

						<div className="flex space-x-3">
							<Button
								type="button"
								variant="outline"
								onClick={cancelDeleteNotification}
								disabled={isDeleting}
								className="flex-1"
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={confirmDeleteNotification}
								disabled={isDeleting}
								className="flex-1"
							>
								{isDeleting ? (
									<>
										<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
										Deleting...
									</>
								) : (
									'Delete Notification'
								)}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Delete All Notifications Confirmation Modal */}
			{showDeleteAllConfirm && (
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
									Delete All Notifications
								</h3>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Are you sure you want to delete all {notifications.length} notifications?
								</p>
							</div>
						</div>
						
						<div className="mb-6">
							<p className="text-sm text-gray-600 dark:text-gray-300">
								This action cannot be undone. All {notifications.length} notifications will be permanently removed.
							</p>
						</div>

						<div className="flex space-x-3">
							<Button
								type="button"
								variant="outline"
								onClick={cancelDeleteAllNotifications}
								disabled={isDeletingAll}
								className="flex-1"
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={confirmDeleteAllNotifications}
								disabled={isDeletingAll}
								className="flex-1"
							>
								{isDeletingAll ? (
									<>
										<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
										Deleting...
									</>
								) : (
									'Delete All Notifications'
								)}
							</Button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

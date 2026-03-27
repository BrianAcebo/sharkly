import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';
import { useNotifications } from '../hooks/useNotifications';
import { Notification } from '../types/notifications';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '../components/ui/alert-dialog';
import {
	Bell,
	Target,
	Bot,
	MessageSquare,
	Info,
	Clock,
	Trash2,
	Check,
	RefreshCw,
	Search,
	Calendar,
	Eye
} from 'lucide-react';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/shared/StatCard';
import Input from '../components/form/input/InputField';
import Select from '../components/form/Select';
import {
	NotificationMetadataSection,
	hasRenderableNotificationMetadata
} from '../components/notifications/NotificationMetadataSection';

export default function Notifications() {
	const { user } = useAuth();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [typeFilter, setTypeFilter] = useState<string>('all');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [showDeleteButtons, setShowDeleteButtons] = useState<Set<string>>(new Set());
	const [deletingNotifications, setDeletingNotifications] = useState<Set<string>>(new Set());
	const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
	const [isDeletingAll, setIsDeletingAll] = useState(false);

	const { serviceAvailable, lastError, retryService, stopRetries } = useNotifications();

	const fetchNotifications = useCallback(async () => {
		if (!user) return;

		setLoading(true);
		try {
			const { data, error } = await supabase
				.from('notifications')
				.select('*')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false });

			if (error) throw error;
			setNotifications(data || []);
		} catch (error) {
			console.error('Error fetching notifications:', error);
			toast.error('Failed to fetch notifications');
		} finally {
			setLoading(false);
		}
	}, [user]);

	const markAsRead = async (notificationId: string) => {
		try {
			const { error } = await supabase
				.from('notifications')
				.update({ read: true, read_at: new Date().toISOString() })
				.eq('id', notificationId);

			if (error) throw error;

			setNotifications((prev) =>
				prev.map((n) =>
					n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
				)
			);

			toast.success('Notification marked as read');
		} catch (error) {
			console.error('Error marking notification as read:', error);
			toast.error('Failed to mark notification as read');
		}
	};

	const markAllAsRead = async () => {
		try {
			const { error } = await supabase
				.from('notifications')
				.update({ read: true, read_at: new Date().toISOString() })
				.eq('user_id', user?.id)
				.eq('read', false);

			if (error) throw error;

			setNotifications((prev) =>
				prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
			);

			toast.success('All notifications marked as read');
		} catch (error) {
			console.error('Error marking all notifications as read:', error);
			toast.error('Failed to mark all notifications as read');
		}
	};

	const toggleDeleteButton = (notificationId: string) => {
		setShowDeleteButtons((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(notificationId)) {
				newSet.delete(notificationId);
			} else {
				newSet.add(notificationId);
			}
			return newSet;
		});
	};

	const deleteNotification = async (notificationId: string) => {
		setDeletingNotifications((prev) => new Set(prev).add(notificationId));

		try {
			const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

			if (error) throw error;

			setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
			toast.success('Notification deleted');
			setShowDeleteButtons((prev) => {
				const newSet = new Set(prev);
				newSet.delete(notificationId);
				return newSet;
			});
		} catch (error) {
			console.error('Error deleting notification:', error);
			toast.error('Failed to delete notification');
		} finally {
			setDeletingNotifications((prev) => {
				const newSet = new Set(prev);
				newSet.delete(notificationId);
				return newSet;
			});
		}
	};

	const closeAllDeleteButtons = () => {
		setShowDeleteButtons(new Set());
	};

	const deleteAllNotifications = async () => {
		try {
			const { error } = await supabase.from('notifications').delete().eq('user_id', user?.id);

			if (error) throw error;

			setNotifications([]);
			toast.success('All notifications deleted');
		} catch (error) {
			console.error('Error deleting all notifications:', error);
			toast.error('Failed to delete all notifications');
		} finally {
			setIsDeletingAll(false);
			setShowDeleteAllConfirm(false);
		}
	};

	const getNotificationIcon = (type: string) => {
		switch (type) {
			case 'lead':
			case 'lead_assignment':
				return <Target className="h-5 w-5 text-blue-500" />;
			case 'ai':
			case 'ai_call_completed':
				return <Bot className="h-5 w-5 text-purple-500" />;
			case 'ai_meeting_booked':
				return <Bot className="h-5 w-5 text-green-500" />;
			case 'ai_callback':
				return <Clock className="h-5 w-5 text-blue-500" />;
			case 'communication':
				return <MessageSquare className="h-5 w-5 text-green-500" />;
			case 'system':
				return <Info className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
			case 'task_reminder':
				return <Clock className="h-5 w-5 text-orange-500" />;
			case 'credit_refund':
			case 'strategy_refund':
				return <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
			default:
				return <Target className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
		}
	};

	const formatTimeAgo = (timestamp: string) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

		if (diffInMinutes < 1) return 'Just now';
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
		return `${Math.floor(diffInMinutes / 1440)}d ago`;
	};

	const filteredNotifications = notifications.filter((notification) => {
		const matchesSearch =
			notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			notification.message.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesType = typeFilter === 'all' || notification.type === typeFilter;
		const matchesStatus =
			statusFilter === 'all' ||
			(statusFilter === 'unread' && !notification.read) ||
			(statusFilter === 'read' && notification.read);

		return matchesSearch && matchesType && matchesStatus;
	});

	const totalCount = notifications.length;
	const unreadCount = notifications.filter((n) => !n.read).length;
	const readCount = notifications.filter((n) => n.read).length;

	useEffect(() => {
		fetchNotifications();
	}, [user, fetchNotifications]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.notification-item')) {
				closeAllDeleteButtons();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	if (!user) {
		return (
			<div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900">
				<Bell className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
				<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Please sign in to view notifications</h2>
			</div>
		);
	}

	const panelCardClass =
		'rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900';

	return (
		<>
			<PageMeta title="Notifications" description="View and manage your notifications" />

			<div className="space-y-6">
				<PageHeader
					title="Notifications"
					subtitle="Task reminders, credit refunds, and product updates"
					rightContent={
						<div className="flex flex-wrap items-center justify-end gap-2">
							<Button
								onClick={markAllAsRead}
								variant="outline"
								size="sm"
								disabled={unreadCount === 0}
							>
								<Check className="mr-1.5 h-4 w-4" />
								Mark all read
							</Button>
							<Button
								onClick={() => setShowDeleteAllConfirm(true)}
								variant="outline"
								size="sm"
								className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
								disabled={totalCount === 0}
							>
								<Trash2 className="mr-1.5 h-4 w-4" />
								Delete all
							</Button>
						</div>
					}
				/>

				{!serviceAvailable && (
					<div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm dark:border-red-900/50 dark:bg-red-950/30">
						<div className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
						<span className="font-medium text-red-800 dark:text-red-300">Notification service unavailable</span>
						<Button onClick={retryService} variant="outline" size="sm" className="h-8 text-xs">
							<RefreshCw className="mr-1 h-3 w-3" />
							Retry
						</Button>
					</div>
				)}

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<StatCard label="Total" value={String(totalCount)} delta="in your inbox" deltaDirection="neutral" />
					<StatCard
						label="Unread"
						value={String(unreadCount)}
						delta={unreadCount > 0 ? 'needs attention' : 'all caught up'}
						deltaDirection="neutral"
					/>
					<StatCard label="Read" value={String(readCount)} delta="archived" deltaDirection="neutral" />
				</div>

				<Card className={panelCardClass}>
					<CardContent className="p-4 sm:p-5">
						<div className="grid grid-cols-1 gap-3 md:grid-cols-4">
							<div>
								<label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
									Search
								</label>
								<div className="relative">
									<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
									<Input
										type="text"
										placeholder="Search notifications..."
										value={searchQuery}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
										className="pl-10"
									/>
								</div>
							</div>

							<div>
								<label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
									Type
								</label>
								<Select
									defaultValue={typeFilter}
									onChange={(value: string) => setTypeFilter(value)}
									options={[
										{ value: 'all', label: 'All Types' },
										{ value: 'credit_refund', label: 'Credit refunds' },
										{ value: 'task_reminder', label: 'Task Reminders' },
										{ value: 'lead', label: 'Lead Updates' },
										{ value: 'ai', label: 'AI Insights' },
										{ value: 'ai_call_completed', label: 'AI Calls' },
										{ value: 'ai_meeting_booked', label: 'AI Meetings' },
										{ value: 'ai_callback', label: 'AI Callbacks' },
										{ value: 'communication', label: 'Communications' },
										{ value: 'system', label: 'System' }
									]}
								/>
							</div>

							<div>
								<label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
									Status
								</label>
								<Select
									defaultValue={statusFilter}
									onChange={(value: string) => setStatusFilter(value)}
									options={[
										{ value: 'all', label: 'All Status' },
										{ value: 'unread', label: 'Unread' },
										{ value: 'read', label: 'Read' }
									]}
								/>
							</div>

							<div className="flex items-end">
								<Button
									onClick={fetchNotifications}
									variant="outline"
									className="w-full"
									disabled={loading}
								>
									<RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
									Refresh
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				{loading ? (
					<div className="flex min-h-[200px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
						<div className="text-center">
							<RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
							<p className="text-sm text-gray-600 dark:text-gray-400">Loading notifications...</p>
						</div>
					</div>
				) : !serviceAvailable ? (
					<div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-10 text-center dark:border-gray-700 dark:bg-gray-900">
						<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
							<Bell className="h-8 w-8 text-red-500 dark:text-red-400" />
						</div>
						<h3 className="font-syne text-lg font-bold text-gray-900 dark:text-white">
							Notification service unavailable
						</h3>
						<p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
							We&apos;re unable to connect to the notification service. This may be a temporary
							network issue or maintenance.
						</p>
						{lastError && (
							<div className="mt-4 max-w-lg rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
								<strong className="font-medium">Error:</strong> {lastError}
							</div>
						)}
						<div className="mt-6 flex flex-wrap justify-center gap-2">
							<Button onClick={retryService} variant="outline">
								<RefreshCw className="mr-2 h-4 w-4" />
								Retry connection
							</Button>
							<Button onClick={stopRetries} variant="outline" className="text-gray-600 dark:text-gray-400">
								Stop retrying
							</Button>
						</div>
					</div>
				) : filteredNotifications.length === 0 ? (
					<div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
							<Bell className="h-8 w-8 text-gray-500 dark:text-gray-400" />
						</div>
						<h3 className="font-syne mt-4 text-lg font-bold text-gray-900 dark:text-white">
							{notifications.length === 0 ? 'No notifications yet' : 'No matching notifications'}
						</h3>
						<p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-400">
							{notifications.length === 0
								? "You'll see task reminders and important updates here when they arrive."
								: 'Try adjusting your search or filters.'}
						</p>
					</div>
				) : (
					<div className="flex flex-col gap-4">
						{filteredNotifications.map((notification) => (
							<div
								key={notification.id}
								className={`notification-item rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900 ${
									!notification.read
										? 'border-l-[3px] border-l-blue-500 bg-blue-50/50 dark:border-gray-700 dark:border-l-blue-500 dark:bg-blue-950/25'
										: ''
								}`}
							>
								<div className="flex items-start gap-4">
									<div className="mt-0.5 shrink-0">{getNotificationIcon(notification.type)}</div>

									<div className="min-w-0 flex-1">
										<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
											<div className="min-w-0 flex-1 space-y-1.5">
												<div className="flex flex-wrap items-center gap-1.5">
													<h3
														className={`text-sm font-semibold leading-snug ${
															!notification.read
																? 'text-gray-900 dark:text-white'
																: 'text-gray-800 dark:text-gray-200'
														}`}
													>
														{notification.title}
													</h3>
													{!notification.read && (
														<Badge
															variant="secondary"
															className="h-5 bg-brand-50 px-1.5 text-[10px] font-medium text-brand-800 dark:bg-brand-950/50 dark:text-brand-200"
														>
															New
														</Badge>
													)}
													<Badge
														variant="outline"
														className="h-5 border-gray-200 px-1.5 text-[10px] font-normal capitalize text-gray-600 dark:border-gray-600 dark:text-gray-400"
													>
														{notification.type.replace(/_/g, ' ')}
													</Badge>
												</div>

												<p
													className={`text-sm leading-relaxed ${
														!notification.read
															? 'text-gray-700 dark:text-gray-300'
															: 'text-gray-600 dark:text-gray-400'
													}`}
												>
													{notification.message}
												</p>

												{hasRenderableNotificationMetadata(notification) && (
													<NotificationMetadataSection notification={notification} />
												)}

												<div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
													<span className="inline-flex items-center gap-1">
														<Calendar className="size-3.5 shrink-0 opacity-70" />
														{formatTimeAgo(notification.created_at)}
													</span>
													{notification.read && notification.read_at && (
														<span className="inline-flex items-center gap-1">
															<Eye className="size-3.5 shrink-0 opacity-70" />
															Read {formatTimeAgo(notification.read_at)}
														</span>
													)}
												</div>
											</div>

											<div className="flex shrink-0 items-center gap-2 sm:ml-4">
												{!notification.read && (
													<Button
														onClick={() => markAsRead(notification.id)}
														variant="outline"
														size="sm"
														className="border-brand-200 text-brand-700 hover:bg-brand-50 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-950/40"
													>
														<Check className="mr-1 h-4 w-4" />
														Mark read
													</Button>
												)}

												{showDeleteButtons.has(notification.id) ? (
													<Button
														onClick={() => deleteNotification(notification.id)}
														variant="destructive"
														size="sm"
														disabled={deletingNotifications.has(notification.id)}
													>
														{deletingNotifications.has(notification.id) ? (
															<>
																<RefreshCw className="mr-1 h-4 w-4 animate-spin" />
																Deleting...
															</>
														) : (
															<>
																<Trash2 className="mr-1 h-4 w-4" />
																Delete
															</>
														)}
													</Button>
												) : (
													<Button
														onClick={() => toggleDeleteButton(notification.id)}
														variant="outline"
														size="sm"
														className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
													>
														<Trash2 className="mr-1 h-4 w-4" />
														Delete
													</Button>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete all notifications</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently removes every notification in your inbox. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeletingAll}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								setIsDeletingAll(true);
								void deleteAllNotifications();
							}}
							disabled={isDeletingAll}
							className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
						>
							{isDeletingAll ? 'Deleting...' : 'Delete all'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

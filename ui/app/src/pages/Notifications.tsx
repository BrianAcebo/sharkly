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
import Input from '../components/form/input/InputField';
import Select from '../components/form/Select';
import {
	NotificationMetadataSection,
	hasRenderableNotificationMetadata,
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

  // Get service availability from the notifications hook
  const { serviceAvailable, lastError, retryService, stopRetries } = useNotifications();

  // Fetch notifications
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

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const toggleDeleteButton = (notificationId: string) => {
    setShowDeleteButtons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    // Add to deleting set to show loading state
    setDeletingNotifications(prev => new Set(prev).add(notificationId));
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
      // Remove from show delete buttons set
      setShowDeleteButtons(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    } finally {
      // Remove from deleting set
      setDeletingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const closeAllDeleteButtons = () => {
    setShowDeleteButtons(new Set());
  };

  // Delete all notifications
  const deleteAllNotifications = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user?.id);

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

  // Get notification icon based on type
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
        return <Info className="h-5 w-5 text-gray-500" />;
      case 'task_reminder':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'credit_refund':
      case 'strategy_refund':
        return <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Target className="h-4 w-4 text-gray-500" />;
    }
  };

  // Format timestamp to relative time
  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'unread' && !notification.read) ||
                         (statusFilter === 'read' && notification.read);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Get counts
  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  useEffect(() => {
    fetchNotifications();
  }, [user, fetchNotifications]);

  // Close delete buttons when clicking outside
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">Please sign in to view notifications</h2>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Notifications" description="View and manage your notifications" />
      
      <div className="max-w-3xl mx-auto px-4 pb-10">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-stone-100">
                Notifications
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Task reminders, credit refunds, and product updates
              </p>
              {!serviceAvailable && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    Notification service unavailable
                  </span>
                  <Button
                    onClick={retryService}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={markAllAsRead}
                variant="outline"
                disabled={unreadCount === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
              
              <Button
                onClick={() => setShowDeleteAllConfirm(true)}
                variant="outline"
                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                disabled={totalCount === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete all
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-neutral-600 dark:text-neutral-400">
            <span>
              <span className="font-medium text-neutral-900 dark:text-stone-200">{totalCount}</span> total
            </span>
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
            <span>
              <span className="font-medium text-blue-600 dark:text-blue-400">{unreadCount}</span> unread
            </span>
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
            <span>
              <span className="font-medium text-neutral-800 dark:text-stone-200">{readCount}</span> read
            </span>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-5 border-neutral-200/80 dark:border-neutral-800">
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
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
                    { value: 'system', label: 'System' },
                  ]}
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Status
                </label>
                <Select
                  defaultValue={statusFilter}
                  onChange={(value: string) => setStatusFilter(value)}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'unread', label: 'Unread' },
                    { value: 'read', label: 'Read' },
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
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
            </CardContent>
          </Card>
        ) : !serviceAvailable ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <Bell className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Notification Service Unavailable</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We're unable to connect to the notification service at the moment. This may be due to a temporary network issue or service maintenance.
              </p>
              {lastError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    <strong>Error:</strong> {lastError}
                  </p>
                </div>
              )}
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={retryService}
                  variant="outline"
                  className="mx-auto"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Connection
                </Button>
                <Button
                  onClick={stopRetries}
                  variant="outline"
                  className="mx-auto text-gray-600"
                >
                  Stop Retrying
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {notifications.length === 0 ? 'No notifications yet' : 'No notifications match your filters'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {notifications.length === 0 
                  ? 'You\'ll see task reminders and important updates here when they arrive.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`notification-item border-neutral-200/90 transition-colors dark:border-neutral-800 ${
                  !notification.read
                    ? 'border-l-[3px] border-l-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                    : ''
                }`}
              >
                <CardContent className="p-4 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">{getNotificationIcon(notification.type)}</div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3
                              className={`text-sm font-semibold leading-snug ${
                                !notification.read
                                  ? 'text-neutral-900 dark:text-stone-100'
                                  : 'text-neutral-800 dark:text-stone-200'
                              }`}
                            >
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <Badge
                                variant="secondary"
                                className="h-5 px-1.5 text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                              >
                                New
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="h-5 border-neutral-200 px-1.5 text-[10px] font-normal capitalize text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
                            >
                              {notification.type.replace(/_/g, ' ')}
                            </Badge>
                          </div>

                          <p
                            className={`text-sm leading-relaxed ${
                              !notification.read
                                ? 'text-neutral-700 dark:text-neutral-300'
                                : 'text-neutral-600 dark:text-neutral-400'
                            }`}
                          >
                            {notification.message}
                          </p>

                          {hasRenderableNotificationMetadata(notification) && (
                            <NotificationMetadataSection notification={notification} />
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500 dark:text-neutral-500">
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
                        
                        <div className="flex items-center gap-2 ml-4">
                          {!notification.read && (
                            <Button
                              onClick={() => markAsRead(notification.id)}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Mark read
                            </Button>
                          )}
                          
                                                     {showDeleteButtons.has(notification.id) ? (
                             <Button
                               onClick={() => deleteNotification(notification.id)}
                               variant="outline"
                               size="sm"
                               className="text-white bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
                               disabled={deletingNotifications.has(notification.id)}
                             >
                               {deletingNotifications.has(notification.id) ? (
                                 <>
                                   <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                   Deleting...
                                 </>
                               ) : (
                                 <>
                                   <Trash2 className="h-4 w-4 mr-1" />
                                   Delete
                                 </>
                               )}
                             </Button>
                           ) : (
                             <Button
                               onClick={() => toggleDeleteButton(notification.id)}
                               variant="outline"
                               size="sm"
                               className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                             >
                               <Trash2 className="h-4 w-4 mr-1" />
                               Delete
                             </Button>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete All Notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete all notifications? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowDeleteAllConfirm(false)}
                variant="outline"
                className="flex-1"
                disabled={isDeletingAll}
              >
                Cancel
              </Button>
              <Button
                onClick={deleteAllNotifications}
                variant="destructive"
                className="flex-1"
                disabled={isDeletingAll}
              >
                {isDeletingAll ? 'Deleting...' : 'Delete All'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

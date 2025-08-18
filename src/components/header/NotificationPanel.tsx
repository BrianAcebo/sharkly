import React, { useState, useEffect } from 'react';
import { X, Check, Target, Bot, MessageSquare, Info, Clock, ArrowRight, Trash2, RefreshCw, Bell } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '../ui/button';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'sonner';
import { Notification } from '../../types/notifications';
import { useNotifications } from '../../hooks/useNotifications';

interface NotificationPanelProps {
  onClose: () => void;
  fetchUnreadCount?: () => Promise<void>;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose, fetchUnreadCount }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const [showDeleteButtons, setShowDeleteButtons] = useState<Set<string>>(new Set());
  const [deletingNotifications, setDeletingNotifications] = useState<Set<string>>(new Set());
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Get connection status from the notifications hook
  const { connectionStatus } = useNotifications();

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };



  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Refresh unread count if function is provided
      if (fetchUnreadCount) {
        fetchUnreadCount();
      }
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Delete all notifications
  const deleteAllNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications([]);
      
      // Refresh unread count if function is provided
      if (fetchUnreadCount) {
        fetchUnreadCount();
      }
      
      toast.success('All notifications deleted');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      toast.error('Failed to delete all notifications');
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

  const handleDeleteNotification = async (notificationId: string) => {
    // Add to deleting set to show loading state
    setDeletingNotifications(prev => new Set(prev).add(notificationId));
    
    try {
      await deleteNotification(notificationId);
      // Remove from show delete buttons set
      setShowDeleteButtons(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
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



  const confirmDeleteAllNotifications = async () => {
    setIsDeletingAll(true);
    try {
      await deleteAllNotifications();
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllConfirm(false);
    }
  };

  const cancelDeleteAllNotifications = () => {
    setShowDeleteAllConfirm(false);
  };

  // Get notification icon based on type
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
      case 'task_reminder':
        return <Clock className="h-5 w-5 text-orange-500" />;
      default:
        return <Target className="h-5 w-5 text-gray-500" />;
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

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

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

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-900 z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-900">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-black dark:text-white">Recent Notifications</h3>
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-green-600 dark:text-green-400">
                  Connected
                </span>
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-xs text-yellow-600 dark:text-yellow-400">
                  Connecting...
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-red-600 dark:text-red-400">
                  Disconnected
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No notifications yet</p>
            <p className="text-sm">You'll see task reminders and updates here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 ${
                  !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`text-sm font-medium ${
                          !notification.read 
                            ? 'text-blue-900 dark:text-blue-100' 
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {notification.title}
                        </h4>
                        <p className={`text-sm mt-1 ${
                          !notification.read 
                            ? 'text-blue-800 dark:text-blue-200' 
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {notification.message}
                        </p>
                        
                        {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {typeof notification.metadata.task_title === 'string' && notification.metadata.task_title && (
                              <p>Task: {notification.metadata.task_title}</p>
                            )}
                            {typeof notification.metadata.due_date === 'string' && notification.metadata.due_date && (
                              <p>Due: {new Date(notification.metadata.due_date).toLocaleDateString()}</p>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          
                          {!notification.read && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                        
                        {showDeleteButtons.has(notification.id) ? (
                          <button
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded transition-colors"
                            title="Click to confirm delete"
                            disabled={deletingNotifications.has(notification.id)}
                          >
                            {deletingNotifications.has(notification.id) ? 'Deleting...' : 'Delete'}
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleDeleteButton(notification.id)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Click to show delete button"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
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

      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-900 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </span>
            
            <div className="flex items-center gap-2">
              {/* <Button
                onClick={() => setShowDeleteAllConfirm(true)}
                variant="outline"
                size="sm"
                className="text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete all
              </Button> */}
              
              <Link
                to="/notifications"
                onClick={onClose}
                className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
              >
                View all
                <ArrowRight className="h-3 w-3 ml-1 inline" />
              </Link>
            </div>
          </div>
        </div>
      )}



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
                onClick={cancelDeleteAllNotifications}
                variant="outline"
                className="flex-1"
                disabled={isDeletingAll}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteAllNotifications}
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
    </div>
  );
};

export default NotificationPanel;

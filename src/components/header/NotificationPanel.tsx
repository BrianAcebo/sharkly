import React from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { X, Check, Target, Bot, MessageSquare, Info, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import UserAvatar from '../common/UserAvatar';

interface NotificationPanelProps {
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

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
      case 'reminder':
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

  // Get priority color for notification badges
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

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-900 z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-900">
        <h3 className="text-lg font-semibold text-black dark:text-white">Recent Notifications</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-brand-500 dark:hover:text-brand-400"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <div className="mb-3">
              <Target className="mx-auto h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm">No notifications</p>
            <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="py-2">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start p-4 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors ${
                  !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex-shrink-0 mt-1 mr-3">
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
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm font-medium ${
                          !notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </p>
                        {notification.priority && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(notification.priority)}`}>
                            {notification.priority}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(notification.timestamp)}
                        </span>
                        
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
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

      <div className="p-4 border-t border-gray-200 dark:border-gray-900">
        <div className="flex items-center justify-between">
          <button
            onClick={markAllAsRead}
            className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 font-medium"
          >
            Mark all as read
          </button>
          
          <Link
            to="/notifications"
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 font-medium"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
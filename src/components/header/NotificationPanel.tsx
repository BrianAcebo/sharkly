import React, { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { X, Check, Target, Bot, MessageSquare, Info, Clock, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import UserAvatar from '../common/UserAvatar';

interface NotificationPanelProps {
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  const toggleNotification = (notificationId: string) => {
    const newExpanded = new Set(expandedNotifications);
    if (newExpanded.has(notificationId)) {
      newExpanded.delete(notificationId);
    } else {
      newExpanded.add(notificationId);
    }
    setExpandedNotifications(newExpanded);
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

  // Filter to only unread notifications
  const unreadNotifications = notifications.filter(n => !n.read);

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
        {unreadNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <div className="mb-3">
              <Target className="mx-auto h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm">No unread notifications</p>
            <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="py-2">
            {unreadNotifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className="transition-colors bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-l-blue-500"
              >
                {/* Notification Header - Clickable to expand */}
                <div
                  onClick={() => toggleNotification(notification.id)}
                  className="flex items-start p-4 hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer"
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
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
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
                          
                          <div className="flex items-center gap-2">
                            {/* Expand/Collapse Icon */}
                            {expandedNotifications.has(notification.id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expandable Content */}
                {expandedNotifications.has(notification.id) && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="pt-3 space-y-3">
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
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="text-sm">
                        <div className="font-medium mb-2">Actions</div>
                        <div className="flex gap-2">
                          {(notification.metadata?.lead_id || notification.type === 'lead') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (notification.metadata?.lead_id) {
                                  window.location.href = `/leads/${notification.metadata.lead_id}`;
                                } else {
                                  window.location.href = `/leads`;
                                }
                                onClose();
                              }}
                              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded border border-blue-200 transition-colors"
                            >
                              {notification.metadata?.lead_id ? 'View Lead' : 'View All Leads'}
                            </button>
                          )}
                          {(notification.metadata?.task_id || notification.type === 'reminder') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/tasks`;
                                onClose();
                              }}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded border border-green-200 transition-colors"
                            >
                              {notification.metadata?.task_id ? 'View Task' : 'View All Tasks'}
                            </button>
                          )}
                          {notification.type === 'ai' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/assistant`;
                                onClose();
                              }}
                              className="px-3 py-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 rounded border border-purple-200 transition-colors"
                            >
                              View Assistant
                            </button>
                          )}
                          {notification.actionUrl && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(notification.actionUrl, '_blank');
                                onClose();
                              }}
                              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded border border-gray-200 transition-colors"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-900">
        <div className="flex items-center justify-between">
          <button
            onClick={markAllAsRead}
            disabled={unreadNotifications.length === 0}
            className={`text-sm font-medium ${
              unreadNotifications.length === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300'
            }`}
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
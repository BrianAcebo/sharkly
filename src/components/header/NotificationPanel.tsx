import React from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { X, Check } from 'lucide-react';

interface NotificationPanelProps {
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-black rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-black dark:text-white">Notifications</h3>
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
            No notifications
          </div>
        ) : (
          <div className="py-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start p-4 hover:bg-brand-50 dark:hover:bg-brand-900/20 ${
                  !notification.read ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                }`}
              >
                {notification.avatar && (
                  <img
                    src={notification.avatar}
                    alt={notification.user}
                    className="w-10 h-10 rounded-full mr-3 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-black dark:text-white">
                        <span className="font-medium">{notification.title}</span>{' '}
                        {notification.message}
                      </p>
                      <div className="flex items-center mt-1 space-x-2">
                        <span className="text-xs text-brand-600 dark:text-brand-400 bg-brand-100 dark:bg-brand-900/50 px-2 py-0.5 rounded">
                          Project
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {notification.timestamp}
                        </span>
                      </div>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="ml-2 p-1 text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={markAllAsRead}
            className="w-full text-center text-sm text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 font-medium"
          >
            View All Notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
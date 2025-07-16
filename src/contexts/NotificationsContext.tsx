import { createContext } from 'react';

export interface Notification {
  id: string;
  type: 'permission' | 'message' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  avatar?: string;
  user?: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined); 
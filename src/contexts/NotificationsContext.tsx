import { createContext } from 'react';

export interface Notification {
  id: string;
  type: 'lead' | 'ai' | 'communication' | 'system' | 'reminder';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
  metadata?: {
    lead_id?: string;
    task_id?: string;
    conversation_id?: string;
    organization_id?: string;
    due_date?: string;
    user?: {
      name: string;
      avatar?: string | null;
    };
  };
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  wsStatus: { isConnected: boolean; lastMessage: string; connectionTime: string };
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  addLeadNotification: (title: string, message: string, leadId?: string, priority?: 'low' | 'medium' | 'high', userName?: string, userAvatar?: string) => Promise<void>;
  addAINotification: (title: string, message: string, actionUrl?: string, priority?: 'low' | 'medium' | 'high') => Promise<void>;
  addReminderNotification: (title: string, message: string, dueDate?: string, actionUrl?: string, priority?: 'low' | 'medium' | 'high', userName?: string, userAvatar?: string) => Promise<void>;
  addTeamNotification: (title: string, message: string, actionUrl?: string, priority?: 'low' | 'medium' | 'high', userName?: string, userAvatar?: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteMultipleNotifications: (ids: string[]) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  testWebSocketConnection: () => Promise<void>;
  testWebSocketDataReception: () => Promise<void>;
}

export const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined); 
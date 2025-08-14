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
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  addLeadNotification: (title: string, message: string, leadId?: string, priority?: 'low' | 'medium' | 'high', userName?: string, userAvatar?: string) => void;
  addAINotification: (title: string, message: string, actionUrl?: string, priority?: 'low' | 'medium' | 'high') => void;
  addReminderNotification: (title: string, message: string, dueDate?: string, actionUrl?: string, priority?: 'low' | 'medium' | 'high', userName?: string, userAvatar?: string) => void;
  addTeamNotification: (title: string, message: string, actionUrl?: string, priority?: 'low' | 'medium' | 'high', userName?: string, userAvatar?: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined); 
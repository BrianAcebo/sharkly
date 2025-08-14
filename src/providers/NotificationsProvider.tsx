import { useState } from "react";
import { type Notification, NotificationsContext } from "../contexts/NotificationsContext";
import { notificationService } from "../utils/notifications";


const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'lead',
      title: 'New Lead Assigned',
      message: 'John Smith from TechCorp has been assigned to you. This is a high-value prospect with 95% match score.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      read: false,
      priority: 'high',
      actionUrl: '/leads/123',
      metadata: {
        lead_id: '123',
        user: {
          name: 'John Smith',
          avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
        }
      }
    },
    {
      id: '2',
      type: 'ai',
      title: 'AI Insights Ready',
      message: 'Your AI assistant has analyzed recent conversations and identified 3 follow-up opportunities.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      read: false,
      priority: 'medium',
      actionUrl: '/assistant',
      metadata: {
        user: {
          name: 'AI Assistant',
          avatar: null
        }
      }
    },
    {
      id: '3',
      type: 'reminder',
      title: 'Follow-up Due',
      message: 'Follow up with Sarah Johnson from InnovateTech is due today. AI suggests discussing their Q4 budget.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
      read: true,
      priority: 'high',
      actionUrl: '/leads/456',
      metadata: {
        lead_id: '456',
        due_date: new Date().toISOString(),
        user: {
          name: 'Sarah Johnson',
          avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
        }
      }
    },
    {
      id: '4',
      type: 'communication',
      title: 'Team Mention',
      message: 'Mike Chen mentioned you in a conversation about the Enterprise deal strategy.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
      read: false,
      priority: 'medium',
      actionUrl: '/chat',
      metadata: {
        user: {
          name: 'Mike Chen',
          avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
        }
      }
    },
    {
      id: '5',
      type: 'system',
      title: 'Weekly Report Available',
      message: 'Your weekly sales performance report is ready. You\'ve exceeded your quota by 15%.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      read: true,
      priority: 'low',
      actionUrl: '/reports',
      metadata: {
        user: {
          name: 'System',
          avatar: null
        }
      }
    },
    {
      id: '6',
      type: 'lead',
      title: 'Lead Status Updated',
      message: 'Sarah Johnson from InnovateTech moved to "Qualified" stage. Ready for proposal.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
      read: false,
      priority: 'medium',
      actionUrl: '/leads/789',
      metadata: {
        lead_id: '789',
        user: {
          name: 'Sarah Johnson',
          avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
        }
      }
    },
    {
      id: '7',
      type: 'ai',
      title: 'Follow-up Suggestion',
      message: 'AI suggests calling John Smith today. Last contact was 3 days ago, high engagement score.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
      read: false,
      priority: 'medium',
      actionUrl: '/leads/123',
      metadata: {
        lead_id: '123',
        user: {
          name: 'AI Assistant',
          avatar: null
        }
      }
    },
    {
      id: '8',
      type: 'communication',
      title: 'New Team Message',
      message: 'Alex Rodriguez sent a message in #enterprise-deals: "Anyone available for a client call tomorrow?"',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // 18 hours ago
      read: true,
      priority: 'low',
      actionUrl: '/chat',
      metadata: {
        user: {
          name: 'Alex Rodriguez',
          avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
        }
      }
    }
  ];
  
export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  
    const unreadCount = notifications.filter(n => !n.read).length;
  
    const addNotification = async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: Notification = {
        ...notificationData,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false
      };
      setNotifications(prev => [newNotification, ...prev]);

      // Send push notification if enabled
      try {
        await notificationService.sendNotification({
          title: newNotification.title,
          body: newNotification.message,
          tag: `notification-${newNotification.id}`,
          data: { 
            actionUrl: newNotification.actionUrl,
            type: newNotification.type,
            priority: newNotification.priority
          }
        });
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }
    };
  
    const markAsRead = (id: string) => {
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    };
  
    const markAllAsRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    // Convenience methods for specific notification types
    const addLeadNotification = (title: string, message: string, leadId?: string, priority: 'low' | 'medium' | 'high' = 'medium', userName?: string, userAvatar?: string) => {
      addNotification({
        type: 'lead',
        title,
        message,
        priority,
        actionUrl: leadId ? `/leads/${leadId}` : '/leads',
        metadata: { 
          lead_id: leadId,
          user: {
            name: userName || 'Lead System',
            avatar: userAvatar || null
          }
        }
      });
    };

    const addAINotification = (title: string, message: string, actionUrl?: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
      addNotification({
        type: 'ai',
        title,
        message,
        priority,
        actionUrl: actionUrl || '/assistant',
        metadata: {
          user: {
            name: 'AI Assistant',
            avatar: null
          }
        }
      });
    };

    const addReminderNotification = (title: string, message: string, dueDate?: string, actionUrl?: string, priority: 'low' | 'medium' | 'high' = 'medium', userName?: string, userAvatar?: string) => {
      addNotification({
        type: 'reminder',
        title,
        message,
        priority,
        actionUrl: actionUrl || '/notifications',
        metadata: { 
          due_date: dueDate,
          user: {
            name: userName || 'Reminder System',
            avatar: userAvatar || null
          }
        }
      });
    };

    const addTeamNotification = (title: string, message: string, actionUrl?: string, priority: 'low' | 'medium' | 'high' = 'medium', userName?: string, userAvatar?: string) => {
      addNotification({
        type: 'communication',
        title,
        message,
        priority,
        actionUrl: actionUrl || '/chat',
        metadata: {
          user: {
            name: userName || 'Team Member',
            avatar: userAvatar || null
          }
        }
      });
    };
  
    return (
      <NotificationsContext.Provider value={{
        notifications,
        unreadCount,
        addNotification,
        addLeadNotification,
        addAINotification,
        addReminderNotification,
        addTeamNotification,
        markAsRead,
        markAllAsRead
      }}>
        {children}
      </NotificationsContext.Provider>
    );
};
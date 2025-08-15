import { useState, useEffect } from "react";
import { type Notification, NotificationsContext } from "../contexts/NotificationsContext";
import { notificationService } from "../utils/notificationService";
import { supabase } from "../utils/supabaseClient";
  
export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [wsStatus, setWsStatus] = useState<{ isConnected: boolean; lastMessage: string; connectionTime: string }>({
        isConnected: false,
        lastMessage: 'Not connected',
        connectionTime: 'Never'
    });
  
    const unreadCount = notifications.filter(n => !n.read).length;

    // Fetch notifications from Supabase
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Convert Supabase data to our Notification format
        const formattedNotifications: Notification[] = (data || []).map(item => ({
          id: item.id,
          type: mapNotificationType(item.type),
          title: item.title,
          message: item.message,
          timestamp: item.created_at,
          read: item.read_at !== null,
          priority: mapNotificationPriority(item.metadata?.priority || 'medium'),
          actionUrl: item.metadata?.action_url || null,
          metadata: {
            ...item.metadata,
            lead_id: item.metadata?.lead_id,
            due_date: item.metadata?.due_date,
            user: {
              name: item.metadata?.user_name || 'System',
              avatar: item.metadata?.user_avatar || null
            }
          }
        }));

        setNotifications(formattedNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    // Helper function to map Supabase notification types to our types
    const mapNotificationType = (type: string): Notification['type'] => {
      switch (type) {
        case 'task_reminder': return 'reminder';
        case 'lead_update': return 'lead';
        case 'ai': return 'ai';
        case 'system': return 'system';
        case 'communication': return 'communication';
        default: return 'system';
      }
    };

    // Helper function to map priority levels
    const mapNotificationPriority = (priority: string): 'low' | 'medium' | 'high' => {
      switch (priority) {
        case 'low': return 'low';
        case 'high': return 'high';
        case 'urgent': return 'high';
        default: return 'medium';
      }
    };

    // Initialize notification service and handle real-time notifications
    useEffect(() => {
      // Initialize the notification service only once
      notificationService.initialize();
      
      // Fetch initial notifications
      fetchNotifications();

      // Set up WebSocket subscription for real-time notifications
      const setupWebSocket = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          console.log('🔌 Setting up WebSocket connection for real-time notifications...');

          // Subscribe to notifications table changes
          const subscription = supabase
            .channel(`notifications:${user.id}`)
            .on('postgres_changes', 
              { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
              },
              (payload) => {
                console.log('🔔 Real-time notification received:', payload);
                
                // Convert Supabase data to our Notification format
                const newNotification: Notification = {
                  id: payload.new.id,
                  type: mapNotificationType(payload.new.type),
                  title: payload.new.title,
                  message: payload.new.message,
                  timestamp: payload.new.created_at,
                  read: payload.new.read || false,
                  priority: mapNotificationPriority(payload.new.priority || 'medium'),
                  actionUrl: payload.new.action_url || null,
                  metadata: {
                    ...payload.new.metadata,
                    lead_id: payload.new.metadata?.lead_id,
                    due_date: payload.new.metadata?.due_date,
                    user: {
                      name: payload.new.metadata?.user_name || 'System',
                      avatar: payload.new.metadata?.user_avatar || null
                    }
                  }
                };

                // Add new notification to the list
                setNotifications(prev => [newNotification, ...prev]);
                
                // Update WebSocket status
                setWsStatus(prev => ({
                  ...prev,
                  lastMessage: `New notification: ${newNotification.title}`,
                  connectionTime: new Date().toLocaleTimeString()
                }));

                // Show browser notification if enabled
                if (Notification.permission === 'granted') {
                  new Notification(newNotification.title, {
                    body: newNotification.message,
                    icon: '/favicon.ico'
                  });
                }
              }
            )
            .on('postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
              },
              (payload) => {
                console.log('🔄 Notification updated:', payload);
                
                // Update existing notification
                setNotifications(prev => 
                  prev.map(n => 
                    n.id === payload.new.id 
                      ? { ...n, read: payload.new.read || false }
                      : n
                  )
                );

                setWsStatus(prev => ({
                  ...prev,
                  lastMessage: `Notification updated: ${payload.new.title}`,
                  connectionTime: new Date().toLocaleTimeString()
                }));
              }
            )
            .subscribe((status) => {
              console.log('🔌 WebSocket subscription status:', status);
              setWsStatus(prev => ({
                ...prev,
                isConnected: status === 'SUBSCRIBED',
                connectionTime: new Date().toLocaleTimeString()
              }));
            });

          // Cleanup function
          return () => {
            console.log('🔌 Cleaning up WebSocket subscription...');
            subscription.unsubscribe();
          };
        } catch (error) {
          console.error('❌ Error setting up WebSocket:', error);
          setWsStatus(prev => ({
            ...prev,
            isConnected: false,
            lastMessage: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            connectionTime: new Date().toLocaleTimeString()
          }));
        }
      };

      // Set up WebSocket connection
      const cleanup = setupWebSocket();

      // Cleanup on unmount
      return () => {
        cleanup.then(cleanupFn => cleanupFn?.());
      };
    }, []);

    // Check for task reminders (fallback method)
    const checkTaskReminders = async () => {
      try {
        console.log('Checking for task reminders...');
        // This is now handled by WebSocket, but kept for fallback
      } catch (error) {
        console.error('Error checking task reminders:', error);
      }
    };
  
    const addNotification = async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        // Get user's organization
        const { data: orgData } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', userData.user.id)
          .single();

        if (!orgData) return;

        // Save notification to Supabase
        const { data, error } = await supabase
          .from('notifications')
          .insert({
            user_id: userData.user.id,
            organization_id: orgData.organization_id,
            title: notificationData.title,
            message: notificationData.message,
            type: mapNotificationTypeToSupabase(notificationData.type),
            metadata: {
              priority: notificationData.priority,
              action_url: notificationData.actionUrl,
              lead_id: notificationData.metadata?.lead_id,
              due_date: notificationData.metadata?.due_date,
              user_name: notificationData.metadata?.user?.name,
              user_avatar: notificationData.metadata?.user?.avatar
            }
          })
          .select()
          .single();

        if (error) throw error;

        // Create local notification object
        const newNotification: Notification = {
          ...notificationData,
          id: data.id,
          timestamp: data.created_at,
          read: false
        };

        // Add to local state
        setNotifications(prev => [newNotification, ...prev]);

        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(newNotification.title, {
            body: newNotification.message,
            icon: '/favicon.ico',
            tag: `notification-${newNotification.id}`
          });
        }

      } catch (error) {
        console.error('Failed to add notification:', error);
      }
    };

    // Helper function to map our notification types to Supabase types
    const mapNotificationTypeToSupabase = (type: Notification['type']): string => {
      switch (type) {
        case 'reminder': return 'task_reminder';
        case 'lead': return 'lead_update';
        case 'ai': return 'ai';
        case 'system': return 'system';
        case 'communication': return 'communication';
        default: return 'general';
      }
    };

    const markAsRead = async (notificationId: string) => {
      try {
        // Update in Supabase
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId);

        if (error) throw error;

        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    };

    const markAllAsRead = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        // Update all notifications in Supabase
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', userData.user.id)
          .eq('read', false);

        if (error) throw error;

        // Update local state
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true }))
        );
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
      }
    };

    const deleteNotification = async (notificationId: string) => {
      try {
        // Delete from Supabase
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId);

        if (error) throw error;

        // Remove from local state
        setNotifications(prev =>
          prev.filter(n => n.id !== notificationId)
        );
      } catch (error) {
        console.error('Failed to delete notification:', error);
      }
    };

    // Convenience methods for specific notification types
    const addLeadNotification = async (title: string, message: string, leadId?: string, priority: 'low' | 'medium' | 'high' = 'medium', userName?: string, userAvatar?: string) => {
      await addNotification({
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

    const addAINotification = async (title: string, message: string, actionUrl?: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
      await addNotification({
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

    const addReminderNotification = async (title: string, message: string, dueDate?: string, actionUrl?: string, priority: 'low' | 'medium' | 'high' = 'medium', userName?: string, userAvatar?: string) => {
      await addNotification({
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

    const addTeamNotification = async (title: string, message: string, actionUrl?: string, priority: 'low' | 'medium' | 'high' = 'medium', userName?: string, userAvatar?: string) => {
      await addNotification({
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

    const value = {
      notifications,
      loading,
      unreadCount,
      wsStatus,
      addNotification,
      addLeadNotification,
      addAINotification,
      addReminderNotification,
      addTeamNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      checkTaskReminders
    };

    return (
      <NotificationsContext.Provider value={value}>
        {children}
      </NotificationsContext.Provider>
    );
};
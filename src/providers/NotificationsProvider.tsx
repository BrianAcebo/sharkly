import { useState, useEffect } from "react";
import { type Notification, NotificationsContext } from "../contexts/NotificationsContext";
import { notificationService } from "../utils/notificationService";
import { supabase } from "../utils/supabaseClient";
  
export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [wsStatus, setWsStatus] = useState<{ isConnected: boolean; lastMessage: string; connectionTime: string }>({
        isConnected: true,
        lastMessage: 'Polling every 15 seconds',
        connectionTime: 'Always'
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

    // Initialize notification service and set up polling
    useEffect(() => {
      // Initialize the notification service only once
      notificationService.initialize();

      // Set up polling for new notifications every 15 seconds
      const pollingInterval = setInterval(async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Fetch new notifications since last check
          const lastNotificationTime = notifications.length > 0 
            ? notifications[0].timestamp 
            : new Date(0).toISOString();

          const { data: newNotifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .gt('created_at', lastNotificationTime)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('❌ Error polling for new notifications:', error);
            return;
          }

          if (newNotifications && newNotifications.length > 0) {
            console.log(`🔔 Polling found ${newNotifications.length} new notifications`);
            
            // Convert to our Notification format
            const formattedNotifications: Notification[] = newNotifications.map(item => ({
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

            // Add new notifications to the list
            setNotifications(prev => [...formattedNotifications, ...prev]);
            
            // Update WebSocket status to show polling is working
            setWsStatus(prev => ({
              ...prev,
              isConnected: true, // Polling is working
              lastMessage: `Polling found ${newNotifications.length} new notifications`,
              connectionTime: new Date().toLocaleTimeString()
            }));

            // Show browser notifications and play sound for new items
            formattedNotifications.forEach(async (notification) => {
              // Show browser notification if enabled
              if (Notification.permission === 'granted') {
                new Notification(notification.title, {
                  body: notification.message,
                  icon: '/favicon.ico',
                  tag: `notification-${notification.id}`,
                  requireInteraction: true
                });
              }

              // Play notification sound with better error handling
              try {
                console.log('🔊 Attempting to play notification sound...');
                await notificationService.playNotificationSound();
                console.log('✅ Notification sound played successfully');
              } catch (error) {
                console.error('❌ Failed to play notification sound:', error);
                // Fallback: try to play a simple beep
                try {
                  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                  const oscillator = audioContext.createOscillator();
                  const gainNode = audioContext.createGain();
                  
                  oscillator.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                  
                  oscillator.start(audioContext.currentTime);
                  oscillator.stop(audioContext.currentTime + 0.1);
                  
                  console.log('✅ Fallback notification sound played');
                } catch (fallbackError) {
                  console.error('❌ Fallback sound also failed:', fallbackError);
                }
              }
            });
          }
        } catch (error) {
          console.error('❌ Error in notification polling:', error);
        }
      }, 15000); // Poll every 15 seconds

      // Cleanup on unmount
      return () => {
        clearInterval(pollingInterval);
      };
    }, [notifications]);

    // Fetch initial notifications on mount
    useEffect(() => {
      fetchNotifications();
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

    // Test notification system (polling + sound)
    const testWebSocketConnection = async () => {
      try {
        console.log('🧪 Testing notification system...');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('❌ No user found for test');
          return;
        }

        console.log('🔌 Testing for user:', user.id);
        
        // Test notification sound first
        console.log('🔊 Testing notification sound...');
        try {
          await notificationService.playNotificationSound();
          console.log('✅ Notification sound test successful');
        } catch (error) {
          console.error('❌ Notification sound test failed:', error);
        }
        
        // Create a test notification to test the polling system
        console.log('🔌 Creating test notification...');
        const { data, error } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            type: 'system',
            title: 'System Test',
            message: 'This is a test notification to verify the polling system',
            metadata: {
              priority: 'medium',
              user_name: 'System',
              user_avatar: null
            }
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Failed to create test notification:', error);
          return;
        }

        console.log('✅ Test notification created:', data);
        console.log('🔔 Polling system should pick this up within 15 seconds');
        console.log('🔊 Sound should play when notification appears');
        
        // Wait a bit and check if it was processed
        setTimeout(() => {
          const testNotification = notifications.find(n => n.id === data.id);
          if (testNotification) {
            console.log('✅ Test notification processed by polling system!');
          } else {
            console.log('❌ Test notification not yet processed by polling');
          }
        }, 2000);

      } catch (error) {
        console.error('❌ Notification system test failed:', error);
      }
    };

    // Test if WebSocket is receiving any data at all
    const testWebSocketDataReception = async () => {
      try {
        console.log('🔍 Testing if WebSocket is receiving any data...');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('❌ No user found for WebSocket data test');
          return;
        }

        // Create a simple test channel that listens to all changes
        const dataTestChannel = supabase
          .channel('data-test')
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'notifications'
            },
            (payload) => {
              console.log('🔍 Data test - Received change:', payload);
            }
          )
          .subscribe((status) => {
            console.log('🔍 Data test channel status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('🔍 Data test channel connected, listening for any changes...');
              
              // Create a test notification to see if we get any data
              setTimeout(() => {
                console.log('🔍 Creating test notification for data reception test...');
                supabase
                  .from('notifications')
                  .insert({
                    user_id: user.id,
                    type: 'system',
                    title: 'Data Reception Test',
                    message: 'Testing if WebSocket receives any data at all',
                    metadata: { priority: 'low' }
                  })
                                  .then(({ error }) => {
                  if (error) {
                    console.error('❌ Failed to create data test notification:', error);
                  } else {
                    console.log('✅ Data test notification created, waiting for WebSocket...');
                  }
                });
              }, 1000);
            }
          });

        // Clean up after 10 seconds
        setTimeout(() => {
          console.log('🔍 Cleaning up data test channel...');
          dataTestChannel.unsubscribe();
        }, 10000);

      } catch (error) {
        console.error('❌ WebSocket data reception test failed:', error);
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
        // Delete from Supabase using the notification service
        const success = await notificationService.deleteNotification(notificationId);
        
        if (success) {
          // Remove from local state
          setNotifications(prev =>
            prev.filter(n => n.id !== notificationId)
          );
          console.log(`🗑️ Deleted notification: ${notificationId}`);
        }
      } catch (error) {
        console.error('Failed to delete notification:', error);
      }
    };

    const deleteMultipleNotifications = async (notificationIds: string[]) => {
      try {
        // Delete from Supabase using the notification service
        const success = await notificationService.deleteMultipleNotifications(notificationIds);
        
        if (success) {
          // Remove from local state
          setNotifications(prev =>
            prev.filter(n => !notificationIds.includes(n.id))
          );
          console.log(`🗑️ Deleted ${notificationIds.length} notifications`);
        }
      } catch (error) {
        console.error('Failed to delete multiple notifications:', error);
      }
    };

    const deleteAllNotifications = async () => {
      try {
        // Delete from Supabase using the notification service
        const success = await notificationService.deleteAllNotifications();
        
        if (success) {
          // Clear local state
          setNotifications([]);
          console.log('🗑️ Deleted all notifications');
        }
      } catch (error) {
        console.error('Failed to delete all notifications:', error);
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
      deleteMultipleNotifications,
      deleteAllNotifications,
      checkTaskReminders,
      testWebSocketConnection,
      testWebSocketDataReception
    };

    return (
      <NotificationsContext.Provider value={value}>
        {children}
      </NotificationsContext.Provider>
    );
};
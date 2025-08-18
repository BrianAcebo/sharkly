import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';
import type { Notification } from '../types/notifications';

// Audio for notification ding - with fallback to generated sound
let notificationAudio: HTMLAudioElement | null = null;

// Try to load the audio file, fallback to generated sound if it fails
try {
  notificationAudio = new Audio('/sounds/notification-ding.mp3');
  notificationAudio.volume = 0.5; // Set volume to 50%
} catch {
  console.warn('Could not load notification audio file, will use generated sound');
  notificationAudio = null;
}

// Generate a simple ding sound using Web Audio API as fallback
const generateDingSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz tone
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // 30% volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3); // Fade out
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    console.warn('Could not generate ding sound');
  }
};

export const useNotifications = (userId?: string) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');
  const lastErrorToastRef = useRef<number>(0);
  const connectionAttemptsRef = useRef(0);

  // Function to play notification ding and show push notification
  const playNotificationAlert = (notification: Notification) => {
    console.log('🔔 Playing notification alert for:', notification);
    try {
      // Play ding audio
      if (notificationAudio) {
        console.log('🎵 Using audio file for notification');
        notificationAudio.currentTime = 0; // Reset to start
        notificationAudio.currentTime = 0; // Reset to start
        notificationAudio.play().catch(error => {
          console.warn('Could not play notification audio file, using generated sound:', error);
          generateDingSound(); // Fallback to generated sound
        });
      } else {
        console.log('🎵 Using generated sound for notification');
        generateDingSound(); // Use generated sound as fallback
      }

      // Show browser push notification if permission is granted
      if (Notification.permission === 'granted') {
        console.log('📱 Showing push notification');
        const pushNotification = new Notification(notification.title || 'Task Reminder', {
          body: notification.message,
          icon: '/images/logos/logo.svg',
          tag: `task-reminder-${notification.id}`,
          requireInteraction: false,
          silent: false // Allow system sounds
        });

        // Auto-close push notification after 10 seconds
        setTimeout(() => {
          pushNotification.close();
        }, 10000);

        // Handle click on push notification
        pushNotification.onclick = () => {
          window.focus();
          if (notification.action_url) {
            window.open(notification.action_url, '_blank');
          }
        };
      } else {
        console.log('📱 Push notification permission not granted:', Notification.permission);
      }
    } catch (error) {
      console.warn('Error showing notification alert:', error);
    }
  };

  // Function to show notification toast and mark as shown in database
  const showNotificationToast = async (notification: Notification) => {
    console.log('🔔 Showing toast for notification:', notification.id);
    
    // Show persistent toast for new notification (won't auto-dismiss)
    toast(notification.message || notification.title || 'Reminder due', {
      description: notification.title !== notification.message ? notification.title : undefined,
      duration: Infinity, // Won't auto-dismiss
      action: {
        label: 'Mark as shown',
        onClick: async () => {
          try {
            // Update the notification as shown in the database
            const { error } = await supabase
              .from('notifications')
              .update({ shown: true })
              .eq('id', notification.id);

            if (error) {
              console.error('Error marking notification as shown:', error);
            } else {
              console.log('✅ Notification marked as shown in database');
            }
          } catch (error) {
            console.error('Error updating notification shown status:', error);
          }
        }
      }
    });
  };

  // Subscribe to Realtime changes on notifications table
  const subscribeToNotifications = useCallback(() => {
    // Don't subscribe if already subscribed
    if (channelRef.current && connectionStatus === 'connected') {
      console.log('Already subscribed, skipping duplicate subscription');
      return;
    }
    
    setConnectionStatus('connecting');
    
    // Clean up any existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    
    channelRef.current = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new as Notification;
          console.log('🔔 New notification received via real-time:', notification);
          
          // Only show toast if notification hasn't been shown yet
          if (!notification.shown) {
            // Play notification alert for new notifications
            playNotificationAlert(notification);
            
            // Show notification toast
            showNotificationToast(notification);
          }
          
          // Update unread count
          setUnreadCount((prev: number) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new as Notification;
          console.log('Notification updated:', notification);
          
          // If notification was marked as read, update unread count
          if (notification.read) {
            setUnreadCount((prev: number) => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.old as Notification;
          console.log('Notification deleted:', notification);
          
          // If deleted notification was unread, update unread count
          if (!notification.read) {
            setUnreadCount((prev: number) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        console.log('Notification subscription status:', status);
        
        // Get current time for debouncing
        const now = Date.now();
        
        // Update connection status based on subscription status
        switch (status) {
          case 'SUBSCRIBED':
            setConnectionStatus('connected');
            connectionAttemptsRef.current = 0; // Reset connection attempts on success
            break;
          case 'TIMED_OUT':
            setConnectionStatus('error');
            // Only show error toast if we haven't shown one recently (debounce)
            if (now - lastErrorToastRef.current > 10000) { // 10 second debounce
              toast.error('🔴 Notifications disconnected. Please refresh the page to reconnect.');
              lastErrorToastRef.current = now;
            }
            break;
          case 'CLOSED':
            // Don't immediately set as disconnected - wait a bit to see if it reconnects
            connectionAttemptsRef.current++;
            if (connectionAttemptsRef.current > 2) { // After 3 attempts, show as disconnected
              setConnectionStatus('disconnected');
              if (now - lastErrorToastRef.current > 10000) { // 10 second debounce
                toast.error('🔴 Notifications disconnected. Please refresh the page to reconnect.');
                lastErrorToastRef.current = now;
              }
            } else {
              // Still trying to reconnect
              setConnectionStatus('connecting');
            }
            break;
          case 'CHANNEL_ERROR':
            setConnectionStatus('error');
            if (now - lastErrorToastRef.current > 10000) { // 10 second debounce
              toast.error('🔴 Notification error. Please refresh the page to reconnect.');
              lastErrorToastRef.current = now;
            }
            break;
          default:
            setConnectionStatus('connecting');
        }
      });
  }, [userId, connectionStatus]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [userId]);

  // Function to retry connection
  const retryConnection = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    setConnectionStatus('connecting');
    // Re-subscribe to notifications
    if (userId) {
      subscribeToNotifications();
    }
  }, [userId, subscribeToNotifications]);

  // Function to check if connection is healthy
  const isConnectionHealthy = useCallback(() => {
    return connectionStatus === 'connected';
  }, [connectionStatus]);

  useEffect(() => {
    if (!userId) return;

    // Catch-up fetch for the last 12 hours
    const fetchRecentNotifications = async () => {
      try {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        
        const { data: notifications, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', twelveHoursAgo)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching recent notifications:', error);
          return;
        }

        // Show persistent toasts for unread notifications that haven't been shown yet
        notifications?.forEach((notification: Notification) => {
          if (!notification.read && !notification.shown) {
            // Play notification alert for unread notifications
            playNotificationAlert(notification);
            
            // Show notification toast
            showNotificationToast(notification);
          }
        });
      } catch (error) {
        console.error('Error in catch-up fetch:', error);
      }
    };

    // Initial fetch and subscription
    fetchRecentNotifications();
    fetchUnreadCount();
    
    // Only subscribe if not already connected
    if (connectionStatus !== 'connected') {
      subscribeToNotifications();
    }

    // Cleanup
    return () => {
      if (channelRef.current) {
        console.log('Cleaning up notification subscription');
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [userId, fetchUnreadCount, subscribeToNotifications, connectionStatus]);

  return { 
    unreadCount, 
    fetchUnreadCount, 
    connectionStatus, 
    retryConnection, 
    isConnectionHealthy 
  };
};

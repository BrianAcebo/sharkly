import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';
import type { Notification } from '../types/notifications';

// Audio for notification ding - using generated sound
console.log('🎵 Using generated sound for notifications (audio file not available)');

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
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const lastErrorToastRef = useRef<number>(0);
  const connectionAttemptsRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 5; // Increased for exponential backoff
  const baseDelay = 2000; // 2 seconds base delay
  const maxDelay = 30000; // 30 seconds max delay
  const requestThrottleDelay = 1000; // 1 second between requests
  const minSubscriptionInterval = 5000; // Minimum 5 seconds between subscription attempts
  const lastSubscriptionAttemptRef = useRef<number>(0);
  const isSubscribingRef = useRef<boolean>(false);

  // Function to play notification ding and show push notification
  const playNotificationAlert = (notification: Notification) => {
    console.log('🔔 Playing notification alert for:', notification);
    try {
      // Since we don't have an audio file, always use generated sound
      console.log('🎵 Using generated sound for notification');
      generateDingSound(); // Use generated sound

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

  // Stable helpers that don't change identity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInsert = useCallback((payload: any) => {
    const notification = payload.new as Notification;
    console.log('🔔 New notification received via real-time:', notification);
    
    // If we're receiving notifications, we're definitely connected
    if (connectionStatus !== 'connected') {
      console.log('🔄 Updating connection status to connected (received notification)');
      setConnectionStatus('connected');
      setServiceAvailable(true);
    }
    
    if (!notification.shown) {
      playNotificationAlert(notification);
      showNotificationToast(notification);
    }
    setUnreadCount((c) => c + 1);
  }, [connectionStatus]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdate = useCallback((payload: any) => {
    const n = payload.new as Notification;
    console.log('Notification updated:', n);
    if (n.read) setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDelete = useCallback((payload: any) => {
    const n = payload.old as Notification;
    console.log('Notification deleted:', n);
    if (!n.read) setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  // Subscribe to Realtime changes on notifications table
  const subscribeToNotifications = useCallback(() => {
    // Don't subscribe if already subscribed
    if (channelRef.current && connectionStatus === 'connected') {
      console.log('Already subscribed, skipping duplicate subscription');
      return;
    }
    
    // Prevent rapid subscription attempts
    if (!canAttemptSubscription()) {
      const remainingTime = Math.ceil((minSubscriptionInterval - (Date.now() - lastSubscriptionAttemptRef.current)) / 1000);
      console.log(`⏳ Skipping subscription attempt - waiting ${remainingTime}s (rate limiting)`);
      return;
    }
    
    // Mark this subscription attempt
    markSubscriptionAttempt();
    
    setConnectionStatus('connecting');
    
    // Clean up any existing subscription
    if (channelRef.current) {
      console.log('🧹 Cleaning up existing subscription before creating new one');
      channelRef.current.unsubscribe();
      channelRef.current = null;
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
            isSubscribingRef.current = false; // Reset subscribing flag
            console.log('✅ Notification subscription established successfully');
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
            console.log('🔌 Notification subscription closed');
            // Don't immediately set as disconnected - wait a bit to see if it reconnects
            connectionAttemptsRef.current++;
            
            if (connectionAttemptsRef.current > maxRetries) { // After max attempts, stop retrying
              setConnectionStatus('disconnected');
              setServiceAvailable(false);
              isSubscribingRef.current = false; // Reset subscribing flag
              stopRetries(); // Stop retry attempts
              console.log('🚫 Maximum retry attempts reached, stopping automatic reconnection');
              if (now - lastErrorToastRef.current > 10000) { // 10 second debounce
                toast.error('🔴 Notifications disconnected. Service unavailable. Use retry button to reconnect.');
                lastErrorToastRef.current = now;
            }
            } else {
              // Check if enough time has passed since last subscription attempt
              if (!canAttemptSubscription()) {
                const remainingTime = Math.ceil((minSubscriptionInterval - (Date.now() - lastSubscriptionAttemptRef.current)) / 1000);
                console.log(`⏳ Waiting ${remainingTime}s before next subscription attempt (rate limiting)`);
                return; // Don't proceed with retry yet
              }
              
              // Still trying to reconnect, but with exponential backoff
              setConnectionStatus('connecting');
              const backoffDelay = calculateBackoffDelay(connectionAttemptsRef.current);
              const totalDelay = Math.max(backoffDelay, minSubscriptionInterval);
              
              console.log(`📡 Retry attempt ${connectionAttemptsRef.current + 1} in ${Math.round(totalDelay / 1000)}s (includes rate limiting)`);
              
              // Mark this attempt and schedule next retry
              markSubscriptionAttempt();
              retryTimeoutRef.current = setTimeout(() => {
                if (userId && connectionAttemptsRef.current <= maxRetries) {
                  subscribeToNotifications();
                }
              }, totalDelay);
            }
            break;
          case 'CHANNEL_ERROR':
            setConnectionStatus('error');
            setServiceAvailable(false);
            isSubscribingRef.current = false; // Reset subscribing flag
            stopRetries(); // Stop retry attempts
            console.log('❌ Notification channel error, stopping retries');
            if (now - lastErrorToastRef.current > 10000) { // 10 second debounce
              toast.error('🔴 Notification error. Service unavailable. Use retry button to reconnect.');
              lastErrorToastRef.current = now;
            }
            break;
          default:
            setConnectionStatus('connecting');
        }
      });
  }, [userId, connectionStatus]);

  // Fetch unread count with throttling
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    
    // Add throttling delay between requests
    await new Promise(resolve => setTimeout(resolve, requestThrottleDelay));
    
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
      setServiceAvailable(true);
      setLastError(null);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      
      // Check if it's a throttling error
      if (error instanceof Error && error.message.includes('503')) {
        setLastError('Service throttled - too many requests. Retrying with backoff...');
        // Don't mark service as unavailable for throttling - just retry with backoff
        return;
      }
      
      setServiceAvailable(false);
      setLastError(error instanceof Error ? error.message : 'Unknown error');
      setUnreadCount(0);
    }
  }, [userId, requestThrottleDelay]);

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

  // Function to check if notification service is available
  const isServiceAvailable = useCallback(() => {
    return serviceAvailable;
  }, [serviceAvailable]);

  // Function to check if service is throttled
  const isServiceThrottled = useCallback(() => {
    return lastError && lastError.includes('throttled');
  }, [lastError]);

  // Check if notifications channel is actually subscribed
  const isChannelSubscribed = useCallback(() => {
    return channelRef.current && connectionStatus === 'connected';
  }, [connectionStatus]);

  // Calculate exponential backoff delay
  const calculateBackoffDelay = useCallback((attempt: number) => {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    return delay + jitter;
  }, []);

  // Check if enough time has passed since last subscription attempt
  const canAttemptSubscription = useCallback(() => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastSubscriptionAttemptRef.current;
    return timeSinceLastAttempt >= minSubscriptionInterval;
  }, []);

  // Mark subscription attempt timestamp
  const markSubscriptionAttempt = useCallback(() => {
    lastSubscriptionAttemptRef.current = Date.now();
  }, []);



  // Function to stop retry attempts
  const stopRetries = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  // Function to manually retry service connection
  const retryService = useCallback(async () => {
    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    setServiceAvailable(true);
    setLastError(null);
    setConnectionStatus('connecting');
    connectionAttemptsRef.current = 0;
    
    // Add delay before retry to respect rate limits
    await new Promise(resolve => setTimeout(resolve, requestThrottleDelay));
    
    // Test service availability
    try {
      await fetchUnreadCount();
      if (userId) {
        subscribeToNotifications();
      }
    } catch (error) {
      // Check if it's a throttling error
      if (error instanceof Error && error.message.includes('503')) {
        setLastError('Service throttled - too many requests. Waiting before retry...');
        setConnectionStatus('connecting');
        // Schedule retry with exponential backoff
        const backoffDelay = calculateBackoffDelay(0);
        retryTimeoutRef.current = setTimeout(() => {
          retryService();
        }, backoffDelay);
        return;
      }
      
      setServiceAvailable(false);
      setLastError(error instanceof Error ? error.message : 'Unknown error');
      setConnectionStatus('error');
    }
  }, [fetchUnreadCount, userId, subscribeToNotifications, requestThrottleDelay, calculateBackoffDelay]);

  useEffect(() => {
    if (!userId) return;

        // Catch-up fetch for the last 12 hours
    const fetchRecentNotifications = async () => {
      try {
        // Add throttling delay between requests
        await new Promise(resolve => setTimeout(resolve, requestThrottleDelay));
        
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        
        const { data: notifications, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', twelveHoursAgo)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching recent notifications:', error);
          
          // Check if it's a throttling error
          if (error instanceof Error && error.message.includes('503')) {
            setLastError('Service throttled - too many requests. Retrying with backoff...');
            // Don't mark service as unavailable for throttling - just retry with backoff
            return;
          }
          
          setServiceAvailable(false);
          setLastError(error instanceof Error ? error.message : 'Unknown error');
          setConnectionStatus('error');
          stopRetries(); // Stop retry attempts
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
        
        // Check if it's a throttling error
        if (error instanceof Error && error.message.includes('503')) {
          setLastError('Service throttled - too many requests. Retrying with backoff...');
          // Don't mark service as unavailable for throttling - just retry with backoff
          return;
        }
        
        setServiceAvailable(false);
        setLastError(error instanceof Error ? error.message : 'Unknown error');
        setConnectionStatus('error');
        stopRetries(); // Stop retry attempts
      }
    };

    // Initial fetch
    fetchRecentNotifications();
    fetchUnreadCount();
  }, [userId, fetchUnreadCount]);

  // New simplified subscription useEffect with retry/backoff
  useEffect(() => {
    if (!userId) return;

    // Guard: if already subscribed for this userId, don't create another
    if (channelRef.current) return;

    // ensure we don't react to late events after cleanup
    let isCurrent = true;
    let retryCount = 0;
    const maxRetries = 5;
    const baseDelay = 2000; // 2 seconds

    // unique name per user (avoid collisions)
    const channelName = `notifications:${userId}`;
    const ch = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p) => {
        if (!isCurrent) return;
        handleInsert(p);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p) => {
        if (!isCurrent) return;
        handleUpdate(p);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p) => {
        if (!isCurrent) return;
        handleDelete(p);
      })
      .subscribe((status) => {
        if (!isCurrent) return;
        console.log('Notification subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          setServiceAvailable(true);
          setLastError(null);
          retryCount = 0; // Reset retry count on success
          console.log('✅ Connection established successfully');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
          console.log('🔌 Connection closed, starting retry logic');
          
          // Retry with exponential backoff, but don't trigger effect cleanup
          if (retryCount < maxRetries && isCurrent) {
            retryCount++;
            const delay = baseDelay * Math.pow(2, retryCount - 1); // Exponential backoff: 2s, 4s, 8s, 16s, 32s
            
            console.log(`📡 Retry attempt ${retryCount} in ${delay / 1000}s (creating fresh channel)`);
            
            setTimeout(() => {
              // Only retry if still current and this is still our channel
              if (isCurrent && channelRef.current === ch) {
                console.log(`🔄 Attempting to reconnect with fresh channel (retry ${retryCount})`);
                
                // Create a fresh channel without triggering effect cleanup
                const freshChannel = supabase
                  .channel(channelName)
                  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p) => {
                    if (!isCurrent) return;
                    handleInsert(p);
                  })
                  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p) => {
                    if (!isCurrent) return;
                    handleUpdate(p);
                  })
                  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p) => {
                    if (!isCurrent) return;
                    handleDelete(p);
                  })
                  .subscribe((retryStatus) => {
                    if (!isCurrent) return;
                    console.log(`Retry subscription status (attempt ${retryCount}):`, retryStatus);
                    
                    if (retryStatus === 'SUBSCRIBED') {
                      setConnectionStatus('connected');
                      setServiceAvailable(true);
                      setLastError(null);
                      retryCount = 0; // Reset retry count on success
                      console.log('✅ Retry connection successful');
                    } else if (retryStatus === 'CLOSED') {
                      setConnectionStatus('disconnected');
                    } else if (retryStatus === 'CHANNEL_ERROR' || retryStatus === 'TIMED_OUT') {
                      setConnectionStatus('error');
                      setServiceAvailable(false);
                    }
                  });
                
                // Update the channel reference
                channelRef.current = freshChannel;
              }
            }, delay);
          } else if (retryCount >= maxRetries) {
            console.log('🚫 Max retries reached, stopping automatic reconnection');
            setServiceAvailable(false);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('error');
          setServiceAvailable(false);
          console.log('❌ Connection error or timeout');
        }
      });

    channelRef.current = ch;

    // Immediately check if we should update connection status
    // This handles the case where the subscription callback might be delayed
    setTimeout(() => {
      if (channelRef.current && connectionStatus === 'connecting') {
        console.log('🔄 Immediate status update: channel exists, setting to connected');
        setConnectionStatus('connected');
        setServiceAvailable(true);
      }
    }, 100); // Small delay to allow subscription to establish

    return () => {
      // mark stale first to ignore late events
      isCurrent = false;
      if (channelRef.current) {
        console.log('🧹 Unsubscribing notifications channel');
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
    // IMPORTANT: only rerun when userId changes
  }, [userId, supabase, handleInsert, handleUpdate, handleDelete]);

  // Additional effect to check and update connection status based on actual channel state
  useEffect(() => {
    if (!userId) return;

    // Check if we have a channel and it's working
    if (channelRef.current && connectionStatus === 'connecting') {
      // If we're in connecting state but have a channel, check if it's actually working
      const checkConnection = () => {
        if (channelRef.current && connectionStatus === 'connecting') {
          // If we're still connecting after a reasonable time, assume it's working
          // This handles the case where status updates might be delayed
          setTimeout(() => {
            if (channelRef.current && connectionStatus === 'connecting') {
              console.log('🔄 Auto-updating connection status to connected (channel exists)');
              setConnectionStatus('connected');
              setServiceAvailable(true);
            }
          }, 1000); // Wait 1 second to see if status updates naturally
        }
      };

      checkConnection();
    }
  }, [userId, connectionStatus]);

  // Effect to ensure connection status is properly set when channel exists
  useEffect(() => {
    if (!userId) return;

    // If we have a channel but status is still connecting, update it
    if (channelRef.current && connectionStatus === 'connecting') {
      console.log('🔄 Channel exists but status is connecting, updating to connected');
      setConnectionStatus('connected');
      setServiceAvailable(true);
    }
  }, [userId, channelRef.current, connectionStatus]);

  return { 
    unreadCount, 
    fetchUnreadCount, 
    connectionStatus, 
    retryConnection, 
    isConnectionHealthy,
    serviceAvailable,
    lastError,
    isServiceAvailable,
    retryService,
    stopRetries,
    isServiceThrottled,
    isChannelSubscribed,
    canAttemptSubscription
  };
};

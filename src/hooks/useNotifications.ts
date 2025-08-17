import { useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';
import { Notification } from '../types/notifications';

export const useNotifications = (userId?: string) => {
  const channelRef = useRef<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count
  const fetchUnreadCount = async () => {
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
  };

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

        // Show persistent toasts for unread notifications
        notifications?.forEach((notification: Notification) => {
          if (!notification.read) {
            toast(notification.message || notification.title || 'Reminder due', {
              description: notification.title !== notification.message ? notification.title : undefined,
              action: notification.action_url ? {
                label: 'View',
                onClick: () => window.open(notification.action_url, '_blank')
              } : undefined,
              duration: Infinity, // Toast won't auto-dismiss
              dismissible: true // User must manually dismiss
            });
          }
        });
      } catch (error) {
        console.error('Error in catch-up fetch:', error);
      }
    };

    // Subscribe to Realtime INSERTs on notifications table
    const subscribeToNotifications = () => {
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
            console.log('New notification received:', notification);
            
            // Show persistent toast for new notification (won't auto-dismiss)
            toast(notification.message || notification.title || 'Reminder due', {
              description: notification.title !== notification.message ? notification.title : undefined,
              action: notification.action_url ? {
                label: 'View',
                onClick: () => window.open(notification.action_url, '_blank')
              } : undefined,
              duration: Infinity, // Toast won't auto-dismiss
              dismissible: true // User must manually dismiss
            });
            
            // Update unread count
            setUnreadCount((prev: number) => prev + 1);
          }
        )
        .subscribe((status) => {
          console.log('Notification subscription status:', status);
        });
    };

    // Initial fetch and subscription
    fetchRecentNotifications();
    fetchUnreadCount();
    subscribeToNotifications();

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [userId]);

  return { unreadCount, fetchUnreadCount };
};

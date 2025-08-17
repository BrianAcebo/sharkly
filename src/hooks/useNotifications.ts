import { useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';
import { Notification } from '../types/notifications';

export const useNotifications = (userId?: string) => {
  const channelRef = useRef<any>(null);

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

        // Show toasts for unread notifications
        notifications?.forEach((notification: Notification) => {
          if (!notification.read) {
            toast(notification.message || notification.title || 'Reminder due', {
              description: notification.title !== notification.message ? notification.title : undefined,
              action: notification.action_url ? {
                label: 'View',
                onClick: () => window.open(notification.action_url, '_blank')
              } : undefined
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
            
            // Show toast for new notification
            toast(notification.message || notification.title || 'Reminder due', {
              description: notification.title !== notification.message ? notification.title : undefined,
              action: notification.action_url ? {
                label: 'View',
                onClick: () => window.open(notification.action_url, '_blank')
              } : undefined
            });
          }
        )
        .subscribe((status) => {
          console.log('Notification subscription status:', status);
        });
    };

    // Initial fetch and subscription
    fetchRecentNotifications();
    subscribeToNotifications();

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [userId]);

  return {};
};

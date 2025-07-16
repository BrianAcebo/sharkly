import { useState } from "react";
import { type Notification, NotificationsContext } from "../contexts/NotificationsContext";


const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'permission',
      title: 'Terry Franci',
      message: 'requests permission to change Project - Nganter App',
      timestamp: '5 min ago',
      read: false,
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
      user: 'Terry Franci'
    },
    {
      id: '2',
      type: 'permission',
      title: 'Alena Franci',
      message: 'requests permission to change Project - Nganter App',
      timestamp: '8 min ago',
      read: false,
      avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
      user: 'Alena Franci'
    },
    {
      id: '3',
      type: 'permission',
      title: 'Jocelyn Kenter',
      message: 'requests permission to change Project - Nganter App',
      timestamp: '15 min ago',
      read: false,
      avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
      user: 'Jocelyn Kenter'
    },
    {
      id: '4',
      type: 'permission',
      title: 'Brandon Philips',
      message: 'requests permission to change Project - Nganter App',
      timestamp: '1 hr ago',
      read: true,
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
      user: 'Brandon Philips'
    }
  ];
  
export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  
    const unreadCount = notifications.filter(n => !n.read).length;
  
    const addNotification = (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: Notification = {
        ...notificationData,
        id: Date.now().toString(),
        timestamp: 'now',
        read: false
      };
      setNotifications(prev => [newNotification, ...prev]);
    };
  
    const markAsRead = (id: string) => {
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    };
  
    const markAllAsRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };
  
    return (
      <NotificationsContext.Provider value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead
      }}>
        {children}
      </NotificationsContext.Provider>
    );
};
/**
 * Service Worker for Push Notifications and Task Reminders
 * Works locally and handles background sync for notifications
 */

const CACHE_NAME = 'paperboat-crm-v1';
const NOTIFICATION_TAG = 'task-reminder';

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Only cache files that exist and are accessible
        const filesToCache = [
          '/',
          '/index.html'
        ];
        
        // Try to add each file individually to avoid failures
        const cachePromises = filesToCache.map(file => 
          cache.add(file).catch(error => {
            console.warn(`Failed to cache ${file}:`, error);
            return null; // Continue with other files
          })
        );
        
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker installation failed:', error);
        // Still skip waiting even if caching fails
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated successfully');
      return self.clients.claim();
    })
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('Push data:', data);
      
      const options = {
        body: data.message || 'You have a new notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.tag || NOTIFICATION_TAG,
        requireInteraction: data.priority === 'urgent',
        actions: data.action_url ? [
          {
            action: 'view',
            title: 'View',
            icon: '/favicon.ico'
          }
        ] : [],
        data: data
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title || 'PaperBoat CRM', options)
      );
    } catch (error) {
      console.error('Error parsing push data:', error);
      
      // Fallback notification
      const options = {
        body: 'You have a new notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: NOTIFICATION_TAG
      };
      
      event.waitUntil(
        self.registration.showNotification('PaperBoat CRM', options)
      );
    }
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view' && event.notification.data?.action_url) {
    // Open the specific URL
    event.waitUntil(
      clients.openWindow(event.notification.data.action_url)
    );
  } else {
    // Default: open the main app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync for task reminders
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event);
  
  if (event.tag === 'task-reminder-sync') {
    event.waitUntil(
      checkTaskReminders()
    );
  }
});

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    console.log('Periodic sync event:', event);
    
    if (event.tag === 'task-reminder-check') {
      event.waitUntil(
        checkTaskReminders()
      );
    }
  });
}

// Check for task reminders
async function checkTaskReminders() {
  try {
    console.log('Checking task reminders in background...');
    
    // Get current time
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const currentDate = now.toISOString().split('T')[0];
    
    // In a real implementation, you would:
    // 1. Fetch tasks from IndexedDB or make a network request
    // 2. Check which tasks are due
    // 3. Show notifications for due tasks
    
    // For now, we'll just log that we're checking
    console.log(`Background check: ${currentDate} at ${currentTime}`);
    
    // You could also send a message to the main thread to trigger a check
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'TASK_REMINDER_CHECK',
        data: { date: currentDate, time: currentTime }
      });
    });
    
  } catch (error) {
    console.error('Error checking task reminders in background:', error);
  }
}

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Message received in Service Worker:', event.data);
  
  if (event.data && event.data.type === 'REGISTER_TASK_REMINDER') {
    // Register a task reminder
    const { taskId, dueDate, reminderTime } = event.data;
    console.log(`Registering reminder for task ${taskId} due ${dueDate} at ${reminderTime}`);
    
    // In a real implementation, you would store this in IndexedDB
    // and schedule a notification for the reminder time
  }
});

// Handle fetch events for offline support
self.addEventListener('fetch', (event) => {
  // Only handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
        .catch(() => {
          // Return offline page if available
          return caches.match('/');
        })
    );
  }
});

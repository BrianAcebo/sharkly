import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './providers/AuthProvider';
import { AssistantProvider } from './providers/AssistantProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { NotificationsProvider } from './providers/NotificationsProvider';
import App from './App';
import './index.css';

// Register service worker for notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration);
        
        // Request notification permission
        if ('Notification' in window) {
          Notification.requestPermission();
        }
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <AssistantProvider>
          <ThemeProvider>
            <NotificationsProvider>
              <App />
            </NotificationsProvider>
          </ThemeProvider>
        </AssistantProvider>
      </AuthProvider>
    </HelmetProvider>
  </StrictMode>
);

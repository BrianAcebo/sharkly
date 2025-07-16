import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './providers/AuthProvider';
import { DataProvider } from './providers/DataProvider';
import { AssistantProvider } from './providers/AssistantProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { NotificationsProvider } from './providers/NotificationsProvider';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <DataProvider>
          <AssistantProvider>
            <ThemeProvider>
              <NotificationsProvider>
                <App />
              </NotificationsProvider>
            </ThemeProvider>
          </AssistantProvider>
        </DataProvider>
      </AuthProvider>
    </HelmetProvider>
  </StrictMode>
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './providers/AuthProvider';
import { AssistantProvider } from './providers/AssistantProvider';
import { ThemeProvider } from './providers/ThemeProvider';

import App from './App';
import './index.css';



createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <AssistantProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </AssistantProvider>
      </AuthProvider>
    </HelmetProvider>
  </StrictMode>
);

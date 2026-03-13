import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './providers/AuthProvider';
import { AssistantProvider } from './providers/AssistantProvider';
import { ThemeProvider } from './providers/ThemeProvider';

import App from './App';
import './index.css';
import { supabase } from './utils/supabaseClient';
import { setApiAuthGetter } from './utils/api';

// Attach Supabase session to all API requests so auth middleware can validate the token
setApiAuthGetter(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return (session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) as Record<string, string>;
});

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

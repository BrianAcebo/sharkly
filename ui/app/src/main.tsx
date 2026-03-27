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
import * as Sentry from '@sentry/react';

/** Public DSN — override with VITE_SENTRY_DSN in env if needed */
const defaultBrowserDsn =
	'https://2f8036ca5ec8b6dfcfea7b289e06163f@o4511108528472064.ingest.us.sentry.io/4511108531027968';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN || defaultBrowserDsn;

Sentry.init({
	dsn: sentryDsn,
	enabled: import.meta.env.PROD,
	sendDefaultPii: true,
	environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
	release: import.meta.env.VITE_SENTRY_RELEASE,
	integrations: [Sentry.browserTracingIntegration()],
	tracePropagationTargets: [
		'localhost',
		/^https:\/\/.+\.sharkly\.co/,
		/^https:\/\/.+\.fly\.dev/,
	],
	tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
	// Tag browser events so they are distinct from Fly API events when both share one Sentry project.
	beforeSend(event) {
		event.tags = { ...event.tags, source: 'browser', runtime: 'javascript' };
		return event;
	},
});

// Attach Supabase session to all API requests so auth middleware can validate the token
setApiAuthGetter(async () => {
	const {
		data: { session }
	} = await supabase.auth.getSession();
	return (
		session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
	) as Record<string, string>;
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

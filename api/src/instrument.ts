/**
 * Sentry for the API — import this file before any other application modules (see index.ts).
 * Set SENTRY_DSN in production (e.g. fly secrets) to your Sentry *server/Node* project DSN.
 * Browser or Vercel client DSNs will not accept events from this API.
 *
 * Free tier: error events + limited performance units — keep tracesSampleRate at 0 unless you explicitly want traces.
 */
import './loadEnv.js';
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;
if (dsn) {
	Sentry.init({
		dsn,
		enabled: process.env.NODE_ENV === 'production',
		sendDefaultPii: true,
		environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
		release: process.env.SENTRY_RELEASE,
		// Performance monitoring is optional on free tier; set SENTRY_TRACES_SAMPLE_RATE (e.g. 0.1) to enable.
		tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
		// Always tag Node events so they are distinguishable from the React app if both use the same Sentry project DSN.
		beforeSend(event) {
			event.tags = { ...event.tags, source: 'api', runtime: 'nodejs' };
			return event;
		},
	});

	process.on('unhandledRejection', (reason: unknown) => {
		console.error('[process] unhandledRejection:', reason);
		Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
			tags: { kind: 'unhandledRejection' },
		});
	});

	process.on('uncaughtException', (error: Error) => {
		console.error('[process] uncaughtException:', error);
		Sentry.captureException(error, { tags: { kind: 'uncaughtException' } });
		Sentry.flush(2000).finally(() => process.exit(1));
	});
}

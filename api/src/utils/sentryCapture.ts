/**
 * Central Sentry reporting for the API (error monitoring — compatible with Sentry free/developer tier).
 * Use for try/catch paths that respond with res.status(...) without calling next(err).
 */
import type { Request } from 'express';
import * as Sentry from '@sentry/node';

/** True only when DSN is set and the process is production — avoids noisy alerts from local dev. */
export function sentryEnabled(): boolean {
	return Boolean(process.env.SENTRY_DSN) && process.env.NODE_ENV === 'production';
}

function baseRequestTags(req: Request): Record<string, string> {
	return {
		method: req.method,
		path: req.path ?? '',
	};
}

/**
 * Report an unexpected error with request context (no PII in extras by default).
 * Fire-and-forget flush helps NDJSON/streaming handlers where the response ends quickly.
 */
export function captureApiError(
	err: unknown,
	req: Request | undefined,
	extra?: { feature?: string; [key: string]: unknown }
): void {
	if (!sentryEnabled()) return;
	const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err));

	Sentry.withScope((scope) => {
		if (extra?.feature) scope.setTag('feature', String(extra.feature));
		if (extra?.stage != null) scope.setTag('stage', String(extra.stage));
		// Tags (not only context) so Sentry alert rules can match e.g. Anthropic 404s
		if (extra?.http_status != null) scope.setTag('anthropic_http_status', String(extra.http_status));
		if (extra?.error_category != null) scope.setTag('error_category', String(extra.error_category));
		if (extra?.anthropic_error_type != null) scope.setTag('anthropic_error_type', String(extra.anthropic_error_type));
		if (req) {
			for (const [k, v] of Object.entries(baseRequestTags(req))) {
				scope.setTag(`http.${k}`, v);
			}
			if (req.userId) scope.setUser({ id: req.userId });
		}
		if (extra) {
			const { feature: _f, ...rest } = extra;
			if (Object.keys(rest).length > 0) scope.setContext('extra', rest as Record<string, unknown>);
		}
		Sentry.captureException(e);
	});
	void Sentry.flush(2000);
}

/** Non-exception events (e.g. refund RPC failure) — capped severity to avoid noise. */
export function captureApiWarning(message: string, req: Request | undefined, context?: Record<string, unknown>): void {
	if (!sentryEnabled()) return;
	Sentry.withScope((scope) => {
		scope.setLevel('warning');
		if (req) {
			for (const [k, v] of Object.entries(baseRequestTags(req))) {
				scope.setTag(`http.${k}`, v);
			}
			if (req.userId) scope.setUser({ id: req.userId });
		}
		if (context) scope.setContext('details', context);
		Sentry.captureMessage(message);
	});
}

/** Await before ending streaming responses so the event is sent before the process/request closes. */
export async function flushSentry(ms = 2000): Promise<void> {
	if (!sentryEnabled()) return;
	await Sentry.flush(ms);
}

/**
 * User-visible feature failure when no Error was thrown (bad model output, validation after AI,
 * streamed NDJSON error + refund). Reported at error level so alert rules match API failures.
 */
export function captureFeatureFailure(
	message: string,
	req: Request | undefined,
	extra?: { feature?: string; [key: string]: unknown }
): void {
	captureApiError(new Error(message), req, extra);
}

/** Call once at startup: makes missing API DSN obvious in Fly logs. */
export function logSentryConfigStatus(): void {
	if (process.env.NODE_ENV !== 'production') return;
	if (process.env.SENTRY_DSN) return;
	console.warn(
		'[Sentry] SENTRY_DSN is not set — API errors (including Claude/article failures) will not be sent. Set fly secrets (use the Node/backend DSN from Sentry, not the browser/Vercel DSN).'
	);
}

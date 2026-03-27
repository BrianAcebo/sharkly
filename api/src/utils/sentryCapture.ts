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

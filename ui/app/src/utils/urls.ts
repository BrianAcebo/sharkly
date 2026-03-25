/**
 * URL utilities for dynamic URL management
 *
 * Production (app.sharkly.co): the SPA and the Express API are different origins. There is no
 * reverse-proxy in front of the static app that forwards /api to the API — the browser must call
 * the API host directly (see SHARKLY_PRODUCTION_API_ORIGIN), or set VITE_API_BASE at build time.
 *
 * Local dev: Vite’s dev server proxies /api → localhost:3000 (vite.config only; not used in prod).
 */

/** Express API on Fly.io — matches `app` in api/fly.toml (`sharkly-api`). Hostname is *.fly.dev, not .fly.io. */
export const SHARKLY_PRODUCTION_API_ORIGIN = 'https://sharkly-api.fly.dev' as const;

// Get the current base URL (works in both browser and server environments)
export const getBaseUrl = (): string => {
	if (typeof window !== 'undefined') {
		// Browser environment
		return window.location.origin;
	}

	// Server environment - use request headers or fallback
	return process.env.FRONTEND_URL || 'http://localhost:5173';
};

// API origin for fetch / buildApiUrl / api helper
export const getApiUrl = (): string => {
	if (typeof window !== 'undefined') {
		const base = import.meta.env.VITE_API_BASE as string | undefined;
		if (base) return base.replace(/\/$/, '');
		if (window.location.hostname === 'app.sharkly.co') return SHARKLY_PRODUCTION_API_ORIGIN;
		// Same-origin (e.g. localhost:5173); dev server proxies /api to the API — not deployed behavior
		return window.location.origin;
	}

	return process.env.VITE_API_BASE || process.env.API_BASE_URL || 'http://localhost:3000';
};

// Build full URL for a given path
export const buildUrl = (path: string): string => {
	const baseUrl = getBaseUrl();
	return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

// Build API URL for a given endpoint
export const buildApiUrl = (endpoint: string): string => {
	const apiUrl = getApiUrl();
	return `${apiUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

/**
 * Get the backend URL for server-side routes (e.g. /auth/shopify/install).
 * Used when the frontend needs to redirect to the API server directly.
 */
export const getBackendUrl = (): string => {
	if (typeof window !== 'undefined') {
		const base = import.meta.env.VITE_API_BASE as string | undefined;
		if (base) return base.replace(/\/$/, '');
		if (window.location.hostname === 'app.sharkly.co') return SHARKLY_PRODUCTION_API_ORIGIN;
		// Local direct links to Express (e.g. Shopify install) — not the Vite proxy
		return 'http://localhost:3000';
	}
	return process.env.VITE_API_BASE || process.env.BACKEND_URL || 'http://localhost:3000';
};

export const buildBackendUrl = (path: string): string => {
	const base = getBackendUrl();
	return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

/**
 * Marketing site homepage URL (separate from app).
 * Production: sharkly.co. Local dev: localhost:4321.
 * Use for redirecting unauthenticated users from protected routes.
 */
export const getMarketingUrl = (): string => {
	if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
		return 'http://localhost:4321';
	}
	return import.meta.env.VITE_MARKETING_URL ?? 'https://sharkly.co';
};

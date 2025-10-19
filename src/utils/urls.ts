/**
 * URL utilities for dynamic URL management
 */

// Get the current base URL (works in both browser and server environments)
export const getBaseUrl = (): string => {
	if (typeof window !== 'undefined') {
		// Browser environment
		return window.location.origin;
	}

	// Server environment - use request headers or fallback
	return process.env.FRONTEND_URL || 'http://localhost:5173';
};

// Get API base URL - same domain, different port in development
export const getApiUrl = (): string => {
	if (typeof window !== 'undefined') {
		const base = import.meta.env.VITE_API_BASE as string | undefined;
		if (base) {
			return base;
		}
		// Determine fallback based on current origin (dev vs prod)
		const currentPort = window.location.port;
		if (currentPort === '5173' || currentPort === '3000') {
			return `${window.location.protocol}//${window.location.hostname}:3001`;
		}
		return window.location.origin;
	}

	return process.env.VITE_API_BASE || process.env.API_BASE_URL || 'http://localhost:3001';
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

export class ApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.status = status;
		this.name = 'ApiError';
	}
}

export const API_BASE = import.meta.env.PROD
	? (import.meta.env.VITE_API_BASE as string)
	: 'http://localhost:3000';

const buildUrl = (endpoint: string): string =>
	`${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

export interface ApiRequestOptions extends RequestInit {
	json?: unknown;
}

export async function apiRequest<T = unknown>(
	endpoint: string,
	options: ApiRequestOptions = {}
): Promise<T> {
	const { json, headers, ...rest } = options;

	const init: RequestInit = {
		credentials: 'include',
		...rest,
		headers: {
			...(headers ?? {}),
		},
	};

	if (json !== undefined) {
		init.headers = {
			'Content-Type': 'application/json',
			...init.headers,
		};
		init.body = JSON.stringify(json);
	}

	const response = await fetch(buildUrl(endpoint), init);

	if (!response.ok) {
		const message = (await response.text().catch(() => response.statusText)) || response.statusText;
		throw new ApiError(message, response.status);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		return (await response.json()) as T;
	}

	return (await response.text()) as unknown as T;
}

export const apiGet = <T = unknown>(endpoint: string, options?: ApiRequestOptions) =>
	apiRequest<T>(endpoint, { ...(options ?? {}), method: 'GET' });

export const apiPost = <T = unknown>(endpoint: string, json?: unknown, options?: ApiRequestOptions) =>
	apiRequest<T>(endpoint, { ...(options ?? {}), method: 'POST', json });

export const apiPut = <T = unknown>(endpoint: string, json?: unknown, options?: ApiRequestOptions) =>
	apiRequest<T>(endpoint, { ...(options ?? {}), method: 'PUT', json });

export const apiDelete = <T = unknown>(endpoint: string, options?: ApiRequestOptions) =>
	apiRequest<T>(endpoint, { ...(options ?? {}), method: 'DELETE' });

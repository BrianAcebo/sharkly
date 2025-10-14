import { supabase } from './supabaseClient';
import { buildApiUrl } from './urls';

export class ApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.status = status;
		this.name = 'ApiError';
	}
}

type RequestData = Record<string, unknown>;

export const api = {
	async request<T>(
		endpoint: string,
		options: {
			method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
			data?: unknown;
			organizationId?: string;
		} = {}
	): Promise<T> {
		try {
			// Get the current session
			const {
				data: { session }
			} = await supabase.auth.getSession();

			if (!session) {
				throw new ApiError('Not authenticated', 401);
			}

			const { method = 'GET', data, organizationId } = options;

			// Prepare the request body
			const body = data !== undefined
				? (typeof data === 'object' && data !== null
					? { ...(data as Record<string, unknown>), organization: organizationId ? { id: organizationId } : undefined }
					: data)
				: undefined;

			const fullUrl = buildApiUrl(endpoint);

			const response = await fetch(fullUrl, {
				method,
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					'Content-Type': 'application/json'
				},
				body: body ? JSON.stringify(body) : undefined
			});

			try {
				return await response.json();
			} catch (parseError) {
				throw new Error('Invalid JSON response');
			}
		} catch (error) {
			throw error;
		}
	},

	// Convenience methods
	async get<T>(endpoint: string, organizationId?: string): Promise<T> {
		return this.request<T>(endpoint, { method: 'GET', organizationId });
	},

	async post<T>(endpoint: string, data: RequestData, organizationId?: string): Promise<T> {
		return this.request<T>(endpoint, { method: 'POST', data, organizationId });
	},

	async put<T>(endpoint: string, data: RequestData, organizationId?: string): Promise<T> {
		return this.request<T>(endpoint, { method: 'PUT', data, organizationId });
	},

	async delete<T>(endpoint: string, organizationId?: string): Promise<T> {
		return this.request<T>(endpoint, { method: 'DELETE', organizationId });
	}
};

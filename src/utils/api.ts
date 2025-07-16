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
			data?: RequestData;
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
			const body = data
				? {
						...data,
						organization: organizationId ? { id: organizationId } : undefined
					}
				: undefined;

			const apiUrl = window.location.origin;
			if (!apiUrl) {
				throw new ApiError('API URL not configured', 500);
			}

			const fullUrl = buildApiUrl(endpoint);
			console.log('Making API request:', {
				method,
				url: fullUrl,
				body,
				hasToken: !!session.access_token
			});

			const response = await fetch(fullUrl, {
				method,
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					'Content-Type': 'application/json'
				},
				body: body ? JSON.stringify(body) : undefined
			});

			console.log('Response status:', response.status, response.statusText);

			let responseData;
			try {
				responseData = await response.json();
			} catch (parseError) {
				console.error('Failed to parse response:', parseError);
				throw new ApiError('Invalid response format', response.status);
			}

			console.log('Response data:', responseData);

			if (!response.ok) {
				const errorMessage =
					responseData.error?.message || responseData.error || 'An error occurred';
				throw new ApiError(errorMessage, response.status);
			}

			return responseData;
		} catch (error) {
			if (error instanceof ApiError) {
				throw error;
			}
			if (error instanceof TypeError && error.message.includes('fetch')) {
				throw new ApiError('Network error - unable to connect to server', 500);
			}
			console.error('API request error:', error);
			throw new ApiError('Network error', 500);
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

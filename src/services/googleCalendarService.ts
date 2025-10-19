import { supabase } from '../utils/supabaseClient';

export interface GoogleCalendarEvent {
	id: string;
	summary: string;
	description?: string;
	start: {
		dateTime?: string;
		date?: string;
		timeZone?: string;
	};
	end: {
		dateTime?: string;
		date?: string;
		timeZone?: string;
	};
	location?: string;
	attendees?: Array<{
		email: string;
		displayName?: string;
		responseStatus?: string;
	}>;
	reminders?: {
		useDefault: boolean;
		overrides?: Array<{
			method: 'email' | 'popup';
			minutes: number;
		}>;
	};
}

export interface GoogleCalendarList {
	items: Array<{
		id: string;
		summary: string;
		primary?: boolean;
		accessRole: string;
	}>;
}

class GoogleCalendarService {
	private accessToken: string | null = null;
	private refreshToken: string | null = null;
	private tokenExpiry: number | null = null;

	// Initialize the service with tokens from Supabase
	async initialize() {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error('No authenticated user');

			// Get Google OAuth tokens from user metadata or separate table
			const { data: tokens, error } = await supabase
				.from('user_google_tokens')
				.select('access_token, refresh_token, expires_at')
				.eq('user_id', user.id)
				.single();

			if (error) {
				return false;
			}

			if (!tokens) {
				// No Google tokens found, user needs to connect
				return null;
			}

			this.accessToken = tokens.access_token;
			this.refreshToken = tokens.refresh_token;
			this.tokenExpiry = tokens.expires_at;

			// Check if token is expired and refresh if needed
			if (this.isTokenExpired()) {
				await this.refreshAccessToken();
			}

			return true;
		} catch {
			return false;
		}
	}

	// Check if access token is expired
	private isTokenExpired(): boolean {
		if (!this.tokenExpiry) return true;
		// Add 5 minute buffer
		return Date.now() >= (this.tokenExpiry - 5 * 60 * 1000);
	}

	// Refresh access token using refresh token
	private async refreshAccessToken(): Promise<boolean> {
		try {
			if (!this.refreshToken) throw new Error('No refresh token available');

			const response = await fetch('/api/google/refresh-token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					refresh_token: this.refreshToken,
				}),
			});

			if (!response.ok) throw new Error('Failed to refresh token');

			const data = await response.json();
			this.accessToken = data.access_token;
			this.tokenExpiry = Date.now() + (data.expires_in * 1000);

			// Update tokens in database
			await this.updateTokensInDatabase();

			return true;
		} catch {
			return false;
		}
	}

	// Update tokens in database
	private async updateTokensInDatabase() {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			await supabase
				.from('user_google_tokens')
				.upsert({
					user_id: user.id,
					access_token: this.accessToken,
					refresh_token: this.refreshToken,
					expires_at: this.tokenExpiry,
					updated_at: new Date().toISOString(),
				});
		} catch {
			// Silent error handling
		}
	}

	// Get list of user's calendars
	async getCalendarList(): Promise<GoogleCalendarList> {
		try {
			if (!this.accessToken) throw new Error('No access token');

			const response = await fetch(
				'https://www.googleapis.com/calendar/v3/users/me/calendarList',
				{
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
					},
				}
			);

			if (!response.ok) throw new Error('Failed to fetch calendar list');

			return await response.json();
		} catch (error) {
			throw error;
		}
	}

	// Get events from a specific calendar
	async getEvents(
		calendarId: string = 'primary',
		timeMin?: string,
		timeMax?: string,
		maxResults: number = 100
	): Promise<{ items: GoogleCalendarEvent[] }> {
		try {
			if (!this.accessToken) throw new Error('No access token');

			const params = new URLSearchParams({
				maxResults: maxResults.toString(),
				singleEvents: 'true',
				orderBy: 'startTime',
			});

			if (timeMin) params.append('timeMin', timeMin);
			if (timeMax) params.append('timeMax', timeMax);

			const response = await fetch(
				`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
					calendarId
				)}/events?${params}`,
				{
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
					},
				}
			);

			if (!response.ok) throw new Error('Failed to fetch events');

			return await response.json();
		} catch (error) {
			throw error;
		}
	}

	// Create a new event
	async createEvent(
		calendarId: string = 'primary',
		event: Omit<GoogleCalendarEvent, 'id'>
	): Promise<GoogleCalendarEvent> {
		try {
			if (!this.accessToken) throw new Error('No access token');

			const response = await fetch(
				`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
					calendarId
				)}/events`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(event),
				}
			);

			if (!response.ok) throw new Error('Failed to create event');

			return await response.json();
		} catch (error) {
			throw error;
		}
	}

	// Update an existing event
	async updateEvent(
		calendarId: string = 'primary',
		eventId: string,
		event: Partial<GoogleCalendarEvent>
	): Promise<GoogleCalendarEvent> {
		try {
			if (!this.accessToken) throw new Error('No access token');

			const response = await fetch(
				`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
					calendarId
				)}/events/${eventId}`,
				{
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(event),
				}
			);

			if (!response.ok) throw new Error('Failed to update event');

			return await response.json();
		} catch (error) {
			throw error;
		}
	}

	// Delete an event
	async deleteEvent(calendarId: string = 'primary', eventId: string): Promise<boolean> {
		try {
			if (!this.accessToken) throw new Error('No access token');

			const response = await fetch(
				`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
					calendarId
				)}/events/${eventId}`,
				{
					method: 'DELETE',
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
					},
				}
			);

			return response.ok;
		} catch {
			return false;
		}
	}

	// Sync tasks with Google Calendar
	async syncTasksWithCalendar(tasks: Array<{ id: string; title: string; description?: string; due_date: string; reminder_enabled: boolean }>): Promise<void> {
		try {
			if (!this.accessToken) throw new Error('No access token');

			// Get existing events to avoid duplicates
			const existingEvents = await this.getEvents('primary');
			const existingTaskIds = new Set(
				existingEvents.items
					.filter(event => event.description?.includes('Task ID:'))
					.map(event => {
						const match = event.description?.match(/Task ID: ([a-f0-9-]+)/);
						return match ? match[1] : null;
					})
					.filter(Boolean)
			);

			// Create events for tasks that don't exist in calendar
			for (const task of tasks) {
				if (existingTaskIds.has(task.id)) continue;

				if (task.due_date && task.reminder_enabled) {
					const event: Omit<GoogleCalendarEvent, 'id'> = {
						summary: task.title,
						description: `${task.description || ''}\n\nTask ID: ${task.id}`,
						start: {
							dateTime: new Date(task.due_date).toISOString(),
							timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
						},
						end: {
							dateTime: new Date(task.due_date).toISOString(),
							timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
						},
						reminders: {
							useDefault: false,
							overrides: [
								{
									method: 'popup',
									minutes: 15, // 15 minutes before
								},
							],
						},
					};

					await this.createEvent('primary', event);
				}
			}
		} catch {
			// Silent error handling
		}
	}

	// Get connection status
	isConnected(): boolean {
		return !!this.accessToken && !this.isTokenExpired();
	}

	// Disconnect Google Calendar
	async disconnect(): Promise<void> {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			// Remove tokens from database
			await supabase
				.from('user_google_tokens')
				.delete()
				.eq('user_id', user.id);

			// Clear local tokens
			this.accessToken = null;
			this.refreshToken = null;
			this.tokenExpiry = null;
		} catch {
			// Silent error handling
		}
	}
}

export const googleCalendarService = new GoogleCalendarService();

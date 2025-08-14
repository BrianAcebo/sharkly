import { toast } from 'sonner';

export interface NotificationData {
	title: string;
	body: string;
	icon?: string;
	tag?: string;
	data?: Record<string, unknown>;
	actions?: NotificationAction[];
}

export interface NotificationAction {
	action: string;
	title: string;
	icon?: string;
}

export class NotificationService {
	private static instance: NotificationService;
	private permission: NotificationPermission = 'default';

	private constructor() {
		this.checkPermission();
	}

	public static getInstance(): NotificationService {
		if (!NotificationService.instance) {
			NotificationService.instance = new NotificationService();
		}
		return NotificationService.instance;
	}

	private checkPermission(): void {
		if ('Notification' in window) {
			this.permission = Notification.permission;
		}
	}

	public async requestPermission(): Promise<NotificationPermission> {
		if (!('Notification' in window)) {
			throw new Error('Push notifications are not supported in this browser');
		}

		try {
			const permission = await Notification.requestPermission();
			this.permission = permission;
			console.log('Permission updated to:', permission);
			return permission;
		} catch (error) {
			console.error('Error requesting notification permission:', error);
			throw error;
		}
	}

	public async sendNotification(notificationData: NotificationData): Promise<void> {
		console.log('NotificationService.sendNotification called with:', notificationData);
		console.log('Service permission:', this.permission);
		console.log('Browser permission:', Notification.permission);
		
		if (this.permission !== 'granted') {
			console.log('Service permission not granted, falling back to toast');
			// Fallback to toast notification
			toast(notificationData.body, {
				title: notificationData.title,
				icon: notificationData.icon,
			});
			return;
		}

		try {
			console.log('Creating new Notification...');
			const notification = new Notification(notificationData.title, {
				body: notificationData.body,
				icon: notificationData.icon || '/images/logos/logo.svg',
				tag: notificationData.tag,
				data: notificationData.data,
				actions: notificationData.actions,
				requireInteraction: false,
				silent: false,
			});

			console.log('Notification created successfully:', notification);

			// Auto-close after 5 seconds
			setTimeout(() => {
				notification.close();
			}, 5000);

			// Handle notification click
			notification.onclick = () => {
				notification.close();
				// Focus the window
				window.focus();
				// Navigate to action URL if provided
				if (notificationData.data?.actionUrl) {
					window.location.href = notificationData.data.actionUrl;
				}
			};

		} catch (error) {
			console.error('Error sending notification:', error);
			// Fallback to toast
			toast(notificationData.body, {
				title: notificationData.title,
			});
		}
	}

	// Convenience methods for common notification types
	public async sendLeadNotification(leadName: string, action: string, leadId?: string): Promise<void> {
		await this.sendNotification({
			title: 'New Lead Update',
			body: `${leadName}: ${action}`,
			icon: '/images/logos/logo.svg',
			tag: `lead-${leadId || 'update'}`,
			data: { actionUrl: leadId ? `/leads/${leadId}` : '/leads' }
		});
	}

	public async sendAINotification(message: string, actionUrl?: string): Promise<void> {
		await this.sendNotification({
			title: 'AI Assistant',
			body: message,
			icon: '/images/logos/logo.svg',
			tag: 'ai-insight',
			data: { actionUrl: actionUrl || '/assistant' }
		});
	}

	public async sendReminderNotification(title: string, message: string, dueDate?: string): Promise<void> {
		await this.sendNotification({
			title: `Reminder: ${title}`,
			body: message,
			icon: '/images/logos/logo.svg',
			tag: 'reminder',
			data: { dueDate, actionUrl: '/notifications' }
		});
	}

	public async sendTeamNotification(title: string, message: string, actionUrl?: string): Promise<void> {
		await this.sendNotification({
			title: `Team: ${title}`,
			body: message,
			icon: '/images/logos/logo.svg',
			tag: 'team-update',
			data: { actionUrl: actionUrl || '/chat' }
		});
	}

	public getPermission(): NotificationPermission {
		// Always return the current browser permission, not the cached one
		if ('Notification' in window) {
			this.permission = Notification.permission;
		}
		return this.permission;
	}

	public isSupported(): boolean {
		return 'Notification' in window;
	}

	public isGranted(): boolean {
		return this.permission === 'granted';
	}
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Helper function to check if notifications are supported and enabled
export const canSendNotifications = (): boolean => {
	return notificationService.isSupported() && notificationService.isGranted();
};

// Helper function to send a simple notification
export const sendSimpleNotification = async (title: string, body: string): Promise<void> => {
	await notificationService.sendNotification({ title, body });
};

// Helper function to send lead-related notifications
export const sendLeadNotification = async (leadName: string, action: string, leadId?: string): Promise<void> => {
	await notificationService.sendLeadNotification(leadName, action, leadId);
};

// Helper function to send AI-related notifications
export const sendAINotification = async (message: string, actionUrl?: string): Promise<void> => {
	await notificationService.sendAINotification(message, actionUrl);
};

// Helper function to send reminder notifications
export const sendReminderNotification = async (title: string, message: string, dueDate?: string): Promise<void> => {
	await notificationService.sendReminderNotification(title, message, dueDate);
};

// Helper function to send team notifications
export const sendTeamNotification = async (title: string, message: string, actionUrl?: string): Promise<void> => {
	await notificationService.sendTeamNotification(title, message, actionUrl);
};

import { supabase } from './supabaseClient';

export interface NotificationData {
	title: string;
	message: string;
	type: 'task_reminder' | 'task_assigned' | 'task_completed' | 'general' | 'reminder';
	metadata?: Record<string, any>;
}

export interface TaskReminder {
	id: string;
	task_id: string;
	task_title: string; // This will accept both string and character varying
	due_date: string;
	reminder_time: string;
}

export interface NotificationSettings {
	id: string;
	user_id: string;
	organization_id: string;
	browser_notifications: boolean;
	email_notifications: boolean;
	push_notifications: boolean;
	reminder_advance_minutes: number;
	created_at: string;
	updated_at: string;
}

export class NotificationService {
	private isInitialized = false;
	private audioContext: AudioContext | null = null;
	private reminderCheckInterval: NodeJS.Timeout | null = null;
	private soundEnabled = false; // Flag to control when sounds can be played

	async initialize() {
		if (this.isInitialized) {
			console.log('Notification service already initialized, skipping...');
			return;
		}
		
		try {
			console.log('🚀 Initializing notification service...');
			
			// Request notification permission
			if ('Notification' in window) {
				const permission = await Notification.requestPermission();
				console.log('Notification permission:', permission);
			}

			// Initialize audio context for notification sounds only if not already created
			if (!this.audioContext) {
				console.log('🎵 Setting up audio context...');
				this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
				await this.loadNotificationSound();
			} else {
				console.log('🎵 Audio context already exists, skipping...');
			}

			// Start checking for reminders only if not already started
			if (!this.reminderCheckInterval) {
				console.log('⏰ Starting reminder check...');
				this.startReminderCheck();
			} else {
				console.log('⏰ Reminder check already active, skipping...');
			}

			this.isInitialized = true;
			console.log('✅ Notification service initialized successfully');
			
			// Test audio context is working
			try {
				await this.playNotificationSound();
				console.log('🎵 Test sound played successfully');
			} catch (error) {
				console.warn('⚠️ Test sound failed, but service is initialized:', error);
			}
		} catch (error: unknown) {
			console.error('❌ Failed to initialize notification service:', error);
			// Still mark as initialized to avoid blocking the app
			this.isInitialized = true;
		}
	}

	// Cleanup method to prevent memory leaks
	cleanup() {
		if (this.reminderCheckInterval) {
			clearInterval(this.reminderCheckInterval);
			this.reminderCheckInterval = null;
		}
		// Don't close audio context as it might be used elsewhere
	}

	private async loadNotificationSound() {
		if (!this.audioContext) return;

		try {
			// Just prepare the audio context - don't play anything yet
			// The sound will only be played when playNotificationSound() is explicitly called
			console.log('Notification sound system prepared successfully');
		} catch (error) {
			console.error('Failed to prepare notification sound system:', error);
		}
	}

	async playNotificationSound() {
		if (!this.audioContext) {
			console.log('🔇 Audio context not ready, skipping sound');
			return;
		}

		try {
			console.log('🔊 Playing notification sound...');
			const oscillator = this.audioContext.createOscillator();
			const gainNode = this.audioContext.createGain();

			oscillator.connect(gainNode);
			gainNode.connect(this.audioContext.destination);

			oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
			oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);

			gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
			gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

			oscillator.start(this.audioContext.currentTime);
			oscillator.stop(this.audioContext.currentTime + 0.3);
		} catch (error) {
			console.error('Failed to play notification sound:', error);
		}
	}

	async showNotification(data: NotificationData) {
		if (!this.isInitialized) return;

		try {
			// Get user notification preferences
			const userSettings = await this.getNotificationSettings();
			
			// Play notification sound if user has browser notifications enabled
			if (userSettings?.browser_notifications) {
				this.soundEnabled = true;
				await this.playNotificationSound();
				this.soundEnabled = false;
			}

			// Show browser notification if user has browser notifications enabled
			if (userSettings?.browser_notifications && 'Notification' in window && Notification.permission === 'granted') {
				const notification = new Notification(data.title, {
					body: data.message,
					icon: '/favicon.ico',
					tag: data.metadata?.task_id || 'general',
					requireInteraction: true
				});

				// Handle notification click
				notification.onclick = () => {
					window.focus();
					notification.close();
				};
			}

			// Send email notification if user has email notifications enabled
			if (userSettings?.email_notifications && data.type === 'reminder') {
				await this.sendEmailNotification(data);
			}

			// Dispatch custom event for real-time UI updates
			window.dispatchEvent(new CustomEvent('newNotification', { detail: data }));

			// Store notification in database
			await this.storeNotification(data);

		} catch (error) {
			console.error('Failed to show notification:', error);
		}
	}

	private async storeNotification(data: NotificationData) {
		try {
			const { data: userData } = await supabase.auth.getUser();
			if (!userData.user) return;

			const { data: orgData } = await supabase
				.from('organizations')
				.select('id')
				.eq('id', userData.user.organization_id)
				.single();

			if (!orgData) return;

			await supabase
				.from('notifications')
				.insert({
					user_id: userData.user.id,
					organization_id: orgData.id,
					title: data.title,
					message: data.message,
					type: data.type,
					metadata: data.metadata || {}
				});

		} catch (error) {
			console.error('Failed to store notification:', error);
		}
	}

	private async sendEmailNotification(data: NotificationData) {
		try {
			const { data: userData } = await supabase.auth.getUser();
			if (!userData.user) return;

			// Get user's email from auth
			const userEmail = userData.user.email;
			if (!userEmail) return;

			// For now, log the email that would be sent
			// In production, you'd integrate with an email service like SendGrid, Mailgun, etc.
			console.log('📧 Email notification would be sent to:', userEmail);
			console.log('📧 Subject:', data.title);
			console.log('📧 Body:', data.message);
			
			// TODO: Integrate with email service
			// Example: await emailService.sendEmail(userEmail, data.title, data.message);
			
		} catch (error) {
			console.error('Failed to send email notification:', error);
		}
	}

	// Delete a notification by ID
	async deleteNotification(notificationId: string): Promise<boolean> {
		try {
			const { error } = await supabase
				.from('notifications')
				.delete()
				.eq('id', notificationId);

			if (error) throw error;
			
			console.log(`🗑️ Deleted notification: ${notificationId}`);
			return true;
		} catch (error) {
			console.error('Failed to delete notification:', error);
			return false;
		}
	}

	// Delete multiple notifications by IDs
	async deleteMultipleNotifications(notificationIds: string[]): Promise<boolean> {
		try {
			const { error } = await supabase
				.from('notifications')
				.delete()
				.in('id', notificationIds);

			if (error) throw error;
			
			console.log(`🗑️ Deleted ${notificationIds.length} notifications`);
			return true;
		} catch (error) {
			console.error('Failed to delete multiple notifications:', error);
			return false;
		}
	}

	// Delete all notifications for the current user
	async deleteAllNotifications(): Promise<boolean> {
		try {
			const { data: userData } = await supabase.auth.getUser();
			if (!userData.user) return false;

			const { error } = await supabase
				.from('notifications')
				.delete()
				.eq('user_id', userData.user.id);

			if (error) throw error;
			
			console.log(`🗑️ Deleted all notifications for user: ${userData.user.id}`);
			return true;
		} catch (error) {
			console.error('Failed to delete all notifications:', error);
			return false;
		}
	}

	async checkTaskReminders() {
		if (!this.isInitialized) return;

		try {
			console.log('🔍 Checking for due reminders...');
			const reminders = await this.fetchTasksWithReminders();
			
			console.log(`📋 Fetched reminders from database:`, reminders);
			
			// Only proceed if we have valid reminders
			if (!reminders || reminders.length === 0) {
				console.log('ℹ️ No due reminders found at this time');
				return;
			}
			
			console.log(`🔔 Found ${reminders.length} due reminders, creating notifications...`);
			
			for (const reminder of reminders) {
				try {
					console.log(`📝 Processing reminder for task: ${reminder.task_title}`);
					console.log(`⏰ Reminder time: ${reminder.reminder_time}, Due date: ${reminder.due_date}`);
					
					// Create the notification record in the database
					await this.createTaskReminderNotification(reminder);
					
					// Show the browser notification
					await this.showTaskReminderNotification(reminder);
					
					// Mark the reminder as sent
					await this.markReminderAsSent(reminder.id);
					
					console.log(`✅ Created notification for task: ${reminder.task_title}`);
				} catch (reminderError) {
					console.error('Failed to process reminder:', reminder.id, reminderError);
					// Continue with other reminders even if one fails
				}
			}
		} catch (error) {
			console.error('Failed to check task reminders:', error);
			// Don't let reminder errors crash the app
		}
	}

	private async fetchTasksWithReminders(): Promise<TaskReminder[]> {
		try {
			const { data, error } = await supabase
				.rpc('get_due_reminders');

			if (error) {
				console.error('Database error fetching reminders:', error);
				
				// Handle specific error types
				if (error.code === '42703' || error.message?.includes('does not exist')) {
					console.warn('Reminder function not available, skipping reminders');
					return [];
				}
				
				if (error.code === '42804' || error.message?.includes('structure of query does not match function result type')) {
					console.error('Database function type mismatch. Please run the database fix script.');
					console.error('Error details:', error);
					return [];
				}
				
				throw error;
			}
			return data || [];
		} catch (error) {
			console.error('Failed to fetch due reminders:', error);
			// Return empty array to prevent app crashes
			return [];
		}
	}

	private async markReminderAsSent(reminderId: string) {
		try {
			await supabase
				.from('task_reminders')
				.update({ 
					status: 'sent',
					sent_at: new Date().toISOString()
				})
				.eq('id', reminderId);
		} catch (error) {
			console.error('Failed to mark reminder as sent:', error);
		}
	}

	private async createTaskReminderNotification(reminder: TaskReminder) {
		try {
			// Get user and organization info
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error('User not authenticated');

			// Get user's organization
			const { data: orgData } = await supabase
				.from('user_organizations')
				.select('organization_id')
				.eq('user_id', user.id)
				.single();

			if (!orgData) throw new Error('User not associated with any organization');

			// Check if notification already exists for this task and reminder time
			const { data: existingNotification } = await supabase
				.from('notifications')
				.select('id')
				.eq('user_id', user.id)
				.eq('metadata->task_id', reminder.task_id)
				.eq('metadata->reminder_time', reminder.reminder_time)
				.eq('type', 'reminder')
				.single();

			if (existingNotification) {
				console.log(`⚠️ Notification already exists for task ${reminder.task_id}, skipping...`);
				return;
			}

			// Calculate time until due and determine notification type
			const now = new Date();
			const dueDate = new Date(reminder.due_date);
			const reminderTime = new Date(reminder.reminder_time);
			const isOverdue = dueDate < now;
			
			// Calculate how much advance notice this reminder provides
			const advanceMinutes = Math.round((dueDate.getTime() - reminderTime.getTime()) / (1000 * 60));
			const dueTimeText = this.getBetterDueTimeText(reminder.due_date, advanceMinutes);

			// Create the notification record
			const { error: notificationError } = await supabase
				.from('notifications')
				.insert({
					user_id: user.id,
					organization_id: orgData.organization_id,
					title: isOverdue ? 'Task Overdue!' : 'Reminder',
					message: isOverdue 
						? `"${reminder.task_title}" is overdue` 
						: `"${reminder.task_title}" ${dueTimeText}`,
					type: 'reminder', // Use 'reminder' type to match frontend
					priority: isOverdue ? 'high' : 'medium',
					metadata: {
						task_id: reminder.task_id,
						due_date: reminder.due_date,
						reminder_time: reminder.reminder_time,
						is_overdue: isOverdue,
						advance_minutes: advanceMinutes
					}
				});

			if (notificationError) throw notificationError;
			
			console.log(`📝 Created ${isOverdue ? 'OVERDUE' : 'reminder'} notification for task: ${reminder.task_title}`);
		} catch (error) {
			console.error('Failed to create task reminder notification:', error);
			throw error;
		}
	}

	async showTaskReminderNotification(reminder: TaskReminder) {
		const now = new Date();
		const dueDate = new Date(reminder.due_date);
		const reminderTime = new Date(reminder.reminder_time);
		const isOverdue = dueDate < now;
		
		// Calculate how much advance notice this reminder provides
		const advanceMinutes = Math.round((dueDate.getTime() - reminderTime.getTime()) / (1000 * 60));
		const dueTimeText = this.getBetterDueTimeText(reminder.due_date, advanceMinutes);
		
		await this.showNotification({
			title: isOverdue ? 'Task Overdue!' : 'Task Reminder',
			message: `"${reminder.task_title}" is ${isOverdue ? 'overdue' : dueTimeText}`,
			type: 'reminder', // Use 'reminder' type to match frontend
			metadata: {
				task_id: reminder.task_id,
				due_date: reminder.due_date,
				reminder_time: reminder.reminder_time,
				is_overdue: isOverdue,
				advance_minutes: advanceMinutes
			}
		});
	}



	private getBetterDueTimeText(dueDate: string, advanceMinutes: number): string {
		// This is a reminder notification, so show the specific reminder time
		if (advanceMinutes > 0) {
			if (advanceMinutes < 60) {
				return `due in ${advanceMinutes} minutes`;
			} else if (advanceMinutes < 1440) { // less than 24 hours
				const hours = Math.floor(advanceMinutes / 60);
				const minutes = advanceMinutes % 60;
				if (minutes === 0) {
					return `due in ${hours} hour${hours > 1 ? 's' : ''}`;
				} else {
					return `due in ${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
				}
			} else {
				const days = Math.floor(advanceMinutes / 1440);
				return `due in ${days} day${days > 1 ? 's' : ''}`;
			}
		}
		
		// If no advance time specified, calculate from due date
		const due = new Date(dueDate);
		const now = new Date();
		const diffMs = due.getTime() - now.getTime();
		
		if (diffMs < 0) return 'overdue';
		
		const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
		if (diffDays === 0) return 'due today';
		if (diffDays === 1) return 'due tomorrow';
		return `due in ${diffDays} days`;
	}

	startReminderCheck() {
		console.log('🔌 WebSocket-based reminder system active - no polling needed');
		console.log('✅ Real-time notifications will be delivered instantly via WebSocket');
		
		// Note: Polling is no longer needed with WebSocket implementation
		// Reminders are now handled by the NotificationsProvider WebSocket subscription
		// which listens for INSERT events on the notifications table
	}

	stopReminderCheck() {
		if (this.reminderCheckInterval) {
			clearInterval(this.reminderCheckInterval);
			this.reminderCheckInterval = null;
			console.log('Reminder check stopped');
		}
	}

	async getNotificationSettings() {
		try {
			const { data: userData } = await supabase.auth.getUser();
			if (!userData.user) return null;

			const { data, error } = await supabase
				.from('user_notification_settings')
				.select('*')
				.eq('user_id', userData.user.id)
				.single();

			if (error) throw error;
			return data;
		} catch (error) {
			console.error('Failed to get notification settings:', error);
			return null;
		}
	}

	async updateNotificationSettings(settings: Partial<{
		browser_notifications: boolean;
		email_notifications: boolean;
		push_notifications: boolean;
		reminder_advance_minutes: number;
	}>) {
		try {
			const { data: userData } = await supabase.auth.getUser();
			if (!userData.user) return false;

			const { error } = await supabase
				.from('user_notification_settings')
				.upsert({
					user_id: userData.user.id,
					organization_id: userData.user.organization_id,
					...settings
				});

			if (error) throw error;
			return true;
		} catch (error) {
			console.error('Failed to update notification settings:', error);
			return false;
		}
	}

	// Manual test function for debugging
	async testNotificationSystem() {
		console.log('🧪 Testing notification system...');
		
		try {
			// Test 1: Check if we can fetch reminders
			console.log('📋 Test 1: Fetching reminders...');
			const reminders = await this.fetchTasksWithReminders();
			console.log('📋 Found reminders:', reminders);
			
			// Test 2: Check if we can show a test notification
			console.log('🔔 Test 2: Showing test notification...');
			// Enable sounds for testing
			this.enableSounds();
			await this.showNotification({
				title: 'Test Notification',
				message: 'This is a test notification to verify the system is working',
				type: 'general',
				metadata: { test: true }
			});
			
			// Test 3: Check browser notification permission
			console.log('🔐 Test 3: Browser notification permission:', Notification.permission);
			
			// Test 4: Check if we can access the database function
			console.log('🗄️ Test 4: Testing database function...');
			const { data, error } = await supabase.rpc('get_due_reminders');
			console.log('🗄️ Database function result:', { data, error });
			
			// Test 5: Manually trigger reminder check
			console.log('🔍 Test 5: Manually triggering reminder check...');
			await this.checkTaskReminders();
			
			console.log('✅ All tests completed');
		} catch (error) {
			console.error('❌ Test failed:', error);
		}
	}

	// Manual method to trigger reminder check
	async triggerReminderCheck() {
		console.log('🔍 Manually triggering reminder check...');
		await this.checkTaskReminders();
	}

	// Debug method to check task_reminders table directly
	async debugTaskReminders() {
		try {
			console.log('🔍 Debugging task_reminders table...');
			
			// Check all pending reminders
			const { data: allReminders, error: allError } = await supabase
				.from('task_reminders')
				.select('*')
				.eq('status', 'pending')
				.order('reminder_time', { ascending: true });
			
			if (allError) {
				console.error('❌ Error fetching all reminders:', allError);
				return;
			}
			
			console.log('📋 All pending reminders:', allReminders);
			
			// Check reminders that should be due
			const now = new Date();
			console.log('⏰ Current time:', now.toISOString());
			
			const dueReminders = allReminders?.filter(r => {
				const reminderTime = new Date(r.reminder_time);
				return reminderTime <= now;
			}) || [];
			
			console.log('🔔 Reminders that should be due:', dueReminders);
			
			// Test the database function
			console.log('🗄️ Testing get_due_reminders function...');
			const { data: functionResult, error: functionError } = await supabase.rpc('get_due_reminders');
			
			if (functionError) {
				console.error('❌ Database function error:', functionError);
			} else {
				console.log('✅ Database function result:', functionResult);
			}
			
		} catch (error) {
			console.error('❌ Debug error:', error);
		}
	}

	// Method to enable sounds for testing
	enableSounds() {
		this.soundEnabled = true;
		console.log('🔊 Sounds enabled for testing');
	}

	// Method to disable sounds
	disableSounds() {
		this.soundEnabled = false;
		console.log('🔇 Sounds disabled');
	}

	// Debug function to check current state
	getDebugInfo() {
		return {
			isInitialized: this.isInitialized,
			reminderCheckActive: 'WebSocket-based (no polling)',
			reminderCheckInterval: 'Real-time via WebSocket',
			browserPermission: Notification.permission,
			audioContextActive: !!this.audioContext,
			soundEnabled: this.soundEnabled,
			lastCheckTime: 'WebSocket real-time',
			systemType: 'WebSocket + Service Worker'
		};
	}
}

export const notificationService = new NotificationService();

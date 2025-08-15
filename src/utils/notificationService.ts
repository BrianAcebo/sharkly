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
		if (!this.audioContext || !this.soundEnabled) {
			console.log('🔇 Sound disabled or audio context not ready, skipping sound');
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
			// Enable sounds for this notification
			this.soundEnabled = true;
			
			// Play notification sound
			await this.playNotificationSound();
			
			// Disable sounds after playing to prevent future unwanted sounds
			this.soundEnabled = false;

			// Show browser notification
			if ('Notification' in window && Notification.permission === 'granted') {
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

			// Determine if task is overdue
			const now = new Date();
			const dueDate = new Date(reminder.due_date);
			const isOverdue = dueDate < now;
			const dueTimeText = this.getDueTimeText(reminder.due_date);

			// Create the notification record
			const { error: notificationError } = await supabase
				.from('notifications')
				.insert({
					user_id: user.id,
					organization_id: orgData.organization_id,
					title: isOverdue ? 'Task Overdue!' : 'Task Due Soon',
					message: `"${reminder.task_title}" is ${isOverdue ? 'overdue' : `due ${dueTimeText}`}`,
					type: 'reminder', // Use 'reminder' type to match frontend
					priority: isOverdue ? 'high' : 'medium',
					metadata: {
						task_id: reminder.task_id,
						due_date: reminder.due_date,
						reminder_time: reminder.reminder_time,
						is_overdue: isOverdue
					}
				});

			if (notificationError) throw notificationError;
			
			console.log(`📝 Created ${isOverdue ? 'OVERDUE' : 'due'} notification for task: ${reminder.task_title}`);
		} catch (error) {
			console.error('Failed to create task reminder notification:', error);
			throw error;
		}
	}

	// Create immediate notification for task actions
	async createTaskNotification(
		action: 'created' | 'updated' | 'completed',
		taskTitle: string,
		taskId: string,
		dueDate?: string
	) {
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

			// Create the notification record
			const { error: notificationError } = await supabase
				.from('notifications')
				.insert({
					user_id: user.id,
					organization_id: orgData.organization_id,
					title: `Task ${action.charAt(0).toUpperCase() + action.slice(1)}`,
					message: `Task "${taskTitle}" was ${action}${dueDate ? ` and is due ${dueDate}` : ''}`,
					type: 'task_reminder',
					priority: 'medium',
					metadata: {
						task_id: taskId,
						action: action,
						due_date: dueDate
					}
				});

			if (notificationError) throw notificationError;
			
			console.log(`📝 Created task ${action} notification for: ${taskTitle}`);
		} catch (error) {
			console.error('Failed to create task notification:', error);
		}
	}

	async showTaskReminderNotification(reminder: TaskReminder) {
		const dueTimeText = this.getDueTimeText(reminder.due_date);
		const now = new Date();
		const dueDate = new Date(reminder.due_date);
		const isOverdue = dueDate < now;
		
		await this.showNotification({
			title: isOverdue ? 'Task Overdue!' : 'Task Reminder',
			message: `"${reminder.task_title}" is ${isOverdue ? 'overdue' : `due ${dueTimeText}`}`,
			type: 'reminder', // Use 'reminder' type to match frontend
			metadata: {
				task_id: reminder.task_id,
				due_date: reminder.due_date,
				reminder_time: reminder.reminder_time,
				is_overdue: isOverdue
			}
		});
	}

	private getDueTimeText(dueDate: string): string {
		const due = new Date(dueDate);
		const now = new Date();
		const diffMs = due.getTime() - now.getTime();
		const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

		if (diffMs < 0) return 'overdue';
		if (diffDays === 0) return 'today';
		if (diffDays === 1) return 'tomorrow';
		return `in ${diffDays} days`;
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

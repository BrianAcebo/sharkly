import { supabase } from './supabaseClient';
import { notificationService } from './notifications';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TaskReminder {
	id: string;
	task_id: string;
	reminder_time: string;
	status: 'pending' | 'sent' | 'cancelled';
	notification_type: 'browser' | 'email' | 'both';
	created_at: string;
	updated_at: string;
}

class ReminderService {
	private checkInterval: NodeJS.Timeout | null = null;
	private checkTimeout: NodeJS.Timeout | null = null;
	private realtimeSubscription: RealtimeChannel | null = null;
	private isRunning = false;

	start() {
		if (this.isRunning) return;
		
		this.isRunning = true;
		
		// Setup real-time notifications
		this.setupRealtime();
		
		// Setup smart polling as safety net (every 15 minutes)
		this.setupSmartPolling();
		
		// Initial check
		this.checkReminders();
		
		console.log('Reminder service started with real-time notifications');
	}

	stop() {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
		if (this.checkTimeout) {
			clearTimeout(this.checkTimeout);
			this.checkTimeout = null;
		}
		if (this.realtimeSubscription) {
			this.realtimeSubscription.unsubscribe();
			this.realtimeSubscription = null;
		}
		this.isRunning = false;
		console.log('Reminder service stopped');
	}

	private setupRealtime() {
		try {
			// Subscribe to task_reminders table changes
			this.realtimeSubscription = supabase
				.channel('task-reminders')
				.on(
					'postgres_changes',
					{
						event: 'INSERT',
						schema: 'public',
						table: 'task_reminders'
					},
					(payload) => {
						console.log('New reminder created:', payload.new);
						// Check if this reminder is due now
						this.checkReminderImmediately(payload.new as TaskReminder);
					}
				)
				.on(
					'postgres_changes',
					{
						event: 'UPDATE',
						schema: 'public',
						table: 'tasks',
						filter: 'reminder_enabled=eq.true'
					},
					(payload) => {
						console.log('Task updated:', payload.new);
						// Task updated, check if reminder needs updating
						this.handleTaskUpdate(payload.new);
					}
				)
				.subscribe((status) => {
					console.log('Realtime subscription status:', status);
				});

			console.log('Realtime notifications setup complete');
		} catch (error) {
			console.error('Error setting up realtime:', error);
			// Fallback to polling if realtime fails
			this.setupFallbackPolling();
		}
	}

	private setupSmartPolling() {
		// Smart polling - only check for overdue reminders as safety net
		this.checkInterval = setInterval(() => {
			this.checkOverdueReminders();
		}, 15 * 60 * 1000); // Every 15 minutes instead of 5
	}

	private setupFallbackPolling() {
		// Fallback to traditional polling if realtime fails
		this.checkInterval = setInterval(() => {
			this.checkReminders();
		}, 5 * 60 * 1000);
		console.log('Using fallback polling mode');
	}

	private async checkReminderImmediately(reminder: TaskReminder) {
		try {
			const now = new Date();
			const reminderTime = new Date(reminder.reminder_time);
			
			if (reminderTime <= now) {
				console.log('Reminder due immediately:', reminder);
				await this.sendReminderNotification(reminder);
				
				// Mark reminder as sent
				await supabase
					.from('task_reminders')
					.update({ status: 'sent' })
					.eq('id', reminder.id);
			}
		} catch (error) {
			console.error('Error checking immediate reminder:', error);
		}
	}

	private async handleTaskUpdate() {
		try {
			// If task reminder settings changed, we might need to update reminders
			// The database trigger will handle this automatically
			console.log('Task updated, database trigger will handle reminder updates');
		} catch (error) {
			console.error('Error handling task update:', error);
		}
	}

	private async checkOverdueReminders() {
		try {
			const now = new Date();

			// Find overdue reminders that haven't been sent
			const { data: reminders, error } = await supabase
				.from('task_reminders')
				.select(`
					*,
					tasks!inner(
						id,
						title,
						due_date
					)
				`)
				.eq('status', 'pending')
				.lt('reminder_time', now.toISOString());

			if (error) {
				console.error('Error fetching overdue reminders:', error);
				return;
			}

			// Send notifications for overdue reminders
			for (const reminder of reminders || []) {
				await this.sendReminderNotification(reminder);
				
				// Mark reminder as sent
				await supabase
					.from('task_reminders')
					.update({ status: 'sent' })
					.eq('id', reminder.id);
			}

			if (reminders && reminders.length > 0) {
				console.log(`Sent ${reminders.length} overdue reminder notifications`);
			}
		} catch (error) {
			console.error('Error checking overdue reminders:', error);
		}
	}

	private async checkReminders() {
		try {
			const now = new Date();

			// Find pending reminders that are due
			const { data: reminders, error } = await supabase
				.from('task_reminders')
				.select(`
					*,
					tasks!inner(
						id,
						title,
						due_date
					)
				`)
				.eq('status', 'pending')
				.lte('reminder_time', now.toISOString());

			if (error) {
				console.error('Error fetching reminders:', error);
				return;
			}

			// Send notifications for due reminders
			for (const reminder of reminders || []) {
				await this.sendReminderNotification(reminder);
				
				// Mark reminder as sent
				await supabase
					.from('task_reminders')
					.update({ status: 'sent' })
					.eq('id', reminder.id);
			}
		} catch (error) {
			console.error('Error checking reminders:', error);
		}
	}

	private async sendReminderNotification(reminder: TaskReminder & { tasks: { title: string; due_date: string } }) {
		try {
			// Calculate time until due for clearer messaging
			const now = new Date();
			const dueDate = new Date(reminder.tasks.due_date);
			const isOverdue = dueDate < now;
			
			let title: string;
			let body: string;
			
			if (isOverdue) {
				title = 'Task Overdue!';
				body = `"${reminder.tasks.title}" is overdue`;
			} else {
				// Calculate time until due
				const diffMs = dueDate.getTime() - now.getTime();
				const diffMinutes = Math.round(diffMs / (1000 * 60));
				
				if (diffMinutes < 60) {
					body = `"${reminder.tasks.title}" due in ${diffMinutes} minutes`;
				} else if (diffMinutes < 1440) {
					const hours = Math.floor(diffMinutes / 60);
					body = `"${reminder.tasks.title}" due in ${hours} hour${hours > 1 ? 's' : ''}`;
				} else {
					const days = Math.floor(diffMinutes / 1440);
					body = `"${reminder.tasks.title}" due in ${days} day${days > 1 ? 's' : ''}`;
				}
				title = 'Reminder';
			}

			// Send browser notification
			await notificationService.sendNotification({
				title: title,
				body: body,
				icon: '/images/logos/logo.svg',
				tag: `task-${reminder.task_id}`,
				data: {
					url: `/tasks`,
					type: 'task_reminder',
					taskId: reminder.task_id
				}
			});

			// Also add to in-app notifications
			// This would typically be done through a context or state management
			console.log(`Reminder sent for task: ${reminder.tasks.title}`);
		} catch (error) {
			console.error('Error sending reminder notification:', error);
		}
	}

	// Manual reminder check (useful for testing)
	async checkRemindersNow() {
		await this.checkReminders();
	}

	// Create a new reminder
	async createReminder(reminderData: Omit<TaskReminder, 'id' | 'status' | 'created_at'>) {
		try {
			const { data, error } = await supabase
				.from('task_reminders')
				.insert({
					...reminderData,
					status: 'pending'
				})
				.select()
				.single();

			if (error) throw error;
			return data;
		} catch (error) {
			console.error('Error creating reminder:', error);
			throw error;
		}
	}

	// Update reminder status
	async updateReminderStatus(reminderId: string, status: 'pending' | 'sent' | 'cancelled') {
		try {
			const { error } = await supabase
				.from('task_reminders')
				.update({ status })
				.eq('id', reminderId);

			if (error) throw error;
		} catch (error) {
			console.error('Error updating reminder status:', error);
		}
	}

	// Get user's reminders
	async getUserReminders(userId: string, organizationId: string) {
		try {
			const { data, error } = await supabase
				.from('task_reminders')
				.select(`
					*,
					tasks!inner(
						id,
						title,
						due_date,
						owner_id,
						organization_id
					)
				`)
				.eq('tasks.owner_id', userId)
				.eq('tasks.organization_id', organizationId)
				.order('reminder_time', { ascending: true });

			if (error) throw error;
			return data || [];
		} catch (error) {
			console.error('Error fetching user reminders:', error);
		}
	}
}

// Export singleton instance
export const reminderService = new ReminderService();

// Auto-start the service when imported
if (typeof window !== 'undefined') {
	// Only start in browser environment
	reminderService.start();
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Task, TaskFormData, TaskStats } from '../types/tasks';
import { toast } from 'sonner';

export const useTasks = () => {
	const { user } = useAuth();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState<TaskStats>({
		total: 0,
		pending: 0,
		in_progress: 0,
		completed: 0,
		overdue: 0,
		dueToday: 0,
		dueThisWeek: 0
	});

	// Calculate task statistics
	const calculateStats = useCallback((taskList: Task[]) => {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

		const stats: TaskStats = {
			total: taskList.length,
			pending: taskList.filter(task => task.status === 'pending').length,
			in_progress: taskList.filter(task => task.status === 'in_progress').length,
			completed: taskList.filter(task => task.status === 'completed').length,
			overdue: taskList.filter(task => 
				task.status !== 'completed' && 
				new Date(task.due_date) < today
			).length,
			dueToday: taskList.filter(task => 
				task.status !== 'completed' && 
				new Date(task.due_date).toDateString() === today.toDateString()
			).length,
			dueThisWeek: taskList.filter(task => 
				task.status !== 'completed' && 
				new Date(task.due_date) <= weekFromNow && 
				new Date(task.due_date) >= today
			).length
		};

		setStats(stats);
	}, [setStats]); // Include setStats dependency

	// Fetch tasks
	const fetchTasks = useCallback(async () => {
		if (!user?.organization_id) return;

		setLoading(true);
		try {
			const { data, error } = await supabase
				.from('tasks')
				.select('*')
				.eq('organization_id', user.organization_id)
				.eq('owner_id', user.id)
				.order('due_date', { ascending: true });

			if (error) throw error;

			// Use the lead_name that's already stored in the tasks table
			const tasksWithLeadNames = data || [];

			setTasks(tasksWithLeadNames);
			calculateStats(tasksWithLeadNames);
		} catch (error) {
			console.error('Error fetching tasks:', error);
			toast.error('Failed to fetch tasks');
		} finally {
			setLoading(false);
		}
	}, [user?.organization_id, user?.id, calculateStats]);

	// Create new task
	const createTask = useCallback(async (taskData: TaskFormData): Promise<boolean> => {
		if (!user?.organization_id) return false;

		try {
			// If lead_id is provided, fetch the lead name
			let leadName = '';
			if (taskData.lead_id) {
				try {
					const { data: leadData, error: leadError } = await supabase
						.from('leads')
						.select('name, company')
						.eq('id', taskData.lead_id)
						.single();
					
					if (!leadError && leadData) {
						leadName = `${leadData.name} - ${leadData.company || 'No Company'}`;
					}
				} catch (leadError) {
					console.warn('Could not fetch lead name:', leadError);
				}
			}

			const { error } = await supabase
				.from('tasks')
				.insert({
					...taskData,
					lead_name: leadName, // Set the lead name
					organization_id: user.organization_id,
					owner_id: user.id,
					status: 'pending'
				});

			if (error) throw error;

			// Reminder creation is now handled in the parent component
			// to ensure proper timing and error handling

			toast.success('Task created successfully');
			await fetchTasks();
			return true;
		} catch (error) {
			console.error('Error creating task:', error);
			toast.error('Failed to create task');
			return false;
		}
	}, [user?.organization_id, user?.id, fetchTasks]);

	// Update task
	const updateTask = useCallback(async (taskId: string, updates: Partial<Task>): Promise<boolean> => {
		try {
			// If lead_id is being updated, fetch the new lead name
			if (updates.lead_id !== undefined) {
				let leadName = '';
				if (updates.lead_id) {
					try {
						const { data: leadData, error: leadError } = await supabase
							.from('leads')
							.select('name, company')
							.eq('id', updates.lead_id)
							.single();
						
						if (!leadError && leadData) {
							leadName = `${leadData.name} - ${leadData.company || 'No Company'}`;
						}
					} catch (leadError) {
						console.warn('Could not fetch lead name:', leadError);
					}
				}
				
				// Update the lead_name along with other updates
				updates.lead_name = leadName;
			}

			const { error } = await supabase
				.from('tasks')
				.update(updates)
				.eq('id', taskId);

			if (error) throw error;

			toast.success('Task updated successfully');
			await fetchTasks();
			return true;
		} catch (error) {
			console.error('Error updating task:', error);
			toast.error('Failed to update task');
			return false;
		}
	}, [fetchTasks]);

	// Delete task
	const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
		try {
			const { error } = await supabase
				.from('tasks')
				.delete()
				.eq('id', taskId);

			if (error) throw error;

			toast.success('Task deleted successfully');
			await fetchTasks();
			return true;
		} catch (error) {
			console.error('Error deleting task:', error);
			toast.error('Failed to delete task');
			return false;
		}
	}, [fetchTasks]);

	// Create reminder with 12-hour time format
	const createReminder = useCallback(async (
		taskId: string, 
		taskTitle: string, 
		dueDate: string, 
		reminderTime: string
	) => {
		try {
			// Parse 12-hour format time (e.g., "2:01 PM")
			const timeMatch = reminderTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
			if (!timeMatch) {
				throw new Error(`Invalid time format: ${reminderTime}. Expected format: "2:30 PM"`);
			}
			
			const [, hours, minutes, ampm] = timeMatch;
			let hour24 = parseInt(hours);
			const minuteValue = parseInt(minutes);
			
			// Validate hours and minutes
			if (isNaN(hour24) || hour24 < 1 || hour24 > 12) {
				throw new Error(`Invalid hour value: ${hours}. Hours must be 1-12`);
			}
			if (isNaN(minuteValue) || minuteValue < 0 || minuteValue > 59) {
				throw new Error(`Invalid minute value: ${minutes}. Minutes must be 0-59`);
			}
			
			// Convert to 24-hour format
			if (ampm.toUpperCase() === 'PM' && hour24 < 12) {
				hour24 += 12; // Convert PM to 24-hour (e.g., 2:30 PM -> 14:30)
			} else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
				hour24 = 0; // Convert 12 AM to 00:00
			}
			
			// Calculate the actual reminder time by combining due date and reminder time
			const [year, month, day] = dueDate.split('-').map(Number);
			
			// Create reminder time at the exact time the user specified
			const reminderDateTime = new Date(year, month - 1, day, hour24, minuteValue);
			
			console.log('🔍 createReminder Debug:', {
				input: { taskId, taskTitle, dueDate, reminderTime },
				parsed: { year, month: month - 1, day, hour24, minuteValue },
				createdDate: reminderDateTime,
				isValid: !isNaN(reminderDateTime.getTime())
			});
			
			// Validate the created date
			if (isNaN(reminderDateTime.getTime())) {
				throw new Error(`Invalid date created: ${reminderDateTime}. Input: ${dueDate} ${reminderTime}`);
			}
			
			// Only create reminder if the reminder time is in the future
			const now = new Date();
			if (reminderDateTime <= now) {
				console.log('⚠️ Reminder time is in the past, skipping reminder creation for task:', taskId);
				console.log('📅 Reminder time:', reminderDateTime.toISOString(), 'Current time:', now.toISOString());
				return;
			}
			
			// Create the reminder record
			const { error: reminderError } = await supabase
				.from('task_reminders')
				.insert({
					task_id: taskId,
					reminder_time: reminderDateTime.toISOString(),
					status: 'pending'
				});

			if (reminderError) throw reminderError;
			
			console.log('✅ Reminder created for task:', taskId, 'at:', reminderDateTime.toISOString());
			console.log('📅 Task due date:', dueDate, 'Reminder time:', reminderTime);
			console.log('⏰ Reminder will trigger at:', reminderDateTime.toLocaleString());
		} catch (error) {
			console.error('Error creating reminder and notification:', error);
		}
	}, []);

	// Create reminder directly with Date object (for preset reminders)
	const createReminderDirect = useCallback(async (
		taskId: string,
		_dueDate: string,
		reminderDateTime: Date
	) => {
		try {
			// Validate the reminder datetime
			if (isNaN(reminderDateTime.getTime())) {
				throw new Error(`Invalid reminder datetime: ${reminderDateTime}`);
			}

			// Only create reminder if the reminder time is in the future
			const now = new Date();
			if (reminderDateTime <= now) {
				console.log('⚠️ Reminder time is in the past, skipping reminder creation for task:', taskId);
				console.log('📅 Reminder time:', reminderDateTime.toISOString(), 'Current time:', now.toISOString());
				return;
			}

			// Create the reminder record directly
			const { error: reminderError } = await supabase
				.from('task_reminders')
				.insert({
					task_id: taskId,
					reminder_time: reminderDateTime.toISOString(),
					status: 'pending'
				});

			if (reminderError) throw reminderError;
			
			console.log('✅ Direct reminder created for task:', taskId, 'at:', reminderDateTime.toISOString());
			console.log('📅 Reminder will trigger at:', reminderDateTime.toLocaleString());
		} catch (error) {
			console.error('Error creating direct reminder:', error);
		}
	}, []);

	// Update reminder when task is updated
	const updateReminder = useCallback(async (
		taskId: string,
		dueDate: string,
		reminderTime: string
	) => {
		try {
			console.log('🔄 updateReminder called with:', { taskId, dueDate, reminderTime });
			
			// Delete existing reminders for this task
			const { error: deleteError } = await supabase
				.from('task_reminders')
				.delete()
				.eq('task_id', taskId);
				
			if (deleteError) {
				console.error('❌ Error deleting existing reminders:', deleteError);
			} else {
				console.log('✅ Existing reminders deleted for task:', taskId);
			}

			// Create new reminder if reminder time is provided
			if (reminderTime) {
				console.log('📝 Creating new reminder for task:', taskId);
				
				// Get the task title for the notification
				const { data: taskData, error: taskError } = await supabase
					.from('tasks')
					.select('title')
					.eq('id', taskId)
					.single();
				
				if (taskError) {
					console.error('❌ Error fetching task title:', taskError);
					return;
				}
				
				const taskTitle = taskData?.title || 'Untitled Task';
				console.log('📋 Task title for reminder:', taskTitle);
				
				await createReminder(taskId, taskTitle, dueDate, reminderTime);
				console.log('✅ Reminder creation completed for task:', taskId);
			} else {
				console.log('ℹ️ No reminder time provided, skipping reminder creation');
			}
		} catch (error) {
			console.error('❌ Error updating reminder:', error);
		}
	}, [createReminder]);

	// Mark task as complete
	const completeTask = useCallback(async (taskId: string) => {
		return await updateTask(taskId, { status: 'completed' });
	}, [updateTask]);

	// Get tasks by status
	const getTasksByStatus = useCallback((status: Task['status']) => {
		return tasks.filter(task => task.status === status);
	}, [tasks]);

	// Get overdue tasks
	const getOverdueTasks = useCallback(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return tasks.filter(task => 
			task.status !== 'completed' && 
			new Date(task.due_date) < today
		);
	}, [tasks]);



	// Get tasks due today
	const getTasksDueToday = useCallback(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return tasks.filter(task => 
			task.status !== 'completed' && 
			new Date(task.due_date).toDateString() === today.toDateString()
		);
	}, [tasks]);

	useEffect(() => {
		fetchTasks();
	}, [fetchTasks]);

	// Recalculate stats whenever tasks change
	useEffect(() => {
		if (tasks.length > 0) {
			calculateStats(tasks);
		}
	}, [tasks, calculateStats]);

	return {
		tasks,
		loading,
		stats,
		createTask,
		updateTask,
		deleteTask,
		completeTask,
		getTasksByStatus,
		getOverdueTasks,
		getTasksDueToday,
		refreshTasks: fetchTasks,
		createReminder,
		createReminderDirect,
		updateReminder
	};
};

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
	}, [user?.organization_id, user?.id]);

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
	}, []); // No dependencies needed since it's called with explicit parameter

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

			const { data, error } = await supabase
				.from('tasks')
				.insert({
					...taskData,
					lead_name: leadName, // Set the lead name
					organization_id: user.organization_id,
					owner_id: user.id,
					status: 'pending'
				})
				.select()
				.single();

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

	// Create reminder
	const createReminder = useCallback(async (
		taskId: string, 
		taskTitle: string, 
		dueDate: string, 
		reminderTime: string
	) => {
		try {
			// Calculate the actual reminder time by combining due date and reminder time
			const [year, month, day] = dueDate.split('-').map(Number);
			const [hours, minutes] = reminderTime.split(':').map(Number);
			
			// Create reminder time (15 minutes before the actual due time)
			const reminderDateTime = new Date(year, month - 1, day, hours, minutes);
			reminderDateTime.setMinutes(reminderDateTime.getMinutes() - 15);
			
			// Only create reminder if the reminder time is in the future
			const now = new Date();
			if (reminderDateTime <= now) {
				console.log('⚠️ Reminder time is in the past, skipping reminder creation for task:', taskId);
				console.log('📅 Reminder time:', reminderDateTime.toISOString(), 'Current time:', now.toISOString());
				return;
			}
			
			// Create the reminder record
			const { data: reminderData, error: reminderError } = await supabase
				.from('task_reminders')
				.insert({
					task_id: taskId,
					reminder_time: reminderDateTime.toISOString(),
					status: 'pending'
				})
				.select()
				.single();

			if (reminderError) throw reminderError;
			
			console.log('✅ Reminder created for task:', taskId, 'at:', reminderDateTime.toISOString());
			console.log('📅 Task due date:', dueDate, 'Reminder time:', reminderTime);
			console.log('⏰ Reminder will trigger at:', reminderDateTime.toLocaleString());
		} catch (error) {
			console.error('Error creating reminder and notification:', error);
		}
	}, []);

	// Update reminder when task is updated
	const updateReminder = useCallback(async (
		taskId: string,
		dueDate: string,
		reminderTime: string
	) => {
		try {
			// Delete existing reminders for this task
			await supabase
				.from('task_reminders')
				.delete()
				.eq('task_id', taskId);

			// Create new reminder if reminder time is provided
			if (reminderTime) {
				// Get the task title for the notification
				const { data: taskData } = await supabase
					.from('tasks')
					.select('title')
					.eq('id', taskId)
					.single();
				
				const taskTitle = taskData?.title || 'Untitled Task';
				await createReminder(taskId, taskTitle, dueDate, reminderTime);
			}
		} catch (error) {
			console.error('Error updating reminder:', error);
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
		updateReminder
	};
};

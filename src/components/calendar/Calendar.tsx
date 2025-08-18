import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Settings, RefreshCw, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';
import { Task } from '../../types/tasks';
import { TaskDetail } from '../tasks/TaskDetail';
import { TaskForm } from '../tasks/TaskForm';

interface CalendarEvent {
	id: string;
	title: string;
	start: Date;
	end: Date;
	type: 'task' | 'google' | 'reminder';
	priority?: string;
	status?: string;
	metadata?: Task | Record<string, unknown>;
}

interface CalendarView {
	type: 'month' | 'week' | 'day';
	label: string;
}

export const Calendar: React.FC = () => {
	const { user } = useAuth();
	const [currentDate, setCurrentDate] = useState(new Date());
	const [view, setView] = useState<CalendarView>({ type: 'month', label: 'Month' });
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
	const [showTaskModal, setShowTaskModal] = useState(false);
	const [selectedTask, setSelectedTask] = useState<Task | null>(null);
	const [showTaskDetail, setShowTaskDetail] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
	const [showSettings, setShowSettings] = useState(false);
	
	// Calendar display settings
	const [showCompletedTasks, setShowCompletedTasks] = useState(false);
	const [showColorCoding, setShowColorCoding] = useState(true);
	const [eventDensity, setEventDensity] = useState<'compact' | 'normal' | 'spacious'>('normal');
	const [showGridLines, setShowGridLines] = useState(true);

	// Calendar navigation
	const goToPrevious = () => {
		const newDate = new Date(currentDate);
		if (view.type === 'month') {
			newDate.setMonth(newDate.getMonth() - 1);
		} else if (view.type === 'week') {
			newDate.setDate(newDate.getDate() - 7);
		} else {
			newDate.setDate(newDate.getDate() - 1);
		}
		setCurrentDate(newDate);
	};

	const goToNext = () => {
		const newDate = new Date(currentDate);
		if (view.type === 'month') {
			newDate.setMonth(newDate.getMonth() + 1);
		} else if (view.type === 'week') {
			newDate.setDate(newDate.getDate() + 7);
		} else {
			newDate.setDate(newDate.getDate() + 1);
		}
		setCurrentDate(newDate);
	};

	const goToToday = () => {
		setCurrentDate(new Date());
	};

	// Fetch tasks and convert to calendar events
	const fetchTasks = useCallback(async () => {
		try {
			let query = supabase
				.from('tasks')
				.select('*')
				.eq('owner_id', user?.id)
				.order('due_date', { ascending: true });

			// Apply completed tasks filter
			if (!showCompletedTasks) {
				query = query.neq('status', 'completed');
			}

			const { data: tasks, error } = await query;

			if (error) throw error;

			const taskEvents: CalendarEvent[] = (tasks || []).map(task => ({
				id: task.id,
				title: task.title,
				start: new Date(task.due_date),
				end: new Date(task.due_date),
				type: 'task',
				priority: task.priority,
				status: task.status,
				metadata: task
			}));

			setEvents(taskEvents);
		} catch (error) {
			console.error('Error fetching tasks:', error);
		}
	}, [user?.id, showCompletedTasks]);

	// Fetch Google Calendar events
	const fetchGoogleCalendarEvents = useCallback(async () => {
		if (!googleCalendarConnected) return;

		try {
			// This would integrate with Google Calendar API
			// For now, we'll show a placeholder
			console.log('Fetching Google Calendar events...');
		} catch (error) {
			console.error('Error fetching Google Calendar events:', error);
		}
	}, [googleCalendarConnected]);

	// Connect to Google Calendar
	const connectGoogleCalendar = async () => {
		try {
			// This would use your existing Google OAuth
			// For now, we'll show a placeholder
			setGoogleCalendarConnected(true);
			console.log('Connecting to Google Calendar...');
		} catch (error) {
			console.error('Error connecting to Google Calendar:', error);
		}
	};

	// Generate calendar grid for month view
	const generateMonthGrid = () => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const firstDay = new Date(year, month, 1);
		const startDate = new Date(firstDay);
		startDate.setDate(startDate.getDate() - firstDay.getDay());

		const days = [];
		const totalDays = 42; // 6 weeks * 7 days

		for (let i = 0; i < totalDays; i++) {
			const date = new Date(startDate);
			date.setDate(startDate.getDate() + i);
			
			const dayEvents = events.filter(event => {
				const eventDate = new Date(event.start);
				return eventDate.toDateString() === date.toDateString();
			});

			days.push({
				date,
				events: dayEvents,
				isCurrentMonth: date.getMonth() === month,
				isToday: date.toDateString() === new Date().toDateString()
			});
		}

		return days;
	};

	// Generate week view data
	const generateWeekView = () => {
		// Find the start of the week (Sunday)
		const startOfWeek = new Date(currentDate);
		const dayOfWeek = startOfWeek.getDay();
		startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
		
		const weekDays = [];
		
		for (let i = 0; i < 7; i++) {
			const date = new Date(startOfWeek);
			date.setDate(startOfWeek.getDate() + i);
			
			const dayEvents = events.filter(event => {
				const eventDate = new Date(event.start);
				return eventDate.toDateString() === date.toDateString();
			});

			weekDays.push({
				date,
				events: dayEvents,
				isToday: date.toDateString() === new Date().toDateString()
			});
		}
		
		return weekDays;
	};

	// Generate day view data
	const generateDayView = () => {
		const selectedDate = new Date(currentDate);
		
		// Get events for the selected day
		const dayEvents = events.filter(event => {
			const eventDate = new Date(event.start);
			return eventDate.toDateString() === selectedDate.toDateString();
		});
		
		// Generate time slots for the full day (12 AM to 11 PM)
		const timeSlots = [];
		for (let hour = 0; hour <= 23; hour++) {
			const time = new Date(selectedDate);
			time.setHours(hour, 0, 0, 0);
			
			const eventsAtTime = dayEvents.filter(event => {
				const eventHour = new Date(event.start).getHours();
				return eventHour === hour;
			});
			
			timeSlots.push({
				time,
				hour,
				events: eventsAtTime
			});
		}
		
		return {
			date: selectedDate,
			events: dayEvents,
			timeSlots,
			isToday: selectedDate.toDateString() === new Date().toDateString()
		};
	};

	// Handle date click
	const handleDateClick = (date: Date) => {
		setCurrentDate(date);
		setView({ type: 'day', label: 'Day' });
	};

	// Handle task edit
	const handleTaskEdit = (task: Task) => {
		setEditingTask(task);
		setShowTaskDetail(false);
		setShowTaskModal(true);
	};

	// Handle task form cancel
	const handleTaskFormCancel = () => {
		setShowTaskModal(false);
		setEditingTask(null);
	};

	// Handle task form success (create or update)
	const handleTaskFormSuccess = () => {
		setShowTaskModal(false);
		setEditingTask(null);
		// Refresh the calendar data to show updated tasks
		fetchTasks();
	};

	// Handle task deletion
	const handleDeleteTask = (task: Task) => {
		setTaskToDelete(task);
		setShowDeleteConfirm(true);
		setShowTaskDetail(false);
	};

	const confirmDeleteTask = async () => {
		if (!taskToDelete) return;
		
		try {
			// First delete associated reminders
			const { error: remindersError } = await supabase
				.from('task_reminders')
				.delete()
				.eq('task_id', taskToDelete.id);
			
			if (remindersError) {
				console.warn('Warning: Could not delete task reminders:', remindersError);
			}

			// Then delete the task
			const { error: taskError } = await supabase
				.from('tasks')
				.delete()
				.eq('id', taskToDelete.id);
			
			if (taskError) {
				console.error('Error deleting task:', taskError);
			} else {
				console.log('Task and reminders deleted successfully');
				// Refresh the calendar data
				fetchTasks();
			}
		} catch (error) {
			console.error('Error deleting task:', error);
		} finally {
			// Close the confirmation dialog
			setShowDeleteConfirm(false);
			setTaskToDelete(null);
		}
	};

	const cancelDeleteTask = () => {
		setShowDeleteConfirm(false);
		setTaskToDelete(null);
	};

	// Handle event click
	const handleEventClick = (event: CalendarEvent) => {
		if (event.type === 'task') {
			// Show task detail view
			setSelectedTask(event.metadata as Task);
			setShowTaskDetail(true);
		} else if (event.type === 'google') {
			// Handle Google Calendar events
			console.log('Google Calendar event:', event.id);
		} else {
			// Handle other event types
			console.log('Other event:', event.id);
		}
	};

	useEffect(() => {
		fetchTasks();
		fetchGoogleCalendarEvents();
	}, [fetchTasks, fetchGoogleCalendarEvents]);

	const monthGrid = generateMonthGrid();
	const weekGrid = generateWeekView();
	const dayGrid = generateDayView();

	return (
		<div className="h-full space-y-6">
			{/* Calendar Header */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<CalendarIcon className="h-6 w-6 text-red-600" />
							<div>
								<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
									{currentDate.toLocaleDateString('en-US', { 
										month: 'long', 
										year: 'numeric' 
									})}
								</h1>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									{view.label} View
								</p>
							</div>
						</div>

						<div className="flex items-center space-x-2">
							{/* View Toggle */}
							<div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
								{[
									{ type: 'month' as const, label: 'Month' },
									{ type: 'week' as const, label: 'Week' },
									{ type: 'day' as const, label: 'Day' }
								].map((viewOption) => (
									<button
										key={viewOption.type}
										onClick={() => setView(viewOption)}
										className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
											view.type === viewOption.type
												? 'bg-red-600 text-white'
												: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
										}`}
									>
										{viewOption.label}
									</button>
								))}
							</div>

							{/* Navigation */}
							<div className="flex items-center space-x-1">
								<Button
									variant="outline"
									size="sm"
									onClick={goToPrevious}
									className="h-8 w-8 p-0"
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={goToToday}
									className="h-8 px-3"
								>
									Today
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={goToNext}
									className="h-8 w-8 p-0"
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>

							{/* Actions */}
							<div className="flex items-center space-x-2">
								{/* <Button
									variant="outline"
									size="sm"
									onClick={connectGoogleCalendar}
									className="h-8 px-3"
								>
									<RefreshCw className="h-4 w-4 mr-2" />
									{googleCalendarConnected ? 'Connected' : 'Connect Google'}
								</Button> */}
								<Button
									onClick={() => setShowTaskModal(true)}
									size="sm"
									className="h-8 px-3"
								>
									<Plus className="h-4 w-4 mr-2" />
									Add Task
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowSettings(true)}
									className="h-8 w-8 p-0"
								>
									<Settings className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>
				</CardHeader>
			</Card>

			{/* Calendar Grid */}
			<Card>
				<CardContent className="p-0">
					{view.type === 'month' && (
						<div className="min-h-[600px]">
							{/* Day Headers */}
							<div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
								{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
									<div
										key={day}
										className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
									>
										{day}
									</div>
								))}
							</div>

							{/* Calendar Grid */}
							<div className={`grid grid-cols-7 ${
								showGridLines ? 'border-l border-t border-gray-200 dark:border-gray-700' : ''
							}`}>
								{monthGrid.map((day, index) => (
									<div
										key={index}
										className={`min-h-[120px] ${
											showGridLines ? 'border-r border-b border-gray-200 dark:border-gray-700' : ''
										} p-2 cursor-pointer transition-colors ${
											!day.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800' : ''
										} ${day.isToday ? 'bg-red-50 dark:bg-red-900/20' : ''} hover:bg-gray-50 dark:hover:bg-gray-800`}
										onClick={() => handleDateClick(day.date)}
									>
										{/* Date Number */}
										<div className="text-right mb-2">
											<span
												className={`text-sm ${
													day.isToday
														? 'bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center'
														: day.isCurrentMonth
														? 'text-gray-900 dark:text-white'
														: 'text-gray-400 dark:text-gray-600'
												}`}
											>
												{day.date.getDate()}
											</span>
										</div>

										{/* Events */}
										<div className={`space-y-1 ${
											eventDensity === 'compact' ? 'space-y-0.5' : 
											eventDensity === 'spacious' ? 'space-y-2' : 'space-y-1'
										}`}>
											{day.events.slice(0, 3).map((event) => (
												<div
													key={event.id}
													onClick={(e) => {
														e.stopPropagation();
														handleEventClick(event);
													}}
													title={event.type === 'task' ? `Click to view task: ${event.title}` : `Click to view ${event.type} event`}
													className={`text-xs p-1 rounded cursor-pointer truncate transition-all duration-200 ${
														event.type === 'task'
															? showColorCoding 
																? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border border-red-200 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-800 hover:scale-105 hover:shadow-sm'
																: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-105 hover:shadow-sm'
															: event.type === 'google'
															? showColorCoding
																? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
																: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
															: showColorCoding
																? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800'
																: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
													}`}
												>
													{event.title}
												</div>
											))}
											{day.events.length > 3 && (
												<div className="text-xs text-gray-500 dark:text-gray-400 text-center">
													+{day.events.length - 3} more
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{view.type === 'week' && (
						<div className="min-h-[600px]">
							{/* Day Headers */}
							<div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
								{weekGrid.map((day) => (
									<div
										key={day.date.toISOString()}
										className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
									>
										<div className="font-semibold">
											{day.date.toLocaleDateString('en-US', { weekday: 'short' })}
										</div>
										<div className={`text-lg ${
											day.isToday ? 'text-red-600 font-bold' : 'text-gray-900 dark:text-white'
										}`}>
											{day.date.getDate()}
										</div>
									</div>
								))}
							</div>

							{/* Week Grid */}
							<div className={`grid grid-cols-7 ${
								showGridLines ? 'border-l border-t border-gray-200 dark:border-gray-700' : ''
							}`}>
								{weekGrid.map((day, index) => (
									<div
										key={index}
										className={`min-h-[500px] ${
											showGridLines ? 'border-r border-b border-gray-200 dark:border-gray-700' : ''
										} p-2 cursor-pointer transition-colors ${
											day.isToday ? 'bg-red-50 dark:bg-red-900/20' : ''
										} hover:bg-gray-50 dark:hover:bg-gray-800`}
										onClick={() => handleDateClick(day.date)}
									>
										{/* Events */}
										<div className={`space-y-1 ${
											eventDensity === 'compact' ? 'space-y-0.5' : 
											eventDensity === 'spacious' ? 'space-y-2' : 'space-y-1'
										}`}>
											{day.events.slice(0, 8).map((event) => (
												<div
													key={event.id}
													onClick={(e) => {
														e.stopPropagation();
														handleEventClick(event);
													}}
													title={event.type === 'task' ? `Click to view task: ${event.title}` : `Click to view ${event.type} event`}
													className={`text-xs p-1 rounded cursor-pointer truncate transition-all duration-200 ${
														event.type === 'task'
															? showColorCoding 
																? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border border-red-200 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-800 hover:scale-105 hover:shadow-sm'
																: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-105 hover:shadow-sm'
															: event.type === 'google'
															? showColorCoding
																? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
																: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
															: showColorCoding
																? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 hover:bg-orange-800'
																: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
													}`}
												>
													{event.title}
												</div>
											))}
											{day.events.length > 8 && (
												<div className="text-xs text-gray-500 dark:text-gray-400 text-center">
													+{day.events.length - 8} more
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{view.type === 'day' && (
						<div className="min-h-[600px]">
							{/* Day Header */}
							<div className="border-b border-gray-200 dark:border-gray-700 p-4">
								<div className="text-center">
									<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
										{dayGrid.date.toLocaleDateString('en-US', { 
											weekday: 'long',
											year: 'numeric',
											month: 'long',
											day: 'numeric'
										})}
									</h2>
									{dayGrid.isToday && (
										<span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 rounded-full text-sm font-medium">
											Today
										</span>
									)}
								</div>
							</div>

							{/* Time Slots */}
							<div className="space-y-1">
								{dayGrid.timeSlots.map((slot) => (
									<div
										key={slot.hour}
										className="flex border-b border-gray-100 dark:border-gray-800 min-h-[60px]"
									>
										{/* Time Label */}
										<div className="w-20 p-2 text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
											{slot.time.toLocaleTimeString('en-US', { 
												hour: 'numeric',
												minute: '2-digit',
												hour12: true
											})}
										</div>
										
										{/* Events */}
										<div className="flex-1 p-2 relative">
											{slot.events.map((event) => (
												<div
													key={event.id}
													onClick={(e) => {
														e.stopPropagation();
														handleEventClick(event);
													}}
													title={event.type === 'task' ? `Click to view task: ${event.title}` : `Click to view ${event.type} event`}
													className={`text-xs p-2 rounded cursor-pointer transition-all duration-200 mb-1 ${
														event.type === 'task'
															? showColorCoding 
																? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border border-red-200 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-800 hover:scale-105 hover:shadow-sm'
																: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-105 hover:shadow-sm'
															: event.type === 'google'
															? showColorCoding
																? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
																: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
															: showColorCoding
																? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 hover:bg-orange-800'
																: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
													}`}
												>
													{event.title}
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Task Detail Modal */}
			{showTaskDetail && selectedTask && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-branded rounded-lg">
						<TaskDetail
							task={selectedTask}
							onEdit={() => handleTaskEdit(selectedTask)}
							onDelete={() => handleDeleteTask(selectedTask)}
							onClose={() => {
								setShowTaskDetail(false);
								setSelectedTask(null);
							}}
							onBack={() => {
								setShowTaskDetail(false);
								setSelectedTask(null);
							}}
						/>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{showDeleteConfirm && taskToDelete && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
						<div className="text-center">
							<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
								Delete Task
							</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
								Are you sure you want to delete "{taskToDelete.title}"? This action cannot be undone.
							</p>
							<div className="flex space-x-3 justify-center">
								<Button
									variant="outline"
									onClick={cancelDeleteTask}
									className="px-4 py-2"
								>
									Cancel
								</Button>
								<Button
									variant="destructive"
									onClick={confirmDeleteTask}
									className="px-4 py-2"
								>
									Delete
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Task Form Modal */}
			{showTaskModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-branded rounded-lg">
						<TaskForm
							mode={editingTask ? 'edit' : 'create'}
							initialData={editingTask || undefined}
							onCancel={handleTaskFormCancel}
							onSuccess={handleTaskFormSuccess}
						/>
					</div>
				</div>
			)}

			{/* Settings Modal */}
			{showSettings && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
								Calendar Settings
							</h3>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowSettings(false)}
								className="h-8 w-8 p-0"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>

						<div className="space-y-6">
							{/* Display Options */}
							<div>
								<h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
									Display Options
								</h4>
								
								<div className="space-y-4">
									{/* Show Completed Tasks */}
									<div className="flex items-center justify-between">
										<div>
											<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
												Show Completed Tasks
											</label>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												Display completed tasks in calendar views
											</p>
										</div>
										<Button
											variant={showCompletedTasks ? 'default' : 'outline'}
											size="sm"
											onClick={() => setShowCompletedTasks(!showCompletedTasks)}
											className="w-16"
										>
											{showCompletedTasks ? 'On' : 'Off'}
										</Button>
									</div>

									{/* Show Color Coding */}
									<div className="flex items-center justify-between">
										<div>
											<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
												Show Color Coding
											</label>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												Use colors to distinguish task types and priorities
											</p>
										</div>
										<Button
											variant={showColorCoding ? 'default' : 'outline'}
											size="sm"
											onClick={() => setShowColorCoding(!showColorCoding)}
											className="w-16"
										>
											{showColorCoding ? 'On' : 'Off'}
										</Button>
									</div>

									{/* Event Density */}
									<div className="flex items-center justify-between">
										<div>
											<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
												Event Density
											</label>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												Control spacing between events
											</p>
										</div>
										<select
											value={eventDensity}
											onChange={(e) => setEventDensity(e.target.value as 'compact' | 'normal' | 'spacious')}
											className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
										>
											<option value="compact">Compact</option>
											<option value="normal">Normal</option>
											<option value="spacious">Spacious</option>
										</select>
									</div>

									{/* Show Grid Lines */}
									<div className="flex items-center justify-between">
										<div>
											<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
												Show Grid Lines
											</label>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												Display calendar grid borders
											</p>
										</div>
										<Button
											variant={showGridLines ? 'default' : 'outline'}
											size="sm"
											onClick={() => setShowGridLines(!showGridLines)}
											className="w-16"
										>
											{showGridLines ? 'On' : 'Off'}
										</Button>
									</div>
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
								<Button
									variant="outline"
									onClick={() => setShowSettings(false)}
									className="flex-1"
								>
									Close
								</Button>
								<Button
									onClick={() => {
										// Reset to defaults
										setShowCompletedTasks(false);
										setShowColorCoding(true);
										setEventDensity('normal');
										setShowGridLines(true);
									}}
									variant="outline"
									className="flex-1"
								>
									Reset to Defaults
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

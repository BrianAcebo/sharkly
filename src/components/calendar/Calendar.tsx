import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Settings, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';
import { Task } from '../../types/tasks';
import { formatDateSafe } from '../../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import { TaskDetail } from '../tasks/TaskDetail';

interface CalendarEvent {
	id: string;
	title: string;
	start: Date;
	end: Date;
	type: 'task' | 'google' | 'reminder';
	priority?: string;
	status?: string;
	metadata?: any;
}

interface CalendarView {
	type: 'month' | 'week' | 'day';
	label: string;
}

export const Calendar: React.FC = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [currentDate, setCurrentDate] = useState(new Date());
	const [view, setView] = useState<CalendarView>({ type: 'month', label: 'Month' });
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
	const [showTaskModal, setShowTaskModal] = useState(false);
	const [selectedTask, setSelectedTask] = useState<Task | null>(null);
	const [showTaskDetail, setShowTaskDetail] = useState(false);

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
			const { data: tasks, error } = await supabase
				.from('tasks')
				.select('*')
				.eq('owner_id', user?.id)
				.order('due_date', { ascending: true });

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
		} finally {
			setLoading(false);
		}
	}, [user?.id]);

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
		const lastDay = new Date(year, month + 1, 0);
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

	// Get events for a specific date
	const getEventsForDate = (date: Date) => {
		return events.filter(event => {
			const eventDate = new Date(event.start);
			return eventDate.toDateString() === date.toDateString();
		});
	};

	// Handle date click
	const handleDateClick = (date: Date) => {
		setCurrentDate(date);
		setView({ type: 'day', label: 'Day' });
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
									{ type: 'month', label: 'Month' },
									{ type: 'week', label: 'Week' },
									{ type: 'day', label: 'Day' }
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
								<Button
									variant="outline"
									size="sm"
									onClick={connectGoogleCalendar}
									className="h-8 px-3"
								>
									<RefreshCw className="h-4 w-4 mr-2" />
									{googleCalendarConnected ? 'Connected' : 'Connect Google'}
								</Button>
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
							<div className="grid grid-cols-7">
								{monthGrid.map((day, index) => (
									<div
										key={index}
										className={`min-h-[120px] border-r border-b border-gray-200 dark:border-gray-700 p-2 cursor-pointer transition-colors ${
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
										<div className="space-y-1">
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
															? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border border-red-200 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-800 hover:scale-105 hover:shadow-sm'
															: event.type === 'google'
															? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
															: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800'
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
						<div className="p-4 text-center text-gray-500">
							Week view coming soon...
						</div>
					)}

					{view.type === 'day' && (
						<div className="p-4 text-center text-gray-500">
							Day view coming soon...
						</div>
					)}
				</CardContent>
			</Card>

			{/* Task Detail Modal */}
			{showTaskDetail && selectedTask && (
				<TaskDetail
					task={selectedTask}
					onEdit={() => {
						setShowTaskDetail(false);
						// You could open the edit form here if needed
						console.log('Edit task:', selectedTask.id);
					}}
					onDelete={() => {
						setShowTaskDetail(false);
						// You could open the delete confirmation here if needed
						console.log('Delete task:', selectedTask.id);
					}}
					onClose={() => {
						setShowTaskDetail(false);
						setSelectedTask(null);
					}}
					onBack={() => {
						setShowTaskDetail(false);
						setSelectedTask(null);
					}}
				/>
			)}

			{/* Task Modal would go here */}
			{showTaskModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
						<h2 className="text-lg font-semibold mb-4">Add New Task</h2>
						<p className="text-gray-600 dark:text-gray-400 mb-4">
							Task creation modal coming soon...
						</p>
						<div className="flex justify-end space-x-2">
							<Button
								variant="outline"
								onClick={() => setShowTaskModal(false)}
							>
								Cancel
							</Button>
							<Button onClick={() => setShowTaskModal(false)}>
								Create Task
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

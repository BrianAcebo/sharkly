import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Task, TASK_TYPES, PRIORITY_COLORS, STATUS_COLORS } from '../../types/tasks';
import { Edit, Trash2, CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { formatDateSafe } from '../../utils/dateUtils';

interface TaskListProps {
	tasks: Task[];
	onEdit: (task: Task) => void;
	onDelete: (task: Task) => void;
	onComplete: (taskId: string) => void;
	onView?: (task: Task) => void;
	onLeadClick?: (leadId: string) => void;
	loading?: boolean;
}

type FilterType = 'all' | 'pending' | 'overdue' | 'due_today';
type SortType = 'due_date' | 'priority' | 'type';

export const TaskList: React.FC<TaskListProps> = ({
	tasks,
	onEdit,
	onDelete,
	onComplete,
	onView,
	onLeadClick,
	loading = false
}) => {
	const [filter, setFilter] = useState<FilterType>('all');
	const [sortBy, setSortBy] = useState<SortType>('due_date');

	const getFilteredTasks = () => {
		let filtered = [...tasks];

		// Apply filter
		switch (filter) {
			case 'pending':
				filtered = filtered.filter(task => task.status === 'pending');
				break;
			case 'overdue': {
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				filtered = filtered.filter(task => 
					task.status !== 'completed' && 
					new Date(task.due_date) < today
				);
				break;
			}
			case 'due_today': {
				const todayDate = new Date();
				todayDate.setHours(0, 0, 0, 0);
				filtered = filtered.filter(task => 
					task.status !== 'completed' && 
					new Date(task.due_date).toDateString() === todayDate.toDateString()
				);
				break;
			}
			default:
				break;
		}

		// Apply sorting
		filtered.sort((a, b) => {
			switch (sortBy) {
				case 'due_date':
					return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
				case 'priority': {
					const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
					return priorityOrder[b.priority] - priorityOrder[a.priority];
				}
				case 'type':
					return a.type.localeCompare(b.type);
				default:
					return 0;
			}
		});

		return filtered;
	};

	const getTaskStatus = (task: Task) => {
		if (task.status === 'completed') return 'completed';
		
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const dueDate = new Date(task.due_date);
		
		if (dueDate < today) return 'overdue';
		if (dueDate.toDateString() === today.toDateString()) return 'due_today';
		return 'pending';
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'completed':
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case 'overdue':
				return <AlertTriangle className="h-4 w-4 text-red-500" />;
			case 'due_today':
				return <Clock className="h-4 w-4 text-orange-500" />;
			default:
				return <Calendar className="h-4 w-4 text-gray-500" />;
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case 'completed':
				return 'Completed';
			case 'overdue':
				return 'Overdue';
			case 'due_today':
				return 'Due Today';
			default:
				return 'Pending';
		}
	};

	const filteredTasks = getFilteredTasks();

	if (loading) {
		return (
			<div className="space-y-4">
				{Array.from({ length: 3 }).map((_, index) => (
					<Card key={index} className="animate-pulse">
						<CardContent className="p-4">
							<div className="space-y-3">
								<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
								<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
								<div className="flex space-x-2">
									<div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
									<div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (filteredTasks.length === 0) {
		return (
			<Card>
				<CardContent className="p-8 text-center">
					<Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
						No tasks found
					</h3>
					<p className="text-gray-500 dark:text-gray-400">
						{filter === 'all' 
							? 'Create your first task to get started!' 
							: `No ${filter.replace('_', ' ')} tasks found.`
						}
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{/* Filters and Sorting */}
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex space-x-2">
					{['all', 'pending', 'overdue', 'due_today'].map((filterOption) => (
						<Button
							key={filterOption}
							variant={filter === filterOption ? 'default' : 'outline'}
							size="sm"
							onClick={() => setFilter(filterOption as FilterType)}
						>
							{filterOption.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
						</Button>
					))}
				</div>

				<div className="flex items-center space-x-2">
					<label className="text-sm text-gray-600 dark:text-gray-400">Sort by:</label>
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value as SortType)}
						className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
					>
						<option value="due_date">Due Date</option>
						<option value="priority">Priority</option>
						<option value="type">Type</option>
					</select>
				</div>
			</div>

			{/* Task List */}
			<div className="space-y-3">
				{filteredTasks.map((task) => {
					const taskStatus = getTaskStatus(task);
					const isOverdue = taskStatus === 'overdue';
					
					return (
						<Card 
							key={task.id} 
							className={`transition-all hover:shadow-md ${
								isOverdue ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : ''
							}`}
						>
							<CardContent className="p-4">
								<div className="flex items-start justify-between">
									<div className="flex-1 space-y-3">
										{/* Task Header */}
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<h3 className="font-medium text-gray-900 dark:text-white">
													{task.title}
												</h3>
												{task.description && (
													<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
														{task.description}
													</p>
												)}
											</div>
											<div className="flex items-center space-x-2 ml-4">
												{getStatusIcon(taskStatus)}
												<span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[task.status]}`}>
													{getStatusText(taskStatus)}
												</span>
											</div>
										</div>

										{/* Task Details */}
										<div className="flex flex-wrap items-center gap-3 text-sm">
											{/* Task Type */}
											<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${TASK_TYPES[task.type].color} bg-opacity-10`}>
												<span className="mr-1">{TASK_TYPES[task.type].icon}</span>
												{TASK_TYPES[task.type].label}
											</span>

											{/* Priority */}
											<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
												{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
											</span>

											{/* Due Date */}
											<span className="text-gray-600 dark:text-gray-400">
												Due: {formatDateSafe(task.due_date, 'long')}
											</span>

											{/* Related Lead */}
											{task.lead_name && task.lead_id && (
												<span 
													className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
													onClick={() => onLeadClick?.(task.lead_id!)}
													title="Click to view lead profile"
												>
													Lead: {task.lead_name}
												</span>
											)}
										</div>
									</div>

									{/* Action Buttons */}
									<div className="flex items-center space-x-2 ml-4">
										{onView && (
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onView(task)}
												className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
												title="View task details"
											>
												<Calendar className="h-4 w-4" />
											</Button>
										)}
										{task.status !== 'completed' && (
											<>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => onEdit(task)}
													className="h-8 w-8 p-0"
												>
													<Edit className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => onComplete(task.id)}
													className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
												>
													<CheckCircle className="h-4 w-4" />
												</Button>
											</>
										)}
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onDelete(task)}
											className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
};

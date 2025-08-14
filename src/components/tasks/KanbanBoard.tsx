import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Task, TASK_TYPES } from '../../types/tasks';
import { Edit, Trash2, Plus, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface KanbanBoardProps {
	tasks: Task[];
	onEdit: (task: Task) => void;
	onDelete: (taskId: string) => void;
	onStatusChange: (taskId: string, newStatus: Task['status']) => void;
	onCreateTask: () => void;
	onLeadClick?: (leadId: string) => void;
	loading?: boolean;
}

interface Column {
	id: Task['status'];
	title: string;
	icon: React.ReactNode;
	color: string;
	tasks: Task[];
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
	tasks,
	onEdit,
	onDelete,
	onStatusChange,
	onCreateTask,
	onLeadClick,
	loading = false
}) => {

	const columns: Column[] = useMemo(() => [
		{
			id: 'pending',
			title: 'To Do',
			icon: <Clock className="h-4 w-4" />,
			color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
			tasks: tasks.filter(task => task.status === 'pending')
		},
		{
			id: 'in_progress',
			title: 'In Progress',
			icon: <AlertTriangle className="h-4 w-4" />,
			color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
			tasks: tasks.filter(task => task.status === 'in_progress')
		},
		{
			id: 'completed',
			title: 'Done',
			icon: <Calendar className="h-4 w-4" />,
			color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
			tasks: tasks.filter(task => task.status === 'completed')
		}
	], [tasks]);

	const handleDragStart = (e: React.DragEvent, taskId: string) => {
		e.dataTransfer.setData('text/plain', taskId);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = async (e: React.DragEvent, newStatus: Task['status']) => {
		e.preventDefault();
		const taskId = e.dataTransfer.getData('text/plain');
		onStatusChange(taskId, newStatus);
	};

	const getTaskPriorityColor = (priority: Task['priority']) => {
		switch (priority) {
			case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
			case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200';
			case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
			case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200';
			default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200';
		}
	};

	const getTaskTypeIcon = (type: Task['type']) => {
		return TASK_TYPES[type]?.icon || '📝';
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
				return <Calendar className="h-3 w-3 text-green-500" />;
			case 'overdue':
				return <AlertTriangle className="h-3 w-3 text-red-500" />;
			case 'due_today':
				return <Clock className="h-3 w-3 text-orange-500" />;
			default:
				return <Calendar className="h-3 w-3 text-gray-500" />;
		}
	};

	// SortableTaskItem component
	const TaskItem: React.FC<{ task: Task; onEdit: (task: Task) => void; onDelete: (taskId: string) => void }> = ({ task, onEdit, onDelete }) => {


		// Calculate task status for styling
		const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'completed';
		const taskStatus = getTaskStatus(task);

		return (
			<div
				draggable
				onDragStart={(e: React.DragEvent) => handleDragStart(e, task.id)}
				className={`bg-white dark:bg-gray-800 rounded-lg border p-3 cursor-move hover:shadow-md transition-all ${
					isOverdue ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'
				}`}
			>
				{/* Task Header */}
				<div className="flex items-start justify-between mb-2">
					<div className="flex items-center space-x-2">
						<span className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
							{task.title}
						</span>
					</div>
					<div className="flex items-center space-x-1">
						{getStatusIcon(taskStatus)}
					</div>
				</div>

				{/* Task Description */}
				{task.description && (
					<p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
						{task.description}
					</p>
				)}

				{/* Task Meta */}
				<div className="space-y-2">
					{/* Task Type and Priority */}
					<div className="flex items-center justify-between">
						<span className="text-xs text-gray-500 dark:text-gray-400">
							{getTaskTypeIcon(task.type)} {TASK_TYPES[task.type]?.label}
						</span>
						<span className={`text-xs px-2 py-1 rounded-full ${getTaskPriorityColor(task.priority)}`}>
							{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
						</span>
					</div>

					{/* Due Date */}
					<div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
						<Calendar className="h-3 w-3" />
						<span>Due: {format(new Date(task.due_date), 'MMM dd')}</span>
					</div>

					{/* Related Lead */}
					{task.lead_name && task.lead_id && (
						<div 
							className="text-xs text-blue-600 dark:text-blue-400 truncate hover:underline cursor-pointer"
							onClick={() => onLeadClick?.(task.lead_id!)}
							title="Click to view lead profile"
						>
							👤 {task.lead_name}
						</div>
					)}
				</div>

				{/* Action Buttons */}
				<div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
					<div className="flex items-center space-x-1">
						{task.reminder_enabled && (
							<span className="text-xs text-blue-500">🔔</span>
						)}
					</div>
					<div className="flex items-center space-x-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onEdit(task)}
							className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
						>
							<Edit className="h-3 w-3" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onDelete(task.id)}
							className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
						>
							<Trash2 className="h-3 w-3" />
						</Button>
					</div>
				</div>
			</div>
		);
	};

	if (loading) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{Array.from({ length: 3 }).map((_, index) => (
					<Card key={index} className="animate-pulse">
						<CardHeader>
							<div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{Array.from({ length: 2 }).map((_, taskIndex) => (
									<div key={taskIndex} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
								))}
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
			{columns.map((column) => (
				<Card 
					key={column.id} 
					className={`${column.color} border-2`}
					onDragOver={handleDragOver}
					onDrop={(e) => handleDrop(e, column.id)}
				>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center space-x-2 text-sm font-medium">
								{column.icon}
								<span>{column.title}</span>
								<span className="ml-2 px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-bold">
									{column.tasks.length}
								</span>
							</CardTitle>
							{column.id === 'pending' && (
								<Button
									variant="ghost"
									size="sm"
									onClick={onCreateTask}
									className="h-6 w-6 p-0 hover:bg-white dark:hover:bg-gray-800"
								>
									<Plus className="h-4 w-4" />
								</Button>
							)}
						</div>
					</CardHeader>
					<CardContent>
						<div className="min-h-[200px] space-y-3">
							{column.tasks.map((task) => (
								<TaskItem
									key={task.id}
									task={task}
									onEdit={onEdit}
									onDelete={onDelete}
								/>
							))}
							
							{/* Empty State */}
							{column.tasks.length === 0 && (
								<div className="text-center py-8 text-gray-500 dark:text-gray-400">
									<p className="text-sm mb-3">No tasks here</p>
									{column.id === 'pending' && (
										<Button
											variant="outline"
											size="sm"
											onClick={onCreateTask}
											className="mt-2"
										>
											<Plus className="h-3 w-3 mr-1" />
											Add Task
										</Button>
									)}
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
};

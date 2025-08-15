import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Task } from '../../types/tasks';
import { formatDateSafe } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { 
	Calendar, 
	Clock, 
	User, 
	Building2, 
	FileText, 
	Flag, 
	Tag, 
	Edit, 
	Trash2, 
	CheckCircle,
	X,
	ArrowLeft,
	Phone,
	Mail
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TaskDetailProps {
	task: Task;
	onEdit: () => void;
	onDelete: () => void;
	onClose: () => void;
	onBack: () => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
	task,
	onEdit,
	onDelete,
	onClose,
	onBack
}) => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'urgent':
				return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-200 dark:border-red-700';
			case 'high':
				return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 border-orange-200 dark:border-red-700';
			case 'medium':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
			case 'low':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-200 dark:border-green-700';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200 border-gray-200 dark:border-gray-700';
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'completed':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-200 dark:border-green-700';
			case 'in_progress':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border-blue-200 dark:border-blue-700';
			case 'pending':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200 border-gray-200 dark:border-gray-700';
		}
	};

	const getTypeIcon = (type: string) => {
		switch (type) {
			case 'follow_up':
				return <Clock className="h-4 w-4" />;
			case 'proposal':
				return <FileText className="h-4 w-4" />;
			case 'meeting':
				return <User className="h-4 w-4" />;
			case 'call':
				return <Phone className="h-4 w-4" />;
			case 'email':
				return <Mail className="h-4 w-4" />;
			default:
				return <Tag className="h-4 w-4" />;
		}
	};

	const isOverdue = () => {
		if (task.status === 'completed') return false;
		const dueDate = new Date(task.due_date);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return dueDate < today;
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center space-x-3">
						<Button
							variant="ghost"
							size="sm"
							onClick={onBack}
							className="p-2"
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div>
							<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
								Task Details
							</h2>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								View and manage task information
							</p>
						</div>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={onClose}
						className="p-2"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>

				{/* Content */}
				<div className="p-6 space-y-6">
					{/* Task Title and Status */}
					<div className="space-y-4">
						<div className="flex items-start justify-between">
							<h1 className="text-2xl font-bold text-gray-900 dark:text-white pr-4">
								{task.title}
							</h1>
							<div className="flex items-center space-x-2">
								<Badge className={`${getStatusColor(task.status)} border`}>
									{task.status === 'completed' ? (
										<CheckCircle className="h-3 w-3 mr-1" />
									) : null}
									{task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.slice(1).replace('_', ' ')}
								</Badge>
								{isOverdue() && (
									<Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-200 dark:border-red-700">
										Overdue
									</Badge>
								)}
							</div>
						</div>

						{/* Priority and Type */}
						<div className="flex items-center space-x-4">
							<Badge className={`${getPriorityColor(task.priority)} border flex items-center space-x-1`}>
								<Flag className="h-3 w-3" />
								<span>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority</span>
							</Badge>
							<Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200 border-gray-200 dark:border-gray-700 flex items-center space-x-1">
								{getTypeIcon(task.type)}
								<span>{task.type.replace('_', ' ').charAt(0).toUpperCase() + task.type.slice(1).replace('_', ' ')}</span>
							</Badge>
						</div>
					</div>

					{/* Description */}
					{task.description && (
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-lg flex items-center space-x-2">
									<FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
									<span>Description</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
									{task.description}
								</p>
							</CardContent>
						</Card>
					)}

					{/* Due Date and Time */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-lg flex items-center space-x-2">
								<Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
								<span>Due Date & Time</span>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								<div className="flex items-center space-x-2">
									<Calendar className="h-4 w-4 text-gray-500" />
									<span className="text-gray-700 dark:text-gray-300">
										{formatDateSafe(task.due_date, 'full')}
									</span>
								</div>
								{task.reminder_time && (
									<div className="flex items-center space-x-2">
										<Clock className="h-4 w-4 text-gray-500" />
										<span className="text-gray-700 dark:text-gray-300">
											Reminder set for: {formatDateSafe(task.reminder_time, 'time')}
										</span>
									</div>
								)}
								{isOverdue() && (
									<div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
										<Clock className="h-4 w-4" />
										<span className="font-medium">
											This task is overdue by {Math.ceil((new Date().getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24))} days
										</span>
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Lead Information */}
					{task.lead_id && task.lead_name && (
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-lg flex items-center space-x-2">
									<Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
									<span>Related Lead</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<a href={`/leads/${task.lead_id}`} className="flex items-center space-x-2">
									<Button variant="flat" className="w-full" onClick={() => {
										navigate(`/leads/${task.lead_id}`);
									}}>
										<User className="h-4 w-4 text-gray-500" />
										<span className="text-gray-700 dark:text-gray-300">
											{task.lead_name}
										</span>
									</Button>
								</a>
							</CardContent>
						</Card>
					)}

					{/* Reminder Settings */}
					{task.reminder_enabled && (
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-lg flex items-center space-x-2">
									<Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
									<span>Reminder Settings</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<div className="flex items-center space-x-2">
										<CheckCircle className="h-4 w-4 text-green-500" />
										<span className="text-gray-700 dark:text-gray-300">
											Reminders are enabled
										</span>
									</div>
									{task.reminder_time && (
										<div className="flex items-center space-x-2">
											<Clock className="h-4 w-4 text-gray-500" />
											<span className="text-gray-700 dark:text-gray-300">
												Next reminder: {formatDateSafe(task.reminder_time, 'full')}
											</span>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Metadata */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-lg">Task Information</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<p className="text-gray-500 dark:text-gray-400">Created</p>
									<p className="text-gray-700 dark:text-gray-300 font-medium">
										{formatDateSafe(task.created_at, 'full')}
									</p>
								</div>
								<div>
									<p className="text-gray-500 dark:text-gray-400">Last Updated</p>
									<p className="text-gray-700 dark:text-gray-300 font-medium">
										{formatDateSafe(task.updated_at, 'full')}
									</p>
								</div>
								<div>
									<p className="text-gray-500 dark:text-gray-400">Task ID</p>
									<p className="text-gray-700 dark:text-gray-300 font-mono text-xs">
										{task.id}
									</p>
								</div>
								<div>
									<p className="text-gray-500 dark:text-gray-400">Owner</p>
									<p className="text-gray-700 dark:text-gray-300 font-medium">
										{task.owner_id === user?.id ? 'You' : 'Assigned User'}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Footer Actions */}
				<div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
					<div className="flex items-center space-x-2">
						<Button
							variant="outline"
							onClick={onBack}
							className="flex items-center space-x-2"
						>
							<ArrowLeft className="h-4 w-4" />
							<span>Back to Calendar</span>
						</Button>
					</div>
					<div className="flex items-center space-x-2">
						<Button
							variant="outline"
							onClick={onDelete}
							className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
						>
							<Trash2 className="h-4 w-4" />
							<span>Delete Task</span>
						</Button>
						<Button
							onClick={onEdit}
							className="flex items-center space-x-2"
						>
							<Edit className="h-4 w-4" />
							<span>Edit Task</span>
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

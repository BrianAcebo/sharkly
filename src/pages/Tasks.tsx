import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TaskForm } from '../components/tasks/TaskForm';
import { TaskDetail } from '../components/tasks/TaskDetail';
import { TaskList } from '../components/tasks/TaskList';
import { KanbanBoard } from '../components/tasks/KanbanBoard';
import { useTasks } from '../hooks/useTasks';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { Plus, Calendar, Clock, AlertTriangle, CheckCircle, Grid3X3, List, Trash2, RefreshCw } from 'lucide-react';
import { Task } from '../types/tasks';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import PageMeta from '../components/common/PageMeta';

export default function Tasks() {
	const { setTitle, breadcrumbs } = useBreadcrumbs();
	const navigate = useNavigate();
	const { id: taskId } = useParams<{ id: string }>();
	const {
		tasks,
		loading,
		stats,
		updateTask,
		deleteTask,
		completeTask
	} = useTasks();

	useEffect(() => {
		setTitle('Tasks');
	}, [setTitle]);

	// Handle individual task viewing when ID is provided
	useEffect(() => {
		if (taskId && tasks.length > 0) {
			const task = tasks.find(t => t.id === taskId);
			if (task) {
				setViewingTask(task);
				setShowTaskDetail(true);
				setTitle(`Task: ${task.title}`);
			}
		}
	}, [taskId, tasks, setTitle]);

	const [showForm, setShowForm] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showTaskDetail, setShowTaskDetail] = useState(false);
	const [viewingTask, setViewingTask] = useState<Task | null>(null);



	const handleDeleteTask = (task: Task) => {
		setTaskToDelete(task);
		setShowDeleteConfirm(true);
	};

	const confirmDeleteTask = async () => {
		if (!taskToDelete) return;
		
		setIsDeleting(true);
		try {
			const success = await deleteTask(taskToDelete.id);
			if (success) {
				toast.success('Task deleted successfully');
			}
		} catch (error) {
			console.error('Error deleting task:', error);
			toast.error('Failed to delete task');
		} finally {
			setIsDeleting(false);
			setShowDeleteConfirm(false);
			setTaskToDelete(null);
		}
	};

	const cancelDeleteTask = () => {
		setShowDeleteConfirm(false);
		setTaskToDelete(null);
	};

	const handleCompleteTask = async (taskId: string) => {
		return await completeTask(taskId);
	};

	const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
		return await updateTask(taskId, { status: newStatus });
	};

	const handleLeadClick = (leadId: string) => {
		navigate(`/leads/${leadId}`);
	};

	const openEditForm = (task: Task) => {
		setEditingTask(task);
		setShowForm(true);
	};

	const closeForm = () => {
		setShowForm(false);
		setEditingTask(null);
	};

	const getStatusIcon = (status: keyof typeof stats) => {
		switch (status) {
			case 'total':
				return <Calendar className="h-6 w-6 text-blue-500" />;
			case 'pending':
				return <Clock className="h-6 w-6 text-yellow-500" />;
			case 'overdue':
				return <AlertTriangle className="h-6 w-6 text-red-500" />;
			case 'dueToday':
				return <Clock className="h-6 w-6 text-orange-500" />;
			case 'completed':
				return <CheckCircle className="h-6 w-6 text-green-500" />;
			default:
				return <Calendar className="h-6 w-6 text-gray-500" />;
		}
	};

	const getStatusLabel = (status: keyof typeof stats) => {
		switch (status) {
			case 'total':
				return 'Total Tasks';
			case 'pending':
				return 'Pending';
			case 'overdue':
				return 'Overdue';
			case 'dueToday':
				return 'Due Today';
			case 'dueThisWeek':
				return 'Due This Week';
			case 'completed':
				return 'Completed';
			case 'in_progress':
				return 'In Progress';
			default:
				return status;
		}
	};

	return (
		<>
			<PageMeta title="Tasks" description="Manage your tasks and stay organized" />
			
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
				{/* Header */}
				<div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="py-6">
							{/* Breadcrumbs */}
							<nav className="flex mb-4" aria-label="Breadcrumb">
								<ol className="flex items-center space-x-2">
									{breadcrumbs.map((crumb, index) => (
										<li key={index} className="flex items-center">
											{index > 0 && (
												<span className="mx-2 text-gray-400">/</span>
											)}
											<span className="text-sm text-gray-500 dark:text-gray-400">
												{crumb}
											</span>
										</li>
									))}
								</ol>
							</nav>

							{/* Page Header */}
							<div className="flex items-center justify-between">
								<div>
									<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
										Task Management
									</h1>
									<p className="mt-2 text-gray-600 dark:text-gray-400">
										Stay organized and never miss a follow-up with your leads
									</p>
								</div>
								<div className="flex items-center space-x-3">
									{/* View Toggle */}
									<div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
										<Button
											variant={viewMode === 'kanban' ? 'flat' : 'ghost'}
											size="sm"
											onClick={() => setViewMode('kanban')}
											className="h-8 px-3"
										>
											<Grid3X3 className="h-4 w-4 mr-1" />
											Kanban
										</Button>
										<Button
											variant={viewMode === 'list' ? 'flat' : 'ghost'}
											size="sm"
											onClick={() => setViewMode('list')}
											className="h-8 px-3"
										>
											<List className="h-4 w-4 mr-1" />
											List
										</Button>
									</div>
									
									<Button
										variant="outline"
										onClick={() => navigate('/calendar')}
										className="flex items-center space-x-2"
									>
										<Calendar className="h-4 w-4" />
										<span>Calendar View</span>
									</Button>
									<Button
										onClick={() => setShowForm(true)}
										className="flex items-center space-x-2"
									>
										<Plus className="h-4 w-4" />
										<span>Create Task</span>
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Main Content */}
				<div className="mx-auto py-8">
					{/* Statistics Overview */}
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
						{Object.entries(stats).map(([key, value]) => (
							<Card key={key} className="text-center">
								<CardContent className="p-4">
									<div className="flex items-center justify-center mb-2">
										{getStatusIcon(key as keyof typeof stats)}
									</div>
									<p className="text-2xl font-bold text-gray-900 dark:text-white">
										{value}
									</p>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										{getStatusLabel(key as keyof typeof stats)}
									</p>
								</CardContent>
							</Card>
						))}
					</div>

					{/* Task Management */}
					{viewMode === 'kanban' ? (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Grid3X3 className="h-5 w-5" />
									<span>Kanban Board</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<KanbanBoard
									tasks={tasks}
									onEdit={openEditForm}
									onDelete={handleDeleteTask}
									onStatusChange={handleStatusChange}
									onCreateTask={() => setShowForm(true)}
									onLeadClick={handleLeadClick}
									loading={loading}
								/>
							</CardContent>
						</Card>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
							{/* Task List */}
							<div className="lg:col-span-2">
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center space-x-2">
											<List className="h-5 w-5" />
											<span>Your Tasks</span>
										</CardTitle>
									</CardHeader>
									<CardContent>
										<TaskList
											tasks={tasks}
											onEdit={openEditForm}
											onDelete={handleDeleteTask}
											onComplete={handleCompleteTask}
											onView={(task) => {
												setViewingTask(task);
												setShowTaskDetail(true);
											}}
											onLeadClick={handleLeadClick}
											loading={loading}
										/>
									</CardContent>
								</Card>
							</div>

							{/* Quick Actions & Insights */}
							<div className="space-y-6">
								{/* Quick Actions */}
								<Card>
									<CardHeader>
										<CardTitle className="text-lg">Quick Actions</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3">
										<Button
											variant="outline"
											className="w-full justify-start"
											onClick={() => setShowForm(true)}
										>
											<Plus className="h-4 w-4 mr-2" />
											Create New Task
										</Button>
									</CardContent>
								</Card>

								{/* Task Insights */}
								<Card>
									<CardHeader>
										<CardTitle className="text-lg">Insights</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										{stats.overdue > 0 && (
											<div className="flex items-center space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
												<AlertTriangle className="h-5 w-5 text-red-500" />
												<div>
													<p className="text-sm font-medium text-red-800 dark:text-red-200">
														{stats.overdue} overdue tasks
													</p>
													<p className="text-xs text-red-600 dark:text-red-300">
														These need immediate attention
													</p>
												</div>
											</div>
										)}

										{stats.dueToday > 0 && (
											<div className="flex items-center space-x-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
												<Clock className="h-5 w-5 text-orange-500" />
												<div>
													<p className="text-sm font-medium text-orange-800 dark:text-orange-200">
														{stats.dueToday} tasks due today
													</p>
													<p className="text-xs text-orange-600 dark:text-orange-300">
														Plan your day accordingly
													</p>
												</div>
											</div>
										)}

										{stats.completed > 0 && (
											<div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
												<CheckCircle className="h-5 w-5 text-green-500" />
												<div>
													<p className="text-sm font-medium text-green-800 dark:text-green-200">
														{stats.completed} tasks completed
													</p>
													<p className="text-xs text-green-600 dark:text-green-300">
														Great progress this week!
													</p>
												</div>
											</div>
										)}

										{stats.total === 0 && (
											<div className="text-center py-4">
												<Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
												<p className="text-sm text-gray-500 dark:text-gray-400">
													No tasks yet. Create your first task to get started!
												</p>
											</div>
										)}
									</CardContent>
								</Card>
							</div>
						</div>
					)}
				</div>

				{/* Task Detail Modal */}
				{showTaskDetail && viewingTask && (
					<TaskDetail
						task={viewingTask}
						onEdit={() => {
							setShowTaskDetail(false);
							setEditingTask(viewingTask);
							setShowForm(true);
						}}
						onDelete={() => {
							setShowTaskDetail(false);
							setTaskToDelete(viewingTask);
							setShowDeleteConfirm(true);
						}}
						onClose={() => {
							setShowTaskDetail(false);
							setViewingTask(null);
							navigate('/tasks');
						}}
						onBack={() => {
							setShowTaskDetail(false);
							setViewingTask(null);
							navigate('/tasks');
						}}
					/>
				)}

				{/* Task Form Modal */}
				{showForm && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
						<div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-branded rounded-lg">
							<TaskForm
								onCancel={closeForm}
								initialData={editingTask || undefined}
								mode={editingTask ? 'edit' : 'create'}
							/>
						</div>
					</div>
				)}

				{/* Delete Confirmation Modal */}
				{showDeleteConfirm && taskToDelete && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
						<div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
							<div className="flex items-center space-x-3 mb-4">
								<div className="flex-shrink-0">
									<div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
										<Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
									</div>
								</div>
								<div>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
										Delete Task
									</h3>
									<p className="text-sm text-gray-500 dark:text-gray-400">
										Are you sure you want to delete this task?
									</p>
								</div>
							</div>
							
							<div className="mb-6">
								<p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
									<strong>Task:</strong> {taskToDelete.title}
								</p>
								<p className="text-sm text-gray-600 dark:text-gray-300">
									This action cannot be undone. All data associated with this task will be permanently removed.
								</p>
							</div>

							<div className="flex space-x-3">
								<Button
									type="button"
									variant="outline"
									onClick={cancelDeleteTask}
									disabled={isDeleting}
									className="flex-1"
								>
									Cancel
								</Button>
								<Button
									type="button"
									variant="destructive"
									onClick={confirmDeleteTask}
									disabled={isDeleting}
									className="flex-1"
								>
									{isDeleting ? (
										<>
											<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
											Deleting...
										</>
									) : (
										'Delete Task'
									)}
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	);
}

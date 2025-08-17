import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TaskFormData, TASK_TYPES, PRIORITY_COLORS } from '../../types/tasks';
import { useAuth } from '../../contexts/AuthContext';
import { createTaskWithReminders } from '../../api/tasks';
import { Plus, Bell, X } from 'lucide-react';
import { toast } from 'sonner';
import { TimePicker } from '../ui/time-picker';
import DatePicker from '../form/date-picker';
import Input from '../form/input/InputField';
import TextArea from '../form/input/TextArea';
import Select from '../form/Select';
import Checkbox from '../form/input/Checkbox';

interface CreateTaskForLeadProps {
	leadId: string;
	leadName: string;
	leadCompany?: string;
	onTaskCreated?: () => void;
}

export const CreateTaskForLead: React.FC<CreateTaskForLeadProps> = ({
	leadId,
	leadName,
	onTaskCreated
}) => {
	const { user } = useAuth();
	const [showForm, setShowForm] = useState(false);
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState<TaskFormData>({
		title: '',
		description: '',
		due_date: '',
		priority: 'medium',
		type: 'follow_up',
		lead_id: leadId,
		reminder_enabled: false,
		reminder_time: '',
		reminders: []
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user?.organization_id) return;

		setLoading(true);
		try {
			// Combine date and time into a timestamp if both are provided
			let dueAtUtc: string;
			
			if (formData.due_date && formData.reminder_time) {
				const dateTime = new Date(`${formData.due_date}T${formData.reminder_time}`);
				dueAtUtc = dateTime.toISOString();
			} else if (formData.due_date) {
				// If only date is provided, use end of day
				const dueDate = new Date(formData.due_date);
				dueDate.setHours(23, 59, 59, 999);
				dueAtUtc = dueDate.toISOString();
			} else {
				throw new Error('Please select a due date');
			}

			// Convert reminders to offset minutes
			const offsetsMinutes: number[] = [];
			if (formData.reminder_enabled && formData.reminders.length > 0) {
				formData.reminders.forEach(reminder => {
					switch (reminder.type) {
						case '5min': offsetsMinutes.push(5); break;
						case '10min': offsetsMinutes.push(10); break;
						case '15min': offsetsMinutes.push(15); break;
						case '30min': offsetsMinutes.push(30); break;
						case '1hr': offsetsMinutes.push(60); break;
						case '1day': offsetsMinutes.push(1440); break;
						case 'custom':
							if (reminder.customTime) {
								// For custom times, calculate the offset
								const customTime = new Date(reminder.customTime);
								const dueTime = new Date(dueAtUtc);
								const offsetMs = dueTime.getTime() - customTime.getTime();
								const offsetMinutes = Math.round(offsetMs / (1000 * 60));
								if (offsetMinutes > 0) {
									offsetsMinutes.push(offsetMinutes);
								}
							}
							break;
					}
				});
			}

			// Use the new API to create task with reminders
			const result = await createTaskWithReminders({
				ownerId: user.id,
				organizationId: user.organization_id,
				title: formData.title,
				description: formData.description,
				dueAtUtc,
				offsetsMinutes,
				priority: formData.priority,
				type: formData.type
			});

			if (result.success) {
				toast.success('Task created successfully!');
				setShowForm(false);
				setFormData({
					title: '',
					description: '',
					due_date: '',
					priority: 'medium',
					type: 'follow_up',
					lead_id: leadId,
					reminder_enabled: false,
					reminder_time: '',
					reminders: []
				});
				onTaskCreated?.();
			} else {
				throw new Error(result.error || 'Failed to create task');
			}
		} catch (error) {
			console.error('Error creating task:', error);
			toast.error('Failed to create task');
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: keyof TaskFormData, value: string | boolean) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const getPriorityLabel = (priority: string) => {
		const labels = {
			urgent: '🚨 Urgent',
			high: '🔴 High',
			medium: '🟡 Medium',
			low: '🟢 Low'
		};
		return labels[priority as keyof typeof labels] || priority;
	};

	if (!showForm) {
		return (
			<Button
				onClick={() => setShowForm(true)}
				variant="outline"
				size="sm"
				className="flex items-center space-x-2"
			>
				<Plus className="h-4 w-4" />
				<span>Create Task</span>
			</Button>
		);
	}

	return (
		<Card className="w-full max-w-lg">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg">Create Task for {leadName}</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setShowForm(false)}
						className="h-6 w-6 p-0"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Task Title */}
					<Input
						label="Task Title"
						value={formData.title}
						onChange={(e) => handleInputChange('title', e.target.value)}
						placeholder="e.g., Follow up about proposal"
						required
					/>

					{/* Task Description */}
					<TextArea
						value={formData.description || ''}
						onChange={(value) => handleInputChange('description', value)}
						placeholder="Add details about the task..."
						rows={3}
					/>

					{/* Task Type and Priority */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
								Task Type
							</label>
							<Select
								options={Object.entries(TASK_TYPES).map(([key, { label, icon }]) => ({
									value: key,
									label: `${icon} ${label}`
								}))}
								placeholder="Select task type"
								onChange={(value) => handleInputChange('type', value)}
								defaultValue={formData.type}
							/>
						</div>

						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
								Priority
							</label>
							<Select
								options={Object.entries(PRIORITY_COLORS).map(([key]) => ({
									value: key,
									label: getPriorityLabel(key)
								}))}
								placeholder="Select priority"
								onChange={(value) => handleInputChange('priority', value)}
								defaultValue={formData.priority}
							/>
						</div>
					</div>

					{/* Due Date and Time */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<DatePicker
								id="lead-task-due-date"
								label="Due Date"
								placeholder="Select due date"
								defaultDate={formData.due_date ? new Date(formData.due_date) : undefined}
								onChange={(selectedDates) => {
									if (selectedDates && selectedDates.length > 0) {
										const date = selectedDates[0];
										const formattedDate = date.toISOString().split('T')[0];
										handleInputChange('due_date', formattedDate);
									}
								}}
							/>
						</div>

						<div className="space-y-2">
							<TimePicker
								label="Due Time (Optional)"
								value={formData.reminder_time}
								onChange={(time) => handleInputChange('reminder_time', time)}
								placeholder="Select time"
								selectedDate={formData.due_date}
							/>
						</div>
					</div>

					{/* Reminder Settings */}
					<div className="space-y-3">
						<div className="flex items-center space-x-3">
							<Checkbox
								id="reminder_enabled"
								checked={formData.reminder_enabled}
								onChange={(checked) => handleInputChange('reminder_enabled', checked)}
							/>
							<label htmlFor="reminder_enabled" className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
								<Bell className="h-4 w-4" />
								<span>Enable reminder notification</span>
							</label>
						</div>
					</div>

					{/* Form Actions */}
					<div className="flex justify-end space-x-3 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => setShowForm(false)}
							disabled={loading}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={loading || !formData.title || !formData.due_date}
						>
							{loading ? 'Creating...' : 'Create Task'}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
};

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import Input from '../form/input/InputField';
import TextArea from '../form/input/TextArea';
import Select from '../form/Select';
import Checkbox from '../form/input/Checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Task, TaskFormData, TASK_TYPES, PRIORITY_COLORS } from '../../types/tasks';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';
import { Bell, X, Search, ChevronDown, AlertCircle } from 'lucide-react';
import { TimePicker } from '../ui/time-picker';
import DatePicker from '../form/date-picker';

// Simple interface for leads dropdown
interface LeadOption {
	id: string;
	name: string;
	company: string | null;
	stage: string;
}

interface TaskFormProps {
	onSubmit: (taskData: TaskFormData) => Promise<boolean>;
	onCancel: () => void;
	initialData?: Partial<TaskFormData> | Partial<Task>; // Allow Task objects for editing
	mode: 'create' | 'edit';
}

interface FormErrors {
	title?: string;
	due_date?: string;
	reminder_time?: string;
	general?: string;
}

export const TaskForm: React.FC<TaskFormProps> = ({
	onSubmit,
	onCancel,
	initialData,
	mode
}) => {
	const { user } = useAuth();
	const [loading, setLoading] = useState(false);
	const [leads, setLeads] = useState<LeadOption[]>([]);
	const [filteredLeads, setFilteredLeads] = useState<LeadOption[]>([]);
	const [leadSearchQuery, setLeadSearchQuery] = useState('');
	const [showLeadDropdown, setShowLeadDropdown] = useState(false);
	const [selectedLeadName, setSelectedLeadName] = useState('');
	const [errors, setErrors] = useState<FormErrors>({});

	const dropdownRef = useRef<HTMLDivElement>(null);

	// Function to fetch lead name from database if it's missing
	const fetchLeadName = async (leadId: string) => {
		try {
			const { data, error } = await supabase
				.from('leads')
				.select('name, company')
				.eq('id', leadId)
				.single();

			if (error) throw error;

			if (data) {
				const leadName = `${data.name} - ${data.company || 'No Company'}`;
				console.log('Fetched lead name from database:', leadName);
				setSelectedLeadName(leadName);
				setLeadSearchQuery(leadName);
			}
		} catch (error) {
			console.error('Error fetching lead name:', error);
		}
	};
	const [formData, setFormData] = useState<TaskFormData>({
		title: '',
		description: '',
		due_date: '',
		priority: 'medium',
		type: 'follow_up',
		lead_id: '',
		reminder_enabled: false,
		reminder_time: ''
	});

	// Fetch leads for selection
	useEffect(() => {
		const fetchLeads = async () => {
			if (!user || !user.organization_id) return;

			try {
				const { data, error } = await supabase
					.from('leads')
					.select('id, name, company, stage')
					.eq('organization_id', user.organization_id)
					.order('name');

				if (error) throw error;
				const leadsData = (data || []).map((lead: LeadOption) => ({
					id: lead.id,
					name: lead.name,
					company: lead.company,
					stage: lead.stage
				}));
				setLeads(leadsData);
				setFilteredLeads(leadsData);
			} catch (error) {
				console.error('Error fetching leads:', error);
			}
		};

		fetchLeads();
	}, [user]);

	// Filter leads based on search query
	useEffect(() => {
		if (!leadSearchQuery.trim()) {
			setFilteredLeads(leads);
		} else {
			const filtered = leads.filter(lead => 
				lead.name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
				(lead.company && lead.company.toLowerCase().includes(leadSearchQuery.toLowerCase()))
			);
			setFilteredLeads(filtered);
		}
	}, [leadSearchQuery, leads]);

	// Handle click outside to close dropdown
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setShowLeadDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Set initial data if editing
	useEffect(() => {
		if (initialData) {
			console.log('Setting initial data:', initialData); // Debug log
			
			// Format the reminder_time properly for editing
			let reminderTime = initialData.reminder_time || '';
			
			if (reminderTime && reminderTime.includes('T')) {
				// If reminder_time is a full timestamp, extract just the time part and convert to 12-hour format
				try {
					const date = new Date(reminderTime);
					if (isNaN(date.getTime())) {
						console.warn('Invalid reminder time in initial data:', reminderTime);
						reminderTime = '';
					} else {
						let hours = date.getHours();
						const minutes = date.getMinutes();
						const ampm = hours >= 12 ? 'PM' : 'AM';
						
						// Convert to 12-hour format
						if (hours === 0) {
							hours = 12; // 12 AM
						} else if (hours > 12) {
							hours = hours - 12; // PM times
						}
						
						reminderTime = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
					}
				} catch (error) {
					console.error('Error parsing reminder time:', error);
					reminderTime = '';
				}
			}
			
			setFormData(prev => ({ 
				...prev, 
				...initialData,
				reminder_time: reminderTime
			}));

			// Set the selected lead name if editing a task with a lead
			if (initialData.lead_id) {
				console.log('Found lead_id in initialData:', initialData.lead_id);
				
				// If lead_name exists, use it directly
				if ((initialData as Partial<Task>).lead_name) {
					console.log('Using existing lead_name:', (initialData as Partial<Task>).lead_name);
					setSelectedLeadName((initialData as Partial<Task>).lead_name!);
					setLeadSearchQuery((initialData as Partial<Task>).lead_name!);
				} else {
					// If lead_name is missing, fetch it from the database
					console.log('lead_name is missing, fetching from database...');
					fetchLeadName(initialData.lead_id);
				}
			} else {
				console.log('No lead_id found in initialData');
			}
			

		}
	}, [initialData]);

	// Validate form data
	const validateForm = (): boolean => {
		const newErrors: FormErrors = {};

		// Title validation
		if (!formData.title.trim()) {
			newErrors.title = 'Task title is required';
		}

		// Due date validation
		if (!formData.due_date) {
			newErrors.due_date = 'Due date is required';
		} else {
			const dueDate = new Date(formData.due_date);
			if (isNaN(dueDate.getTime())) {
				newErrors.due_date = 'Invalid due date format';
			} else {
				// Simple date comparison - just compare the date strings
				const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
				if (formData.due_date < today) {
					newErrors.due_date = 'Due date cannot be in the past';
				}
			}
		}

		// Reminder time validation
		if (formData.reminder_enabled && formData.reminder_time) {
			// Check if the combined date and time is in the past
			if (formData.due_date) {
				// The reminder_time should be in 12-hour format (e.g., "2:30 PM")
				// We need to parse it and convert to 24-hour for comparison
				const timeMatch = formData.reminder_time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
				if (!timeMatch) {
					newErrors.reminder_time = 'Invalid time format. Use 12-hour format (e.g., 2:30 PM)';
				} else {
					const [, hours, minutes, ampm] = timeMatch;
					let hour24 = parseInt(hours);
					
					// Convert to 24-hour format
					if (ampm.toUpperCase() === 'PM' && hour24 < 12) {
						hour24 += 12; // Convert PM to 24-hour (e.g., 2:30 PM -> 14:30)
					} else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
						hour24 = 0; // Convert 12 AM to 00:00
					}
					
					// Create the full datetime for comparison
					const reminderDateTime = new Date(`${formData.due_date}T${hour24.toString().padStart(2, '0')}:${minutes}`);
					const now = new Date();
					
					if (reminderDateTime <= now) {
						newErrors.reminder_time = 'Reminder time cannot be in the past. Please select a future time.';
					}
				}
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setErrors({}); // Clear previous errors

		try {
			// Validate form first
			if (!validateForm()) {
				setLoading(false);
				return;
			}

			// Combine date and time into a timestamp if both are provided
			let reminderTime = formData.reminder_time;
			
			if (formData.due_date && formData.reminder_time) {
				try {
					// Validate the date string first
					const dueDate = new Date(formData.due_date);
					if (isNaN(dueDate.getTime())) {
						throw new Error('Invalid due date');
					}

					// Validate the time string (12-hour format with AM/PM)
					const timeMatch = formData.reminder_time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
					if (!timeMatch) {
						throw new Error('Invalid time format. Use 12-hour format (e.g., 2:30 PM)');
					}

					// Parse the 12-hour time and convert to 24-hour for the datetime
					const [, hours, minutes, ampm] = timeMatch;
					let hour24 = parseInt(hours);
					
					// Convert to 24-hour format
					if (ampm.toUpperCase() === 'PM' && hour24 < 12) {
						hour24 += 12; // Convert PM to 24-hour (e.g., 2:30 PM -> 14:30)
					} else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
						hour24 = 0; // Convert 12 AM to 00:00
					}
					
					// Extract just the date part (YYYY-MM-DD) from the due_date
					// The due_date might be a full ISO timestamp, so we need to get just the date portion
					let dateStr = formData.due_date;
					if (dateStr.includes('T')) {
						// If it's a full timestamp, extract just the date part
						dateStr = dateStr.split('T')[0];
					}
					
					// Create the combined datetime using 24-hour format
					const dateTime = new Date(`${dateStr}T${hour24.toString().padStart(2, '0')}:${minutes}:00`);
					
					// Validate the combined datetime
					if (isNaN(dateTime.getTime())) {
						console.error('Date combination failed:', {
							due_date: formData.due_date,
							dateStr,
							hour24,
							minutes,
							combined: `${dateStr}T${hour24.toString().padStart(2, '0')}:${minutes}:00`
						});
						throw new Error('Invalid date and time combination');
					}

					reminderTime = dateTime.toISOString();
				} catch (error) {
					console.error('Error combining date and time:', error);
					setErrors({
						reminder_time: `Error processing date/time: ${error instanceof Error ? error.message : 'Unknown error'}`
					});
					setLoading(false);
					return;
				}
			} else if (formData.reminder_time) {
				// If only time is provided, use today's date
				try {
					// Validate the time string (12-hour format with AM/PM)
					const timeMatch = formData.reminder_time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
					if (!timeMatch) {
						throw new Error('Invalid time format. Use 12-hour format (e.g., 2:30 PM)');
					}

					// Parse the 12-hour time and convert to 24-hour for the datetime
					const [, hours, minutes, ampm] = timeMatch;
					let hour24 = parseInt(hours);
					
					// Convert to 24-hour format
					if (ampm.toUpperCase() === 'PM' && hour24 < 12) {
						hour24 += 12; // Convert PM to 24-hour (e.g., 2:30 PM -> 14:30)
					} else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
						hour24 = 0; // Convert 12 AM to 00:00
					}
					
					const today = new Date().toISOString().split('T')[0];
					const dateTime = new Date(`${today}T${hour24.toString().padStart(2, '0')}:${minutes}`);
					
					if (isNaN(dateTime.getTime())) {
						throw new Error('Invalid time format');
					}
					
					reminderTime = dateTime.toISOString();
				} catch (error) {
					console.error('Error processing time:', error);
					setErrors({
						reminder_time: `Error processing time: ${error instanceof Error ? error.message : 'Unknown error'}`
					});
					setLoading(false);
					return;
				}
			}

			const taskData = { ...formData, reminder_time: reminderTime };
			const success = await onSubmit(taskData);
			if (success) {
				onCancel();
			}
		} catch (error) {
			console.error('Error submitting task:', error);
			setErrors({
				general: `Failed to submit task: ${error instanceof Error ? error.message : 'Unknown error'}`
			});
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: keyof TaskFormData, value: string | boolean) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		
		// Clear field-specific error when user starts typing
		if (errors[field as keyof FormErrors]) {
			setErrors(prev => ({ ...prev, [field]: undefined }));
		}
	};

	const handleLeadSelect = (lead: LeadOption) => {
		setFormData(prev => ({ ...prev, lead_id: lead.id }));
		setSelectedLeadName(`${lead.name} - ${lead.company || 'No Company'} (${lead.stage})`);
		setShowLeadDropdown(false);
		setLeadSearchQuery('');
	};

	const handleLeadSearchChange = (query: string) => {
		setLeadSearchQuery(query);
		setShowLeadDropdown(true);
		
		// Only clear selected lead when user is actively searching for a new lead
		// Don't clear if this is just the initial load of existing lead data
		if (query && selectedLeadName && query !== selectedLeadName) {
			setSelectedLeadName('');
			setFormData(prev => ({ ...prev, lead_id: '' }));
		}
	};

	const getPriorityLabel = (priority: string) => {
		const labels = {
			low: 'Low',
			medium: 'Medium',
			high: 'High',
			urgent: 'Urgent'
		};
		return labels[priority as keyof typeof labels] || priority;
	};

	return (
		<Card className="w-full max-w-4xl mx-auto">
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>{mode === 'create' ? 'Create New Task' : 'Edit Task'}</span>
					<Button
						variant="ghost"
						size="sm"
						onClick={onCancel}
						className="h-8 w-8 p-0"
					>
						<X className="h-4 w-4" />
					</Button>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{/* General Error Display */}
				{errors.general && (
					<div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
						<div className="flex items-center space-x-2">
							<AlertCircle className="h-5 w-5 text-red-500" />
							<span className="text-sm font-medium text-red-800 dark:text-red-200">
								{errors.general}
							</span>
						</div>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Task Title */}
					<div className="space-y-2">
						<Input
							label="Task Title"
							value={formData.title}
							onChange={(e) => handleInputChange('title', e.target.value)}
							placeholder="e.g., Follow up with TechCorp about proposal"
							required
							error={!!errors.title}
							hint={errors.title}
						/>
					</div>

					{/* Task Description */}
					<div className="space-y-2">
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Description
						</label>
						<TextArea
							value={formData.description || ''}
							onChange={(value) => handleInputChange('description', value)}
							placeholder="Add details about what needs to be done..."
							rows={3}
						/>
					</div>

					{/* Task Type and Priority */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
								Task Type
							</label>
							<Select
								options={Object.entries(TASK_TYPES).map(([key, { label }]) => ({
									value: key,
									label: `${label}`
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
								id="task-due-date"
								label="Due Date"
								placeholder="Select due date"
								defaultDate={formData.due_date ? new Date(formData.due_date) : undefined}
								onChange={(selectedDates) => {
									if (selectedDates && selectedDates.length > 0) {
										const date = selectedDates[0];
										// Use local date formatting to avoid timezone issues
										const year = date.getFullYear();
										const month = String(date.getMonth() + 1).padStart(2, '0');
										const day = String(date.getDate()).padStart(2, '0');
										const formattedDate = `${year}-${month}-${day}`;
										console.log('DatePicker onChange:', { date, formattedDate, localDate: date.toLocaleDateString() });
										handleInputChange('due_date', formattedDate);
									}
								}}
							/>
							{errors.due_date && (
								<p className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
									<AlertCircle className="h-4 w-4" />
									<span>{errors.due_date}</span>
								</p>
							)}
						</div>

						<div className="space-y-2">
							<div className="space-y-2">
								<TimePicker
									label="Due Time (Optional)"
									value={formData.reminder_time}
									onChange={(time) => handleInputChange('reminder_time', time)}
									placeholder="Type any time (e.g., 2:30 PM) or use presets"
									selectedDate={formData.due_date}
								/>
								{/* Debug: Show what date is being passed to TimePicker */}
								{process.env.NODE_ENV === 'development' && (
									<div className="text-xs text-gray-400 mt-1">
										Debug: TimePicker selectedDate = {formData.due_date || 'undefined'}
									</div>
								)}
							</div>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								💡 Type any time in 12-hour format (e.g., 2:30 PM, 11:00 AM) or use presets.
							</p>
							{errors.reminder_time && (
								<p className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
									<AlertCircle className="h-4 w-4" />
									<span>{errors.reminder_time}</span>
								</p>
							)}
						</div>
					</div>

					{/* Lead Selection */}
					<div className="space-y-2">
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Related Lead (Optional)
						</label>
						<div className="relative" ref={dropdownRef}>
							{/* Lead Search Input */}
							<div className="relative">
								<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
								<input
									type="text"
									placeholder="Search for a lead..."
									value={leadSearchQuery || selectedLeadName}
									onChange={(e) => handleLeadSearchChange(e.target.value)}
									onFocus={() => {
										setShowLeadDropdown(true);
										// Show search query when focused, not selected lead name
										if (selectedLeadName && !leadSearchQuery) {
											setLeadSearchQuery(selectedLeadName);
										}
									}}
									className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
								/>
								<ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
							</div>

							{/* Selected Lead Display */}
							{selectedLeadName && (
								<div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
									<div className="flex items-center justify-between">
										<span className="text-sm text-blue-800 dark:text-blue-200">{selectedLeadName}</span>
										<button
											type="button"
											onClick={() => {
												setFormData(prev => ({ ...prev, lead_id: '' }));
												setSelectedLeadName('');
											}}
											className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
										>
											<X className="h-4 w-4" />
										</button>
									</div>
								</div>
							)}

							{/* Lead Dropdown */}
							{showLeadDropdown && filteredLeads.length > 0 && (
								<div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
									{filteredLeads.map((lead) => (
										<button
											key={lead.id}
											type="button"
											onClick={() => handleLeadSelect(lead)}
											className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
										>
											<div className="font-medium text-gray-900 dark:text-white">{lead.name}</div>
											<div className="text-sm text-gray-500 dark:text-gray-400">
												{lead.company || 'No Company'} • {lead.stage}
											</div>
										</button>
									))}
								</div>
							)}
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
						
						{formData.reminder_enabled && (
							<div className="ml-7 text-sm text-gray-600 dark:text-gray-400">
								You'll receive a notification when this task is due.
							</div>
						)}
					</div>

					{/* Form Actions */}
					<div className="flex justify-end space-x-3 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={onCancel}
							disabled={loading}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={loading || !formData.title || !formData.due_date}
						>
							{loading ? 'Saving...' : mode === 'create' ? 'Create Task' : 'Update Task'}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
};

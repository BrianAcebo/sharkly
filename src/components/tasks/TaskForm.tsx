import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import Input from '../form/input/InputField';
import TextArea from '../form/input/TextArea';
import Select from '../form/Select';
import Checkbox from '../form/input/Checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Task, TaskFormData, TASK_TYPES, PRIORITY_COLORS, ReminderOption } from '../../types/tasks';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';
import { X, Search, ChevronDown, AlertCircle } from 'lucide-react';
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

export const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, onCancel, initialData, mode }) => {
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
		reminder_time: '',
		reminders: []
	});

	// Memoized function to convert due_date string to Date object for DatePicker
	const defaultDateForPicker = React.useMemo(() => {
		if (!formData.due_date || formData.due_date.trim() === '') return undefined;

		try {
			// Create date in local timezone to avoid off-by-one errors
			const [year, month, day] = formData.due_date.split('-').map(Number);

			// Validate that we have valid numbers
			if (isNaN(year) || isNaN(month) || isNaN(day)) {
				console.warn('defaultDateForPicker: Invalid date format:', formData.due_date);
				return undefined;
			}

			// Create date using the user's local timezone to avoid any timezone conversion issues
			// We'll use the Date constructor with local time components to ensure it stays in local timezone
			const date = new Date(year, month - 1, day, 12, 0, 0, 0); // month is 0-indexed, noon local time

			// Check if the date is valid
			if (isNaN(date.getTime())) {
				console.error('defaultDateForPicker: Invalid date object created:', date);
				return undefined;
			}

			return date;
		} catch (error) {
			console.error('defaultDateForPicker: Error processing date:', error);
			return undefined;
		}
	}, [formData.due_date]);

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
			const filtered = leads.filter(
				(lead) =>
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
			// Format the reminder_time properly for editing
			let reminderTime = initialData.reminder_time || '';

			if (reminderTime && reminderTime.includes('T')) {
				// If reminder_time is a full timestamp, extract just the time part and convert to 12-hour format
				try {
					const date = new Date(reminderTime);
					if (isNaN(date.getTime())) {
						console.error('Invalid reminder time in initial data:', reminderTime);
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

			// Validate and clean the due_date if it exists
			let dueDate = initialData.due_date || '';
			if (dueDate) {
				try {
					// If it's already in YYYY-MM-DD format, use it directly
					if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
						console.log('due_date already in correct format:', dueDate);
					} else {
						// Check if it's a valid date string and convert to YYYY-MM-DD
						// CRITICAL: Parse the date string directly to avoid ANY timezone conversion
						if (dueDate.includes('T')) {
							// It's a timestamp like "2025-08-15T18:22:00.000Z"
							// Extract the date part BEFORE creating a Date object
							const datePart = dueDate.split('T')[0]; // "2025-08-15"
							const [year, month, day] = datePart.split('-').map(Number);

							if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
								// Validate the date components
								const testDate = new Date(year, month - 1, day);
								if (!isNaN(testDate.getTime())) {
									dueDate = datePart; // Use the extracted date string directly
									console.log('due_date extracted from timestamp:', {
										original: initialData.due_date,
										extracted: datePart,
										year,
										month,
										day,
										timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
									});
								} else {
									console.warn('Invalid date components extracted:', { year, month, day });
									dueDate = '';
								}
							} else {
								console.warn('Failed to parse date components from timestamp:', dueDate);
								dueDate = '';
							}
						} else {
							// It's already in YYYY-MM-DD format, validate it
							const testDate = new Date(dueDate);
							if (isNaN(testDate.getTime())) {
								console.warn('Invalid due_date format:', dueDate);
								dueDate = '';
							} else {
								console.log('due_date already in correct format:', dueDate);
							}
						}
					}
				} catch (error) {
					console.error('Error parsing due_date:', error);
					dueDate = '';
				}
			}

			setFormData((prev) => ({
				...prev,
				...initialData,
				reminder_time: reminderTime,
				due_date: dueDate
			}));


			// Set the selected lead name if editing a task with a lead
			if (initialData.lead_id) {
				// If lead_name exists, use it directly
				if ((initialData as Partial<Task>).lead_name) {
					setSelectedLeadName((initialData as Partial<Task>).lead_name!);
					setLeadSearchQuery((initialData as Partial<Task>).lead_name!);
				} else {
					// If lead_name is missing, fetch it from the database
					fetchLeadName(initialData.lead_id);
				}
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
				// Get today's date in local timezone without timezone conversion
				const today = new Date();
				const todayLocalString = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format in local timezone



				if (formData.due_date < todayLocalString) {
					newErrors.due_date = 'Due date cannot be in the past';
				}
			}
		}

		// Reminder time validation
		if (formData.reminder_enabled) {
			if (!formData.reminder_time || formData.reminder_time.trim() === '') {
				newErrors.reminder_time = 'Reminder time is required when reminders are enabled';
			} else {
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

						// Validate hours and minutes
						if (isNaN(hour24) || hour24 < 0 || hour24 > 12) {
							newErrors.reminder_time = 'Invalid hour value';
						} else {
							const minuteValue = parseInt(minutes);
							if (isNaN(minuteValue) || minuteValue < 0 || minuteValue > 59) {
								newErrors.reminder_time = 'Invalid minute value';
							} else {
								// Convert to 24-hour format
								if (ampm.toUpperCase() === 'PM' && hour24 < 12) {
									hour24 += 12; // PM times
								} else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
									hour24 = 0; // 12 AM to 00:00
								}

								// Create the full datetime for comparison
								const reminderDateTime = new Date(
									`${formData.due_date}T${hour24.toString().padStart(2, '0')}:${minuteValue}:00`
								);

								// Check if the datetime is valid
								if (isNaN(reminderDateTime.getTime())) {
									newErrors.reminder_time = 'Invalid date and time combination';
								} else {
									const now = new Date();
									// Allow a 5-minute buffer to avoid cutting off valid times
									const bufferTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

									if (reminderDateTime <= bufferTime) {
										newErrors.reminder_time =
											'Reminder time must be at least 5 minutes in the future';
									}
								}
							}
						}
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
			let reminderTime: string | undefined = formData.reminder_time;

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

					// Validate hours and minutes (1-12 is valid for 12-hour format)
					if (isNaN(hour24) || hour24 < 1 || hour24 > 12) {
						throw new Error('Invalid hour value. Hours must be 1-12');
					}

					const minuteValue = parseInt(minutes);
					if (isNaN(minuteValue) || minuteValue < 0 || minuteValue > 59) {
						throw new Error('Invalid minute value');
					}

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
					const datetimeString = `${dateStr}T${hour24.toString().padStart(2, '0')}:${minuteValue}:00`;
					
					console.log('🔍 Debug Info:');
					console.log('  - Date string:', dateStr);
					console.log('  - Time string:', formData.reminder_time);
					console.log('  - Hour (24h):', hour24);
					console.log('  - Minute:', minuteValue);
					console.log('  - Combined datetime string:', datetimeString);
					
					// Create the date object and ensure it's valid
					const dateTime = new Date(datetimeString);
					
					console.log('  - Created Date object:', dateTime);
					console.log('  - Date is valid:', !isNaN(dateTime.getTime()));
					console.log('  - Date toString():', dateTime.toString());
					console.log('  - Date toISOString():', dateTime.toISOString());
					
					// Validate the combined datetime
					if (isNaN(dateTime.getTime())) {
						throw new Error('Invalid date and time combination');
					}

					// Check if the datetime is in the past (with a 5-minute buffer)
					const now = new Date();
					const bufferTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minute buffer
					
					console.log('  - Current time:', now.toString());
					console.log('  - Buffer time:', bufferTime.toString());
					console.log('  - Reminder time:', dateTime.toString());
					console.log('  - Is reminder <= buffer?', dateTime <= bufferTime);
					console.log('  - Time difference (ms):', dateTime.getTime() - bufferTime.getTime());
					
					if (dateTime <= bufferTime) {
						throw new Error('Reminder time must be at least 5 minutes in the future');
					}

					reminderTime = dateTime.toISOString();
					console.log('  - Final reminder time:', reminderTime);
					console.log('🔍 End Debug Info');
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

					// Validate hours and minutes (1-12 is valid for 12-hour format)
					if (isNaN(hour24) || hour24 < 1 || hour24 > 12) {
						throw new Error('Invalid hour value. Hours must be 1-12');
					}

					const minuteValue = parseInt(minutes);
					if (isNaN(minuteValue) || minuteValue < 0 || minuteValue > 59) {
						throw new Error('Invalid minute value');
					}

					// Convert to 24-hour format
					if (ampm.toUpperCase() === 'PM' && hour24 < 12) {
						hour24 += 12; // Convert PM to 24-hour (e.g., 2:30 PM -> 14:30)
					} else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
						hour24 = 0; // Convert 12 AM to 00:00
					}

					const today = new Date().toISOString().split('T')[0];
					const dateTime = new Date(
						`${today}T${hour24.toString().padStart(2, '0')}:${minuteValue}`
					);

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

			// Extract reminders data before sending to Supabase (since reminders column doesn't exist in tasks table)
			const { reminders, ...taskDataWithoutReminders } = formData;
			
			// Create the task data for Supabase (without the reminders field)
			const taskDataForSupabase = { ...taskDataWithoutReminders, reminder_time: reminderTime };
			
			// Create the task first (without the reminders field)
			// Note: onSubmit expects TaskFormData but we need to send data without reminders to Supabase
			const success = await onSubmit(taskDataForSupabase as TaskFormData);
			
			// If task was created successfully and reminders are enabled, create reminder records
			if (success && formData.reminder_enabled && reminders.length > 0 && reminderTime) {
				try {
					// Calculate reminder times based on user selections
					const reminderTimes = reminders.map(reminder => {
						if (reminder.type === 'custom' && reminder.customTime) {
							// For custom times, use the exact time specified
							return reminder.customTime;
						} else {
							// For preset reminders, calculate the time before the due time
							const dueDateTime = new Date(reminderTime);
							switch (reminder.type) {
								case '5min':
									return new Date(dueDateTime.getTime() - 5 * 60 * 1000);
								case '10min':
									return new Date(dueDateTime.getTime() - 10 * 60 * 1000);
								case '15min':
									return new Date(dueDateTime.getTime() - 15 * 60 * 1000);
								case '30min':
									return new Date(dueDateTime.getTime() - 30 * 60 * 1000);
								case '1hr':
									return new Date(dueDateTime.getTime() - 60 * 60 * 1000);
								case '1day':
									return new Date(dueDateTime.getTime() - 24 * 60 * 60 * 1000);
								default:
									return dueDateTime;
							}
						}
					}).filter((time): time is Date | string => time !== undefined); // Type guard to filter out undefined
					
					// Create reminder records in task_reminders table
					// Note: This would need to be handled in the backend or useTasks hook
					console.log('Reminders to create:', reminderTimes);
				} catch (error) {
					console.error('Error processing reminders:', error);
				}
			}
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
		setFormData((prev) => ({ ...prev, [field]: value }));

		// Clear field-specific error when user starts typing
		if (errors[field as keyof FormErrors]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	// Handle quick reminder selection
	const handleQuickReminder = (option: string) => {
		const newReminder: ReminderOption = { type: option as ReminderOption['type'] };
		setFormData(prev => ({
			...prev,
			reminders: [...prev.reminders, newReminder]
		}));
	};

	// Handle reminder changes
	const handleReminderChange = (index: number, field: keyof ReminderOption, value: string) => {
		setFormData(prev => ({
			...prev,
			reminders: prev.reminders.map((reminder, i) => 
				i === index ? { ...reminder, [field]: value } : reminder
			)
		}));
	};

	// Add new reminder
	const addReminder = () => {
		const newReminder: ReminderOption = { type: '15min' };
		setFormData(prev => ({
			...prev,
			reminders: [...prev.reminders, newReminder]
		}));
	};

	// Remove reminder
	const removeReminder = (index: number) => {
		setFormData(prev => ({
			...prev,
			reminders: prev.reminders.filter((_, i) => i !== index)
		}));
	};





	const handleLeadSelect = (lead: LeadOption) => {
		setFormData((prev) => ({ ...prev, lead_id: lead.id }));
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
			setFormData((prev) => ({ ...prev, lead_id: '' }));
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
		<Card className="mx-auto w-full max-w-4xl">
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>{mode === 'create' ? 'Create New Task' : 'Edit Task'}</span>
					<Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0">
						<X className="h-4 w-4" />
					</Button>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{/* General Error Display */}
				{errors.general && (
					<div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
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
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<DatePicker
								id="task-due-date"
								label="Due Date"
								placeholder="Select due date"
								defaultDate={defaultDateForPicker}
								onChange={(selectedDates) => {
									if (selectedDates && selectedDates.length > 0) {
										const date = selectedDates[0];

										// Create date string using the user's local timezone
										// This ensures we get the exact date they selected in their timezone
										const localYear = date.getFullYear();
										const localMonth = date.getMonth() + 1; // getMonth() is 0-indexed
										const localDay = date.getDate();
										const manualDateString = `${localYear}-${String(localMonth).padStart(2, '0')}-${String(localDay).padStart(2, '0')}`;

										// Use the manual date string to ensure correct timezone handling
										handleInputChange('due_date', manualDateString);
									}
								}}
							/>
							{errors.due_date && (
								<p className="flex items-center space-x-1 text-sm text-red-600 dark:text-red-400">
									<AlertCircle className="h-4 w-4" />
									<span>{errors.due_date}</span>
								</p>
							)}
						</div>

						<div className="space-y-2">
							<TimePicker
								label="Due Time (Optional)"
								value={formData.reminder_time}
								onChange={(time) => handleInputChange('reminder_time', time)}
								placeholder="Type any time (e.g., 2:30 PM) or use presets"
								selectedDate={formData.due_date}
							/>
							{errors.reminder_time && (
								<p className="flex items-center space-x-1 text-sm text-red-600 dark:text-red-400">
									<AlertCircle className="h-4 w-4" />
									<span>{errors.reminder_time}</span>
								</p>
							)}
                            {/* Timezone Selection */}
                            <div className="space-y-2 mt-5">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Timezone
                                </label>
                                <select
                                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                    defaultValue="auto"
                                >
                                    <option value="auto">
                                        Auto-detect ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                                    </option>
                                    <option value="America/New_York">Eastern Time (ET)</option>
                                    <option value="America/Chicago">Central Time (CT)</option>
                                    <option value="America/Denver">Mountain Time (MT)</option>
                                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                    <option value="Europe/London">London (GMT/BST)</option>
                                    <option value="Europe/Paris">Paris (CET/CEST)</option>
                                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                                    <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                                </select>
                            </div>
						</div>
					</div>

					{/* Enhanced Reminder Settings */}
					<div className="space-y-4">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="reminder-enabled"
								checked={formData.reminder_enabled}
								onChange={(checked) => handleInputChange('reminder_enabled', checked)}
							/>
							<label htmlFor="reminder-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
								Enable Smart Reminders
							</label>
						</div>

						{formData.reminder_enabled && (
							<div className="ml-6 space-y-4">
								{/* Quick Reminder Options */}
								<div className="space-y-3">
									<label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3 block">
										Quick Options
									</label>
									<div className="flex flex-wrap gap-2">
										{['5min', '10min', '15min', '30min', '1hr', '1day'].map((option) => (
											<button
												key={option}
												type="button"
												onClick={() => handleQuickReminder(option)}
												className="px-3 py-1 text-xs rounded-full border border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
											>
												{option}
											</button>
										))}
									</div>
								</div>

								{/* Multiple Reminders */}
								<div className="space-y-3">
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
										Multiple Reminders
									</label>
									<div className="space-y-2">
										{formData.reminders.map((reminder, index) => (
											<div key={index} className="flex items-center space-x-2">
												<select
													value={reminder.type}
													onChange={(e) => handleReminderChange(index, 'type', e.target.value)}
													className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
												>
													<option value="5min">5 minutes before</option>
													<option value="10min">10 minutes before</option>
													<option value="15min">15 minutes before</option>
													<option value="30min">30 minutes before</option>
													<option value="1hr">1 hour before</option>
													<option value="1day">1 day before</option>
													<option value="custom">Custom time</option>
												</select>
												{reminder.type === 'custom' && (
													<TimePicker
														label=""
														value={reminder.customTime}
														onChange={(time) => handleReminderChange(index, 'customTime', time)}
														placeholder="Custom time"
														selectedDate={formData.due_date}
													/>
												)}
												<button
													type="button"
													onClick={() => removeReminder(index)}
													className="text-red-500 hover:text-red-700"
												>
													<X className="h-4 w-4" />
												</button>
											</div>
										))}
										<button
											type="button"
											onClick={addReminder}
											className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
										>
											+ Add another reminder
										</button>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Lead Selection */}
					<div className="space-y-2">
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Related Lead (Optional)
						</label>
						<div className="relative" ref={dropdownRef}>
							{/* Lead Search Input */}
							<div className="relative">
								<Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
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
									className="focus:ring-brand-500 focus:border-brand-500 w-full rounded-md border border-gray-300 py-2 pr-10 pl-10 shadow-sm focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
								/>
								<ChevronDown className="absolute top-2.5 right-3 h-4 w-4 text-gray-400" />
							</div>

							{/* Selected Lead Display */}
							{selectedLeadName && (
								<div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-900/20">
									<div className="flex items-center justify-between">
										<span className="text-sm text-blue-800 dark:text-blue-200">
											{selectedLeadName}
										</span>
										<button
											type="button"
											onClick={() => {
												setFormData((prev) => ({ ...prev, lead_id: '' }));
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
								<div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
									{filteredLeads.map((lead) => (
										<button
											key={lead.id}
											type="button"
											onClick={() => handleLeadSelect(lead)}
											className="w-full border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
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



					{/* Form Actions */}
					<div className="flex justify-end space-x-3 pt-4">
						<Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading || !formData.title || !formData.due_date}>
							{loading ? 'Saving...' : mode === 'create' ? 'Create Task' : 'Update Task'}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
};

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
import { toast } from 'sonner';

import { createTaskWithReminders, updateTaskWithReminders } from '../../api/tasks';

// Simple interface for leads dropdown
interface LeadOption {
	id: string;
	name: string;
	company: string | null;
	stage: string;
}

interface TaskFormProps {
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

export const TaskForm: React.FC<TaskFormProps> = ({ onCancel, initialData, mode }) => {
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

	// Function to fetch existing reminders for a task
	const fetchExistingReminders = async (taskId: string, dueDate: string) => {
		if (!taskId || !dueDate) return;
		
		try {
			console.log('🔍 Fetching reminders for task:', taskId, 'with due date:', dueDate);
			
			const { data, error } = await supabase
				.from('task_reminders')
				.select('reminder_time, notification_type')
				.eq('task_id', taskId)
				.eq('status', 'pending');

			if (error) throw error;

			if (data && data.length > 0) {
				console.log('📅 Found reminder data:', data);
				
				// Calculate offsets from reminder times
				const dueTime = new Date(dueDate + 'T12:00:00'); // Use noon to avoid timezone issues
				const reminderOffsets: ReminderOption[] = [];

				data.forEach(reminder => {
					const reminderTime = new Date(reminder.reminder_time);
					const offsetMs = dueTime.getTime() - reminderTime.getTime();
					const offsetMinutes = Math.round(offsetMs / (1000 * 60));

					console.log('⏰ Reminder time:', reminder.reminder_time, 'Offset minutes:', offsetMinutes);

					// Map offset to reminder type
					if (offsetMinutes === 5) {
						reminderOffsets.push({ type: '5min' });
					} else if (offsetMinutes === 10) {
						reminderOffsets.push({ type: '10min' });
					} else if (offsetMinutes === 15) {
						reminderOffsets.push({ type: '15min' });
					} else if (offsetMinutes === 30) {
						reminderOffsets.push({ type: '30min' });
					} else if (offsetMinutes === 60) {
						reminderOffsets.push({ type: '1hr' });
					} else if (offsetMinutes === 1440) {
						reminderOffsets.push({ type: '1day' });
					} else {
						// Custom time
						reminderOffsets.push({ 
							type: 'custom', 
							customTime: reminder.reminder_time 
						});
					}
				});

				// Update form with existing reminders
				setFormData(prev => ({
					...prev,
					reminder_enabled: true,
					reminders: reminderOffsets
				}));

				console.log('✅ Loaded existing reminders:', reminderOffsets);
			} else {
				console.log('ℹ️ No existing reminders found for task:', taskId);
			}
		} catch (error) {
			console.error('Error fetching existing reminders:', error);
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

	// Check if the selected date is in the past
	const isDateInPast = React.useMemo(() => {
		if (!formData.due_date || formData.due_date.trim() === '') return false;
		
		try {
			const [year, month, day] = formData.due_date.split('-').map(Number);
			if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
			
			const selectedDate = new Date(year, month - 1, day);
			const today = new Date();
			const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
			
			return selectedDate < todayStart;
		} catch {
			return false;
		}
	}, [formData.due_date]);

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

			console.log('defaultDateForPicker: Created date object:', {
				input: formData.due_date,
				year,
				month: month - 1,
				day,
				result: date,
				resultString: date.toString()
			});

			return date;
		} catch (error) {
			console.error('defaultDateForPicker: Error processing date:', error);
			return undefined;
		}
	}, [formData.due_date]);

	// Populate form with initialData when editing
	useEffect(() => {
		if (initialData && mode === 'edit') {
			console.log('🔄 Populating form with initial data:', initialData);
			
			// Convert Task object to TaskFormData if needed
			const taskData = initialData as Partial<TaskFormData> & Partial<Task>;
			
			// Extract due date and time from the existing task
			const dueDate = taskData.due_date ? taskData.due_date.split('T')[0] : '';
			let reminderTime = '';
			
			// Extract time from the existing due_date if it exists
			if (taskData.due_date && taskData.due_date.includes('T')) {
				const fullDateTime = new Date(taskData.due_date);
				if (!isNaN(fullDateTime.getTime())) {
					// Convert to 12-hour format for the time picker
					const hours = fullDateTime.getHours();
					const minutes = fullDateTime.getMinutes();
					const ampm = hours >= 12 ? 'PM' : 'AM';
					const hour12 = hours % 12 || 12;
					reminderTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
					console.log('⏰ Extracted existing time:', reminderTime, 'from:', taskData.due_date);
				}
			}
			
			setFormData({
				title: taskData.title || '',
				description: taskData.description || '',
				due_date: dueDate,
				priority: taskData.priority || 'medium',
				type: taskData.type || 'follow_up',
				lead_id: taskData.lead_id || '',
				reminder_enabled: false, // Will be populated from reminders
				reminder_time: reminderTime, // Use extracted time or empty string
				reminders: [] // Will be populated from reminders
			});

			// Set lead name if lead_id exists
			if (taskData.lead_id) {
				setLeadSearchQuery(taskData.lead_id);
				fetchLeadName(taskData.lead_id);
			}

			// Fetch existing reminders for this task with the due date
			if (taskData.id && dueDate) {
				fetchExistingReminders(taskData.id, dueDate);
			}
		}
	}, [initialData, mode]);

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
		const setupInitialData = async () => {
			if (initialData) {
			    console.log('🔄 Setting initial data for editing:', initialData);
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

                console.log('Setting form data for editing:', {
                    originalInitialData: initialData,
                    processedDueDate: dueDate,
                    processedReminderTime: reminderTime
                });

                // Set the form data
                setFormData((prev) => ({
                    ...prev,
                    ...initialData,
                    reminder_time: reminderTime,
                    due_date: dueDate
                }));
            }
		};
		
		setupInitialData();
	}, [initialData]);

	// Set the selected lead name if editing a task with a lead
	useEffect(() => {
		if (initialData && 'lead_id' in initialData && initialData.lead_id) {
			// If lead_name exists, use it directly
			if ((initialData as Partial<Task>).lead_name) {
				setSelectedLeadName((initialData as Partial<Task>).lead_name!);
				setLeadSearchQuery((initialData as Partial<Task>).lead_name!);
			} else {
				// If lead_name is missing, fetch it from the database
				fetchLeadName(initialData.lead_id);
			}
		}
	}, [initialData]);

	// Fetch existing reminders when editing a task
	useEffect(() => {
		if (initialData && 'id' in initialData && initialData.id) {
			const fetchExistingReminders = async () => {
				try {
					console.log('🔍 Fetching existing reminders for task:', initialData.id);
					
					const { data: reminders, error } = await supabase
						.from('task_reminders')
						.select('*')
						.eq('task_id', initialData.id)
						.eq('status', 'pending')
						.order('reminder_time', { ascending: true });

					if (error) {
						console.error('Error fetching existing reminders:', error);
						return;
					}

					if (reminders && reminders.length > 0) {
						console.log('📋 Found existing reminders:', reminders);
						
						// Convert database reminders to form format
						const formReminders: ReminderOption[] = [];
						
						for (const reminder of reminders) {
							const reminderTime = new Date(reminder.reminder_time);
							const dueTime = new Date(initialData.due_date + 'T' + initialData.reminder_time);
							
							// Calculate the difference to determine reminder type
							const diffMs = dueTime.getTime() - reminderTime.getTime();
							const diffMinutes = Math.round(diffMs / (1000 * 60));
							
							let reminderType: ReminderOption['type'];
							switch (diffMinutes) {
								case 5: reminderType = '5min'; break;
								case 10: reminderType = '10min'; break;
								case 15: reminderType = '15min'; break;
								case 30: reminderType = '30min'; break;
								case 60: reminderType = '1hr'; break;
								case 1440: reminderType = '1day'; break;
								default: reminderType = 'custom'; break;
							}
							
							if (reminderType === 'custom') {
								// For custom times, extract the time in 12-hour format
								const hours = reminderTime.getHours();
								const minutes = reminderTime.getMinutes();
								const ampm = hours >= 12 ? 'PM' : 'AM';
								const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
								const customTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
								
								formReminders.push({
									type: 'custom',
									customTime: customTime
								});
							} else {
								formReminders.push({ type: reminderType });
							}
						}
						
						// Update form data with existing reminders
						setFormData(prev => ({
							...prev,
							reminder_enabled: true,
							reminders: formReminders
						}));
						
						console.log('✅ Updated form with existing reminders:', formReminders);
					}
				} catch (error) {
					console.error('Error processing existing reminders:', error);
				}
			};
			
			fetchExistingReminders();
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

									// Only validate future times for new tasks, not when editing
									if (!initialData && reminderDateTime <= bufferTime) {
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
			let dueAtUtc: string | undefined;

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
					let dateStr = formData.due_date;
					if (dateStr.includes('T')) {
						dateStr = dateStr.split('T')[0];
					}

					// Create the combined datetime using 24-hour format
					const datetimeString = `${dateStr}T${hour24.toString().padStart(2, '0')}:${minuteValue}:00`;
					
					// Create the date object and ensure it's valid
					const dateTime = new Date(datetimeString);
					
					if (isNaN(dateTime.getTime())) {
						throw new Error('Invalid date and time combination. Please check your selection.');
					}

					// Check if the datetime is in the past (with a 5-minute buffer)
					const now = new Date();
					const bufferTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minute buffer
					
					// Only validate future times for new tasks, not when editing
					if (!initialData && dateTime <= bufferTime) {
						throw new Error('Due time must be at least 5 minutes in the future');
					}

					dueAtUtc = dateTime.toISOString();
					console.log('✅ Due time set to:', dueAtUtc);
				} catch (error) {
					console.error('Error combining date and time:', error);
					setErrors({
						reminder_time: `Error processing date/time: ${error instanceof Error ? error.message : 'Unknown error'}`
					});
					setLoading(false);
					return;
				}
			} else if (formData.due_date) {
				// If only date is provided, use end of day
				const dueDate = new Date(formData.due_date);
				dueDate.setHours(23, 59, 59, 999);
				dueAtUtc = dueDate.toISOString();
				console.log('✅ Due time set to end of day:', dueAtUtc);
			}

			if (!dueAtUtc) {
				setErrors({
					due_date: 'Please select a due date'
				});
				setLoading(false);
				return;
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

			// Clean up the data for the task
			const { ...taskDataWithoutReminders } = formData;
			
			const cleanedTaskData = {
				...taskDataWithoutReminders,
				lead_id: taskDataWithoutReminders.lead_id && taskDataWithoutReminders.lead_id.trim() !== '' 
					? taskDataWithoutReminders.lead_id 
					: null
			};

			if (mode === 'edit' && initialData) {
				// Update existing task
				const taskId = (initialData as Partial<Task>).id;
				
				if (!taskId) {
					throw new Error('Task ID is required for editing');
				}
				
				console.log('🔄 Updating task with reminders:', {
					taskId,
					taskData: cleanedTaskData,
					dueAtUtc,
					offsetsMinutes
				});

				const result = await updateTaskWithReminders({
					taskId,
					ownerId: user?.id || '',
					organizationId: user?.organization_id || '',
					title: cleanedTaskData.title,
					description: cleanedTaskData.description,
					dueAtUtc,
					offsetsMinutes,
					priority: cleanedTaskData.priority,
					type: cleanedTaskData.type
				});

				if (result.success) {
					console.log('✅ Task updated successfully with ID:', result.taskId);
					toast.success('Task updated successfully');
					
					// Close the modal
					setTimeout(() => {
						onCancel();
					}, 100);
				} else {
					throw new Error(result.error || 'Failed to update task');
				}
			} else {
				// Create new task
				console.log('🚀 Creating task with reminders:', {
					taskData: cleanedTaskData,
					dueAtUtc,
					offsetsMinutes
				});

				const result = await createTaskWithReminders({
					ownerId: user?.id || '',
					organizationId: user?.organization_id || '',
					title: cleanedTaskData.title,
					description: cleanedTaskData.description,
					dueAtUtc,
					offsetsMinutes,
					priority: cleanedTaskData.priority,
					type: cleanedTaskData.type
				});

				if (result.success) {
					console.log('✅ Task created successfully with ID:', result.taskId);
					toast.success('Task created successfully');
					
					// Close the modal
					setTimeout(() => {
						onCancel();
					}, 100);
				} else {
					throw new Error(result.error || 'Failed to create task');
				}
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
		const reminderType = option as ReminderOption['type'];
		
		// Check if this reminder type is already selected
		const isAlreadySelected = formData.reminders.some(reminder => reminder.type === reminderType);
		
		if (isAlreadySelected) {
			// Remove the reminder if it's already selected (toggle off)
			setFormData(prev => ({
				...prev,
				reminders: prev.reminders.filter(reminder => reminder.type !== reminderType)
			}));
		} else {
			// Add the reminder if it's not selected
			const newReminder: ReminderOption = { type: reminderType };
			setFormData(prev => ({
				...prev,
				reminders: [...prev.reminders, newReminder]
			}));
		}
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
								key={`date-picker-${initialData ? 'edit' : 'new'}-${formData.due_date || 'empty'}`}
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
										
										// Clear reminder time if the new date is in the past
										const newDate = new Date(manualDateString);
										const today = new Date();
										const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
										
										if (newDate < todayStart && formData.reminder_time) {
											handleInputChange('reminder_time', '');
										}
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
								placeholder={isDateInPast ? "Cannot set time for past dates" : "Type any time (e.g., 2:30 PM) or use presets"}
								selectedDate={formData.due_date}
								disabled={isDateInPast}
							/>
							{isDateInPast && (
								<p className="flex items-center space-x-1 text-sm text-red-600 dark:text-red-400">
									<AlertCircle className="h-4 w-4" />
									<span>Cannot set time for past dates</span>
								</p>
							)}
							{!isDateInPast && errors.reminder_time && (
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
								disabled={isDateInPast}
							/>
							<label htmlFor="reminder-enabled" className={`text-sm font-medium ${isDateInPast ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
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
										{['5min', '10min', '15min', '30min', '1hr', '1day'].map((option) => {
											const isSelected = formData.reminders.some(reminder => reminder.type === option);
											return (
												<button
													key={option}
													type="button"
													onClick={() => handleQuickReminder(option)}
													className={`px-3 py-1 text-xs rounded-full border transition-colors ${
														isSelected
															? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
															: 'border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
													}`}
												>
													{option}
												</button>
											);
										})}
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

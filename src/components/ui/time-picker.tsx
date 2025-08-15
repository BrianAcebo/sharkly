import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, X, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/common';
import { Button } from './button';
import Input from '../form/input/InputField';

export interface TimePickerProps {
	value?: string;
	onChange?: (time: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	label?: string;
	required?: boolean;
	error?: string;
	selectedDate?: string; // Add selectedDate prop to consider the date when filtering times
}

export const TimePicker: React.FC<TimePickerProps> = ({
	value = '',
	onChange,
	disabled = false,
	className,
	label,
	required = false,
	error,
	selectedDate
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedTime, setSelectedTime] = useState(value);
	const [searchQuery, setSearchQuery] = useState('');
	const [timeError, setTimeError] = useState<string>('');
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Generate time options in 15-minute intervals in 12-hour format
	const timeOptions = React.useMemo(() => {
		const times = [];
		for (let hour = 0; hour < 24; hour++) {
			for (let minute = 0; minute < 60; minute += 15) {
				const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
				const ampm = hour >= 12 ? 'PM' : 'AM';
				const timeString = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
				times.push(timeString);
				

			}
		}
		

		
		return times;
	}, []);

	// Get current time in 12-hour format
	const getCurrentTime = () => {
		const now = new Date();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		
		const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
		const ampm = hours >= 12 ? 'PM' : 'AM';
		return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
	};



	// Filter times based on search query and ensure they're not in the past
	const filteredTimes = React.useMemo(() => {
		// If no date selected, show all times
		if (!selectedDate || selectedDate.trim() === '') {
			return timeOptions;
		}
		
		// Filter times based on the selected date using simple datetime comparison
		const times = timeOptions.filter(time => {
			try {
				// Parse the selected date
				const [year, month, day] = selectedDate.split('-').map(Number);
				if (isNaN(year) || isNaN(month) || isNaN(day)) {
					return true; // If date parsing fails, show all times
				}
				
				// Parse 12-hour format time (e.g., "2:30 PM")
				const timeMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
				if (!timeMatch) return false;
				
				const [, hours, minutes, ampm] = timeMatch;
				let hour = parseInt(hours);
				const minute = parseInt(minutes);
				
				// Convert to 24-hour for comparison
				if (ampm.toUpperCase() === 'PM' && hour < 12) {
					hour += 12;
				} else if (ampm.toUpperCase() === 'AM' && hour === 12) {
					hour = 0;
				}
				
				// Create the selected datetime
				const selectedDateTime = new Date(year, month - 1, day, hour, minute);
				const now = new Date();
				
				// Simple logic: if date is in future, any time is valid
				// If date is today, time must be in future (with 1 minute buffer for user input)
				// If date is in past, nothing is valid
				const oneMinuteFromNow = new Date(now.getTime() + 60000); // Add 1 minute buffer
				return selectedDateTime > oneMinuteFromNow;
			} catch (error) {
				console.error('TimePicker: Error filtering time:', error);
				return true; // If error, show the time
			}
		});
		
		// If no search query, return filtered times
		if (!searchQuery) return times;
		
		// If search query looks like a time, show both AM and PM options if it's valid
		const timeMatch = searchQuery.match(/^(\d{1,2}):(\d{2})$/);
		
		if (timeMatch) {
			const [, hours, minutes] = timeMatch;
			const hour = parseInt(hours);
			const minute = parseInt(minutes);
			
			if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
				// Create both AM and PM options for the custom time
				const amTime = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${minute.toString().padStart(2, '0')} AM`;
				const pmTime = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${minute.toString().padStart(2, '0')} PM`;
				
				// Check if these times are valid for the selected date using simple datetime comparison
				let amValid = false;
				let pmValid = false;
				
				try {
					if (selectedDate && selectedDate.trim() !== '') {
						const [year, month, day] = selectedDate.split('-').map(Number);
						if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
							const now = new Date();
							
							// Check AM time
							const amDateTime = new Date(year, month - 1, day, hour, minute);
							amValid = amDateTime > now; // Remove 5-minute buffer for custom input
							
							// Check PM time
							const pmDateTime = new Date(year, month - 1, day, hour + 12, minute);
							pmValid = pmDateTime > now; // Remove 5-minute buffer for custom input
						}
					}
				} catch (error) {
					console.error('TimePicker: Error validating custom times:', error);
				}
				
				const customOptions = [];
				if (amValid) customOptions.push(amTime);
				if (pmValid) customOptions.push(pmTime);
				
				// Return custom options first, then filtered regular times
				return [
					...customOptions,
					...times.filter(time => 
						time.toLowerCase().includes(searchQuery.toLowerCase())
					)
				];
			}
		}
		
		return times.filter(time => 
			time.toLowerCase().includes(searchQuery.toLowerCase())
		);
	}, [timeOptions, searchQuery, selectedDate]);

	// Get available quick select times (only future times)
	const availableQuickSelectTimes = React.useMemo(() => {		
		// If no date selected, show all preset times
		if (!selectedDate || selectedDate.trim() === '') {
			return ['9:00 AM', '12:00 PM', '3:00 PM', '5:00 PM'];
		}
		
		return ['9:00 AM', '12:00 PM', '3:00 PM', '5:00 PM'].filter(preset => {
			try {
				// Parse the selected date
				const [year, month, day] = selectedDate.split('-').map(Number);
				if (isNaN(year) || isNaN(month) || isNaN(day)) {
					return true; // If date parsing fails, show all times
				}
				
				// Extract hour and AM/PM from 12-hour format
				const timeMatch = preset.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
				if (!timeMatch) return false;
				
				const [, hours, minutes, ampm] = timeMatch;
				let hour = parseInt(hours);
				const minute = parseInt(minutes);
				
				// Convert to 24-hour for comparison
				if (ampm.toUpperCase() === 'PM' && hour < 12) {
					hour += 12;
				} else if (ampm.toUpperCase() === 'AM' && hour === 12) {
					hour = 0;
				}
				
				// Create the selected datetime
				const selectedDateTime = new Date(year, month - 1, day, hour, minute);
				const now = new Date();
				
				// Simple logic: if date is in future, any time is valid
				// If date is today, time must be in future
				// If date is in past, nothing is valid
				return selectedDateTime > now;
			} catch (error) {
				console.error('TimePicker: Error filtering preset time:', error);
				return true; // If error, show the time
			}
		});
	}, [selectedDate]);

	// Handle click outside to close dropdown
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
				setSearchQuery('');
				setTimeError('');
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Update internal state when value prop changes
	useEffect(() => {
		setSelectedTime(value);
	}, [value]);

	const validateTime = (time: string): { isValid: boolean; error: string } => {
		// Simple validation: just check if it's a valid 12-hour time format
		const timeMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
		if (!timeMatch) {
			return { isValid: false, error: 'Invalid time format. Use 12-hour format (e.g., 6:04 PM)' };
		}
		
		// If we have a selected date, do the actual date/time comparison
		if (selectedDate && selectedDate.trim() !== '') {
			try {
				// Parse the selected date
				const [year, month, day] = selectedDate.split('-').map(Number);
				if (isNaN(year) || isNaN(month) || isNaN(day)) {
					return { isValid: false, error: 'Invalid date format' };
				}
				
				// Parse the time
				const [, hours, minutes, ampm] = timeMatch;
				let hour24 = parseInt(hours);
				const minute = parseInt(minutes);
				
				if (ampm.toUpperCase() === 'PM' && hour24 < 12) {
					hour24 += 12;
				} else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
					hour24 = 0;
				}
				
				// Create the selected datetime
				const selectedDateTime = new Date(year, month - 1, day, hour24, minute);
				const now = new Date();
				
				// Simple logic: if date is in future, any time is valid
				// If date is today, time must be in future (with 1 minute buffer for user input)
				// If date is in past, nothing is valid
				const oneMinuteFromNow = new Date(now.getTime() + 60000); // Add 1 minute buffer
				
				console.log('TimePicker validation:', {
					selectedDateTime: selectedDateTime.toLocaleString(),
					now: now.toLocaleString(),
					oneMinuteFromNow: oneMinuteFromNow.toLocaleString(),
					isValid: selectedDateTime > oneMinuteFromNow
				});
				
				if (selectedDateTime <= oneMinuteFromNow) {
					return {
						isValid: false,
						error: `Time must be at least 1 minute in the future`
					};
				}
				
				return { isValid: true, error: '' };
			} catch (error) {
				console.error('TimePicker: Error in validateTime:', error);
				return { isValid: false, error: 'Error validating time' };
			}
		}
		
		// If no date selected, just validate format
		return { isValid: true, error: '' };
	};

	const handleTimeSelect = (time: string) => {
		const validation = validateTime(time);
		
		if (!validation.isValid) {
			setTimeError(validation.error);
			return;
		}
		
		setSelectedTime(time);
		setIsOpen(false);
		setSearchQuery('');
		setTimeError('');
		onChange?.(time);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		setSelectedTime(inputValue);
		setSearchQuery(inputValue);
		setTimeError(''); // Clear error when user types
		
		// Check if this is a valid time format
		const timeMatch = inputValue.match(/^(\d{1,2}):(\d{1,2})$/);
		if (timeMatch) {
			const hours = parseInt(timeMatch[1]);
			const minutes = parseInt(timeMatch[2]);
			if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
				onChange?.(inputValue);
			}
		}
	};

	const handleInputBlur = () => {
		// When user finishes typing, validate and format the time
		if (selectedTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(selectedTime)) {
			// Try to parse and format the time
			const timeMatch = selectedTime.match(/^(\d{1,2}):(\d{1,2})$/);
			if (timeMatch) {
				const hours = parseInt(timeMatch[1]);
				const minutes = parseInt(timeMatch[2]);
				
				if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
					// Convert to 12-hour format with AM/PM
					let ampm = 'AM';
					let displayHours = hours;
					
					if (hours === 0) {
						displayHours = 12;
						ampm = 'AM';
					} else if (hours === 12) {
						ampm = 'PM';
					} else if (hours > 12) {
						displayHours = hours - 12;
						ampm = 'PM';
					}
					
					const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
					
					// Validate the formatted time
					const validation = validateTime(formattedTime);
					if (!validation.isValid) {
						// Try to suggest a valid time by adding 5 minutes
						if (selectedDate && selectedDate.trim() !== '') {
							try {
								const [year, month, day] = selectedDate.split('-').map(Number);
								if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
									const now = new Date();
									const oneMinuteFromNow = new Date(now.getTime() + 60000);
									
									// Create a time 1 minute from now
									const suggestedTime = new Date(oneMinuteFromNow);
									const suggestedHours = suggestedTime.getHours();
									const suggestedMinutes = suggestedTime.getMinutes();
									
									const suggestedDisplayHour = suggestedHours === 0 ? 12 : suggestedHours > 12 ? suggestedHours - 12 : suggestedHours;
									const suggestedAmpm = suggestedHours >= 12 ? 'PM' : 'AM';
									const suggestedTimeString = `${suggestedDisplayHour}:${suggestedMinutes.toString().padStart(2, '0')} ${suggestedAmpm}`;
									
									setTimeError(`Time must be at least 1 minute in the future. Try ${suggestedTimeString}`);
									return;
								}
							} catch (error) {
								console.error('Error suggesting time:', error);
							}
						}
						
						setTimeError(validation.error);
						return;
					}
					
					setSelectedTime(formattedTime);
					setTimeError('');
					onChange?.(formattedTime);
				}
			}
		}
	};

	const clearTime = () => {
		setSelectedTime('');
		setSearchQuery('');
		setTimeError('');
		onChange?.('');
	};

	const formatDisplayTime = (time: string) => {
		if (!time) return '';
		// All times are already in 12-hour format, just return as is
		return time;
	};

	// Memoized function to render the selected date information
	const renderSelectedDateInfo = React.useMemo(() => {
		
		
		if (!selectedDate || selectedDate.trim() === '') {
			return null;
		}

		try {
			// Parse the date string as local time to avoid timezone issues
			const [year, month, day] = selectedDate.split('-').map(Number);
			
			// Validate that we have valid numbers
			if (isNaN(year) || isNaN(month) || isNaN(day)) {
				console.error('renderSelectedDateInfo: Invalid date format:', selectedDate);
				return null;
			}
			
			const selectedDateObj = new Date(year, month - 1, day); // month is 0-indexed
			
			// Check if the date is valid
			if (isNaN(selectedDateObj.getTime())) {
				console.error('renderSelectedDateInfo: Invalid date object created:', selectedDateObj);
				return null;
			}
			
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			selectedDateObj.setHours(0, 0, 0, 0);
			
			let dateStatus = '';
			if (selectedDateObj.getTime() === today.getTime()) {
				dateStatus = ' (today - only future times)';
			} else if (selectedDateObj > today) {
				dateStatus = ' (future date - all times available)';
			} else {
				dateStatus = ' (past date - no times available)';
			}
			
			return (
				<span>
					• Selected date: {selectedDateObj.toLocaleDateString()}
					{dateStatus}
				</span>
			);
		} catch (error) {
			console.error('TimePicker: Error displaying selectedDate:', error);
			return null;
		}
	}, [selectedDate]);

	return (
		<div className={cn('w-full', className)}>
			{label && (
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					{label}
					{required && <span className="text-red-500 ml-1">*</span>}
				</label>
			)}
			
			<div className="relative" ref={dropdownRef}>
				{/* Time Input */}
				<div className="relative">
					<Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
					<Input
						type="text"
						value={selectedTime}
						onChange={handleInputChange}
						onFocus={() => setIsOpen(true)}
						onBlur={handleInputBlur}
						placeholder="Enter time (e.g., 2:30 PM)"
						disabled={disabled}
						className={cn(
							"w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white",
							"border-gray-300 dark:border-gray-600",
							disabled && "bg-gray-100 dark:bg-gray-800 cursor-not-allowed",
							(error || timeError) && "border-red-500 focus:border-red-500 focus:ring-red-500"
						)}
					/>
					
					{/* Clear button */}
					{selectedTime && (
						<button
							type="button"
							onClick={clearTime}
							className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
						>
							<X className="h-4 w-4" />
						</button>
					)}
					
					{/* Dropdown arrow */}
					<ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
				</div>

				{/* Time Display (formatted) */}
				{selectedTime && (
					<div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
						{formatDisplayTime(selectedTime)}
					</div>
				)}


				{/* Error Message */}
				{(error || timeError) && (
					<div className="mt-1 flex items-center text-xs text-red-600 dark:text-red-400">
						<AlertCircle className="h-3 w-3 mr-1" />
						{timeError || error}
					</div>
				)}

				{/* Dropdown */}
				{isOpen && (
					<div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto scrollbar-branded">
						{/* Search Input and Format Toggle */}
						<div className="p-3 border-b border-gray-200 dark:border-gray-700">
							<div className="mb-2">
								<Input
									type="text"
									placeholder="Type time (e.g., 2:30 PM)..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									autoFocus={true}
								/>
							</div>
							<div className="text-xs text-gray-500 dark:text-gray-400">
								⏰ Current time: {getCurrentTime()}
								{renderSelectedDateInfo}
							</div>
						</div>

						{/* Time Options - Fixed scrolling */}
						<div className="max-h-48 overflow-y-auto pb-5" style={{ maxHeight: '12rem' }}>
							{filteredTimes.length > 0 ? (
								filteredTimes.map((time) => {
									const isCustom = time === searchQuery && !timeOptions.includes(time);
									return (
										<button
											key={time}
											type="button"
											onClick={() => handleTimeSelect(time)}
											className={cn(
												"w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors",
												selectedTime === time && "bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300",
												isCustom && "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
											)}
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center space-x-2">
													<span className="text-sm font-medium">{time}</span>
													{isCustom && (
														<span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full">
															Custom
														</span>
													)}
												</div>
												<span className="text-xs text-gray-500 dark:text-gray-400">
													{formatDisplayTime(time)}
												</span>
											</div>
										</button>
									);
								})
							) : (
								<div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
									{searchQuery ? (
										<div>
											<p>No future times found for "{searchQuery}"</p>
											<p className="text-xs mt-1">Only future times are available. Current time: {getCurrentTime()}</p>
										</div>
									) : (
										"No future times available"
									)}
								</div>
							)}
							

						</div>

						{/* Quick Time Presets - Only show if there are available times */}
						{availableQuickSelectTimes.length > 0 && (
							<div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
								<div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Select (15-min intervals):</div>
								<div className="flex flex-wrap gap-2">
									{availableQuickSelectTimes.map((preset) => (
										<Button
											key={preset}
											variant="outline"
											size="sm"
											onClick={() => handleTimeSelect(preset)}
											className="text-xs h-7 px-2"
										>
											{formatDisplayTime(preset)}
										</Button>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

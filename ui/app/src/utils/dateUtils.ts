/**
 * Timezone-safe date utilities to avoid off-by-one date errors
 * when converting between UTC and local timezones
 */

/**
 * Safely formats a date string to display format without timezone conversion issues
 * @param dateString - Date string (can be YYYY-MM-DD or full ISO timestamp)
 * @param format - Display format ('short', 'long', 'month-day', 'full')
 * @returns Formatted date string
 */
export function formatDateSafe(dateString: string, format: 'short' | 'long' | 'month-day' | 'full' = 'short'): string {
  if (!dateString) return '';
  
  try {
    let date: Date;
    
    // If it's already in YYYY-MM-DD format, parse it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day, 12, 0, 0, 0); // Use noon to avoid timezone boundary issues
    } else if (dateString.includes('T')) {
      // It's a timestamp, extract just the date part to avoid timezone conversion
      const datePart = dateString.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      date = new Date(year, month - 1, day, 12, 0, 0, 0);
    } else {
      // Fallback to regular Date parsing
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid date';
    }
    
    // Format based on the requested format
    switch (format) {
      case 'short':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }); // "Aug 15"
        
      case 'month-day':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }); // "Aug 15"
        
      case 'long':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }); // "Aug 15, 2025"
        
      case 'full':
        return date.toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        }); // "Friday, August 15, 2025"
        
      default:
        return date.toLocaleDateString();
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Error';
  }
}

/**
 * Gets the current user's timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Checks if a date is today
 */
export function isToday(dateString: string): boolean {
  const today = new Date();
  const date = new Date(dateString);
  
  return date.toDateString() === today.toDateString();
}

/**
 * Checks if a date is overdue
 */
export function isOverdue(dateString: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(dateString);
  dueDate.setHours(0, 0, 0, 0);
  
  return dueDate < today;
}

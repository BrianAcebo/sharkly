// Simple error types for different scenarios
export class HttpError extends Error {
	statusCode: number;

	constructor(message: string, statusCode: number) {
		super(message);
		this.name = this.constructor.name;
		this.statusCode = statusCode;
		Object.setPrototypeOf(this, HttpError.prototype);
	}
}

export class ValidationError extends Error {
	field?: string;
	
	constructor(message: string, field?: string) {
		super(message);
		this.name = this.constructor.name;
		this.field = field;
		Object.setPrototypeOf(this, ValidationError.prototype);
	}
}

export class AuthenticationError extends Error {
	constructor(message: string = 'Authentication required') {
		super(message);
		this.name = this.constructor.name;
		Object.setPrototypeOf(this, AuthenticationError.prototype);
	}
}

export class AuthorizationError extends Error {
	constructor(message: string = 'Insufficient permissions') {
		super(message);
		this.name = this.constructor.name;
		Object.setPrototypeOf(this, AuthorizationError.prototype);
	}
}

export class DatabaseError extends Error {
	code?: string;
	
	constructor(message: string, code?: string) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		Object.setPrototypeOf(this, DatabaseError.prototype);
	}
}

// Simple Supabase error parser
export function parseSupabaseError(error: unknown): Error {
	console.error('Raw Supabase error:', error);
	
	if (!error) {
		return new Error('Unknown error occurred');
	}
	
	// Type guard for error objects with message property
	const hasMessage = (err: unknown): err is { message: string } => {
		return typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string';
	};
	
	if (!hasMessage(error)) {
		return new Error('Unknown error occurred');
	}
	
	// Handle Supabase auth errors
	if (error.message.includes('JWT')) {
		return new AuthenticationError('Session expired. Please sign in again.');
	}
	
	// Handle RLS policy errors
	if (error.message.includes('new row violates row-level security policy')) {
		return new AuthorizationError('You do not have permission to perform this action.');
	}
	
	// Handle infinite recursion in RLS policies
	if (error.message.includes('infinite recursion detected in policy')) {
		return new DatabaseError('Database policy configuration error. Please contact support.', 'RLS_RECURSION');
	}
	
	// Handle foreign key constraint errors
	if (error.message.includes('foreign key constraint')) {
		// Extract the field name from the error message
		// Example: "insert or update on table "leads" violates foreign key constraint "leads_assigned_to_fkey""
		const fieldMatch = error.message.match(/constraint "([^"]+)_([^"]+)_fkey"/);
		const fieldName = fieldMatch ? fieldMatch[2] : 'unknown';
		
		const fieldDisplayNames: Record<string, string> = {
			'assigned_to': 'Assigned To',
			'organization_id': 'Organization',
			'created_by': 'Created By',
			'updated_by': 'Updated By'
		};
		
		const displayName = fieldDisplayNames[fieldName] || fieldName;
		return new ValidationError(`Invalid ${displayName.toLowerCase()}. Please select a valid option.`, fieldName);
	}
	
	// Handle unique constraint errors
	if (error.message.includes('duplicate key value')) {
		// Extract the field name from the error message
		// Example: "duplicate key value violates unique constraint "leads_email_key""
		const fieldMatch = error.message.match(/constraint "([^"]+)_([^"]+)_key"/);
		const fieldName = fieldMatch ? fieldMatch[2] : 'unknown';
		
		const fieldDisplayNames: Record<string, string> = {
			'email': 'Email',
			'phone': 'Phone',
			'name': 'Name'
		};
		
		const displayName = fieldDisplayNames[fieldName] || fieldName;
		return new ValidationError(`This ${displayName.toLowerCase()} already exists.`, fieldName);
	}
	
	// Handle validation errors
	if (error.message.includes('null value in column')) {
		// Extract the field name from the error message
		// Example: "null value in column "created_by" of relation "leads" violates not-null constraint"
		const fieldMatch = error.message.match(/null value in column "([^"]+)"/);
		const fieldName = fieldMatch ? fieldMatch[1] : 'unknown';
		
		// Convert database field names to user-friendly names
		const fieldDisplayNames: Record<string, string> = {
			'created_by': 'Created By',
			'updated_by': 'Updated By',
			'organization_id': 'Organization',
			'name': 'Name',
			'email': 'Email',
			'phone': 'Phone',
			'company': 'Company',
			'title': 'Title',
			'value': 'Value',
			'stage': 'Stage',
			'status': 'Status',
			'priority': 'Priority',
			'description': 'Description',
			'notes': 'Notes',
			'source': 'Source',
			'assigned_to': 'Assigned To'
		};
		
		const displayName = fieldDisplayNames[fieldName] || fieldName;
		return new ValidationError(`Required field "${displayName}" is missing.`, fieldName);
	}
	
	// Handle check constraint errors
	if (error.message.includes('check constraint')) {
		// Extract the field name from the error message
		const fieldMatch = error.message.match(/check constraint "([^"]+)"/);
		const constraintName = fieldMatch ? fieldMatch[1] : 'unknown';
		
		// Map constraint names to user-friendly messages
		const constraintMessages: Record<string, string> = {
			'leads_stage_check': 'Invalid stage value. Please select a valid stage.',
			'leads_status_check': 'Invalid status value. Please select a valid status.',
			'leads_priority_check': 'Invalid priority value. Please select a valid priority.',
			'leads_value_check': 'Value must be a positive number.'
		};
		
		const message = constraintMessages[constraintName] || 'Invalid data provided.';
		return new ValidationError(message, constraintName);
	}
	
	// Handle data type errors
	if (error.message.includes('invalid input syntax')) {
		// Extract the field name from the error message
		// Example: "invalid input syntax for type integer: "abc""
		const fieldMatch = error.message.match(/for type (\w+): "([^"]+)"/);
		if (fieldMatch) {
			const dataType = fieldMatch[1];
			const invalidValue = fieldMatch[2];
			
			const typeDisplayNames: Record<string, string> = {
				'integer': 'number',
				'numeric': 'number',
				'decimal': 'number',
				'date': 'date',
				'timestamp': 'date and time',
				'boolean': 'true/false value'
			};
			
			const displayType = typeDisplayNames[dataType] || dataType;
			return new ValidationError(`Invalid ${displayType} format. Please enter a valid ${displayType}.`, 'data_type');
		}
		return new ValidationError('Invalid data format. Please check your input.', 'data_type');
	}
	
	// Handle network errors
	if (error.message.includes('fetch') || error.message.includes('network')) {
		return new HttpError('Network error. Please check your connection.', 0);
	}
	
	// Handle PGRST116 - no rows returned when expecting one
	if (error.message.includes('JSON object requested, multiple (or no) rows returned')) {
		// Check if details property exists and contains '0 rows'
		const hasDetails = (err: { message: string }): err is { message: string; details: string } => {
			return 'details' in err && typeof (err as { details: unknown }).details === 'string';
		};
		
		if (hasDetails(error) && error.details.includes('0 rows')) {
			return new DatabaseError('No matching record found. Please check your data and try again.', 'NO_ROWS_FOUND');
		}
		return new DatabaseError('Multiple records found when expecting one. Please contact support.', 'MULTIPLE_ROWS');
	}
	
	// Handle PGRST200 - foreign key relationship not found in schema cache
	if (error.message.includes('Could not find a relationship between')) {
		return new DatabaseError('Database schema configuration issue. Please contact support.', 'SCHEMA_CACHE_ERROR');
	}
	
	// Default case
	return new Error(error.message || 'Database operation failed');
}

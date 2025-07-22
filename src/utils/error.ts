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
		return new DatabaseError('Referenced record does not exist.', 'FOREIGN_KEY_VIOLATION');
	}
	
	// Handle unique constraint errors
	if (error.message.includes('duplicate key value')) {
		return new ValidationError('This record already exists.', 'DUPLICATE');
	}
	
	// Handle validation errors
	if (error.message.includes('null value in column')) {
		return new ValidationError('Required field is missing.', 'NULL_CONSTRAINT');
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

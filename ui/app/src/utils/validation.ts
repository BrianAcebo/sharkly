// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Password strength requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = {
	hasUpperCase: /[A-Z]/,
	hasLowerCase: /[a-z]/,
	hasNumber: /[0-9]/,
	hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/
};

export interface ValidationError {
	field: string;
	message: string;
}

export interface PasswordValidationResult {
	isValid: boolean;
	errors: string[];
}

export const validateEmail = (email: string): boolean => {
	return EMAIL_REGEX.test(email);
};

export const validatePassword = (password: string): PasswordValidationResult => {
	const errors: string[] = [];

	if (password.length < PASSWORD_MIN_LENGTH) {
		errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
	}
	if (!PASSWORD_REGEX.hasUpperCase.test(password)) {
		errors.push('Password must contain at least one uppercase letter');
	}
	if (!PASSWORD_REGEX.hasLowerCase.test(password)) {
		errors.push('Password must contain at least one lowercase letter');
	}
	if (!PASSWORD_REGEX.hasNumber.test(password)) {
		errors.push('Password must contain at least one number');
	}
	if (!PASSWORD_REGEX.hasSpecialChar.test(password)) {
		errors.push('Password must contain at least one special character');
	}

	return {
		isValid: errors.length === 0,
		errors
	};
};

/** Valid URL (http/https) - empty string is valid (optional field) */
export const validateUrl = (url: string): boolean => {
	if (!url.trim()) return true;
	try {
		const parsed = new URL(url.trim());
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
};

export const sanitizeInput = (input: string): string => {
	// Remove any HTML tags and special characters
	return input.replace(/[<>]/g, '');
};

// Rate limiting implementation
const submissionAttempts = new Map<string, { count: number; timestamp: number }>();
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds

export const checkRateLimit = (identifier: string): boolean => {
	const now = Date.now();
	const attempt = submissionAttempts.get(identifier);

	if (!attempt) {
		submissionAttempts.set(identifier, { count: 1, timestamp: now });
		return true;
	}

	if (now - attempt.timestamp > ATTEMPT_WINDOW) {
		submissionAttempts.set(identifier, { count: 1, timestamp: now });
		return true;
	}

	if (attempt.count >= MAX_ATTEMPTS) {
		return false;
	}

	attempt.count++;
	return true;
};

export const resetRateLimit = (identifier: string): void => {
	submissionAttempts.delete(identifier);
};

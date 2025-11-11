export function formatE164Input(value: string): string {
	// Keep only leading '+' and digits; cap to E.164 max (15 digits after '+')
	let v = (value ?? '').trim();
	if (v.length === 0) return '';
	// Remove all but digits and '+'
	v = v.replace(/[^\d+]/g, '');
	// Keep only first '+'
	v = v.replace(/(?!^)\+/g, '');
	// Ensure leading '+'
	if (!v.startsWith('+')) {
		v = `+${v.replace(/\+/g, '')}`;
	}
	// Only digits after '+'
	const digits = v.slice(1).replace(/\D/g, '');
	// E.164 allows up to 15 digits after '+'
	const capped = digits.slice(0, 15);
	return `+${capped}`;
}

export function isValidE164(value: string): boolean {
	// Simple validity: + followed by 7-15 digits (common practical bounds)
	return /^\+\d{7,15}$/.test((value ?? '').trim());
}

export function formatPhoneInput(value: string): string {
	// Formats as (123) 456-7890 while typing. Keeps only digits, max 10.
	const digits = (value ?? '').replace(/\D/g, '').slice(0, 10);
	const len = digits.length;
	if (len === 0) return '';
	if (len < 4) return `(${digits}`;
	if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
	return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatE164PhoneNumber(value: string): string {
	// Formats as +1 (123) 456-7890
	const digits = (value ?? '').replace(/\D/g, '').slice(0, 10);
	const len = digits.length;
	if (len === 0) return '';
	const area = value.startsWith('+') ? value.slice(0, 2) : null;
	if (area) return `${area} (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
	return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function isValidUS10Digits(value: string): boolean {
	const digits = (value ?? '').replace(/\D/g, '');
	return digits.length === 10;
}

export function usNationalToE164(value: string): string | null {
	// Converts (123) 456-7890 to +11234567890
	const digits = (value ?? '').replace(/\D/g, '');
	if (digits.length === 10) return `+1${digits}`;
	if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
	return null;
}



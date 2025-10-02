import z from 'zod';

const EMERGENCY_CODES = new Set(['911', '933', '112', '999', '000', '08', '110', '118']);

export function isEmergencyNumber(phone: string): boolean {
	const digits = phone.replace(/\D/g, '');
	if (!digits) return false;
	const variants = new Set<string>();
	variants.add(digits);
	if (digits.startsWith('1') && digits.length > 3) {
		variants.add(digits.slice(1));
	}
	if (digits.startsWith('0')) {
		variants.add(digits.replace(/^0+/, ''));
	}
	for (const candidate of variants) {
		if (EMERGENCY_CODES.has(candidate)) {
			return true;
		}
	}
	return false;
}

// Phone number normalization utility
export function normalizePhoneNumber(phone: string): string {
	// Remove all non-digit characters
	const digits = phone.replace(/\D/g, '');

	// If it's a US number without country code, add +1
	if (digits.length === 10) {
		return `+1${digits}`;
	}

	// If it already has country code, add +
	if (digits.length === 11 && digits.startsWith('1')) {
		return `+${digits}`;
	}

	// If it's already in E.164 format, return as is
	if (digits.startsWith('1') && digits.length === 11) {
		return `+${digits}`;
	}

	// Default: add +1 for US numbers
	return `+1${digits}`;
}

// Validation schema
export const makeCallSchema = z.object({
	to: z.string().min(1, 'Recipient phone number is required'),
	from: z.string().min(1, 'From phone number is required')
});

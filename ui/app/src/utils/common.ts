import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amountCents: number, currency: string = 'USD', fractionDigits = 2) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits
	}).format(amountCents / 100);
}

export function formatNumber(value: number, fractionDigits = 0) {
	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits
	}).format(value);
}

const EMERGENCY_CODES = new Set(['911', '933', '112', '999', '000', '08', '110', '118']);

export function isEmergencyNumber(input: string): boolean {
	if (!input) return false;
	const digits = input.replace(/\D/g, '');
	if (!digits) return false;
	const variants = new Set<string>();
	variants.add(digits);
	if (digits.startsWith('1') && digits.length > 3) {
		variants.add(digits.slice(1));
	}
	if (digits.startsWith('0')) {
		variants.add(digits.replace(/^0+/, ''));
	}
	for (const value of variants) {
		if (EMERGENCY_CODES.has(value)) {
			return true;
		}
	}
	return false;
}
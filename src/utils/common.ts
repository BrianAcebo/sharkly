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
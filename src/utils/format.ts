export const formatCurrency = (value: number, currency: string = 'USD') => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value / 100);
};

export const formatQuantity = (value: number) => {
	return new Intl.NumberFormat('en-US', {
		maximumFractionDigits: 0
	}).format(value);
};

export const formatPhoneNumber = (value: string | null | undefined) => {
	if (!value) return '';
	const digits = value.replace(/\D/g, '');

	if (digits.length === 0) return value;

	// Format US numbers by default
	if (digits.length === 10) {
		return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
	}

	if (digits.length === 11 && digits.startsWith('1')) {
		return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
	}

	return `+${digits}`;
};


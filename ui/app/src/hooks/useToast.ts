import { useState, useCallback } from 'react';

export type ToastAction = {
	label: string;
	onClick: () => void;
};

export type Toast = {
	id: string;
	title?: string;
	description?: string;
	action?: ToastAction;
	variant?: 'default' | 'destructive';
	duration?: number;
};

export function useToast() {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const dismissToast = useCallback((id: string) => {
		setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
	}, []);

	const toast = useCallback(
		({ title, description, action, variant = 'default', duration = 5000 }: Omit<Toast, 'id'>) => {
			const id = Math.random().toString(36).substring(2, 9);

			setToasts((prevToasts) => [
				...prevToasts,
				{ id, title, description, action, variant, duration }
			]);

			if (duration > 0) {
				setTimeout(() => {
					dismissToast(id);
				}, duration);
			}
		},
		[dismissToast]
	);

	return {
		toasts,
		toast,
		dismissToast
	};
}

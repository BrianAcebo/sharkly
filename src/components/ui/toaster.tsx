import { useToast, type Toast } from '../../hooks/useToast';
import {
	Toast as ToastComponent,
	ToastAction,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport
} from './toast';

export function Toaster() {
	const { toasts } = useToast();

	return (
		<ToastProvider>
			{toasts.map(function ({ id, title, description, action, ...props }: Toast) {
				return (
					<ToastComponent key={id} {...props}>
						<div className="grid gap-1">
							{title && <ToastTitle>{title}</ToastTitle>}
							{description && <ToastDescription>{description}</ToastDescription>}
						</div>
						{action && (
							<ToastAction altText={action.label} onClick={action.onClick}>
								{action.label}
							</ToastAction>
						)}
						<ToastClose />
					</ToastComponent>
				);
			})}
			<ToastViewport />
		</ToastProvider>
	);
}

import { ReactNode } from 'react';
import { cn } from '../../../utils';

interface ButtonProps {
	children?: ReactNode; // Button text or content (optional for icon-only buttons)
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; // Button size
	variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'flat' | 'danger' | 'success' | 'warning' | 'icon'; // Button variant
	startIcon?: ReactNode; // Icon before the text
	endIcon?: ReactNode; // Icon after the text
	onClick?: () => void; // Click handler
	disabled?: boolean; // Disabled state
	className?: string; // Additional classes
	type?: 'button' | 'submit' | 'reset'; // Button type
	fullWidth?: boolean; // Full width button
	loading?: boolean; // Loading state
	href?: string; // For link buttons
	target?: string; // For external links
}

const Button: React.FC<ButtonProps> = ({
	children,
	size = 'md',
	variant = 'primary',
	startIcon,
	endIcon,
	onClick,
	className = '',
	disabled = false,
	type = 'button',
	fullWidth = false,
	loading = false,
	href,
	target
}) => {
	// Size Classes
	const sizeClasses = {
		xs: 'px-2 py-1 text-xs',
		sm: 'px-3 py-2 text-sm',
		md: 'px-4 py-2.5 text-sm',
		lg: 'px-6 py-3 text-base',
		xl: 'px-8 py-4 text-lg font-semibold'
	};

	// Icon-only size classes
	const iconSizeClasses = {
		xs: 'p-1',
		sm: 'p-1.5',
		md: 'p-2',
		lg: 'p-2.5',
		xl: 'p-3'
	};

	// Variant Classes
	const variantClasses = {
		primary: 'bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 hover:scale-105 transition-all duration-200',
		secondary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 transition-colors duration-200',
		outline: 'border-2 border-gray-300 bg-transparent text-gray-700 hover:border-brand-500 hover:text-brand-500 dark:border-gray-600 dark:text-gray-300 dark:hover:border-brand-400 dark:hover:text-brand-400 transition-colors duration-200',
		ghost: 'bg-transparent text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors duration-200',
		flat: 'border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-300 transition-colors duration-200',
		danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 transition-colors duration-200',
		success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300 transition-colors duration-200',
		warning: 'bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-yellow-300 transition-colors duration-200',
		icon: 'bg-transparent text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors duration-200'
	};

	// Determine if this is an icon-only button
	const isIconOnly = variant === 'icon' || (!children && (startIcon || endIcon));

	// Base classes
	const baseClasses = cn(
		'inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-200',
		isIconOnly ? iconSizeClasses[size] : sizeClasses[size],
		variantClasses[variant],
		fullWidth ? 'w-full' : '',
		disabled || loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
		className
	);

	// Loading spinner component
	const LoadingSpinner = () => (
		<svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
			<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
			<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
	);

	// If href is provided, render as link
	if (href) {
		return (
			<a
				href={href}
				target={target}
				rel={target === '_blank' ? 'noopener noreferrer' : undefined}
				className={baseClasses}
				onClick={onClick}
			>
				{loading && <LoadingSpinner />}
				{!loading && startIcon && <span className="flex items-center">{startIcon}</span>}
				{children}
				{!loading && endIcon && <span className="flex items-center">{endIcon}</span>}
			</a>
		);
	}

	// Render as button
	return (
		<button
			className={baseClasses}
			onClick={onClick}
			disabled={disabled || loading}
			type={type}
		>
			{loading && <LoadingSpinner />}
			{!loading && startIcon && <span className="flex items-center">{startIcon}</span>}
			{children}
			{!loading && endIcon && <span className="flex items-center">{endIcon}</span>}
		</button>
	);
};

export default Button;

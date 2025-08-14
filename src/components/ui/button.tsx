import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/common';

const primaryClass = 'bg-gradient-to-r from-red-400 via-red-500 to-pink-500 text-white shadow-md hover:from-red-500 hover:via-red-600 hover:to-pink-600 disabled:from-red-300 disabled:via-red-400 disabled:to-pink-400 hover:scale-105 transition-all duration-200'

const buttonVariants = cva(
	'flex gap-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				default: primaryClass,
				destructive: 'bg-red-500 text-white hover:bg-red-600',
				outline: 'border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
				secondary: 'bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700',
				ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900',
				link: 'text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline',
				primary: primaryClass,
				flat: 'border border-gray-200 bg-white dark:border-gray-900 dark:bg-white/[0.03] text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-300 transition-colors duration-200',
				danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 transition-colors duration-200',
				success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300 transition-colors duration-200',
				warning: 'bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-yellow-300 transition-colors duration-200',
				icon: 'bg-transparent text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors duration-200'
			},
			size: {
				default: 'h-10 px-4 py-2',
				sm: 'h-9 rounded-md px-3',
				lg: 'h-11 rounded-md px-8',
				icon: 'h-10 w-10',
				// Additional sizes from form button
				xs: 'px-2 py-1 text-xs',
				md: 'px-4 py-2.5 text-sm',
				xl: 'px-8 py-4 text-lg font-semibold'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	startIcon?: React.ReactNode;
	endIcon?: React.ReactNode;
	loading?: boolean;
	fullWidth?: boolean;
	type?: 'button' | 'submit' | 'reset';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ 
		className, 
		variant, 
		size, 
		asChild = false, 
		startIcon, 
		endIcon, 
		children, 
		loading = false,
		fullWidth = false,
		disabled,
		type = 'button',
		...props 
	}, ref) => {
		const Comp = asChild ? Slot : 'button';
		
		// Loading spinner component
		const LoadingSpinner = () => (
			<svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
				<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
		);

		// Determine if this is an icon-only button
		const isIconOnly = variant === 'icon' || (!children && (startIcon || endIcon));

		// Icon-only size classes
		const iconSizeClasses = {
			xs: 'p-1',
			sm: 'p-1.5',
			default: 'p-2',
			md: 'p-2',
			lg: 'p-2.5',
			xl: 'p-3',
			icon: 'h-10 w-10'
		};

		const buttonClasses = cn(
			buttonVariants({ variant, size, className }),
			fullWidth ? 'w-full' : '',
			isIconOnly && variant !== 'icon' ? iconSizeClasses[size || 'default'] : '',
			loading ? 'cursor-not-allowed' : ''
		);

		return (
			<Comp 
				className={buttonClasses} 
				ref={ref} 
				disabled={disabled || loading}
				type={type}
				{...props}
			>
				{loading && <LoadingSpinner />}
				{!loading && startIcon && <span className="flex items-center">{startIcon}</span>}
				{children}
				{!loading && endIcon && <span className="flex items-center">{endIcon}</span>}
			</Comp>
		);
	}
);
Button.displayName = 'Button';

export { Button, buttonVariants };

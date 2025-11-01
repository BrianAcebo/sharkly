import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/common';

const primaryClass = 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-white shadow-md hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 disabled:from-blue-300 disabled:via-blue-400 disabled:to-purple-500 hover:scale-105 transition-all duration-200'

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
	tooltip?: string;
	tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
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
		tooltip,
		tooltipPosition = 'top',
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

		// Tooltip positioning classes
		const tooltipPositionClasses = {
			top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
			bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
			left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
			right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
		};

		// Tooltip arrow classes
		const tooltipArrowClasses = {
			top: 'top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900',
			bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900',
			left: 'left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900',
			right: 'right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900'
		};

		const buttonElement = (
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

		// If no tooltip, return the button as is
		if (!tooltip) {
			return buttonElement;
		}

		// If tooltip is provided, wrap with tooltip functionality
		return (
			<div className="relative group inline-flex">
				{buttonElement}
				<div className={cn(
					'absolute px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50',
					tooltipPositionClasses[tooltipPosition]
				)}>
					{tooltip}
					<div className={cn('absolute w-0 h-0', tooltipArrowClasses[tooltipPosition])}></div>
				</div>
			</div>
		);
	}
);
Button.displayName = 'Button';

export { Button, buttonVariants };

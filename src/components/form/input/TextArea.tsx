import React, { forwardRef } from 'react';
import { cn } from '../../../utils/common';

interface TextareaProps {
	id?: string; // ID of the textarea
	placeholder?: string; // Placeholder text
	rows?: number; // Number of rows
	value?: string; // Current value
	className?: string; // Additional CSS classes
	disabled?: boolean; // Disabled state
	error?: boolean; // Error state
	hint?: string; // Hint text to display
	name?: string;
	label?: string;
	onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
	onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
	onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
	success?: boolean;
	required?: boolean;
	autoFocus?: boolean;
}
const TextArea = forwardRef<HTMLTextAreaElement, TextareaProps>(
	(
		{
			placeholder = 'Enter your message', // Default placeholder
			rows = 3, // Default number of rows
			value = '', // Default value
			className = '', // Additional custom styles
			id = '', // Default id
			name,
			label,
			onChange,
			onFocus,
			onBlur,
			onKeyDown,
			disabled = false,
			error = false,
			hint,
			required = false,
			autoFocus = false,
			...props
		},
		ref
	) => {
		let textareaClasses = `w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden ${className} `;

		if (disabled) {
			textareaClasses += ` bg-gray-100 opacity-50 text-gray-500 border-gray-300 cursor-not-allowed opacity40 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700`;
		} else if (error) {
			textareaClasses += ` bg-transparent  border-gray-300 focus:border-error-300 focus:ring-3 focus:ring-error-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-error-800`;
		} else {
			textareaClasses += ` bg-transparent text-gray-900 dark:text-gray-300 text-gray-900 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800`;
		}

		return (
			<div className="relative">
				{label && (
					<label
						htmlFor={id || name}
						className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						{label}
						{required && <span className="ml-1 text-red-500">*</span>}
					</label>
				)}

				<textarea
					ref={ref}
					id={id}
					name={name}
					placeholder={placeholder}
					rows={rows}
					value={value}
					disabled={disabled}
					onChange={onChange}
					onFocus={onFocus}
					onBlur={onBlur}
					onKeyDown={onKeyDown}
					className={cn(textareaClasses, className)}
					required={required}
					autoFocus={autoFocus}
					{...props}
				/>
				{hint && (
					<p
						className={`mt-2 text-sm ${
							error ? 'text-error-500' : 'text-gray-500 dark:text-gray-400'
						}`}
					>
						{hint}
					</p>
				)}
			</div>
		);
	}
);

TextArea.displayName = 'TextArea';

export default TextArea;

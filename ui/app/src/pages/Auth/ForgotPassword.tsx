import React, { useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import Label from '../../components/form/Label';
import Input from '../../components/form/input/InputField';
import { Button } from '../../components/ui/button';
import { validateEmail, sanitizeInput } from '../../utils/validation';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'sonner';

export default function ForgotPassword() {
	const [email, setEmail] = useState<string>('');
	const [emailError, setEmailError] = useState<string>('');
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const validateForm = (): boolean => {
		let isValid = true;

		// Validate email
		if (!email.trim()) {
			setEmailError('Email is required');
			isValid = false;
		} else if (!validateEmail(email)) {
			setEmailError('Please enter a valid email address');
			isValid = false;
		} else {
			setEmailError('');
		}

		return isValid;
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		try {
			setIsLoading(true);
			const sanitizedEmail = sanitizeInput(email);
			
			// Use Supabase's built-in password reset functionality
			const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
				redirectTo: `${window.location.origin}/reset-password`
			});

			if (error) {
				throw error;
			}

			setIsSuccess(true);
			toast.success('Password reset email sent! Please check your email.');
		} catch (error) {
			console.error('Password reset error:', error);
			toast.error('Failed to send password reset email. Please try again.');
		} finally {
			setIsLoading(false);
		}
	};

	if (isSuccess) {
		return (
			<div className="flex flex-1 flex-col">
				<div className="mx-auto w-full max-w-md pt-10">
					<Link
						to="/signin"
						className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
					>
						<ChevronLeft className="size-5" />
						Back to sign in
					</Link>
				</div>
				<div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
					<div className="text-center">
						<div className="mb-6">
							<CheckCircle className="mx-auto h-16 w-16 text-green-500" />
						</div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
							Check Your Email
						</h1>
						<p className="text-gray-600 dark:text-gray-400 mb-6">
							We've sent a password reset link to <strong>{email}</strong>
						</p>
						<p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
							Click the link in the email to reset your password. The link will expire in 1 hour.
						</p>
						<Button
							onClick={() => window.location.href = '/signin'}
							className="w-full"
							size="sm"
						>
							Back to Sign In
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col">
			<div className="mx-auto w-full max-w-md pt-10">
				<Link
					to="/signin"
					className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
				>
					<ChevronLeft className="size-5" />
					Back to sign in
				</Link>
			</div>
			<div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
				<div>
					<div className="my-5 sm:mb-8 mt-10">
						<h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-900 dark:text-white/90">
							Forgot Password?
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Enter your email address and we'll send you a link to reset your password.
						</p>
					</div>

					<form onSubmit={handleSubmit}>
						<div className="space-y-6">
							<div>
								<Label>
									Email <span className="text-error-500">*</span>
								</Label>
								<Input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="Enter your email address"
									disabled={isLoading}
									error={!!emailError}
									hint={emailError}
								/>
							</div>
							<div>
								<Button
									className="w-full"
									size="sm"
									type="submit"
									disabled={isLoading}
								>
									{isLoading ? 'Sending...' : 'Send Reset Link'}
								</Button>
							</div>
						</div>
					</form>

					<div className="mt-5">
						<p className="text-center text-sm font-normal text-gray-700 sm:text-start dark:text-gray-400">
							Remember your password?{' '}
							<Link
								to="/signin"
								className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
							>
								Sign In
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

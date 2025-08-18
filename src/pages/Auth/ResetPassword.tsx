import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronLeft, EyeOff, Eye, Lock, CheckCircle } from 'lucide-react';
import Label from '../../components/form/Label';
import Input from '../../components/form/input/InputField';
import { Button } from '../../components/ui/button';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'sonner';

export default function ResetPassword() {
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [password, setPassword] = useState<string>('');
	const [confirmPassword, setConfirmPassword] = useState<string>('');
	const [passwordError, setPasswordError] = useState<string>('');
	const [confirmPasswordError, setConfirmPasswordError] = useState<string>('');
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [isCheckingSession, setIsCheckingSession] = useState(true);
	const navigate = useNavigate();

	// Check if user has a valid session (Supabase handles the verification automatically)
	useEffect(() => {
		const checkSession = async () => {
			try {
				const { data: { session }, error } = await supabase.auth.getSession();
				
				if (error) {
					console.error('Session check error:', error);
					toast.error('Session verification failed');
					navigate('/signin');
					return;
				}

				if (!session) {
					toast.error('Invalid or expired password reset link');
					navigate('/signin');
					return;
				}

				// User has a valid session, can proceed with password reset
				setIsCheckingSession(false);
			} catch (error) {
				console.error('Session check error:', error);
				toast.error('Failed to verify session');
				navigate('/signin');
			}
		};

		checkSession();
	}, [navigate]);

	const validateForm = (): boolean => {
		let isValid = true;

		// Validate password
		if (!password.trim()) {
			setPasswordError('Password is required');
			isValid = false;
		} else if (password.length < 6) {
			setPasswordError('Password must be at least 6 characters long');
			isValid = false;
		} else {
			setPasswordError('');
		}

		// Validate confirm password
		if (!confirmPassword.trim()) {
			setConfirmPasswordError('Please confirm your password');
			isValid = false;
		} else if (password !== confirmPassword) {
			setConfirmPasswordError('Passwords do not match');
			isValid = false;
		} else {
			setConfirmPasswordError('');
		}

		return isValid;
	};

	const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		try {
			setIsLoading(true);
			
			// Use Supabase's updateUser to set the new password
			const { error } = await supabase.auth.updateUser({
				password: password
			});

			if (error) {
				throw error;
			}

			// Sign out the user after successful password update
			// This ensures they can sign in with the new password
			await supabase.auth.signOut();

			setIsSuccess(true);
			toast.success('Password updated successfully! You can now sign in with your new password.');
		} catch (error) {
			console.error('Password reset error:', error);
			toast.error('Failed to update password. Please try again.');
		} finally {
			setIsLoading(false);
		}
	};

	// Show loading while checking session
	if (isCheckingSession) {
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
							<div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
						</div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
							Verifying Reset Link...
						</h1>
						<p className="text-gray-600 dark:text-gray-400">
							Please wait while we verify your password reset link.
						</p>
					</div>
				</div>
			</div>
		);
	}

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
							Password Updated!
						</h1>
						<p className="text-gray-600 dark:text-gray-400 mb-6">
							Your password has been successfully updated. You can now sign in with your new password.
						</p>
						<Button
							onClick={() => navigate('/signin')}
							className="w-full"
							size="sm"
						>
							Sign In
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
					<div className="mb-5 sm:mb-8">
						<div className="mb-4 flex justify-center">
							<Lock className="h-12 w-12 text-blue-600" />
						</div>
						<h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-900 dark:text-white/90">
							Set New Password
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Enter your new password below.
						</p>
					</div>

					<form onSubmit={handlePasswordReset}>
						<div className="space-y-6">
							<div>
								<Label>
									New Password <span className="text-error-500">*</span>
								</Label>
								<div className="relative">
									<Input
										type={showPassword ? 'text' : 'password'}
										placeholder="Enter your new password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										disabled={isLoading}
										error={!!passwordError}
										hint={passwordError}
									/>
									<span
										onClick={() => setShowPassword(!showPassword)}
										className="absolute top-1/2 right-4 z-30 -translate-y-1/2 cursor-pointer"
									>
										{showPassword ? (
											<Eye className="size-5 stroke-gray-500 dark:stroke-gray-400" />
										) : (
											<EyeOff className="size-5 stroke-gray-500 dark:stroke-gray-400" />
										)}
									</span>
								</div>
							</div>
							<div>
								<Label>
									Confirm New Password <span className="text-error-500">*</span>
								</Label>
								<div className="relative">
									<Input
										type={showConfirmPassword ? 'text' : 'password'}
										placeholder="Confirm your new password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										disabled={isLoading}
										error={!!confirmPasswordError}
										hint={confirmPasswordError}
									/>
									<span
										onClick={() => setShowConfirmPassword(!showConfirmPassword)}
										className="absolute top-1/2 right-4 z-30 -translate-y-1/2 cursor-pointer"
									>
										{showConfirmPassword ? (
											<Eye className="size-5 stroke-gray-500 dark:stroke-gray-400" />
										) : (
											<EyeOff className="size-5 stroke-gray-500 dark:stroke-gray-400" />
										)}
									</span>
								</div>
							</div>
							<div>
								<Button
									className="w-full"
									size="sm"
									type="submit"
									disabled={isLoading}
								>
									{isLoading ? 'Updating...' : 'Update Password'}
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

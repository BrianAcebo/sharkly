import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { EmailOtpType } from '@supabase/supabase-js';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function AuthConfirm() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { refreshUser } = useAuth();
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [hasExecuted, setHasExecuted] = useState(false);

	useEffect(() => {
		// Prevent multiple executions
		if (hasExecuted) {
			return;
		}

		const confirmEmail = async () => {
			try {
				// Mark as executed immediately
				setHasExecuted(true);

				const token_hash = searchParams.get('token_hash');
				const type = searchParams.get('type');
				const inviteId = searchParams.get('invite');

				if (!token_hash || !type) {
					setStatus('error');
					setErrorMessage('Missing confirmation parameters');
					return;
				}

				// Try different verification approaches
				let verificationResult;
				
				// First, try the standard verifyOtp
				try {
					verificationResult = await supabase.auth.verifyOtp({
						type: type as EmailOtpType,
						token_hash,
					});
				} catch {
					// If verifyOtp fails, try using the token directly
					try {
						verificationResult = await supabase.auth.verifyOtp({
							type: 'email',
							token_hash: token_hash,
						});
					} catch {
						// If both fail, try using the token as a confirmation token
						try {
							verificationResult = await supabase.auth.verifyOtp({
								type: 'signup',
								token_hash: token_hash,
							});
						} catch (confirmError) {
							verificationResult = { error: confirmError };
						}
					}
				}

				const { data, error } = verificationResult || { data: null, error: null };

				if (error) {
					console.error('OTP verification error:', error);
					
					// If OTP verification fails, redirect to signup with error
					setStatus('error');
					setErrorMessage(typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : 'Failed to verify email');
					
					// Redirect to signup page with error after a delay
					setTimeout(() => {
						navigate('/signup?error=otp_failed');
					}, 3000);
					return;
				}

				if (data?.user) {
					// Check if this is an invitation-based signup
					if (inviteId) {
						try {
							// Get the invitation details
							const { data: invite, error: inviteError } = await supabase
								.from('organization_invites')
								.select('*, organization:organizations(*)')
								.eq('id', inviteId)
								.eq('status', 'pending')
								.single();

							if (inviteError || !invite) {
								// If invitation is invalid, redirect to signup with error
								setStatus('error');
								setErrorMessage('Invalid or expired invitation');
								
								// Redirect to signup page with error after a delay
								setTimeout(() => {
									navigate('/signup?error=invalid_invite');
								}, 3000);
								return;
							}

							// Check if invitation is expired
							if (new Date(invite.expires_at) < new Date()) {
								// If invitation is expired, redirect to signup with error
								setStatus('error');
								setErrorMessage('Invitation has expired');
								
								// Redirect to signup page with error after a delay
								setTimeout(() => {
									navigate('/signup?error=expired_invite');
								}, 3000);
								return;
							}

							// Add user to the organization
							
							// Validate the role before inserting
							const validRoles = ['owner', 'admin', 'member'];
							if (!validRoles.includes(invite.role)) {
								console.error('Invalid role in invitation:', invite.role);
								console.error('Valid roles are:', validRoles);
								setStatus('error');
								setErrorMessage(`Invalid role: ${invite.role}. Must be one of: ${validRoles.join(', ')}`);
								
								// Redirect to signup page with error after a delay
								setTimeout(() => {
									navigate('/signup?error=invalid_role');
								}, 3000);
								return;
							}
							
							// Check if user is already in the organization
							const { data: existingMember } = await supabase
								.from('user_organizations')
								.select('id')
								.eq('user_id', data.user.id)
								.eq('organization_id', invite.organization_id)
								.single();

							if (existingMember) {
								// User is already in the organization, just update invitation status
							} else {
								const { error: orgError } = await supabase
									.from('user_organizations')
									.insert({
										user_id: data.user.id,
										organization_id: invite.organization_id,
										role: invite.role
									});

								if (orgError) {
									console.error('Error adding user to organization:', orgError);
									
									// If organization join fails, redirect to signup with error
									setStatus('error');
									setErrorMessage('Failed to join organization');
									
									// Redirect to signup page with error after a delay
									setTimeout(() => {
										navigate('/signup?error=join_failed');
									}, 3000);
									return;
								}
							}

							// Update invitation status to accepted
							await supabase
								.from('organization_invites')
								.update({ status: 'accepted' })
								.eq('id', inviteId);

							// Refresh the user context to update organization_id
							await refreshUser();

							// Longer delay to ensure context is fully updated and propagated
							await new Promise(resolve => setTimeout(resolve, 500));

							// Additional safety: wait a bit more for any pending operations
							await new Promise(resolve => setTimeout(resolve, 300));

							// Success - user is now authenticated and in organization
							// Redirect immediately to avoid race conditions
							navigate('/onboarding?verified=true');
							return;

						} catch (inviteError) {
							console.error('Error processing invitation:', inviteError);
							
							// If invitation processing fails, redirect to signup with error
							setStatus('error');
							setErrorMessage('Failed to process invitation');
							
							// Redirect to signup page with error after a delay
							setTimeout(() => {
								navigate('/signup?error=processing_failed');
							}, 3000);
							return;
						}
					}

					// No invitations found, redirect to onboarding
					// Redirect immediately to avoid race conditions
					navigate('/onboarding?verified=true');
				}
			} catch (error) {
				console.error('Confirmation error:', error);
				
				// If any unexpected error occurs, redirect to signup with error
				setStatus('error');
				setErrorMessage('An unexpected error occurred');
				
				// Redirect to signup page with error after a delay
				setTimeout(() => {
					navigate('/signup?error=unexpected_error');
				}, 3000);
			}
		};

		confirmEmail();
	}, [hasExecuted, navigate, refreshUser, searchParams]); // Include all dependencies

	const handleRetry = () => {
		window.location.reload();
	};

	const handleGoHome = () => {
		navigate('/');
	};

	if (status === 'loading') {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="flex items-center justify-center gap-2">
							<Loader2 className="h-6 w-6 animate-spin text-blue-600" />
							Confirming Your Email
						</CardTitle>
					</CardHeader>
					<CardContent className="text-center">
						<p className="text-gray-600 mb-4">
							Please wait while we verify your email address...
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (status === 'success') {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="flex items-center justify-center gap-2 text-green-600">
							<CheckCircle className="h-6 w-6" />
							Email Confirmed!
						</CardTitle>
					</CardHeader>
					<CardContent className="text-center">
						<p className="text-gray-600 mb-6">
							Your email has been successfully confirmed. You'll be redirected shortly...
						</p>
						<Button onClick={handleGoHome} variant="outline" className="w-full">
							Go to Home
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="flex items-center justify-center gap-2 text-red-600">
						<XCircle className="h-6 w-6" />
						Confirmation Failed
					</CardTitle>
				</CardHeader>
				<CardContent className="text-center">
					<div className="mb-6">
						<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
						<p className="text-gray-600 mb-2">
							We couldn't confirm your email address.
						</p>
						<p className="text-sm text-gray-500">
							{errorMessage}
						</p>
					</div>
					
					<div className="space-y-3">
						<Button onClick={handleRetry} className="w-full">
							Try Again
						</Button>
						<Button onClick={handleGoHome} variant="outline" className="w-full">
							Go to Home
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

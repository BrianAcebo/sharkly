import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';

export default function OAuthCallback() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [error, setError] = useState<string | null>(null);

	const handleCallback = useCallback(async () => {
		try {
			setError(null);
			
			const { error: authError } = await supabase.auth.getSession();

			if (authError) {
				throw authError;
			}

			// Check if this is an invitation flow
			const inviteId = searchParams.get('invite');
			const next = searchParams.get('next') ?? '/';
			
			// If there's an invitation, complete the invitation process
			if (inviteId) {
				try {
					// Check if user is authenticated
					const { data: { session } } = await supabase.auth.getSession();
					if (session?.user) {
						// User is authenticated, complete the invitation
						console.log('Completing invitation process for OAuth user:', session.user.email);
						
						// Fetch the invitation details
						const { data: invite, error: inviteError } = await supabase
							.from('organization_invites')
							.select(`
								id,
								email,
								role,
								organization_id,
								status
							`)
							.eq('id', inviteId)
							.eq('email', session.user.email)
							.single();

						if (inviteError || !invite) {
							console.error('Error fetching invitation:', inviteError);
							throw new Error('Invitation not found or invalid');
						}

						if (invite.status !== 'pending') {
							console.log('Invitation already processed:', invite.status);
							throw new Error('Invitation has already been processed');
						}

						// Check if user is already in the organization
						const { data: existingMember } = await supabase
							.from('user_organizations')
							.select('id')
							.eq('user_id', session.user.id)
							.eq('organization_id', invite.organization_id)
							.single();

						if (!existingMember) {
							// Add user to the organization
							const { error: orgError } = await supabase
								.from('user_organizations')
								.insert({
									user_id: session.user.id,
									organization_id: invite.organization_id,
									role: invite.role
								});

							if (orgError) {
								console.error('Error adding user to organization:', orgError);
								throw new Error('Failed to join organization');
							}
						}

						// Update invitation status to accepted
						await supabase
							.from('organization_invites')
							.update({ status: 'accepted' })
							.eq('id', inviteId);

						// Add a small delay to allow user context to update
						// This prevents race condition with auth state change
						await new Promise(resolve => setTimeout(resolve, 500));

						// Success - user is now in organization, redirect to organization page
						console.log('Successfully completed invitation via OAuth');
						navigate('/organization');
						return;
						
					} else {
						// User not authenticated, redirect to signin with invitation context
						navigate(`/signin?invite=${inviteId}&next=${next}`);
						return;
					}
				} catch (inviteError) {
					console.error('Error completing invitation via OAuth:', inviteError);
					// If invitation completion fails, redirect to signin with error
					navigate(`/signin?invite=${inviteId}&error=invite_failed`);
					return;
				}
			} else {
				// Otherwise, go to the intended destination
				navigate(next);
			}
		} catch (err) {
			console.error('Error in OAuth callback:', err);
			const errorMessage = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
			setError(errorMessage);
		}
	}, [searchParams, navigate]);

	const handleRetry = () => {
		handleCallback();
	};

	useEffect(() => {
		handleCallback();
	}, [handleCallback]);

	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
					<div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900 rounded-full mb-4">
						<AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
					</div>
					
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
						Authentication Error
					</h2>
					
					<p className="text-gray-600 dark:text-gray-400 text-center mb-6">
						{error}
					</p>

					<div className="flex space-x-3">
						<Button
							onClick={handleRetry}
							className="flex-1"
							variant="outline"
						>
							<RefreshCw className="h-4 w-4 mr-2" />
							Try Again
						</Button>
						
						<Button
							onClick={() => navigate('/')}
							className="flex-1"
						>
							Go Home
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<h1 className="mb-4 text-2xl font-semibold">Processing authentication...</h1>
				<div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
			</div>
		</div>
	);
}

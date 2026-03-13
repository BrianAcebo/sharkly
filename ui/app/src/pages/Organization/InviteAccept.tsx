import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Building2, Users, Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabaseClient';
import { api } from '../../utils/api';
import { type TeamMemberRole } from '../../utils/constants';

interface Invitation {
	id: string;
	email: string;
	role: TeamMemberRole;
	organization_id: string;
	invited_by: string;
	status: 'pending' | 'accepted' | 'expired';
	created_at: string;
	organization: {
		id: string;
		name: string;
		max_seats: number;
	};
	inviter: {
		first_name: string;
		last_name: string;
	};
}

export default function InviteAccept() {
	const { inviteId } = useParams<{ inviteId: string }>();
	const navigate = useNavigate();
	const { user, session } = useAuth();
	const [invitation, setInvitation] = useState<Invitation | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isAccepting, setIsAccepting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Remove the early redirect - let users see the invitation first
	// if (!user || !session) {
	// 	navigate('/signin?next=/invite/' + inviteId);
	// }

	const fetchInvitation = useCallback(async () => {
		if (!inviteId) {
			setError('Invalid invitation link');
			setIsLoading(false);
			return;
		}

		try {
			// Use the API endpoint which runs with service role (bypasses RLS)
			const response = await api.get(`/api/organizations/invite/${inviteId}`);
			
			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				setError(err?.error || 'Invitation not found or has expired');
				return;
			}

			const data = await response.json();

			const invitation: Invitation = {
				id: data.id,
				email: data.email,
				role: data.role,
				organization_id: data.organization?.id || '',
				invited_by: '',
				status: data.status,
				created_at: data.created_at,
				organization: data.organization || { id: '', name: 'Unknown Organization', max_seats: 0 },
				inviter: data.inviter || { first_name: 'Unknown', last_name: 'User' }
			};

			setInvitation(invitation);
		} catch (error) {
			console.error('Error fetching invitation:', error);
			setError('Failed to load invitation');
		} finally {
			setIsLoading(false);
		}
	}, [inviteId]);

	useEffect(() => {
		fetchInvitation();
	}, [inviteId, fetchInvitation]);

	const handleAcceptInvitation = async () => {
		if (!invitation || !user || !session) {
			toast.error('Unable to accept invitation');
			return;
		}

		// Check if user email matches invitation email
		if (user.email !== invitation.email) {
			toast.error('This invitation was sent to a different email address');
			return;
		}

		setIsAccepting(true);
		try {
			// Get the session for auth
			const { data: { session: currentSession } } = await supabase.auth.getSession();
			
			if (!currentSession?.access_token) {
				toast.error('Not authenticated');
				return;
			}

			// Accept the invitation via API
			const response = await api.post('/api/organizations/accept-invite', {
				inviteId: invitation.id
			}, {
				headers: {
					Authorization: `Bearer ${currentSession.access_token}`,
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err?.error || 'Failed to accept invitation');
			}

			const result = await response.json().catch(() => ({}));
			
			if (result.alreadyMember) {
				toast.success('You\'re already a member! Redirecting...');
			} else {
				toast.success('Successfully joined the organization!');
			}

			// Redirect to the organization page
			setTimeout(() => {
				navigate('/organization');
			}, 1000);
		} catch (error) {
			console.error('Error accepting invitation:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to accept invitation');
		} finally {
			setIsAccepting(false);
		}
	};

	const handleDeclineInvitation = async () => {
		if (!invitation) return;

		try {
			// Update invitation status to declined
			const { error } = await supabase
				.from('organization_invites')
				.update({ status: 'expired' })
				.eq('id', invitation.id);

			if (error) throw error;

			toast.success('Invitation declined');
			navigate('/');
		} catch (error) {
			console.error('Error declining invitation:', error);
			toast.error('Failed to decline invitation');
		}
	};

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="text-center">
					<Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
					<p className="text-gray-600 dark:text-gray-400">Loading invitation...</p>
				</div>
			</div>
		);
	}

	if (error || !invitation) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="mx-auto max-w-md p-6 text-center">
					<XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
					<h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
						Invitation Error
					</h1>
					<p className="mb-6 text-gray-600 dark:text-gray-400">{error}</p>
					<Button onClick={() => navigate('/')} variant="outline" className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
						Go Home
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-gray-900">
			<div className="mx-auto max-w-md">
				<Card className="p-6 bg-white dark:bg-gray-800 dark:border-gray-700">
					<div className="mb-6 text-center">
						<CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
							Organization Invitation
						</h1>
						<p className="mt-2 text-gray-600 dark:text-gray-400">
							You've been invited to join a team
						</p>
					</div>

					<div className="mb-6 space-y-4">
						<div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
							<Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							<div>
								<h3 className="font-semibold text-gray-900 dark:text-white">
									{invitation.organization?.name}
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400">Organization</p>
							</div>
						</div>

						<div className="flex items-center gap-3 rounded-lg bg-purple-50 p-3 dark:bg-purple-900/30">
							<Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
							<div>
								<h3 className="font-semibold text-gray-900 capitalize dark:text-white">
									{invitation.role}
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400">Your role</p>
							</div>
						</div>

						<div className="flex items-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
							<Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
							<div>
								<h3 className="font-semibold text-gray-900 dark:text-white">
									{invitation.inviter.first_name} {invitation.inviter.last_name}
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400">Invited by</p>
							</div>
						</div>
					</div>

					{!session ? (
						<div className="space-y-3">
							<p className="text-center text-sm text-gray-600 dark:text-gray-400">
								You need to sign in to accept this invitation
							</p>
							<Button onClick={() => navigate(`/signin?invite=${inviteId}`)} className="w-full">
								Sign In
							</Button>
							<Button onClick={() => navigate(`/signup?invite=${inviteId}`)} variant="outline" className="w-full dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
								Create Account
							</Button>
						</div>
					) : user?.email !== invitation.email ? (
						<div className="text-center">
							<p className="mb-4 text-sm text-red-600 dark:text-red-400">
								This invitation was sent to {invitation.email}, but you're signed in as{' '}
								{user?.email}
							</p>
							<Button onClick={() => navigate(`/signin?invite=${inviteId}`)} variant="outline" className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
								Sign in with {invitation.email}
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							<Button onClick={handleAcceptInvitation} disabled={isAccepting} className="w-full">
								{isAccepting ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Accepting...
									</>
								) : (
									'Accept Invitation'
								)}
							</Button>
							<Button onClick={handleDeclineInvitation} variant="outline" className="w-full dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
								Decline
							</Button>
						</div>
					)}
				</Card>
			</div>
		</div>
	);
}

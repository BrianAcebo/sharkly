import { useState, useEffect, ChangeEvent } from 'react';
import useAuth from '../../hooks/useAuth';
import type { Organization, TeamMember } from '../../types/leads';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Tabs, TabsContent, TabsList } from '../../components/ui/tabs';
import { Calendar, Users, Building2, Shield, Trash2, UserPlus, AlertTriangle, MessageSquare, CreditCard } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabaseClient';
import { HttpError } from '../../utils/error';
import { api } from '../../utils/api';
import { useOrganizationStatus } from '../../hooks/useOrganizationStatus';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { getOrganizationStatusMessage } from '../../utils/paymentStatus';
import {
	TEAM_MEMBER_ROLES,
	ASSIGNABLE_TEAM_MEMBER_ROLES,
	type TeamMemberRole,
	type AssignableTeamMemberRole
} from '../../utils/constants';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '../../components/ui/select';
import Input from '../../components/form/input/InputField';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import DangerConfirmationModal from '../../components/common/DangerConfirmationModal';
import BrandForm from '../../components/sms/BrandForm';
import CampaignForm from '../../components/sms/CampaignForm';
import TollFreeForm from '../../components/sms/TollFreeForm';
import { VerificationStatusResponse } from '../../types/smsVerification';

interface PendingInvitation {
	id: string;
	email: string;
	role: TeamMemberRole;
	status: 'pending';
	created_at: string;
	invited_by: string;
	inviter: {
		first_name: string;
		last_name: string;
	};
}

export default function OrganizationPage() {
	const { user, refreshUser } = useAuth();
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState('overview');
	const { 
		status: orgStatus, 
    // omit loading here
    isReadOnly,
		getOrganizationStatus 
	} = useOrganizationStatus();
	const { paymentStatus } = usePaymentStatus();
	
	// Check if organization can be resumed (not behind on payments)
  const canResumeOrganization = false; // manual resume disabled
	
	// Check if user is owner
	const isOwner = user?.role === 'owner';
	const [organization, setOrganization] = useState<Organization | null>(null);
	const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
	const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviteRole, setInviteRole] = useState<AssignableTeamMemberRole>(
		ASSIGNABLE_TEAM_MEMBER_ROLES.MEMBER
	);
	const [isInviting, setIsInviting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [smsVerificationStatus, setSmsVerificationStatus] = useState<VerificationStatusResponse | null>(null);
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Organization');
		// Fetch organization status on component mount
		getOrganizationStatus();
	}, [setTitle, getOrganizationStatus]);

	const fetchSmsVerificationStatus = async () => {
		if (!user?.organization_id) return;

		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session?.access_token) return;

			const response = await fetch(`/api/sms/verification-status?orgId=${user.organization_id}`, {
				headers: {
					'Authorization': `Bearer ${session.access_token}`,
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const data = await response.json();
				if (data.ok) {
					setSmsVerificationStatus(data.data);
				}
			}
		} catch (error) {
			console.error('Error fetching SMS verification status:', error);
		}
	};

	const fetchOrganizationData = async () => {
		setIsLoading(true);
		try {
			// Check if user has organization_id, if not, refresh user data
			if (!user?.organization_id) {
				await refreshUser();
				if (!user?.organization_id) {
					setIsLoading(false);
					navigate('/organization-required');
					return;
				}
			}

			// Get the organization for the current user (owner or member)
			const { data: org, error: orgError } = await supabase
				.from('organizations')
				.select(
					`
					id,
					name,
					maxSeats: max_seats,
					createdAt: created_at,
					ownerId: owner_id,
					updatedAt: updated_at,
					status: org_status
				`
				)
				.eq('id', user?.organization_id || '')
				.single();

			if (orgError || !org) throw new HttpError('No organization found', 404);
			setOrganization(org);

			// Get all team members for the organization directly from Supabase
			const { data: members, error: membersError } = await supabase
				.from('user_organizations')
				.select('*, profile:profiles(*)')
				.eq('organization_id', org.id);

			if (membersError) throw new HttpError('Failed to fetch team members', 500);

			setTeamMembers(
				members.map((member) => {
					let avatarUrl = '';
					if (member.profile?.avatar) {
						const { data: imageUrl } = supabase.storage
							.from('avatars')
							.getPublicUrl(member.profile.avatar);

						if (imageUrl?.publicUrl) {
							avatarUrl = imageUrl.publicUrl;
						}
					}
					return { ...member, profile: { ...member.profile, avatar: avatarUrl } };
				}) || []
			);

			// Get pending invitations for the organization
			const { data: invites, error: invitesError } = await supabase
				.from('organization_invites')
				.select(
					`
					id,
					email,
					role,
					status,
					created_at,
					invited_by,
					inviter:profiles(
						first_name,
						last_name
					)
				`
				)
				.eq('organization_id', org.id)
				.eq('status', 'pending');

			if (invitesError) {
				console.error('Error fetching invitations:', invitesError);
			} else {
				// Transform the data to match our interface
				const transformedInvites: PendingInvitation[] = (invites || []).map(
					(invite: {
						id: string;
						email: string;
						role: string;
						status: string;
						created_at: string;
						invited_by: string;
						inviter:
							| { first_name: string; last_name: string }
							| { first_name: string; last_name: string }[];
					}) => ({
						id: invite.id,
						email: invite.email,
						role: invite.role as TeamMemberRole,
						status: invite.status as 'pending',
						created_at: invite.created_at,
						invited_by: invite.invited_by,
						inviter: Array.isArray(invite.inviter) ? invite.inviter[0] : invite.inviter
					})
				);
				setPendingInvitations(transformedInvites);
			}
		} catch (error) {
			if (error instanceof HttpError) {
				console.error(error.statusCode, error.message);
				toast.error(error.message);
			} else {
				console.error(error);
				toast.error('Failed to load organization data');
			}
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchOrganizationData();
		fetchSmsVerificationStatus();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const isAdmin = user?.role === 'admin';
	const canManageSMS = isOwner || isAdmin;

	const handleInviteTeamMember = async () => {
		if (!inviteEmail) {
			toast.error('Please enter an email address');
			return;
		}

		// Prevent self-invitation
		if (user?.email && inviteEmail.toLowerCase() === user.email.toLowerCase()) {
			toast.error('You cannot invite yourself to the organization');
			return;
		}

		// Check if invitation is already pending
		const isAlreadyInvited = pendingInvitations.some(
			(inv) => inv.email.toLowerCase() === inviteEmail.toLowerCase()
		);
		if (isAlreadyInvited) {
			toast.error('An invitation has already been sent to this email address');
			return;
		}

		setIsInviting(true);
		try {
			await api.post(
				'/api/organizations/invite',
				{
					email: inviteEmail,
					role: inviteRole
				},
				organization?.id
			);

			toast.success(`Invitation sent to ${inviteEmail}`);
			setInviteEmail('');
			fetchOrganizationData();
		} catch (error) {
			console.error('Error sending invitation:', error);
			toast.error('Failed to send invitation');
		} finally {
			setIsInviting(false);
		}
	};

	const handleDeleteTeamMember = async (memberId: string) => {
		const member = teamMembers.find((m) => m.id === memberId);
		if (!member) return;

		if (
			!confirm(
				`Are you sure you want to remove ${member.profile.first_name} ${member.profile.last_name} from the organization? This action cannot be undone.`
			)
		) {
			return;
		}

		try {
			if (!organization) {
				toast.error('Organization not found');
				return;
			}

			// Check if user is the owner
			if (organization.ownerId !== user?.id) {
				toast.error('Only the organization owner can remove team members');
				return;
			}

			// Check if trying to remove self
			if (memberId === user?.id) {
				toast.error('Cannot remove yourself from the organization');
				return;
			}

			const { error } = await supabase
				.from('user_organizations')
				.delete()
				.eq('user_id', memberId)
				.eq('organization_id', organization.id);

			if (error) throw error;

			toast.success('Team member removed successfully');
			fetchOrganizationData();
		} catch (error) {
			console.error('Error removing team member:', error);
			toast.error('Failed to remove team member');
		}
	};

	const handleUpdateRole = async (memberId: string, newRole: TeamMemberRole) => {
		if (!confirm(`Are you sure you want to change this team member's role to ${newRole}?`)) {
			return;
		}

		try {
			if (!organization) {
				toast.error('Organization not found');
				return;
			}

			// Check if user is the owner
			if (organization.ownerId !== user?.id) {
				toast.error('Only the organization owner can update team member roles');
				return;
			}

			// Check if trying to update self
			if (memberId === user?.id) {
				toast.error('Cannot update your own role');
				return;
			}

			const { error } = await supabase
				.from('user_organizations')
				.update({ role: newRole })
				.eq('user_id', memberId)
				.eq('organization_id', organization.id);

			if (error) throw error;

			toast.success('Role updated successfully');
			fetchOrganizationData();
		} catch (error) {
			console.error('Error updating role:', error);
			toast.error('Failed to update role');
		}
	};

	const handleCancelInvitation = async (invitationId: string) => {
		if (!confirm('Are you sure you want to cancel this invitation?')) return;
		try {
			await api.delete(`/api/organizations/cancel-invite/${invitationId}`);
			toast.success('Invitation cancelled successfully');
			fetchOrganizationData();
		} catch (error) {
			console.error('Error cancelling invitation:', error);

			if (error && typeof error === 'object' && 'status' in error) {
				const apiError = error as { status: number; message: string };
				toast.error(apiError.message);
			} else {
				toast.error('Failed to cancel invitation');
			}
		}
	};

	const handleUpdateOrganization = async () => {
		try {
			if (!organization) {
				toast.error('Organization not found');
				return;
			}

			// Check if user is the owner
			if (organization.ownerId !== user?.id) {
				toast.error('Only the organization owner can update organization settings');
				return;
			}

			// For now, just show a message that this would update the organization
			// You can add form fields and actual update logic here
			toast.success('Organization settings would be updated (functionality to be implemented)');
		} catch (error) {
			console.error('Error updating organization:', error);
			toast.error('Failed to update organization');
		}
	};

	const handleDeleteOrganization = async () => {
		if (!organization) {
			toast.error('Organization not found');
			return;
		}

		setIsDeleting(true);
		try {
			await api.delete(`/api/organizations/${organization.id}`);
			
			toast.success('Organization deleted successfully');
			
			// Sign out the user and redirect to home since they no longer have an organization
			await supabase.auth.signOut();
			window.location.href = '/';
		} catch (error) {
			console.error('Error deleting organization:', error);
			
			if (error && typeof error === 'object' && 'status' in error) {
				const apiError = error as { status: number; message: string };
				toast.error(apiError.message || 'Failed to delete organization');
			} else {
				toast.error('Failed to delete organization. Please try again.');
			}
		} finally {
			setIsDeleting(false);
			setShowDeleteModal(false);
		}
	};

// Manual pause/resume disabled; status managed via Stripe webhooks

	if (isLoading) {
		return <div className="container mx-auto px-4 py-8">Loading...</div>;
	}

	if (!organization) {
		return <div className="container mx-auto px-4 py-8">No organization found.</div>;
	}

	return (
		<>
			<PageMeta title={organization.name} description="Manage your organization and team members" />
			<div className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">{organization.name}</h1>
					<div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
						<div className="flex items-center gap-1">
							<Building2 className="h-4 w-4" />
							<span>Organization ID: {organization.id}</span>
						</div>
						<div className="flex items-center gap-1">
							<Users className="h-4 w-4" />
							<span>
								{teamMembers.length} of {organization.maxSeats} seats used
							</span>
						</div>
						<div className="flex items-center gap-1">
							<Calendar className="h-4 w-4" />
							<span>Created {new Date(organization.createdAt).toLocaleDateString()}</span>
						</div>
					</div>
				</div>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
					<TabsList className="flex items-center justify-start gap-3 p-0">
						<Button
							onClick={() => setActiveTab('overview')}
							variant={activeTab === 'overview' ? 'default' : 'outline'}
							size="sm"
						>
							Overview
						</Button>
						<Button
							onClick={() => setActiveTab('team-members')}
							variant={activeTab === 'team-members' ? 'default' : 'outline'}
							size="sm"
						>
							Team Members
						</Button>
						<Button
							onClick={() => setActiveTab('settings')}
							variant={activeTab === 'settings' ? 'default' : 'outline'}
							size="sm"
						>
							Settings
						</Button>
						<Button
							onClick={() => setActiveTab('sms-verification')}
							variant={activeTab === 'sms-verification' ? 'default' : 'outline'}
							size="sm"
							className="flex items-center space-x-2"
						>
							<MessageSquare className="h-4 w-4" />
							<span>SMS Verification</span>
						</Button>
					</TabsList>

					<TabsContent value="overview" className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							<Card className="p-4">
								<CardHeader>
									<div className="flex items-center gap-2">
										<Users className="h-5 w-5 text-gray-500" />
										<h3 className="font-semibold">Team Members</h3>
									</div>
								</CardHeader>
								<CardContent>
									<p className="mt-2 text-2xl font-bold">{teamMembers.length}</p>
									<p className="text-sm text-gray-500">Active team members</p>
								</CardContent>
							</Card>

							<Card className="p-4">
								<CardHeader>
									<div className="flex items-center gap-2">
										<Shield className="h-5 w-5 text-gray-500" />
										<h3 className="font-semibold">Managers</h3>
									</div>
								</CardHeader>
								<CardContent>
									<p className="mt-2 text-2xl font-bold">
										{teamMembers.filter((member) => member.role === TEAM_MEMBER_ROLES.ADMIN).length}
									</p>
									<p className="text-sm text-gray-500">Team managers</p>
								</CardContent>
							</Card>

							<Card className="p-4">
								<CardHeader>
									<div className="flex items-center gap-2">
										<Calendar className="h-5 w-5 text-gray-500" />
										<h3 className="font-semibold">Organization Age</h3>
									</div>
								</CardHeader>
								<CardContent>
									<p className="mt-2 text-2xl font-bold">
										{Math.floor(
											(new Date().getTime() - new Date(organization.createdAt).getTime()) /
												(1000 * 60 * 60 * 24 * 30)
										)}
									</p>
									<p className="text-sm text-gray-500">Months since creation</p>
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					<TabsContent value="team-members" className="space-y-4">
						{isOwner && (
							<Card className="p-4">
								<CardHeader>
									<h3 className="mb-4 font-semibold">Invite New Team Member</h3>
								</CardHeader>
								<CardContent>
									<div className="flex gap-4">
										<Input
											type="email"
											placeholder="Enter email address"
											value={inviteEmail}
											onChange={(e: ChangeEvent<HTMLInputElement>) =>
												setInviteEmail(e.target.value)
											}
											className="flex-1"
										/>
										<Select
											value={inviteRole}
											onValueChange={(value: string) =>
												setInviteRole(value as AssignableTeamMemberRole)
											}
										>
											<SelectTrigger className="h-11 w-[180px] border border-gray-200 bg-white dark:border-gray-900 dark:bg-white/[0.03]">
												<SelectValue placeholder="Select role" />
											</SelectTrigger>
											<SelectContent className="cursor-pointer bg-white text-gray-700 ring-1 ring-gray-300 ring-inset dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700">
												<SelectItem value={ASSIGNABLE_TEAM_MEMBER_ROLES.ADMIN}>Manager</SelectItem>
												<SelectItem value={ASSIGNABLE_TEAM_MEMBER_ROLES.MEMBER}>Member</SelectItem>
											</SelectContent>
										</Select>
										<Button
											onClick={handleInviteTeamMember}
											disabled={isInviting}
											className="flex items-center gap-2"
										>
											<UserPlus className="h-4 w-4" />
											{isInviting ? 'Sending...' : 'Send Invite'}
										</Button>
									</div>
								</CardContent>
							</Card>
						)}

						{/* Pending Invitations Section */}
						{pendingInvitations.length > 0 && (
							<Card className="p-4">
								<CardHeader>
									<h3 className="mb-4 flex items-center gap-2 font-semibold">
										<Calendar className="h-4 w-4" />
										Pending Invitations ({pendingInvitations.length})
									</h3>
								</CardHeader>
								<CardContent>
									<div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
										{pendingInvitations.map((invitation) => (
											<Card key={invitation.id} className="border-dashed p-4">
												<div className="flex flex-wrap items-center gap-4">
													<div className="flex-1">
														<h3 className="font-semibold">{invitation.email}</h3>
														<p className="text-sm text-gray-500 capitalize">{invitation.role}</p>
														<p className="mt-1 text-xs text-gray-400">
															Invited by {invitation.inviter.first_name}{' '}
															{invitation.inviter.last_name}
														</p>
														<p className="text-xs text-gray-400">
															{new Date(invitation.created_at).toLocaleDateString()}
														</p>
													</div>
													{isOwner && (
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleCancelInvitation(invitation.id)}
														>
															Cancel
														</Button>
													)}
												</div>
											</Card>
										))}
									</div>
								</CardContent>
							</Card>
						)}

						{/* Current Members Section */}
						<Card className="p-4">
							<CardHeader>
								<h3 className="mb-4 flex items-center gap-2 font-semibold">
									<Users className="h-4 w-4" />
									Current Members ({teamMembers.length})
								</h3>
							</CardHeader>
							<CardContent>
								<div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
									{teamMembers.map((member: TeamMember) => (
										<Card key={member.id} className="p-4">
											<div className="flex flex-wrap items-center gap-4">
												<Avatar>
													<AvatarImage src={member.profile.avatar} />
													<AvatarFallback>{member.profile.first_name.charAt(0)}</AvatarFallback>
												</Avatar>
												<div className="flex-1">
													<h3 className="font-semibold">
														{member.profile.first_name} {member.profile.last_name}
													</h3>
													<p className="text-sm text-gray-500 capitalize">{member.role}</p>
												</div>
												{isOwner && member.profile.id !== user?.id && (
													<div className="flex gap-2">
														<Select
															value={member.role}
															onValueChange={(value: string) =>
																handleUpdateRole(member.id, value as TeamMemberRole)
															}
														>
															<SelectTrigger className="h-11 w-[100px] border border-gray-200 bg-white dark:border-gray-900 dark:bg-white/[0.03]">
																<SelectValue />
															</SelectTrigger>
															<SelectContent className="cursor-pointer bg-white text-gray-700 ring-1 ring-gray-300 ring-inset dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700">
																<SelectItem value={ASSIGNABLE_TEAM_MEMBER_ROLES.ADMIN}>
																	Manager
																</SelectItem>
																<SelectItem value={ASSIGNABLE_TEAM_MEMBER_ROLES.MEMBER}>
																	Member
																</SelectItem>
															</SelectContent>
														</Select>
														<Button
															variant="destructive"
															size="sm"
															onClick={() => handleDeleteTeamMember(member.id)}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
												)}
											</div>
										</Card>
									))}
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="settings" className="space-y-4">
						{/* Organization Status */}
						<Card className="p-4">
							<CardHeader>
								<h3 className="mb-4 font-semibold">Organization Status</h3>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<div>
											<label className="text-sm font-medium">Current Status</label>
											<div className="mt-1 flex items-center gap-2">
												<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													orgStatus === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
													orgStatus === 'paused' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
													orgStatus === 'disabled' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
													'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
												}`}>
													{orgStatus === 'active' ? 'Active' :
													 orgStatus === 'paused' ? 'Paused' :
													 orgStatus === 'disabled' ? 'Disabled' : 'Unknown'}
												</span>
											</div>
										</div>
    {/* Manual pause/resume controls removed - status is automated via Stripe */}
									</div>
									{orgStatus === 'paused' && (
										<div className="text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-md">
											<AlertTriangle className="h-4 w-4 inline mr-1" />
											{canResumeOrganization ? (
												<>
													Organization is paused. All features are in read-only mode. You can resume when ready.
												</>
											) : (
												<>
													Organization is paused due to payment issues. Please resolve payment problems to resume service.
													{paymentStatus?.organization?.payment_failure_reason && (
														<div className="mt-1 text-xs">
															Reason: {paymentStatus.organization.payment_failure_reason}
														</div>
													)}
												</>
											)}
										</div>
									)}
									{orgStatus === 'disabled' && (
										<div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
											<AlertTriangle className="h-4 w-4 inline mr-1" />
											Organization is disabled. All features are in read-only mode.
										</div>
									)}
									{(orgStatus === 'payment_required' || orgStatus === 'past_due') && (
										<div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
											<CreditCard className="h-4 w-4 inline mr-1" />
											{getOrganizationStatusMessage(paymentStatus?.organization as unknown as import('../../types/billing').OrganizationRow)}
											{paymentStatus?.organization?.payment_failure_reason && (
												<div className="mt-1 text-xs">
													Reason: {paymentStatus.organization.payment_failure_reason}
												</div>
											)}
										</div>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Billing */}
						<Card className="p-4">
							<CardHeader>
								<h3 className="mb-4 font-semibold">Billing & Subscription</h3>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<div>
											<label className="text-sm font-medium">Manage Billing</label>
											<p className="text-sm text-gray-500 dark:text-gray-400">
												View usage, update payment methods, and manage your subscription
											</p>
										</div>
										<Button
											size="sm"
											variant="outline"
											onClick={() => navigate('/billing')}
											className="text-blue-600 border-blue-300 hover:bg-blue-50"
										>
											<CreditCard className="h-4 w-4 mr-1" />
											Billing
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Organization Settings */}
						<Card className="p-4">
							<CardHeader>
								<h3 className="mb-4 font-semibold">Organization Settings</h3>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div>
										<label className="text-sm font-medium">Organization Name</label>
										<Input
											type="text"
											value={organization.name}
											disabled={!isOwner || isReadOnly}
											className="mt-1"
										/>
									</div>
									<div>
										<label className="text-sm font-medium">Max Seats</label>
										<div className="mt-1 flex items-center gap-2">{organization.maxSeats}</div>
									</div>
									{isOwner && !isReadOnly && (
										<div className="flex items-center gap-3">
											<Button
												size="sm"
												className="mt-4"
												variant="outline"
												onClick={handleUpdateOrganization}
											>
												Save Changes
											</Button>
										</div>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Danger Zone */}
						{isOwner && (
							<Card className="p-4 border-red-200 dark:border-red-800">
								<CardHeader>
									<div className="flex items-center space-x-2">
										<AlertTriangle className="h-5 w-5 text-red-600" />
										<h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
											Danger Zone
										</h3>
									</div>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										Irreversible and destructive actions
									</p>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<h4 className="text-sm font-medium text-red-800 dark:text-red-200">
														Delete Organization
													</h4>
													<p className="text-sm text-red-700 dark:text-red-300 mt-1">
														Permanently delete this organization and all of its data. This action cannot be undone.
														All team members will be removed and lose access to the organization.
													</p>
													<div className="mt-3 text-xs text-red-600 dark:text-red-400">
														<p><strong>This will delete:</strong></p>
														<ul className="list-disc list-inside mt-1 space-y-1">
															<li>All leads and customer data</li>
															<li>All tasks and notes</li>
															<li>All team member access</li>
															<li>All organization settings</li>
															<li>All billing and subscription data</li>
														</ul>
													</div>
												</div>
												<Button
													variant="destructive"
													size="sm"
													onClick={() => setShowDeleteModal(true)}
													className="ml-4"
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Delete Organization
												</Button>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					<TabsContent value="sms-verification" className="space-y-4">
						{canManageSMS ? (
							<div className="space-y-6">
								{/* SMS Verification Status Overview */}
								{smsVerificationStatus && (
									<Card>
										<CardHeader>
											<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
												Verification Status
											</h3>
										</CardHeader>
										<CardContent>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="flex items-center space-x-3">
													<MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-400" />
													<div>
														<span className="font-medium text-gray-900 dark:text-white">A2P 10DLC</span>
														<div className="text-sm text-gray-600 dark:text-gray-400">
															{smsVerificationStatus.a2p.status || 'Not Started'}
														</div>
													</div>
												</div>
												<div className="flex items-center space-x-3">
													<Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
													<div>
														<span className="font-medium text-gray-900 dark:text-white">Toll-Free</span>
														<div className="text-sm text-gray-600 dark:text-gray-400">
															{smsVerificationStatus.tollfree.status || 'Not Started'}
														</div>
													</div>
												</div>
											</div>
										</CardContent>
									</Card>
								)}

								{/* SMS Verification Forms */}
								<div className="space-y-6">
									<BrandForm 
										orgId={user?.organization_id || ''} 
										onSave={() => fetchSmsVerificationStatus()}
										userRole={user?.role}
									/>
									<CampaignForm 
										orgId={user?.organization_id || ''} 
										onSave={() => fetchSmsVerificationStatus()}
										onSubmit10DLC={() => fetchSmsVerificationStatus()}
										userRole={user?.role}
									/>
									<TollFreeForm 
										orgId={user?.organization_id || ''} 
										onSubmit={() => fetchSmsVerificationStatus()}
										userRole={user?.role}
									/>
								</div>
							</div>
						) : (
							<Card>
								<CardContent className="p-6">
									<div className="text-center">
										<Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
										<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
											SMS Verification
										</h3>
						<p className="text-gray-600 dark:text-gray-400">
							Only organization owners and admins can manage SMS verification settings.
						</p>
									</div>
								</CardContent>
							</Card>
						)}
					</TabsContent>
				</Tabs>
			</div>

			{/* Delete Organization Confirmation Modal */}
			<DangerConfirmationModal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				onConfirm={handleDeleteOrganization}
				title="Delete Organization"
				confirmText="Delete Organization"
				organizationName={organization?.name || ''}
				isLoading={isDeleting}
			/>
		</>
	);
}

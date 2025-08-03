import { useState, useEffect, ChangeEvent } from 'react';
import useAuth from '../../hooks/useAuth';
import type { Organization, TeamMember } from '../../types/leads';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Tabs, TabsContent, TabsList } from '../../components/ui/tabs';
import { Calendar, Users, Building2, Shield, Trash2, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabaseClient';
import { HttpError } from '../../utils/error';
import { api } from '../../utils/api';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '../../components/ui/select';
import Input from '../../components/form/input/InputField';

interface PendingInvitation {
	id: string;
	email: string;
	role: 'admin' | 'analyst' | 'viewer';
	status: 'pending';
	created_at: string;
	invited_by: string;
	inviter: {
		first_name: string;
		last_name: string;
	};
}

export default function OrganizationPage() {
	const { user } = useAuth();
	const [activeTab, setActiveTab] = useState('overview');
	const [organization, setOrganization] = useState<Organization | null>(null);
	const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
	const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviteRole, setInviteRole] = useState('analyst');
	const [isInviting, setIsInviting] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const fetchOrganizationData = async () => {
		setIsLoading(true);
		try {
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
					status
				`
				)
				.eq('id', user?.organization_id || '')
				.single();

			if (orgError || !org) throw new HttpError('No organization found', 404);
			setOrganization(org);

			// Get all team members for the organization
			const { data: members, error: membersError } = await supabase
				.from('team_members')
				.select('*, profile:profiles(*)')
				.eq('organization_id', org.id);

			if (membersError) throw new HttpError('Failed to fetch team members', 500);
			setTeamMembers(
				members.map((member) => {
					let avatarUrl = '';
					const { data: imageUrl } = supabase.storage
						.from('avatars')
						.getPublicUrl(member.profile.avatar);

					if (imageUrl?.publicUrl) {
						avatarUrl = imageUrl.publicUrl;
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
					inviter:profiles!organization_invites_invited_by_fkey(
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
						role: invite.role as 'admin' | 'analyst' | 'viewer',
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const isAdmin = teamMembers.find((member) => member.profile.id === user?.id)?.role === 'admin';

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
			console.log(
				'Sending invitation to:',
				inviteEmail,
				'with role:',
				inviteRole,
				'for org:',
				organization?.id
			);

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
		if (!confirm('Are you sure you want to remove this team member?')) return;

		try {
			const { error } = await supabase.from('team_members').delete().eq('id', memberId);
			if (error) throw new Error('Failed to remove team member');
			toast.success('Team member removed successfully');
			fetchOrganizationData();
		} catch (error) {
			console.error('Error removing team member:', error);
			toast.error('Failed to remove team member');
		}
	};

	const handleUpdateRole = async (memberId: string, newRole: string) => {
		try {
			const { error } = await supabase
				.from('team_members')
				.update({ role: newRole })
				.eq('id', memberId);
			if (error) throw new Error('Failed to update role');
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

	if (isLoading) {
		return <div className="container mx-auto px-4 py-8">Loading...</div>;
	}

	if (!organization) {
		return <div className="container mx-auto px-4 py-8">No organization found.</div>;
	}

	return (
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
									<h3 className="font-semibold">Admin Team</h3>
								</div>
							</CardHeader>
							<CardContent>
								<p className="mt-2 text-2xl font-bold">
									{teamMembers.filter((member) => member.role === 'admin').length}
								</p>
								<p className="text-sm text-gray-500">Administrators</p>
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
					{isAdmin && (
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
										onChange={(e: ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
										className="flex-1"
									/>
									<Select
										value={inviteRole}
										onValueChange={(value: string) => setInviteRole(value)}
									>
										<SelectTrigger className="h-11 w-[180px] border border-gray-200 bg-white dark:border-gray-900 dark:bg-white/[0.03]">
											<SelectValue placeholder="Select role" />
										</SelectTrigger>
										<SelectContent className="cursor-pointer bg-white text-gray-700 ring-1 ring-gray-300 ring-inset dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700">
											<SelectItem value="admin">As admin</SelectItem>
											<SelectItem value="analyst">As analyst</SelectItem>
											<SelectItem value="viewer">As viewer</SelectItem>
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
								<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
									{pendingInvitations.map((invitation) => (
										<Card key={invitation.id} className="border-dashed p-4">
											<div className="flex items-center gap-4">
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
												{isAdmin && (
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
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{teamMembers.map((member) => (
									<Card key={member.id} className="p-4">
										<div className="flex items-center gap-4">
											<Avatar>
												<AvatarImage src={member.profile.avatar} />
												<AvatarFallback>
													{member.profile.first_name[0]}
													{member.profile.last_name[0]}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1">
												<h3 className="font-semibold">
													{member.profile.first_name} {member.profile.last_name}
												</h3>
												<p className="text-sm text-gray-500 capitalize">{member.role}</p>
											</div>
											{isAdmin && member.profile.id !== user?.id && (
												<div className="flex gap-2">
													<Select
														value={member.role}
														onValueChange={(value: string) =>
															handleUpdateRole(member.id, value)
														}
													>
														<SelectTrigger className="h-11 w-[100px] border border-gray-200 bg-white dark:border-gray-900 dark:bg-white/[0.03]">
															<SelectValue />
														</SelectTrigger>
														<SelectContent className="cursor-pointer bg-white text-gray-700 ring-1 ring-gray-300 ring-inset dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700">
															<SelectItem value="analyst">Analyst</SelectItem>
															<SelectItem value="admin">Admin</SelectItem>
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
										disabled={!isAdmin}
										className="mt-1"
									/>
								</div>
								<div>
									<label className="text-sm font-medium">Max Seats</label>
									<div className="mt-1 flex items-center gap-2">{organization.maxSeats}</div>
								</div>
								{isAdmin && (
									<div className="flex items-center gap-3">
										<Button size="sm" className="mt-4" variant="outline">
											Save Changes
										</Button>
										<Button size="sm" className="mt-4">
											Upgrade
										</Button>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}

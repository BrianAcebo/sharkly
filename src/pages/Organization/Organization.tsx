import { useState, useEffect, ChangeEvent } from 'react';
import useAuth from '../../hooks/useAuth';
import type { SeatSummary } from '../../types/organization';
import { formatCurrency } from '../../utils/format';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Tabs, TabsContent, TabsList } from '../../components/ui/tabs';
import {
    Calendar,
    Users,
    Building2,
    Shield,
    Trash2,
    UserPlus,
    AlertTriangle,
    CreditCard,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
// import { Modal } from '../../components/ui/modal';
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
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
    // AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '../../components/ui/alert-dialog';

interface Organization {
	id: string;
	name: string;
	maxSeats: number;
	createdAt: string;
	ownerId: string;
	updatedAt: string;
	status: string;
}

interface TeamMember {
	id: string;
	email: string;
	role: string;
	createdAt: string;
	updatedAt: string;
	profile: {
		id: string;
		first_name: string;
		last_name: string;
		avatar: string;
	};
}

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
	const { setTitle } = useBreadcrumbs();
	const [seatSummary, setSeatSummary] = useState<SeatSummary | null>(null);
	const [isSeatSummaryLoading, setIsSeatSummaryLoading] = useState(false);
	const [seatError, setSeatError] = useState<string | null>(null);
	const [purchaseQuantity, setPurchaseQuantity] = useState(1);
	const [releaseQuantity, setReleaseQuantity] = useState(1);
	const [isSeatActionLoading, setIsSeatActionLoading] = useState(false);
	const [showPurchaseModal, setShowPurchaseModal] = useState(false);
	const [showReleaseModal, setShowReleaseModal] = useState(false);

	useEffect(() => {
		if (!seatSummary) {
			setReleaseQuantity(1);
			return;
		}

		setReleaseQuantity((prev) => {
			if (prev < 1) return 1;
			if (prev > seatSummary.extraSeatsPurchased && seatSummary.extraSeatsPurchased > 0) {
				return seatSummary.extraSeatsPurchased;
			}
			if (seatSummary.extraSeatsPurchased === 0) {
				return 1;
			}
			return prev;
		});
		setPurchaseQuantity((prev) => (prev < 1 ? 1 : prev));
	}, [seatSummary]);

	useEffect(() => {
		setTitle('Organization');
		// Fetch organization status on component mount
		getOrganizationStatus();
	}, [setTitle, getOrganizationStatus]);

	const fetchSeatSummary = async (orgId: string): Promise<SeatSummary | null> => {
		setIsSeatSummaryLoading(true);
		setSeatError(null);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();

			if (!session?.access_token) {
				setSeatError('Not authenticated');
				return null;
			}

            const response = await api.get(`/api/organizations/${orgId}/seats`, {
				headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				setSeatError(err?.error || 'Failed to load seat summary');
				setSeatSummary(null);
				return null;
			}

			const data = (await response.json()) as { summary: SeatSummary };
			setSeatSummary(data.summary);
			return data.summary;
		} catch (error) {
			console.error('Error loading seat summary:', error);
			setSeatError(error instanceof Error ? error.message : 'Failed to load seat summary');
			setSeatSummary(null);
			return null;
		} finally {
			setIsSeatSummaryLoading(false);
		}
	};

	const performSeatMutation = async (
		path: string,
		payload: { quantity: number; reason: string }
	) => {
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (!session?.access_token) {
				toast.error('Not authenticated');
				return null;
			}

			setIsSeatActionLoading(true);

            const response = await api.post(path, payload, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                }
            });

			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err?.error || 'Seat update failed');
			}

			const data = (await response.json()) as { summary: SeatSummary };
			setSeatSummary(data.summary);
			return data.summary;
		} catch (error) {
			console.error('Seat update error:', error);
			toast.error(error instanceof Error ? error.message : 'Seat update failed');
			return null;
		} finally {
			setIsSeatActionLoading(false);
		}
	};

	const handleSeatPurchase = () => {
		if (!seatSummary) {
			toast.error('Seat summary unavailable');
			return;
		}
		if (!organization?.id) {
			toast.error('Organization not found');
			return;
		}

		if (purchaseQuantity <= 0) {
			toast.error('Quantity must be greater than zero');
			return;
		}

		if (
			seatSummary.extraSeatsRemainingBeforeUpgrade !== null &&
			purchaseQuantity > seatSummary.extraSeatsRemainingBeforeUpgrade
		) {
			toast.error(
				`You can only purchase up to ${seatSummary.extraSeatsRemainingBeforeUpgrade} additional seat${seatSummary.extraSeatsRemainingBeforeUpgrade === 1 ? '' : 's'} before needing to upgrade.`
			);
			return;
		}

		setShowPurchaseModal(true);
	};

	const handleSeatRelease = () => {
		if (!organization?.id) {
			toast.error('Organization not found');
			return;
		}

		if (!seatSummary) {
			toast.error('Seat summary unavailable');
			return;
		}

		if (releaseQuantity <= 0) {
			toast.error('Quantity must be greater than zero');
			return;
		}

		if (releaseQuantity > seatSummary.extraSeatsPurchased) {
			toast.error(
				`You only have ${seatSummary.extraSeatsPurchased} extra seat${seatSummary.extraSeatsPurchased === 1 ? '' : 's'} to release.`
			);
			return;
		}

		setShowReleaseModal(true);
	};

	const confirmSeatPurchase = async () => {
		if (!organization?.id) {
			toast.error('Organization not found');
			return;
		}

		const summary = await performSeatMutation(
			`/api/organizations/${organization.id}/seats/purchase`,
			{
				quantity: purchaseQuantity,
				reason: 'manual_purchase'
			}
		);

		if (summary) {
			toast.success(
				`Added ${purchaseQuantity} seat${purchaseQuantity === 1 ? '' : 's'} successfully`
			);
			setPurchaseQuantity(1);
			setShowPurchaseModal(false);
		}
	};

	const confirmSeatRelease = async () => {
		if (!organization?.id) {
			toast.error('Organization not found');
			return;
		}

		const summary = await performSeatMutation(
			`/api/organizations/${organization.id}/seats/release`,
			{
				quantity: releaseQuantity,
				reason: 'manual_release'
			}
		);

		if (summary) {
			toast.success(
				`Released ${releaseQuantity} seat${releaseQuantity === 1 ? '' : 's'} successfully`
			);
			setReleaseQuantity(1);
			setShowReleaseModal(false);
		}
	};

	const handlePurchaseModalChange = (open: boolean) => {
		if (!open && isSeatActionLoading) {
			return;
		}
		setShowPurchaseModal(open);
	};

	const handleReleaseModalChange = (open: boolean) => {
		if (!open && isSeatActionLoading) {
			return;
		}
		setShowReleaseModal(open);
	};

	const purchaseSubtotalCents =
		seatSummary?.extraSeatUnitPriceCents !== null && seatSummary?.extraSeatUnitPriceCents !== undefined
			? seatSummary.extraSeatUnitPriceCents * purchaseQuantity
			: null;

	const purchaseNewCapacity = seatSummary ? seatSummary.capacity + purchaseQuantity : null;
	const releaseNewCapacity = seatSummary ? seatSummary.capacity - releaseQuantity : null;
	const releaseRemainingExtras = seatSummary
		? Math.max(0, seatSummary.extraSeatsPurchased - releaseQuantity)
		: null;
	const purchaseBillingCopy = seatSummary?.extraSeatUnitPriceCents !== null
		? 'We’ll add the new seats to your monthly invoice and adjust the current cycle automatically.'
		: 'Extra seats are billed as an add-on to your active subscription.';
	const releaseBillingCopy =
		'We’ll adjust your subscription right away. Any credit from unused time will appear on your next invoice.';
	const formattedPurchaseSubtotal = purchaseSubtotalCents !== null ? formatCurrency(purchaseSubtotalCents) : null;

	const purchaseConfirmation = (
		<AlertDialog open={showPurchaseModal} onOpenChange={handlePurchaseModalChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirm Seat Purchase</AlertDialogTitle>
				</AlertDialogHeader>
				<div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
					<p>
						You&apos;re about to add {purchaseQuantity} extra seat{purchaseQuantity === 1 ? '' : 's'}.{` `}
						We’ll sync this change to your subscription immediately.
					</p>
					{seatSummary?.extraSeatUnitPriceCents !== null && formattedPurchaseSubtotal && (
						<p>
							<strong>{formattedPurchaseSubtotal}</strong> is the monthly total for these seats. We’ll handle any proration automatically.
						</p>
					)}
					<p>{purchaseBillingCopy}</p>
					{purchaseNewCapacity !== null && seatSummary && (
						<p>
							Your seat capacity will increase to <strong>{purchaseNewCapacity}</strong> (currently{' '}
							{seatSummary.capacity}).
						</p>
					)}
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isSeatActionLoading}>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={confirmSeatPurchase} disabled={isSeatActionLoading}>
						{isSeatActionLoading ? 'Processing…' : 'Confirm Purchase'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);

	const releaseConfirmation = (
		<AlertDialog open={showReleaseModal} onOpenChange={handleReleaseModalChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirm Seat Release</AlertDialogTitle>
				</AlertDialogHeader>
				<div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
					<p>
						Releasing {releaseQuantity} extra seat{releaseQuantity === 1 ? '' : 's'} reduces your capacity right away. We’ll sync the change to your subscription automatically.
					</p>
					<p>{releaseBillingCopy}</p>
					{releaseNewCapacity !== null && releaseRemainingExtras !== null && seatSummary && (
						<ul className="space-y-1">
							<li>
								Capacity will drop to <strong>{releaseNewCapacity}</strong> (currently{' '}
								{seatSummary.capacity}).
							</li>
							<li>Extra seats remaining after this change: {releaseRemainingExtras}.</li>
						</ul>
					)}
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isSeatActionLoading}>Keep Seats</AlertDialogCancel>
					<AlertDialogAction onClick={confirmSeatRelease} disabled={isSeatActionLoading}>
						{isSeatActionLoading ? 'Processing…' : 'Confirm Release'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
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
					status
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
						role: invite.role as TeamMemberRole,
						status: invite.status as 'pending',
						created_at: invite.created_at,
						invited_by: invite.invited_by,
						inviter: Array.isArray(invite.inviter) ? invite.inviter[0] : invite.inviter
					})
				);
				setPendingInvitations(transformedInvites);
			}

			if (org.id) {
				fetchSeatSummary(org.id);
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

	const isAdmin = user?.role === 'admin';
	const canManageSeats = isOwner || isAdmin;
	const seatUsageLabel = seatSummary
		? `${seatSummary.assignedSeats} of ${seatSummary.capacity} seats used`
		: `${teamMembers.length} of ${organization?.maxSeats ?? 0} seats used`;

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
			let latestSummary = seatSummary;
			if ((!latestSummary || typeof latestSummary.capacity !== 'number') && organization?.id) {
				latestSummary = await fetchSeatSummary(organization.id);
			}
			if (latestSummary && latestSummary.assignedSeats >= latestSummary.capacity) {
				toast.error('No seats available. Purchase additional seats before inviting new members.');
				return;
			}

			await api.post('/api/organizations/invite', {
				email: inviteEmail,
				role: inviteRole
			});

			toast.success(`Invitation sent to ${inviteEmail}`);
			setInviteEmail('');
			if (organization?.id) {
				await fetchSeatSummary(organization.id);
			}
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

	const seatsCard = (
		<Card className="p-4">
			<CardHeader>
				<div className="flex items-center gap-2">
					<Users className="h-5 w-5 text-gray-500" />
					<h3 className="font-semibold">Seats</h3>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{isSeatSummaryLoading ? (
					<div className="py-4 text-sm text-gray-500">Loading seat usage…</div>
				) : seatSummary ? (
					<>
						<div className="space-y-3 text-sm">
							<div className="flex items-center justify-between">
								<span className="text-gray-500">Seats used</span>
								<span className="font-semibold text-gray-900 dark:text-gray-100">
									{seatSummary.assignedSeats} / {seatSummary.capacity}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-gray-500">Included seats</span>
								<span>{seatSummary.includedSeats}</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-gray-500">Extra seats</span>
								<span>{seatSummary.extraSeatsPurchased}</span>
							</div>
							{seatSummary.extraSeatUnitPriceCents !== null && (
								<div className="flex items-center justify-between">
									<span className="text-gray-500">Extra seat price</span>
									<span>{formatCurrency(seatSummary.extraSeatUnitPriceCents)}</span>
								</div>
							)}
							{seatSummary.extraSeatMonthlyCostCents !== null &&
								seatSummary.extraSeatMonthlyCostCents > 0 && (
									<div className="flex items-center justify-between">
										<span className="text-gray-500">Extra seat total</span>
										<span>{formatCurrency(seatSummary.extraSeatMonthlyCostCents)}</span>
									</div>
								)}
							{seatSummary.upgradeMessage && (
								<div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
									{seatSummary.upgradeMessage}
								</div>
							)}
						</div>

						{canManageSeats && (
						<div className="space-y-3 border-t pt-4">
								<div>
									<div className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">
										Add extra seats
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<Input
											type="number"
											min={"1"}
											value={String(purchaseQuantity)}
											onChange={(event) => {
												const next = parseInt(event.target.value, 10);
												setPurchaseQuantity(Number.isNaN(next) || next < 1 ? 1 : next);
											}}
											className="w-24"
											disabled={isSeatActionLoading}
										/>
				<Button onClick={handleSeatPurchase} disabled={isSeatActionLoading}>
					{isSeatActionLoading ? 'Processing…' : 'Purchase Seats'}
				</Button>
									</div>
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
										{seatSummary.extraSeatUnitPriceCents !== null
											? `Each extra seat costs ${formatCurrency(seatSummary.extraSeatUnitPriceCents)} per billing period.`
											: 'Extra seat pricing is determined by your current plan.'}
									</p>
								</div>
							<div className="border-t pt-4">
									<div className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">
										Release extra seats
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<Input
											type="number"
											min={"1"}
											max={seatSummary.extraSeatsPurchased ? String(seatSummary.extraSeatsPurchased) : undefined}
											value={String(releaseQuantity)}
											onChange={(event) => {
												const next = parseInt(event.target.value, 10);
												if (Number.isNaN(next) || next < 1) {
													setReleaseQuantity(1);
													return;
												}
												setReleaseQuantity(next);
											}}
											className="w-24"
											disabled={isSeatActionLoading || seatSummary.extraSeatsPurchased === 0}
										/>
				<Button
					onClick={handleSeatRelease}
					disabled={
						isSeatActionLoading ||
						seatSummary.extraSeatsPurchased === 0 ||
						releaseQuantity < 1
					}
					variant="outline"
				>
					{isSeatActionLoading ? 'Processing…' : 'Release Seats'}
				</Button>
									</div>
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
										You currently have {seatSummary.extraSeatsPurchased} extra seat
										{seatSummary.extraSeatsPurchased === 1 ? '' : 's'}.
									</p>
								</div>
							</div>
						)}
					</>
				) : seatError ? (
					<div className="py-4 text-sm text-red-500">{seatError}</div>
				) : (
					<div className="py-4 text-sm text-gray-500">No seat data</div>
				)}
		</CardContent>
	</Card>
	);

	return (
		<>
			<PageMeta title={organization.name} description="Manage your organization and team members" />
			<div className="container mx-auto py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">{organization.name}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
						<div className="flex items-center gap-1">
							<Building2 className="h-4 w-4" />
							<span>Organization ID: {organization.id}</span>
						</div>
						<div className="flex items-center gap-1">
							<Users className="h-4 w-4" />
							<span>{seatUsageLabel}</span>
						</div>
						<div className="flex items-center gap-1">
							<Calendar className="h-4 w-4" />
                            <span>Created {new Date(String(organization.createdAt)).toLocaleDateString()}</span>
						</div>
					</div>
				</div>

				{purchaseConfirmation}
				{releaseConfirmation}

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
                                            (new Date().getTime() - new Date(String(organization.createdAt)).getTime()) /
												(1000 * 60 * 60 * 24 * 30)
										)}
									</p>
									<p className="text-sm text-gray-500">Months since creation</p>
								</CardContent>
							</Card>
						</div>
						{seatsCard}
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
												<span
													className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
														orgStatus === 'active'
															? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
															: orgStatus === 'paused'
																? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
																: orgStatus === 'disabled'
																	? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
																	: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
													}`}
												>
													{orgStatus === 'active'
														? 'Active'
														: orgStatus === 'paused'
															? 'Paused'
															: orgStatus === 'disabled'
																? 'Disabled'
																: 'Unknown'}
												</span>
											</div>
										</div>
										{/* Manual pause/resume controls removed - status is automated via Stripe */}
									</div>
									{orgStatus === 'paused' && (
										<div className="rounded-md bg-orange-50 p-3 text-sm text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
											<AlertTriangle className="mr-1 inline h-4 w-4" />
											{canResumeOrganization ? (
												<>
													Organization is paused. All features are in read-only mode. You can resume
													when ready.
												</>
											) : (
												<>
													Organization is paused due to payment issues. Please resolve payment
													problems to resume service.
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
										<div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
											<AlertTriangle className="mr-1 inline h-4 w-4" />
											Organization is disabled. All features are in read-only mode.
										</div>
									)}
									{(orgStatus === 'payment_required' || orgStatus === 'past_due') && (
										<div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
											<CreditCard className="mr-1 inline h-4 w-4" />
											{getOrganizationStatusMessage(
												paymentStatus?.organization as unknown as import('../../types/billing').OrganizationRow
											)}
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
											className="border-blue-300 text-blue-600 hover:bg-blue-50"
										>
											<CreditCard className="mr-1 h-4 w-4" />
											View Billing
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
											onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
										/>
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
						{/* TODO: Improve with soft delete */}
						{/* {isOwner && (
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
						)} */}
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

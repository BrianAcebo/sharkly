import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { emailService } from '../utils/email.js';
import {
    getSeatCapacity,
    loadSeatSummary,
    recordSeatEvent,
    updateOrgMaxSeats,
    syncExtraSeatAddon
} from '../utils/seats.js';

interface InviteTeamMemberRequest {
	email: string;
	role: 'admin' | 'member';
}

interface AcceptInvitationRequest {
	inviteId: string;
}

export const createOrganization = async (req: Request, res: Response) => {
	try {
		const { name, maxSeats, userId } = req.body as {
			name: string;
			maxSeats: number;
			userId: string;
		};

		if (!name || !maxSeats || !userId) {
			return res.status(400).json({ error: 'Missing required fields' });
		}

		// Create the organization
		const { data: organization, error: orgError } = await supabase
			.from('organizations')
			.insert({
				name,
				max_seats: maxSeats,
				owner_id: userId
			})
			.select()
			.single();

		if (orgError) {
			console.error('Error creating organization:', orgError);
			return res.status(500).json({ error: 'Failed to create organization' });
		}

		// Add the user as a manager of the organization
		const { error: userOrgError } = await supabase
			.from('user_organizations')
			.insert({
				user_id: userId,
				organization_id: organization.id,
				role: 'admin'
			});

		if (userOrgError) {
			console.error('Error adding user as manager to user_organizations:', userOrgError);
			// Try to clean up the organization if adding manager fails
			await supabase.from('organizations').delete().eq('id', organization.id);
			return res.status(500).json({ error: 'Failed to create organization' });
		}

		return res.json({ organizationId: organization.id });
	} catch (error) {
		console.error('Error creating organization:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const getSeatSummary = async (req: Request, res: Response) => {
	try {
		const { organizationId } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		if (!organizationId) {
			return res.status(400).json({ error: 'Organization ID is required' });
		}

		const { data: membership, error: membershipError } = await supabase
			.from('user_organizations')
			.select('role')
			.eq('organization_id', organizationId)
			.eq('user_id', userId)
			.single();

		if (membershipError || !membership) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const summary = await loadSeatSummary(organizationId);
		return res.json({ summary });
	} catch (error) {
		console.error('Error fetching seat summary:', error);
		return res.status(500).json({ error: 'Failed to fetch seat summary' });
	}
};

export const purchaseSeats = async (req: Request, res: Response) => {
	try {
		const { organizationId } = req.params;
		const { quantity, reason } = req.body as { quantity: number; reason?: string };
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		if (!organizationId) {
			return res.status(400).json({ error: 'Organization ID is required' });
		}

		if (!quantity || quantity <= 0) {
			return res.status(400).json({ error: 'Quantity must be greater than zero' });
		}

		const { data: membership, error: membershipError } = await supabase
			.from('user_organizations')
			.select('role')
			.eq('organization_id', organizationId)
			.eq('user_id', userId)
			.single();

		if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
			return res.status(403).json({ error: 'Only owners or admins can purchase seats' });
		}

	const summary = await loadSeatSummary(organizationId);

	if (summary.nextPlan && summary.extraSeatsRemainingBeforeUpgrade !== null) {
		const { extraSeatsRemainingBeforeUpgrade: extraSeatsRemaining } = summary;

		if (extraSeatsRemaining <= 0) {
			return res.status(400).json({
				error: `You have reached the maximum additional seats for your current plan. Please upgrade to the ${summary.nextPlan.name} plan.`
			});
		}

		if (quantity > extraSeatsRemaining) {
			return res.status(400).json({
				error: `You can only purchase up to ${extraSeatsRemaining} additional seat${extraSeatsRemaining === 1 ? '' : 's'} before needing to upgrade.`
			});
		}
	}

	const newCapacity = summary.includedSeats + summary.extraSeatsPurchased + quantity;

		await updateOrgMaxSeats(organizationId, newCapacity);
		await recordSeatEvent({
			orgId: organizationId,
			seatId: null,
			action: 'purchase',
			delta: quantity,
			reason: reason || 'manual_purchase'
		});

    let updatedSummary = await loadSeatSummary(organizationId);

		if (updatedSummary.extraSeatAddonPriceId && updatedSummary.stripeSubscriptionId) {
			await syncExtraSeatAddon({
				orgId: organizationId,
				stripeSubscriptionId: updatedSummary.stripeSubscriptionId,
				addonPriceId: updatedSummary.extraSeatAddonPriceId,
				quantity: updatedSummary.extraSeatsPurchased
			});

			updatedSummary = await loadSeatSummary(organizationId);
		}

        return res.json({ summary: updatedSummary });
	} catch (error) {
		console.error('Error purchasing seats:', error);
		return res.status(500).json({ error: 'Failed to purchase seats' });
	}
};

export const releaseSeats = async (req: Request, res: Response) => {
	try {
		const { organizationId } = req.params;
		const { quantity, reason } = req.body as { quantity: number; reason?: string };
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		if (!organizationId) {
			return res.status(400).json({ error: 'Organization ID is required' });
		}

		if (!quantity || quantity <= 0) {
			return res.status(400).json({ error: 'Quantity must be greater than zero' });
		}

		const { data: membership, error: membershipError } = await supabase
			.from('user_organizations')
			.select('role')
			.eq('organization_id', organizationId)
			.eq('user_id', userId)
			.single();

		if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
			return res.status(403).json({ error: 'Only owners or admins can release seats' });
		}

		const summary = await loadSeatSummary(organizationId);

		const maxReleasable = Math.max(0, summary.extraSeatsPurchased);

		if (quantity > maxReleasable) {
			return res.status(400).json({
				error: `Cannot release more than ${maxReleasable} extra seat${maxReleasable === 1 ? '' : 's'}`
			});
		}

		const newCapacity = summary.capacity - quantity;

		if (newCapacity < summary.includedSeats) {
			return res.status(400).json({
				error: 'Cannot release seats below included plan limits'
			});
		}

		if (summary.assignedSeats > newCapacity) {
			return res.status(400).json({
				error: 'Cannot release seats below number of assigned members'
			});
		}

		await updateOrgMaxSeats(organizationId, newCapacity);
		await recordSeatEvent({
			orgId: organizationId,
			seatId: null,
			action: 'release',
			delta: -quantity,
			reason: reason || 'manual_release'
		});

	let updatedSummary = await loadSeatSummary(organizationId);

	if (updatedSummary.extraSeatAddonPriceId && updatedSummary.stripeSubscriptionId) {
		await syncExtraSeatAddon({
			orgId: organizationId,
			stripeSubscriptionId: updatedSummary.stripeSubscriptionId,
			addonPriceId: updatedSummary.extraSeatAddonPriceId,
			quantity: updatedSummary.extraSeatsPurchased
		});

		updatedSummary = await loadSeatSummary(organizationId);
	}

	return res.json({ summary: updatedSummary });
	} catch (error) {
		console.error('Error releasing seats:', error);
		return res.status(500).json({ error: 'Failed to release seats' });
	}
};

export const inviteTeamMember = async (req: Request, res: Response) => {
	try {
		const { email, role } = req.body as InviteTeamMemberRequest;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		// Get the organization ID from the request body
		const organizationId = req.body.organization?.id;

		if (!organizationId) {
			return res.status(400).json({ error: 'Organization ID is required' });
		}

		// Verify the organization exists and user is owner
	const { data: organization, error: orgError } = await supabase
		.from('organizations')
		.select('id, name, owner_id')
			.eq('id', organizationId)
			.single();

		if (orgError || !organization) {
			return res.status(404).json({ error: 'Organization not found' });
		}

		// Check if the user is the owner of this organization
		if (organization.owner_id !== userId) {
			return res.status(403).json({ error: 'Only the organization owner can invite team members' });
		}

		// Check if the email is already invited
		const { data: existingInvite } = await supabase
			.from('organization_invites')
			.select('id')
			.eq('email', email)
			.eq('organization_id', organization.id)
			.single();

		if (existingInvite) {
			return res.status(400).json({ error: 'User already invited' });
		}

	const [capacity, pendingInviteResult] = await Promise.all([
		getSeatCapacity(organization.id),
		supabase
			.from('organization_invites')
			.select('id')
			.eq('organization_id', organization.id)
			.eq('status', 'pending')
	]);

		if ('error' in pendingInviteResult && pendingInviteResult.error) {
			console.error('Error fetching pending invitations:', pendingInviteResult.error);
			return res.status(500).json({ error: 'Failed to prepare invitation' });
		}

		const pendingCount = 'data' in pendingInviteResult && Array.isArray(pendingInviteResult.data)
			? pendingInviteResult.data.length
			: 0;

	if (capacity.assignedSeats + pendingCount >= capacity.capacity) {
		return res.status(400).json({
			error: 'No seats available. Purchase additional seats before inviting new members.'
		});
	}

		// Create invitation
		const { data: invite, error: createError } = await supabase
			.from('organization_invites')
			.insert({
				email,
				role,
				organization_id: organization.id,
				invited_by: userId,
				status: 'pending'
			})
			.select()
			.single();

		if (createError) {
			console.error('Error creating invitation:', createError);
			return res.status(500).json({ error: 'Failed to create invitation' });
		}

		// Send invitation email
		await emailService.sendTeamMemberInvite(email, organization.name, role, invite.id);

		return res.json({ message: 'Invitation sent successfully' });
	} catch (error) {
		console.error('Error inviting team member:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const acceptInvitation = async (req: Request, res: Response) => {
	try {
		const { inviteId } = req.body as AcceptInvitationRequest;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

	if (!inviteId) {
		return res.status(400).json({ error: 'Invitation ID is required' });
	}

	// Get the invitation
	const { data: invitation, error: inviteError } = await supabase
		.from('organization_invites')
		.select('*')
		.eq('id', inviteId)
		.single();

		if (inviteError || !invitation) {
			return res.status(404).json({ error: 'Invitation not found' });
		}

		// Check if invitation is still pending
		if (invitation.status !== 'pending') {
			return res.status(400).json({ error: 'Invitation has already been processed' });
		}

		// Check if invitation is expired (7 days)
		const createdAt = new Date(invitation.created_at);
		const now = new Date();
		const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

		if (daysDiff > 7) {
			return res.status(400).json({ error: 'Invitation has expired' });
		}

		// Check if user email matches invitation email
		const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

		if (authError || !authUser.user) {
			return res.status(401).json({ error: 'Authentication error' });
		}

		if (authUser.user.email !== invitation.email) {
			return res
				.status(403)
				.json({ error: 'This invitation was sent to a different email address' });
		}

		// Check if user is already a member of this organization
		const { data: existingMember } = await supabase
			.from('user_organizations')
			.select('id')
			.eq('organization_id', invitation.organization_id)
			.eq('user_id', userId)
			.single();

		if (existingMember) {
			return res.status(400).json({ error: 'You are already a member of this organization' });
		}

		// Check organization seat limit
	const capacity = await getSeatCapacity(invitation.organization_id);

	if (capacity.assignedSeats >= capacity.capacity) {
		return res
			.status(400)
			.json({ error: 'Organization has reached its maximum number of seats' });
	}

        // Add user to organization
		const { error: addError } = await supabase.from('user_organizations').insert({
			user_id: userId,
			organization_id: invitation.organization_id,
			role: invitation.role
		});

		if (addError) {
			console.error('Error adding team member:', addError);
			return res.status(500).json({ error: 'Failed to join organization' });
		}

        // Take a seat: ensure we haven't exceeded capacity
        const afterAddCapacity = await getSeatCapacity(invitation.organization_id);
        if (afterAddCapacity.assignedSeats > afterAddCapacity.capacity) {
            // Roll back membership if over capacity
            await supabase
                .from('user_organizations')
                .delete()
                .eq('organization_id', invitation.organization_id)
                .eq('user_id', userId);
            return res.status(400).json({ error: 'Organization has reached its maximum number of seats' });
        }

        // Ensure an active seat exists for this user (no phone number assignment needed)
        try {
            await supabase
                .from('seats')
                .insert({ org_id: invitation.organization_id, user_id: userId, status: 'active' });
        } catch (assignErr) {
            console.error('Failed to ensure seat on invitation accept:', assignErr);
        }

        // Update invitation status to accepted
		const { error: updateError } = await supabase
			.from('organization_invites')
			.update({ status: 'accepted' })
			.eq('id', inviteId);

		if (updateError) {
			console.error('Error updating invitation:', updateError);
			// Don't fail the whole operation if this fails
		}

		return res.json({ message: 'Successfully joined the organization' });
	} catch (error) {
		console.error('Error accepting invitation:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const cancelInvitation = async (req: Request, res: Response) => {
	try {
		const { inviteId } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		// Get the invitation
		const { data: invitation, error: inviteError } = await supabase
			.from('organization_invites')
			.select('organization_id, status')
			.eq('id', inviteId)
			.single();

		if (inviteError || !invitation) {
			return res.status(404).json({ error: 'Invitation not found' });
		}

		if (invitation.status !== 'pending') {
			return res.status(400).json({ error: 'Invitation has already been processed' });
		}

		// Check if the user is the owner of this organization
		const { data: organization, error: orgError } = await supabase
			.from('organizations')
			.select('owner_id')
			.eq('id', invitation.organization_id)
			.single();

		if (orgError || !organization) {
			return res.status(404).json({ error: 'Organization not found' });
		}

		if (organization.owner_id !== userId) {
			return res.status(403).json({ error: 'Only the organization owner can cancel invitations' });
		}

		// Update invitation status to expired
		const { error: updateError } = await supabase
			.from('organization_invites')
			.update({ status: 'expired' })
			.eq('id', inviteId);

		if (updateError) {
			return res.status(500).json({ error: 'Failed to cancel invitation' });
		}

		return res.json({ message: 'Invitation cancelled successfully' });
	} catch (error) {
		console.error('Error cancelling invitation:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const deleteOrganization = async (req: Request, res: Response) => {
	try {
		const { organizationId } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		if (!organizationId) {
			return res.status(400).json({ error: 'Organization ID is required' });
		}

		// Get the organization and verify ownership
		const { data: organization, error: orgError } = await supabase
			.from('organizations')
			.select('id, name, owner_id')
			.eq('id', organizationId)
			.single();

		if (orgError || !organization) {
			return res.status(404).json({ error: 'Organization not found' });
		}

		// Check if the user is the owner of this organization
		if (organization.owner_id !== userId) {
			return res.status(403).json({ error: 'Only the organization owner can delete the organization' });
		}

		// Get all team members to notify them before deletion
		const { data: teamMembers, error: membersError } = await supabase
			.from('user_organizations')
			.select('user_id, profile:profiles(email, first_name, last_name)')
			.eq('organization_id', organizationId);

		if (membersError) {
			console.error('Error fetching team members:', membersError);
		}

		// Delete all related data in the correct order to avoid foreign key constraints
		// 1. Delete organization invites
		const { error: invitesError } = await supabase
			.from('organization_invites')
			.delete()
			.eq('organization_id', organizationId);

		if (invitesError) {
			console.error('Error deleting organization invites:', invitesError);
		}

		// 2. Delete user organization relationships
		const { error: userOrgsError } = await supabase
			.from('user_organizations')
			.delete()
			.eq('organization_id', organizationId);

		if (userOrgsError) {
			console.error('Error deleting user organizations:', userOrgsError);
		}

		// 3. Delete the organization itself
		const { error: deleteError } = await supabase
			.from('organizations')
			.delete()
			.eq('id', organizationId);

		if (deleteError) {
			console.error('Error deleting organization:', deleteError);
			return res.status(500).json({ error: 'Failed to delete organization' });
		}

		// Send notification emails to all team members about organization deletion
		if (teamMembers && teamMembers.length > 0) {
			for (const member of teamMembers) {
				if (member.profile && member.user_id !== userId) {
					try {
						// Handle the case where profile might be an array
						const profile = Array.isArray(member.profile) ? member.profile[0] : member.profile;
						if (profile && profile.email && profile.first_name) {
							await emailService.sendOrganizationDeletedNotification(
								profile.email,
								organization.name,
								profile.first_name
							);
						}
					} catch (emailError) {
						console.error('Error sending deletion notification email:', emailError);
						// Don't fail the deletion if email sending fails
					}
				}
			}
		}

		return res.json({ message: 'Organization deleted successfully' });
	} catch (error) {
		console.error('Error deleting organization:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

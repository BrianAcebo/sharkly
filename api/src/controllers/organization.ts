import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient';
import { emailService } from '../utils/email';

interface InviteTeamMemberRequest {
	email: string;
	role: 'manager' | 'member';
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
				role: 'manager'
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
		const { data: organization } = await supabase
			.from('organizations')
			.select('max_seats')
			.eq('id', invitation.organization_id)
			.single();

		if (organization) {
			const { count: currentMembers } = await supabase
				.from('user_organizations')
				.select('*', { count: 'exact', head: true })
				.eq('organization_id', invitation.organization_id);

			if (currentMembers && currentMembers >= organization.max_seats) {
				return res
					.status(400)
					.json({ error: 'Organization has reached its maximum number of members' });
			}
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

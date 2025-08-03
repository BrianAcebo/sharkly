import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient';
import { emailService } from '../utils/email';

interface CreateOrganizationRequest {
	name: string;
	maxSeats: number;
	userId: string;
}

interface InviteTeamMemberRequest {
	email: string;
	role: 'admin' | 'analyst' | 'viewer';
}

interface UpdateRoleRequest {
	role: 'admin' | 'analyst' | 'viewer';
}

interface UpdateOrganizationRequest {
	name?: string;
	maxSeats?: number;
}

export const createOrganization = async (req: Request, res: Response) => {
	try {
		const { name, maxSeats, userId } = req.body as CreateOrganizationRequest;

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

		// Add the user as an admin of the organization
		const { error: invError } = await supabase
			.from('team_members')
			.insert({
				user_id: userId,
				organization_id: organization.id,
				role: 'admin'
			});

		if (invError) {
			console.error('Error adding user as admin to team_members:', invError);
			// Try to clean up the organization if adding admin fails
			await supabase.from('organizations').delete().eq('id', organization.id);
			return res.status(500).json({ error: 'Failed to create organization' });
		}

		// Also add the user to user_organizations table
		const { error: userOrgError } = await supabase
			.from('user_organizations')
			.insert({
				user_id: userId,
				organization_id: organization.id,
				role: 'admin'
			});

		if (userOrgError) {
			console.error('Error adding user as admin to user_organizations:', userOrgError);
			// Clean up team_members entry if user_organizations fails
			await supabase.from('team_members').delete().eq('user_id', userId).eq('organization_id', organization.id);
			await supabase.from('organizations').delete().eq('id', organization.id);
			return res.status(500).json({ error: 'Failed to create organization' });
		}

		// Update the user's profile with the organization ID
		const { error: profileError } = await supabase
			.from('profiles')
			.update({ organization_id: organization.id })
			.eq('id', userId);

		if (profileError) {
			console.error('Error updating user profile:', profileError);
			// Don't fail the whole operation if profile update fails
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

		// Get the organization ID from the request body (sent by the frontend)
		const organizationId = req.body.organization?.id;

		if (!organizationId) {
			return res.status(400).json({ error: 'Organization ID is required' });
		}

		// Verify the organization exists
		const { data: organization, error: orgError } = await supabase
			.from('organizations')
			.select('id, name')
			.eq('id', organizationId)
			.single();

		if (orgError || !organization) {
			return res.status(404).json({ error: 'Organization not found' });
		}

		// Check if the user is an admin of this organization
		const { data: teamMember, error: invError } = await supabase
			.from('team_members')
			.select('role')
			.eq('organization_id', organization.id)
			.eq('user_id', userId)
			.single();

		if (invError || !teamMember || teamMember.role !== 'admin') {
			return res.status(403).json({ error: 'Only admins can invite team members' });
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

export const deleteTeamMember = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		// Get the organization ID from the request body
		const organizationId = req.body.organization?.id;

		if (!organizationId) {
			return res.status(400).json({ error: 'Organization ID is required' });
		}

		// Verify the organization exists
		const { data: organization, error: orgError } = await supabase
			.from('organizations')
			.select('id')
			.eq('id', organizationId)
			.single();

		if (orgError || !organization) {
			return res.status(404).json({ error: 'Organization not found' });
		}

		// Check if the user is an admin
		const { data: teamMember, error: invError } = await supabase
			.from('team_members')
			.select('role')
			.eq('organization_id', organization.id)
			.eq('user_id', userId)
			.single();

		if (invError || !teamMember || teamMember.role !== 'admin') {
			return res.status(403).json({ error: 'Only admins can remove team members' });
		}

		// Check if trying to remove self
		if (id === userId) {
			return res.status(400).json({ error: 'Cannot remove yourself' });
		}

		// Delete the team member
		const { error: deleteError } = await supabase
			.from('team_members')
			.delete()
			.eq('id', id)
			.eq('organization_id', organization.id);

		if (deleteError) {
			return res.status(500).json({ error: 'Failed to remove team member' });
		}

		// Also remove from user_organizations table
		const { error: userOrgDeleteError } = await supabase
			.from('user_organizations')
			.delete()
			.eq('user_id', id)
			.eq('organization_id', organization.id);

		if (userOrgDeleteError) {
			console.error('Error removing user from user_organizations:', userOrgDeleteError);
			// Don't fail the whole operation if this fails, just log it
		}

		return res.json({ message: 'Team member removed successfully' });
	} catch (error) {
		console.error('Error deleting team member:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const updateTeamMemberRole = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { role } = req.body as UpdateRoleRequest;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		// Get the organization ID from the request body
		const organizationId = req.body.organization?.id;

		if (!organizationId) {
			return res.status(400).json({ error: 'Organization ID is required' });
		}

		// Verify the organization exists
		const { data: organization, error: orgError } = await supabase
			.from('organizations')
			.select('id')
			.eq('id', organizationId)
			.single();

		if (orgError || !organization) {
			return res.status(404).json({ error: 'Organization not found' });
		}

		// Check if the user is an admin
		const { data: teamMember, error: invError } = await supabase
			.from('team_members')
			.select('role')
			.eq('organization_id', organization.id)
			.eq('user_id', userId)
			.single();

		if (invError || !teamMember || teamMember.role !== 'admin') {
			return res.status(403).json({ error: 'Only admins can update team member roles' });
		}

		// Check if trying to update self
		if (id === userId) {
			return res.status(400).json({ error: 'Cannot update your own role' });
		}

		// Update the role
		const { error: updateError } = await supabase
			.from('team_members')
			.update({ role })
			.eq('id', id)
			.eq('organization_id', organization.id);

		if (updateError) {
			return res.status(500).json({ error: 'Failed to update role' });
		}

		// Also update the role in user_organizations table
		const { error: userOrgUpdateError } = await supabase
			.from('user_organizations')
			.update({ role })
			.eq('user_id', id)
			.eq('organization_id', organization.id);

		if (userOrgUpdateError) {
			console.error('Error updating role in user_organizations:', userOrgUpdateError);
			// Don't fail the whole operation if this fails, just log it
		}

		return res.json({ message: 'Role updated successfully' });
	} catch (error) {
		console.error('Error updating team member role:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const updateOrganization = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { name, maxSeats } = req.body as UpdateOrganizationRequest;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		// Get the organization
		const { data: organization, error: orgError } = await supabase
			.from('organizations')
			.select('id, owner_id')
			.eq('id', id)
			.single();

		if (orgError || !organization) {
			return res.status(404).json({ error: 'Organization not found' });
		}

		// Check if the user is the owner
		if (organization.owner_id !== userId) {
			return res.status(403).json({ error: 'Only the owner can update organization settings' });
		}

		// Update the organization
		const { error: updateError } = await supabase
			.from('organizations')
			.update({
				name,
				max_seats: maxSeats,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (updateError) {
			return res.status(500).json({ error: 'Failed to update organization' });
		}

		return res.json({ message: 'Organization updated successfully' });
	} catch (error) {
		console.error('Error updating organization:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const getOrganization = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { data: organization, error } = await supabase
			.from('organizations')
			.select('*')
			.eq('owner_id', id)
			.single();
		if (error || !organization) {
			return res.status(404).json({ error: 'Organization not found' });
		}
		return res.json({ organization });
	} catch (error) {
		console.error('Error fetching organization:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const getOrganizationTeamMembers = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		const { orgId } = req.params;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}
		// Check if user is a member of the organization
		const { data: membership } = await supabase
			.from('team_members')
			.select('id')
			.eq('organization_id', orgId)
			.eq('user_id', userId)
			.single();
		if (!membership) {
			return res.status(403).json({ error: 'Forbidden' });
		}
		// Fetch all team members for the organization
		const { data: teamMembers, error } = await supabase
			.from('team_members')
			.select('*, profile:profiles(*)')
			.eq('organization_id', orgId);
		if (error) {
			return res.status(500).json({ error: 'Failed to fetch team members' });
		}
		return res.json({ teamMembers });
	} catch (error) {
		console.error('Error fetching team members:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const acceptInvitation = async (req: Request, res: Response) => {
	try {
		const { inviteId } = req.body;
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
			.from('team_members')
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
				.from('team_members')
				.select('*', { count: 'exact', head: true })
				.eq('organization_id', invitation.organization_id);

			if (currentMembers && currentMembers >= organization.max_seats) {
				return res
					.status(400)
					.json({ error: 'Organization has reached its maximum number of members' });
			}
		}

		// Add user to organization as team member
		const { error: addError } = await supabase.from('team_members').insert({
			user_id: userId,
			organization_id: invitation.organization_id,
			role: invitation.role
		});

		if (addError) {
			console.error('Error adding team member:', addError);
			return res.status(500).json({ error: 'Failed to join organization' });
		}

		// Also add user to user_organizations table
		const { error: userOrgError } = await supabase.from('user_organizations').insert({
			user_id: userId,
			organization_id: invitation.organization_id,
			role: invitation.role
		});

		if (userOrgError) {
			console.error('Error adding user to user_organizations:', userOrgError);
			// Clean up team_members entry if user_organizations fails
			await supabase.from('team_members').delete().eq('user_id', userId).eq('organization_id', invitation.organization_id);
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

		// Check if the user is an admin of this organization
		const { data: teamMember, error: invError } = await supabase
			.from('team_members')
			.select('role')
			.eq('organization_id', invitation.organization_id)
			.eq('user_id', userId)
			.single();

		if (invError || !teamMember || teamMember.role !== 'admin') {
			return res.status(403).json({ error: 'Only admins can cancel invitations' });
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

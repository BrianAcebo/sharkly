import express from 'express';
import { requireAuth } from '../middleware/auth';
import {
	createOrganization,
	inviteTeamMember,
	acceptInvitation,
	cancelInvitation,
	deleteOrganization
} from '../controllers/organization';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Create a new organization
router.post('/create', createOrganization);

// Invite a new team member (send email)
router.post('/invite', inviteTeamMember);

// Accept an invitation
router.post('/accept-invite', acceptInvitation);

// Cancel an invitation
router.delete('/cancel-invite/:inviteId', cancelInvitation);

// Delete an organization
router.delete('/:organizationId', deleteOrganization);

export default router;

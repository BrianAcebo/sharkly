import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
	createOrganization,
	inviteTeamMember,
	acceptInvitation,
	cancelInvitation,
	deleteOrganization,
	getSeatSummary,
	purchaseSeats,
	releaseSeats,
	getInviteDetails
} from '../controllers/organization.js';

const router = express.Router();

// Public routes (no auth required)
// Get invite details for displaying invitation page
router.get('/invite/:inviteId', getInviteDetails);

// All routes below require authentication
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

// Seat management
router.get('/:organizationId/seats', getSeatSummary);
router.post('/:organizationId/seats/purchase', purchaseSeats);
router.post('/:organizationId/seats/release', releaseSeats);

export default router;

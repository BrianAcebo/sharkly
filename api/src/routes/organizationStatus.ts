import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { updateOrganizationStatus, getOrganizationStatus } from '../controllers/organizationStatus.js';

const router = Router();

// Update organization status
router.put('/:organizationId/status', requireAuth, updateOrganizationStatus);

// Get organization status
router.get('/:organizationId/status', requireAuth, getOrganizationStatus);

export default router;

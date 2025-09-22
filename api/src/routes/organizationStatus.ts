import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { updateOrganizationStatus, getOrganizationStatus } from '../controllers/organizationStatus';

const router = Router();

// Update organization status
router.put('/:organizationId/status', requireAuth, updateOrganizationStatus);

// Get organization status
router.get('/:organizationId/status', requireAuth, getOrganizationStatus);

export default router;

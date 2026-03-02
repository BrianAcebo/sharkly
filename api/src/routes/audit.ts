import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getLatestAudit, getAuditHistory, runAudit } from '../controllers/auditController.js';

const router = express.Router();

router.use(requireAuth);

// Get latest audit for a site
router.get('/:siteId/latest', getLatestAudit);

// Get audit history for a site
router.get('/:siteId/history', getAuditHistory);

// Trigger a new audit
router.post('/:siteId/run', runAudit);

export default router;

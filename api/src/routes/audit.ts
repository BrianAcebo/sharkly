import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTier } from '../middleware/requireTier.js';
import { getLatestAudit, getAuditHistory, runAudit } from '../controllers/auditController.js';

const router = express.Router();

router.use(requireAuth);

// Get latest audit for a site (Scale+ tier)
router.get('/:siteId/latest', requireTier('scale'), getLatestAudit);

// Get audit history for a site (Scale+ tier)
router.get('/:siteId/history', requireTier('scale'), getAuditHistory);

// Trigger a new audit (Scale+ tier)
router.post('/:siteId/run', requireTier('scale'), runAudit);

export default router;

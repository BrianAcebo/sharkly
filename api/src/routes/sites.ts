import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTier } from '../middleware/requireTier.js';
import { refreshAuthority, checkCannibalization } from '../controllers/sitesController.js';
import { listTargets, createTarget } from '../controllers/targetsController.js';
import { getRefreshQueue } from '../controllers/refreshQueueController.js';
import { getEEAT } from '../controllers/eeatController.js';
import {
	getToxicLinksAudit,
	runToxicLinksAuditHandler,
} from '../controllers/toxicLinksController.js';
import {
	getLinkVelocity,
	runLinkVelocityCheck,
} from '../controllers/linkVelocityController.js';
import { getInternalLinkGapsHandler } from '../controllers/internalLinkGapsController.js';

const router = express.Router();

router.post('/:id/refresh-authority', requireAuth, refreshAuthority);

// S2-3: Keyword cannibalization check — before adding topic/article (all plans)
router.get('/:siteId/check-cannibalization', requireAuth, checkCannibalization);

// S1-7: Toxic Link Detection (15 credits) — Scale+
router.get('/:siteId/toxic-links-audit', requireAuth, requireTier('scale'), getToxicLinksAudit);
router.post('/:siteId/toxic-links-audit', requireAuth, requireTier('scale'), runToxicLinksAuditHandler);

// S2-14: Link Velocity Monitoring (5 credits) — Scale+
router.get('/:siteId/link-velocity', requireAuth, requireTier('scale'), getLinkVelocity);
router.post('/:siteId/link-velocity', requireAuth, requireTier('scale'), runLinkVelocityCheck);

// S1-8: Internal Link Gap Analysis — Scale+
router.get('/:siteId/internal-link-gaps', requireAuth, requireTier('scale'), getInternalLinkGapsHandler);

// S1-1: Content Refresh Queue — Scale+
router.get('/:siteId/refresh-queue', requireAuth, requireTier('scale'), getRefreshQueue);

// S1-3: EEAT Scored Checklist — Scale+
router.get('/:siteId/eeat', requireAuth, requireTier('scale'), getEEAT);

// Targets (site-scoped)
router.get('/:siteId/targets', requireAuth, listTargets);
router.post('/:siteId/targets', requireAuth, createTarget);

export default router;

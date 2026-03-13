/**
 * Rankings Routes
 * GSC ranking data and optimization suggestions (Growth+ tier)
 */

import { Router } from 'express';
import {
	getRankings,
	optimizeCTR,
	generateMetaSuggestions
} from '../controllers/rankingsController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireTier } from '../middleware/requireTier.js';

const router = Router();

router.use(requireAuth);
router.use(requireTier('growth'));

// GET /api/rankings/:siteId - Get rankings for a site
router.get('/:siteId', getRankings);

// POST /api/rankings/:siteId/optimize-ctr - Get CTR optimization suggestions (3 credits)
router.post('/:siteId/optimize-ctr', optimizeCTR);

// POST /api/rankings/:siteId/meta-suggestions - Generate meta title/description suggestions (3 credits)
router.post('/:siteId/meta-suggestions', generateMetaSuggestions);

export default router;

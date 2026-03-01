/**
 * Rankings Routes
 * GSC ranking data and optimization suggestions
 */

import { Router } from 'express';
import {
	getRankings,
	optimizeCTR,
	generateMetaSuggestions
} from '../controllers/rankingsController';

const router = Router();

// GET /api/rankings/:siteId - Get rankings for a site
router.get('/:siteId', getRankings);

// POST /api/rankings/:siteId/optimize-ctr - Get CTR optimization suggestions (3 credits)
router.post('/:siteId/optimize-ctr', optimizeCTR);

// POST /api/rankings/:siteId/meta-suggestions - Generate meta title/description suggestions (3 credits)
router.post('/:siteId/meta-suggestions', generateMetaSuggestions);

export default router;

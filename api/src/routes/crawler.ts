/**
 * Crawler Routes
 * Site auditing and technical issue detection (Scale+ tier)
 */

import { Router } from 'express';
import {
	checkCrawlability,
	startCrawl,
	getCrawlResults,
	getIssueDetails,
	markIssuesResolved
} from '../controllers/crawlerController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireTier } from '../middleware/requireTier.js';

const router = Router();

router.use(requireAuth);
router.use(requireTier('scale'));

// POST /api/crawler/check-crawlability - Pre-crawl validation
router.post('/check-crawlability', checkCrawlability);

// POST /api/crawler/start - Start a site crawl (10 credits)
router.post('/start', startCrawl);

// GET /api/crawler/results/:siteId - Get latest crawl results
router.get('/results/:siteId', getCrawlResults);

// GET /api/crawler/issues/:siteId - Get specific issue details
router.get('/issues/:siteId', getIssueDetails);

// POST /api/crawler/fix-bulk - Mark issues as resolved
router.post('/fix-bulk', markIssuesResolved);

export default router;

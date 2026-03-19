/**
 * Universal SEO checks — run against any URL.
 * Used by CRO Audit Detail, Ecommerce workspace, and other pages.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { runSeoChecks } from '../controllers/seoChecksController.js';

const router = Router();

router.use(requireAuth);

router.post('/run', runSeoChecks);

export default router;

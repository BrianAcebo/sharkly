import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTier } from '../middleware/requireTier.js';
import {
	generateBrief,
	generateArticle,
	rewriteSection,
	updateBriefSection,
	updateBriefIgsOpportunity,
	generateFAQ,
	getCroFixes
} from '../controllers/pages.js';
import { diagnosePage } from '../controllers/diagnoseController.js';

const router = express.Router();

router.get('/:id/diagnose', requireAuth, requireTier('growth'), diagnosePage);
router.post('/:id/brief', requireAuth, generateBrief);
router.post('/:id/article', requireAuth, generateArticle);
router.post('/:id/rewrite-section', requireAuth, rewriteSection);
router.patch('/:id/brief-section', requireAuth, updateBriefSection);
router.patch('/:id/brief-igs', requireAuth, updateBriefIgsOpportunity);
router.post('/:id/generate-faq', requireAuth, generateFAQ);
router.post('/:id/cro-fixes', requireAuth, getCroFixes);

export default router;

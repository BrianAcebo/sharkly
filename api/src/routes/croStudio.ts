/**
 * CRO Studio routes — live page audits, AI fix generation.
 * Requires CRO add-on (has_cro_addon).
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
	listCROAudits,
	getCROAudit,
	addCROAudit,
	reauditCROAudit,
	generateCROStudioFixes,
	generateCROStudioFAQ,
	generateCROStudioTestimonialEmail,
	generateCognitiveLoadExplanation,
	generateEmotionalArcAnalysis
} from '../controllers/croStudioController.js';

const router = Router();

router.use(requireAuth);

/** GET /api/cro-studio/audits — List CRO audits (optional ?page_type=seo_page|destination_page) */
router.get('/audits', listCROAudits);

/** GET /api/cro-studio/audits/:id — Fetch single audit */
router.get('/audits/:id', getCROAudit);

/** POST /api/cro-studio/audits — Add page and run CRO audit (1 credit) */
router.post('/audits', addCROAudit);

/** POST /api/cro-studio/audits/:id/reaudit — Re-run audit (1 credit) */
router.post('/audits/:id/reaudit', reauditCROAudit);

/** POST /api/cro-studio/audits/:id/faq — Generate 5 Q&A FAQs for destination page (2 credits) */
router.post('/audits/:id/faq', generateCROStudioFAQ);

/** POST /api/cro-studio/audits/:id/testimonial-email — Generate testimonial request email (1 credit) */
router.post('/audits/:id/testimonial-email', generateCROStudioTestimonialEmail);

/** POST /api/cro-studio/audits/:id/cognitive-load — Generate cognitive load explanation (1 credit) */
router.post('/audits/:id/cognitive-load', generateCognitiveLoadExplanation);

/** POST /api/cro-studio/audits/:id/emotional-arc — Analyse emotional arc (3 credits) */
router.post('/audits/:id/emotional-arc', generateEmotionalArcAnalysis);

/** POST /api/cro-studio/fixes — Generate AI copy fixes for failing audit items */
router.post('/fixes', generateCROStudioFixes);

export default router;

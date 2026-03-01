/**
 * Content Generator Routes
 * AI-powered content generation endpoints
 */

import { Router } from 'express';
import {
	generateMetaSuggestions,
	rewriteProductDescription,
	generateFAQ,
	rewriteSection,
	adjustTone
} from '../controllers/contentGeneratorController';

const router = Router();

// POST /api/content/meta-suggestions - Generate meta titles/descriptions (6 credits total)
router.post('/meta-suggestions', generateMetaSuggestions);

// POST /api/content/product-description - Rewrite product description (10 credits)
router.post('/product-description', rewriteProductDescription);

// POST /api/content/faq - Generate FAQ section (5 credits)
router.post('/faq', generateFAQ);

// POST /api/content/rewrite-section - Rewrite content section (5 credits)
router.post('/rewrite-section', rewriteSection);

// POST /api/content/adjust-tone - Adjust content tone (3 credits)
router.post('/adjust-tone', adjustTone);

export default router;

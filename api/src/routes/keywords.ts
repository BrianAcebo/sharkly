import { Router } from 'express';
import { lookupKeyword, lookupSearchIntent } from '../controllers/keywordsController.js';

const router = Router();

// POST /api/keywords/lookup — Keyword metrics lookup (5 credits)
router.post('/lookup', lookupKeyword);

// POST /api/keywords/search-intent — DataForSEO Labs intent (no app credits)
router.post('/search-intent', lookupSearchIntent);

export default router;

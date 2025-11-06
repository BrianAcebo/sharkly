import express from 'express';

import { requireAuth } from '../middleware/auth.js';
import { searchGoogleProgrammable } from '../controllers/search.js';

const router = express.Router();

router.use(requireAuth);
router.get('/', searchGoogleProgrammable);

export default router;



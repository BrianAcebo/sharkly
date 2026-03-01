/**
 * GSC Routes
 */

import { Router } from 'express';
import {
	syncPerformanceData,
	startGSCOAuth,
	handleGSCOAuthCallback,
	getGSCProperties,
	saveGSCToken,
	disconnectGSC
} from '../controllers/gscController';

const router = Router();

// OAuth endpoints
// GET /api/gsc/oauth/start - Initiate OAuth flow
router.get('/oauth/start', startGSCOAuth);

// GET /api/gsc/oauth/callback - OAuth callback from Google
router.get('/oauth/callback', handleGSCOAuthCallback);

// Property selection
// GET /api/gsc/properties - Get properties from OAuth session
router.get('/properties', getGSCProperties);

// Sync endpoints
// POST /api/gsc/sync - Sync performance data for all connected sites
router.post('/sync', syncPerformanceData);

// POST /api/gsc/save - Save GSC token after property selection
router.post('/save', saveGSCToken);

// POST /api/gsc/disconnect - Disconnect GSC for a site
router.post('/disconnect', disconnectGSC);

export default router;

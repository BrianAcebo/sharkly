/**
 * Shopify routes
 * OAuth, connection status, blogs, publish.
 */

import { Router } from 'express';
import {
	startShopifyOAuth,
	handleShopifyOAuthCallback,
	getShopifyStatus,
	postShopifyDisconnect,
	getShopifyBlogs,
	publishToShopify
} from '../controllers/shopifyController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSiteAccess } from '../middleware/siteAccess.js';

const router = Router();

// OAuth (no auth required — callback comes from Shopify)
router.get('/oauth/start', startShopifyOAuth);
router.get('/oauth/callback', handleShopifyOAuthCallback);

// Protected routes
router.get('/status/:siteId', requireAuth, requireSiteAccess, getShopifyStatus);
router.post('/disconnect/:siteId', requireAuth, requireSiteAccess, postShopifyDisconnect);
router.get('/blogs/:siteId', requireAuth, requireSiteAccess, getShopifyBlogs);
router.post('/publish/:siteId', requireAuth, requireSiteAccess, publishToShopify);

export default router;

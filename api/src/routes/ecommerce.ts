/**
 * Ecommerce SEO routes (L6b)
 * Product/collection description generation, import, publish to Shopify.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
	listEcommercePages,
	getEcommercePage,
	createEcommercePage,
	updateEcommercePage,
	deleteEcommercePage,
	bulkDeleteEcommercePages,
	syncEcommercePage,
	syncAllEcommercePages,
	generateProduct,
	generateCollection,
	generateEcommerceMeta,
	runSeoChecks,
	publishToShopify,
	importFromShopify,
	getShopifyProducts,
	getShopifyCollections
} from '../controllers/ecommerce.js';

const router = Router();

router.use(requireAuth);

// List and get (no credits)
router.get('/', listEcommercePages);
router.get('/shopify-products', getShopifyProducts);
router.get('/shopify-collections', getShopifyCollections);
router.get('/:id', getEcommercePage);

// CRUD
router.post('/', createEcommercePage);
router.post('/bulk-delete', bulkDeleteEcommercePages);
router.patch('/:id', updateEcommercePage);
router.delete('/:id', deleteEcommercePage);

// Generate (3 credits each)
router.post('/:id/generate-product', generateProduct);
router.post('/:id/generate-collection', generateCollection);
router.post('/:id/generate-meta', generateEcommerceMeta);

// SEO checks (no credits)
router.post('/:id/run-seo-checks', runSeoChecks);

// Publish to Shopify (no credits)
router.post('/:id/publish-shopify', publishToShopify);

// Import from Shopify (no credits)
router.post('/import-shopify', importFromShopify);

// Sync from Shopify (no credits) — sync-all must come before /:id
router.post('/sync-all', syncAllEcommercePages);
router.post('/:id/sync', syncEcommercePage);

export default router;

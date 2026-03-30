/**
 * Shopify mandatory webhooks (GDPR + app uninstall).
 * Must respond 200. Verify HMAC using raw body.
 * Register routes with express.raw() before express.json().
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import { clearShopifyConnectionByDomain } from '../services/shopifyService.js';

const secret = process.env.SHOPIFY_API_SECRET || '';

let loggedMissingShopifySecret = false;

/** Same algorithm as https://shopify.dev/docs/apps/webhooks/configuration/https#step-2-validate-the-origin-of-your-webhook */
function verifyShopifyWebhookHmac(rawBody: Buffer, hmacHeader: string | string[] | undefined): boolean {
	if (!secret) {
		if (!loggedMissingShopifySecret) {
			loggedMissingShopifySecret = true;
			console.error(
				'[Shopify Webhook] SHOPIFY_API_SECRET is empty — HMAC will fail. Set it to the app Client secret from the Partner Dashboard (same value as OAuth).'
			);
		}
		return false;
	}
	if (!Buffer.isBuffer(rawBody)) return false;
	const headerVal = Array.isArray(hmacHeader) ? hmacHeader[0] : hmacHeader;
	if (!headerVal || typeof headerVal !== 'string') return false;
	const shopifyHmac = headerVal.trim();
	if (!shopifyHmac) return false;

	const calculatedHmacDigest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
	try {
		return crypto.timingSafeEqual(
			Buffer.from(calculatedHmacDigest, 'base64'),
			Buffer.from(shopifyHmac, 'base64')
		);
	} catch {
		return false;
	}
}

function shopDomainFromWebhook(req: Request, body: unknown): string {
	const fromHeader = req.headers['x-shopify-shop-domain'];
	const h = Array.isArray(fromHeader) ? fromHeader[0] : fromHeader;
	if (typeof h === 'string' && h.trim()) return h.trim().toLowerCase();
	const shop = (body as { shop_domain?: string })?.shop_domain;
	if (typeof shop === 'string' && shop.trim()) return shop.trim().toLowerCase();
	return '';
}

/**
 * Generic handler: verify HMAC, then run action. Always respond 200 after verification.
 * req.body is the raw Buffer (set by express.raw() middleware).
 */
async function handleWebhook(req: Request, res: Response, action: (shopDomain: string, body: unknown) => Promise<void>): Promise<void> {
	const hmac = req.headers['x-shopify-hmac-sha256'];
	const rawBody = Buffer.isBuffer(req.body) ? req.body : null;
	if (!rawBody || !verifyShopifyWebhookHmac(rawBody, hmac)) {
		res.status(401).send('Unauthorized');
		return;
	}
	let body: unknown;
	try {
		body = JSON.parse(rawBody.toString('utf8'));
	} catch {
		body = {};
	}
	const shopDomain = shopDomainFromWebhook(req, body);
	try {
		await action(shopDomain, body);
	} catch (err) {
		console.error('[Shopify Webhook] Action error:', err);
	}
	res.status(200).send();
}

/**
 * POST /webhooks/shopify/customers/redact
 * Customer requested deletion of their data. Sharkly stores no customer data.
 */
export async function customersRedact(req: Request, res: Response): Promise<void> {
	await handleWebhook(req, res, async () => {
		// No customer data stored; nothing to redact
	});
}

/**
 * POST /webhooks/shopify/shop/redact
 * Fires 48h after store uninstalls. Clear store data; we only have connection tokens.
 */
export async function shopRedact(req: Request, res: Response): Promise<void> {
	await handleWebhook(req, res, async (shopDomain) => {
		if (!shopDomain) {
			console.warn('[Shopify Webhook] shop/redact: missing shop domain after verify');
			return;
		}
		await clearShopifyConnectionByDomain(shopDomain);
	});
}

/**
 * POST /webhooks/shopify/customers/data_request
 * Customer requested their data. Respond with what we store: store domain + token reference only, no PII.
 */
export async function customersDataRequest(req: Request, res: Response): Promise<void> {
	await handleWebhook(req, res, async () => {
		// We store no customer PII. Store only has shop domain + access token for API.
		// No response body required; 200 acknowledges receipt.
	});
}

/**
 * POST /webhooks/shopify/app-uninstalled
 * App was uninstalled. Clear tokens, preserve site and content.
 */
export async function appUninstalled(req: Request, res: Response): Promise<void> {
	await handleWebhook(req, res, async (shopDomain) => {
		if (!shopDomain) {
			console.warn('[Shopify Webhook] app/uninstalled: missing shop domain after verify');
			return;
		}
		await clearShopifyConnectionByDomain(shopDomain);
	});
}

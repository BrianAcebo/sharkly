/**
 * Paths called server-to-server (Stripe, Shopify, Supabase Auth hooks, etc.).
 * These must not require a Supabase JWT or strict browser CORS.
 *
 * Includes `POST /webhooks/supabase/auth-email` (Send Email hook).
 */
export function isServerWebhookPath(path: string): boolean {
	return (
		path.startsWith('/webhooks/') ||
		path === '/api/billing/stripe/webhook' ||
		path === '/api/payments/webhook'
	);
}

/**
 * AuthShopify — handles two Shopify redirect cases:
 *
 * 1. Initial install (hmac, host, shop, timestamp): Shopify uses app_url and sends users here.
 *    Redirect to backend install to start OAuth.
 *
 * 2. Post-OAuth (shop only): Backend callback redirects here after storing pending token.
 *    If authed: call attach-pending API, then redirect. If not: redirect to signin with return_to.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { getBackendUrl, buildApiUrl } from '../../utils/urls';
import useAuth from '../../hooks/useAuth';
import { AuthLoadingState } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'sonner';

export default function AuthShopify() {
	const [searchParams] = useSearchParams();
	const { user, session, loadingState } = useAuth();
	const [attaching, setAttaching] = useState(false);

	useEffect(() => {
		const shop = searchParams.get('shop');
		const hmac = searchParams.get('hmac');
		const host = searchParams.get('host');

		if (!shop) {
			window.location.href = '/signup';
			return;
		}

		const normalizedShop = shop.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
		const shopDomain = normalizedShop.endsWith('.myshopify.com')
			? normalizedShop
			: `${normalizedShop}.myshopify.com`;

		// Case 1: Shopify's initial redirect (hmac, host, shop, timestamp)
		if (hmac && host) {
			const installUrl = `${getBackendUrl()}/auth/shopify/install?shop=${encodeURIComponent(shopDomain)}`;
			window.location.href = installUrl;
			return;
		}

		// Case 2: Post-OAuth (shop only)
		// Wait for auth to resolve
		if (loadingState === AuthLoadingState.LOADING) return;

		if (!user || !session?.access_token) {
			const returnTo = `/auth/shopify?shop=${encodeURIComponent(shopDomain)}`;
			window.location.href = `/signin?return_to=${encodeURIComponent(returnTo)}`;
			return;
		}

		// User is authed — attach pending token
		if (attaching) return;
		setAttaching(true);

		(async () => {
			try {
				const res = await fetch(buildApiUrl('/api/shopify/attach-pending'), {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${session.access_token}`
					},
					body: JSON.stringify({ shop: shopDomain })
				});

				const data = (await res.json().catch(() => ({}))) as {
					error?: string;
					code?: string;
					needs_onboarding?: boolean;
					siteId?: string;
				};

				if (!res.ok) {
					if (data.needs_onboarding) {
						toast.error('Complete billing setup first to connect your store.');
						window.location.href = '/billing-onboarding';
						return;
					}
					if (data.code === 'token_expired') {
						toast.error('Connection link expired. Please reconnect from Settings → Integrations.');
					} else {
						toast.error(data.error || 'Failed to connect store.');
					}
					window.location.href = '/settings/integrations';
					return;
				}

				toast.success('Shopify store connected!');
				window.location.href = '/settings/integrations?shopify_success=1';
			} catch (err) {
				console.error('[AuthShopify] Attach error:', err);
				toast.error('Failed to connect store.');
				window.location.href = '/settings/integrations';
			}
		})();
	}, [searchParams, user, session, loadingState, attaching]);

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
				<p className="text-muted-foreground">Connecting your Shopify store...</p>
			</div>
		</div>
	);
}

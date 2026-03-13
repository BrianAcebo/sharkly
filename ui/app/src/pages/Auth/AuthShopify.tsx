/**
 * AuthShopify — handles two Shopify redirect cases:
 *
 * 1. Initial install (hmac, host, shop, timestamp): Shopify uses app_url and sends users here.
 *    Redirect to backend install to start OAuth.
 *
 * 2. Post-OAuth (shop only): Backend callback redirects here after storing pending token.
 *    If authed: show site picker (or attach if single path), then call attach-pending.
 *    If not: redirect to signin with return_to.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { getBackendUrl, buildApiUrl } from '../../utils/urls';
import useAuth from '../../hooks/useAuth';
import { useSites } from '../../hooks/useSites';
import { AuthLoadingState } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Globe, Plus } from 'lucide-react';
import PageMeta from '../../components/common/PageMeta';

export default function AuthShopify() {
	const [searchParams] = useSearchParams();
	const { user, session, loadingState } = useAuth();
	const { sites, loading: sitesLoading } = useSites();
	const [attaching, setAttaching] = useState(false);
	const [selectedSiteId, setSelectedSiteId] = useState<string | 'create_new' | null>(null);

	const shop = searchParams.get('shop');
	const hmac = searchParams.get('hmac');
	const host = searchParams.get('host');

	const shopDomain = shop
		? (() => {
				const n = shop.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
				return n.endsWith('.myshopify.com') ? n : `${n}.myshopify.com`;
		  })()
		: '';

	// Case 1: No shop
	useEffect(() => {
		if (!shop) {
			window.location.href = '/signup';
		}
	}, [shop]);

	// Case 2: Initial Shopify redirect → backend install
	useEffect(() => {
		if (!shop || !shopDomain) return;
		if (hmac && host) {
			const installUrl = `${getBackendUrl()}/auth/shopify/install?shop=${encodeURIComponent(shopDomain)}`;
			window.location.href = installUrl;
		}
	}, [shop, shopDomain, hmac, host]);

	// Case 3: Post-OAuth — need auth
	if (shop && !hmac && !host) {
		if (loadingState === AuthLoadingState.LOADING) {
			return (
				<div className="flex min-h-screen items-center justify-center">
					<div className="text-center">
						<div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
						<p className="text-muted-foreground">Loading...</p>
					</div>
				</div>
			);
		}

		if (!user || !session?.access_token) {
			const returnTo = `/auth/shopify?shop=${encodeURIComponent(shopDomain)}`;
			window.location.href = `/signin?return_to=${encodeURIComponent(returnTo)}`;
			return null;
		}

		// User is authed — show site picker or run attach
		const handleAttach = async (siteId: string | null) => {
			if (attaching) return;
			setAttaching(true);
			try {
				const res = await fetch(buildApiUrl('/api/shopify/attach-pending'), {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${session!.access_token}`
					},
					body: JSON.stringify({
					shop: shopDomain,
					siteId: siteId || undefined,
					createNew: !siteId
				})
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
		};

		// Still loading sites
		if (sitesLoading) {
			return (
				<div className="flex min-h-screen items-center justify-center">
					<div className="text-center">
						<div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
						<p className="text-muted-foreground">Loading your sites...</p>
					</div>
				</div>
			);
		}

		// Attaching in progress
		if (attaching) {
			return (
				<div className="flex min-h-screen items-center justify-center">
					<div className="text-center">
						<div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
						<p className="text-muted-foreground">Connecting your Shopify store...</p>
					</div>
				</div>
			);
		}

		// Site picker UI
		return (
			<>
				<PageMeta noIndex title="Connect Shopify Store" description="Choose where to connect your Shopify store" />
				<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
					<div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
						<h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
							Connect your Shopify store
						</h1>
						<p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
							Where should we connect <span className="font-medium text-gray-900 dark:text-white">{shopDomain}</span>?
						</p>

						<div className="space-y-2 mb-6">
							{sites.map((site) => (
								<button
									key={site.id}
									type="button"
									onClick={() => setSelectedSiteId(selectedSiteId === site.id ? null : site.id)}
									className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
										selectedSiteId === site.id
											? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600'
											: 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
									}`}
								>
									<Globe className="size-5 text-gray-500 dark:text-gray-400 shrink-0" />
									<div className="min-w-0">
										<p className="font-medium text-gray-900 dark:text-white truncate">{site.name}</p>
										{site.url && (
											<p className="text-xs text-gray-500 dark:text-gray-400 truncate">{site.url}</p>
										)}
									</div>
								</button>
							))}

							<button
								type="button"
								onClick={() =>
									setSelectedSiteId(selectedSiteId === 'create_new' ? null : 'create_new')
								}
								className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
									selectedSiteId === 'create_new'
										? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600'
										: 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
								}`}
							>
								<Plus className="size-5 text-gray-500 dark:text-gray-400 shrink-0" />
								<div>
									<p className="font-medium text-gray-900 dark:text-white">Create new site</p>
									<p className="text-xs text-gray-500 dark:text-gray-400">
										New site for {shopDomain.replace('.myshopify.com', '')}
									</p>
								</div>
							</button>
						</div>

						<Button
							className="w-full"
							disabled={!selectedSiteId}
							onClick={() =>
								handleAttach(selectedSiteId === 'create_new' ? null : selectedSiteId)
							}
						>
							{selectedSiteId
								? selectedSiteId === 'create_new'
									? 'Create site and connect'
									: 'Connect to selected site'
								: 'Choose an option'}
						</Button>

						<p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
							<a href="/settings/integrations" className="text-brand-500 hover:underline">
								Go to Settings → Integrations
							</a>{' '}
							to connect manually
						</p>
					</div>
				</div>
			</>
		);
	}

	// Default loading (case 1 or 2)
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
				<p className="text-muted-foreground">Connecting your Shopify store...</p>
			</div>
		</div>
	);
}

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
import { useCallback, useEffect, useState, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router';
import { getBackendUrl, buildApiUrl } from '../../utils/urls';
import useAuth from '../../hooks/useAuth';
import { useSites } from '../../hooks/useSites';
import { AuthLoadingState } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Globe, Plus } from 'lucide-react';
import PageMeta from '../../components/common/PageMeta';
import { Logo } from '../../components/common/Logo';

function getInstallUrl(shopDomain: string): string {
	try {
		const base = getBackendUrl();
		return `${base}/auth/shopify/install?shop=${encodeURIComponent(shopDomain)}`;
	} catch {
		return `https://sharkly-api.fly.dev/auth/shopify/install?shop=${encodeURIComponent(shopDomain)}`;
	}
}

export default function AuthShopify() {
	const [searchParams] = useSearchParams();
	const { user, session, loadingState } = useAuth();
	const { sites, loading: sitesLoading } = useSites();
	const [attaching, setAttaching] = useState(false);
	const [selectedSiteId, setSelectedSiteId] = useState<string | 'create_new' | null>(() => {
		try {
			const stored = sessionStorage.getItem('sharkly_connect_site_id');
			if (stored) return stored;
		} catch {}
		return null;
	});

	const shop = searchParams.get('shop');
	const hmac = searchParams.get('hmac');
	const host = searchParams.get('host');

	const shopDomain = shop
		? (() => {
				const n = shop.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
				return n.endsWith('.myshopify.com') ? n : `${n}.myshopify.com`;
		  })()
		: '';

	// Case 1: No shop — redirect immediately
	useLayoutEffect(() => {
		if (!shop) {
			window.location.replace('/signup');
		}
	}, [shop]);

	// Case 2: Initial Shopify redirect (hmac+host) — redirect immediately, before any other hooks that might block
	useLayoutEffect(() => {
		if (!shop || !shopDomain || !hmac || !host) return;
		const installUrl = getInstallUrl(shopDomain);
		window.location.replace(installUrl);
	}, [shop, shopDomain, hmac, host]);

	// handleAttach and auto-attach effect — must be at top level (hooks rules)
	const handleAttach = useCallback(
		async (siteId: string | null) => {
			if (attaching) return;
			setAttaching(true);
			try {
				const res = await fetch(buildApiUrl('/api/shopify/attach-pending'), {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${session?.access_token}`
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
					setAttaching(false);
					if (data.needs_onboarding) {
						toast.error('Complete billing setup first to connect your store.');
						window.location.href = '/billing-onboarding';
						return;
					}
					if (data.code === 'token_expired') {
						toast.error('Connection link expired. Open your site details to reconnect.');
					} else {
						toast.error(data.error || 'Failed to connect store.');
					}
					window.location.href = '/sites';
					return;
				}

				toast.success('Shopify store connected!');
				const connectedSiteId = data.siteId;
				try {
					sessionStorage.removeItem('sharkly_connect_site_id');
				} catch {}
				window.location.href = connectedSiteId
					? `/sites?shopify_success=1&siteId=${connectedSiteId}`
					: '/sites';
			} catch (err) {
				console.error('[AuthShopify] Attach error:', err);
				setAttaching(false);
				toast.error('Failed to connect store.');
				window.location.href = '/sites';
			}
		},
		[attaching, session, shopDomain]
	);

	// Auto-attach ONLY when: user has org, sites have loaded, and there are truly 0 sites.
	// Never auto-attach when user lacks organization_id — useSites returns [] without fetching, which would wrongly create a new site.
	const isPostOAuth = Boolean(shop && !hmac && !host);
	useEffect(() => {
		if (!isPostOAuth || sitesLoading || attaching || !user || !session?.access_token) return;
		if (!user.organization_id) return; // Org not loaded yet — don't assume 0 sites
		if (sites.length === 0) {
			handleAttach(null);
		}
	}, [isPostOAuth, sitesLoading, sites, attaching, user, session, handleAttach]);

	// Validate stored siteId when sites load — clear if not in list
	useEffect(() => {
		if (sitesLoading || sites.length === 0) return;
		if (selectedSiteId && selectedSiteId !== 'create_new') {
			const exists = sites.some((s) => s.id === selectedSiteId);
			if (!exists) setSelectedSiteId(null);
		}
	}, [sitesLoading, sites, selectedSiteId]);

	// Early render for Case 2: show redirect UI with fallback link (useLayoutEffect will fire before paint)
	const isInitialInstall = Boolean(shop && hmac && host);
	if (isInitialInstall) {
		const installUrl = getInstallUrl(shopDomain || shop || '');
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-950 px-4">
				<Logo width={140} height="auto" className="mb-2" />
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				<div className="text-center">
					<p className="font-medium text-gray-900 dark:text-white">Connecting to Shopify</p>
					<p className="text-sm text-muted-foreground mt-1">Authorize Sharkly to access your store</p>
				</div>
				<a href={installUrl} className="text-sm text-brand-500 hover:underline">
					If you’re not redirected, click here
				</a>
			</div>
		);
	}

	// Case 3: Post-OAuth — need auth
	if (shop && !hmac && !host) {
		if (loadingState === AuthLoadingState.LOADING) {
			return (
				<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-950 px-4">
					<Logo width={140} height="auto" />
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					<p className="text-muted-foreground">Loading your Sharkly account...</p>
				</div>
			);
		}

		if (!user || !session?.access_token) {
			const returnTo = `/auth/shopify?shop=${encodeURIComponent(shopDomain)}`;
			window.location.href = `/signin?return_to=${encodeURIComponent(returnTo)}`;
			return null;
		}

		// Still loading sites
		if (sitesLoading) {
			return (
				<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-950 px-4">
					<Logo width={140} height="auto" />
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					<p className="text-muted-foreground">Loading your sites...</p>
				</div>
			);
		}

		// Attaching in progress
		if (attaching) {
			return (
				<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-950 px-4">
					<Logo width={140} height="auto" />
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					<p className="text-muted-foreground">Connecting {shopDomain.replace('.myshopify.com', '')} to Sharkly...</p>
				</div>
			);
		}

		// Site picker UI
		return (
			<>
				<PageMeta noIndex title="Connect Shopify Store | Sharkly" description="Connect your Shopify store to Sharkly" />
				<div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8">
					<div className="w-full max-w-md">
						<div className="mb-6 text-center">
							<Logo width={140} height="auto" className="mx-auto mb-4" />
							<h1 className="text-xl font-semibold text-gray-900 dark:text-white">
								Welcome to Sharkly
							</h1>
							<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
								You’ve connected <span className="font-medium text-gray-900 dark:text-white">{shopDomain.replace('.myshopify.com', '')}</span>. Choose where to add it — or create a new site for your store.
							</p>
							<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
								Sharkly helps you optimize your Shopify store for search and grow organic traffic.
							</p>
						</div>
					<div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
						<h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
							Add to existing site or create new
						</h2>

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
							<a href="/sites" className="text-brand-500 hover:underline">
								Go to Sites
							</a>{' '}
							to connect from a site’s details
						</p>
					</div>
					</div>
				</div>
			</>
		);
	}

	// Default loading (case 1 or 2)
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-950 px-4">
			<Logo width={140} height="auto" />
			<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			<p className="text-muted-foreground">Connecting your Shopify store...</p>
		</div>
	);
}

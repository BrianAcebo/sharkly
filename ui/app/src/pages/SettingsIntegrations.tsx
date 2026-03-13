/**
 * Settings: Integrations
 * Google Search Console, Shopify, WordPress, Google Analytics (coming soon).
 * GSC connection is per-site — uses existing GSCConnectionManager component.
 */

import { useState, useEffect } from 'react';
import PageMeta from '../components/common/PageMeta';
import { supabase } from '../utils/supabaseClient';
import { buildApiUrl } from '../utils/urls';
import { Button } from '../components/ui/button';
import { GSCConnectionManager } from '../components/gsc/GSCConnectionManager';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import InputField from '../components/form/input/InputField';
import { useSiteContext } from '../contexts/SiteContext';
import { toast } from 'sonner';
import {
	ExternalLink,
	CheckCircle2,
	Circle,
	ChevronDown,
	ChevronUp,
	Plug,
	Search,
	ShoppingBag,
	Rss,
	BarChart2
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Integration Card
// ---------------------------------------------------------------------------

interface Integration {
	id: string;
	name: string;
	description: string;
	features: string[];
	icon: React.ReactNode;
	iconBg: string;
	status: 'connected' | 'not_connected' | 'coming_soon';
	comingSoon?: boolean;
}

function StatusBadge({ status }: { status: Integration['status'] }) {
	if (status === 'connected')
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
				<CheckCircle2 className="size-3" />
				Connected
			</span>
		);
	if (status === 'coming_soon')
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
				<Circle className="size-3" />
				Coming Soon
			</span>
		);
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
			<Circle className="size-3" />
			Not Connected
		</span>
	);
}

// ---------------------------------------------------------------------------
// WordPress Connect Modal
// ---------------------------------------------------------------------------

function WordPressConnectModal({
	open,
	onClose
}: {
	open: boolean;
	onClose: () => void;
}) {
	const [siteUrl, setSiteUrl] = useState('');
	const [username, setUsername] = useState('');
	const [appPassword, setAppPassword] = useState('');
	const [connecting, setConnecting] = useState(false);

	const handleConnect = async () => {
		if (!siteUrl || !username || !appPassword) {
			toast.error('All fields are required');
			return;
		}
		setConnecting(true);
		try {
			// Validate by calling WP REST API
			const testUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/users/me`;
			const credentials = btoa(`${username}:${appPassword}`);
			const resp = await fetch(testUrl, {
				headers: { Authorization: `Basic ${credentials}` }
			});
			if (!resp.ok) {
				toast.error('Could not connect — check your site URL and credentials');
				return;
			}
			toast.success('WordPress connected successfully');
			onClose();
		} catch {
			toast.error('Could not reach your WordPress site');
		} finally {
			setConnecting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Rss className="size-4 text-blue-600" />
						Connect WordPress
					</DialogTitle>
					<DialogDescription>
						Connect via WordPress REST API + Application Password.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-900/20">
						<p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
							<strong>How to create an Application Password:</strong> In WordPress go to{' '}
							<em>Users → Profile → Application Passwords</em>. Enter a name like "Sharkly"
							and click "Add New Application Password".
						</p>
						<a
							href="https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/"
							target="_blank"
							rel="noopener noreferrer"
							className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
						>
							Guide <ExternalLink className="size-3" />
						</a>
					</div>

					<div className="space-y-3">
						<div>
							<Label htmlFor="wp-url" className="text-sm">WordPress Site URL</Label>
							<InputField
								id="wp-url"
								value={siteUrl}
								onChange={(e) => setSiteUrl(e.target.value)}
								placeholder="https://yoursite.com"
								className="mt-1"
							/>
						</div>
						<div>
							<Label htmlFor="wp-user" className="text-sm">Username</Label>
							<InputField
								id="wp-user"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								placeholder="admin"
								className="mt-1"
							/>
						</div>
						<div>
							<Label htmlFor="wp-pass" className="text-sm">Application Password</Label>
							<InputField
								id="wp-pass"
								type="password"
								value={appPassword}
								onChange={(e) => setAppPassword(e.target.value)}
								placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
								className="mt-1 font-mono"
							/>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={connecting}>
						Cancel
					</Button>
					<Button
						onClick={handleConnect}
						disabled={connecting || !siteUrl || !username || !appPassword}
						className="bg-blue-600 hover:bg-blue-700 text-white"
					>
						{connecting ? 'Connecting…' : 'Connect WordPress'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Integration Row
// ---------------------------------------------------------------------------

interface IntegrationRowProps {
	integration: Integration;
	expanded: boolean;
	onToggleExpand: () => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
	children?: React.ReactNode;
}

function IntegrationRow({
	integration,
	expanded,
	onToggleExpand,
	onConnect,
	onDisconnect,
	children
}: IntegrationRowProps) {
	return (
		<div
			className={`overflow-hidden rounded-xl border transition-colors ${
				integration.comingSoon
					? 'border-gray-200 bg-white opacity-50 dark:border-gray-700 dark:bg-gray-900'
					: integration.status === 'connected'
					? 'border-green-200 bg-white dark:border-green-900/50 dark:bg-gray-900'
					: 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
			}`}
		>
			<div className="flex items-center gap-4 p-5">
				{/* Icon */}
				<div
					className={`flex size-10 flex-shrink-0 items-center justify-center rounded-lg ${integration.iconBg}`}
				>
					{integration.icon}
				</div>

				{/* Info */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="font-semibold text-gray-900 dark:text-white">{integration.name}</span>
						<StatusBadge status={integration.status} />
					</div>
					<p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 truncate">
						{integration.description}
					</p>
				</div>

				{/* Actions */}
				<div className="flex flex-shrink-0 items-center gap-2">
					{!integration.comingSoon && (
						<>
							{integration.status === 'connected' ? (
								<Button
									variant="outline"
									size="sm"
									onClick={onDisconnect}
									className="border-gray-200 dark:border-gray-700 text-xs"
								>
									Disconnect
								</Button>
							) : (
								<Button
									size="sm"
									className="bg-brand-500 hover:bg-brand-600 text-white text-xs"
									onClick={onConnect}
								>
									Connect
								</Button>
							)}
							<button
								onClick={onToggleExpand}
								className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
							>
								{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
							</button>
						</>
					)}
				</div>
			</div>

			{/* Expanded panel */}
			{expanded && !integration.comingSoon && (
				<div className="border-t border-gray-100 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/50">
					{children}
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SettingsIntegrations() {
	const { selectedSite } = useSiteContext();
	const [expanded, setExpanded] = useState<string | null>('gsc');
	const [wpModalOpen, setWpModalOpen] = useState(false);
	const [shopifyShop, setShopifyShop] = useState('');
	const [shopifyStatus, setShopifyStatus] = useState<{ connected: boolean; shopDomain: string | null } | null>(null);

	// Handle OAuth callback params
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const success = params.get('shopify_success');
		const error = params.get('shopify_error');
		if (success) {
			toast.success('Shopify connected successfully');
			window.history.replaceState({}, '', window.location.pathname);
		}
		if (error) {
			toast.error(`Shopify connection failed: ${error === 'invalid_state' ? 'Session expired' : error === 'hmac_invalid' ? 'Invalid request' : error}`);
			window.history.replaceState({}, '', window.location.pathname);
		}
	}, []);

	// Fetch Shopify status when site selected
	useEffect(() => {
		if (!selectedSite?.id) {
			setShopifyStatus(null);
			return;
		}
		let cancelled = false;
		(async () => {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) return;
			const res = await fetch(buildApiUrl(`/api/shopify/status/${selectedSite.id}`), {
				headers: { Authorization: `Bearer ${session.access_token}` }
			});
			if (cancelled) return;
			if (res.ok) {
				const data = await res.json();
				setShopifyStatus({ connected: data.connected, shopDomain: data.shopDomain });
			} else {
				setShopifyStatus({ connected: false, shopDomain: null });
			}
		})();
		return () => { cancelled = true; };
	}, [selectedSite?.id]);

	const toggleExpand = (id: string) => {
		setExpanded((prev) => (prev === id ? null : id));
	};

	const handleShopifyConnect = () => {
		if (!selectedSite?.id) {
			toast.error('Select a site first');
			return;
		}
		const shop = shopifyShop.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '') || shopifyShop.trim();
		if (!shop) {
			toast.error('Enter your Shopify store (e.g. mystore or mystore.myshopify.com)');
			return;
		}
		window.location.href = `/api/shopify/oauth/start?siteId=${selectedSite.id}&shop=${encodeURIComponent(shop)}`;
	};

	const handleShopifyDisconnect = async () => {
		if (!selectedSite?.id) return;
		const { data: { session } } = await supabase.auth.getSession();
		if (!session) return;
		const res = await fetch(buildApiUrl(`/api/shopify/disconnect/${selectedSite.id}`), {
			method: 'POST',
			headers: { Authorization: `Bearer ${session.access_token}` }
		});
		if (res.ok) {
			setShopifyStatus({ connected: false, shopDomain: null });
			toast.success('Shopify disconnected');
		} else {
			toast.error('Failed to disconnect');
		}
	};

	const integrations: Integration[] = [
		{
			id: 'gsc',
			name: 'Google Search Console',
			description: 'Keyword rankings, impressions, CTR, and Navboost momentum data.',
			features: [
				'Keyword rankings table with position history',
				'Per-keyword CTR trend and Navboost momentum score',
				'Traffic charts — clicks and impressions over time',
				'Top pages by organic clicks'
			],
			icon: (
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path d="M18.75 10.19C18.75 9.47 18.69 8.95 18.56 8.41H10.18V11.65H15.1C15 12.46 14.47 13.68 13.27 14.49L13.26 14.6L15.91 16.61L16.09 16.63C17.78 15.1 18.75 12.86 18.75 10.19Z" fill="#4285F4" />
					<path d="M10.18 18.75C12.59 18.75 14.61 17.97 16.09 16.63L13.27 14.49C12.52 15.01 11.51 15.37 10.18 15.37C7.82 15.37 5.81 13.84 5.1 11.73L4.99 11.74L2.24 13.83L2.2 13.93C3.67 16.79 6.69 18.75 10.18 18.75Z" fill="#34A853" />
					<path d="M5.1 11.73C4.91 11.19 4.8 10.6 4.8 10C4.8 9.4 4.91 8.81 5.09 8.27L5.09 8.15L2.29 6.03L2.2 6.07C1.6 7.26 1.25 8.59 1.25 10C1.25 11.41 1.6 12.74 2.2 13.93L5.1 11.73Z" fill="#FBBC05" />
					<path d="M10.18 4.63C11.86 4.63 12.99 5.34 13.63 5.94L16.15 3.53C14.6 2.12 12.59 1.25 10.18 1.25C6.69 1.25 3.67 3.21 2.2 6.07L5.09 8.27C5.81 6.16 7.82 4.63 10.18 4.63Z" fill="#EB4335" />
				</svg>
			),
			iconBg: 'bg-white border border-gray-200 dark:border-gray-700',
			status: 'not_connected'
		},
		{
			id: 'shopify',
			name: 'Shopify',
			description: 'Publish articles, optimize collections, sync product data.',
			features: [
				'One-click publish from Workspace to Shopify blog',
				'Pull products and collections for content strategy',
				'Push product description rewrites directly',
				'Collection page SEO copy publisher'
			],
			icon: <ShoppingBag className="size-5 text-white" />,
			iconBg: 'bg-green-600',
			status: shopifyStatus?.connected ? 'connected' : 'not_connected'
		},
		{
			id: 'wordpress',
			name: 'WordPress',
			description: 'Publish content directly from Workspace to your WordPress site.',
			features: [
				'Publish articles to WordPress with one click',
				'Map Sharkly categories to WordPress categories',
				'Connects via Application Password — no plugin required'
			],
			icon: <Rss className="size-5 text-white" />,
			iconBg: 'bg-blue-600',
			status: 'not_connected'
		},
		{
			id: 'ga',
			name: 'Google Analytics',
			description: 'Traffic and user behavior data (coming soon).',
			features: [],
			icon: <BarChart2 className="size-5 text-white" />,
			iconBg: 'bg-orange-500',
			status: 'coming_soon',
			comingSoon: true
		}
	];

	return (
		<>
			<PageMeta title="Integrations" description="Connect your tools" />

			<div className="flex items-center gap-3">
				<Plug className="size-5 text-gray-400" />
				<div>
					<h1 className="font-montserrat text-xl font-bold text-gray-900 dark:text-white">
						Integrations
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Connect external tools to unlock more features.
					</p>
				</div>
			</div>

			{/* Site selector notice */}
			{!selectedSite && (
				<div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
					<Search className="size-4 flex-shrink-0" />
					Select a site in the top navigation to manage its integrations.
				</div>
			)}

			<div className="mt-6 space-y-3">
				{integrations.map((integration) => (
					<IntegrationRow
						key={integration.id}
						integration={integration}
						expanded={expanded === integration.id}
						onToggleExpand={() => toggleExpand(integration.id)}
						onConnect={
							integration.id === 'shopify'
								? (shopifyStatus?.connected ? undefined : handleShopifyConnect)
								: integration.id === 'wordpress'
								? () => setWpModalOpen(true)
								: integration.id === 'gsc'
								? () => {
										if (selectedSite?.id) {
											window.location.href = `/api/gsc/oauth/start?siteId=${selectedSite.id}`;
										} else {
											toast.error('Select a site first');
										}
								  }
								: undefined
						}
						onDisconnect={integration.id === 'shopify' ? handleShopifyDisconnect : undefined}
					>
						{/* Expanded content per integration */}
						{integration.id === 'gsc' && selectedSite ? (
							<div className="space-y-4">
								<GSCConnectionManager
									siteId={selectedSite.id}
									siteName={selectedSite.name ?? 'your site'}
								/>
								{integration.features.length > 0 && (
									<div>
										<p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
											Unlocks
										</p>
										<ul className="space-y-1">
											{integration.features.map((f) => (
												<li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
													<CheckCircle2 className="size-3.5 flex-shrink-0 text-green-500" />
													{f}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						) : integration.id === 'shopify' && selectedSite ? (
							<div className="space-y-4">
								<div>
									<Label htmlFor="shopify-store" className="text-sm font-medium">
										Shopify store URL
									</Label>
									<InputField
										id="shopify-store"
										value={shopifyShop}
										onChange={(e) => setShopifyShop(e.target.value)}
										placeholder="mystore or mystore.myshopify.com"
										className="mt-1"
									/>
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
										Enter your store name (e.g. mystore) or full myshopify.com domain.
									</p>
								</div>
								{integration.features.length > 0 && (
									<div>
										<p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
											Unlocks
										</p>
										<ul className="space-y-1">
											{integration.features.map((f) => (
												<li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
													<CheckCircle2 className="size-3.5 flex-shrink-0 text-green-500" />
													{f}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						) : (
							<div>
								{integration.features.length > 0 && (
									<div>
										<p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
											Unlocks
										</p>
										<ul className="space-y-1">
											{integration.features.map((f) => (
												<li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
													<CheckCircle2 className="size-3.5 flex-shrink-0 text-green-500" />
													{f}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						)}
					</IntegrationRow>
				))}
			</div>

			<WordPressConnectModal open={wpModalOpen} onClose={() => setWpModalOpen(false)} />
		</>
	);
}

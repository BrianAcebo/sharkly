/**
 * Shopify connection status for a site — shown in site details sheet.
 * Displays Connected / Not connected. Connection is done via the Shopify App Store install flow.
 * "Connect" stores siteId so when user returns from Shopify install, we pre-select this site.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { api } from '../../utils/api';
import { AlertCircle, Check, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { ShopifyIcon } from '../brands/Shopify';

const SHOPIFY_APP_URL = import.meta.env.VITE_SHOPIFY_APP_URL ?? 'https://apps.shopify.com/sharkly';

interface Props {
	siteId: string;
	siteName: string;
}

export function ShopifyConnectionStatus({ siteId, siteName }: Props) {
	const [connected, setConnected] = useState<boolean | null>(null);
	const [shopDomain, setShopDomain] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		const fetchStatus = async () => {
			try {
				const {
					data: { session }
				} = await supabase.auth.getSession();
				const token = session?.access_token;
				if (!token) {
					setConnected(false);
					setLoading(false);
					return;
				}
				const res = await api.get(`/api/shopify/status/${siteId}`);
				const data = (await res.json().catch(() => ({}))) as {
					connected?: boolean;
					shopDomain?: string | null;
				};
				if (!cancelled) {
					setConnected(!!data.connected);
					setShopDomain(data.shopDomain ?? null);
				}
			} catch {
				if (!cancelled) setConnected(false);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		fetchStatus();
		return () => {
			cancelled = true;
		};
	}, [siteId]);

	const shopifyAppUrl = useMemo(
		() =>
			`https://admin.shopify.com/store/${shopDomain?.replace('.myshopify.com', '')}/settings/apps/app_installations/app/sharkly`,
		[shopDomain]
	);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-6">
				<Loader2 className="size-5 animate-spin text-gray-400" />
				<span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading…</span>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{connected && shopDomain ? (
				<div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Check className="size-5 shrink-0 text-green-600 dark:text-green-400" />
							<div>
								<h3 className="text-sm font-medium text-green-900 dark:text-green-200">
									Connected
								</h3>
								<p className="mt-0.5 font-mono text-xs text-green-800 dark:text-green-300">
									{shopDomain}
								</p>
							</div>
						</div>

						<a href={shopifyAppUrl} target="_blank" rel="noopener noreferrer">
							<Button
								variant="outline"
								size="sm"
								className="border-green-300 text-sm hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
							>
								Manage
							</Button>
						</a>
					</div>
				</div>
			) : (
				<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
					<div className="mb-4 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<AlertCircle className="mt-0.5 size-5 shrink-0 text-gray-600 dark:text-gray-400" />
							<h3 className="text-sm font-medium text-gray-900 dark:text-white">Not connected</h3>
						</div>
						<Button
							size="sm"
							className="mt-3"
							onClick={() => {
								try {
									sessionStorage.setItem('sharkly_connect_site_id', siteId);
									toast.success(
										`We'll connect to "${siteName}" when you return. Install the app from Shopify.`
									);
									window.open(SHOPIFY_APP_URL, '_blank', 'noopener,noreferrer');
								} catch {
									window.open(SHOPIFY_APP_URL, '_blank', 'noopener,noreferrer');
								}
							}}
						>
							<ShopifyIcon className="size-5" />
							Connect
						</Button>
					</div>
					<p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
						Install the Sharkly app from the Shopify App Store to connect and manage ecommerce SEO
						for &quot;{siteName}&quot;.
					</p>
				</div>
			)}
		</div>
	);
}

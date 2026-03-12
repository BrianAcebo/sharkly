/**
 * Shopify connection status for a site — shown in site details sheet.
 * Displays Connected / Not connected. Connection is done via Settings → Integrations.
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { buildApiUrl } from '../../utils/urls';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

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
				const { data: { session } } = await supabase.auth.getSession();
				const token = session?.access_token;
				if (!token) {
					setConnected(false);
					setLoading(false);
					return;
				}
				const res = await fetch(buildApiUrl(`/api/shopify/status/${siteId}`), {
					headers: { Authorization: `Bearer ${token}` }
				});
				const data = (await res.json().catch(() => ({}))) as { connected?: boolean; shopDomain?: string | null };
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
		return () => { cancelled = true; };
	}, [siteId]);

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
					<div className="flex items-center gap-3">
						<Check className="size-5 shrink-0 text-green-600 dark:text-green-400" />
						<div>
							<h3 className="text-sm font-medium text-green-900 dark:text-green-200">Connected</h3>
							<p className="mt-0.5 text-xs text-green-800 dark:text-green-300 font-mono">{shopDomain}</p>
						</div>
					</div>
				</div>
			) : (
				<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
					<div className="flex items-center gap-3">
						<AlertCircle className="mt-0.5 size-5 text-gray-600 dark:text-gray-400" />
						<div>
							<h3 className="text-sm font-medium text-gray-900 dark:text-white">Not connected</h3>
							<p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
								Connect Shopify from Settings → Integrations to publish content and manage ecommerce SEO for "{siteName}".
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

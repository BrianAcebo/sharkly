/**
 * GSC Connection Manager — Site-Level Google Search Console Integration
 *
 * Each site can connect to one GSC property independently.
 * Connection is stored in gsc_tokens table with site_id.
 */

import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { supabase } from '../../utils/supabaseClient';
import { AlertCircle, Check, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '../ui/alert-dialog';

interface GSCToken {
	id: string;
	site_id: string;
	gsc_property_url: string;
	last_synced_at: string | null;
}

interface Props {
	siteId: string;
	siteName: string;
}

export function GSCConnectionManager({ siteId, siteName }: Props) {
	const [gscToken, setGscToken] = useState<GSCToken | null>(null);
	const [loading, setLoading] = useState(true);
	const [disconnecting, setDisconnecting] = useState(false);
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);

	// Fetch GSC token status on mount
	useEffect(() => {
		const fetchGSCToken = async () => {
			try {
				const { data, error } = await supabase
					.from('gsc_tokens')
					.select('id, site_id, gsc_property_url, last_synced_at')
					.eq('site_id', siteId)
					.maybeSingle();

				if (data) {
					setGscToken(data);
				}

				if (error) {
					console.error('Error fetching GSC token:', error);
				}
			} catch (err) {
				console.error('Error fetching GSC token:', err);
			} finally {
				setLoading(false);
			}
		};

		fetchGSCToken();
	}, [siteId]);

	const handleConnect = async () => {
		try {
			// Redirect to backend OAuth flow
			window.location.href = `/api/gsc/oauth/start?siteId=${siteId}`;
		} catch (err) {
			console.error('Error starting GSC connection:', err);
			toast.error('Failed to start Google Search Console connection');
		}
	};

	const handleDisconnect = async () => {
		if (!gscToken) return;

		try {
			setDisconnecting(true);
			const { error } = await supabase.from('gsc_tokens').delete().eq('id', gscToken.id);

			if (error) throw error;

			setGscToken(null);
			setShowConfirmDialog(false);
			toast.success('Google Search Console disconnected');
		} catch (err) {
			console.error('Error disconnecting GSC:', err);
			toast.error('Failed to disconnect Google Search Console');
		} finally {
			setDisconnecting(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="size-5 animate-spin text-gray-400" />
				<span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{gscToken ? (
				// Connected state
				<div className="rounded-lg border border-green-200 bg-green-50 p-2 dark:border-green-900 dark:bg-green-900/20">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Check className="mt-0.5 size-5 text-green-600 dark:text-green-400" />
							<div>
								<h3 className="text-sm font-medium text-green-900 dark:text-green-200">
									Connected
								</h3>
								<p className="mt-1 text-sm text-green-800 dark:text-green-300">
									<span className="font-mono text-xs">{gscToken.gsc_property_url}</span>
								</p>
								{gscToken.last_synced_at && (
									<p className="mt-1 text-xs text-green-700 dark:text-green-400">
										Last synced: {new Date(gscToken.last_synced_at).toLocaleString()}
									</p>
								)}
							</div>
						</div>

						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowConfirmDialog(true)}
							disabled={disconnecting}
							className="border-green-300 text-sm hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
						>
							{disconnecting ? (
								<Loader2 className="mr-1.5 size-3.5 animate-spin" />
							) : (
								<Trash2 className="mr-1.5 size-3.5" />
							)}
							Disconnect
						</Button>
					</div>
				</div>
			) : (
				// Not connected state
				<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
					<div className="mb-4 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<AlertCircle className="mt-0.5 size-5 text-gray-600 dark:text-gray-400" />
							<h3 className="text-sm font-medium text-gray-900 dark:text-white">Not connected</h3>
						</div>

						<Button
							onClick={handleConnect}
							size="sm"
							className="shrink-0 bg-blue-600 hover:bg-blue-700"
						>
							<svg
								className="mr-2 size-4"
								width="20"
								height="20"
								viewBox="0 0 20 20"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z"
									fill="#4285F4"
								/>
								<path
									d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z"
									fill="#34A853"
								/>
								<path
									d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z"
									fill="#FBBC05"
								/>
								<path
									d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z"
									fill="#EB4335"
								/>
							</svg>
							Connect
						</Button>
					</div>

					<p className="text-xs text-gray-600 dark:text-gray-400">
						Connect your Google Search Console account to view performance metrics, keyword
						rankings, and CTR data for "{siteName}".
					</p>
				</div>
			)}

			<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Disconnect Google Search Console?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove the Google Search Console connection for {gscToken?.gsc_property_url}
							. You can reconnect another property at any time.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={disconnecting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDisconnect}
							disabled={disconnecting}
							variant="destructive"
						>
							{disconnecting ? (
								<>
									<Loader2 className="mr-2 size-4 animate-spin" />
									Disconnecting...
								</>
							) : (
								'Disconnect'
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

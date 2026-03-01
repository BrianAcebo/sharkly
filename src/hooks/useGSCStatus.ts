/**
 * Hook: useGSCStatus
 * Checks if a site has a connected GSC token
 * Auto-refetches when page regains focus to catch OAuth redirects
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

interface UseGSCStatusResult {
	isConnected: boolean;
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

export function useGSCStatus(siteId?: string): UseGSCStatusResult {
	const [isConnected, setIsConnected] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const checkStatus = useCallback(async () => {
		if (!siteId) {
			setIsConnected(false);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const { data, error: fetchError } = await supabase
				.from('gsc_tokens')
				.select('id')
				.eq('site_id', siteId)
				.maybeSingle();

			if (fetchError) {
				// Log but don't throw - we want to gracefully handle all errors
				console.warn('GSC status check warning:', fetchError);
				setIsConnected(false);
				return;
			}

			setIsConnected(!!data);
		} catch (err) {
			console.error('Error checking GSC status:', err);
			setError(err instanceof Error ? err.message : 'Failed to check GSC status');
			setIsConnected(false);
		} finally {
			setLoading(false);
		}
	}, [siteId]);

	// Initial check
	useEffect(() => {
		checkStatus();
	}, [checkStatus]);

	// Refetch when page regains focus (useful for OAuth redirects)
	useEffect(() => {
		const handleFocus = () => {
			checkStatus();
		};

		window.addEventListener('focus', handleFocus);
		return () => window.removeEventListener('focus', handleFocus);
	}, [checkStatus]);

	return {
		isConnected,
		loading,
		error,
		refetch: checkStatus
	};
}


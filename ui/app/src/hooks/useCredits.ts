import { useCallback, useEffect, useState } from 'react';
import { getOrgCredits, type OrgCredits } from '../api/billingCredits';

export function useCredits(orgId: string | null) {
	const [data, setData] = useState<OrgCredits | null>(null);
	const [loading, setLoading] = useState<boolean>(!!orgId);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!orgId) return;
		setLoading(true);
		setError(null);
		try {
			const res = await getOrgCredits(orgId);
			setData(res);
		} catch (e: any) {
			setError(e?.message ?? 'Failed to load credits');
		} finally {
			setLoading(false);
		}
	}, [orgId]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { data, loading, error, refresh };
}



import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useSites } from '../hooks/useSites';
import type { Site } from '../types/site';

interface SiteContextValue {
	selectedSite: Site | null;
	sites: Site[];
	loading: boolean;
	setSelectedSite: (siteId: string | null) => Promise<void>;
	refetchSelectedSite: () => Promise<void>;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
	const { user } = useAuth();
	const { sites, loading: sitesLoading } = useSites();
	const [selectedSite, setSelectedSiteState] = useState<Site | null>(null);
	const [loadingSelected, setLoadingSelected] = useState(true);

	const organizationId = user?.organization_id ?? null;

	const fetchSelectedSite = useCallback(async () => {
		if (!user?.id || !organizationId) {
			setSelectedSiteState(null);
			setLoadingSelected(false);
			return;
		}
		try {
			setLoadingSelected(true);
			const { data, error } = await supabase
				.from('user_selected_sites')
				.select('selected_site_id')
				.eq('user_id', user.id)
				.eq('organization_id', organizationId)
				.maybeSingle();

			if (error) throw error;

			let siteId = data?.selected_site_id ?? null;
			if (!siteId && sites.length > 0) {
				siteId = sites[0].id;
				supabase
					.from('user_selected_sites')
					.upsert(
						{
							user_id: user.id,
							organization_id: organizationId,
							selected_site_id: siteId,
							updated_at: new Date().toISOString()
						},
						{ onConflict: 'user_id,organization_id' }
					)
					.then(() => {})
					.catch((err) => console.warn('Failed to persist default site:', err));
			}

			const site = siteId ? sites.find((s) => s.id === siteId) ?? null : null;
			setSelectedSiteState(site ?? (sites.length > 0 ? sites[0] : null));
		} catch (err) {
			console.error('Failed to fetch selected site:', err);
			setSelectedSiteState(null);
		} finally {
			setLoadingSelected(false);
		}
	}, [user?.id, organizationId, sites]);

	useEffect(() => {
		if (!sitesLoading) {
			fetchSelectedSite();
		}
	}, [sitesLoading, fetchSelectedSite]);

	const setSelectedSite = useCallback(
		async (siteId: string | null) => {
			if (!user?.id || !organizationId) return;

			try {
				const { error } = await supabase.from('user_selected_sites').upsert(
					{
						user_id: user.id,
						organization_id: organizationId,
						selected_site_id: siteId,
						updated_at: new Date().toISOString()
					},
					{ onConflict: 'user_id,organization_id' }
				);

				if (error) throw error;

				const site = siteId ? sites.find((s) => s.id === siteId) ?? null : null;
				setSelectedSiteState(site);

				window.location.reload();
			} catch (err) {
				console.error('Failed to set selected site:', err);
				throw err;
			}
		},
		[user?.id, organizationId, sites]
	);

	const loading = sitesLoading || loadingSelected;

	return (
		<SiteContext.Provider
			value={{
				selectedSite,
				sites,
				loading,
				setSelectedSite,
				refetchSelectedSite: fetchSelectedSite
			}}
		>
			{children}
		</SiteContext.Provider>
	);
}

export function useSiteContext() {
	const ctx = useContext(SiteContext);
	if (!ctx) {
		throw new Error('useSiteContext must be used within SiteProvider');
	}
	return ctx;
}

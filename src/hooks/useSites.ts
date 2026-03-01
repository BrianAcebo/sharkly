import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { Site } from '../types/site';
import { useAuth } from './useAuth';

const ASSETS_BUCKET = 'assets';
const LOGO_PREFIX = 'site-logos';

function storagePath(organizationId: string, siteId: string, ext: string): string {
	return `${LOGO_PREFIX}/${organizationId}/${siteId}_${Date.now()}.${ext}`;
}

function getLogoPublicUrl(logoPath: string | null): string | null {
	if (!logoPath) return null;
	if (logoPath.startsWith('http')) return logoPath;
	const { data } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(logoPath);
	return data.publicUrl;
}

export function useSites() {
	const { user } = useAuth();
	const organizationId = user?.organization_id ?? null;
	const [sites, setSites] = useState<Site[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchSites = useCallback(async () => {
		if (!organizationId) {
			setSites([]);
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const { data, error: fetchError } = await supabase
				.from('sites')
				.select('id, name, description, logo, url, platform, niche, customer_description, competitor_urls, created_at, updated_at')
				.eq('organization_id', organizationId)
				.order('created_at', { ascending: false });

			if (fetchError) throw fetchError;

			const withUrls: Site[] = (data ?? []).map((row) => ({
				id: row.id,
				name: row.name,
				description: row.description ?? '',
				logo: getLogoPublicUrl(row.logo),
				logoPath: row.logo ?? null,
				url: row.url ?? '',
				platform: row.platform ?? '',
				niche: row.niche ?? '',
				customerDescription: row.customer_description ?? '',
				competitorUrls: Array.isArray(row.competitor_urls) ? row.competitor_urls : [],
				createdAt: row.created_at,
				updatedAt: row.updated_at
			}));
			setSites(withUrls);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load sites');
			setSites([]);
		} finally {
			setLoading(false);
		}
	}, [organizationId]);

	useEffect(() => {
		fetchSites();
	}, [fetchSites]);

	const createSite = useCallback(
		async (data: {
			name: string;
			description: string;
			url: string;
			platform?: string;
			niche?: string;
			customerDescription?: string;
			competitorUrls?: string[];
			logoFile?: File | null;
		}) => {
			if (!organizationId) throw new Error('No organization');
			const { data: inserted, error: insertError } = await supabase
				.from('sites')
				.insert({
					organization_id: organizationId,
					name: data.name,
					description: data.description || '',
					url: data.url || '',
					platform: data.platform || '',
					niche: data.niche || '',
					customer_description: data.customerDescription || '',
					competitor_urls: data.competitorUrls ?? [],
					logo: null
				})
				.select('id')
				.single();

			if (insertError) throw insertError;
			const siteId = inserted.id;

			let logoPath: string | null = null;
			if (data.logoFile) {
				const ext = data.logoFile.name.split('.').pop() || 'png';
				const path = storagePath(organizationId, siteId, ext);
				const { error: uploadError } = await supabase.storage
					.from(ASSETS_BUCKET)
					.upload(path, data.logoFile, {
						upsert: true,
						cacheControl: '3600',
						contentType: data.logoFile.type
					});
				if (!uploadError) {
					logoPath = path;
					await supabase.from('sites').update({ logo: path }).eq('id', siteId);
				}
			}

			await fetchSites();
			return siteId;
		},
		[organizationId, fetchSites]
	);

	const updateSite = useCallback(
		async (
			siteId: string,
			data: {
				name: string;
				description: string;
				url: string;
				platform?: string;
				niche?: string;
				customerDescription?: string;
				competitorUrls?: string[];
				logoFile?: File | null;
				removeLogo?: boolean;
			}
		) => {
			if (!organizationId) throw new Error('No organization');

			const existing = sites.find((s) => s.id === siteId);
			const currentLogoPath = existing?.logoPath ?? null;

			let logoPath: string | null = currentLogoPath ?? null;

			if (data.removeLogo && currentLogoPath) {
				await supabase.storage.from(ASSETS_BUCKET).remove([currentLogoPath]);
				logoPath = null;
			} else if (data.logoFile) {
				if (currentLogoPath) {
					await supabase.storage.from(ASSETS_BUCKET).remove([currentLogoPath]);
				}
				const ext = data.logoFile.name.split('.').pop() || 'png';
				const path = storagePath(organizationId, siteId, ext);
				const { error: uploadError } = await supabase.storage
					.from(ASSETS_BUCKET)
					.upload(path, data.logoFile, {
						upsert: true,
						cacheControl: '3600',
						contentType: data.logoFile.type
					});
				if (!uploadError) logoPath = path;
			}

			const { error: updateError } = await supabase
				.from('sites')
				.update({
					name: data.name,
					description: data.description || '',
					url: data.url || '',
					platform: data.platform ?? '',
					niche: data.niche ?? '',
					customer_description: data.customerDescription ?? '',
					competitor_urls: data.competitorUrls ?? [],
					logo: logoPath
				})
				.eq('id', siteId)
				.eq('organization_id', organizationId);

			if (updateError) throw updateError;
			await fetchSites();
		},
		[organizationId, sites, fetchSites]
	);

	const deleteSite = useCallback(
		async (siteId: string) => {
			if (!organizationId) throw new Error('No organization');

			const site = sites.find((s) => s.id === siteId);
			if (site?.logoPath) {
				await supabase.storage.from(ASSETS_BUCKET).remove([site.logoPath]);
			}

			const { error: deleteError } = await supabase
				.from('sites')
				.delete()
				.eq('id', siteId)
				.eq('organization_id', organizationId);

			if (deleteError) throw deleteError;
			await fetchSites();
		},
		[organizationId, sites, fetchSites]
	);

	return { sites, loading, error, createSite, updateSite, deleteSite, refetch: fetchSites };
}

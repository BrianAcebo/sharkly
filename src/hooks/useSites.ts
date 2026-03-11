import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { buildApiUrl } from '../utils/urls';
import { isYMYLNiche } from '../lib/ymyl';
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
				.select(
					'id, name, description, logo, url, platform, niche, customer_description, competitor_urls, domain_authority, tone, include_terms, avoid_terms, target_language, target_region, author_bio, google_review_count, google_average_rating, gbp_url, facebook_url, linkedin_url, twitter_url, yelp_url, wikidata_url, is_ymyl, created_at, updated_at'
				)
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
				domainAuthority: Number(row.domain_authority ?? 0),
			tone: (row.tone as string | null) ?? null,
			includeTerms: (row.include_terms as string | null) ?? null,
			avoidTerms: (row.avoid_terms as string | null) ?? null,
			targetLanguage: (row.target_language as string | null) ?? 'English',
			targetRegion: (row.target_region as string | null) ?? 'United States',
				authorBio: (row.author_bio as string | null) ?? null,
				googleReviewCount: (row.google_review_count as number | null) ?? null,
				googleAverageRating: (row.google_average_rating as number | null) ?? null,
				gbpUrl: (row.gbp_url as string | null) ?? null,
				facebookUrl: (row.facebook_url as string | null) ?? null,
				linkedinUrl: (row.linkedin_url as string | null) ?? null,
				twitterUrl: (row.twitter_url as string | null) ?? null,
				yelpUrl: (row.yelp_url as string | null) ?? null,
				wikidataUrl: (row.wikidata_url as string | null) ?? null,
				isYMYL: Boolean(row.is_ymyl),
				createdAt: row.created_at,
				updatedAt: row.updated_at
			}));
			setSites(withUrls);
		} catch (err) {
			console.error(err);
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
			domainAuthority?: number;
			tone?: string;
			includeTerms?: string;
			avoidTerms?: string;
			targetLanguage?: string;
			targetRegion?: string;
			authorBio?: string | null;
			googleReviewCount?: number | null;
			googleAverageRating?: number | null;
			gbpUrl?: string | null;
			facebookUrl?: string | null;
			linkedinUrl?: string | null;
			twitterUrl?: string | null;
			yelpUrl?: string | null;
			wikidataUrl?: string | null;
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
					domain_authority: data.domainAuthority ?? 0,
					tone: data.tone || null,
					include_terms: data.includeTerms || null,
					avoid_terms: data.avoidTerms || null,
					target_language: data.targetLanguage || 'English',
					target_region: data.targetRegion || 'United States',
					author_bio: data.authorBio ?? null,
					is_ymyl: isYMYLNiche(data.niche || '', data.name || '', data.description || ''),
					google_review_count: data.googleReviewCount ?? null,
					google_average_rating: data.googleAverageRating ?? null,
					gbp_url: data.gbpUrl ?? null,
					facebook_url: data.facebookUrl ?? null,
					linkedin_url: data.linkedinUrl ?? null,
					twitter_url: data.twitterUrl ?? null,
					yelp_url: data.yelpUrl ?? null,
					wikidata_url: data.wikidataUrl ?? null,
					logo: null
				})
				.select('id')
				.single();

		if (insertError) throw insertError;
		const siteId = inserted.id;

		// Auto-fetch DA from Moz in the background — don't block site creation if it fails
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (!session?.access_token) return;
			fetch(buildApiUrl(`/api/sites/${siteId}/refresh-authority`), {
				method: 'POST',
				headers: { Authorization: `Bearer ${session.access_token}` },
			})
				.then((r) => r.json())
				.then((d) => { if (d.updated) console.log(`[Sites] DA fetched for new site: ${d.domain_authority}`); })
				.catch(() => { /* non-fatal */ });
		});

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
				domainAuthority?: number;
				tone?: string;
				includeTerms?: string;
				avoidTerms?: string;
				targetLanguage?: string;
				targetRegion?: string;
				authorBio?: string | null;
				googleReviewCount?: number | null;
				googleAverageRating?: number | null;
				gbpUrl?: string | null;
				facebookUrl?: string | null;
				linkedinUrl?: string | null;
				twitterUrl?: string | null;
				yelpUrl?: string | null;
				wikidataUrl?: string | null;
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
					domain_authority: data.domainAuthority ?? 0,
				tone: data.tone || null,
				include_terms: data.includeTerms || null,
				avoid_terms: data.avoidTerms || null,
				target_language: data.targetLanguage || 'English',
				target_region: data.targetRegion || 'United States',
				author_bio: data.authorBio ?? null,
				is_ymyl: isYMYLNiche(data.niche || '', data.name || '', data.description || ''),
				google_review_count: data.googleReviewCount ?? null,
				google_average_rating: data.googleAverageRating ?? null,
				gbp_url: data.gbpUrl ?? null,
				facebook_url: data.facebookUrl ?? null,
				linkedin_url: data.linkedinUrl ?? null,
				twitter_url: data.twitterUrl ?? null,
				yelp_url: data.yelpUrl ?? null,
				wikidata_url: data.wikidataUrl ?? null,
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

	/**
	 * Fetch the latest Domain Authority from Moz for a site and update the DB.
	 * Returns the new DA value, or null if the fetch failed / Moz not configured.
	 */
	const refreshSiteAuthority = useCallback(async (siteId: string): Promise<number | null> => {
		const { data: { session } } = await supabase.auth.getSession();
		if (!session?.access_token) return null;
		try {
			const res = await fetch(buildApiUrl(`/api/sites/${siteId}/refresh-authority`), {
				method: 'POST',
				headers: { Authorization: `Bearer ${session.access_token}` },
			});
			const d = await res.json();
			if (d.updated || d.domain_authority != null) {
				await fetchSites(); // re-load so UI shows new value
				return d.domain_authority as number;
			}
			return null;
		} catch {
			return null;
		}
	}, [fetchSites]);

	return { sites, loading, error, createSite, updateSite, deleteSite, refetch: fetchSites, refreshSiteAuthority };
}

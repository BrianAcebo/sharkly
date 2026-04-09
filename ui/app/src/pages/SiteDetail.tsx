/**
 * Site Detail Page — full-page site settings at /sites/:id
 * Tabbed layout: General, Branding, Business / E-E-A-T, Content, Integrations
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, ExternalLink, Globe, Loader2, ShieldCheck, Zap } from 'lucide-react';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '../components/ui/alert-dialog';
import SiteDetailForm from '../components/sites/SiteDetailForm';
import type { Site } from '../types/site';
import type { SiteFormData } from '../components/sites/SiteDetailForm';
import { useSites, fetchSiteDeletionBlockers, type SiteDeletionBlockers } from '../hooks/useSites';
import { toast } from 'sonner';

export default function SiteDetail() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { sites, loading: sitesLoading, updateSite, deleteSite } = useSites();
	const [site, setSite] = useState<Site | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
	const [deletionBlockers, setDeletionBlockers] = useState<SiteDeletionBlockers | null>(null);
	const [deletionCheckLoading, setDeletionCheckLoading] = useState(true);

	useEffect(() => {
		if (!id) {
			setSite(null);
			return;
		}
		const found = sites.find((s) => s.id === id);
		setSite(found ?? null);
	}, [id, sites]);

	useEffect(() => {
		if (!site?.id) {
			setDeletionBlockers(null);
			setDeletionCheckLoading(false);
			return;
		}
		let cancelled = false;
		setDeletionCheckLoading(true);
		fetchSiteDeletionBlockers(site.id)
			.then((b) => {
				if (!cancelled) setDeletionBlockers(b);
			})
			.catch(() => {
				if (!cancelled) setDeletionBlockers(null);
			})
			.finally(() => {
				if (!cancelled) setDeletionCheckLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [site?.id]);

	// Handle Shopify/GSC callback params
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const shopifySuccess = params.get('shopify_success');
		const shopifyError = params.get('shopify_error');
		const gscError = params.get('gsc_error');

		if (gscError) toast.error(`GSC Connection Failed: ${gscError}`);
		if (shopifySuccess) toast.success('Shopify store connected!');
		if (shopifyError) {
			const msg =
				shopifyError === 'invalid_state'
					? 'Session expired. Please try connecting again.'
					: shopifyError === 'hmac_invalid'
						? 'Invalid request'
						: shopifyError.replace(/_/g, ' ');
			toast.error(`Shopify: ${msg}`);
		}

		if (gscError || shopifyError || shopifySuccess) {
			window.history.replaceState({}, document.title, window.location.pathname);
		}
	}, []);

	const handleFormSubmit = async (data: SiteFormData) => {
		if (!site) return;
		try {
			setSubmitting(true);
			await updateSite(site.id, {
				name: data.name,
				description: data.description,
				url: data.url,
				platform: data.platform,
				niche: data.niche,
				customerDescription: data.customerDescription,
				competitorUrls: data.competitorUrls,
				domainAuthority: data.domainAuthority,
				tone: data.tone,
				includeTerms: data.includeTerms,
				avoidTerms: data.avoidTerms,
				targetLanguage: data.targetLanguage,
				targetRegion: data.targetRegion,
				authorBio: data.authorBio,
				googleReviewCount: data.googleReviewCount,
				googleAverageRating: data.googleAverageRating,
				gbpUrl: data.gbpUrl,
				facebookUrl: data.facebookUrl,
				linkedinUrl: data.linkedinUrl,
				twitterUrl: data.twitterUrl,
				yelpUrl: data.yelpUrl,
				wikidataUrl: data.wikidataUrl,
				originalInsight: data.originalInsight,
				cartesiaVoiceId: data.cartesiaVoiceId,
				logoFile: data.logoFile,
				removeLogo: data.removeLogo
			});
			toast.success('Site updated');
			const blockers = await fetchSiteDeletionBlockers(site.id);
			setDeletionBlockers(blockers);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save site');
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteClick = () => {
		if (!site || deletionCheckLoading) return;
		if (deletionBlockers && !deletionBlockers.canDelete) return;
		setSiteToDelete(site);
	};

	const handleDeleteConfirm = async () => {
		if (!siteToDelete) return;
		try {
			setSubmitting(true);
			await deleteSite(siteToDelete.id);
			toast.success('Site deleted');
			navigate('/sites');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete site');
		} finally {
			setSubmitting(false);
			setSiteToDelete(null);
		}
	};

	if (sitesLoading || (id && sites.length > 0 && !site)) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<Loader2 className="size-8 animate-spin text-gray-400" />
			</div>
		);
	}

	if (!id || !site) {
		return (
			<div className="p-6">
				<p className="text-gray-600 dark:text-gray-400">Site not found.</p>
				<Link to="/sites">
					<Button variant="link" className="mt-2">
						Back to Sites
					</Button>
				</Link>
			</div>
		);
	}

	const da = site.domainAuthorityEstimated ?? site.domainAuthority;

	return (
		<>
			<PageMeta title={site.name} description="Site settings" />
			<PageHeader
				title={site.name}
				subtitle="Configure your site settings and integrations"
				breadcrumb={
					<Link to="/sites" className="text-brand-500 hover:underline dark:text-brand-400">
						<ArrowLeft className="mr-1 inline size-3" />
						Sites
					</Link>
				}
			/>

			{/* Site overview strip */}
			<div className="mt-4 flex flex-wrap items-center gap-5 rounded-xl border border-gray-200 bg-white px-6 py-5 dark:border-gray-700 dark:bg-gray-900">
				<div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
					{site.logo ? (
						<img src={site.logo} alt={site.name} className="size-full object-cover" />
					) : (
						<Globe className="size-7 text-gray-400 dark:text-gray-500" />
					)}
				</div>

				<div className="min-w-0 flex-1">
					<p className="truncate text-base font-semibold text-gray-900 dark:text-white">
						{site.name}
					</p>
					{site.url && (
						<a
							href={site.url.startsWith('http') ? site.url : `https://${site.url}`}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-0.5 flex w-fit items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						>
							{site.url}
							<ExternalLink className="size-3" />
						</a>
					)}
				</div>

				<div className="flex flex-wrap items-center gap-3">
					{da > 0 && (
						<div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800">
							<Zap className="size-3.5 text-amber-500" />
							<span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
								DA {da}
							</span>
						</div>
					)}
					{site.gsc_connected && (
						<div className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 dark:border-green-800/40 dark:bg-green-900/20">
							<ShieldCheck className="size-3.5 text-green-600 dark:text-green-400" />
							<span className="text-xs font-semibold text-green-700 dark:text-green-300">
								GSC connected
							</span>
						</div>
					)}
					{site.platform && (
						<span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium capitalize text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
							{site.platform}
						</span>
					)}
				</div>
			</div>

			<div className="mt-6">
				<SiteDetailForm
					key={site.id}
					initial={site}
					onSubmit={handleFormSubmit}
					onCancel={() => navigate('/sites')}
					onDelete={handleDeleteClick}
					disabled={submitting}
					variant="page"
					deleteCheckLoading={deletionCheckLoading}
					deleteBlocked={Boolean(deletionBlockers && !deletionBlockers.canDelete)}
					deleteBlockedMessage={deletionBlockers?.summaryText ?? ''}
				/>
			</div>

			<AlertDialog open={!!siteToDelete} onOpenChange={(o) => !o && setSiteToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete site?</AlertDialogTitle>
						{siteToDelete && (
							<p className="text-sm text-gray-600 dark:text-gray-400">
								This will remove &quot;{siteToDelete.name}&quot; and cannot be undone. You can only
								delete a site after all clusters, pages, and other linked data are removed.
							</p>
						)}
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							disabled={submitting}
							variant="destructive"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

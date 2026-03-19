import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Plus, Globe, Pencil, ExternalLink, Check } from 'lucide-react';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription
} from '../components/ui/sheet';
import SiteDetailForm from '../components/sites/SiteDetailForm';
import type { Site } from '../types/site';
import type { SiteFormData } from '../components/sites/SiteDetailForm';
import { useSites } from '../hooks/useSites';
import { useSiteContext } from '../contexts/SiteContext';
import { toast } from 'sonner';

export default function Sites() {
	const navigate = useNavigate();
	const { sites, loading, error, createSite } = useSites();
	const { selectedSite, setSelectedSite } = useSiteContext();
	const [sheetOpen, setSheetOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	// Check for GSC/Shopify callback params in URL — redirect to site detail when shopify_success
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const gscError = params.get('gsc_error');
		const shopifySuccess = params.get('shopify_success');
		const shopifyError = params.get('shopify_error');
		const siteIdParam = params.get('siteId');

		if (gscError) toast.error(`GSC Connection Failed: ${gscError}`);
		if (shopifySuccess) {
			toast.success('Shopify store connected!');
			if (siteIdParam) navigate(`/sites/${siteIdParam}`, { replace: true });
		}
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
	}, [sites, navigate]);

	const handleAdd = () => {
		setSheetOpen(true);
	};

	const handleReAudit = async (site: Site) => {
		try {
			setSubmitting(true);
			// TODO: wire to re-audit API (10 credits)
			toast.info(`Re-audit queued for "${site.name}" (10 credits)`);
		} catch {
			// TODO: wire re-audit
		} finally {
			setSubmitting(false);
		}
	};

	const handleSelectSite = async (site: Site) => {
		try {
			if (selectedSite?.id === site.id) return;
			setSubmitting(true);
			await setSelectedSite(site.id);
			toast.success(`"${site.name}" is now your active site`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to select site');
			setSubmitting(false);
		}
	};

	const handleSheetClose = (open: boolean) => {
		if (!open) setSheetOpen(false);
	};

	const handleFormSubmit = async (data: SiteFormData) => {
		try {
			setSubmitting(true);
			await createSite({
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
				logoFile: data.logoFile ?? null
			});
			toast.success('Site added');
			setSheetOpen(false);
			setTimeout(() => window.location.reload(), 500);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save site');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<>
			<PageMeta title="Sites" description="Manage your websites" />
			<PageHeader
				title="Sites"
				subtitle="Add and manage the websites you want to optimize"
				rightContent={
					<Button
						size="sm"
						className="bg-brand-500 hover:bg-brand-600 text-white"
						onClick={handleAdd}
						startIcon={<Plus className="size-4" />}
					>
						Add Site
					</Button>
				}
			/>

			{error && (
				<div className="border-error-200 bg-error-50 text-error-700 dark:border-error-900 dark:bg-error-900/20 dark:text-error-400 mt-4 rounded-lg border px-4 py-3 text-sm">
					{error}
				</div>
			)}

			<div className="mt-6 flex flex-col gap-4">
				{loading ? (
					<div className="flex min-h-[200px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
						<p className="text-gray-500 dark:text-gray-400">Loading sites...</p>
					</div>
				) : sites.length === 0 ? (
					<div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900">
						<div className="flex size-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
							<Globe className="size-8 text-gray-500 dark:text-gray-400" />
						</div>
						<h3 className="font-syne mt-4 text-lg font-bold text-gray-900 dark:text-white">
							No sites yet
						</h3>
						<p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-400">
							Add your first website to start tracking SEO performance and generating content.
						</p>
						<Button
							className="bg-brand-500 hover:bg-brand-600 mt-6 text-white"
							onClick={handleAdd}
							startIcon={<Plus className="size-4" />}
						>
							Add Site
						</Button>
					</div>
				) : (
					sites.map((site) => (
						<div
							key={site.id}
							className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
						>
							<div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
								{site.logo ? (
									<img src={site.logo} alt={site.name} className="size-full object-cover" />
								) : (
									<Globe className="size-7 text-gray-500 dark:text-gray-400" />
								)}
							</div>
							<div className="min-w-0 flex-1">
								<div className="font-semibold text-gray-900 dark:text-white">{site.name}</div>
								{site.description && (
									<p className="mt-0.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
										{site.description}
									</p>
								)}
								{site.url && (
									<a
										href={site.url.startsWith('http') ? site.url : `https://${site.url}`}
										target="_blank"
										rel="noopener noreferrer"
										className="text-brand-500 dark:text-brand-400 mt-1 flex w-fit items-center gap-2 truncate text-xs hover:underline"
									>
										{site.url}
										<ExternalLink className="size-3" />
									</a>
								)}
							</div>
							<div className="flex shrink-0 items-center gap-2">
								<Button
									variant="ghost"
									size="sm"
									className={
										selectedSite?.id === site.id
											? 'text-brand-500 dark:text-brand-400'
											: 'text-gray-500 dark:text-gray-400'
									}
									onClick={() => handleSelectSite(site)}
									disabled={submitting}
									startIcon={selectedSite?.id === site.id ? <Check className="size-4" /> : null}
								>
									{selectedSite?.id === site.id ? 'Active' : 'Select'}
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="border-gray-200 dark:border-gray-700"
									asChild
								>
									<Link to={`/sites/${site.id}`} className="inline-flex items-center gap-2">
										<Pencil className="size-4" />
										Edit
									</Link>
								</Button>
								{/* <Button
									variant="outline"
									size="sm"
									className="border-gray-200 dark:border-gray-700"
									onClick={() => handleReAudit(site)}
									disabled={submitting}
									startIcon={<RefreshCw className="size-4" />}
								>
									<CreditBadge cost={10} action="Re-audit" sufficient />
									<span className="ml-1">Re-audit</span>
								</Button> */}
							</div>
						</div>
					))
				)}
			</div>

			<Sheet open={sheetOpen} onOpenChange={handleSheetClose}>
				<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
					<SheetHeader>
						<SheetTitle>Add Site</SheetTitle>
						<SheetDescription>Add a new website to track and optimize.</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<SiteDetailForm
							onSubmit={handleFormSubmit}
							onCancel={() => handleSheetClose(false)}
							onDelete={() => {}}
							disabled={submitting}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}

import { useState, useEffect, useRef } from 'react';
import Label from '../form/Label';
import Input from '../form/input/InputField';
import { Button } from '../ui/button';
import { supabase } from '../../utils/supabaseClient';
import useAuth from '../../hooks/useAuth';
import { toast } from 'sonner';
import { buildApiUrl } from '../../utils/urls';
import { Check, Loader2 } from 'lucide-react';
import { useSiteContext } from '../../contexts/SiteContext';
import { waitForOrganizationMembership } from '../../utils/waitForOrganizationMembership';

const PLATFORMS = [
	{ value: 'shopify', label: 'Shopify' },
	{ value: 'woocommerce', label: 'WooCommerce' },
	{ value: 'wordpress', label: 'WordPress' },
	{ value: 'webflow', label: 'Webflow' },
	{ value: 'custom', label: 'Custom' },
	{ value: 'other', label: 'Other' }
];

type Step = 1 | 2 | 3 | 4;

export default function SiteSetupForm() {
	const { user, updateUser } = useAuth();
	const { sites, loading: sitesLoading, refetchSites } = useSiteContext();
	const [step, setStep] = useState<Step>(1);
	const completionToastShown = useRef(false);
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const [url, setUrl] = useState('https://');
	const [businessName, setBusinessName] = useState('');
	const [niche, setNiche] = useState('');
	const [platform, setPlatform] = useState('custom');
	const [customerDescription, setCustomerDescription] = useState('');

	const [result, setResult] = useState<{ siteId: string } | null>(null);

	const searchParams = new URLSearchParams(window.location.search);
	const next = searchParams.get('next') ?? '/dashboard';

	const normalizeUrl = (u: string) => {
		let v = u.trim();
		if (!v) return '';
		if (!v.startsWith('http')) v = `https://${v}`;
		try {
			new URL(v);
			return v;
		} catch {
			return '';
		}
	};

	const handleStep1Continue = () => {
		setError('');
		const normalized = normalizeUrl(url);
		if (!normalized) {
			setError('Please enter a valid, reachable URL');
			return;
		}
		setUrl(normalized);
		setStep(2);
	};

	const runSiteSetup = async () => {
		if (!user) return;
		setError('');
		if (!businessName.trim()) {
			setError('Business name is required');
			return;
		}
		const normalized = normalizeUrl(url);
		if (!normalized) {
			setError('Please enter a valid website URL on the previous step');
			return;
		}
		setUrl(normalized);
		setStep(3);
		setIsLoading(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				throw new Error('Not authenticated');
			}

			const res = await fetch(buildApiUrl('/api/onboarding/complete'), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					url: normalized,
					businessName: businessName.trim(),
					niche: niche.trim(),
					customerDescription: customerDescription.trim(),
					platform
				})
			});

			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data?.error || 'Something went wrong');
			}

			setResult({ siteId: data.siteId ?? '' });
			await waitForOrganizationMembership(updateUser);
			await refetchSites();
			setStep(4);
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: 'Something went wrong creating your site. Please try again.';
			setError(msg);
			toast.error(msg);
			setStep(2);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (step !== 4 || !result || completionToastShown.current) return;
		completionToastShown.current = true;
		toast.success('Site added', {
			description:
				'Your site is saved. You can explore Strategy and other tools from the dashboard.'
		});
	}, [step, result]);

	const hasSites = !sitesLoading && sites.length > 0;

	useEffect(() => {
		// Avoid redirect during the create-site request (step 3) before we advance to step 4.
		if (!hasSites || step === 4 || isLoading) return;
		window.location.assign(next);
	}, [hasSites, step, next, isLoading]);

	return (
		<div className="flex w-full flex-1 flex-col">
			<div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 pt-10">
				{step === 1 && (
					<div className="space-y-6">
						<div className="text-center">
							<h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-900 dark:text-white/90">
								Let&apos;s get started — what&apos;s your website?
							</h1>
						</div>
						{error && <p className="text-center text-sm text-red-500 dark:text-red-400">{error}</p>}
						<div>
							<Label htmlFor="url">Website URL</Label>
							<Input
								id="url"
								type="url"
								value={url}
								onChange={(e) => setUrl(e.target.value)}
								placeholder="https://yoursite.com"
							/>
						</div>
						<Button variant="primary" fullWidth onClick={handleStep1Continue}>
							Continue
						</Button>
					</div>
				)}

				{step === 2 && (
					<div className="space-y-6">
						<div className="text-center">
							<h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-900 dark:text-white/90">
								Tell us about your business
							</h1>
						</div>
						{error && <p className="text-center text-sm text-red-500 dark:text-red-400">{error}</p>}
						<div>
							<Label htmlFor="businessName">Business name</Label>
							<Input
								id="businessName"
								value={businessName}
								onChange={(e) => setBusinessName(e.target.value)}
								placeholder="Acme Inc"
							/>
						</div>
						<div>
							<Label htmlFor="niche">What do you sell or offer?</Label>
							<textarea
								id="niche"
								value={niche}
								onChange={(e) => setNiche(e.target.value)}
								placeholder="Helps AI generate relevant topics"
								className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
								rows={2}
							/>
						</div>
						<div>
							<Label htmlFor="platform">Platform</Label>
							<select
								id="platform"
								value={platform}
								onChange={(e) => setPlatform(e.target.value)}
								className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
							>
								{PLATFORMS.map((p) => (
									<option key={p.value} value={p.value}>
										{p.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<Label htmlFor="customerDescription">Who are your ideal customers?</Label>
							<textarea
								id="customerDescription"
								value={customerDescription}
								onChange={(e) => setCustomerDescription(e.target.value)}
								placeholder="Used for brand voice and content targeting"
								className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
								rows={2}
							/>
						</div>
						<Button variant="primary" fullWidth onClick={runSiteSetup} disabled={isLoading}>
							Create my site
						</Button>
					</div>
				)}

				{step === 3 && (
					<div className="space-y-8 py-8">
						<div className="text-center">
							<h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-900 dark:text-white/90">
								Creating your site
							</h1>
							<p className="text-sm text-gray-500 dark:text-gray-400">Just a moment…</p>
						</div>
						<div className="space-y-4">
							{[
								'Saving your business profile...',
								'Creating your site...',
								'Finishing setup...'
							].map((label, i) => (
								<div key={i} className="flex items-center gap-3">
									{isLoading ? (
										<Loader2 className="text-brand-500 size-5 animate-spin" />
									) : (
										<Check className="size-5 text-green-500" />
									)}
									<span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
								</div>
							))}
						</div>
						{error && (
							<div className="text-center">
								<p className="text-sm text-red-500 dark:text-red-400">{error}</p>
								<Button variant="outline" className="mt-4" onClick={() => setStep(2)}>
									Try again
								</Button>
							</div>
						)}
					</div>
				)}

				{step === 4 && result && (
					<div className="space-y-6">
						<div className="text-center">
							<h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-900 dark:text-white/90">
								Your site is ready
							</h1>
						</div>
						<div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
							<p className="text-sm text-gray-700 dark:text-gray-300">
								You can edit details anytime under Sites → your site. Add topics and run research
								from Strategy when you&apos;re ready.
							</p>
						</div>
						<div className="space-y-3">
							<Button
								variant="primary"
								fullWidth
								className="bg-brand-500 hover:bg-brand-600"
								onClick={() => window.location.assign('/dashboard')}
							>
								Go to dashboard
							</Button>
							<Button
								variant="outline"
								fullWidth
								onClick={() => window.location.assign('/strategy')}
							>
								Open Strategy
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

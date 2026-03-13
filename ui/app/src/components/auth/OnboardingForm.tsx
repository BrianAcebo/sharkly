import { useState } from 'react';
import Label from '../form/Label';
import Input from '../form/input/InputField';
import { Button } from '../ui/button';
import { supabase } from '../../utils/supabaseClient';
import useAuth from '../../hooks/useAuth';
import { toast } from 'sonner';
import { Navigate, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../../utils/urls';
import { Check, Loader2 } from 'lucide-react';

const PLATFORMS = [
	{ value: 'shopify', label: 'Shopify' },
	{ value: 'woocommerce', label: 'WooCommerce' },
	{ value: 'wordpress', label: 'WordPress' },
	{ value: 'webflow', label: 'Webflow' },
	{ value: 'custom', label: 'Custom' },
	{ value: 'other', label: 'Other' }
];

type Step = 1 | 2 | 3 | 4 | 5;

export default function OnboardingForm() {
	const { user, updateUser } = useAuth();
	const navigate = useNavigate();
	const [step, setStep] = useState<Step>(1);
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	// Step 1
	const [url, setUrl] = useState('https://');

	// Step 2
	const [businessName, setBusinessName] = useState('');
	const [niche, setNiche] = useState('');
	const [platform, setPlatform] = useState('custom');
	const [customerDescription, setCustomerDescription] = useState('');

	// Step 2 — domain authority
	const [domainAuthority, setDomainAuthority] = useState(10);

	// Step 3
	const [competitor1, setCompetitor1] = useState('');
	const [competitor2, setCompetitor2] = useState('');
	const [competitor3, setCompetitor3] = useState('');

	// Step 5 result
	const [result, setResult] = useState<{
		topicsFound: number;
		competitorsAnalyzed: number;
		quickWinsAvailable: number;
	} | null>(null);

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

	const handleStep2Continue = () => {
		setError('');
		if (!businessName.trim()) {
			setError('Business name is required');
			return;
		}
		setStep(3);
	};

	const handleStep3Analyze = () => {
		setError('');
		if (!competitor1.trim()) {
			setError('At least one competitor URL is required');
			return;
		}
		setStep(4);
		runOnboarding();
	};

	const runOnboarding = async () => {
		if (!user) return;
		setIsLoading(true);
		setError('');
		try {
			const { data: { session } } = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				throw new Error('Not authenticated');
			}

			const competitorUrls = [competitor1, competitor2, competitor3]
				.map((u) => normalizeUrl(u))
				.filter(Boolean);

			const res = await fetch(buildApiUrl('/api/onboarding/complete'), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					url,
					businessName: businessName.trim(),
					niche: niche.trim(),
					customerDescription: customerDescription.trim(),
					platform,
					competitorUrls,
					domainAuthority
				})
			});

			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data?.error || 'Something went wrong');
			}

			setResult({
				topicsFound: data.topicsFound ?? 0,
				competitorsAnalyzed: data.competitorsAnalyzed ?? 0,
				quickWinsAvailable: data.quickWinsAvailable ?? 0
			});
			await updateUser();
			setStep(5);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Something went wrong analyzing your site. Please try again.';
			setError(msg);
			toast.error(msg);
		} finally {
			setIsLoading(false);
		}
	};

	if (user?.completed_onboarding) {
		return <Navigate to={next} />;
	}

	return (
		<div className="flex w-full flex-1 flex-col">
			<div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 pt-10">
				{/* Step 1: URL */}
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
						<p className="text-center text-sm text-gray-500 dark:text-gray-400">
							Don&apos;t have a website yet? That&apos;s okay — you can still plan your strategy
						</p>
					</div>
				)}

				{/* Step 2: Business Profile */}
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
						<div>
							<Label htmlFor="domainAuthority">
								Domain Authority (DA): <span className="font-bold text-gray-900 dark:text-white">{domainAuthority}</span>
							</Label>
							<input
								id="domainAuthority"
								type="range"
								min={0}
								max={100}
								value={domainAuthority}
								onChange={(e) => setDomainAuthority(Number(e.target.value))}
								className="w-full accent-brand-500"
							/>
							<div className="mt-1 flex justify-between text-[11px] text-gray-400 dark:text-gray-500">
								<span>New site (0)</span>
								<span>Established (100)</span>
							</div>
							<p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
								Find your free DA at{' '}
								<a href="https://moz.com/domain-analysis" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-500">
									moz.com/domain-analysis
								</a>. New sites start around 1–5.
							</p>
						</div>
						<Button variant="primary" fullWidth onClick={handleStep2Continue}>
							Continue
						</Button>
					</div>
				)}

				{/* Step 3: Competitors */}
				{step === 3 && (
					<div className="space-y-6">
						<div className="text-center">
							<h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-900 dark:text-white/90">
								Who are your main competitors?
							</h1>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								We&apos;ll analyze what&apos;s working for them and build your strategy around it.
							</p>
						</div>
						{error && <p className="text-center text-sm text-red-500 dark:text-red-400">{error}</p>}
						<div>
							<Label htmlFor="competitor1">Competitor 1 (required)</Label>
							<Input
								id="competitor1"
								type="url"
								value={competitor1}
								onChange={(e) => setCompetitor1(e.target.value)}
								placeholder="https://competitor1.com"
							/>
						</div>
						<div>
							<Label htmlFor="competitor2">Competitor 2 (optional)</Label>
							<Input
								id="competitor2"
								type="url"
								value={competitor2}
								onChange={(e) => setCompetitor2(e.target.value)}
								placeholder="https://competitor2.com"
							/>
						</div>
						<div>
							<Label htmlFor="competitor3">Competitor 3 (optional)</Label>
							<Input
								id="competitor3"
								type="url"
								value={competitor3}
								onChange={(e) => setCompetitor3(e.target.value)}
								placeholder="https://competitor3.com"
							/>
						</div>
						<Button
							variant="primary"
							fullWidth
							onClick={handleStep3Analyze}
							disabled={isLoading}
						>
							Analyze my competitors
						</Button>
					</div>
				)}

				{/* Step 4: Loading */}
				{step === 4 && (
					<div className="space-y-8 py-8">
						<div className="text-center">
							<h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-900 dark:text-white/90">
								Building your strategy
							</h1>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								This usually takes about 60 seconds
							</p>
						</div>
						<div className="space-y-4">
							{[
								'Scanning your website...',
								'Checking your site health...',
								'Analyzing competitors...',
								'Finding keyword opportunities...',
								'Classifying your opportunities...',
								'Building your strategy...'
							].map((label, i) => (
								<div key={i} className="flex items-center gap-3">
									{isLoading ? (
										<Loader2 className="size-5 animate-spin text-brand-500" />
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
								<Button variant="outline" className="mt-4" onClick={() => setStep(3)}>
									Try again
								</Button>
							</div>
						)}
					</div>
				)}

				{/* Step 5: Summary */}
				{step === 5 && result && (
					<div className="space-y-6">
						<div className="text-center">
							<h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-900 dark:text-white/90">
								Your SEO strategy is ready
							</h1>
						</div>
						<div className="grid grid-cols-3 gap-4">
							<div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-800">
								<div className="text-2xl font-bold text-gray-900 dark:text-white">
									{result.topicsFound}
								</div>
								<div className="text-xs text-gray-500 dark:text-gray-400">Topics Found</div>
							</div>
							<div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-800">
								<div className="text-2xl font-bold text-gray-900 dark:text-white">
									{result.competitorsAnalyzed}
								</div>
								<div className="text-xs text-gray-500 dark:text-gray-400">Competitors Analyzed</div>
							</div>
							<div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-800">
								<div className="text-2xl font-bold text-gray-900 dark:text-white">
									{result.quickWinsAvailable}
								</div>
								<div className="text-xs text-gray-500 dark:text-gray-400">Quick Wins Available</div>
							</div>
						</div>
						<div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
							<p className="text-sm text-gray-700 dark:text-gray-300">
								{result.quickWinsAvailable > 0
									? `You have ${result.quickWinsAvailable} achievable topics ready to start. Focus on these first to build authority, then unlock the rest.`
									: 'Your strategy is ready. Start with the highest-priority topics to build your site strength over time.'}
							</p>
						</div>
						<div className="space-y-3">
							<Button
								variant="primary"
								fullWidth
								className="bg-brand-500 hover:bg-brand-600"
								onClick={() => navigate('/strategy')}
							>
								View my strategy
							</Button>
							<Button
								variant="outline"
								fullWidth
								onClick={() => navigate('/dashboard')}
							>
								Go to dashboard
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

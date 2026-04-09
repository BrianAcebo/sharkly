import React, { useState, useRef } from 'react';
import {
	Upload,
	X,
	Plus,
	Trash2,
	Film,
	Palette,
	Building2,
	FileText,
	Plug,
	Info
} from 'lucide-react';
import { isYMYLNiche } from '../../lib/ymyl';
import Label from '../form/Label';
import Input from '../form/input/InputField';
import TextArea from '../form/input/TextArea';
import { Button } from '../ui/button';
import { Tooltip } from '../ui/tooltip';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '../ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { validateUrl } from '../../utils/validation';
import { GSCConnectionManager } from '../gsc/GSCConnectionManager';
import { ShopifyConnectionStatus } from '../shopify/ShopifyConnectionStatus';
import { CartesiaVideoVoicePanel } from './CartesiaVideoVoicePanel';
import type { Site } from '../../types/site';
import { FEATURE_VIDEOS_UI } from '../../config/featureFlags';

const MAX_LOGO_SIZE_MB = 5;
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const PLATFORM_OPTIONS = [
	{ value: 'shopify', label: 'Shopify' },
	{ value: 'woocommerce', label: 'WooCommerce' },
	{ value: 'wordpress', label: 'WordPress' },
	{ value: 'wix', label: 'Wix' },
	{ value: 'squarespace', label: 'Squarespace' },
	{ value: 'webflow', label: 'Webflow' },
	{ value: 'custom', label: 'Custom' }
];

const TONE_OPTIONS = [
	{ value: 'professional', label: 'Professional' },
	{ value: 'conversational', label: 'Conversational' },
	{ value: 'authoritative', label: 'Authoritative' },
	{ value: 'friendly', label: 'Friendly' },
	{ value: 'technical', label: 'Technical' },
	{ value: 'casual', label: 'Casual' }
];

const LANGUAGE_OPTIONS = [
	{ value: 'English', label: 'English' },
	{ value: 'Spanish', label: 'Spanish' },
	{ value: 'French', label: 'French' },
	{ value: 'German', label: 'German' },
	{ value: 'Italian', label: 'Italian' },
	{ value: 'Portuguese', label: 'Portuguese' },
	{ value: 'Dutch', label: 'Dutch' },
	{ value: 'Polish', label: 'Polish' },
	{ value: 'Japanese', label: 'Japanese' },
	{ value: 'Korean', label: 'Korean' },
	{ value: 'Chinese (Simplified)', label: 'Chinese (Simplified)' },
	{ value: 'Chinese (Traditional)', label: 'Chinese (Traditional)' },
	{ value: 'Arabic', label: 'Arabic' },
	{ value: 'Hindi', label: 'Hindi' },
	{ value: 'Russian', label: 'Russian' },
	{ value: 'Swedish', label: 'Swedish' },
	{ value: 'Norwegian', label: 'Norwegian' },
	{ value: 'Danish', label: 'Danish' }
];

const REGION_OPTIONS = [
	{ value: 'United States', label: '🇺🇸 United States' },
	{ value: 'United Kingdom', label: '🇬🇧 United Kingdom' },
	{ value: 'Canada', label: '🇨🇦 Canada' },
	{ value: 'Australia', label: '🇦🇺 Australia' },
	{ value: 'Ireland', label: '🇮🇪 Ireland' },
	{ value: 'New Zealand', label: '🇳🇿 New Zealand' },
	{ value: 'South Africa', label: '🇿🇦 South Africa' },
	{ value: 'Germany', label: '🇩🇪 Germany' },
	{ value: 'France', label: '🇫🇷 France' },
	{ value: 'Spain', label: '🇪🇸 Spain' },
	{ value: 'Italy', label: '🇮🇹 Italy' },
	{ value: 'Netherlands', label: '🇳🇱 Netherlands' },
	{ value: 'Brazil', label: '🇧🇷 Brazil' },
	{ value: 'Mexico', label: '🇲🇽 Mexico' },
	{ value: 'India', label: '🇮🇳 India' },
	{ value: 'Japan', label: '🇯🇵 Japan' },
	{ value: 'South Korea', label: '🇰🇷 South Korea' },
	{ value: 'Singapore', label: '🇸🇬 Singapore' }
];

export interface SiteFormData {
	name: string;
	description: string;
	url: string;
	platform: string;
	niche: string;
	customerDescription: string;
	competitorUrls: string[];
	domainAuthority: number;
	tone: string;
	includeTerms: string;
	avoidTerms: string;
	targetLanguage: string;
	targetRegion: string;
	authorBio?: string | null;
	// S1-5: AggregateRating + sameAs
	googleReviewCount?: number | null;
	googleAverageRating?: number | null;
	gbpUrl?: string | null;
	facebookUrl?: string | null;
	linkedinUrl?: string | null;
	twitterUrl?: string | null;
	yelpUrl?: string | null;
	wikidataUrl?: string | null;
	/** Site-wide original insight for article generation (information gain) */
	originalInsight?: string | null;
	logoFile?: File | null;
	removeLogo?: boolean;
	/** Narration voice UUID for videos for this site */
	cartesiaVoiceId?: string | null;
}

interface SiteDetailFormProps {
	initial?: Site;
	onSubmit: (data: SiteFormData) => void;
	onCancel: () => void;
	disabled?: boolean;
	onDelete: () => void;
	variant?: 'sheet' | 'page';
	/** While true, Delete is disabled (usage counts loading). */
	deleteCheckLoading?: boolean;
	/** When true, Delete is disabled — use with deleteBlockedMessage. */
	deleteBlocked?: boolean;
	deleteBlockedMessage?: string;
}

function TabHeading({ title, description }: { title: string; description: string }) {
	return (
		<div className="mb-6 border-b border-gray-100 pb-5 dark:border-gray-800">
			<h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
			<p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
		</div>
	);
}

export default function SiteDetailForm({
	initial,
	onSubmit,
	onCancel,
	disabled = false,
	onDelete,
	variant = 'sheet',
	deleteCheckLoading = false,
	deleteBlocked = false,
	deleteBlockedMessage = ''
}: SiteDetailFormProps) {
	const [deleteBlockedDialogOpen, setDeleteBlockedDialogOpen] = useState(false);
	const [name, setName] = useState(initial?.name ?? '');
	const [description, setDescription] = useState(initial?.description ?? '');
	const [url, setUrl] = useState(initial?.url ?? '');
	const [platform, setPlatform] = useState(initial?.platform ?? '');
	const [niche, setNiche] = useState(initial?.niche ?? '');
	const [customerDescription, setCustomerDescription] = useState(
		typeof initial?.customerDescription === 'string' ? initial.customerDescription : ''
	);
	const [competitorUrls, setCompetitorUrls] = useState<string[]>(initial?.competitorUrls ?? []);
	const [competitorInput, setCompetitorInput] = useState('');
	const [competitorError, setCompetitorError] = useState('');
	const [domainAuthority] = useState(initial?.domainAuthority ?? 0);
	const [tone, setTone] = useState(initial?.tone ?? 'professional');
	const [includeTerms, setIncludeTerms] = useState(initial?.includeTerms ?? '');
	const [avoidTerms, setAvoidTerms] = useState(initial?.avoidTerms ?? '');
	const [targetLanguage, setTargetLanguage] = useState(initial?.targetLanguage ?? 'English');
	const [targetRegion, setTargetRegion] = useState(initial?.targetRegion ?? 'United States');
	const [authorBio, setAuthorBio] = useState(initial?.authorBio ?? '');
	const [googleReviewCount, setGoogleReviewCount] = useState(
		initial?.googleReviewCount != null ? String(initial.googleReviewCount) : ''
	);
	const [googleAverageRating, setGoogleAverageRating] = useState(
		initial?.googleAverageRating != null ? String(initial.googleAverageRating) : ''
	);
	const [gbpUrl, setGbpUrl] = useState(initial?.gbpUrl ?? '');
	const [facebookUrl, setFacebookUrl] = useState(initial?.facebookUrl ?? '');
	const [linkedinUrl, setLinkedinUrl] = useState(initial?.linkedinUrl ?? '');
	const [twitterUrl, setTwitterUrl] = useState(initial?.twitterUrl ?? '');
	const [yelpUrl, setYelpUrl] = useState(initial?.yelpUrl ?? '');
	const [wikidataUrl, setWikidataUrl] = useState(initial?.wikidataUrl ?? '');
	const [originalInsight, setOriginalInsight] = useState(initial?.originalInsight ?? '');
	const [cartesiaVoiceId, setCartesiaVoiceId] = useState(initial?.cartesiaVoiceId ?? '');
	const [logo, setLogo] = useState<File | null>(null);
	const [logoPreview, setLogoPreview] = useState<string | null>(initial?.logo ?? null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [errors, setErrors] = useState<{ name: string; url: string; logo: string }>({
		name: '',
		url: '',
		logo: ''
	});

	const clearError = (field: keyof typeof errors) => {
		setErrors((prev) => ({ ...prev, [field]: '' }));
	};

	const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		clearError('logo');
		const file = e.target.files?.[0];
		if (file) {
			if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
				setErrors((prev) => ({
					...prev,
					logo: 'Please upload a valid image (JPEG, PNG, GIF, or WebP)'
				}));
				return;
			}
			if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
				setErrors((prev) => ({ ...prev, logo: `Logo must be under ${MAX_LOGO_SIZE_MB}MB` }));
				return;
			}
			setLogo(file);
			const reader = new FileReader();
			reader.onloadend = () => setLogoPreview(reader.result as string);
			reader.readAsDataURL(file);
		}
	};

	const handleRemoveLogo = () => {
		clearError('logo');
		setLogo(null);
		setLogoPreview(null);
		if (fileInputRef.current) fileInputRef.current.value = '';
	};

	const handleAddCompetitor = () => {
		const trimmed = competitorInput.trim();
		if (!trimmed) return;
		if (!validateUrl(trimmed)) {
			setCompetitorError('Please enter a valid URL');
			return;
		}
		if (competitorUrls.includes(trimmed)) {
			setCompetitorError('URL already added');
			return;
		}
		setCompetitorError('');
		setCompetitorUrls((prev) => [...prev, trimmed]);
		setCompetitorInput('');
	};

	const handleRemoveCompetitor = (u: string) => {
		setCompetitorUrls((prev) => prev.filter((c) => c !== u));
	};

	const validateForm = (): boolean => {
		const newErrors = { name: '', url: '', logo: '' };
		if (!name.trim()) newErrors.name = 'Name is required';
		if (url.trim() && !validateUrl(url))
			newErrors.url = 'Please enter a valid URL (e.g. https://example.com)';
		if (logo && !ALLOWED_LOGO_TYPES.includes(logo.type))
			newErrors.logo = 'Please upload a valid image (JPEG, PNG, GIF, or WebP)';
		else if (logo && logo.size > MAX_LOGO_SIZE_MB * 1024 * 1024)
			newErrors.logo = `Logo must be under ${MAX_LOGO_SIZE_MB}MB`;
		setErrors(newErrors);
		return !newErrors.name && !newErrors.url && !newErrors.logo;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateForm()) return;
		onSubmit({
			name: name.trim(),
			description: description.trim(),
			url: url.trim(),
			platform: platform.trim(),
			niche: niche.trim(),
			customerDescription: customerDescription.trim(),
			competitorUrls,
			domainAuthority,
			tone: tone || 'professional',
			includeTerms: includeTerms.trim(),
			avoidTerms: avoidTerms.trim(),
			targetLanguage: targetLanguage || 'English',
			targetRegion: targetRegion || 'United States',
			authorBio: authorBio.trim() || null,
			googleReviewCount: googleReviewCount.trim() ? parseInt(googleReviewCount, 10) || null : null,
			googleAverageRating: googleAverageRating.trim()
				? parseFloat(googleAverageRating) || null
				: null,
			gbpUrl: gbpUrl.trim() || null,
			facebookUrl: facebookUrl.trim() || null,
			linkedinUrl: linkedinUrl.trim() || null,
			twitterUrl: twitterUrl.trim() || null,
			yelpUrl: yelpUrl.trim() || null,
			wikidataUrl: wikidataUrl.trim() || null,
			originalInsight: originalInsight.trim() || null,
			cartesiaVoiceId: cartesiaVoiceId.trim() || null,
			logoFile: logo ?? undefined,
			removeLogo: Boolean(initial?.logo && !logoPreview && !logo)
		});
	};

	const TAB_CLASS =
		'data-[state=active]:border-brand-500 data-[state=active]:text-brand-600 dark:data-[state=active]:text-brand-400 -mb-px inline-flex items-center gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium whitespace-nowrap text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 data-[state=active]:font-semibold';

	const generalFields = (
		<>
			<div>
				<Label htmlFor="site-name">
					Name <span className="text-error-500">*</span>
				</Label>
				<Input
					id="site-name"
					type="text"
					value={name}
					onChange={(e) => {
						setName(e.target.value);
						clearError('name');
					}}
					placeholder="My Website"
					required
					error={!!errors.name}
					hint={errors.name}
				/>
			</div>
			<div>
				<Label htmlFor="site-url">URL</Label>
				<Input
					id="site-url"
					type="url"
					value={url}
					onChange={(e) => {
						setUrl(e.target.value);
						clearError('url');
					}}
					placeholder="https://example.com"
					error={!!errors.url}
					hint={errors.url}
				/>
			</div>
			<div>
				<Label htmlFor="site-description">Description</Label>
				<TextArea
					placeholder="Brief description of this website..."
					rows={3}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>
			</div>
			<div>
				<Label>Platform</Label>
				<Select
					value={platform || '__empty__'}
					onValueChange={(v) => setPlatform(v === '__empty__' ? '' : v)}
				>
					<SelectTrigger className="h-11 border-gray-300 dark:border-gray-700">
						<SelectValue placeholder="Select platform" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__empty__">Select platform</SelectItem>
						{PLATFORM_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div>
				<Label htmlFor="site-niche">Niche</Label>
				<Input
					id="site-niche"
					type="text"
					value={niche}
					onChange={(e) => setNiche(e.target.value)}
					placeholder="e.g. Fashion, Tech, Health"
				/>
				{isYMYLNiche(niche, name, description) && (
					<div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
						<p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
							YMYL niche detected
						</p>
						<p className="mt-0.5 text-[11px] text-amber-700/90 dark:text-amber-400/90">
							Google applies stricter EEAT to health, legal, and financial content. Article
							generation will include citation, credential, and disclaimer requirements.
						</p>
					</div>
				)}
			</div>
		</>
	);

	const brandingFields = (
		<>
			{/* Logo */}
			<div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
				<h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">Site Logo</h3>
				<p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
					Used in video end cards and reports. JPEG, PNG, GIF, or WebP up to 5 MB.
				</p>
				<div className="flex items-center gap-5">
					<div className="relative">
						{logoPreview ? (
							<div className="relative">
								<img
									src={logoPreview}
									alt="Logo preview"
									className="size-20 rounded-xl border border-gray-200 object-cover dark:border-gray-600"
								/>
								<Button
									type="button"
									variant="icon"
									size="sm"
									onClick={handleRemoveLogo}
									className="absolute -top-2 -right-2 h-fit rounded-full bg-gray-900 p-1 text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
								>
									<X className="size-3" />
								</Button>
							</div>
						) : (
							<div
								className={`flex size-20 items-center justify-center rounded-xl border-2 border-dashed ${
									errors.logo ? 'border-error-500' : 'border-gray-300 dark:border-gray-600'
								}`}
							>
								<Upload className="size-8 text-gray-400" />
							</div>
						)}
					</div>
					<input
						type="file"
						accept="image/jpeg,image/png,image/gif,image/webp"
						onChange={handleLogoChange}
						ref={fileInputRef}
						className="hidden"
						id="site-logo-upload"
					/>
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="site-logo-upload"
							className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
						>
							{logoPreview ? 'Change Logo' : 'Upload Logo'}
						</label>
						{errors.logo && <p className="text-error-500 text-sm">{errors.logo}</p>}
					</div>
				</div>
			</div>

			{/* Brand voice */}
			<div className="space-y-5 rounded-xl border border-gray-200 p-5 dark:border-gray-700">
				<div>
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
						Brand Voice &amp; Content Settings
					</h3>
					<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
						Injected into every brief and article prompt so AI-generated content matches your style.
					</p>
				</div>

				<div>
					<Label>Writing tone</Label>
					<Select value={tone || 'professional'} onValueChange={setTone}>
						<SelectTrigger className="h-11 border-gray-300 dark:border-gray-700">
							<SelectValue placeholder="Select tone" />
						</SelectTrigger>
						<SelectContent>
							{TONE_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div>
					<Label htmlFor="include-terms">Always include these terms</Label>
					<TextArea
						placeholder="Comma-separated keywords or phrases to always weave in, e.g. free consultation, same-day service"
						rows={2}
						value={typeof includeTerms === 'string' ? includeTerms : ''}
						onChange={(e) => setIncludeTerms(e.target.value)}
					/>
					<p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
						These will appear in every brief and article prompt.
					</p>
				</div>

				<div>
					<Label htmlFor="avoid-terms">Never use these terms</Label>
					<TextArea
						placeholder="Comma-separated words or phrases to avoid, e.g. cheap, low-quality, competitor names"
						rows={2}
						value={typeof avoidTerms === 'string' ? avoidTerms : ''}
						onChange={(e) => setAvoidTerms(e.target.value)}
					/>
					<p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
						AI will be instructed to avoid these in all generated content.
					</p>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label>Content language</Label>
						<Select value={targetLanguage} onValueChange={setTargetLanguage}>
							<SelectTrigger className="h-11 border-gray-300 dark:border-gray-700">
								<SelectValue placeholder="Select language" />
							</SelectTrigger>
							<SelectContent>
								{LANGUAGE_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Target region / dialect</Label>
						<Select value={targetRegion} onValueChange={setTargetRegion}>
							<SelectTrigger className="h-11 border-gray-300 dark:border-gray-700">
								<SelectValue placeholder="Select region" />
							</SelectTrigger>
							<SelectContent>
								{REGION_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<p className="text-[11px] text-gray-500 dark:text-gray-400">
					All AI-generated articles and briefs will be written in this language for this
					region&apos;s spelling and conventions.
				</p>
			</div>
		</>
	);

	const businessFields = (
		<>
			<div>
				<Label htmlFor="author-bio">Default author bio (EEAT)</Label>
				<TextArea
					id="author-bio"
					placeholder="e.g. Sarah Chen, 10+ years in digital marketing. Former Head of Content at Acme Corp."
					rows={2}
					value={typeof authorBio === 'string' ? authorBio : ''}
					onChange={(e) => setAuthorBio(e.target.value)}
				/>
				<p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
					Injected into briefs and articles for EEAT. Can be overridden per page in the Workspace.
				</p>
			</div>

			<div className="space-y-5 rounded-xl border border-gray-200 p-5 dark:border-gray-700">
				<div>
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">Business profiles</h3>
					<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
						Help Google confirm your business is real and connect your online presence. Used in
						LocalBusiness schema (sameAs) and AggregateRating.
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<div>
						<Label htmlFor="gbp-url">Google Business Profile URL</Label>
						<Input
							id="gbp-url"
							type="url"
							value={gbpUrl}
							onChange={(e) => setGbpUrl(e.target.value)}
							placeholder="https://www.google.com/maps/place/..."
						/>
					</div>
					<div>
						<Label htmlFor="facebook-url">Facebook</Label>
						<Input
							id="facebook-url"
							type="url"
							value={facebookUrl}
							onChange={(e) => setFacebookUrl(e.target.value)}
							placeholder="https://facebook.com/yourbusiness"
						/>
					</div>
					<div>
						<Label htmlFor="linkedin-url">LinkedIn</Label>
						<Input
							id="linkedin-url"
							type="url"
							value={linkedinUrl}
							onChange={(e) => setLinkedinUrl(e.target.value)}
							placeholder="https://linkedin.com/company/yourbusiness"
						/>
					</div>
					<div>
						<Label htmlFor="twitter-url">Twitter / X</Label>
						<Input
							id="twitter-url"
							type="url"
							value={twitterUrl}
							onChange={(e) => setTwitterUrl(e.target.value)}
							placeholder="https://twitter.com/yourbusiness"
						/>
					</div>
					<div>
						<Label htmlFor="yelp-url">Yelp</Label>
						<Input
							id="yelp-url"
							type="url"
							value={yelpUrl}
							onChange={(e) => setYelpUrl(e.target.value)}
							placeholder="https://yelp.com/biz/yourbusiness"
						/>
					</div>
					<div>
						<Label htmlFor="wikidata-url">Wikidata (optional)</Label>
						<Input
							id="wikidata-url"
							type="url"
							value={wikidataUrl}
							onChange={(e) => setWikidataUrl(e.target.value)}
							placeholder="https://www.wikidata.org/wiki/..."
						/>
					</div>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<div>
						<Label htmlFor="google-review-count">Google review count</Label>
						<Input
							id="google-review-count"
							type="number"
							min={0}
							value={googleReviewCount}
							onChange={(e) => setGoogleReviewCount(e.target.value)}
							placeholder="127"
						/>
						<p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
							For AggregateRating schema (stars in search)
						</p>
					</div>
					<div>
						<Label htmlFor="google-average-rating">Google average rating</Label>
						<Input
							id="google-average-rating"
							type="number"
							min={0}
							max={5}
							step={0.1}
							value={googleAverageRating}
							onChange={(e) => setGoogleAverageRating(e.target.value)}
							placeholder="4.8"
						/>
						<p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">1–5 scale</p>
					</div>
				</div>
			</div>
		</>
	);

	const contentFields = (
		<>
			<div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
				<Label htmlFor="site-original-insight">Original insight (information gain)</Label>
				<TextArea
					id="site-original-insight"
					placeholder="What unique data, experience, or perspective can your articles offer that competitors typically don't? Used when generating articles for this site."
					rows={4}
					value={typeof originalInsight === 'string' ? originalInsight : ''}
					onChange={(e) => setOriginalInsight(e.target.value)}
					className="mt-1"
				/>
				<p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
					Saved per site. Article generation uses this when a page doesn&apos;t have its own
					brief-level insight. You can also set this from the workspace when you first generate.
				</p>
			</div>
			<div>
				<Label htmlFor="site-customer-description">Customer description</Label>
				<TextArea
					placeholder="Describe your target customer for content generation..."
					rows={3}
					value={typeof customerDescription === 'string' ? customerDescription : ''}
					onChange={(e) => setCustomerDescription(e.target.value)}
				/>
			</div>
			<div>
				<Label>Competitor URLs</Label>
				<div className="space-y-2">
					<div className="flex gap-2">
						<Input
							type="url"
							value={competitorInput}
							onChange={(e) => {
								setCompetitorInput(e.target.value);
								setCompetitorError('');
							}}
							onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
								e.key === 'Enter' && (e.preventDefault(), handleAddCompetitor())
							}
							placeholder="https://competitor.com"
							error={!!competitorError}
							hint={competitorError}
							className="flex-1"
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleAddCompetitor}
							startIcon={<Plus className="size-4" />}
						>
							Add
						</Button>
					</div>
					{competitorUrls.length > 0 && (
						<ul className="flex flex-wrap gap-2">
							{competitorUrls.map((u) => (
								<li
									key={u}
									className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
								>
									<span className="max-w-[200px] truncate">{u}</span>
									<button
										type="button"
										onClick={() => handleRemoveCompetitor(u)}
										className="hover:text-error-500 dark:hover:text-error-400 text-gray-500 dark:text-gray-400"
									>
										<X className="size-3.5" />
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</>
	);

	const videoFields = FEATURE_VIDEOS_UI ? (
		<div className="space-y-5">
			{/* Feature intro */}
			<div className="flex gap-4 rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800/40 dark:bg-blue-900/20">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50">
					<Film className="size-5 text-blue-600 dark:text-blue-400" />
				</div>
				<div>
					<h3 className="font-semibold text-blue-900 dark:text-blue-100">Blog to Video</h3>
					<p className="mt-1 text-sm leading-relaxed text-blue-700 dark:text-blue-300">
						Turn any article you publish into a narrated MP4 video — ready to post on YouTube,
						LinkedIn, or embed on your site.
					</p>
				</div>
			</div>

			<CartesiaVideoVoicePanel
				selectedVoiceId={cartesiaVoiceId}
				onSelectedVoiceIdChange={setCartesiaVoiceId}
			/>

			{/* How to use */}
			<div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/40">
				<h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
					How to generate a video
				</h3>
				<ol className="space-y-3">
					{[
						'Finish writing and scoring your article in the Workspace',
						'Click Generate Video in the article toolbar',
						'Choose duration, quality, and caption settings — then download your MP4'
					].map((step, i) => (
						<li key={i} className="flex items-start gap-3">
							<span className="bg-brand-500 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white">
								{i + 1}
							</span>
							<span className="text-sm text-gray-600 dark:text-gray-400">{step}</span>
						</li>
					))}
				</ol>
			</div>

			<p className="text-xs text-gray-400 dark:text-gray-500">
				Video generation is available on Builder tier and above. Videos are stored in your Sharkly
				account for 7 days.
			</p>
		</div>
	) : null;

	const integrationsFields = initial ? (
		<div className="space-y-8">
			<div>
				<h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
					Google Search Console
				</h3>
				<p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
					Connect to pull live rankings, impressions, and CTR data for this site.
				</p>
				<GSCConnectionManager siteId={initial.id} siteName={initial.name} />
			</div>
			<div className="border-t border-gray-100 pt-6 dark:border-gray-800">
				<h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
					Shopify
					<Tooltip
						content="If you uninstalled the Sharkly app from your Shopify store, it will take 48 hours for Shopify to trigger the removal of your store from Sharkly."
						tooltipPosition="top"
						usePortal
					>
						<span className="text-gray-400 dark:text-gray-500">
							<Info className="size-4" />
						</span>
					</Tooltip>
				</h3>
				<p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
					Link your Shopify store to enable ecommerce SEO features and product page optimization.
				</p>
				<ShopifyConnectionStatus siteId={initial.id} siteName={initial.name} />
			</div>
		</div>
	) : null;

	const formContent =
		variant === 'page' ? (
			<Tabs defaultValue="general" className="w-full">
				<TabsList className="mb-8 flex h-auto gap-0 overflow-x-auto rounded-none border-b border-gray-200 bg-transparent p-0 dark:border-gray-700">
					<TabsTrigger value="general" className={TAB_CLASS}>
						General
					</TabsTrigger>
					<TabsTrigger value="branding" className={TAB_CLASS}>
						<Palette className="size-3.5" />
						Branding
					</TabsTrigger>
					<TabsTrigger value="business" className={TAB_CLASS}>
						<Building2 className="size-3.5" />
						Business / E-E-A-T
					</TabsTrigger>
					<TabsTrigger value="content" className={TAB_CLASS}>
						<FileText className="size-3.5" />
						Content
					</TabsTrigger>
					{initial && FEATURE_VIDEOS_UI && (
						<TabsTrigger value="video" className={TAB_CLASS}>
							<Film className="size-3.5" />
							Video
						</TabsTrigger>
					)}
					{initial && (
						<TabsTrigger value="integrations" className={TAB_CLASS}>
							<Plug className="size-3.5" />
							Integrations
						</TabsTrigger>
					)}
				</TabsList>

				<TabsContent value="general" className="mt-0 space-y-6">
					<TabHeading
						title="General settings"
						description="Basic site identity, URL, platform, and niche. Used across strategy and content generation."
					/>
					{generalFields}
				</TabsContent>

				<TabsContent value="branding" className="mt-0 space-y-6">
					<TabHeading
						title="Branding"
						description="Logo, writing tone, terms to use or avoid, and target language. Applied to all AI-generated content."
					/>
					{brandingFields}
				</TabsContent>

				<TabsContent value="business" className="mt-0 space-y-6">
					<TabHeading
						title="Business & E-E-A-T"
						description="Author bio, business profiles, and review data. Signals expertise and trust to Google."
					/>
					{businessFields}
				</TabsContent>

				<TabsContent value="content" className="mt-0 space-y-6">
					<TabHeading
						title="Content strategy"
						description="Original insight, target customer, and competitor sites that inform content generation."
					/>
					{contentFields}
				</TabsContent>

				{initial && FEATURE_VIDEOS_UI && (
					<TabsContent value="video" className="mt-0 space-y-6">
						<TabHeading
							title="Blog to Video"
							description="Turn published articles into narrated videos for YouTube, social, or your website."
						/>
						{videoFields}
					</TabsContent>
				)}

				{initial && (
					<TabsContent value="integrations" className="mt-0">
						<TabHeading
							title="Integrations"
							description="Connect external services to pull live data into Sharkly."
						/>
						{integrationsFields}
					</TabsContent>
				)}
			</Tabs>
		) : (
			<div className="space-y-6">
				{generalFields}
				{brandingFields}
				{businessFields}
				{contentFields}
				{integrationsFields}
			</div>
		);

	return (
		<form
			onSubmit={handleSubmit}
			className={
				variant === 'page'
					? 'space-y-0'
					: 'space-y-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900'
			}
		>
			{formContent}

			{/* Submit / Delete */}
			<div
				className={`flex items-center gap-3 pt-6 ${
					variant === 'page' ? 'border-t border-gray-100 dark:border-gray-800' : ''
				}`}
			>
				<Button
					type="submit"
					className="bg-brand-500 hover:bg-brand-600 text-white"
					disabled={!name.trim() || disabled}
				>
					{initial ? 'Save Changes' : 'Add Site'}
				</Button>

				{!initial && variant === 'sheet' && (
					<Button type="button" variant="outline" onClick={onCancel} disabled={disabled}>
						Cancel
					</Button>
				)}

				{initial &&
					(deleteCheckLoading ? (
						<Tooltip
							content="Checking whether this site can be removed…"
							tooltipPosition="bottom"
							usePortal
						>
							<span className="inline-flex">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="border-error-200 text-error-600 dark:border-error-900 dark:text-error-400 opacity-60"
									disabled
									startIcon={<Trash2 className="size-4" />}
								>
									Delete site
								</Button>
							</span>
						</Tooltip>
					) : deleteBlocked ? (
						<Tooltip
							content="Still has linked content — click for details"
							tooltipPosition="top"
							usePortal
						>
							<span className="inline-flex">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="border-error-200 text-error-600 hover:bg-error-50 dark:border-error-900 dark:text-error-400 dark:hover:bg-error-900/20"
									disabled={disabled}
									onClick={() => setDeleteBlockedDialogOpen(true)}
									startIcon={<Trash2 className="size-4" />}
								>
									Delete site
								</Button>
							</span>
						</Tooltip>
					) : (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="border-error-200 text-error-600 hover:bg-error-50 dark:border-error-900 dark:text-error-400 dark:hover:bg-error-900/20"
							onClick={onDelete}
							disabled={disabled}
							startIcon={<Trash2 className="size-4" />}
						>
							Delete site
						</Button>
					))}
			</div>

			<AlertDialog open={deleteBlockedDialogOpen} onOpenChange={setDeleteBlockedDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Can&apos;t delete this site yet</AlertDialogTitle>
						<AlertDialogDescription className="text-left">
							{deleteBlockedMessage ||
								'This site still has linked content. Remove it before deleting the site.'}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction
							type="button"
							variant="default"
							className="bg-brand-500 hover:bg-brand-600"
						>
							Got it
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</form>
	);
}

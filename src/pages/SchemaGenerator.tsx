/**
 * Schema Generator — Standalone tool for generating JSON-LD schema markup.
 * Users can choose schema type, enter details, and get copy-paste ready output
 * in Standard (HTML script) or Shopify Liquid format.
 */

import { useState, useMemo } from 'react';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import {
	generateArticleSchema,
	generateFAQSchema,
	generateProductSchema,
	generateLocalBusinessSchema,
	generateBreadcrumbSchema,
	generateHowToSchema,
	generateOrganizationSchema,
	formatSchemaForPlatform,
	getShopifyProductLiquidSnippet,
	getShopifyArticleLiquidSnippet,
	getShopifyLocalBusinessLiquidSnippet,
	getBigCommerceProductSnippet,
	getBigCommerceArticleSnippet,
	getWordPressArticlePhpSnippet,
	getWordPressProductPhpSnippet,
	type SchemaType,
	type OutputFormat,
	type BreadcrumbItem,
	type SchemaContext
} from '../lib/schemaMarkup';
import { Code2, Copy, Check, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const PLATFORMS: { value: OutputFormat; label: string }[] = [
	{ value: 'standard', label: 'Standard (HTML)' },
	{ value: 'shopify_liquid', label: 'Shopify (Liquid)' },
	{ value: 'wordpress_php', label: 'WordPress / WooCommerce (PHP)' },
	{ value: 'bigcommerce', label: 'BigCommerce (Handlebars)' },
	{ value: 'webflow', label: 'Webflow' },
	{ value: 'wix', label: 'Wix (Velo)' }
];

const SCHEMA_TYPES: { value: SchemaType; label: string }[] = [
	{ value: 'Article', label: 'Article (Blog, News)' },
	{ value: 'FAQPage', label: 'FAQ Page' },
	{ value: 'Product', label: 'Product (Ecommerce)' },
	{ value: 'LocalBusiness', label: 'Local Business' },
	{ value: 'BreadcrumbList', label: 'Breadcrumb List' },
	{ value: 'HowTo', label: 'How-To Guide' },
	{ value: 'Organization', label: 'Organization' }
];

export default function SchemaGenerator() {
	const [schemaType, setSchemaType] = useState<SchemaType>('Article');
	const [outputFormat, setOutputFormat] = useState<OutputFormat>('standard');
	const [copied, setCopied] = useState(false);

	// Form state — shared fields
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [url, setUrl] = useState('');
	const [siteName, setSiteName] = useState('');
	const [siteUrl, setSiteUrl] = useState('');
	const [authorName, setAuthorName] = useState('');
	const [authorBio, setAuthorBio] = useState('');
	const [imageUrl, setImageUrl] = useState('');
	const [datePublished, setDatePublished] = useState('');
	const [dateModified, setDateModified] = useState('');

	// Product
	const [price, setPrice] = useState('');
	const [currency, setCurrency] = useState('USD');

	// LocalBusiness / Organization
	const [address, setAddress] = useState('');
	const [phone, setPhone] = useState('');
	const [legalName, setLegalName] = useState('');
	const [logoUrl, setLogoUrl] = useState('');
	// S1-5: AggregateRating + sameAs for LocalBusiness
	const [reviewCount, setReviewCount] = useState('');
	const [averageRating, setAverageRating] = useState('');
	const [sameAsUrls, setSameAsUrls] = useState('');

	// FAQ
	const [faqItems, setFaqItems] = useState<Array<{ question: string; answer: string }>>([
		{ question: '', answer: '' }
	]);

	// Breadcrumb
	const [breadcrumbItems, setBreadcrumbItems] = useState<BreadcrumbItem[]>([
		{ name: 'Home', url: '' },
		{ name: '', url: '' }
	]);

	// HowTo
	const [howToSteps, setHowToSteps] = useState<Array<{ name: string; text?: string }>>([
		{ name: '', text: '' }
	]);

	const buildContext = (): SchemaContext => ({
		title: title || 'Page Title',
		description: description || undefined,
		url: url || undefined,
		siteName: siteName || 'My Site',
		siteUrl: siteUrl || 'https://example.com',
		authorName: authorName || undefined,
		authorBio: authorBio || undefined,
		imageUrl: imageUrl || undefined,
		datePublished: datePublished || undefined,
		dateModified: dateModified || undefined,
		price: price || undefined,
		currency: currency || undefined,
		address: address || undefined,
		phone: phone || undefined,
		legalName: legalName || undefined,
		logoUrl: logoUrl || undefined,
		aggregateRating:
			schemaType === 'LocalBusiness' &&
			reviewCount.trim() &&
			averageRating.trim() &&
			Number(reviewCount) > 0 &&
			!Number.isNaN(parseFloat(averageRating))
				? {
						ratingValue: parseFloat(averageRating),
						reviewCount: parseInt(reviewCount, 10),
						bestRating: 5
					}
				: undefined,
		sameAs:
			schemaType === 'LocalBusiness' && sameAsUrls.trim()
				? sameAsUrls
						.split(/[\n,]/)
						.map((u) => u.trim())
						.filter(Boolean)
				: undefined,
		faqItems: schemaType === 'FAQPage' ? faqItems.filter((f) => f.question.trim()) : undefined,
		breadcrumbs:
			schemaType === 'BreadcrumbList'
				? breadcrumbItems.filter((b) => b.name.trim())
				: undefined,
		howToSteps:
			schemaType === 'HowTo'
				? howToSteps.filter((s) => s.name.trim()).map((s) => ({ name: s.name, text: s.text || undefined }))
				: undefined
	});

	const output = useMemo(() => {
		const ctx = buildContext();
		let schema: object;

		switch (schemaType) {
			case 'Article':
				schema = generateArticleSchema(ctx);
				break;
			case 'FAQPage':
				schema = generateFAQSchema(ctx);
				break;
			case 'Product':
				schema = generateProductSchema(ctx);
				break;
			case 'LocalBusiness':
				schema = generateLocalBusinessSchema(ctx);
				break;
			case 'BreadcrumbList':
				schema = generateBreadcrumbSchema(ctx);
				break;
			case 'HowTo':
				schema = generateHowToSchema(ctx);
				break;
			case 'Organization':
				schema = generateOrganizationSchema(ctx);
				break;
			default:
				schema = generateArticleSchema(ctx);
		}

		// Platform-specific dynamic snippets (use platform's native objects)
		if (outputFormat === 'shopify_liquid') {
			if (schemaType === 'Product') return getShopifyProductLiquidSnippet();
			if (schemaType === 'Article') return getShopifyArticleLiquidSnippet();
			if (schemaType === 'LocalBusiness') return getShopifyLocalBusinessLiquidSnippet();
			// FAQ and Breadcrumb: use user's form data (formatSchemaForPlatform below)
		}
		if (outputFormat === 'wordpress_php') {
			if (schemaType === 'Article') return getWordPressArticlePhpSnippet();
			if (schemaType === 'Product') return getWordPressProductPhpSnippet();
		}
		if (outputFormat === 'bigcommerce') {
			if (schemaType === 'Product') return getBigCommerceProductSnippet();
			if (schemaType === 'Article') return getBigCommerceArticleSnippet();
		}

		// Static schema: user's form data, formatted for selected platform
		return formatSchemaForPlatform(schema, outputFormat, schemaType);
	}, [
		schemaType,
		outputFormat,
		title,
		description,
		url,
		siteName,
		siteUrl,
		authorName,
		authorBio,
		imageUrl,
		datePublished,
		dateModified,
		price,
		currency,
		address,
		phone,
		reviewCount,
		averageRating,
		sameAsUrls,
		legalName,
		logoUrl,
		faqItems,
		breadcrumbItems,
		howToSteps
	]);

	const handleCopy = () => {
		navigator.clipboard.writeText(output);
		setCopied(true);
		toast.success('Copied to clipboard');
		setTimeout(() => setCopied(false), 2000);
	};

	const addFaqItem = () => setFaqItems((prev) => [...prev, { question: '', answer: '' }]);
	const removeFaqItem = (i: number) => setFaqItems((prev) => prev.filter((_, idx) => idx !== i));

	const addBreadcrumbItem = () => setBreadcrumbItems((prev) => [...prev, { name: '', url: '' }]);
	const removeBreadcrumbItem = (i: number) =>
		setBreadcrumbItems((prev) => prev.filter((_, idx) => idx !== i));

	const addHowToStep = () => setHowToSteps((prev) => [...prev, { name: '', text: '' }]);
	const removeHowToStep = (i: number) => setHowToSteps((prev) => prev.filter((_, idx) => idx !== i));

	const usePlatformDynamic =
		(outputFormat === 'shopify_liquid' && ['Product', 'Article', 'LocalBusiness'].includes(schemaType)) ||
		(outputFormat === 'wordpress_php' && ['Article', 'Product'].includes(schemaType)) ||
		(outputFormat === 'bigcommerce' && ['Product', 'Article'].includes(schemaType));

	return (
		<>
			<PageMeta title="Schema Generator" />
			<PageHeader
				title="Schema Generator"
				subtitle="Generate JSON-LD structured data for Article, FAQ, Product, Local Business, and more. Copy-paste into your site or Shopify theme."
			/>

			<div className="mt-6 grid gap-6 lg:grid-cols-2">
				{/* Left: Form */}
				<div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
					<div>
						<Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
							Schema Type
						</Label>
						<select
							value={schemaType}
							onChange={(e) => setSchemaType(e.target.value as SchemaType)}
							className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
						>
							{SCHEMA_TYPES.map((t) => (
								<option key={t.value} value={t.value}>
									{t.label}
								</option>
							))}
						</select>
					</div>

					<div>
						<Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
							Platform
						</Label>
						<select
							value={outputFormat}
							onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
							className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
						>
							{PLATFORMS.map((p) => (
								<option key={p.value} value={p.value}>
									{p.label}
								</option>
							))}
						</select>
						{(outputFormat === 'shopify_liquid' || outputFormat === 'wordpress_php' || outputFormat === 'bigcommerce') && (
							<p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
								{['Product', 'Article'].includes(schemaType)
									? 'Uses platform\'s dynamic objects (product, article, etc.).'
									: 'Pastes your entered data. For Product/Article, switch schema type for dynamic code.'}
							</p>
						)}
					</div>

					{/* Common fields — hide when platform has pre-built dynamic snippet */}
					{!usePlatformDynamic && (
						<>
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<Label>Site name</Label>
									<input
										type="text"
										value={siteName}
										onChange={(e) => setSiteName(e.target.value)}
										placeholder="My Business"
										className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
									/>
								</div>
								<div>
									<Label>Site URL</Label>
									<input
										type="url"
										value={siteUrl}
										onChange={(e) => setSiteUrl(e.target.value)}
										placeholder="https://example.com"
										className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
									/>
								</div>
							</div>

							{schemaType !== 'Organization' && (
								<>
									<div>
										<Label>{schemaType === 'LocalBusiness' ? 'Business / page title' : 'Title'}</Label>
										<input
											type="text"
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											placeholder="Page or product title"
											className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
										/>
									</div>
									<div>
										<Label>Description (optional)</Label>
										<textarea
											value={description}
											onChange={(e) => setDescription(e.target.value)}
											placeholder="Brief description"
											rows={2}
											className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
										/>
									</div>
									<div>
										<Label>Page URL (optional)</Label>
										<input
											type="url"
											value={url}
											onChange={(e) => setUrl(e.target.value)}
											placeholder="https://example.com/page"
											className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
										/>
									</div>
								</>
							)}

							{(schemaType === 'Article' || schemaType === 'HowTo') && (
								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<Label>Author name (optional)</Label>
										<input
											type="text"
											value={authorName}
											onChange={(e) => setAuthorName(e.target.value)}
											placeholder="John Smith"
											className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
										/>
									</div>
									<div>
										<Label>Author bio / credentials (optional)</Label>
										<textarea
											value={authorBio}
											onChange={(e) => setAuthorBio(e.target.value)}
											placeholder="Jane Smith, licensed electrician, 15 years experience. Certified by..."
											rows={2}
											className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
										/>
										<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
											Adds Person description for EEAT. Name parsed from first segment.
										</p>
									</div>
									<div>
										<Label>Image URL (optional)</Label>
										<input
											type="url"
											value={imageUrl}
											onChange={(e) => setImageUrl(e.target.value)}
											placeholder="https://..."
											className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
										/>
									</div>
								</div>
							)}

							{schemaType === 'Article' && (
								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<Label>Date published (YYYY-MM-DD)</Label>
										<input
											type="date"
											value={datePublished}
											onChange={(e) => setDatePublished(e.target.value)}
											className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
										/>
									</div>
									<div>
										<Label>Date modified (YYYY-MM-DD)</Label>
										<input
											type="date"
											value={dateModified}
											onChange={(e) => setDateModified(e.target.value)}
											className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
										/>
									</div>
								</div>
							)}

							{schemaType === 'Product' && (
								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<Label>Price (optional)</Label>
										<input
											type="text"
											value={price}
											onChange={(e) => setPrice(e.target.value)}
											placeholder="29.99"
											className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
										/>
									</div>
									<div>
										<Label>Currency</Label>
										<input
											type="text"
											value={currency}
											onChange={(e) => setCurrency(e.target.value)}
											placeholder="USD"
											className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
										/>
									</div>
								</div>
							)}

							{(schemaType === 'LocalBusiness' || schemaType === 'Organization') && (
								<>
									{schemaType === 'LocalBusiness' && (
										<>
											<div className="sm:col-span-2">
												<p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
													AggregateRating (Google reviews)
												</p>
												<div className="grid gap-3 sm:grid-cols-2">
													<div>
														<Label>Review count</Label>
														<input
															type="number"
															min={0}
															value={reviewCount}
															onChange={(e) => setReviewCount(e.target.value)}
															placeholder="127"
															className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
														/>
													</div>
													<div>
														<Label>Average rating (1–5)</Label>
														<input
															type="number"
															min={0}
															max={5}
															step={0.1}
															value={averageRating}
															onChange={(e) => setAverageRating(e.target.value)}
															placeholder="4.8"
															className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
														/>
													</div>
												</div>
											</div>
											<div>
												<Label>Profile URLs (sameAs) — one per line or comma-separated</Label>
												<textarea
													value={sameAsUrls}
													onChange={(e) => setSameAsUrls(e.target.value)}
													placeholder={'https://www.google.com/maps/place/...\nhttps://facebook.com/yourbusiness\nhttps://linkedin.com/company/yourbusiness'}
													rows={3}
													className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
												/>
												<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
													GBP, Facebook, LinkedIn, Yelp, etc. For entity disambiguation.
												</p>
											</div>
										</>
									)}
									<div>
										<Label>Address (optional)</Label>
										<input
											type="text"
											value={address}
											onChange={(e) => setAddress(e.target.value)}
											placeholder="123 Main St, City, State"
											className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
										/>
									</div>
									<div>
										<Label>Phone (optional)</Label>
										<input
											type="tel"
											value={phone}
											onChange={(e) => setPhone(e.target.value)}
											placeholder="+1 234 567 8900"
											className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
										/>
									</div>
									{schemaType === 'Organization' && (
										<>
											<div>
												<Label>Description (optional)</Label>
												<textarea
													value={description}
													onChange={(e) => setDescription(e.target.value)}
													placeholder="What your organization does"
													rows={2}
													className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
												/>
											</div>
											<div>
												<Label>Legal name (optional)</Label>
												<input
													type="text"
													value={legalName}
													onChange={(e) => setLegalName(e.target.value)}
													placeholder="Acme Inc."
													className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
												/>
											</div>
											<div>
												<Label>Logo URL (optional)</Label>
												<input
													type="url"
													value={logoUrl}
													onChange={(e) => setLogoUrl(e.target.value)}
													placeholder="https://..."
													className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
												/>
											</div>
										</>
									)}
								</>
							)}

							{schemaType === 'FAQPage' && (
								<div>
									<div className="flex items-center justify-between">
										<Label>FAQ items</Label>
										<Button type="button" variant="ghost" size="sm" onClick={addFaqItem}>
											<Plus className="size-4" /> Add
										</Button>
									</div>
									<div className="mt-2 space-y-3">
										{faqItems.map((item, i) => (
											<div
												key={i}
												className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
											>
												<div className="flex justify-end">
													<button
														type="button"
														onClick={() => removeFaqItem(i)}
														className="text-gray-400 hover:text-red-500"
													>
														<Trash2 className="size-4" />
													</button>
												</div>
												<input
													type="text"
													value={item.question}
													onChange={(e) =>
														setFaqItems((prev) => {
															const next = [...prev];
															next[i] = { ...next[i], question: e.target.value };
															return next;
														})
													}
													placeholder="Question?"
													className="mb-2 w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
												/>
												<textarea
													value={item.answer}
													onChange={(e) =>
														setFaqItems((prev) => {
															const next = [...prev];
															next[i] = { ...next[i], answer: e.target.value };
															return next;
														})
													}
													placeholder="Answer"
													rows={2}
													className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
												/>
											</div>
										))}
									</div>
								</div>
							)}

							{schemaType === 'BreadcrumbList' && (
								<div>
									<div className="flex items-center justify-between">
										<Label>Breadcrumb items</Label>
										<Button type="button" variant="ghost" size="sm" onClick={addBreadcrumbItem}>
											<Plus className="size-4" /> Add
										</Button>
									</div>
									<div className="mt-2 space-y-2">
										{breadcrumbItems.map((item, i) => (
											<div
												key={i}
												className="flex gap-2 rounded-lg border border-gray-200 p-2 dark:border-gray-700"
											>
												<input
													type="text"
													value={item.name}
													onChange={(e) =>
														setBreadcrumbItems((prev) => {
															const next = [...prev];
															next[i] = { ...next[i], name: e.target.value };
															return next;
														})
													}
													placeholder="Name"
													className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
												/>
												<input
													type="url"
													value={item.url || ''}
													onChange={(e) =>
														setBreadcrumbItems((prev) => {
															const next = [...prev];
															next[i] = { ...next[i], url: e.target.value };
															return next;
														})
													}
													placeholder="URL (optional)"
													className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
												/>
												<button
													type="button"
													onClick={() => removeBreadcrumbItem(i)}
													className="text-gray-400 hover:text-red-500"
												>
													<Trash2 className="size-4" />
												</button>
											</div>
										))}
									</div>
								</div>
							)}

							{schemaType === 'HowTo' && (
								<div>
									<div className="flex items-center justify-between">
										<Label>Steps</Label>
										<Button type="button" variant="ghost" size="sm" onClick={addHowToStep}>
											<Plus className="size-4" /> Add step
										</Button>
									</div>
									<div className="mt-2 space-y-2">
										{howToSteps.map((step, i) => (
											<div
												key={i}
												className="flex gap-2 rounded-lg border border-gray-200 p-2 dark:border-gray-700"
											>
												<input
													type="text"
													value={step.name}
													onChange={(e) =>
														setHowToSteps((prev) => {
															const next = [...prev];
															next[i] = { ...next[i], name: e.target.value };
															return next;
														})
													}
													placeholder={`Step ${i + 1} name`}
													className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
												/>
												<input
													type="text"
													value={step.text || ''}
													onChange={(e) =>
														setHowToSteps((prev) => {
															const next = [...prev];
															next[i] = { ...next[i], text: e.target.value };
															return next;
														})
													}
													placeholder="Step description (optional)"
													className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
												/>
												<button
													type="button"
													onClick={() => removeHowToStep(i)}
													className="text-gray-400 hover:text-red-500"
												>
													<Trash2 className="size-4" />
												</button>
											</div>
										))}
									</div>
								</div>
							)}
						</>
					)}
				</div>

				{/* Right: Output */}
				<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
					<div className="mb-4 flex items-center justify-between">
						<span className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
							<Code2 className="size-4" />
							Output
						</span>
						<Button variant="outline" size="sm" onClick={handleCopy}>
							{copied ? <Check className="size-4" /> : <Copy className="size-4" />}
							{copied ? 'Copied' : 'Copy'}
						</Button>
					</div>
					<div className="relative max-h-[600px] overflow-auto rounded-lg border border-gray-200 bg-gray-900 p-4 dark:border-gray-700">
						<pre className="whitespace-pre-wrap break-words text-xs text-gray-100">
							<code>{output}</code>
						</pre>
					</div>
					<p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
						{outputFormat === 'shopify_liquid' && 'Save as .liquid in snippets/, then {% render "schema-name" %}.'}
						{outputFormat === 'wordpress_php' && 'Add to functions.php or a custom plugin.'}
						{outputFormat === 'bigcommerce' && 'Add to your Stencil theme template or partial.'}
						{outputFormat === 'webflow' && 'Paste in Site Settings > Custom Code > Head Code.'}
						{outputFormat === 'wix' && 'Add to page code; wixSeo.setStructuredData runs on page load.'}
						{outputFormat === 'standard' && 'Paste into your page <head> or before </body>.'}
					</p>
				</div>
			</div>
		</>
	);
}

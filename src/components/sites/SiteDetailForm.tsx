import React, { useState, useRef } from 'react';
import { Upload, X, Plus } from 'lucide-react';
import Label from '../form/Label';
import Input from '../form/input/InputField';
import TextArea from '../form/input/TextArea';
import { Button } from '../ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '../ui/select';
import { validateUrl } from '../../utils/validation';
import { GSCConnectionManager } from '../gsc/GSCConnectionManager';
import type { Site } from '../../types/site';

const MAX_LOGO_SIZE_MB = 5;
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const PLATFORM_OPTIONS = [
	{ value: 'shopify', label: 'Shopify' },
	{ value: 'wordpress', label: 'WordPress' },
	{ value: 'wix', label: 'Wix' },
	{ value: 'squarespace', label: 'Squarespace' },
	{ value: 'custom', label: 'Custom' }
];

export interface SiteFormData {
	name: string;
	description: string;
	url: string;
	platform: string;
	niche: string;
	customerDescription: string;
	competitorUrls: string[];
	logoFile?: File | null;
	removeLogo?: boolean;
}

interface SiteDetailFormProps {
	initial?: Site;
	onSubmit: (data: SiteFormData) => void;
	onCancel: () => void;
	disabled?: boolean;
}

export default function SiteDetailForm({
	initial,
	onSubmit,
	onCancel,
	disabled = false
}: SiteDetailFormProps) {
	const [name, setName] = useState(initial?.name ?? '');
	const [description, setDescription] = useState(initial?.description ?? '');
	const [url, setUrl] = useState(initial?.url ?? '');
	const [platform, setPlatform] = useState(initial?.platform ?? '');
	const [niche, setNiche] = useState(initial?.niche ?? '');
	const [customerDescription, setCustomerDescription] = useState(
		initial?.customerDescription ?? ''
	);
	const [competitorUrls, setCompetitorUrls] = useState<string[]>(
		initial?.competitorUrls ?? []
	);
	const [competitorInput, setCompetitorInput] = useState('');
	const [competitorError, setCompetitorError] = useState('');
	const [logo, setLogo] = useState<File | null>(null);
	const [logoPreview, setLogoPreview] = useState<string | null>(initial?.logo ?? null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [errors, setErrors] = useState<{
		name: string;
		url: string;
		logo: string;
	}>({ name: '', url: '', logo: '' });

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
				setErrors((prev) => ({
					...prev,
					logo: `Logo must be under ${MAX_LOGO_SIZE_MB}MB`
				}));
				return;
			}
			setLogo(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setLogoPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleRemoveLogo = () => {
		clearError('logo');
		setLogo(null);
		setLogoPreview(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
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

	const handleRemoveCompetitor = (url: string) => {
		setCompetitorUrls((prev) => prev.filter((u) => u !== url));
	};

	const validateForm = (): boolean => {
		const newErrors = {
			name: '',
			url: '',
			logo: ''
		};

		if (!name.trim()) {
			newErrors.name = 'Name is required';
		}

		if (url.trim() && !validateUrl(url)) {
			newErrors.url = 'Please enter a valid URL (e.g. https://example.com)';
		}

		if (logo && !ALLOWED_LOGO_TYPES.includes(logo.type)) {
			newErrors.logo = 'Please upload a valid image (JPEG, PNG, GIF, or WebP)';
		} else if (logo && logo.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
			newErrors.logo = `Logo must be under ${MAX_LOGO_SIZE_MB}MB`;
		}

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
			logoFile: logo ?? undefined,
			removeLogo: Boolean(initial?.logo && !logoPreview && !logo)
		});
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Logo Upload - same pattern as OnboardingForm */}
			<div className="flex flex-col items-start space-y-4">
				<Label>Logo</Label>
				<div className="flex items-center gap-4">
					<div className="relative">
						{logoPreview ? (
							<div className="relative">
								<img
									src={logoPreview}
									alt="Logo preview"
									className="size-20 rounded-xl border-1 border-gray-200 object-cover dark:border-gray-600"
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
					<div className="flex flex-col gap-1">
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
					onChange={setDescription}
				/>
			</div>

			<div>
				<Label>Platform</Label>
				<Select value={platform || '__empty__'} onValueChange={(v) => setPlatform(v === '__empty__' ? '' : v)}>
					<SelectTrigger className="h-11 border-gray-300 dark:border-gray-700">
						<SelectValue placeholder="Select platform" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="__empty__">Select platform</SelectItem>
						{PLATFORM_OPTIONS.filter((o) => o.value !== '').map((opt) => (
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
			</div>

			<div>
				<Label htmlFor="site-customer-description">Customer description</Label>
				<TextArea
					placeholder="Describe your target customer for content generation..."
					rows={3}
					value={customerDescription}
					onChange={setCustomerDescription}
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
										className="text-gray-500 hover:text-error-500 dark:text-gray-400 dark:hover:text-error-400"
										aria-label={`Remove ${u}`}
									>
										<X className="size-3.5" />
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			{/* GSC Connection Section - Only show when editing existing site */}
			{initial && (
				<div className="space-y-3 border-t border-gray-200 pt-6 dark:border-gray-700">
					<div>
						<h3 className="font-medium text-gray-900 dark:text-white mb-3">
							Google Search Console
						</h3>
						<GSCConnectionManager siteId={initial.id} siteName={initial.name} />
					</div>
				</div>
			)}

			<div className="flex gap-2 pt-4">
				<Button
					type="submit"
					className="bg-brand-500 hover:bg-brand-600 flex-1 text-white"
					disabled={!name.trim() || disabled}
				>
					{initial ? 'Save Changes' : 'Add Site'}
				</Button>
				<Button type="button" variant="outline" onClick={onCancel} disabled={disabled}>
					Cancel
				</Button>
			</div>
		</form>
	);
}

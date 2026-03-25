/**
 * CRO Studio — Add Page modal
 * URL input, page type selector, destination URL (SEO pages).
 * Validation: might-be-destination confirm, handoff check.
 *
 * Spec: cro-studio.md — Entry Point 3 (Standalone)
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Search, Target, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CreditCost } from '../shared/CreditBadge';
import { CREDIT_COSTS } from '../../lib/credits';
import Checkbox from '../form/input/Checkbox';

interface CROAddPageModalProps {
	open: boolean;
	onClose: () => void;
	onSuccess: (auditId: string) => void;
	/** Pre-fill when opening from Workspace (this page → CRO Studio) */
	initialPageUrl?: string;
	initialDestinationUrl?: string;
	initialPageLabel?: string;
	initialClusterId?: string;
	initialSiteId?: string;
	initialPageType?: 'seo_page' | 'destination_page' | undefined;
}

export function CROAddPageModal({
	open,
	onClose,
	onSuccess,
	initialPageUrl,
	initialDestinationUrl,
	initialPageLabel,
	initialClusterId,
	initialSiteId,
	initialPageType
}: CROAddPageModalProps) {
	const [pageUrl, setPageUrl] = useState('');
	const [pageType, setPageType] = useState<'seo_page' | 'destination_page'>('seo_page');
	const [pageSubtype, setPageSubtype] = useState<
		'saas_signup' | 'ecommerce_product' | 'service_booking'
	>('saas_signup');
	const [destinationUrl, setDestinationUrl] = useState('');
	const [pageLabel, setPageLabel] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

	const reset = () => {
		setPageUrl('');
		setPageType(initialPageType ?? 'seo_page');
		setPageSubtype('saas_signup');
		setDestinationUrl('');
		setPageLabel('');
		setError(null);
		setConfirmMessage(null);
	};

	const handleClose = () => {
		reset();
		onClose();
	};

	// Pre-fill when opening with initial values (e.g. from Workspace)
	useEffect(() => {
		if (open) {
			if (initialPageUrl?.trim()) setPageUrl(initialPageUrl.trim());
			if (initialDestinationUrl !== undefined) setDestinationUrl(initialDestinationUrl);
			if (initialPageLabel !== undefined) setPageLabel(initialPageLabel);
			if (initialPageType !== undefined) setPageType(initialPageType);
		}
	}, [open, initialPageUrl, initialDestinationUrl, initialPageLabel]);

	const handleSubmit = async (withConfirm = false) => {
		const url = pageUrl.trim();
		if (!url) {
			setError('Page URL is required');
			return;
		}
		if (pageType !== 'seo_page' && pageType !== 'destination_page') {
			setError('Please select page type');
			return;
		}

		setSubmitting(true);
		setError(null);
		setConfirmMessage(null);

		try {
			const body: Record<string, unknown> = {
				page_url: url,
				page_type: pageType,
				page_label: pageLabel.trim() || null,
				destination_url: pageType === 'seo_page' ? destinationUrl.trim() || null : null,
				page_subtype: pageType === 'destination_page' ? pageSubtype : null
			};
			if (withConfirm) {
				body.confirm_might_be_destination = true;
			}
			if (initialClusterId) body.cluster_id = initialClusterId;
			if (initialSiteId) body.site_id = initialSiteId;

			const res = await api.post('/api/cro-studio/audits', body);

			const data = await res.json();

			if (res.ok) {
				if (data.audit_id) {
					toast.success('Audit complete');
					handleClose();
					onSuccess(data.audit_id);
				}
				return;
			}

			// needs_confirmation: might_be_destination
			if (data.needs_confirmation && data.code === 'might_be_destination') {
				setConfirmMessage(
					data.message ?? 'This looks like a destination page. Confirm your selection?'
				);
				setSubmitting(false);
				return;
			}

			// 402 insufficient credits
			if (res.status === 402) {
				setError(
					`Insufficient credits. Need ${data.required ?? CREDIT_COSTS.CRO_STUDIO_AUDIT ?? 1}, you have ${data.available ?? 0}.`
				);
				setSubmitting(false);
				return;
			}

			setError(data.error ?? data.message ?? 'Failed to add page');
			setSubmitting(false);
		} catch (err) {
			setError('Failed to add page');
			setSubmitting(false);
		}
	};

	const handleConfirmSelection = () => {
		setConfirmMessage(null);
		handleSubmit(true);
	};

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent className="max-w-md border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
				<DialogHeader>
					<DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
						Add Page
					</DialogTitle>
					<DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
						Enter a URL to audit. Runs — <CreditCost amount={CREDIT_COSTS.CRO_STUDIO_AUDIT ?? 1} />.
					</DialogDescription>
					<p className="mt-2 block text-xs text-gray-500 dark:text-gray-400">
						CRO Studio can only audit SEO pages and destination pages that are live. These pages
						must have a working url to properly be audited.
					</p>
				</DialogHeader>

				<div className="space-y-4">
					{confirmMessage ? (
						<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
							<p className="text-sm text-amber-800 dark:text-amber-200">{confirmMessage}</p>
							<div className="mt-4 flex gap-2">
								<Button
									size="sm"
									onClick={handleConfirmSelection}
									disabled={submitting}
									className="bg-amber-600 hover:bg-amber-700"
								>
									{submitting ? 'Running…' : 'Yes, keep as SEO page'}
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										setPageType('destination_page');
										setDestinationUrl('');
										setConfirmMessage(null);
									}}
								>
									Change to Destination
								</Button>
							</div>
						</div>
					) : (
						<>
							<div>
								<label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
									Page URL
								</label>
								<input
									type="url"
									value={pageUrl}
									onChange={(e) => setPageUrl(e.target.value)}
									placeholder="https://example.com/page"
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
									Page type
								</label>
								<div className="flex gap-4">
									<label className="flex cursor-pointer items-center gap-2">
										<Checkbox
											checked={pageType === 'seo_page'}
											onChange={() => setPageType('seo_page')}
											label="SEO Page"
											disabled={initialPageType && initialPageType !== 'seo_page'}
										/>
									</label>
									<label className="flex cursor-pointer items-center gap-2">
										<Checkbox
											checked={pageType === 'destination_page'}
											onChange={() => setPageType('destination_page')}
											label="Destination Page"
											disabled={initialPageType && initialPageType !== 'destination_page'}
										/>
									</label>
								</div>
							</div>

							{pageType === 'destination_page' && (
								<div>
									<label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
										Page subtype
									</label>
									<select
										value={pageSubtype}
										onChange={(e) =>
											setPageSubtype(
												e.target.value as 'saas_signup' | 'ecommerce_product' | 'service_booking'
											)
										}
										className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
									>
										<option value="saas_signup">SaaS signup</option>
										<option value="ecommerce_product">Ecommerce product</option>
										<option value="service_booking">Service booking</option>
									</select>
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
										Used for recommended persuasion signals and coherence analysis.
									</p>
								</div>
							)}

							{pageType === 'seo_page' && (
								<div>
									<label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
										Destination URL (optional)
									</label>
									<input
										type="url"
										value={destinationUrl}
										onChange={(e) => setDestinationUrl(e.target.value)}
										placeholder="https://example.com/signup"
										className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
									/>
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
										The page this SEO page hands off to. Used for handoff check.
									</p>
								</div>
							)}

							<div>
								<label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
									Label (optional)
								</label>
								<input
									type="text"
									value={pageLabel}
									onChange={(e) => setPageLabel(e.target.value)}
									placeholder="e.g. Best Ecommerce Platforms"
									className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
								/>
							</div>

							{error && (
								<div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
									<AlertCircle className="size-4 shrink-0" />
									{error}
								</div>
							)}

							<div className="flex gap-2 pt-2">
								<Button onClick={() => handleSubmit()} disabled={submitting} className="flex-1">
									{submitting ? (
										'Auditing…'
									) : (
										<>
											Add & audit — <CreditCost amount={CREDIT_COSTS.CRO_STUDIO_AUDIT ?? 1} />
										</>
									)}
								</Button>
								<Button variant="outline" onClick={handleClose} disabled={submitting}>
									Cancel
								</Button>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

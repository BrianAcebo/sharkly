/**
 * S2-15: SEO Decision Tree — "Diagnose This Page" modal
 * Fetches 7-step diagnostic and shows primary diagnosis + first action.
 */

import React, { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Check, X, Loader2, Stethoscope } from 'lucide-react';
import { api } from '../../utils/api';

interface DiagnoseStep {
	step: number;
	name: string;
	passed: boolean;
	message: string;
}

interface DiagnoseResult {
	steps: DiagnoseStep[];
	primaryDiagnosis: string;
	firstAction: string;
	pageTitle: string;
}

interface DiagnoseModalProps {
	open: boolean;
	onClose: () => void;
	pageId: string;
}

export function DiagnoseModal({ open, onClose, pageId }: DiagnoseModalProps) {
	const [result, setResult] = useState<DiagnoseResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open || !pageId) return;
		setLoading(true);
		setError(null);
		setResult(null);
		api
			.get(`/api/pages/${pageId}/diagnose`, { credentials: 'include' })
			.then((res) => {
				if (!res.ok) {
					if (res.status === 403) {
						return res.json().then((j) => {
							throw new Error(j.error ?? 'Growth plan or higher required');
						});
					}
					return res.json().then((j) => {
						throw new Error(j.error ?? 'Failed to diagnose');
					});
				}
				return res.json();
			})
			.then(setResult)
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, [open, pageId]);

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Stethoscope className="size-5 text-teal-500" />
						Diagnose This Page
					</DialogTitle>
					<DialogDescription>
						Why isn’t this page ranking? We ran a 7-step check using your crawl, Search Console, and
						content data.
					</DialogDescription>
				</DialogHeader>

				{loading ? (
					<div className="flex flex-col items-center justify-center gap-3 py-12">
						<Loader2 className="size-8 animate-spin text-teal-500" />
						<p className="text-sm text-gray-500 dark:text-gray-400">Running diagnostic…</p>
					</div>
				) : error ? (
					<div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
						<p className="text-sm font-medium text-amber-800 dark:text-amber-200">{error}</p>
					</div>
				) : result ? (
					<div className="space-y-4">
						{/* Primary diagnosis */}
						<div className="rounded-lg border-2 border-teal-500/30 bg-teal-500/5 p-4 dark:border-teal-500/20 dark:bg-teal-500/10">
							<p className="text-[11px] font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
								Primary diagnosis
							</p>
							<p className="mt-1 font-medium text-gray-900 dark:text-white">
								{result.primaryDiagnosis}
							</p>
							<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{result.firstAction}</p>
						</div>

						{/* Steps */}
						<div className="space-y-2">
							<p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
								7-step check
							</p>
							{result.steps.map((s) => (
								<div
									key={s.step}
									className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
										s.passed
											? 'border-green-500/20 bg-green-500/5 dark:border-green-500/10 dark:bg-green-500/5'
											: 'border-amber-500/20 bg-amber-500/5 dark:border-amber-500/10 dark:bg-amber-500/5'
									}`}
								>
									{s.passed ? (
										<Check className="mt-0.5 size-4 flex-shrink-0 text-green-500" />
									) : (
										<X className="mt-0.5 size-4 flex-shrink-0 text-amber-500" />
									)}
									<div className="min-w-0 flex-1">
										<p className="text-xs font-medium text-gray-900 dark:text-white">
											{s.step}. {s.name}
										</p>
										<p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-400">
											{s.message}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				) : null}

				{result && (
					<div className="flex justify-end border-t pt-4">
						<Button variant="outline" size="sm" onClick={onClose}>
							Close
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

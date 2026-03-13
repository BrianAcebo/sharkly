/**
 * Add Target modal — Step 1: form. Step 2: Generate Topic Plan (15 credits).
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import InputField from '../form/input/InputField';
import { CreditBadge } from '../shared/CreditBadge';
import { CREDIT_COSTS } from '../../lib/credits';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabaseClient';
import { buildApiUrl } from '../../utils/urls';
import type { Target } from '../../types/target';

/** Minimal shape for strategy API response suggestions */
interface TopicSuggestion {
	title: string;
	keyword: string;
	monthly_searches: number;
	keyword_difficulty: number;
	cpc: number;
	funnel_stage: string;
	authority_fit: string;
	ai_reasoning?: string;
}

type Step = 1 | 2;

interface Props {
	open: boolean;
	onClose: () => void;
	siteId: string;
	onTargetCreated?: (target: Target) => void;
}

export function AddTargetModal({ open, onClose, siteId, onTargetCreated }: Props) {
	const navigate = useNavigate();
	const [step, setStep] = useState<Step>(1);
	const [createdTarget, setCreatedTarget] = useState<Target | null>(null);
	const [generating, setGenerating] = useState(false);
	const [form, setForm] = useState({
		name: '',
		destinationPageUrl: '',
		destinationPageLabel: '',
		seedKeywords: ''
	});

	const handleClose = useCallback(() => {
		setStep(1);
		setCreatedTarget(null);
		setForm({ name: '', destinationPageUrl: '', destinationPageLabel: '', seedKeywords: '' });
		onClose();
	}, [onClose]);

	const handleContinue = useCallback(async () => {
		const name = form.name.trim();
		if (!name) {
			toast.error('Target name is required');
			return;
		}
		const seeds = form.seedKeywords
			.split(/[,\n]/)
			.map((s) => s.trim())
			.filter(Boolean);
		try {
			const { data: session } = await supabase.auth.getSession();
			const token = session?.session?.access_token;
			if (!token) throw new Error('Please sign in');
			const res = await fetch(buildApiUrl(`/api/sites/${siteId}/targets`), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({
					name,
					destinationPageUrl: form.destinationPageUrl.trim() || undefined,
					destinationPageLabel: form.destinationPageLabel.trim() || undefined,
					seedKeywords: seeds.length > 0 ? seeds : undefined
				})
			});
			const data = (await res.json().catch(() => ({}))) as Target & { error?: string };
			if (!res.ok) throw new Error(data?.error ?? 'Failed to create target');
			setCreatedTarget(data);
			onTargetCreated?.(data);
			setStep(2);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to create target');
		}
	}, [form, siteId, onTargetCreated]);

	const handleGenerate = useCallback(async () => {
		if (!createdTarget) return;
		setGenerating(true);
		try {
			const { data: session } = await supabase.auth.getSession();
			const token = session?.session?.access_token;
			if (!token) throw new Error('Please sign in');
			const seeds =
				createdTarget.seedKeywords.length > 0
					? createdTarget.seedKeywords
					: [createdTarget.name];
			const res = await fetch(buildApiUrl('/api/strategy/suggest'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({
					siteId,
					targetId: createdTarget.id,
					seedKeywords: seeds
				})
			});
			const data = (await res.json().catch(() => ({}))) as {
				suggestions?: TopicSuggestion[];
				runId?: string;
				error?: string;
				required?: number;
				available?: number;
			};
			if (!res.ok) {
				if (res.status === 402) {
					toast.error(
						`Insufficient credits. Need ${data.required ?? CREDIT_COSTS.STRATEGY_GENERATION}, have ${data.available ?? 0}.`
					);
					return;
				}
				throw new Error(data?.error ?? 'Failed to generate topics');
			}
			handleClose();
			navigate(`/strategy/${createdTarget.id}`, {
				state: {
					justGenerated: true,
					runId: data.runId,
					suggestions: data.suggestions ?? []
				}
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to generate topics');
		} finally {
			setGenerating(false);
		}
	}, [createdTarget, siteId, handleClose, navigate]);

	return (
		<Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{step === 1 ? 'Add Target' : 'Generate Topic Plan'}</DialogTitle>
					<DialogDescription>
						{step === 1
							? 'A target is a page you want to rank — a service, product, or area of your business.'
							: 'Sharkly will research keywords and suggest topics tailored to this target.'}
					</DialogDescription>
				</DialogHeader>
				{step === 1 ? (
					<div className="space-y-4">
						<div>
							<Label htmlFor="target-name">Target name</Label>
							<InputField
								id="target-name"
								value={form.name}
								onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
								placeholder="e.g. Cyber Crime Investigation, Hydrating Moisturizer"
							/>
						</div>
						<div>
							<Label htmlFor="dest-url">Destination page URL (optional)</Label>
							<InputField
								id="dest-url"
								type="url"
								value={form.destinationPageUrl}
								onChange={(e) => setForm((f) => ({ ...f, destinationPageUrl: e.target.value }))}
								placeholder="https://example.com/service"
							/>
						</div>
						<div>
							<Label htmlFor="dest-label">Destination page label (optional)</Label>
							<InputField
								id="dest-label"
								value={form.destinationPageLabel}
								onChange={(e) => setForm((f) => ({ ...f, destinationPageLabel: e.target.value }))}
								placeholder="Short name for UI"
							/>
						</div>
						<div>
							<Label htmlFor="seeds">Seed keywords (optional)</Label>
							<InputField
								id="seeds"
								value={form.seedKeywords}
								onChange={(e) => setForm((f) => ({ ...f, seedKeywords: e.target.value }))}
								placeholder="Comma-separated. Defaults to target name if blank."
							/>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={handleClose}>
								Cancel
							</Button>
							<Button className="bg-brand-500 hover:bg-brand-600" onClick={handleContinue}>
								Continue
							</Button>
						</DialogFooter>
					</div>
				) : (
					<div className="space-y-4">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Generate a topic plan for <strong>{createdTarget?.name}</strong>?
						</p>
						<DialogFooter>
							<Button variant="outline" onClick={handleClose}>
								Done
							</Button>
							<Button
								className="bg-brand-500 hover:bg-brand-600"
								disabled={generating}
								onClick={handleGenerate}
							>
								{generating ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<CreditBadge
										cost={CREDIT_COSTS.STRATEGY_GENERATION}
										action="Strategy"
										sufficient={true}
									/>
								)}
								<span className="ml-2">
									{generating ? 'Generating…' : (
										<>
											<Sparkles className="mr-1 inline size-4" />
											Generate Topic Plan
										</>
									)}
								</span>
							</Button>
						</DialogFooter>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

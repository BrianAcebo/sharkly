/**
 * Add Target modal — Step 1: form. Step 2: Generate Topic Plan (15 credits).
 * Uses TaskProgressWidget for topic generation progress.
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
import { TaskProgressWidget } from '../shared/TaskProgressWidget';
import type { TaskStep, TaskStatus } from '../shared/TaskProgressWidget';
import { CREDIT_COSTS } from '../../lib/credits';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabaseClient';
import { buildApiUrl } from '../../utils/urls';
import type { Target } from '../../types/target';

/** Same steps as StrategyTargetDetail — consistent TaskProgressWidget experience */
const TOPIC_PLAN_STEPS: TaskStep[] = [
	{ id: 'authority', label: 'Checking your site authority', status: 'pending' },
	{ id: 'keywords', label: 'Pulling real keyword data for your topics', status: 'pending' },
	{ id: 'google', label: 'Searching Google for related questions', status: 'pending' },
	{ id: 'competitors', label: 'Scanning what competitors write about', status: 'pending' },
	{ id: 'brainstorm', label: 'Mapping every topic your niche needs to cover', status: 'pending' },
	{ id: 'validate', label: 'Matching keyword data to each topic', status: 'pending' },
	{ id: 'competition', label: 'Checking how hard each topic is to rank for', status: 'pending' },
	{ id: 'metrics', label: 'Calculating search volume and value per topic', status: 'pending' },
	{ id: 'rank', label: 'Ordering topics from easiest wins to long-term goals', status: 'pending' }
];

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
	const [taskWidgetOpen, setTaskWidgetOpen] = useState(false);
	const [taskStatus, setTaskStatus] = useState<TaskStatus>('running');
	const [taskSteps, setTaskSteps] = useState<TaskStep[]>(TOPIC_PLAN_STEPS);
	const [taskError, setTaskError] = useState<string | undefined>();
	const [form, setForm] = useState({
		name: '',
		destinationPageUrl: '',
		destinationPageLabel: '',
		seedKeywords: ''
	});

	const handleClose = useCallback(() => {
		setStep(1);
		setCreatedTarget(null);
		setGenerating(false);
		setTaskWidgetOpen(false);
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
		setTaskSteps(
			TOPIC_PLAN_STEPS.map((s, i) => ({
				...s,
				status: (i === 0 ? 'active' : 'pending') as 'active' | 'pending'
			}))
		);
		setTaskStatus('running');
		setTaskError(undefined);
		setTaskWidgetOpen(true);
		onClose();
		try {
			const { data: session } = await supabase.auth.getSession();
			const token = session?.session?.access_token;
			if (!token) {
				toast.error('Please sign in to continue');
				setTaskStatus('error');
				setTaskError('Authentication required. Please sign in.');
				return;
			}
			const seeds =
				createdTarget.seedKeywords.length > 0 ? createdTarget.seedKeywords : [createdTarget.name];
			const res = await fetch(buildApiUrl('/api/strategy/suggest'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({
					siteId,
					targetId: createdTarget.id,
					seedKeywords: seeds
				})
			});

			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as {
					error?: string;
					required?: number;
					available?: number;
				};
				if (res.status === 402) {
					const msg = `Insufficient credits. Need ${data.required ?? CREDIT_COSTS.STRATEGY_GENERATION}, have ${data.available ?? 0}.`;
					toast.error(msg);
					setTaskStatus('error');
					setTaskError(msg);
					return;
				}
				throw new Error(data?.error ?? 'Failed to generate topics');
			}

			// Consume NDJSON stream
			const reader = res.body?.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			let result: { suggestions?: TopicSuggestion[]; runId?: string | null } = {};

			if (reader) {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() ?? '';
					for (const line of lines) {
						if (!line.trim()) continue;
						try {
							const ev = JSON.parse(line) as {
								type: string;
								id?: string;
								message?: string;
								suggestions?: TopicSuggestion[];
								runId?: string | null;
							};
							if (ev.type === 'step' && ev.id) {
								setTaskSteps((prev) => {
									const stepIdx = TOPIC_PLAN_STEPS.findIndex((st) => st.id === ev.id);
									if (stepIdx === -1) return prev;
									return prev.map((s, i) => {
										if (i <= stepIdx) return { ...s, status: 'complete' as const };
										if (i === stepIdx + 1) return { ...s, status: 'active' as const };
										return s;
									});
								});
							} else if (ev.type === 'done') {
								result = { suggestions: ev.suggestions, runId: ev.runId };
							} else if (ev.type === 'error') {
								throw new Error(ev.message ?? 'Failed to generate topics');
							}
						} catch (parseErr) {
							if (!(parseErr instanceof SyntaxError)) throw parseErr;
						}
					}
				}
			}

			setTaskStatus('done');
			setTimeout(() => {
				handleClose();
				navigate(`/strategy/${createdTarget.id}`, {
					state: {
						justGenerated: true,
						runId: result.runId ?? null,
						suggestions: result.suggestions ?? []
					}
				});
			}, 900);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to generate topics';
			toast.error(msg);
			setTaskStatus('error');
			setTaskError(msg);
		} finally {
			setGenerating(false);
		}
	}, [createdTarget, siteId, handleClose, navigate, onClose]);

	return (
		<>
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
									placeholder="Ecommerce SEO, Online Store SEO..."
								/>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									Comma-separated. Defaults to target name if blank.
								</p>
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
										{generating ? (
											'Generating…'
										) : (
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
			<TaskProgressWidget
				open={taskWidgetOpen}
				title="Generating Strategy"
				status={taskStatus}
				steps={taskSteps}
				errorMessage={taskError}
				disableAutoAdvance
				onClose={() => setTaskWidgetOpen(false)}
			/>
		</>
	);
}

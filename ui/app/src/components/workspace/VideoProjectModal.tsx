import { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { VideoJobOptions } from '../../api/video';
import { fetchVideoFontCatalog, type VideoFontCatalog } from '../../api/video';
import { CreditCost } from '../shared/CreditBadge';
import { CREDIT_COSTS } from '../../lib/credits';
import {
	emptyVideoScript,
	isPlaceholderVideoScript,
	parseVideoScript,
	type VideoScript
} from '../../types/videoScript';
import {
	type VideoBranding,
	type VideoDraftRenderOptions,
	brandingToJobOverride,
	resolveVideoBrandingForEditor
} from '../../types/videoBranding';
import { CartesiaVideoVoicePanel } from '../sites/CartesiaVideoVoicePanel';
import { VideoScriptEditor, videoScriptToJsonText } from './VideoScriptEditor';

const PLAN_DURATION_INPUT_CLASS =
	'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

function clampPlanDurationSeconds(total: number): number {
	if (Number.isNaN(total) || !Number.isFinite(total)) return 60;
	return Math.min(600, Math.max(60, Math.round(total)));
}

function totalSecondsFromMinSec(min: number, sec: number): number {
	return clampPlanDurationSeconds(min * 60 + sec);
}

/** Step 1 planning: enter minutes + seconds; APIs still use total seconds (60–600). */
function PlanDurationInputs({
	idPrefix,
	valueSeconds,
	onChangeSeconds,
	helperText
}: {
	idPrefix: string;
	valueSeconds: number;
	onChangeSeconds: (seconds: number) => void;
	helperText?: string;
}) {
	const total = clampPlanDurationSeconds(valueSeconds);
	const mins = Math.floor(total / 60);
	const secs = total % 60;

	return (
		<div className="grid gap-2">
			<Label className="text-foreground">Max duration</Label>
			<div className="grid grid-cols-2 gap-3 sm:max-w-md">
				<div className="grid gap-1.5">
					<Label htmlFor={`${idPrefix}-min`} className="text-muted-foreground text-xs font-normal">
						Minutes
					</Label>
					<input
						id={`${idPrefix}-min`}
						type="number"
						inputMode="numeric"
						min={0}
						max={10}
						step={1}
						value={mins}
						onChange={(e) => {
							const raw = e.target.value;
							const m = raw === '' ? 0 : Math.max(0, Math.min(10, Math.trunc(Number(raw)) || 0));
							onChangeSeconds(totalSecondsFromMinSec(m, secs));
						}}
						className={PLAN_DURATION_INPUT_CLASS}
					/>
				</div>
				<div className="grid gap-1.5">
					<Label htmlFor={`${idPrefix}-sec`} className="text-muted-foreground text-xs font-normal">
						Seconds
					</Label>
					<input
						id={`${idPrefix}-sec`}
						type="number"
						inputMode="numeric"
						min={0}
						max={59}
						step={1}
						value={secs}
						onChange={(e) => {
							const raw = e.target.value;
							const s = raw === '' ? 0 : Math.max(0, Math.min(59, Math.trunc(Number(raw)) || 0));
							onChangeSeconds(totalSecondsFromMinSec(mins, s));
						}}
						className={PLAN_DURATION_INPUT_CLASS}
					/>
				</div>
			</div>
			{helperText ? <p className="text-muted-foreground text-xs">{helperText}</p> : null}
		</div>
	);
}

/** Payload for `onPersistVideoDraft`. `manualScriptSource` is only sent when `scriptSource === 'standalone'` (Videos hub). */
export type VideoDraftPersistPartial = {
	script?: VideoScript;
	branding?: VideoBranding;
	cartesiaVoiceId?: string;
	manualScriptSource?: string;
};

export type VideoProjectModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Workspace page id when editing an article; null for standalone Videos hub rows. */
	pageId: string | null;
	/** Current `videos.id` when known (standalone always; workspace after first save). */
	videoDraftId: string | null;
	scriptSource: 'article' | 'standalone';
	/** Step 1 — article as Tiptap JSON string (workspace only). */
	articleContentJson?: string;
	/** Site default narration voice UUID (`sites.cartesia_voice_id`). Draft `render_options.cartesia_voice_id` overrides. */
	siteCartesiaVoiceId?: string | null;
	/**
	 * Videos hub: set to the selected site id so we can persist a new draft before `videos.id` exists
	 * (no upfront insert). Workspace should omit this.
	 */
	standaloneSiteId?: string | null;
	savedVideoScriptDraft: unknown | null;
	savedVideoRenderOptions: unknown | null;
	siteVideoBranding: unknown | null;
	onPersistVideoDraft?: (partial: VideoDraftPersistPartial) => Promise<void>;
	onPersistSiteVideoBranding?: (branding: VideoBranding) => Promise<void>;
	/** Workspace: Claude script from article JSON. */
	onGenerateScriptFromArticle?: (opts: {
		maxDurationSeconds: number;
		quality: 'low' | 'medium' | 'high';
	}) => Promise<Record<string, unknown>>;
	/** Videos hub: Claude script from plain text / brief. */
	onGenerateScriptFromSourceText?: (
		text: string,
		opts: { maxDurationSeconds: number; quality: 'low' | 'medium' | 'high' }
	) => Promise<Record<string, unknown>>;
	onRenderVideo: (scriptJsonText: string, opts: VideoJobOptions) => Promise<void>;
	scriptGenerating: boolean;
	videoSubmitting: boolean;
};

export function VideoProjectModal({
	open,
	onOpenChange,
	pageId,
	videoDraftId,
	scriptSource,
	articleContentJson = '',
	siteCartesiaVoiceId = null,
	standaloneSiteId = null,
	savedVideoScriptDraft,
	savedVideoRenderOptions,
	siteVideoBranding,
	onPersistVideoDraft,
	onPersistSiteVideoBranding,
	onGenerateScriptFromArticle,
	onGenerateScriptFromSourceText,
	onRenderVideo,
	scriptGenerating,
	videoSubmitting
}: VideoProjectModalProps) {
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [script, setScript] = useState<VideoScript | null>(null);
	const [scriptErr, setScriptErr] = useState<string | null>(null);
	const [draftSaveState, setDraftSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

	const [fontCatalog, setFontCatalog] = useState<VideoFontCatalog | null>(null);
	const [catalogErr, setCatalogErr] = useState<string | null>(null);
	const [branding, setBranding] = useState<VideoBranding>(() =>
		resolveVideoBrandingForEditor(null, siteVideoBranding, savedVideoRenderOptions)
	);

	const [planMaxDuration, setPlanMaxDuration] = useState(300);
	const [planQuality, setPlanQuality] = useState<'low' | 'medium' | 'high'>('medium');
	const [standaloneSourceText, setStandaloneSourceText] = useState('');
	const standaloneSourceTextRef = useRef('');
	standaloneSourceTextRef.current = standaloneSourceText;
	const scriptSourceRef = useRef(scriptSource);
	scriptSourceRef.current = scriptSource;

	const [renderQuality, setRenderQuality] = useState<'low' | 'medium' | 'high'>('medium');
	const [includeCaptions, setIncludeCaptions] = useState(true);

	const [cartesiaVoiceId, setCartesiaVoiceId] = useState('');

	const prevOpenRef = useRef(false);
	const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const scriptRef = useRef<VideoScript | null>(null);
	const brandingRef = useRef<VideoBranding>(branding);
	const cartesiaVoiceIdRef = useRef('');
	scriptRef.current = script;
	brandingRef.current = branding;
	cartesiaVoiceIdRef.current = cartesiaVoiceId;

	const canPersistLocation = Boolean(
		onPersistVideoDraft &&
			(pageId || videoDraftId || (scriptSource === 'standalone' && Boolean(standaloneSiteId)))
	);

	const schedulePersist = useCallback(
		(partial: VideoDraftPersistPartial) => {
			if (!canPersistLocation || !onPersistVideoDraft) return;
			if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
			setDraftSaveState('saving');
			persistTimerRef.current = setTimeout(() => {
				persistTimerRef.current = null;
				void (async () => {
					try {
						await onPersistVideoDraft(partial);
						setDraftSaveState('saved');
						window.setTimeout(() => setDraftSaveState('idle'), 2000);
					} catch {
						setDraftSaveState('idle');
					}
				})();
			}, 900);
		},
		[canPersistLocation, onPersistVideoDraft]
	);

	/** Avoid effect dependency loops: parent `onPersistVideoDraft` may change after each save. */
	const schedulePersistRef = useRef(schedulePersist);
	schedulePersistRef.current = schedulePersist;

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		setCatalogErr(null);
		void (async () => {
			try {
				const cat = await fetchVideoFontCatalog();
				if (!cancelled) setFontCatalog(cat);
			} catch (e) {
				if (!cancelled) {
					setCatalogErr(e instanceof Error ? e.message : 'Could not load font list');
					setFontCatalog(null);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [open]);

	useEffect(() => {
		if (!open) {
			prevOpenRef.current = false;
			if (persistTimerRef.current && canPersistLocation && onPersistVideoDraft) {
				clearTimeout(persistTimerRef.current);
				persistTimerRef.current = null;
				const s = scriptRef.current;
				const b = brandingRef.current;
				const cv = cartesiaVoiceIdRef.current;
				void onPersistVideoDraft({
					...(s ? { script: s } : {}),
					...(b ? { branding: b } : {}),
					cartesiaVoiceId: cv,
					...(scriptSourceRef.current === 'standalone'
						? { manualScriptSource: standaloneSourceTextRef.current }
						: {})
				});
			} else if (persistTimerRef.current) {
				clearTimeout(persistTimerRef.current);
				persistTimerRef.current = null;
			}
			return;
		}

		const justOpened = !prevOpenRef.current;
		prevOpenRef.current = true;
		if (!justOpened) return;

		setScriptErr(null);
		setPlanMaxDuration(300);
		setPlanQuality('medium');
		setRenderQuality('medium');
		setIncludeCaptions(true);
		setDraftSaveState('idle');

		const ro: VideoDraftRenderOptions | null =
			savedVideoRenderOptions && typeof savedVideoRenderOptions === 'object'
				? (savedVideoRenderOptions as VideoDraftRenderOptions)
				: null;

		if (scriptSource === 'standalone' && standaloneSiteId) {
			const fromDb = typeof ro?.manual_script_source === 'string' ? ro.manual_script_source : '';
			let initial = fromDb;
			if (!initial && typeof sessionStorage !== 'undefined') {
				try {
					initial = sessionStorage.getItem(`sharkly.manualVideoSource.${standaloneSiteId}`) ?? '';
				} catch {
					/* ignore */
				}
			}
			setStandaloneSourceText(initial);
		} else {
			setStandaloneSourceText('');
		}

		const draftVoice = typeof ro?.cartesia_voice_id === 'string' ? ro.cartesia_voice_id.trim() : '';
		const siteV = typeof siteCartesiaVoiceId === 'string' ? siteCartesiaVoiceId.trim() : '';
		const voiceInit = draftVoice || siteV;
		setCartesiaVoiceId(voiceInit);

		const parsed = parseVideoScript(savedVideoScriptDraft);
		const resolved = resolveVideoBrandingForEditor(
			null,
			siteVideoBranding,
			savedVideoRenderOptions
		);
		setBranding(resolved);

		if (parsed) {
			setScript(parsed);
			setPlanMaxDuration(Math.min(600, Math.max(60, parsed.estimated_duration_seconds)));
			// Placeholder script = still on branding / script-creation path, not review & render.
			setStep(isPlaceholderVideoScript(parsed) ? 2 : 3);
		} else {
			setStep(1);
			setScript(null);
		}
	}, [
		open,
		scriptSource,
		standaloneSiteId,
		savedVideoScriptDraft,
		savedVideoRenderOptions,
		siteVideoBranding,
		siteCartesiaVoiceId,
		canPersistLocation,
		onPersistVideoDraft
	]);

	/** Autosave manual script source (DB when the video row exists; sessionStorage while pending). */
	useEffect(() => {
		if (!open || scriptSource !== 'standalone' || !standaloneSiteId || step === 3) return;
		const t = window.setTimeout(() => {
			if (videoDraftId) {
				schedulePersistRef.current({ manualScriptSource: standaloneSourceText });
			} else {
				// Avoid writing "" on the first effect pass before hydrate restores text from DB/session.
				if (standaloneSourceText.length === 0) return;
				try {
					sessionStorage.setItem(
						`sharkly.manualVideoSource.${standaloneSiteId}`,
						standaloneSourceText
					);
				} catch {
					/* ignore */
				}
			}
		}, 800);
		return () => window.clearTimeout(t);
	}, [standaloneSourceText, open, scriptSource, standaloneSiteId, videoDraftId, step]);

	/** After branding + voice (step 2), creating a script jumps to the script editor (step 3). */
	const goToScriptReviewWithScript = useCallback(
		(next: VideoScript) => {
			// Commit step + script synchronously so the dialog advances to "Review & render" as soon as
			// generation finishes (avoids staying on step 2 while parent state / async persist updates).
			flushSync(() => {
				setScript(next);
				setPlanMaxDuration(Math.min(600, Math.max(60, next.estimated_duration_seconds)));
				setStep(3);
			});
			if (onPersistVideoDraft || onPersistSiteVideoBranding) {
				setDraftSaveState('saving');
				void (async () => {
					try {
						if (onPersistSiteVideoBranding) {
							await onPersistSiteVideoBranding(brandingRef.current);
						}
						if (onPersistVideoDraft) {
							await onPersistVideoDraft({
								script: next,
								branding: brandingRef.current,
								cartesiaVoiceId: cartesiaVoiceIdRef.current,
								...(scriptSource === 'standalone'
									? { manualScriptSource: standaloneSourceTextRef.current }
									: {})
							});
						}
						setDraftSaveState('saved');
						window.setTimeout(() => setDraftSaveState('idle'), 2000);
					} catch {
						setDraftSaveState('idle');
					}
				})();
			}
		},
		[onPersistVideoDraft, onPersistSiteVideoBranding, scriptSource]
	);

	const handleGenerateScriptFromArticle = async () => {
		if (!onGenerateScriptFromArticle) return;
		setScriptErr(null);
		const capped = Math.min(600, Math.max(60, Math.round(planMaxDuration)));
		try {
			const raw = await onGenerateScriptFromArticle({
				maxDurationSeconds: capped,
				quality: planQuality
			});
			const parsed = parseVideoScript(raw);
			if (!parsed) {
				setScriptErr('The generated script was not in the expected format. Try again.');
				return;
			}
			goToScriptReviewWithScript(parsed);
		} catch (e) {
			setScriptErr(e instanceof Error ? e.message : 'Script generation failed');
		}
	};

	const handleGenerateScriptFromStandaloneText = async () => {
		if (!onGenerateScriptFromSourceText) return;
		setScriptErr(null);
		if (!standaloneSourceText.trim()) {
			setScriptErr('Add some source text or talking points for the AI to work from.');
			return;
		}
		const capped = Math.min(600, Math.max(60, Math.round(planMaxDuration)));
		try {
			const raw = await onGenerateScriptFromSourceText(standaloneSourceText, {
				maxDurationSeconds: capped,
				quality: planQuality
			});
			const parsed = parseVideoScript(raw);
			if (!parsed) {
				setScriptErr('The generated script was not in the expected format. Try again.');
				return;
			}
			goToScriptReviewWithScript(parsed);
		} catch (e) {
			setScriptErr(e instanceof Error ? e.message : 'Script generation failed');
		}
	};

	const handleStartBlankScript = () => {
		setScriptErr(null);
		const blank = emptyVideoScript();
		goToScriptReviewWithScript(blank);
	};

	const handleRenderVideo = async () => {
		setScriptErr(null);
		if (!script) {
			setScriptErr('No script to render.');
			return;
		}
		const reparsed = parseVideoScript(script);
		if (!reparsed) {
			setScriptErr('Script is incomplete or invalid. Check title, narration, and scenes.');
			return;
		}
		const capped = Math.min(600, Math.max(60, Math.round(reparsed.estimated_duration_seconds)));
		const bo = brandingToJobOverride(fontCatalog, branding);
		await onRenderVideo(videoScriptToJsonText(reparsed), {
			quality: renderQuality,
			maxDurationSeconds: capped,
			includeCaptions,
			brandOverride: {
				colors: bo.colors,
				fonts: bo.fonts
			}
		});
	};

	const updateScript = (next: VideoScript) => {
		setScript(next);
		schedulePersist({ script: next });
	};

	const updateBrandingColors = (key: keyof VideoBranding['colors'], hex: string) => {
		setBranding((prev) => {
			const next = { ...prev, colors: { ...prev.colors, [key]: hex } };
			schedulePersist({ branding: next });
			return next;
		});
	};

	const setHeadingFontId = (id: string) => {
		setBranding((prev) => {
			const next = { ...prev, headingFontId: id };
			schedulePersist({ branding: next });
			return next;
		});
	};

	const setBodyFontId = (id: string) => {
		setBranding((prev) => {
			const next = { ...prev, bodyFontId: id };
			schedulePersist({ branding: next });
			return next;
		});
	};

	const setNarrationVoiceId = (id: string) => {
		setCartesiaVoiceId(id);
		schedulePersist({ cartesiaVoiceId: id });
	};

	const busy = scriptGenerating || videoSubmitting;
	const savingContinue = draftSaveState === 'saving';
	const fontList = fontCatalog?.fonts ?? [];

	const handleContinueToBranding = async () => {
		if (busy || savingContinue) return;
		if (scriptSource === 'standalone' && !standaloneSourceText.trim()) {
			setScriptErr('Add source text or outline to continue.');
			return;
		}
		setScriptErr(null);
		if (!canPersistLocation || !onPersistVideoDraft) {
			setStep(2);
			return;
		}
		setDraftSaveState('saving');
		try {
			if (onPersistSiteVideoBranding) {
				await onPersistSiteVideoBranding(brandingRef.current);
			}
			await onPersistVideoDraft({
				script: emptyVideoScript(),
				branding: brandingRef.current,
				cartesiaVoiceId: cartesiaVoiceIdRef.current,
				...(scriptSource === 'standalone' ? { manualScriptSource: standaloneSourceText } : {})
			});
			if (
				scriptSource === 'standalone' &&
				standaloneSiteId &&
				typeof sessionStorage !== 'undefined'
			) {
				try {
					sessionStorage.removeItem(`sharkly.manualVideoSource.${standaloneSiteId}`);
				} catch {
					/* ignore */
				}
			}
			setDraftSaveState('saved');
			window.setTimeout(() => setDraftSaveState('idle'), 2000);
		} catch {
			setDraftSaveState('idle');
			return;
		}
		setStep(2);
	};

	const dialogSize =
		step === 3
			? 'flex min-h-[min(90vh,880px)] max-h-[92vh] max-w-3xl flex-col gap-0 overflow-hidden sm:max-w-3xl'
			: step === 2
				? 'flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden sm:max-w-3xl'
				: 'flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden sm:max-w-lg';

	const step1Title =
		scriptSource === 'standalone' ? 'Step 1 — Source & planning' : 'Step 1 — Planning';

	const step1Description =
		scriptSource === 'standalone' ? (
			<>
				Paste notes or an outline for the next step, and set duration and planning quality. Then
				you&apos;ll choose branding and voice, and create your structured script (AI or blank).
			</>
		) : (
			<>
				Set duration and planning quality for the script pass. Next you&apos;ll choose branding and
				voice, then generate from your article or start blank. Credits for each step are shown on
				the buttons. Refunds apply if that step fails on our side.
			</>
		);

	const draftSavedLine =
		draftSaveState === 'saving' ? (
			<p className="text-xs">Saving draft…</p>
		) : draftSaveState === 'saved' ? (
			<p className="text-xs text-green-600 dark:text-green-400">
				{pageId ? 'Draft saved to this page.' : 'Draft saved.'}
			</p>
		) : null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={dialogSize}>
				<DialogHeader>
					<DialogTitle>
						{step === 1
							? step1Title
							: step === 2
								? 'Step 2 — Branding & script'
								: 'Step 3 — Review & render'}
					</DialogTitle>
					<DialogDescription>
						{step === 1 ? (
							step1Description
						) : step === 2 ? (
							<>
								Choose fonts, colors, and narration voice, then create your structured script from
								the article or source text (AI) or start blank. Script generation credits are on the
								buttons.
							</>
						) : (
							<>
								Use the Details, Narration, and Scenes tabs to refine your video. Your draft saves
								automatically. Then render the MP4. Refunds apply if the render job cannot be
								started.
							</>
						)}
					</DialogDescription>
				</DialogHeader>

				{step === 1 && scriptSource === 'standalone' ? (
					<div className="grid max-h-[min(52vh,480px)] gap-4 overflow-y-auto py-2">
						<div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
							<span>Script generation:</span>
							<CreditCost amount={CREDIT_COSTS.VIDEO_SCRIPT_GENERATION} />
							<span>credits</span>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="video-standalone-source">Source text or outline</Label>
							<textarea
								id="video-standalone-source"
								value={standaloneSourceText}
								onChange={(e) => setStandaloneSourceText(e.target.value)}
								rows={8}
								className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[140px] w-full resize-y rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
								placeholder="Paste talking points, a blog draft, or bullet notes…"
							/>
						</div>
						<PlanDurationInputs
							idPrefix="video-plan-max-s"
							valueSeconds={planMaxDuration}
							onChangeSeconds={setPlanMaxDuration}
						/>
						<div className="grid gap-2">
							<Label htmlFor="video-plan-quality-s">Planning quality</Label>
							<Select
								value={planQuality}
								onValueChange={(v) => setPlanQuality(v as 'low' | 'medium' | 'high')}
							>
								<SelectTrigger id="video-plan-quality-s">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="low">Low (shorter / simpler)</SelectItem>
									<SelectItem value="medium">Medium</SelectItem>
									<SelectItem value="high">High (richer script)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				) : null}

				{step === 1 && scriptSource === 'article' ? (
					<div className="grid gap-4 overflow-y-auto py-2">
						<div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
							<span>Total for this flow:</span>
							<CreditCost amount={CREDIT_COSTS.VIDEO_GENERATION} />
							<span>credits</span>
						</div>
						<PlanDurationInputs
							idPrefix="video-plan-max"
							valueSeconds={planMaxDuration}
							onChangeSeconds={setPlanMaxDuration}
							helperText="Guides how long the script should run."
						/>
						<div className="grid gap-2">
							<Label htmlFor="video-plan-quality">Planning quality</Label>
							<Select
								value={planQuality}
								onValueChange={(v) => setPlanQuality(v as 'low' | 'medium' | 'high')}
							>
								<SelectTrigger id="video-plan-quality">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="low">Low (shorter / simpler)</SelectItem>
									<SelectItem value="medium">Medium</SelectItem>
									<SelectItem value="high">High (richer script)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				) : null}

				{step === 2 ? (
					<div className="grid max-h-[min(72vh,640px)] gap-5 overflow-y-auto py-2">
						{catalogErr ? (
							<p className="text-error-600 dark:text-error-400 text-sm">{catalogErr}</p>
						) : null}
						<div className="grid gap-2 sm:grid-cols-2">
							<div className="grid gap-2">
								<Label>Heading font</Label>
								<Select value={branding.headingFontId} onValueChange={setHeadingFontId}>
									<SelectTrigger>
										<SelectValue placeholder="Select font" />
									</SelectTrigger>
									<SelectContent>
										{fontList.map((f) => (
											<SelectItem key={f.id} value={f.id}>
												{f.label}
												{f.category ? ` · ${f.category}` : ''}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-2">
								<Label>Body font</Label>
								<Select value={branding.bodyFontId} onValueChange={setBodyFontId}>
									<SelectTrigger>
										<SelectValue placeholder="Select font" />
									</SelectTrigger>
									<SelectContent>
										{fontList.map((f) => (
											<SelectItem key={`b-${f.id}`} value={f.id}>
												{f.label}
												{f.category ? ` · ${f.category}` : ''}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="grid gap-3">
							<Label>Colors</Label>
							{(
								[
									['background', 'Background'],
									['primary_text', 'Primary text'],
									['accent', 'Accent'],
									['gold', 'Gold'],
									['muted', 'Muted']
								] as const
							).map(([key, label]) => (
								<div key={key} className="flex flex-wrap items-center gap-3">
									<span className="text-muted-foreground w-28 shrink-0 text-sm">{label}</span>
									<input
										type="color"
										value={branding.colors[key]}
										onChange={(e) => updateBrandingColors(key, e.target.value)}
										className="h-9 w-14 cursor-pointer rounded border border-gray-200 bg-white p-0.5 dark:border-gray-700"
										aria-label={label}
									/>
									<input
										type="text"
										value={branding.colors[key]}
										onChange={(e) => {
											const v = e.target.value.trim();
											if (/^#[0-9A-Fa-f]{6}$/.test(v)) updateBrandingColors(key, v);
										}}
										className="border-input bg-background flex h-9 max-w-[7.5rem] rounded-md border px-2 font-mono text-xs"
										spellCheck={false}
									/>
								</div>
							))}
						</div>

						<div className="border-t border-gray-100 pt-4 dark:border-gray-800">
							<CartesiaVideoVoicePanel
								selectedVoiceId={cartesiaVoiceId}
								onSelectedVoiceIdChange={setNarrationVoiceId}
								showVoiceCloneSection={false}
							/>
							<p className="text-muted-foreground mt-2 text-[11px]">
								This choice is stored on this video draft. Site-wide default is in{' '}
								<span className="font-medium">Site → Video</span>.
							</p>
						</div>
					</div>
				) : null}

				{step === 3 && script ? (
					<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden py-2">
						<div className="text-muted-foreground flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
							{draftSavedLine}
							<VideoScriptEditor value={script} onChange={updateScript} />
						</div>
						<div className="grid shrink-0 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
							<Label htmlFor="video-render-quality">Render quality</Label>
							<Select
								value={renderQuality}
								onValueChange={(v) => setRenderQuality(v as 'low' | 'medium' | 'high')}
							>
								<SelectTrigger id="video-render-quality">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="low">Low (faster)</SelectItem>
									<SelectItem value="medium">Medium</SelectItem>
									<SelectItem value="high">High (slower)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				) : null}

				{step === 3 && !script ? (
					<p className="text-muted-foreground py-4 text-sm">No script loaded.</p>
				) : null}

				{scriptErr ? (
					<p className="text-error-600 dark:text-error-400 text-sm">{scriptErr}</p>
				) : null}

				<DialogFooter className="mt-2 shrink-0 flex-wrap gap-2 sm:justify-between">
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={busy}
						>
							Cancel
						</Button>
						{step === 1 ? (
							<Button
								type="button"
								variant="outline"
								onClick={() => void handleContinueToBranding()}
								disabled={busy || savingContinue}
							>
								{savingContinue ? 'Saving draft…' : 'Continue to branding'}
							</Button>
						) : null}
						{step === 2 ? (
							<Button type="button" variant="outline" onClick={() => setStep(1)} disabled={busy}>
								Back
							</Button>
						) : null}
						{step === 3 ? (
							<Button type="button" variant="outline" onClick={() => setStep(2)} disabled={busy}>
								Back to branding
							</Button>
						) : null}
					</div>
					<div className="flex flex-col items-end gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
						{step === 2 && scriptSource === 'article' ? (
							<>
								<Button
									type="button"
									variant="secondary"
									onClick={() => handleStartBlankScript()}
									disabled={busy}
								>
									Start with blank script
								</Button>
								<Button
									type="button"
									className="bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-1.5 text-white"
									onClick={() => void handleGenerateScriptFromArticle()}
									disabled={busy || !onGenerateScriptFromArticle || !articleContentJson.trim()}
								>
									{scriptGenerating ? (
										'Generating script…'
									) : (
										<>
											{script ? 'Regenerate script from article' : 'Generate script from article'} —{' '}
											<CreditCost amount={CREDIT_COSTS.VIDEO_SCRIPT_GENERATION} />
										</>
									)}
								</Button>
							</>
						) : null}
						{step === 2 && scriptSource === 'standalone' ? (
							<>
								<Button
									type="button"
									variant="secondary"
									onClick={() => handleStartBlankScript()}
									disabled={busy}
								>
									Start with blank script
								</Button>
								<Button
									type="button"
									className="bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-1.5 text-white"
									onClick={() => void handleGenerateScriptFromStandaloneText()}
									disabled={busy || !onGenerateScriptFromSourceText}
								>
									{scriptGenerating ? (
										'Generating script…'
									) : (
										<>
											Generate script with AI —{' '}
											<CreditCost amount={CREDIT_COSTS.VIDEO_SCRIPT_GENERATION} />
										</>
									)}
								</Button>
							</>
						) : null}
						{step === 3 ? (
							<Button
								type="button"
								className="bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-1.5 text-white"
								onClick={() => void handleRenderVideo()}
								disabled={busy || !script}
							>
								{videoSubmitting ? (
									'Starting video…'
								) : (
									<>
										Generate video — <CreditCost amount={CREDIT_COSTS.VIDEO_RENDER} />
									</>
								)}
							</Button>
						) : null}
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

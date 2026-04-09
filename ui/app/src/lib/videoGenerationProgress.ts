import type { TaskStep } from '../components/shared/TaskProgressWidget';

const DEFS: Array<{ id: string; label: string; subtitle: string }> = [
	{ id: '1', label: 'Queued', subtitle: 'Waiting for the video worker' },
	{
		id: '2',
		label: 'Script & storyboard',
		subtitle: 'Turning your article into a scene plan (Claude)'
	},
	{ id: '3', label: 'Narration audio', subtitle: 'Text-to-speech with your site voice' },
	{ id: '4', label: 'Render scenes', subtitle: 'Rendering video' },
	{ id: '5', label: 'Assemble video', subtitle: 'FFmpeg merge, captions if enabled' },
	{ id: '6', label: 'Upload & link', subtitle: 'Saving to storage and signing download URL' }
];

const STEP_ORDER: Record<string, number> = {
	generating_script: 1,
	generating_audio: 2,
	rendering_scenes: 3,
	assembling: 4,
	uploading: 5
};

/** Active step index 0..5 while running; 6 = all done. */
function activeIndex(status: string, currentStep: string | null): number {
	if (status === 'complete') return DEFS.length;
	if (status === 'queued') return 0;
	if (status === 'processing') {
		if (!currentStep) return 0;
		const n = STEP_ORDER[currentStep];
		return n !== undefined ? n : 0;
	}
	return 0;
}

/** When status=failed, current_step is often null — use coarse progress from the worker. */
function failedStepIndex(progress: number): number {
	if (progress >= 88) return 5;
	if (progress >= 72) return 4;
	if (progress >= 42) return 3;
	if (progress >= 30) return 2;
	if (progress >= 15) return 1;
	return 0;
}

/** Map Redis job fields to TaskProgressWidget steps (synced from poll). */
export function videoJobToTaskSteps(
	status: string,
	currentStep: string | null,
	progress: number
): TaskStep[] {
	if (status === 'complete') {
		return DEFS.map((d) => ({ ...d, status: 'complete' as const }));
	}

	const idx = status === 'failed' ? failedStepIndex(progress) : activeIndex(status, currentStep);

	return DEFS.map((d, i) => {
		const st: TaskStep['status'] = i < idx ? 'complete' : i === idx ? 'active' : 'pending';
		return { id: d.id, label: d.label, subtitle: d.subtitle, status: st };
	});
}

export function initialVideoGenTaskSteps(): TaskStep[] {
	return DEFS.map((d, i) => ({
		id: d.id,
		label: d.label,
		subtitle: d.subtitle,
		status: (i === 0 ? 'active' : 'pending') as TaskStep['status']
	}));
}

/** Scripted steps for sync Claude generate-script (no streaming) — auto-advance keeps the UI alive. */
const SCRIPT_GEN_DEFS: Array<{ id: string; label: string }> = [
	{ id: 'sg1', label: 'Sending your content to the model' },
	{ id: 'sg2', label: 'Planning scenes, pacing, and structure' },
	{ id: 'sg3', label: 'Writing narration and scene JSON' },
	{ id: 'sg4', label: 'Validating script shape for video render' }
];

export function initialScriptGenTaskSteps(): TaskStep[] {
	return SCRIPT_GEN_DEFS.map((d, i) => ({
		id: d.id,
		label: d.label,
		status: (i === 0 ? 'active' : 'pending') as TaskStep['status']
	}));
}

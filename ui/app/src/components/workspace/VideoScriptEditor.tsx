import { useEffect, useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import TextArea from '../form/input/TextArea';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '../ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { type VideoScene, type VideoScript, VIDEO_SCENE_TYPES } from '../../types/videoScript';
import {
	ACCENT_COLORS,
	TRANSITIONS,
	animationsForSceneType,
	coerceAnimationStyle
} from '../../types/videoSceneAnimations';
import { SceneContentForm } from './SceneContentForm';

/** Stable option order for selects (Sets from videoSceneAnimations). */
const TRANSITION_OPTIONS = [...TRANSITIONS].sort();
const ACCENT_COLOR_OPTIONS = [...ACCENT_COLORS].sort();

function updateScene(
	script: VideoScript,
	index: number,
	partial: Partial<VideoScene>
): VideoScript {
	const scenes = [...script.scenes];
	const prev = scenes[index];
	if (!prev) return script;
	let nextScene: VideoScene = { ...prev, ...partial };
	if (partial.type !== undefined && partial.type !== prev.type) {
		const nextAnim = coerceAnimationStyle(partial.type, prev.animation_style);
		nextScene = { ...nextScene, type: partial.type, animation_style: nextAnim };
	}
	scenes[index] = nextScene;
	return { ...script, scenes };
}

function removeScene(script: VideoScript, index: number): VideoScript {
	if (script.scenes.length <= 1) return script;
	return { ...script, scenes: script.scenes.filter((_, i) => i !== index) };
}

function addScene(script: VideoScript): VideoScript {
	const n = script.scenes.length + 1;
	const scene_id = `scene_${String(n).padStart(2, '0')}`;
	return {
		...script,
		scenes: [
			...script.scenes,
			{
				scene_id,
				type: 'text_reveal',
				duration_seconds: 6,
				narration_segment: '',
				animation_style: 'fade_in',
				transition_in: 'fade',
				accent_color: 'accent',
				content: { body: '' }
			}
		]
	};
}

function SceneContentJsonField({
	content,
	onCommit
}: {
	content: VideoScene['content'];
	onCommit: (c: VideoScene['content']) => void;
}) {
	const [text, setText] = useState(() => JSON.stringify(content, null, 2));
	const [err, setErr] = useState<string | null>(null);

	useEffect(() => {
		setText(JSON.stringify(content, null, 2));
		setErr(null);
	}, [content]);

	return (
		<div className="grid gap-1.5">
			<Label>Slide content (JSON)</Label>
			<TextArea
				className={`font-mono text-xs leading-relaxed ${err ? 'border-error-500' : ''}`}
				rows={8}
				value={text}
				onChange={(e) => {
					const v = e.target.value;
					setText(v);
					try {
						const parsed = JSON.parse(v) as unknown;
						if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
							setErr(null);
							onCommit(parsed as VideoScene['content']);
						} else {
							setErr('Content must be a JSON object.');
						}
					} catch {
						setErr('Invalid JSON — fix to save.');
					}
				}}
			/>
			{err ? (
				<p className="text-error-600 dark:text-error-400 text-[11px]">{err}</p>
			) : (
				<p className="text-muted-foreground text-[11px]">
					Heading, bullets, quote, etc. Must be a JSON object.
				</p>
			)}
		</div>
	);
}

type Props = {
	value: VideoScript;
	onChange: (next: VideoScript) => void;
};

export function VideoScriptEditor({ value, onChange }: Props) {
	const setRoot = (partial: Partial<Pick<VideoScript, 'title' | 'estimated_duration_seconds' | 'narration_script'>>) => {
		onChange({ ...value, ...partial });
	};

	return (
		<Tabs defaultValue="details" className="flex min-h-0 w-full flex-1 flex-col gap-0">
			<TabsList className="bg-muted/60 text-muted-foreground grid h-auto w-full shrink-0 grid-cols-3 gap-0.5 rounded-lg p-1 sm:max-w-xl">
				<TabsTrigger value="details" className="text-xs sm:text-sm">
					Details
				</TabsTrigger>
				<TabsTrigger value="narration" className="text-xs sm:text-sm">
					Narration
				</TabsTrigger>
				<TabsTrigger value="scenes" className="text-xs sm:text-sm">
					Scenes
					<span className="text-muted-foreground ml-1 font-normal">
						({value.scenes.length})
					</span>
				</TabsTrigger>
			</TabsList>

			<TabsContent
				value="details"
				className="mt-3 flex min-h-[min(42vh,360px)] flex-1 flex-col overflow-y-auto outline-none data-[state=inactive]:hidden"
			>
				<div className="grid gap-4 rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
					<div className="grid gap-2">
						<Label htmlFor="vs-title">Video title</Label>
						<input
							id="vs-title"
							type="text"
							value={value.title}
							onChange={(e) => setRoot({ title: e.target.value })}
							className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-10 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
						/>
					</div>
					<div className="grid max-w-[260px] gap-2">
						<Label htmlFor="vs-est">Estimated duration (seconds)</Label>
						<input
							id="vs-est"
							type="number"
							min={1}
							max={86400}
							step={1}
							value={value.estimated_duration_seconds}
							onChange={(e) =>
								setRoot({ estimated_duration_seconds: Number(e.target.value) || 1 })
							}
							className="border-input bg-background ring-offset-background flex min-h-10 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
						/>
					</div>
				</div>
			</TabsContent>

			<TabsContent
				value="narration"
				className="mt-3 flex min-h-[min(52vh,480px)] flex-1 flex-col outline-none data-[state=inactive]:hidden"
			>
				<div className="flex min-h-[min(50vh,460px)] flex-1 flex-col gap-2">
					<Label htmlFor="vs-narration">Full narration (voiceover)</Label>
					<TextArea
						id="vs-narration"
						value={value.narration_script}
						onChange={(e) => setRoot({ narration_script: e.target.value })}
						className="min-h-[min(46vh,420px)] w-full flex-1 resize-y text-sm leading-relaxed"
						placeholder="Spoken script for the whole video…"
					/>
					<p className="text-muted-foreground text-xs">
						This is the full voiceover for the video. Use a separate tab for per-scene lines.
					</p>
				</div>
			</TabsContent>

			<TabsContent
				value="scenes"
				className="mt-3 flex min-h-0 flex-1 flex-col gap-2 outline-none data-[state=inactive]:hidden"
			>
				<div className="text-muted-foreground flex shrink-0 items-center justify-between text-xs font-medium tracking-wide uppercase">
					<span>Scene list</span>
					<span>
						{value.scenes.length} scene{value.scenes.length === 1 ? '' : 's'}
					</span>
				</div>
				<ScrollArea className="max-h-[min(58vh,540px)] min-h-0 flex-1 overflow-y-auto pr-2">
					<div className="flex flex-col gap-3 pb-1">
						{value.scenes.map((scene, index) => (
							<Collapsible key={`${scene.scene_id}-${index}`} defaultOpen={index < 3}>
								<div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-950/30">
									<CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between gap-2 rounded-t-lg px-3 py-2.5 text-left text-sm font-medium data-[state=open]:[&_svg]:rotate-180">
										<span className="truncate">
											Scene {index + 1}
											<span className="text-muted-foreground ml-2 font-normal">
												({scene.type.replace(/_/g, ' ')})
											</span>
										</span>
										<ChevronDown className="size-4 shrink-0 transition-transform" />
									</CollapsibleTrigger>
									<CollapsibleContent>
										<div className="space-y-3 border-t border-gray-100 px-3 py-3 dark:border-gray-800">
											<div className="grid gap-3 sm:grid-cols-2">
												<div className="grid gap-1.5">
													<Label>Scene ID</Label>
													<input
														type="text"
														value={scene.scene_id}
														onChange={(e) =>
															onChange(
																updateScene(value, index, {
																	scene_id: e.target.value
																})
															)
														}
														className="border-input bg-background flex h-9 w-full rounded-md border px-3 font-mono text-xs"
													/>
												</div>
												<div className="grid gap-1.5">
													<Label>Type</Label>
													<Select
														value={scene.type}
														onValueChange={(v) =>
															onChange(updateScene(value, index, { type: v }))
														}
													>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{VIDEO_SCENE_TYPES.map((t) => (
																<SelectItem key={t} value={t}>
																	{t.replace(/_/g, ' ')}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
												<div className="grid gap-1.5">
													<Label>Duration (seconds)</Label>
													<input
														type="number"
														min={1}
														max={600}
														value={scene.duration_seconds}
														onChange={(e) =>
															onChange(
																updateScene(value, index, {
																	duration_seconds: Number(e.target.value) || 1
																})
															)
														}
														className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
													/>
												</div>
												<div className="grid gap-1.5">
													<Label>Accent color</Label>
													<Select
														value={scene.accent_color}
														onValueChange={(v) =>
															onChange(updateScene(value, index, { accent_color: v }))
														}
													>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{ACCENT_COLOR_OPTIONS.map((c) => (
																<SelectItem key={c} value={c}>
																	{c}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											</div>
											<div className="grid gap-1.5">
												<Label>Narration for this scene</Label>
												<TextArea
													value={scene.narration_segment}
													onChange={(e) =>
														onChange(
															updateScene(value, index, {
																narration_segment: e.target.value
															})
														)
													}
													className="min-h-[100px] resize-y text-sm leading-relaxed"
													placeholder="Spoken lines for this scene…"
												/>
											</div>
											<div className="grid gap-3 sm:grid-cols-2">
												<div className="grid gap-1.5">
													<Label>Animation</Label>
													<Select
														value={scene.animation_style}
														onValueChange={(v) =>
															onChange(
																updateScene(value, index, { animation_style: v })
															)
														}
													>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{animationsForSceneType(scene.type).map((a) => (
																<SelectItem key={a} value={a}>
																	{a}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
												<div className="grid gap-1.5">
													<Label>Transition in</Label>
													<Select
														value={scene.transition_in}
														onValueChange={(v) =>
															onChange(
																updateScene(value, index, { transition_in: v })
															)
														}
													>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{TRANSITION_OPTIONS.map((t) => (
																<SelectItem key={t} value={t}>
																	{t}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											</div>
											<div className="grid gap-2">
												<Label className="text-foreground">Slide visuals</Label>
												<Tabs defaultValue="visual" className="w-full">
													<TabsList className="grid h-9 w-full max-w-xs grid-cols-2">
														<TabsTrigger value="visual" className="text-xs">
															Form
														</TabsTrigger>
														<TabsTrigger value="json" className="text-xs">
															Advanced (JSON)
														</TabsTrigger>
													</TabsList>
													<TabsContent value="visual" className="mt-2">
														<SceneContentForm
															scene={scene}
															onChange={(content) =>
																onChange(updateScene(value, index, { content }))
															}
														/>
														{scene.type === 'bullet_points' ? (
															<div className="mt-3 grid gap-1.5">
																<Label className="text-muted-foreground text-xs font-normal">
																	Emphasize bullets (indices, comma-separated; 0 = first)
																</Label>
																<input
																	type="text"
																	className="border-input bg-background flex h-9 w-full max-w-md rounded-md border px-3 font-mono text-xs"
																	placeholder="e.g. 0, 2"
																	value={(scene.emphasis_indices ?? []).join(', ')}
																	onChange={(e) => {
																		const raw = e.target.value;
																		const nums = raw
																			.split(/[,\s]+/)
																			.map((s) => parseInt(s.trim(), 10))
																			.filter((n) => Number.isFinite(n) && n >= 0);
																		onChange(
																			updateScene(value, index, {
																				emphasis_indices:
																					nums.length > 0 ? nums : undefined
																			})
																		);
																	}}
																/>
															</div>
														) : null}
													</TabsContent>
													<TabsContent value="json" className="mt-2">
														<SceneContentJsonField
															content={scene.content}
															onCommit={(content) =>
																onChange(updateScene(value, index, { content }))
															}
														/>
													</TabsContent>
												</Tabs>
											</div>
											<div className="flex justify-end border-t border-gray-100 pt-2 dark:border-gray-800">
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="text-error-600 dark:text-error-400"
													disabled={value.scenes.length <= 1}
													onClick={() => onChange(removeScene(value, index))}
												>
													<Trash2 className="mr-1 size-3.5" />
													Remove scene
												</Button>
											</div>
										</div>
									</CollapsibleContent>
								</div>
							</Collapsible>
						))}
					</div>
				</ScrollArea>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-1 shrink-0 self-start"
					onClick={() => onChange(addScene(value))}
				>
					<Plus className="mr-1 size-3.5" />
					Add scene
				</Button>
			</TabsContent>
		</Tabs>
	);
}

/** Export script as JSON string for the render API (validated server-side). */
export function videoScriptToJsonText(script: VideoScript): string {
	return JSON.stringify(script);
}

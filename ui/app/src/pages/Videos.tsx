import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Film, Pencil, Plus, Trash2, ExternalLink } from 'lucide-react';
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '../components/ui/alert-dialog';
import {
	VideoProjectModal,
	type VideoDraftPersistPartial
} from '../components/workspace/VideoProjectModal';
import { TaskProgressWidget, type TaskStatus } from '../components/shared/TaskProgressWidget';
import type { TaskStep } from '../components/shared/TaskProgressWidget';
import { useSiteContext } from '../contexts/SiteContext';
import { useOrganization } from '../hooks/useOrganization';
import { supabase } from '../utils/supabaseClient';
import { createVideoJob, generateVideoScript, waitForVideo } from '../api/video';
import type { VideoJobOptions } from '../api/video';
import { CREDIT_COSTS } from '../lib/credits';
import {
	initialScriptGenTaskSteps,
	initialVideoGenTaskSteps,
	videoJobToTaskSteps
} from '../lib/videoGenerationProgress';
import type { VideoBranding } from '../types/videoBranding';
import type { VideoDraftRenderOptions } from '../types/videoBranding';

type VideoRow = {
	id: string;
	page_id: string | null;
	site_id: string;
	status: string;
	title: string | null;
	output_url: string | null;
	script_json: unknown | null;
	render_options: unknown | null;
	updated_at: string;
	created_at: string;
	error_message: string | null;
};

/** Local-only draft before the first Supabase insert (deferred create — no failed “New video” request). */
type PendingVideoDraft = Omit<VideoRow, 'id'> & { id: null };

function isStandaloneVideosMigrationError(err: unknown): boolean {
	const msg = err instanceof Error ? err.message : String(err);
	return /page_id|null value|not-null|23502|violates not-null/i.test(msg);
}

/** First non-empty line of manual source, trimmed for list title (placeholder script is still "Untitled"). */
function titleFromManualScriptSource(raw: string | undefined | null): string | null {
	if (!raw || typeof raw !== 'string') return null;
	const line = raw
		.trim()
		.split(/\r?\n/)
		.find((l) => l.trim())?.trim();
	if (!line) return null;
	return line.length > 120 ? `${line.slice(0, 117)}…` : line;
}

export default function Videos() {
	const { selectedSite, loading: siteLoading, refetchSites } = useSiteContext();
	const { organization, refetch: refetchOrg } = useOrganization();
	const creditsRemaining =
		organization?.included_credits_remaining ?? organization?.included_credits ?? 0;

	const [rows, setRows] = useState<VideoRow[]>([]);
	const [listLoading, setListLoading] = useState(true);
	const [listErr, setListErr] = useState<string | null>(null);

	const [projectOpen, setProjectOpen] = useState(false);
	const [activeVideo, setActiveVideo] = useState<VideoRow | PendingVideoDraft | null>(null);
	const activeVideoRef = useRef(activeVideo);
	activeVideoRef.current = activeVideo;

	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	const [scriptGenSubmitting, setScriptGenSubmitting] = useState(false);
	const [videoJobSubmitting, setVideoJobSubmitting] = useState(false);
	const [videoGenWidgetOpen, setVideoGenWidgetOpen] = useState(false);
	const [videoGenWidgetStatus, setVideoGenWidgetStatus] = useState<TaskStatus>('running');
	const [videoGenWidgetSteps, setVideoGenWidgetSteps] = useState<TaskStep[]>([]);
	const [videoGenWidgetError, setVideoGenWidgetError] = useState<string | undefined>();
	const [videoGenWidgetErrorDetail, setVideoGenWidgetErrorDetail] = useState<string | undefined>();
	const [videoGenDoneUrl, setVideoGenDoneUrl] = useState<string | null>(null);

	const [scriptGenWidgetOpen, setScriptGenWidgetOpen] = useState(false);
	const [scriptGenWidgetStatus, setScriptGenWidgetStatus] = useState<TaskStatus>('running');
	const [scriptGenWidgetSteps, setScriptGenWidgetSteps] = useState<TaskStep[]>([]);
	const [scriptGenWidgetError, setScriptGenWidgetError] = useState<string | undefined>();
	const [scriptGenWidgetErrorDetail, setScriptGenWidgetErrorDetail] = useState<string | undefined>();

	const siteId = selectedSite?.id;
	/** Bumps so each "New video" gets a fresh modal mount (avoids stale step state when id is still null). */
	const newVideoMountSeq = useRef(0);
	/** Stable React key for the project modal: must not switch from `new-…` to row id when the draft is first inserted or remount resets step (e.g. to 3 on placeholder script). */
	const [videoModalKey, setVideoModalKey] = useState<string | null>(null);

	const loadVideos = useCallback(async () => {
		if (!siteId) {
			setRows([]);
			setListLoading(false);
			return;
		}
		setListLoading(true);
		setListErr(null);
		const { data, error } = await supabase
			.from('videos')
			.select(
				'id, page_id, site_id, status, title, output_url, script_json, render_options, updated_at, created_at, error_message'
			)
			.eq('site_id', siteId)
			.order('updated_at', { ascending: false });
		if (error) {
			console.error('[Videos]', error);
			setListErr(error.message);
			setRows([]);
		} else {
			setRows((data ?? []) as VideoRow[]);
		}
		setListLoading(false);
	}, [siteId]);

	useEffect(() => {
		void loadVideos();
	}, [loadVideos]);

	const handleNewVideo = () => {
		if (!siteId) return;
		if (typeof sessionStorage !== 'undefined') {
			try {
				sessionStorage.removeItem(`sharkly.manualVideoSource.${siteId}`);
			} catch {
				/* ignore */
			}
		}
		newVideoMountSeq.current += 1;
		setVideoModalKey(`new-${siteId}-${newVideoMountSeq.current}`);
		const now = new Date().toISOString();
		setActiveVideo({
			id: null,
			site_id: siteId,
			page_id: null,
			status: 'draft',
			title: 'Untitled video',
			script_json: null,
			render_options: null,
			output_url: null,
			error_message: null,
			updated_at: now,
			created_at: now
		});
		setProjectOpen(true);
	};

	const openEdit = (row: VideoRow) => {
		setVideoModalKey(row.id);
		setActiveVideo(row);
		setProjectOpen(true);
	};

	const persistVideoDraft = useCallback(
		async (partial: VideoDraftPersistPartial) => {
			const av = activeVideoRef.current;
			if (!av || !siteId) return;

			const prevOpts: VideoDraftRenderOptions =
				av.render_options && typeof av.render_options === 'object'
					? (av.render_options as VideoDraftRenderOptions)
					: {};
			const render_options: VideoDraftRenderOptions = {
				...prevOpts,
				...(partial.branding ? { branding: partial.branding } : {})
			};
			if (partial.cartesiaVoiceId !== undefined) {
				const t = partial.cartesiaVoiceId.trim();
				render_options.cartesia_voice_id = t.length > 0 ? t : null;
			}
			if (partial.manualScriptSource !== undefined) {
				const t = partial.manualScriptSource.trim();
				render_options.manual_script_source = t.length > 0 ? t : null;
			}
			let scriptTitle =
				partial.script && typeof partial.script.title === 'string' && partial.script.title.trim()
					? partial.script.title.trim()
					: (av.title ?? 'Untitled video');
			if (!av.id && scriptTitle === 'Untitled video') {
				const fromManual = titleFromManualScriptSource(partial.manualScriptSource);
				if (fromManual) scriptTitle = fromManual;
			}
			const now = new Date().toISOString();

			/** First save: create the row only once we have a script (Step 1 → branding flow). */
			if (!av.id) {
				if (!partial.script) {
					return;
				}
				const { data, error } = await supabase
					.from('videos')
					.insert({
						site_id: av.site_id,
						page_id: null,
						status: 'draft',
						title: scriptTitle,
						script_json: partial.script as unknown as Record<string, unknown>,
						render_options: render_options as Record<string, unknown>,
						updated_at: now
					})
					.select(
						'id, page_id, site_id, status, title, output_url, script_json, render_options, updated_at, created_at, error_message'
					)
					.single();
				if (error) {
					console.error(error);
					if (isStandaloneVideosMigrationError(error)) {
						toast.error(
							'Database needs the standalone-videos migration: allow null `videos.page_id`. Apply `sql/migrations/2026-04-09_videos_standalone_page_id_nullable.sql`, then try again.'
						);
					} else {
						toast.error(error.message || 'Could not save video draft');
					}
					throw error;
				}
				if (data) {
					setActiveVideo(data as VideoRow);
					void loadVideos();
				}
				return;
			}

			const row: Record<string, unknown> = {
				render_options,
				updated_at: now
			};
			if (partial.script) {
				row.script_json = partial.script as unknown as Record<string, unknown>;
				row.title = scriptTitle;
			}
			const rowId = av.id;
			const { error } = await supabase.from('videos').update(row).eq('id', rowId);
			if (error) {
				console.error(error);
				toast.error('Could not save video draft');
				throw error;
			}
			setActiveVideo((prev) =>
				prev && prev.id === rowId
					? {
							...prev,
							...(partial.script ? { script_json: partial.script, title: scriptTitle } : {}),
							render_options: render_options as unknown as VideoRow['render_options'],
							updated_at: row.updated_at as string
						}
					: prev
			);
			void loadVideos();
		},
		[siteId, loadVideos]
	);

	const persistSiteVideoBranding = useCallback(
		async (branding: VideoBranding) => {
			if (!siteId) return;
			const { error } = await supabase
				.from('sites')
				.update({ video_branding: branding, updated_at: new Date().toISOString() })
				.eq('id', siteId);
			if (error) {
				console.error(error);
				toast.error('Could not save video branding to site');
				throw error;
			}
			await refetchOrg();
			await refetchSites({ silent: true });
		},
		[siteId, refetchOrg, refetchSites]
	);

	const handleGenerateScriptFromSourceText = useCallback(
		async (
			text: string,
			opts: { maxDurationSeconds: number; quality: 'low' | 'medium' | 'high' }
		) => {
			if (creditsRemaining < CREDIT_COSTS.VIDEO_SCRIPT_GENERATION) {
				const msg = `You need at least ${CREDIT_COSTS.VIDEO_SCRIPT_GENERATION} credits to generate a script.`;
				toast.error(msg);
				throw new Error(msg);
			}
			setScriptGenWidgetSteps(initialScriptGenTaskSteps());
			setScriptGenWidgetStatus('running');
			setScriptGenWidgetError(undefined);
			setScriptGenWidgetErrorDetail(undefined);
			setScriptGenWidgetOpen(true);
			setScriptGenSubmitting(true);
			try {
				const script = await generateVideoScript(text, 'text', opts, undefined, undefined);
				await refetchOrg();
				// Close progress so the modal is visible on step 3 (Review & render / Generate video).
				setScriptGenWidgetOpen(false);
				return script;
			} catch (e) {
				const err = e as Error;
				setScriptGenWidgetStatus('error');
				setScriptGenWidgetError(err.message || 'Script generation failed');
				setScriptGenWidgetErrorDetail(
					err.stack && import.meta.env.DEV ? err.stack : undefined
				);
				throw e;
			} finally {
				setScriptGenSubmitting(false);
			}
		},
		[creditsRemaining, refetchOrg]
	);

	const handleRenderVideo = useCallback(
		async (scriptJsonText: string, opts: VideoJobOptions) => {
			if (!activeVideo?.id || !siteId) return;
			if (creditsRemaining < CREDIT_COSTS.VIDEO_RENDER) {
				toast.error(`You need at least ${CREDIT_COSTS.VIDEO_RENDER} credits to render the video.`);
				return;
			}
			setProjectOpen(false);
			setVideoGenWidgetSteps(initialVideoGenTaskSteps());
			setVideoGenWidgetStatus('running');
			setVideoGenWidgetError(undefined);
			setVideoGenWidgetErrorDetail(undefined);
			setVideoGenDoneUrl(null);
			setVideoGenWidgetOpen(true);
			setVideoJobSubmitting(true);
			try {
				const draftOpts = activeVideo.render_options as VideoDraftRenderOptions | null | undefined;
				const draftVoice =
					typeof draftOpts?.cartesia_voice_id === 'string' && draftOpts.cartesia_voice_id.trim()
						? draftOpts.cartesia_voice_id.trim()
						: null;
				const voiceForJob = draftVoice ?? selectedSite?.cartesiaVoiceId?.trim() ?? undefined;
				const { job_id } = await createVideoJob(
					scriptJsonText,
					'script_json',
					opts,
					undefined,
					undefined,
					voiceForJob || undefined
				);
				await refetchOrg();
				const url = await waitForVideo(job_id, (job) => {
					setVideoGenWidgetSteps(videoJobToTaskSteps(job.status, job.current_step, job.progress));
					if (job.status === 'failed' && job.error) {
						setVideoGenWidgetErrorDetail(job.error);
					}
				});
				setVideoGenDoneUrl(url);
				setVideoGenWidgetStatus('done');
				setVideoGenWidgetSteps(videoJobToTaskSteps('complete', null, 100));
				const finishedAt = new Date().toISOString();
				const { error: vidErr } = await supabase
					.from('videos')
					.update({
						output_url: url,
						status: 'complete',
						updated_at: finishedAt,
						error_message: null
					})
					.eq('id', activeVideo.id);
				if (vidErr) {
					console.error('[Videos] could not persist video URL', vidErr);
				}
				toast.success('Video ready — opening in a new tab.');
				window.open(url, '_blank', 'noopener,noreferrer');
				void loadVideos();
			} catch (e) {
				const err = e as Error & { code?: string };
				setVideoGenWidgetStatus('error');
				if (err.code === 'insufficient_credits') {
					setVideoGenWidgetError('Insufficient credits');
				} else {
					setVideoGenWidgetError(err.message || 'Video generation failed');
					Sentry.captureException(err instanceof Error ? err : new Error(String(e)), {
						tags: { feature: 'video-generation' },
						contexts: { video_generation: { videoId: activeVideo.id, siteId } }
					});
				}
				toast.error(err.message || 'Video generation failed');
			} finally {
				setVideoJobSubmitting(false);
			}
		},
		[activeVideo, siteId, selectedSite?.cartesiaVoiceId, creditsRemaining, refetchOrg, loadVideos]
	);

	const confirmDelete = async () => {
		if (!deleteId) return;
		setDeleting(true);
		try {
			const { error } = await supabase.from('videos').delete().eq('id', deleteId);
			if (error) throw error;
			toast.success('Video deleted');
			if (activeVideo?.id === deleteId) {
				setActiveVideo(null);
				setVideoModalKey(null);
				setProjectOpen(false);
			}
			setDeleteId(null);
			void loadVideos();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not delete');
		} finally {
			setDeleting(false);
		}
	};

	const modalRenderOpts = activeVideo?.render_options ?? null;

	const siteBranding = selectedSite?.videoBranding ?? null;

	return (
		<>
			<PageMeta title="Videos" />
			<div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
				<PageHeader
					title="Videos"
					subtitle="Create and manage narrated videos for your site — with or without a blog article."
					rightContent={
						<Button
							type="button"
							className="bg-brand-500 hover:bg-brand-600 gap-1.5 text-white"
							onClick={() => void handleNewVideo()}
							disabled={!siteId || siteLoading}
						>
							<Plus className="size-4" />
							New video
						</Button>
					}
				/>

				{!siteId && !siteLoading ? (
					<p className="text-muted-foreground text-sm">
						Select a site from the header to manage videos.
					</p>
				) : null}

				{listErr ? <p className="text-error-600 dark:text-error-400 text-sm">{listErr}</p> : null}

				<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950/40">
					{listLoading ? (
						<p className="text-muted-foreground p-6 text-sm">Loading videos…</p>
					) : rows.length === 0 ? (
						<div className="text-muted-foreground flex flex-col items-center gap-3 p-10 text-center text-sm">
							<Film className="text-muted-foreground/80 size-10" />
							<p>No videos yet. Create one from a script, notes, or AI — no article required.</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => void handleNewVideo()}
								disabled={!siteId}
							>
								Create your first video
							</Button>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full min-w-[640px] text-left text-sm">
								<thead className="bg-muted/50 border-b border-gray-200 dark:border-gray-800">
									<tr>
										<th className="px-4 py-3 font-medium">Title</th>
										<th className="px-4 py-3 font-medium">Status</th>
										<th className="px-4 py-3 font-medium">Updated</th>
										<th className="px-4 py-3 text-right font-medium">Actions</th>
									</tr>
								</thead>
								<tbody>
									{rows.map((row) => (
										<tr
											key={row.id}
											className="border-b border-gray-100 last:border-0 dark:border-gray-800/80"
										>
											<td className="max-w-[280px] px-4 py-3">
												<div className="truncate font-medium">
													{row.title?.trim() || 'Untitled video'}
												</div>
												{row.page_id ? (
													<Link
														className="text-muted-foreground hover:text-foreground text-xs"
														to={`/workspace/${row.page_id}`}
													>
														From article
													</Link>
												) : (
													<span className="text-muted-foreground text-xs">Standalone</span>
												)}
											</td>
											<td className="text-muted-foreground px-4 py-3 capitalize">{row.status}</td>
											<td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
												{new Date(row.updated_at).toLocaleString()}
											</td>
											<td className="px-4 py-3 text-right">
												<div className="flex flex-wrap justify-end gap-1">
													{row.output_url ? (
														<Button type="button" variant="ghost" size="sm" asChild>
															<a
																href={row.output_url}
																target="_blank"
																rel="noopener noreferrer"
																className="flex items-center gap-1"
															>
																<ExternalLink className="size-3.5" />
																View
															</a>
														</Button>
													) : null}
													<Button
														type="button"
														variant="ghost"
														size="sm"
														className="gap-1"
														onClick={() => openEdit(row)}
													>
														<Pencil className="size-3.5" />
														Edit
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														className="text-error-600 hover:text-error-700 dark:text-error-400 gap-1"
														onClick={() => setDeleteId(row.id)}
													>
														<Trash2 className="size-3.5" />
														Delete
													</Button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>

			{activeVideo && siteId && videoModalKey ? (
				<VideoProjectModal
					key={videoModalKey}
					open={projectOpen}
					onOpenChange={(o) => {
						setProjectOpen(o);
						if (!o) {
							setActiveVideo(null);
							setVideoModalKey(null);
							void loadVideos();
						}
					}}
					pageId={null}
					videoDraftId={activeVideo.id}
					scriptSource="standalone"
					standaloneSiteId={siteId}
					siteCartesiaVoiceId={selectedSite?.cartesiaVoiceId ?? null}
					savedVideoScriptDraft={activeVideo.script_json}
					savedVideoRenderOptions={modalRenderOpts}
					siteVideoBranding={siteBranding}
					onPersistVideoDraft={persistVideoDraft}
					onPersistSiteVideoBranding={persistSiteVideoBranding}
					onGenerateScriptFromSourceText={handleGenerateScriptFromSourceText}
					onRenderVideo={handleRenderVideo}
					scriptGenerating={scriptGenSubmitting}
					videoSubmitting={videoJobSubmitting}
				/>
			) : null}

			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(o) => !o && !deleting && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this video?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes the draft or record from your site. Rendered files may remain in storage;
							you will not be able to recover this row.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={deleting}
							onClick={(e) => {
								e.preventDefault();
								void confirmDelete();
							}}
							className="bg-error-600 hover:bg-error-700 focus:ring-error-600"
						>
							{deleting ? 'Deleting…' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<TaskProgressWidget
				open={scriptGenWidgetOpen}
				title="Generating video script"
				status={scriptGenWidgetStatus}
				steps={scriptGenWidgetSteps}
				errorMessage={scriptGenWidgetError}
				errorDetail={scriptGenWidgetErrorDetail}
				stepInterval={14000}
				doneMessage="Your script is ready in the editor. You can edit scenes, then continue to branding and render."
				className={videoGenWidgetOpen ? 'bottom-88' : undefined}
				onClose={() => {
					setScriptGenWidgetOpen(false);
					setScriptGenWidgetError(undefined);
					setScriptGenWidgetErrorDetail(undefined);
				}}
			/>

			<TaskProgressWidget
				open={videoGenWidgetOpen}
				title="Generating video"
				status={videoGenWidgetStatus}
				steps={videoGenWidgetSteps}
				errorMessage={videoGenWidgetError}
				errorDetail={videoGenWidgetErrorDetail}
				disableAutoAdvance
				doneMessage="Your video is ready. We open it in a new tab — if nothing appeared, your browser may have blocked the pop-up. Use Open video below."
				doneLinkHref={videoGenDoneUrl ?? undefined}
				doneLinkLabel="Open video"
				onClose={() => {
					setVideoGenWidgetOpen(false);
					setVideoGenWidgetError(undefined);
					setVideoGenWidgetErrorDetail(undefined);
					setVideoGenDoneUrl(null);
				}}
			/>
		</>
	);
}

/**
 * Rows in `public.videos` — blog-to-video jobs (drafts + renders).
 * Used for workspace script persistence; future “Videos” hub lists by `siteId`.
 */
export type VideoStatus = 'draft' | 'queued' | 'processing' | 'complete' | 'failed';

export type VideoRecord = {
	id: string;
	/** Set when the video was created from a workspace page; null for standalone Videos hub projects. */
	pageId: string | null;
	siteId: string;
	status: VideoStatus;
	scriptJson: unknown | null;
	title: string | null;
	upstreamJobId: string | null;
	outputUrl: string | null;
	renderOptions: unknown | null;
	errorMessage: string | null;
	createdAt: string;
	updatedAt: string;
};

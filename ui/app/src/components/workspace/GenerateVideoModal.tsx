import type { VideoProjectModalProps } from './VideoProjectModal';
import { VideoProjectModal } from './VideoProjectModal';

type Props = Omit<
	VideoProjectModalProps,
	'scriptSource' | 'onGenerateScriptFromArticle' | 'onGenerateScriptFromSourceText' | 'videoDraftId'
> & {
	/** Step 1 — returns script object from generate-script API (article / Tiptap). */
	onGenerateScript: NonNullable<VideoProjectModalProps['onGenerateScriptFromArticle']>;
	/** Current draft row id when the workspace has saved a video draft (optional; improves draft autosave routing). */
	videoDraftId?: string | null;
};

/**
 * Workspace wrapper — article-backed script generation and the shared video project flow.
 */
export function GenerateVideoModal({
	onGenerateScript,
	videoDraftId = null,
	...rest
}: Props) {
	return (
		<VideoProjectModal
			{...rest}
			videoDraftId={videoDraftId}
			scriptSource="article"
			onGenerateScriptFromArticle={onGenerateScript}
		/>
	);
}

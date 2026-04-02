/**
 * Footer word count — matches Workspace article editor (ratio + colors when a target exists).
 */
export function ArticleEditorWordCount({
	wordCount,
	targetWordCount,
	showPlainWordCount
}: {
	wordCount: number;
	/** When set and > 0, shows "current / target" with band styling. */
	targetWordCount?: number;
	/** When there is no target, show "N words" (e.g. blog CMS). Workspace leaves this false. */
	showPlainWordCount?: boolean;
}) {
	if (targetWordCount != null && targetWordCount > 0) {
		const low = Math.round(targetWordCount * 0.7);
		const high = Math.round(targetWordCount * 1.3);
		const over = wordCount > high;
		const inRange = wordCount >= low && wordCount <= high;
		const colorClass = inRange
			? 'text-success-500 dark:text-success-400'
			: over
				? 'text-warning-500 dark:text-warning-400'
				: 'text-gray-500 dark:text-gray-400';
		return (
			<div className="flex justify-end p-3">
				<span className={`text-xs ${colorClass}`}>
					{wordCount.toLocaleString()} / {targetWordCount.toLocaleString()} target
				</span>
			</div>
		);
	}
	if (showPlainWordCount) {
		return (
			<div className="flex justify-end p-3">
				<span className="text-xs text-gray-500 dark:text-gray-400">
					{wordCount.toLocaleString()} words
				</span>
			</div>
		);
	}
	return null;
}

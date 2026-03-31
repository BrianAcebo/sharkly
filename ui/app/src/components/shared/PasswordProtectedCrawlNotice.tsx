import { Lock } from 'lucide-react';
import { PASSWORD_PROTECTED_CRAWL_MESSAGE } from '../../lib/crawlMessages';

type Props = {
	/** Optional override (e.g. from API) */
	message?: string;
	className?: string;
};

/**
 * Explains that SEO/CRO crawls do not use the user’s browser session — password storefronts show a gate page.
 */
export function PasswordProtectedCrawlNotice({ message, className = '' }: Props) {
	return (
		<div
			className={`flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100 ${className}`}
		>
			<Lock className="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
			<div className="min-w-0 space-y-1">
				<p className="font-semibold text-sky-950 dark:text-sky-50">Password-protected or gated page</p>
				<p className="leading-relaxed text-sky-900/95 dark:text-sky-100/95">
					{message ?? PASSWORD_PROTECTED_CRAWL_MESSAGE}
				</p>
			</div>
		</div>
	);
}

import type { Notification } from '../../types/notifications';

function isNonEmptyString(v: unknown): v is string {
	return typeof v === 'string' && v.trim().length > 0;
}

function formatKeyLabel(key: string): string {
	return key
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

export type MetadataRow = {
	key: string;
	label: string;
	value: string;
	variant?: 'mono';
};

const REFUND_LIKE_TYPES = new Set(['credit_refund', 'strategy_refund']);

function shouldOfferSupportReference(
	type: string,
	includeTechnical: boolean
): boolean {
	return !includeTechnical && REFUND_LIKE_TYPES.has(type);
}

function addSafeMetadataRows(
	metadata: Record<string, unknown>,
	rows: MetadataRow[],
	usedKeys: Set<string>
): void {
	if (typeof metadata.credits_refunded === 'number') {
		usedKeys.add('credits_refunded');
		rows.push({
			key: 'credits_refunded',
			label: 'Credits refunded',
			value: String(metadata.credits_refunded),
		});
	}

	if (isNonEmptyString(metadata.failure_code)) {
		usedKeys.add('failure_code');
		rows.push({
			key: 'failure_code',
			label: 'Failure code',
			value: metadata.failure_code.trim(),
		});
	}

	if (typeof metadata.credits_remaining === 'number') {
		usedKeys.add('credits_remaining');
		rows.push({
			key: 'credits_remaining',
			label: 'Credits remaining',
			value: String(metadata.credits_remaining),
		});
	}

	if (isNonEmptyString(metadata.task_title)) {
		usedKeys.add('task_title');
		rows.push({
			key: 'task_title',
			label: 'Task',
			value: metadata.task_title.trim(),
		});
	}

	if (isNonEmptyString(metadata.due_date)) {
		usedKeys.add('due_date');
		rows.push({
			key: 'due_date',
			label: 'Due',
			value: new Date(metadata.due_date).toLocaleDateString(),
		});
	}

	if (isNonEmptyString(metadata.priority)) {
		usedKeys.add('priority');
		rows.push({
			key: 'priority',
			label: 'Priority',
			value: metadata.priority.trim(),
		});
	}
}

function addTechnicalMetadataRows(
	metadata: Record<string, unknown>,
	rows: MetadataRow[],
	usedKeys: Set<string>
): void {
	const skip = new Set([
		'credits_refunded',
		'friendly_summary',
		'shown',
		'failure_code',
		'credits_remaining',
		'task_title',
		'due_date',
		'priority',
	]);

	if (typeof metadata.http_status === 'number' && !usedKeys.has('http_status')) {
		usedKeys.add('http_status');
		rows.push({
			key: 'http_status',
			label: 'HTTP status',
			value: String(metadata.http_status),
		});
	}

	if (isNonEmptyString(metadata.anthropic_error_type) && !usedKeys.has('anthropic_error_type')) {
		usedKeys.add('anthropic_error_type');
		rows.push({
			key: 'anthropic_error_type',
			label: 'Provider error type',
			value: metadata.anthropic_error_type.trim(),
		});
	}

	if (isNonEmptyString(metadata.anthropic_error_message) && !usedKeys.has('anthropic_error_message')) {
		usedKeys.add('anthropic_error_message');
		rows.push({
			key: 'anthropic_error_message',
			label: 'Provider message',
			value: metadata.anthropic_error_message.trim(),
			variant: 'mono',
		});
	}

	if (isNonEmptyString(metadata.error_category) && !usedKeys.has('error_category')) {
		usedKeys.add('error_category');
		rows.push({
			key: 'error_category',
			label: 'Category',
			value: metadata.error_category.trim(),
		});
	}

	if (isNonEmptyString(metadata.error_message) && !usedKeys.has('error_message')) {
		usedKeys.add('error_message');
		rows.push({
			key: 'error_message',
			label: 'Error',
			value: metadata.error_message.trim(),
			variant: 'mono',
		});
	}

	if (isNonEmptyString(metadata.raw_response_excerpt) && !usedKeys.has('raw_response_excerpt')) {
		usedKeys.add('raw_response_excerpt');
		rows.push({
			key: 'raw_response_excerpt',
			label: 'Response excerpt',
			value: metadata.raw_response_excerpt.trim(),
			variant: 'mono',
		});
	}

	if (isNonEmptyString(metadata.reason) && !usedKeys.has('reason')) {
		usedKeys.add('reason');
		rows.push({
			key: 'reason',
			label: 'Technical summary',
			value: metadata.reason.trim(),
			variant: 'mono',
		});
	}

	// Remaining primitives (dev-only loose keys — never in prod)
	for (const [key, val] of Object.entries(metadata)) {
		if (skip.has(key) || usedKeys.has(key)) continue;
		if (val == null) continue;
		if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
			const s = String(val).trim();
			if (!s) continue;
			usedKeys.add(key);
			rows.push({
				key,
				label: formatKeyLabel(key),
				value: s.length > 800 ? `${s.slice(0, 800)}…` : s,
				variant: s.length > 120 ? 'mono' : undefined,
			});
		}
	}
}

/**
 * @param options.includeTechnical — When false (default in production), API/technical fields are omitted.
 */
export function notificationMetadataEntries(
	metadata: Record<string, unknown>,
	options?: { includeTechnical?: boolean }
): MetadataRow[] {
	const includeTechnical = options?.includeTechnical ?? import.meta.env.DEV;
	const rows: MetadataRow[] = [];
	const usedKeys = new Set<string>();

	addSafeMetadataRows(metadata, rows, usedKeys);

	if (includeTechnical) {
		addTechnicalMetadataRows(metadata, rows, usedKeys);
	}

	return rows;
}

export function hasRenderableNotificationMetadata(notification: Notification): boolean {
	const includeTechnical = import.meta.env.DEV;
	const rows = notificationMetadataEntries(notification.metadata ?? {}, { includeTechnical });
	if (rows.length > 0) return true;
	return shouldOfferSupportReference(notification.type, includeTechnical);
}

type Props = {
	notification: Notification;
	compact?: boolean;
};

/** Details block — technical fields only in local dev (`import.meta.env.DEV`). */
export function NotificationMetadataSection({ notification, compact }: Props) {
	const includeTechnical = import.meta.env.DEV;
	const rows = notificationMetadataEntries(notification.metadata ?? {}, { includeTechnical });
	const showSupportRef = shouldOfferSupportReference(notification.type, includeTechnical);

	if (rows.length === 0 && !showSupportRef) return null;

	const gap = compact ? 'gap-1.5' : 'gap-2';
	const labelCls = compact
		? 'text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400'
		: 'text-xs font-medium text-neutral-600 dark:text-neutral-400';
	const valueCls = compact
		? 'text-xs text-neutral-800 dark:text-neutral-200'
		: 'text-sm text-neutral-800 dark:text-neutral-200';
	const monoCls = 'font-mono text-[11px] leading-relaxed wrap-break-word whitespace-pre-wrap';

	return (
		<div
			className={
				compact
					? 'mt-2 rounded-md border border-neutral-200/80 bg-neutral-50/80 px-2.5 py-2 dark:border-neutral-700 dark:bg-neutral-800/50'
					: 'mt-3 rounded-lg border border-neutral-200 bg-neutral-50/90 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/60'
			}
		>
			<p className={`${labelCls} mb-1.5`}>{includeTechnical ? 'Details' : 'Info for support'}</p>
			<dl className={`flex flex-col ${gap}`}>
				{rows.map((row) => (
					<div key={row.key}>
						<dt className={labelCls}>{row.label}</dt>
						<dd className={`${valueCls} ${row.variant === 'mono' ? monoCls : ''}`}>{row.value}</dd>
					</div>
				))}
				{showSupportRef && !includeTechnical && (
					<div>
						<dt className={labelCls}>Support reference</dt>
						<dd className={`${valueCls} font-mono text-[11px]`}>{notification.id}</dd>
						<p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
							Share this ID if you contact customer support so we can look up what happened.
						</p>
					</div>
				)}
			</dl>
		</div>
	);
}

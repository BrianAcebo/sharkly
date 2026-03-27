/**
 * Turn thrown Claude/Anthropic API errors into user-facing copy + audit metadata.
 */

export type AnthropicFailureSummary = {
	/** Stored on credit_back_action / logs */
	rpcReason: string;
	/** Short paragraph for notifications */
	friendlySummary: string;
	/** Shown in streaming task widget "technical" section */
	streamDetail: string;
	/** Merged into notification.metadata */
	metadata: Record<string, unknown>;
};

const MAX_RPC_REASON = 480;
const MAX_STREAM_DETAIL = 1400;
const MAX_RAW_EXCERPT = 1600;

export function summarizeAnthropicFailure(err: unknown): AnthropicFailureSummary {
	const raw = err instanceof Error ? err.message : String(err);
	const metadata: Record<string, unknown> = {};

	const match = raw.match(/^Claude API error (\d+):\s*([\s\S]*)$/);
	if (match) {
		const status = Number.parseInt(match[1], 10);
		const body = match[2] ?? '';
		metadata.http_status = status;
		metadata.error_category = 'anthropic_api';

		let anthropicMessage: string | undefined;
		let anthropicType: string | undefined;
		const brace = body.indexOf('{');
		if (brace !== -1) {
			try {
				const parsed = JSON.parse(body.slice(brace)) as {
					error?: { type?: string; message?: string };
				};
				anthropicType = parsed?.error?.type;
				anthropicMessage = parsed?.error?.message;
			} catch {
				metadata.raw_response_excerpt = body.slice(0, MAX_RAW_EXCERPT);
			}
		}
		if (anthropicType) metadata.anthropic_error_type = anthropicType;
		if (anthropicMessage) metadata.anthropic_error_message = anthropicMessage;

		let friendly = 'The AI service returned an error.';

		if (status === 429) {
			friendly = 'Rate limited — too many requests in a short time. Wait a minute and try again.';
		} else if (status === 529) {
			friendly = 'The AI service is temporarily overloaded. Try again in a few minutes.';
		} else if (status === 401 || status === 403) {
			friendly = "API authentication issue on our side — we've been notified.";
		} else if (status === 400) {
			const haystack = `${anthropicMessage ?? ''} ${body}`;
			if (/context|too long|max_tokens|token count|prompt is too|exceed/i.test(haystack)) {
				friendly =
					'The prompt or expected output may exceed the model limit. Try again, or shorten the brief / reduce context if it keeps failing.';
			} else if (/tool_use|tool use|parallel_tool/i.test(haystack)) {
				friendly =
					'The model hit a tool or response-format limit. Try again; if it keeps failing, contact support with the details below.';
			} else if (anthropicMessage) {
				friendly =
					anthropicMessage.length > 320
						? `${anthropicMessage.slice(0, 320)}…`
						: anthropicMessage;
			} else {
				friendly = 'The AI provider rejected the request — see details below.';
			}
		} else if (status === 500 || status === 503 || status === 502) {
			friendly = 'The AI service had a temporary error. Try again shortly.';
		}

		const detailLines: string[] = [`HTTP ${status}`];
		if (anthropicType) detailLines.push(`Error type: ${anthropicType}`);
		if (anthropicMessage) detailLines.push(anthropicMessage);
		else if (body.trim()) detailLines.push(body.trim().slice(0, MAX_STREAM_DETAIL));

		return {
			rpcReason: raw.slice(0, MAX_RPC_REASON),
			friendlySummary: friendly,
			streamDetail: detailLines.join('\n').slice(0, MAX_STREAM_DETAIL),
			metadata,
		};
	}

	// Non-Claude errors (network, our code, etc.)
	metadata.error_category = 'unknown';
	metadata.error_message = raw.slice(0, MAX_RAW_EXCERPT);
	const friendly = raw.length > 300 ? `${raw.slice(0, 300)}…` : raw;

	return {
		rpcReason: raw.slice(0, MAX_RPC_REASON),
		friendlySummary: friendly,
		streamDetail: raw.slice(0, MAX_STREAM_DETAIL),
		metadata,
	};
}

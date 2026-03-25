interface Config {
	smtp: {
		host: string;
		port: number;
		secure: boolean;
		user?: string;
		pass?: string;
		from: string;
	};
	resend: {
		apiKey?: string;
		from: string;
		replyTo?: string;
	};
	frontendUrl?: string;
	googleSearch: {
		apiKey?: string;
		cx?: string;
	};
}

/** Strip wrapping quotes some env loaders leave on values, e.g. FRONTEND_URL="http://localhost:5173" */
function sanitizeFrontendUrl(raw: string | undefined): string | null {
	if (raw == null || raw === '') {
		return null;
	}
	let s = raw.split(',')[0].trim();
	if (
		(s.startsWith('"') && s.endsWith('"')) ||
		(s.startsWith("'") && s.endsWith("'"))
	) {
		s = s.slice(1, -1).trim();
	}
	s = s.replace(/\/$/, '');
	return s || null;
}

/**
 * App URL for emails, redirects, and asset links.
 * Prefer `FRONTEND_URL` (first entry if comma-separated). Otherwise production → app.sharkly.co, dev → localhost:5173.
 */
export function getAppOrigin(): string {
	const fromEnv = sanitizeFrontendUrl(process.env.FRONTEND_URL);
	if (fromEnv) {
		return fromEnv;
	}
	if (process.env.NODE_ENV === 'production') {
		return 'https://app.sharkly.co';
	}
	return 'http://localhost:5173';
}

/** `FRONTEND_URL` + `/auth/confirm` when env is set; otherwise null. */
export function getAuthConfirmRedirectFromEnv(): string | null {
	const o = sanitizeFrontendUrl(process.env.FRONTEND_URL);
	return o ? `${o}/auth/confirm` : null;
}

const config: Config = {
	smtp: {
		host: process.env.SMTP_HOST || 'smtp.gmail.com',
		port: parseInt(process.env.SMTP_PORT || '587', 10),
		secure:
			process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '587', 10) === 465,
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
		from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@sharkly.co'
	},
	resend: {
		apiKey: process.env.RESEND_API_KEY,
		from: process.env.RESEND_FROM || process.env.SMTP_FROM || 'noreply@sharkly.co',
		replyTo: process.env.RESEND_REPLY_TO || process.env.SMTP_FROM
	},
	frontendUrl: process.env.FRONTEND_URL,
	googleSearch: {
		apiKey: process.env.GOOGLE_CSE_API_KEY,
		cx: process.env.GOOGLE_CSE_CX
	}
};

export { config };

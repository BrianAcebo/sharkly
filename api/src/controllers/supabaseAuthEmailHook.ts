/**
 * Supabase Auth — Send Email hook (HTTPS POST).
 * Configure in Dashboard: Auth → Hooks → Send Email → URL = https://<api-host>/webhooks/supabase/auth-email
 * Env: RESEND_API_KEY, RESEND_FROM, SUPABASE_AUTH_EMAIL_HOOK_SECRET, SUPABASE_URL (or PUBLIC_SUPABASE_URL)
 * @see https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
 */
import type { Request, Response } from 'express';
import React from 'react';
import { renderAsync } from '@react-email/render';
import { Resend } from 'resend';
import { Webhook } from 'standardwebhooks';
import { config, getAppOrigin, getAuthConfirmRedirectFromEnv } from '../config.js';
import { AuthEmail, emailSubjectForAction } from '../emails/authEmail/AuthEmail.js';
import { captureApiError } from '../utils/sentryCapture.js';

type EmailData = {
	token: string;
	token_hash: string;
	redirect_to: string;
	email_action_type: string;
	site_url: string;
	token_new: string;
	token_hash_new: string;
};

type HookUser = {
	email: string;
	new_email?: string;
};

type HookPayload = {
	user: HookUser;
	email_data: EmailData;
};

function getHookSecret(): string {
	const raw = process.env.SUPABASE_AUTH_EMAIL_HOOK_SECRET ?? '';
	return raw.replace(/^v1,whsec_/, '');
}

function getSupabaseUrl(): string {
	return (process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
}

function buildVerifyUrl(supabaseUrl: string, tokenHash: string, verifyType: string, redirectTo: string): string {
	const url = new URL(`${supabaseUrl}/auth/v1/verify`);
	url.searchParams.set('token', tokenHash);
	url.searchParams.set('type', verifyType);
	url.searchParams.set('redirect_to', redirectTo);
	return url.toString();
}

/**
 * Post-verify redirect. If `FRONTEND_URL` is set (sanitized), use `{origin}/auth/confirm`.
 * Otherwise use the hook payload, then `getAppOrigin()/auth/confirm`.
 */
function redirectToForVerify(email_data: EmailData): string {
	const fromEnv = getAuthConfirmRedirectFromEnv();
	if (fromEnv) {
		return fromEnv;
	}
	const fromPayload = email_data.redirect_to?.trim();
	if (fromPayload) {
		return fromPayload;
	}
	return `${getAppOrigin()}/auth/confirm`;
}

function verifyTypeFromAction(action: string): string {
	const allowed = new Set([
		'signup',
		'invite',
		'magiclink',
		'recovery',
		'email_change',
		'email',
		'reauthentication',
	]);
	if (allowed.has(action)) return action;
	return 'email';
}

function tokenHashForVerifyLink(
	action: string,
	email_data: EmailData,
	recipientEmail: string,
	_currentEmail: string,
	newEmail?: string
): string {
	if (action !== 'email_change') {
		return email_data.token_hash;
	}
	// New address: token_hash + token_new; current address: token_hash_new + token
	if (newEmail && recipientEmail === newEmail) {
		return email_data.token_hash;
	}
	return email_data.token_hash_new || email_data.token_hash;
}

function needsConfirmationLink(action: string): boolean {
	return ![
		'password_changed_notification',
		'email_changed_notification',
		'phone_changed_notification',
		'identity_linked_notification',
		'identity_unlinked_notification',
		'mfa_factor_enrolled_notification',
		'mfa_factor_unenrolled_notification',
	].includes(action);
}

function headersForWebhook(req: Request): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(req.headers)) {
		if (value === undefined) continue;
		out[key] = Array.isArray(value) ? value.join(', ') : value;
	}
	return out;
}

export async function handleSupabaseAuthEmailHook(req: Request, res: Response): Promise<void> {
	const supabaseUrl = getSupabaseUrl();
	if (!supabaseUrl) {
		captureApiError(
			new Error('SUPABASE_URL or PUBLIC_SUPABASE_URL is not set'),
			req,
			{ feature: 'auth-email-hook-config' }
		);
		res.status(500).json({ error: { message: 'SUPABASE_URL or PUBLIC_SUPABASE_URL is not set' } });
		return;
	}

	if (!config.resend.apiKey) {
		captureApiError(new Error('RESEND_API_KEY is not configured'), req, { feature: 'auth-email-hook-config' });
		res.status(500).json({ error: { message: 'RESEND_API_KEY is not configured' } });
		return;
	}

	const payload =
		typeof req.body === 'string'
			? req.body
			: Buffer.isBuffer(req.body)
				? req.body.toString('utf8')
				: '';

	const wh = new Webhook(getHookSecret());
	const resend = new Resend(config.resend.apiKey);

	try {
		let user: HookUser;
		let email_data: EmailData;
		try {
			const verified = wh.verify(payload, headersForWebhook(req)) as HookPayload;
			user = verified.user;
			email_data = verified.email_data;
		} catch (verifyErr) {
			console.error('[supabaseAuthEmailHook] Webhook verify failed:', verifyErr);
			throw verifyErr;
		}

		const action = email_data.email_action_type;
		const verifyType = verifyTypeFromAction(action);
		const recipient = user.email;

		let confirmationUrl: string | null = null;
		if (needsConfirmationLink(action)) {
			const hash = tokenHashForVerifyLink(action, email_data, recipient, user.email, user.new_email);
			confirmationUrl = buildVerifyUrl(supabaseUrl, hash, verifyType, redirectToForVerify(email_data));
		}

		let html: string;
		try {
			html = await renderAsync(
				React.createElement(AuthEmail, {
					emailActionType: action,
					confirmationUrl,
					userEmail: user.email,
				})
			);
		} catch (renderErr) {
			console.error('[supabaseAuthEmailHook] React email render failed:', renderErr);
			throw renderErr;
		}

		const from = config.resend.from;
		const { error } = await resend.emails.send({
			from,
			to: [user.email],
			subject: emailSubjectForAction(action),
			html,
		});

		if (error) {
			console.error('[supabaseAuthEmailHook] Resend error:', error);
			throw error;
		}

		res.status(200).json({});
	} catch (error) {
		const err = error as Error & { code?: string };
		console.error(
			'[supabaseAuthEmailHook] Failed:',
			err?.message ?? err,
			err?.stack ?? ''
		);
		res.status(401).json({
			error: {
				http_code: err.code ?? 'hook_error',
				message: err.message ?? String(error),
			},
		});
	}
}

import { supabase } from './supabaseClient.js';
import { twilioClient, getTwilioClientForSubaccount } from './twilioClient.js';
import twilio from 'twilio';

const PUBLIC_URL = process.env.PUBLIC_URL;
const PARENT_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const PARENT_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;

// Normalize hosts/URLs to avoid double slashes or missing protocols
const normalizeHost = (value?: string | null) => {
	if (!value) return undefined;
	const trimmed = String(value).trim().replace(/\/+$/, '');
	return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const ensureAbsoluteUrl = (value?: string | null) => {
	if (!value) return undefined;
	const trimmed = String(value).trim();
	return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;
};

const BASE_HOST =
	normalizeHost(process.env.WEBHOOK_PUBLIC_HOST) ||
	normalizeHost(process.env.NGROK_DOMAIN) ||
	normalizeHost(PUBLIC_URL);

// Prefer explicit envs; otherwise derive from BASE_HOST
const VOICE_WEBHOOK_URL = ensureAbsoluteUrl(process.env.VOICE_WEBHOOK_URL) || (BASE_HOST ? `${BASE_HOST}/api/twilio/voice/call` : undefined);
const STATUS_CALLBACK_URL = ensureAbsoluteUrl(process.env.STATUS_CALLBACK_URL);

const buildFriendlyName = (orgName: string, orgId: string) => {
  const sanitizedName = (orgName || 'Paperboat Org').replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
  const base = sanitizedName || 'Paperboat Org';
  const friendly = `${base} (${orgId.slice(0, 8)})`;
  return friendly.length <= 64 ? friendly : friendly.slice(0, 64);
};

// Parent client (used for creating subaccount API keys)
const parentClient = twilio(PARENT_ACCOUNT_SID, PARENT_AUTH_TOKEN);

// Minimal shape for the Twilio subaccount client methods we use
type SubaccountTwilioClient = {
	applications: {
		list: (args: { limit?: number }) => Promise<Array<{ sid: string; friendlyName?: string }>>;
		create: (args: { friendlyName: string; voiceUrl?: string; voiceMethod?: string; statusCallback?: string; statusCallbackMethod?: string }) => Promise<{ sid: string }>;
	};
	messaging: {
		v1: {
			services: ((sid: string) => { fetch: () => Promise<{ sid: string }> }) & {
				list: (args: { limit?: number }) => Promise<Array<{ sid: string; friendlyName?: string }>>;
				create: (args: { friendlyName: string; useInboundWebhookOnNumber: boolean; inboundRequestUrl?: string; statusCallback?: string }) => Promise<{ sid: string }>;
			};
		};
	};
};

function isTwilioAuthError(e: unknown): e is { status?: number; code?: number } {
	return typeof e === 'object' && e !== null && ('status' in e || 'code' in e);
}

// Rotate subaccount API key/secret ONLY if missing or invalid
export async function assertSubaccountCredsOrRotate(params: {
	orgId: string;
	subaccountSid: string;
	apiKeySid: string | null;
	apiKeySecret: string | null;
	friendlyName: string;
}) {
	const { orgId, subaccountSid, apiKeySid, apiKeySecret, friendlyName } = params;

	const rotate = async () => {
		const apiKey = await parentClient.api.v2010.accounts(subaccountSid).newKeys.create({ friendlyName });
		await supabase
			.from('organizations')
			.update({
				twilio_api_key_sid: apiKey.sid,
				twilio_api_key_secret: apiKey.secret,
				updated_at: new Date().toISOString()
			})
			.eq('id', orgId);
		return { apiKeySid: apiKey.sid, apiKeySecret: apiKey.secret } as const;
	};

	if (!apiKeySid || !apiKeySecret) {
		return rotate();
	}

	try {
		const testClient = twilio(apiKeySid, apiKeySecret, { accountSid: subaccountSid });
		await (testClient as unknown as { api: { v2010: { accounts: (sid: string) => { fetch: () => Promise<unknown> } } } }).api.v2010.accounts(subaccountSid).fetch();
		return { apiKeySid, apiKeySecret } as const;
	} catch (e: unknown) {
		if (isTwilioAuthError(e) && (e.status === 401 || e.code === 20003)) {
			return rotate();
		}
		throw e;
	}
}

export async function ensureTwilioSubaccount(orgId: string, orgName: string, existingSid?: string | null) {
	if (existingSid) {
		return existingSid;
	}

	// In development, allow reusing a shared subaccount to avoid creating many
	const devSharedSubaccount = process.env.TWILIO_SUBACCOUNT_SID as string | undefined;
	if (process.env.NODE_ENV === 'development' && devSharedSubaccount) {
		const { error } = await supabase
			.from('organizations')
			.update({
				twilio_subaccount_sid: devSharedSubaccount,
				updated_at: new Date().toISOString()
			})
			.eq('id', orgId);

		if (error) {
			throw error;
		}

		return devSharedSubaccount;
	}

	const subaccount = await twilioClient.api.v2010.accounts.create({
		friendlyName: buildFriendlyName(orgName, orgId)
	});

	const { error } = await supabase
		.from('organizations')
		.update({
			twilio_subaccount_sid: subaccount.sid,
			updated_at: new Date().toISOString()
		})
		.eq('id', orgId);

	if (error) {
		throw error;
	}

	return subaccount.sid;
}

async function ensureTwilioMessagingService(params: {
	orgId: string;
	orgName: string;
	subaccountSid: string;
	apiKeySid: string;
	apiKeySecret: string;
	existingServiceSid?: string | null;
}) {
	const { orgId, orgName, subaccountSid, apiKeySid, apiKeySecret, existingServiceSid } = params;

	// Subaccount-scoped client using subaccount API key/secret (no parent-level services)
	const subClient = getTwilioClientForSubaccount({ accountSid: subaccountSid, apiKeySid, apiKeySecret }) as unknown as SubaccountTwilioClient;

	// Validate existing SID belongs to this subaccount
	if (existingServiceSid) {
		try {
			const fetched = await subClient.messaging.v1.services(existingServiceSid).fetch();
			if (fetched && fetched.sid === existingServiceSid) {
				return existingServiceSid;
			}
		} catch (e: unknown) {
			if (!isTwilioAuthError(e) || (e.status !== 404 && e.code !== 20404)) throw e;
			await supabase
				.from('organizations')
				.update({ twilio_messaging_service_sid: null, updated_at: new Date().toISOString() })
				.eq('id', orgId);
		}
	}

	// Reuse by friendlyName if present to avoid duplicates
	const friendlyName = buildFriendlyName(`${orgName} Messaging`, orgId);
	try {
		const list = await subClient.messaging.v1.services.list({ limit: 50 });
		const found = list.find((s) => s.friendlyName === friendlyName);
		if (found?.sid) {
			await supabase
				.from('organizations')
				.update({ twilio_messaging_service_sid: found.sid, updated_at: new Date().toISOString() })
				.eq('id', orgId);
			return found.sid;
		}
	} catch (err) { void err; }

	// Create Messaging Service bound to subaccount
	const inboundUrl = BASE_HOST ? `${BASE_HOST}/api/webhooks/twilio/sms-inbound` : undefined;
	const statusUrl = BASE_HOST ? `${BASE_HOST}/api/webhooks/twilio/sms-status` : undefined;
	const created = await subClient.messaging.v1.services.create({
		friendlyName,
		useInboundWebhookOnNumber: false,
		inboundRequestUrl: inboundUrl,
		statusCallback: statusUrl
	});

	const { error } = await supabase
		.from('organizations')
		.update({
			twilio_messaging_service_sid: created.sid,
			updated_at: new Date().toISOString()
		})
		.eq('id', orgId);

	if (error) {
		throw error;
	}

	return created.sid;
}

export async function ensureTwilioResourcesForOrganization(params: {
	orgId: string;
	orgName: string;
	twilioSubaccountSid?: string | null;
	twilioMessagingServiceSid?: string | null;
	twilioTwimlAppSid?: string | null;
	twilioApiKeySid?: string | null;
	twilioApiKeySecret?: string | null;
	preventPurchases?: boolean;
}) {
	const { orgId, orgName } = params;

	// 1) Ensure subaccount
	const subaccountSid = await ensureTwilioSubaccount(orgId, orgName, params.twilioSubaccountSid);

	// 2) Ensure API Key/Secret in subaccount (rotate only if missing/invalid)
	let apiKeySid = params.twilioApiKeySid || null;
	let apiKeySecret = params.twilioApiKeySecret || null;

	const verified = await assertSubaccountCredsOrRotate({
		orgId,
		subaccountSid,
		apiKeySid,
		apiKeySecret,
		friendlyName: `Org ${orgId} Voice Web`
	});
	apiKeySid = verified.apiKeySid;
	apiKeySecret = verified.apiKeySecret;

	// Subaccount-scoped client (prefer API key pair)
	const subClient = getTwilioClientForSubaccount({ accountSid: subaccountSid, apiKeySid: apiKeySid!, apiKeySecret: apiKeySecret! }) as unknown as SubaccountTwilioClient;

	// 3) Ensure TwiML App in subaccount (idempotent)
	let twimlAppSid = params.twilioTwimlAppSid || null;
	if (!twimlAppSid && VOICE_WEBHOOK_URL) {
		try {
			const desired = `Org ${orgId} Voice App`;
			const apps = await subClient.applications.list({ limit: 50 });
			const match = apps.find((a) => a.friendlyName === desired);
			if (match?.sid) {
				twimlAppSid = match.sid;
			} else {
				const app = await subClient.applications.create({
					friendlyName: desired,
					voiceUrl: VOICE_WEBHOOK_URL,
					voiceMethod: 'POST',
					statusCallback: STATUS_CALLBACK_URL,
					statusCallbackMethod: STATUS_CALLBACK_URL ? 'POST' : undefined
				});
				twimlAppSid = app.sid;
			}
		} catch (e: unknown) {
			// Keep logs actionable but never include secrets
			const err = e as { message?: string };
			console.error('[twilioProvisioning] TwiML App ensure failed', { orgId, subaccountSid, error: err?.message ?? String(e) });
		}
	}

	// 4) Ensure Messaging Service (idempotent)
	const messagingServiceSid = await ensureTwilioMessagingService({
		orgId,
		orgName,
		subaccountSid,
		apiKeySid: apiKeySid!,
		apiKeySecret: apiKeySecret!,
		existingServiceSid: params.twilioMessagingServiceSid
	});

	// 5) Persist
  try {
		await supabase
			.from('organizations')
			.update({
				twilio_subaccount_sid: subaccountSid,
				twilio_messaging_service_sid: messagingServiceSid,
				twilio_twiml_app_sid: twimlAppSid,
				twilio_api_key_sid: apiKeySid,
				twilio_api_key_secret: apiKeySecret,
				updated_at: new Date().toISOString()
			})
			.eq('id', orgId);
	} catch (e) {
		console.error('[twilioProvisioning] Failed to persist org Twilio fields', e);
	}

  return { subaccountSid, messagingServiceSid, twimlAppSid, apiKeySid, apiKeySecret };
}


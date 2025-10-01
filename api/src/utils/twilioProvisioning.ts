import { supabase } from './supabaseClient';
import { twilioClient, getTwilioClientForSubaccount } from './twilioClient';
import twilio from 'twilio';

const PUBLIC_URL = process.env.PUBLIC_URL;
const PARENT_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const PARENT_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
// Build a default public URL to the voice webhook if VOICE_WEBHOOK_URL is not explicitly provided
const RAW_HOST =
  process.env.WEBHOOK_PUBLIC_HOST ||
  process.env.NGROK_DOMAIN ||
  (PUBLIC_URL ? PUBLIC_URL.replace(/\/$/, '') : undefined);
const NORMALIZED_HOST = RAW_HOST
  ? (/^https?:\/\//i.test(RAW_HOST) ? RAW_HOST : `https://${RAW_HOST}`)
  : undefined;
const VOICE_WEBHOOK_URL = process.env.VOICE_WEBHOOK_URL || (NORMALIZED_HOST ? `${NORMALIZED_HOST.replace(/\/$/, '')}/api/twilio/voice/call` : undefined);
const STATUS_CALLBACK_URL = process.env.STATUS_CALLBACK_URL || undefined;

const buildFriendlyName = (orgName: string, orgId: string) => {
  const sanitizedName = (orgName || 'Paperboat Org').replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
  const base = sanitizedName || 'Paperboat Org';
  const friendly = `${base} (${orgId.slice(0, 8)})`;
  return friendly.length <= 64 ? friendly : friendly.slice(0, 64);
};

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

export async function ensureTwilioMessagingService(params: {
	orgId: string;
	orgName: string;
	subaccountSid: string;
	existingServiceSid?: string | null;
}) {
	const { orgId, orgName, subaccountSid, existingServiceSid } = params;

	if (existingServiceSid) {
		return existingServiceSid;
	}

  const friendlyName = buildFriendlyName(`${orgName} Messaging`, orgId);

  const service = await (getTwilioClientForSubaccount({ accountSid: subaccountSid }) as unknown as {
    messaging: { v1: { services: { create: (args: { friendlyName: string; useInboundWebhookOnNumber: boolean; inboundRequestUrl?: string; statusCallback?: string }) => Promise<{ sid: string }> } } };
  }).messaging.v1.services.create({
    friendlyName,
    useInboundWebhookOnNumber: true,
    inboundRequestUrl: PUBLIC_URL ? `${PUBLIC_URL.replace(/\/$/, '')}/api/webhooks/twilio/sms-inbound` : undefined,
    statusCallback: PUBLIC_URL ? `${PUBLIC_URL.replace(/\/$/, '')}/api/webhooks/twilio/sms-status` : undefined
  });

	const { error } = await supabase
		.from('organizations')
		.update({
			twilio_messaging_service_sid: service.sid,
			updated_at: new Date().toISOString()
		})
		.eq('id', orgId);

	if (error) {
		throw error;
	}

	return service.sid;
}

export async function ensureTwilioResourcesForOrganization(params: {
	orgId: string;
	orgName: string;
	twilioSubaccountSid?: string | null;
	twilioMessagingServiceSid?: string | null;
	twilioTwimlAppSid?: string | null;
	twilioApiKeySid?: string | null;
	twilioApiKeySecret?: string | null;
}) {
	const { orgId, orgName } = params;

	// 1) Ensure subaccount
	const subaccountSid = await ensureTwilioSubaccount(orgId, orgName, params.twilioSubaccountSid);

  // Helper to create a subaccount-scoped client
  const makeSubClient = (subSid: string, subAuthToken?: string) => {
    if (subAuthToken) {
      return twilio(subSid, subAuthToken);
    }
    return twilio(PARENT_ACCOUNT_SID, PARENT_AUTH_TOKEN, { accountSid: subSid });
  };
  const subClient = makeSubClient(subaccountSid);

	// 2) Ensure API Key/Secret in subaccount (for Access Tokens)
  let apiKeySid = params.twilioApiKeySid || null;
  let apiKeySecret = params.twilioApiKeySecret || null;
  if (!apiKeySid || !apiKeySecret) {
    try {
      // Create API key directly in the subaccount context
      const keyCreator = subClient as unknown as {
        newKeys: { create: (args: { friendlyName: string }) => Promise<{ sid: string; secret: string }> };
      };
      const apiKey = await keyCreator.newKeys.create({ friendlyName: `Org ${orgId} Voice Web` });
      apiKeySid = apiKey.sid;
      apiKeySecret = apiKey.secret;
    } catch (e) {
      console.error('[twilioProvisioning] Failed to create API key for subaccount', e);
    }
  }

	// 3) Ensure TwiML App in subaccount
	let twimlAppSid = params.twilioTwimlAppSid || null;
  if (!twimlAppSid && VOICE_WEBHOOK_URL) {
    try {
      // Create TwiML App directly in the subaccount context
      const appCreator = subClient as unknown as {
        applications: {
          create: (args: {
            friendlyName: string;
            voiceUrl?: string;
            voiceMethod?: string;
            statusCallback?: string;
            statusCallbackMethod?: string;
          }) => Promise<{ sid: string }>;
        };
      };
      const app = await appCreator.applications.create({
        friendlyName: `Org ${orgId} Voice App`,
        voiceUrl: VOICE_WEBHOOK_URL,
        voiceMethod: 'POST',
        statusCallback: STATUS_CALLBACK_URL,
        statusCallbackMethod: STATUS_CALLBACK_URL ? 'POST' : undefined
      });
      twimlAppSid = app.sid;
    } catch (e) {
      console.error('[twilioProvisioning] Failed to create TwiML App for subaccount', e);
    }
  }

	// 4) Ensure Messaging Service (existing behavior)
	const messagingServiceSid = await ensureTwilioMessagingService({
		orgId,
		orgName,
		subaccountSid,
		existingServiceSid: params.twilioMessagingServiceSid
	});

	console.log("h123232")

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


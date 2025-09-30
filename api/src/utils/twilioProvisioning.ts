import { supabase } from './supabaseClient';
import { twilioClient, getTwilioClientForSubaccount } from './twilioClient';

const PUBLIC_URL = process.env.PUBLIC_URL;

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

	const subClient = getTwilioClientForSubaccount({ accountSid: subaccountSid });
	const friendlyName = buildFriendlyName(`${orgName} Messaging`, orgId);

	const service = await subClient.messaging.v1.services.create({
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
}) {
	const { orgId, orgName, twilioSubaccountSid, twilioMessagingServiceSid } = params;

	const subaccountSid = await ensureTwilioSubaccount(orgId, orgName, twilioSubaccountSid);
	const messagingServiceSid = await ensureTwilioMessagingService({
		orgId,
		orgName,
		subaccountSid,
		existingServiceSid: twilioMessagingServiceSid
	});

	return { subaccountSid, messagingServiceSid };
}


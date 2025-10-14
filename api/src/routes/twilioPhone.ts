import { Router } from 'express';
import { supabase } from '../utils/supabaseClient';
import { requireAuth } from '../middleware/auth';
import { getTwilioClientForSubaccount, twilioClient } from '../utils/twilioClient';
import { ensureTwilioResourcesForOrganization } from '../utils/twilioProvisioning';

const router = Router();

// Webhooks are set at Messaging Service and TwiML App; avoid per-number overrides

// List available phone numbers (parent account only, no provisioning)
router.get('/organizations/:organizationId/phone-numbers/available', async (req, res) => {
  try {
    const { areaCode, tollFree } = req.query as { areaCode?: string; tollFree?: string };

    const search: Record<string, unknown> = {};
    if (areaCode) search.areaCode = String(areaCode);

    const numbers = String(tollFree) === 'true'
      ? await twilioClient.availablePhoneNumbers('US').tollFree.list(search as never)
      : await twilioClient.availablePhoneNumbers('US').local.list(search as never);

    res.json({ available: (numbers || []).map((n) => ({ phoneNumber: n.phoneNumber })) });
  } catch (error) {
    console.error('[twilioPhone] list available error', error);
    res.status(500).json({ error: 'Failed to list available numbers' });
  }
});

router.use(requireAuth);

router.get('/organizations/:organizationId/phone-numbers', async (req, res) => {
	const { organizationId } = req.params;

	try {
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, twilio_subaccount_sid, twilio_messaging_service_sid, twilio_twiml_app_sid, twilio_api_key_sid, twilio_api_key_secret')
			.eq('id', organizationId)
			.single();

		if (orgError || !organization) {
			return res.status(404).json({ error: 'Organization not found' });
		}

		const { data: numbers, error: numbersError } = await supabase
			.from('phone_numbers')
			.select('id, org_id, seat_id, phone_number, sid, capabilities, status, voice_webhook_url, sms_webhook_url, created_at, updated_at')
			.eq('org_id', organizationId)
			.order('created_at', { ascending: true });

		if (numbersError) {
			console.error('[twilioPhone] failed to load phone numbers', numbersError);
			return res.status(500).json({ error: 'Failed to load phone numbers' });
		}

		return res.json({
			organization: {
				id: organization.id,
				name: organization.name,
				twilioSubaccountSid: organization.twilio_subaccount_sid,
				twilioMessagingServiceSid: organization.twilio_messaging_service_sid
			},
			numbers: numbers ?? []
		});
	} catch (error) {
		console.error('[twilioPhone] error listing phone numbers', error);
		return res.status(500).json({ error: 'Failed to load phone numbers' });
	}
});

router.post('/organizations/:organizationId/phone-numbers', async (req, res) => {
	const { organizationId } = req.params;
	const { areaCode, tollFree, capabilities } = req.body ?? {};

	try {
		const { data: organization, error: orgError } = await supabase
			.from('organizations')
			.select('id, name, twilio_subaccount_sid, twilio_messaging_service_sid')
			.eq('id', organizationId)
			.single();

		if (orgError || !organization) {
			return res.status(404).json({ error: 'Organization not found' });
		}

    const { subaccountSid, messagingServiceSid, twimlAppSid, apiKeySid, apiKeySecret } = await ensureTwilioResourcesForOrganization({
			orgId: organization.id,
			orgName: organization.name,
			twilioSubaccountSid: organization.twilio_subaccount_sid,
			twilioMessagingServiceSid: organization.twilio_messaging_service_sid,
			twilioTwimlAppSid: organization.twilio_twiml_app_sid,
			twilioApiKeySid: (organization as any).twilio_api_key_sid,
			twilioApiKeySecret: (organization as any).twilio_api_key_secret
		});

    const subClient = getTwilioClientForSubaccount({
      accountSid: subaccountSid,
      apiKeySid: apiKeySid || undefined,
      apiKeySecret: apiKeySecret || undefined
    });

		const searchCapabilities = {
			smsEnabled: capabilities?.sms !== false,
			voiceEnabled: capabilities?.voice !== false,
			mmsEnabled: capabilities?.mms === true
		};

		const numberSearchParams: Record<string, unknown> = {
			...searchCapabilities
		};

		if (!tollFree && typeof areaCode === 'string' && areaCode.trim()) {
			numberSearchParams.areaCode = areaCode.trim();
		}

    const availableNumbers = tollFree
      ? await twilioClient.availablePhoneNumbers('US').tollFree.list(numberSearchParams as never)
      : await twilioClient.availablePhoneNumbers('US').local.list(numberSearchParams as never);

		const numberToPurchase = availableNumbers?.[0];

		if (!numberToPurchase?.phoneNumber) {
			return res.status(400).json({ error: 'No available phone numbers found for the requested criteria' });
		}

		const baseWebhook = BASE_WEBHOOK_DOMAIN || process.env.PUBLIC_URL?.replace(/\/$/, '') || '';
		const smsWebhookUrl = baseWebhook ? `${baseWebhook}/api/webhooks/twilio/sms-inbound` : undefined;
		const smsStatusCallback = baseWebhook ? `${baseWebhook}/api/webhooks/twilio/sms-status` : undefined;
		const voiceWebhookUrl = baseWebhook ? `${baseWebhook}/api/twilio/voice/call` : undefined;
		const voiceStatusCallback = baseWebhook ? `${baseWebhook}/api/webhooks/twilio/call-status` : undefined;

    const purchasedNumber = await (subClient as any).incomingPhoneNumbers.create({
      phoneNumber: numberToPurchase.phoneNumber,
      // Use TwiML App for voice webhooks; no per-number overrides
      voiceApplicationSid: twimlAppSid || organization.twilio_twiml_app_sid || undefined
    } as never);

    if (messagingServiceSid) {
      await (subClient as any).messaging.v1
        .services(messagingServiceSid)
        .phoneNumbers.create({ phoneNumberSid: purchasedNumber.sid });
    }

		const { data: inserted, error: insertError } = await supabase
			.from('phone_numbers')
      .insert({
				org_id: organization.id,
				seat_id: null,
				phone_number: purchasedNumber.phoneNumber,
				sid: purchasedNumber.sid,
				capabilities: {
					sms: searchCapabilities.smsEnabled,
					voice: searchCapabilities.voiceEnabled,
					mms: searchCapabilities.mmsEnabled
				},
				status: 'available',
        sms_webhook_url: null,
        voice_webhook_url: null
			})
			.select()
			.single();

		if (insertError || !inserted) {
			console.error('[twilioPhone] failed to record new phone number', insertError);
			return res.status(500).json({ error: 'Failed to store purchased phone number' });
		}

		return res.status(201).json({ number: inserted });
	} catch (error) {
		console.error('[twilioPhone] error purchasing phone number', error);
		return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to purchase phone number' });
	}
});

router.post('/organizations/:organizationId/phone-numbers/sync', async (req, res) => {
	const { organizationId } = req.params;
	try {
  const { data: organization, error: orgError } = await supabase
			.from('organizations')
    .select('id, twilio_subaccount_sid, twilio_messaging_service_sid, twilio_api_key_sid, twilio_api_key_secret')
			.eq('id', organizationId)
			.single();
		if (orgError || !organization?.twilio_subaccount_sid) {
			return res.status(400).json({ error: 'Organization missing Twilio subaccount' });
		}

  const subClient = getTwilioClientForSubaccount({
    accountSid: organization.twilio_subaccount_sid,
    apiKeySid: (organization as any).twilio_api_key_sid || undefined,
    apiKeySecret: (organization as any).twilio_api_key_secret || undefined
  });
		const numbersApi = subClient as unknown as {
			incomingPhoneNumbers: {
				list: (args: { limit?: number }) => Promise<Array<{ sid: string; phoneNumber: string; capabilities?: { sms?: boolean; voice?: boolean; mms?: boolean } }>>;
			};
		};

		const PUBLIC_URL = process.env.PUBLIC_URL || '';
		const baseUrl = PUBLIC_URL.replace(/\/$/, '');
		const smsWebhookUrl = baseUrl ? `${baseUrl}/api/webhooks/twilio/sms-inbound` : undefined;
		const voiceWebhookUrl = baseUrl ? `${baseUrl}/api/twilio/voice/call` : undefined;
		const smsStatusCallback = baseUrl ? `${baseUrl}/api/webhooks/twilio/sms-status` : undefined;
		const voiceStatusCallback = baseUrl ? `${baseUrl}/api/webhooks/twilio/call-status` : undefined;

    const existingNumbers = await numbersApi.incomingPhoneNumbers.list({ limit: 200 });
		for (const num of existingNumbers) {
			try {
        // SMS handled by Messaging Service; ensure per-number overrides are cleared
        await (subClient as any).incomingPhoneNumbers(num.sid).update?.({
          smsUrl: null,
          smsMethod: null,
          statusCallback: null,
          voiceUrl: null,
          voiceMethod: null,
          voiceStatusCallback: null,
          voiceStatusCallbackMethod: null
        });
			} catch (err) {
				console.warn('[twilioPhone] failed to update voice status callback for', num.sid, err);
			}
		}

    return res.json({ ok: true, synced: existingNumbers.length });
	} catch (error) {
		console.error('[twilioPhone] error syncing numbers', error);
		return res.status(500).json({ error: 'Failed to sync numbers' });
	}
});

router.post('/organizations/:organizationId/phone-numbers/:phoneNumberId/assign', async (req, res) => {
	const { organizationId, phoneNumberId } = req.params;
	const { seatId } = req.body ?? {};

	if (!seatId) {
		return res.status(400).json({ error: 'Seat ID is required to assign a phone number' });
	}

	try {
		const { data: seat, error: seatError } = await supabase
			.from('seats')
			.select('id, org_id, status')
			.eq('id', seatId)
			.eq('org_id', organizationId)
			.single();

		if (seatError || !seat) {
			return res.status(404).json({ error: 'Seat not found for this organization' });
		}

		if (seat.status !== 'active') {
			return res.status(400).json({ error: 'Seat must be active to assign a phone number' });
		}

		const { data: phoneNumber, error: phoneError } = await supabase
			.from('phone_numbers')
			.select('id, org_id, seat_id, status')
			.eq('id', phoneNumberId)
			.eq('org_id', organizationId)
			.single();

		if (phoneError || !phoneNumber) {
			return res.status(404).json({ error: 'Phone number not found for this organization' });
		}

		if (phoneNumber.status !== 'available' && phoneNumber.seat_id !== seatId) {
			return res.status(400).json({ error: 'Phone number is not available for assignment' });
		}

		const { error: updateError, data: updated } = await supabase
			.from('phone_numbers')
			.update({ seat_id: seatId, status: 'assigned', updated_at: new Date().toISOString() })
			.eq('id', phoneNumberId)
			.eq('org_id', organizationId)
			.select()
			.single();

		if (updateError || !updated) {
			console.error('[twilioPhone] failed to assign phone number', updateError);
			return res.status(500).json({ error: 'Failed to assign phone number' });
		}

		return res.json({ number: updated });
	} catch (error) {
		console.error('[twilioPhone] error assigning phone number', error);
		return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to assign phone number' });
	}
});

router.post('/organizations/:organizationId/phone-numbers/:phoneNumberId/release', async (req, res) => {
	const { organizationId, phoneNumberId } = req.params;

	try {
		const { data: phoneNumber, error: phoneError } = await supabase
			.from('phone_numbers')
			.select('id, org_id, seat_id, sid, status')
			.eq('id', phoneNumberId)
			.eq('org_id', organizationId)
			.single();

		if (phoneError || !phoneNumber) {
			return res.status(404).json({ error: 'Phone number not found for this organization' });
		}

		const { data: organization, error: orgError } = await supabase
			.from('organizations')
			.select('id, twilio_subaccount_sid, twilio_messaging_service_sid')
			.eq('id', organizationId)
			.single();

		if (orgError || !organization?.twilio_subaccount_sid) {
			return res.status(400).json({ error: 'Organization is missing Twilio configuration' });
		}

		const subClient = getTwilioClientForSubaccount({ accountSid: organization.twilio_subaccount_sid });

		if (organization.twilio_messaging_service_sid) {
			try {
				await subClient.messaging.v1
					.services(organization.twilio_messaging_service_sid)
					.phoneNumbers(phoneNumber.sid)
					.remove();
			} catch (serviceDetachError) {
				console.warn('[twilioPhone] failed to detach number from messaging service', serviceDetachError);
			}
		}

		try {
			await subClient.incomingPhoneNumbers(phoneNumber.sid).remove();
		} catch (twilioRemoveError) {
			console.warn('[twilioPhone] failed to remove number from Twilio subaccount', twilioRemoveError);
		}

		const { error: updateError } = await supabase
			.from('phone_numbers')
			.update({ seat_id: null, status: 'released', updated_at: new Date().toISOString() })
			.eq('id', phoneNumberId)
			.eq('org_id', organizationId);

		if (updateError) {
			console.error('[twilioPhone] failed to update phone number status during release', updateError);
			return res.status(500).json({ error: 'Failed to release phone number' });
		}

		return res.json({ ok: true });
	} catch (error) {
		console.error('[twilioPhone] error releasing phone number', error);
		return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to release phone number' });
	}
});

export default router;



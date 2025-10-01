import { Router, Request, Response } from 'express';
import { supabase } from '../../utils/supabaseClient';
import { requireAuth } from '../../middleware/auth';
import { getTwilioClientForSubaccount } from '../../utils/twilioClient';
import { ensureTwilioResourcesForOrganization } from '../../utils/twilioProvisioning';
import twilio from 'twilio';

const router = Router();

// POST /generate-token - Generate Twilio Client token for WebRTC calls
router.post('/generate-token', requireAuth, async (req: Request, res: Response) => {
	try {
    const userId = req.user?.id;

    if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const { data: membership, error: membershipError } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.single();

		if (membershipError || !membership?.organization_id) {
			return res.status(403).json({ error: 'User is not linked to an organization' });
		}

		const orgId = membership.organization_id;

		const { data: orgRow, error: orgError } = await supabase
			.from('organizations')
			.select('id, name, twilio_subaccount_sid, twilio_messaging_service_sid, twilio_twiml_app_sid, twilio_api_key_sid, twilio_api_key_secret')
			.eq('id', orgId)
			.single();

    if (orgError) {
      return res.status(400).json({ error: 'Organization not found' });
    }

		// Auto-provision Twilio resources if missing
		let organization = orgRow as unknown as {
			id: string;
			name: string;
			twilio_subaccount_sid: string | null;
			twilio_messaging_service_sid: string | null;
			twilio_twiml_app_sid?: string | null;
			twilio_api_key_sid?: string | null;
			twilio_api_key_secret?: string | null;
		};
		if (
			!organization?.twilio_subaccount_sid ||
			!organization.twilio_twiml_app_sid ||
			!organization.twilio_api_key_sid ||
			!organization.twilio_api_key_secret
		) {
      try {
				await ensureTwilioResourcesForOrganization({
          orgId: organization.id,
          orgName: organization.name,
					twilioSubaccountSid: organization.twilio_subaccount_sid,
					twilioMessagingServiceSid: organization.twilio_messaging_service_sid,
					twilioTwimlAppSid: organization.twilio_twiml_app_sid,
					twilioApiKeySid: organization.twilio_api_key_sid,
					twilioApiKeySecret: organization.twilio_api_key_secret
        });

        // Refresh organization after provisioning
			const refreshed = await supabase
          .from('organizations')
				.select('id, name, twilio_subaccount_sid, twilio_messaging_service_sid, twilio_twiml_app_sid, twilio_api_key_sid, twilio_api_key_secret')
          .eq('id', orgId)
          .single();
			organization = (refreshed.data as typeof organization) ?? organization;
      } catch (provErr) {
        console.error('Failed to provision Twilio resources on token generation:', provErr);
      }
    }

    if (!organization?.twilio_subaccount_sid) {
      return res.status(400).json({ error: 'Organization is missing Twilio configuration' });
    }

		const { data: seat, error: seatError } = await supabase
			.from('seats')
			.select('id, phone_e164, phone_sid, status')
			.eq('org_id', orgId)
			.eq('user_id', userId)
			.single();

		if (seatError || !seat) {
			return res.status(400).json({ error: 'No active seat assigned to this user' });
		}

	console.log("5")

		const { data: assignedNumber, error: phoneError } = await supabase
			.from('phone_numbers')
			.select('phone_number, capabilities, status')
			.eq('org_id', orgId)
			.eq('seat_id', seat.id)
			.eq('status', 'assigned')
			.single();

		console.log("assignedNumber", seat.id, assignedNumber)
		console.log("phoneError", phoneError)

		if (phoneError || !assignedNumber?.phone_number) {
			return res.status(400).json({ error: 'No phone number assigned to this seat' });
		}

	console.log("1111")

		if (assignedNumber.capabilities?.voice === false) {
			return res.status(400).json({ error: 'Assigned phone number is not voice-enabled' });
		}

	console.log("2222")

		// Use AccessToken + VoiceGrant signed by subaccount API key
		const subaccountSid = organization.twilio_subaccount_sid;
		const twimlAppSid = organization.twilio_twiml_app_sid;
		const apiKeySid = organization.twilio_api_key_sid;
		const apiKeySecret = organization.twilio_api_key_secret;

		console.log("here", subaccountSid, twimlAppSid, apiKeySid, apiKeySecret)

		if (!subaccountSid || !twimlAppSid || !apiKeySid || !apiKeySecret) {
			return res.status(500).json({ error: 'Twilio environment is not fully configured' });
		}

	console.log("6")

		const AccessToken = twilio.jwt.AccessToken;
		const VoiceGrant = AccessToken.VoiceGrant;
    	const identity = `agent_${userId}`;
		const ttlSeconds = 3600;
		const tokenBuilder = new AccessToken(subaccountSid, apiKeySid, apiKeySecret, { identity, ttl: ttlSeconds });
		const grant = new VoiceGrant({ outgoingApplicationSid: twimlAppSid, incomingAllow: true });
		tokenBuilder.addGrant(grant);
		const token = tokenBuilder.toJwt();

		const payload = JSON.parse(atob(token.split('.')[1]));
		console.log("here payload", payload)
		console.log(payload.grants.identity);
		console.log(payload.grants.identity === `agent_${userId}`); // should be true

		const subClient = getTwilioClientForSubaccount({ accountSid: organization.twilio_subaccount_sid });
		const configuration = await subClient.api.v2010.accounts(organization.twilio_subaccount_sid).fetch();

		return res.json({
			token,
			identity,
			expiresAt: Date.now() + 60 * 60 * 1000,
			orgId,
			seatId: seat.id,
			phoneNumber: assignedNumber.phone_number,
			twilioSubaccountSid: organization.twilio_subaccount_sid,
			friendlyName: configuration.friendlyName
		});
	} catch (error) {
		console.error('Error generating Twilio token:', error);
		return res.status(500).json({ error: 'Failed to generate token' });
	}
});

export default router;

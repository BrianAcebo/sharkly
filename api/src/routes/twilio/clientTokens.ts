import { Router, Request, Response } from 'express';
import { supabase } from '../../utils/supabaseClient.js';
import { requireAuth } from '../../middleware/auth.js';
import { ensureTwilioResourcesForOrganization } from '../../utils/twilioProvisioning.js';
import twilio from 'twilio';

const router = Router();

type OrgRow = {
  id: string;
  name: string;
  org_status: string | null;
  twilio_subaccount_sid: string | null;
  twilio_messaging_service_sid: string | null;
  twilio_twiml_app_sid: string | null;
  twilio_api_key_sid: string | null;
  twilio_api_key_secret: string | null;
};

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
      .select('id, name, org_status, twilio_subaccount_sid, twilio_messaging_service_sid, twilio_twiml_app_sid, twilio_api_key_sid, twilio_api_key_secret')
			.eq('id', orgId)
			.single();

    if (orgError || !orgRow) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const org = orgRow as OrgRow;
    if (!['active', 'trialing'].includes(String(org.org_status || '').toLowerCase())) {
      return res.status(400).json({ error: 'Organization setup is not complete yet' });
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
    // Ensure Twilio core resources without purchasing anything
    try {
      const ensured = await ensureTwilioResourcesForOrganization({
        orgId: org.id,
        orgName: org.name,
        twilioSubaccountSid: org.twilio_subaccount_sid,
        twilioMessagingServiceSid: org.twilio_messaging_service_sid,
        twilioTwimlAppSid: org.twilio_twiml_app_sid,
        twilioApiKeySid: org.twilio_api_key_sid,
        twilioApiKeySecret: org.twilio_api_key_secret,
        preventPurchases: true
      });
      organization = {
        ...organization,
        twilio_subaccount_sid: ensured.subaccountSid,
        twilio_messaging_service_sid: ensured.messagingServiceSid,
        twilio_twiml_app_sid: ensured.twimlAppSid,
        twilio_api_key_sid: ensured.apiKeySid,
        twilio_api_key_secret: ensured.apiKeySecret
      };
    } catch (provErr: unknown) {
      const err = provErr as { message?: string };
      console.error('[twilioToken] ensure resources failed', { orgId, error: err?.message ?? String(provErr) });
      return res.status(500).json({ error: 'Twilio provisioning failed' });
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

    const { data: assignedNumber, error: phoneError } = await supabase
			.from('phone_numbers')
			.select('phone_number, capabilities, status')
			.eq('org_id', orgId)
			.eq('seat_id', seat.id)
			.eq('status', 'assigned')
			.single();

		if (phoneError || !assignedNumber?.phone_number) {
			return res.status(400).json({ error: 'No phone number assigned to this seat' });
		}

		if (assignedNumber.capabilities?.voice === false) {
			return res.status(400).json({ error: 'Assigned phone number is not voice-enabled' });
		}

		// Use AccessToken + VoiceGrant signed by subaccount API key
		const subaccountSid = organization.twilio_subaccount_sid;
		const twimlAppSid = organization.twilio_twiml_app_sid;
		const apiKeySid = organization.twilio_api_key_sid;
		const apiKeySecret = organization.twilio_api_key_secret;

		if (!subaccountSid || !twimlAppSid || !apiKeySid || !apiKeySecret) {
			return res.status(500).json({ error: 'Twilio environment is not fully configured' });
		}

    const AccessToken = twilio.jwt.AccessToken;
		const VoiceGrant = AccessToken.VoiceGrant;
    	const identity = `agent_${userId}`;
		const ttlSeconds = 3600;
    const tokenBuilder = new AccessToken(subaccountSid, apiKeySid, apiKeySecret, { identity, ttl: ttlSeconds });
		const grant = new VoiceGrant({ outgoingApplicationSid: twimlAppSid, incomingAllow: true });
		tokenBuilder.addGrant(grant);
		const token = tokenBuilder.toJwt();

    // Optional: reachability check could go here; avoid logging secrets

		return res.json({
			token,
			identity,
			expiresAt: Date.now() + 60 * 60 * 1000,
			orgId,
			seatId: seat.id,
			phoneNumber: assignedNumber.phone_number,
			twilioSubaccountSid: organization.twilio_subaccount_sid,
      // friendlyName intentionally omitted to avoid leaking account metadata
		});
	} catch (error) {
		console.error('Error generating Twilio token:', error);
		return res.status(500).json({ error: 'Failed to generate token' });
	}
});

export default router;

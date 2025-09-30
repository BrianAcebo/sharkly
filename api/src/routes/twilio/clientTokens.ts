import { Router, Request, Response } from 'express';
import { supabase } from '../../utils/supabaseClient';
import { requireAuth } from '../../middleware/auth';
import { getTwilioClientForSubaccount } from '../../utils/twilioClient';
import twilio from 'twilio';

const router = Router();

// POST /generate-token - Generate Twilio Client token for WebRTC calls
router.post('/generate-token', requireAuth, async (req: Request, res: Response) => {
	try {
		const userId = req.userId;

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

		const { data: organization, error: orgError } = await supabase
			.from('organizations')
			.select('id, name, twilio_subaccount_sid, twilio_messaging_service_sid')
			.eq('id', orgId)
			.single();

		if (orgError || !organization?.twilio_subaccount_sid) {
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

		const twilioSubaccountSid = organization.twilio_subaccount_sid;
		const authToken = process.env.TWILIO_AUTH_TOKEN;
		const twimlAppSid = process.env.TWILIO_APPLICATION_SID;

		if (!twilioSubaccountSid || !authToken || !twimlAppSid) {
			return res.status(500).json({ error: 'Twilio environment is not fully configured' });
		}

		const capability = new twilio.jwt.ClientCapability({
			accountSid: twilioSubaccountSid,
			authToken
		});

		capability.addScope(
			new twilio.jwt.ClientCapability.OutgoingClientScope({
				applicationSid: twimlAppSid,
				params: {
					agentId: userId,
					orgId,
					seatId: seat.id
				}
			})
		);

		capability.addScope(
			new twilio.jwt.ClientCapability.IncomingClientScope(`org_${orgId}_agent_${userId}`)
		);

		const token = capability.toJwt();

		const subClient = getTwilioClientForSubaccount({ accountSid: twilioSubaccountSid });
		const configuration = await subClient.api.v2010.accounts(twilioSubaccountSid).fetch();

		return res.json({
			token,
			expiresAt: Date.now() + 60 * 60 * 1000,
			orgId,
			seatId: seat.id,
			phoneNumber: assignedNumber.phone_number,
			twilioSubaccountSid,
			friendlyName: configuration.friendlyName
		});
	} catch (error) {
		console.error('Error generating Twilio token:', error);
		return res.status(500).json({ error: 'Failed to generate token' });
	}
});

export default router;

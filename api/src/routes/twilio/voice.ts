import { Router, Request, Response } from 'express';
import 'dotenv/config';
import twilio from 'twilio';
import { supabase } from '../../utils/supabaseClient';
import { verifyTwilio } from '../../middleware/twilio';

console.log('[voice router LOADED]', import.meta.url);


const router = Router();

const E164 = /^\+\d{7,15}$/;

const toE164 = (n?: string) => {
	if (!n) return '';
	const s = String(n).trim();
	if (!s) return '';
	return s.startsWith('+') ? s : `+${s.replace(/\D/g, '')}`;
};

async function getAgentsActivePhoneNumber(agentId: string): Promise<string | null> {
	if (!supabase) return null;

	const { data, error } = await supabase
		.from('agent_phone_numbers')
		.select('phone_number')
		.eq('agent_id', agentId)
		.eq('is_active', true)
		.limit(1)
		.single();

	if (error || !data?.phone_number) {
		console.warn('[voice] no active phone number for agent:', agentId, error);
		return null;
	}

	const e164 = toE164(data.phone_number);
	return E164.test(e164) ? e164 : null;
}

// Call history creation moved to frontend

/**
 * POST /api/twilio/voice/call
 * - Twilio hits this when your browser runs Device.connect({ params: { To } }).
 * - We bind callerId to the authenticated agent identity (ClientName="agent_<id>").
 * - In dev, you can test with: ?dev=1&from=+E164 and -d "To=+E164".
 */
router.post('/call', verifyTwilio, async (req: Request, res: Response) => {
  console.log('[voice handler ENTER]', import.meta.url);

  const devBypass = process.env.ALLOW_DEV_WEBHOOKS === 'true'
  
	const identityRaw =
		(req.body?.ClientName as string | undefined) || (req.body?.From as string | undefined) || '';
	const identity = identityRaw.replace(/^client:/, ''); // e.g. "agent_123"
	const to = toE164(req.body?.To);

	// Determine callerId
	let callerId = '';
	if (devBypass) {
		callerId = toE164((req.query.from as string | undefined) || process.env.TWILIO_PHONE_NUMBER);
	} else {
		// Require identity = agent_<id>
		if (!identity || !/^agent_/.test(identity)) {
			const vr = new twilio.twiml.VoiceResponse();
			vr.say('Unauthorized caller.');
			return res.type('text/xml').send(vr.toString());
		}
		const agentId = identity.slice(6); // strip "agent_"
		const lookedUp = await getAgentsActivePhoneNumber(agentId);
		callerId = toE164(lookedUp || '');
	}

	const vr = new twilio.twiml.VoiceResponse();

	if (!E164.test(to) || !E164.test(callerId)) {
		vr.say('Invalid to or from.');
		return res.type('text/xml').send(vr.toString());
	}

	// Build TwiML
	const dial = vr.dial({
		callerId,
		answerOnBridge: true
	});

  const baseHost =
  process.env.WEBHOOK_PUBLIC_HOST ||
  process.env.NGROK_DOMAIN ||
  (req.headers['x-forwarded-host'] as string) ||
  (req.headers.host as string);

const statusCallback = `https://${String(baseHost).replace(/\/+$/, '')}/api/webhooks/twilio/call-status`;

console.log('[voice] using statusCallback:', statusCallback);

	// Status callbacks belong on <Number> (not <Dial>)
	dial.number(
		{
			statusCallback,
			statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
			statusCallbackMethod: 'POST'
		},
		to
	);

	// Call history is now created by frontend

	return res.type('text/xml').send(vr.toString());
});

export default router;

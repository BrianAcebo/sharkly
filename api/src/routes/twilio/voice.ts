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

async function resolveDialConfiguration(agentId: string, toNumber: string) {
  const { data: membership, error: membershipError } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', agentId)
    .single();

  if (membershipError || !membership?.organization_id) {
    console.warn('[voice] agent is not linked to organization', agentId, membershipError);
    return null;
  }

  const orgId = membership.organization_id;

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id, twilio_subaccount_sid')
    .eq('id', orgId)
    .single();

  if (orgError || !organization?.twilio_subaccount_sid) {
    console.warn('[voice] organization missing Twilio subaccount', orgId, orgError);
    return null;
  }

  const { data: seat, error: seatError } = await supabase
    .from('seats')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', agentId)
    .eq('status', 'active')
    .single();

  if (seatError || !seat?.id) {
    console.warn('[voice] agent has no active seat', agentId, seatError);
    return null;
  }

  const { data: phoneNumber, error: phoneError } = await supabase
    .from('phone_numbers')
    .select('phone_number, capabilities')
    .eq('org_id', orgId)
    .eq('seat_id', seat.id)
    .eq('status', 'assigned')
    .single();

  if (phoneError || !phoneNumber?.phone_number) {
    console.warn('[voice] seat has no assigned phone number', seat.id, phoneError);
    return null;
  }

  if (phoneNumber.capabilities?.voice === false) {
    console.warn('[voice] assigned number is not voice capable', seat.id);
    return null;
  }

  const dialFrom = toE164(phoneNumber.phone_number);
  const dialTo = toE164(toNumber);

  if (!E164.test(dialFrom) || !E164.test(dialTo)) {
    console.warn('[voice] invalid E.164 numbers from/to', dialFrom, dialTo);
    return null;
  }

  return {
    orgId,
    subaccountSid: organization.twilio_subaccount_sid,
    fromNumber: dialFrom,
    toNumber: dialTo
  };
}

// Call history creation moved to frontend

/**
 * POST /api/twilio/voice/call
 * - Twilio hits this when your browser runs Device.connect({ params: { To } }).
 * - We bind callerId to the authenticated agent identity (ClientName="agent_<id>").
 * - In dev, you can test with: ?dev=1&from=+E164 and -d "To=+E164".
 */
router.post('/call', verifyTwilio, async (req: Request, res: Response) => {
  try {
    console.log('[voice handler ENTER]', { url: req.originalUrl, body: req.body, headers: { host: req.headers.host, xfwd: req.headers['x-forwarded-host'], proto: req.headers['x-forwarded-proto'] } });

    const identityRaw =
      (req.body?.ClientName as string | undefined) ||
      (req.body?.Caller as string | undefined) ||
      (req.body?.From as string | undefined) ||
      '';
    const identity = identityRaw.replace(/^client:/, '').trim();
    // Accept formats:
    //  - agent_<uuid>
    //  - org_<org>_agent_<uuid>
    //  - <uuid>
    const agentMatch =
      identity.match(/agent_([0-9a-fA-F-]{36})\b/) ||
      identity.match(/^([0-9a-fA-F-]{36})$/);
    let agentId = agentMatch ? agentMatch[1] : '';
    // Fallback: derive agent by matching the assigned seat from the From number
    if (!agentId) {
      const fromE164 = toE164(req.body?.From);
      if (E164.test(fromE164)) {
        const { data: seatOwner } = await supabase
          .from('phone_numbers')
          .select('seat_id, seats!inner(user_id)')
          .eq('phone_number', fromE164)
          .eq('status', 'assigned')
          .single();
        agentId = (seatOwner as unknown as { seats?: { user_id?: string } }).seats?.user_id || '';
      }
    }
    if (!agentId) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say('Unauthorized caller.');
      return res.type('text/xml').send(vr.toString());
    }
    const toParam = (req.body?.To as string | undefined) || (req.body?.to as string | undefined) || '';

    const resolved = await resolveDialConfiguration(agentId, toParam);
    if (!resolved || !resolved.fromNumber || !resolved.toNumber) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say('Unable to place call. Please configure a phone number for this seat.');
      return res.type('text/xml').send(vr.toString());
    }

    const callerId = resolved.fromNumber;
    const to = resolved.toNumber;

    const vr = new twilio.twiml.VoiceResponse();
    if (!E164.test(to) || !E164.test(callerId)) {
      vr.say('Invalid to or from number format.');
      return res.type('text/xml').send(vr.toString());
    }

    const dial = vr.dial({ callerId, answerOnBridge: true });

    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    const baseHost =
      process.env.WEBHOOK_PUBLIC_HOST ||
      process.env.NGROK_DOMAIN ||
      (req.headers['x-forwarded-host'] as string) ||
      (req.headers.host as string);
    const statusCallback = `${proto}://${String(baseHost).replace(/\/+$/, '')}/api/webhooks/twilio/call-status`;
    console.log('[voice] statusCallback:', statusCallback, 'callerId:', callerId, 'to:', to);

    dial.number({
      statusCallback,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    }, to);

    return res.type('text/xml').send(vr.toString());
  } catch (err) {
    console.error('[voice] TwiML error:', err);
    const vr = new twilio.twiml.VoiceResponse();
    vr.say('An application error occurred while placing the call.');
    return res.type('text/xml').send(vr.toString());
  }
});

export default router;

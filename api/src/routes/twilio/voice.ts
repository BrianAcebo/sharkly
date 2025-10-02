import { Router, Request, Response } from 'express';
import 'dotenv/config';
import twilio from 'twilio';
import { supabase } from '../../utils/supabaseClient';
import { verifyTwilio } from '../../middleware/twilio';
import { isEmergencyNumber } from '../../utils/utils';

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

async function handleInboundCall(req: Request, res: Response, statusCallback: string) {
  const vr = new twilio.twiml.VoiceResponse();

  const callSid = (req.body?.CallSid as string | undefined) || '';
  const rawTo = (req.body?.To as string | undefined) || (req.body?.Called as string | undefined) || '';
  const rawFrom = (req.body?.From as string | undefined) || '';

  const toNumber = toE164(rawTo);
  const fromNumber = toE164(rawFrom);

  if (!E164.test(toNumber) || !E164.test(fromNumber)) {
    console.warn('[voice] inbound call with invalid numbers', { rawTo, rawFrom, toNumber, fromNumber });
    vr.say('We are unable to process your call right now.');
    return res.type('text/xml').send(vr.toString());
  }

  const { data: phoneNumberRecord, error: phoneError } = await supabase
    .from('phone_numbers')
    .select('id, org_id, seat_id, status, capabilities')
    .eq('phone_number', toNumber)
    .eq('status', 'assigned')
    .maybeSingle();

  if (phoneError || !phoneNumberRecord) {
    console.warn('[voice] inbound call to unassigned number', { toNumber, phoneError });
    vr.say('This number is not configured to receive calls.');
    return res.type('text/xml').send(vr.toString());
  }

  const { org_id: organizationId, seat_id: seatId } = phoneNumberRecord;

  if (phoneNumberRecord.capabilities?.voice === false) {
    console.warn('[voice] inbound call to non-voice number', { toNumber });
    vr.say('This number cannot receive voice calls.');
    return res.type('text/xml').send(vr.toString());
  }

  if (!seatId) {
    console.warn('[voice] inbound call to number without assigned seat', { toNumber, organizationId });
    vr.say('No agent is currently assigned to this number.');
    return res.type('text/xml').send(vr.toString());
  }

  const { data: seat, error: seatError } = await supabase
    .from('seats')
    .select('id, user_id, status')
    .eq('id', seatId)
    .eq('org_id', organizationId)
    .single();

  if (seatError || !seat?.user_id || seat.status !== 'active') {
    console.warn('[voice] inbound call to seat without active user', { seatId, organizationId, seatError });
    vr.say('We are unable to reach the assigned agent.');
    return res.type('text/xml').send(vr.toString());
  }

  const agentId = seat.user_id;

  let leadId: string | null = null;
  let leadName: string | null = null;
  try {
    const digitsOnly = fromNumber.replace(/\D/g, '');
    const phoneVariants = [
      fromNumber,
      digitsOnly,
      `+${digitsOnly}`,
      digitsOnly.startsWith('1') ? `+${digitsOnly}` : `+1${digitsOnly}`,
      digitsOnly.startsWith('1') ? digitsOnly.slice(1) : digitsOnly
    ].filter(Boolean) as string[];

    const { data: lead } = await supabase
      .from('leads')
      .select('id, name, phone')
      .eq('organization_id', organizationId)
      .or(phoneVariants.map((phone) => `phone.eq.${phone}`).join(','))
      .maybeSingle();

    if (lead) {
      leadId = lead.id;
      leadName = lead.name || null;
    }
  } catch (leadLookupError) {
    console.warn('[voice] failed to lookup lead for inbound call', { fromNumber, organizationId, leadLookupError });
  }

  let callRecordId: string | null = null;
  try {
    const { data: callRecord, error: insertError } = await supabase
      .from('call_history')
      .insert({
        twilio_call_sid: callSid,
        call_direction: 'inbound',
        from_number: fromNumber,
        to_number: toNumber,
        agent_id: agentId,
        organization_id: organizationId,
        lead_id: leadId,
        call_status: 'initiated',
        call_start_time: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('[voice] failed to create inbound call history record', insertError);
    } else if (callRecord) {
      callRecordId = callRecord.id;
      console.log('[voice] inbound call history record created', {
        callRecordId,
        callSid,
        agentId,
        organizationId
      });
    }
  } catch (historyError) {
    console.error('[voice] exception creating inbound call history record', historyError);
  }

  const identity = `agent_${agentId}`;
  const dial = vr.dial({
    answerOnBridge: true,
    timeout: 45,
    statusCallback,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    statusCallbackMethod: 'POST'
  });

  const client = dial.client(identity);
  client.parameter({ name: 'direction', value: 'inbound' });
  client.parameter({ name: 'from_number', value: fromNumber });
  client.parameter({ name: 'twilio_call_sid', value: callSid });
  if (callRecordId) {
    client.parameter({ name: 'call_history_id', value: callRecordId });
  }
  if (leadId) {
    client.parameter({ name: 'lead_id', value: leadId });
  }
  if (leadName) {
    client.parameter({ name: 'lead_name', value: leadName });
  }

  console.log('[voice] inbound call bridged to agent client', {
    callSid,
    identity,
    fromNumber,
    toNumber,
    callRecordId
  });

  return res.type('text/xml').send(vr.toString());
}

/**
 * POST /api/twilio/voice/call
 * - Twilio hits this when your browser runs Device.connect({ params: { To } }).
 * - We bind callerId to the authenticated agent identity (ClientName="agent_<id>").
 * - In dev, you can test with: ?dev=1&from=+E164 and -d "To=+E164".
 */
router.post('/call', verifyTwilio, async (req: Request, res: Response) => {
  try {
    console.log('[voice handler ENTER]', { url: req.originalUrl, body: req.body, headers: { host: req.headers.host, xfwd: req.headers['x-forwarded-host'], proto: req.headers['x-forwarded-proto'] } });

    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    const baseHost =
      process.env.WEBHOOK_PUBLIC_HOST ||
      process.env.NGROK_DOMAIN ||
      (req.headers['x-forwarded-host'] as string) ||
      (req.headers.host as string);
    const statusCallback = `${proto}://${String(baseHost).replace(/\/+$/, '')}/api/webhooks/twilio/call-status`;

    const directionParam = (req.body?.Direction as string | undefined)?.toLowerCase();

    const identityRaw =
      (req.body?.ClientName as string | undefined) ||
      (req.body?.Caller as string | undefined) ||
      (req.body?.From as string | undefined) ||
      '';
    const identity = identityRaw.replace(/^client:/, '').trim();

    const looksLikeClient = Boolean(identityRaw && identityRaw.startsWith('client:')) || identity.startsWith('agent_');

    const shouldTreatAsInbound =
      !looksLikeClient &&
      (!req.body?.ClientName || req.body.ClientName === '') &&
      (!req.body?.Caller || !String(req.body.Caller).startsWith('client:')) &&
      (directionParam === 'inbound' || directionParam === 'incoming' || !directionParam);

    if (shouldTreatAsInbound) {
      return await handleInboundCall(req, res, statusCallback);
    }

    const agentMatch =
      identity.match(/agent_([0-9a-fA-F-]{36})\b/) ||
      identity.match(/^([0-9a-fA-F-]{36})$/);
    let agentId = agentMatch ? agentMatch[1] : '';

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

    if (isEmergencyNumber(toParam)) {
      const vrEmergency = new twilio.twiml.VoiceResponse();
      vrEmergency.say('Emergency calling is not available in this application. Please use a traditional phone.');
      return res.type('text/xml').send(vrEmergency.toString());
    }

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

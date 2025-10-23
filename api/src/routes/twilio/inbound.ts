import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../utils/supabaseClient.js';

// Phone number normalization utility
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it's a US number without country code, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it already has country code, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it's already in E.164 format, return as is
  if (digits.startsWith('1') && digits.length === 11) {
    return `+${digits}`;
  }
  
  // Default: add +1 for US numbers
  return `+1${digits}`;
}

const router = Router();

// Validation schema for Twilio webhook data
const twilioWebhookSchema = z.object({
  From: z.string(),
  To: z.string(),
  Body: z.string(),
  MessageSid: z.string(),
  MessagingServiceSid: z.string().optional()
});

// POST /webhooks/twilio/sms-inbound
router.post('/webhooks/twilio/sms-inbound', async (req: Request, res: Response) => {
  try {
    // Parse and validate the webhook data
    const webhookData = twilioWebhookSchema.parse(req.body);
    
    console.info('Inbound SMS received:', {
      from: webhookData.From,
      to: webhookData.To,
      body: webhookData.Body.substring(0, 100) + (webhookData.Body.length > 100 ? '...' : ''),
      messageSid: webhookData.MessageSid
    });

    // Normalize phone numbers
    const normalizedTo = normalizePhoneNumber(webhookData.To);
    const normalizedFrom = normalizePhoneNumber(webhookData.From);
    
    const phoneQuery = supabase
      .from('phone_numbers')
      .select('id, org_id, seat_id, phone_number, status, capabilities');

    let phoneNumberRecord: { id: string; org_id: string; seat_id: string | null; phone_number: string } | null = null;

    if (webhookData.MessagingServiceSid) {
      const { data: owningOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('twilio_messaging_service_sid', webhookData.MessagingServiceSid)
        .single();

      if (owningOrg?.id) {
        const { data } = await phoneQuery
          .eq('org_id', owningOrg.id)
          .eq('phone_number', normalizedTo)
          .eq('status', 'assigned')
          .single();
        phoneNumberRecord = data;
      }
    }

    if (!phoneNumberRecord) {
      const { data } = await phoneQuery
        .eq('phone_number', normalizedTo)
        .eq('status', 'assigned')
        .single();
      phoneNumberRecord = data;
    }

    if (!phoneNumberRecord?.seat_id) {
      console.warn(`No assigned phone number found for inbound SMS: ${normalizedTo}`);

      await supabase.from('sms_messages').insert({
        agent_id: '00000000-0000-0000-0000-000000000000',
        phone_number: normalizedTo,
        to_number: normalizedTo,
        from_number: normalizedFrom,
        direction: 'inbound',
        body: webhookData.Body,
        status: 'delivered',
        twilio_sid: webhookData.MessageSid
      });

      return res.status(200).send('OK');
    }

    const { data: seat, error: seatError } = await supabase
      .from('seats')
      .select('id, user_id')
      .eq('id', phoneNumberRecord.seat_id)
      .eq('org_id', phoneNumberRecord.org_id)
      .single();

    let agentId = seat?.user_id ?? null;

    if (seatError || !agentId) {
      console.warn(`Seat missing user assignment for inbound SMS number ${normalizedTo}`);
      agentId = '00000000-0000-0000-0000-000000000000';
    }

    const { error: insertError } = await supabase.from('sms_messages').insert({
      agent_id: agentId,
      phone_number: phoneNumberRecord.phone_number,
      to_number: normalizedTo,
      from_number: normalizedFrom,
      direction: 'inbound',
      body: webhookData.Body,
      status: 'delivered',
      twilio_sid: webhookData.MessageSid,
      org_id: phoneNumberRecord.org_id,
      seat_id: phoneNumberRecord.seat_id
    });

    if (insertError) {
      console.error('Error inserting inbound SMS:', insertError);
      // Still return 200 to Twilio to prevent retries
      return res.status(200).send('OK');
    }

    // Handle special commands
    const body = webhookData.Body.toLowerCase().trim();
    if (body === 'stop' || body === 'unsubscribe') {
      console.info(`STOP command received from ${normalizedFrom} for seat ${phoneNumberRecord.seat_id}`);
      // TODO: Implement consent management
    } else if (body === 'help') {
      console.info(`HELP command received from ${normalizedFrom} for seat ${phoneNumberRecord.seat_id}`);
      // TODO: Send help message back
    }

    console.info(`Inbound SMS processed successfully for organization ${phoneNumberRecord.org_id}`);
    
    // Always return 200 to Twilio to prevent retries
    res.status(200).send('OK');

  } catch (error: unknown) {
    console.error('Error processing inbound SMS webhook:', error);
    
    // Always return 200 to Twilio to prevent retries
    res.status(200).send('OK');
  }
});

export default router;

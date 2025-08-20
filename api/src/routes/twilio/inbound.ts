import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../utils/supabaseClient';

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
  MessageSid: z.string()
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
    
    // Find the agent by the phone number (To field)
    const { data: agentPhoneNumber, error: agentError } = await supabase
      .from('agent_phone_numbers')
      .select('agent_id')
      .eq('phone_number', normalizedTo)
      .eq('is_active', true)
      .single();

    if (agentError || !agentPhoneNumber) {
      console.warn(`No active agent found for phone number: ${normalizedTo}`);
      
      // Still log the message but mark it as a command
      await supabase
        .from('sms_messages')
        .insert({
          agent_id: '00000000-0000-0000-0000-000000000000', // Placeholder for unknown agent
          phone_number: normalizedTo,
          to_number: normalizedTo,
          from_number: normalizedFrom,
          direction: 'inbound',
          body: webhookData.Body,
          status: 'delivered',
          twilio_sid: webhookData.MessageSid
        });
      
      // Always return 200 to Twilio to prevent retries
      return res.status(200).send('OK');
    }

    // Insert the inbound SMS message
    const { error: insertError } = await supabase
      .from('sms_messages')
      .insert({
        agent_id: agentPhoneNumber.agent_id,
        phone_number: normalizedTo,
        to_number: normalizedTo,
        from_number: normalizedFrom,
        direction: 'inbound',
        body: webhookData.Body,
        status: 'delivered',
        twilio_sid: webhookData.MessageSid
      });

    if (insertError) {
      console.error('Error inserting inbound SMS:', insertError);
      // Still return 200 to Twilio to prevent retries
      return res.status(200).send('OK');
    }

    // Handle special commands
    const body = webhookData.Body.toLowerCase().trim();
    if (body === 'stop' || body === 'unsubscribe') {
      console.info(`STOP command received from ${normalizedFrom} for agent ${agentPhoneNumber.agent_id}`);
      // TODO: Implement consent management
    } else if (body === 'help') {
      console.info(`HELP command received from ${normalizedFrom} for agent ${agentPhoneNumber.agent_id}`);
      // TODO: Send help message back
    }

    console.info(`Inbound SMS processed successfully for agent ${agentPhoneNumber.agent_id}`);
    
    // Always return 200 to Twilio to prevent retries
    res.status(200).send('OK');

  } catch (error: unknown) {
    console.error('Error processing inbound SMS webhook:', error);
    
    // Always return 200 to Twilio to prevent retries
    res.status(200).send('OK');
  }
});

export default router;

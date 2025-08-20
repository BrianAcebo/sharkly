import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../utils/supabaseClient';
import { twilioClient } from '../../utils/twilioClient';
import { requireAuth } from '../../middleware/auth';
import { ensureAgentNumber } from '../../utils/ensureAgentNumber';

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

// Validation schema
const sendSmsSchema = z.object({
  to: z.string().min(1, 'Recipient phone number is required'),
  body: z.string().min(1, 'Message body is required').max(1600, 'Message too long')
});

// POST /send
router.post('/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const { to, body } = sendSmsSchema.parse(req.body);
    const agentId = req.userId!;
    
    // Normalize the recipient phone number
    const normalizedTo = normalizePhoneNumber(to);
    
    // Look up agent's active phone number
    let agentPhoneNumber: { phone_number: string } | null = null;
    
    const { data: existingNumber, error: numberError } = await supabase
      .from('agent_phone_numbers')
      .select('phone_number')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .single();

    if (numberError && numberError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw numberError;
    }

    if (existingNumber) {
      agentPhoneNumber = existingNumber;
    } else {
      // Self-heal: agent has no number, provision one automatically
      console.info(`Agent ${agentId} has no active number, auto-provisioning...`);
      
      const provisionResult = await ensureAgentNumber(agentId);
      if (provisionResult.error) {
        return res.status(500).json({
          error: `Failed to provision phone number: ${provisionResult.error}`
        });
      }
      
      agentPhoneNumber = { phone_number: provisionResult.phoneNumber };
      console.info(`Auto-provisioned number ${provisionResult.phoneNumber} for agent ${agentId}`);
    }

    // Insert initial SMS message record
    const { data: smsMessage, error: insertError } = await supabase
      .from('sms_messages')
      .insert({
        agent_id: agentId,
        phone_number: agentPhoneNumber.phone_number,
        to_number: normalizedTo,
        from_number: agentPhoneNumber.phone_number,
        direction: 'outbound',
        body,
        status: 'queued'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting SMS message:', insertError);
      return res.status(500).json({ error: 'Failed to create SMS record' });
    }

    // Send SMS via Twilio
    const twilioMessage = await twilioClient.messages.create({
      from: agentPhoneNumber.phone_number,
      to: normalizedTo,
      body,
      statusCallback: `${process.env.PUBLIC_URL || 'http://localhost:3001'}/webhooks/twilio/sms-status`
    });

    // Update the SMS message with Twilio SID and status
    const { error: updateError } = await supabase
      .from('sms_messages')
      .update({
        twilio_sid: twilioMessage.sid,
        status: 'sent'
      })
      .eq('id', smsMessage.id);

    if (updateError) {
      console.error('Error updating SMS message status:', updateError);
      // Don't fail the request, just log the error
    }

    console.info(`SMS sent successfully to ${normalizedTo} via Twilio SID: ${twilioMessage.sid}`);
    
    res.json({
      success: true,
      messageId: smsMessage.id,
      twilioSid: twilioMessage.sid,
      status: 'sent'
    });

  } catch (error: unknown) {
    console.error('Error sending SMS:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

export default router;

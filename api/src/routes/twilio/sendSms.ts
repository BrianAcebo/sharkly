import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../utils/supabaseClient';
import { getTwilioClientForSubaccount } from '../../utils/twilioClient';
import { requireAuth } from '../../middleware/auth';

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
  body: z.string().min(1, 'Message body is required').max(1600, 'Message too long'),
  lead_id: z.string().optional()
});

// POST /send
router.post('/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const { to, body, lead_id } = sendSmsSchema.parse(req.body);
    const agentId = req.userId!;
    
    // Normalize the recipient phone number
    const normalizedTo = normalizePhoneNumber(to);
    
    // Find lead_id if not provided
    let finalLeadId = lead_id;
    if (!finalLeadId) {
      const { data: leadData } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', normalizedTo)
        .single();
      
      if (leadData) {
        finalLeadId = leadData.id;
        console.info(`Found lead_id ${finalLeadId} for phone number ${normalizedTo}`);
      } else {
        console.info(`No lead found for phone number ${normalizedTo}`);
      }
    }
    
    const { data: membership, error: membershipError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', agentId)
      .single();

    if (membershipError || !membership?.organization_id) {
      return res.status(403).json({ error: 'Agent is not linked to an organization' });
    }

    const orgId = membership.organization_id;

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, twilio_subaccount_sid, twilio_messaging_service_sid')
      .eq('id', orgId)
      .single();

    if (orgError || !organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (!organization.twilio_subaccount_sid || !organization.twilio_messaging_service_sid) {
      return res.status(400).json({ error: 'Organization is missing Twilio configuration' });
    }

    const { data: seat, error: seatError } = await supabase
      .from('seats')
      .select('id, phone_e164, phone_sid, status')
      .eq('org_id', orgId)
      .eq('user_id', agentId)
      .eq('status', 'active')
      .single();

    if (seatError || !seat) {
      return res.status(400).json({ error: 'No active seat assigned to this user' });
    }

    const { data: phoneNumberRecord, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('id, sid, phone_number, capabilities, status')
      .eq('org_id', orgId)
      .eq('seat_id', seat.id)
      .eq('status', 'assigned')
      .single();

    if (phoneError || !phoneNumberRecord) {
      return res.status(400).json({ error: 'No phone number assigned to this seat' });
    }

    if (phoneNumberRecord.capabilities?.sms === false) {
      return res.status(400).json({ error: 'Assigned phone number is not SMS-enabled' });
    }

    // Insert initial SMS message record
    const { data: smsMessage, error: insertError } = await supabase
      .from('sms_messages')
      .insert({
        agent_id: agentId,
        phone_number: phoneNumberRecord.phone_number,
        to_number: normalizedTo,
        from_number: phoneNumberRecord.phone_number,
        direction: 'outbound',
        body,
        status: 'queued',
        lead_id: finalLeadId
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting SMS message:', insertError);
      return res.status(500).json({ error: 'Failed to create SMS record' });
    }

    // Send SMS via Twilio
    const statusCallbackUrl = `${process.env.PUBLIC_URL}/api/webhooks/twilio/sms-status`;
    console.info(`SMS webhook URL: ${statusCallbackUrl}`);

    const twilioClientForOrg = getTwilioClientForSubaccount({ accountSid: organization.twilio_subaccount_sid });

    const twilioMessage = await twilioClientForOrg.messages.create({
      from: phoneNumberRecord.phone_number,
      to: normalizedTo,
      body,
      statusCallback: statusCallbackUrl
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

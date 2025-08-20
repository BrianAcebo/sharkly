import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../utils/supabaseClient';

const router = Router();

// Validation schema for Twilio status webhook data
const statusWebhookSchema = z.object({
  MessageSid: z.string(),
  MessageStatus: z.string()
});

// POST /webhooks/twilio/sms-status
router.post('/webhooks/twilio/sms-status', async (req: Request, res: Response) => {
  try {
    // Parse and validate the webhook data
    const webhookData = statusWebhookSchema.parse(req.body);
    
    console.info('SMS status update received:', {
      messageSid: webhookData.MessageSid,
      status: webhookData.MessageStatus
    });

    // Update the SMS message status in the database
    const { error: updateError } = await supabase
      .from('sms_messages')
      .update({
        status: webhookData.MessageStatus
      })
      .eq('twilio_sid', webhookData.MessageSid);

    if (updateError) {
      console.error('Error updating SMS message status:', updateError);
      // Still return 200 to Twilio to prevent retries
      return res.status(200).send('OK');
    }

    console.info(`SMS status updated successfully for MessageSid: ${webhookData.MessageSid}`);
    
    // Always return 200 to Twilio to prevent retries
    res.status(200).send('OK');

  } catch (error: unknown) {
    console.error('Error processing SMS status webhook:', error);
    
    // Always return 200 to Twilio to prevent retries
    res.status(200).send('OK');
  }
});

export default router;

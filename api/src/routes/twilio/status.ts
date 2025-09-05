import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../utils/supabaseClient';

const router = Router();

// Validation schema for Twilio status webhook data
const statusWebhookSchema = z.object({
  MessageSid: z.string(),
  MessageStatus: z.string() // Accept any status from Twilio
});

// POST /webhooks/twilio/sms-status
router.post('/sms-status', async (req: Request, res: Response) => {
  try {
    console.info('SMS status webhook received:', {
      body: req.body,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
    
    // Parse and validate the webhook data
    const webhookData = statusWebhookSchema.parse(req.body);
    
    console.info('SMS status update received:', {
      messageSid: webhookData.MessageSid,
      status: webhookData.MessageStatus,
      timestamp: new Date().toISOString()
    });

    // Update the SMS message status in the database
    const { data: updatedMessage, error: updateError } = await supabase
      .from('sms_messages')
      .update({
        status: webhookData.MessageStatus
      })
      .eq('twilio_sid', webhookData.MessageSid)
      .select();

    if (updateError) {
      console.error('Error updating SMS message status:', updateError);
      // Still return 200 to Twilio to prevent retries
      return res.status(200).send('OK');
    }

    if (updatedMessage && updatedMessage.length > 0) {
      console.info(`SMS status updated successfully for MessageSid: ${webhookData.MessageSid}`, {
        messageId: updatedMessage[0].id,
        newStatus: webhookData.MessageStatus
      });

      // Track usage when message is delivered (for outbound) or received (for inbound)
      if (webhookData.MessageStatus === 'delivered' || webhookData.MessageStatus === 'received') {
        try {
          const message = updatedMessage[0];
          
          // Determine country code (simplified - you might want to enhance this)
          const countryCode = 'US'; // Default to US, you can enhance this based on phone number
          
          // Track SMS usage for billing
          const usageData = {
            organization_id: message.organization_id,
            agent_id: message.agent_id,
            sms_message_id: message.id,
            twilio_sid: webhookData.MessageSid,
            phone_number: message.phone_number,
            to_number: message.to_number,
            from_number: message.from_number,
            direction: message.direction,
            country_code: countryCode,
            message_count: 1 // Assuming single message for now
          };

          // Call billing API to track usage
          const billingResponse = await fetch(`${process.env.PUBLIC_URL || 'http://localhost:3001'}/api/billing/sms-usage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(usageData)
          });

          if (billingResponse.ok) {
            const billingResult = await billingResponse.json();
            console.info('SMS usage tracked successfully:', {
              messageId: message.id,
              cost: billingResult.costs.total_cost
            });
          } else {
            console.error('Failed to track SMS usage:', await billingResponse.text());
          }
        } catch (billingError) {
          console.error('Error tracking SMS usage:', billingError);
          // Don't fail the webhook if billing tracking fails
        }
      }
    } else {
      console.warn(`No SMS message found with Twilio SID: ${webhookData.MessageSid}`);
    }
    
    // Always return 200 to Twilio to prevent retries
    res.status(200).send('OK');

  } catch (error: unknown) {
    console.error('Error processing SMS status webhook:', error);
    
    // Always return 200 to Twilio to prevent retries
    res.status(200).send('OK');
  }
});

export default router;

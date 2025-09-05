import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../utils/supabaseClient';

const router = Router();

// Validation schema for call status webhook
const callStatusSchema = z.object({
  CallSid: z.string(),
  CallStatus: z.string(),
  CallDuration: z.string().optional(),
  From: z.string().optional(),
  To: z.string().optional()
});

// POST /webhooks/twilio/call-status
router.post('/call-status', async (req: Request, res: Response) => {
  try {
    const webhookData = callStatusSchema.parse(req.body);
    
    console.info('Call status update received:', {
      callSid: webhookData.CallSid,
      status: webhookData.CallStatus,
      duration: webhookData.CallDuration,
      from: webhookData.From,
      to: webhookData.To
    });

    // Handle call history updates based on status
    await handleCallStatusUpdate(webhookData);

    // Always return 200 to Twilio
    res.status(200).send('OK');

  } catch (error) {
    console.error('Error processing call status webhook:', error);
    
    // Always return 200 to Twilio to prevent retries
    res.status(200).send('OK');
  }
});

// Helper function to handle call status updates
async function handleCallStatusUpdate(webhookData: { CallSid: string; CallStatus: string; CallDuration?: string; From?: string; To?: string }) {
  const { CallSid, CallStatus, CallDuration, From, To } = webhookData;
  
  try {
    // First, try to find record by Twilio Call SID
    let { data: existingRecord } = await supabase
      .from('call_history')
      .select('*')
      .eq('twilio_call_sid', CallSid)
      .single();

    // If not found by SID, try to find by phone numbers (for records with temporary SIDs)
    if (!existingRecord && From && To) {
      console.log(`Record not found by SID ${CallSid}, searching by phone numbers: ${From} -> ${To}`);
      
      const { data: phoneRecord } = await supabase
        .from('call_history')
        .select('*')
        .eq('from_number', From)
        .eq('to_number', To)
        .eq('call_status', 'initiated')
        .order('call_start_time', { ascending: false })
        .limit(1)
        .single();

      if (phoneRecord) {
        existingRecord = phoneRecord;
        console.log(`Found record by phone numbers, updating with real Twilio SID: ${CallSid}`);
        
        // Update the record with the real Twilio Call SID
        const { error: sidUpdateError } = await supabase
          .from('call_history')
          .update({ twilio_call_sid: CallSid })
          .eq('id', phoneRecord.id);

        if (sidUpdateError) {
          console.error('Failed to update Twilio Call SID:', sidUpdateError);
        }
      }
    }

    if (existingRecord) {
      // Update existing record with status and other info
      console.log(`Updating call history record for ${CallSid} with status: ${CallStatus}`);
      
      // Use the actual Twilio status as our call_status
      const updateData: any = {
        call_status: CallStatus, // Use actual Twilio status
        call_end_time: new Date().toISOString()
      };

      if (CallDuration) {
        updateData.call_duration = parseInt(CallDuration);
      }

      const { error: updateError } = await supabase
        .from('call_history')
        .update(updateData)
        .eq('id', existingRecord.id);

      if (updateError) {
        console.error('Failed to update call history:', updateError);
      } else {
        console.log(`Call history updated for ${CallSid} with status: ${CallStatus}`, {
          recordId: existingRecord.id,
          organizationId: existingRecord.organization_id,
          leadId: existingRecord.lead_id
        });

        // Track voice usage for billing when call is completed
        if (CallStatus === 'completed' && CallDuration && parseInt(CallDuration) > 0) {
          try {
            // Determine country code (simplified - you might want to enhance this)
            const countryCode = 'US'; // Default to US, you can enhance this based on phone number
            
            // Track voice usage for billing
            const usageData = {
              organization_id: existingRecord.organization_id,
              agent_id: existingRecord.agent_id,
              call_history_id: existingRecord.id,
              twilio_call_sid: CallSid,
              phone_number: existingRecord.from_number,
              to_number: existingRecord.to_number,
              from_number: existingRecord.from_number,
              direction: existingRecord.call_direction,
              country_code: countryCode,
              call_duration_seconds: parseInt(CallDuration)
            };

            // Call billing API to track usage
            const billingResponse = await fetch(`${process.env.PUBLIC_URL || 'http://localhost:3001'}/api/billing/voice-usage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(usageData)
            });

            if (billingResponse.ok) {
              const billingResult = await billingResponse.json();
              console.info('Voice usage tracked successfully:', {
                callId: existingRecord.id,
                duration: CallDuration,
                cost: billingResult.costs.total_cost
              });
            } else {
              console.error('Failed to track voice usage:', await billingResponse.text());
            }
          } catch (billingError) {
            console.error('Error tracking voice usage:', billingError);
            // Don't fail the webhook if billing tracking fails
          }
        }
      }
    } else {
      // No existing record found - this should not happen with the new system
      console.warn(`No call history record found for ${CallSid} with status: ${CallStatus}. Phone numbers: ${From} -> ${To}`);
      
      // We will NOT create fallback records with "Unknown" values anymore
      // This ensures data integrity and forces proper backend implementation
    }

    // Log the status
    switch (CallStatus) {
      case 'initiated':
        console.info(`Call ${CallSid} initiated`);
        break;
      case 'ringing':
        console.info(`Call ${CallSid} is ringing`);
        break;
      case 'answered':
        console.info(`Call ${CallSid} was answered`);
        break;
      case 'completed':
        console.info(`Call ${CallSid} completed with duration: ${CallDuration || 'unknown'}`);
        break;
      case 'failed':
        console.warn(`Call ${CallSid} failed`);
        break;
      case 'busy':
        console.info(`Call ${CallSid} was busy`);
        break;
      case 'no-answer':
        console.info(`Call ${CallSid} was not answered`);
        break;
      case 'canceled':
        console.info(`Call ${CallSid} was canceled`);
        break;
      default:
        console.info(`Call ${CallSid} status: ${CallStatus}`);
    }

  } catch (error) {
    console.error('Error in handleCallStatusUpdate:', error);
  }
}

export default router;

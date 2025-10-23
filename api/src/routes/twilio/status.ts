import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../utils/supabaseClient.js';

const router = Router();

const smsStatusSchema = z.object({
  MessageSid: z.string(),
  MessageStatus: z.string()
});

const callStatusSchema = z.object({
  CallSid: z.string(),
  CallStatus: z.string(),
  CallDuration: z.string().optional(),
  From: z.string().optional(),
  To: z.string().optional()
});

router.post('/sms-status', async (req: Request, res: Response) => {
  try {
    if (!req.body?.MessageSid || !req.body?.MessageStatus) {
      console.warn('Skipping non-SMS status webhook payload', {
        keys: Object.keys(req.body || {})
      });
      return res.status(200).send('OK');
    }

    const webhookData = smsStatusSchema.parse(req.body);

    const { data: updatedMessage, error: updateError } = await supabase
      .from('sms_messages')
      .update({ status: webhookData.MessageStatus })
      .eq('twilio_sid', webhookData.MessageSid)
      .select();

    if (updateError) {
      console.error('Error updating SMS message status:', updateError);
      return res.status(200).send('OK');
    }

    if (updatedMessage && updatedMessage.length > 0) {
      if (webhookData.MessageStatus === 'delivered' || webhookData.MessageStatus === 'received') {
        try {
          const message = updatedMessage[0];
          const usageData = {
            organization_id: message.organization_id,
            agent_id: message.agent_id,
            sms_message_id: message.id,
            twilio_sid: webhookData.MessageSid,
            phone_number: message.phone_number,
            to_number: message.to_number,
            from_number: message.from_number,
            direction: message.direction,
            country_code: 'US',
            message_count: 1
          };

          await fetch('/api/billing/sms-usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(usageData)
          });
        } catch (billingError) {
          console.error('Error tracking SMS usage:', billingError);
        }
      }
    } else {
      console.warn(`No SMS message found with Twilio SID: ${webhookData.MessageSid}`);
    }

    res.status(200).send('OK');
  } catch (error: unknown) {
    console.error('Error processing SMS status webhook:', error);
    res.status(200).send('OK');
  }
});

router.post('/call-status', async (req: Request, res: Response) => {
  try {
    const webhookData = callStatusSchema.parse(req.body);
    await handleCallStatusUpdate(webhookData);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing call status webhook:', error);
    res.status(200).send('OK');
  }
});

async function handleCallStatusUpdate(webhookData: { CallSid: string; CallStatus: string; CallDuration?: string; From?: string; To?: string }) {
  const { CallSid, CallStatus, CallDuration, From, To } = webhookData;

  try {
    let { data: existingRecord } = await supabase
      .from('call_history')
      .select('*')
      .eq('twilio_call_sid', CallSid)
      .single();

    if (!existingRecord && From && To) {
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
        await supabase
          .from('call_history')
          .update({ twilio_call_sid: CallSid })
          .eq('id', phoneRecord.id);
      }
    }

    if (existingRecord) {
      const allowedStatusMap: Record<string, string> = {
        queued: 'initiated',
        ringing: 'ringing',
        'in-progress': 'answered',
        in_progress: 'answered',
        connecting: 'ringing',
        answered: 'answered',
        completed: 'completed',
        busy: 'busy',
        'no-answer': 'no-answer',
        no_answer: 'no-answer',
        failed: 'failed',
        canceled: 'canceled'
      };
      const normalizedStatus = allowedStatusMap[CallStatus] || CallStatus;

      const updateData: Record<string, unknown> = {
        call_status: normalizedStatus,
        call_end_time: new Date().toISOString()
      };
      if (CallDuration) {
        updateData.call_duration = parseInt(CallDuration, 10);
      }

      const { error: updateError } = await supabase
        .from('call_history')
        .update(updateData)
        .eq('id', existingRecord.id);

      if (!updateError && CallStatus === 'completed' && CallDuration && parseInt(CallDuration, 10) > 0) {
        try {
          const durationSeconds = parseInt(CallDuration, 10);
          const minutes = Math.ceil(durationSeconds / 60);

          await supabase.from('voice_usage').insert({
            organization_id: existingRecord.organization_id,
            agent_id: existingRecord.agent_id,
            call_history_id: existingRecord.id,
            twilio_call_sid: CallSid,
            phone_number: existingRecord.from_number,
            to_number: existingRecord.to_number,
            from_number: existingRecord.from_number,
            direction: existingRecord.call_direction,
            country_code: 'US',
            call_duration_seconds: durationSeconds,
            call_duration_minutes: minutes
          });
        } catch (billingError) {
          console.error('Error tracking voice usage:', billingError);
        }
      }
    } else {
      console.warn(`No call history record found for ${CallSid} with status: ${CallStatus}. Phone numbers: ${From} -> ${To}`);
    }
  } catch (error) {
    console.error('Error in handleCallStatusUpdate:', error);
  }
}

export default router;

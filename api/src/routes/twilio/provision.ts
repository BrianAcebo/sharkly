import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../utils/supabaseClient';
import { twilioClient } from '../../utils/twilioClient';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// Feature flag to disable manual number purchasing
const DISABLE_NUMBER_PURCHASE_UI = process.env.DISABLE_NUMBER_PURCHASE_UI === 'true';

// Validation schemas
const buyNumberSchema = z.object({});

// POST /admin/twilio/buy-number (disabled by default)
  router.post('/buy-number', requireAuth, async (req: Request, res: Response) => {
  if (DISABLE_NUMBER_PURCHASE_UI) {
    return res.status(403).json({
      error: 'Manual number purchasing is disabled. Numbers are auto-provisioned per seat.'
    });
  }

  try {
    buyNumberSchema.parse(req.body);
    const agentId = req.userId!;

    // Check if agent already has an active number
    const { data: existingNumber } = await supabase
      .from('agent_phone_numbers')
      .select('phone_number')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .single();

    if (existingNumber) {
      return res.status(400).json({
        error: 'You already have an active business number. Only one number per agent is allowed.'
      });
    }

    // Search for available phone numbers
    const searchParams: {
      country: string;
      smsEnabled: boolean;
      voiceEnabled: boolean;
      limit: number;
    } = {
      country: 'US',
      smsEnabled: true,
      voiceEnabled: false, // SMS only
      limit: 1
    };

    const [phoneNumber] = await twilioClient.incomingPhoneNumbers
      .list(searchParams);

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'No SMS-enabled numbers available'
      });
    }

    // Purchase the phone number
    const purchasedNumber = await twilioClient.incomingPhoneNumbers
      .create({
        phoneNumber: phoneNumber.phoneNumber,
        smsUrl: `${process.env.PUBLIC_URL}/webhooks/twilio/sms-inbound`,
        smsMethod: 'POST'
      });

    // Insert into agent_phone_numbers
    const { data: agentPhoneNumber, error: insertError } = await supabase
      .from('agent_phone_numbers')
      .insert({
        agent_id: agentId,
        phone_number: purchasedNumber.phoneNumber,
        twilio_sid: purchasedNumber.sid,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      // If database insert fails, release the Twilio number
      await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).remove();
      throw insertError;
    }

    res.json({
      ok: true,
      phoneNumber: agentPhoneNumber.phone_number
    });

  } catch (error) {
    console.error('Error buying phone number:', error);
    res.status(500).json({
      error: 'Failed to purchase phone number'
    });
  }
});

// GET /me/number
router.get('/me/number', requireAuth, async (req: Request, res: Response) => {
  try {
    const agentId = req.userId!;

    const { data: agentPhoneNumber } = await supabase
      .from('agent_phone_numbers')
      .select('phone_number')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .single();

    if (agentPhoneNumber) {
      res.json({
        phoneNumber: agentPhoneNumber.phone_number
      });
    } else {
      res.json({
        phoneNumber: null
      });
    }

  } catch (error) {
    console.error('Error fetching phone number:', error);
    res.status(500).json({
      error: 'Failed to fetch phone number'
    });
  }
});

export default router;

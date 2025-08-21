import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { twilioClient, PUBLIC_URL } from '../../utils/twilioClient';
import { requireAuth } from '../../middleware/auth';
import { makeCallSchema, normalizePhoneNumber } from '../../utils/utils';

const router = Router();

// POST /make
router.post('/make', requireAuth, async (req: Request, res: Response) => {
  try {
    const { to, from } = makeCallSchema.parse(req.body);
    const agentId = req.userId!;

    // Normalize phone numbers
    const normalizedTo = normalizePhoneNumber(to);
    const normalizedFrom = normalizePhoneNumber(from);

    console.info(`Initiating call from ${normalizedFrom} to ${normalizedTo} for agent ${agentId}`);

    // Make the call via Twilio
    const call = await twilioClient.calls.create({
      // url: `${PUBLIC_URL}/twilio/voice`,
      // url: `http://demo.twilio.com/docs/voice.xml`,
      url: 'https://mll4s2dq-3001.usw3.devtunnels.ms/twilio/voice',
      to: '9549976656',
      from: normalizedFrom,
      statusCallback: `${PUBLIC_URL}/webhooks/twilio/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    console.info(`Call initiated successfully with SID: ${call.sid}`);

    res.json({
      success: true,
      callSid: call.sid,
      status: call.status,
      from: normalizedFrom,
      to: normalizedTo
    });

  } catch (error) {
    console.error('Error making call:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.issues });
    }
    
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

export default router;

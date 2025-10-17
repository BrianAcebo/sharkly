import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { twilioClient } from '../../utils/twilioClient';
import { requireAuth } from '../../middleware/auth';
import { makeCallSchema, normalizePhoneNumber } from '../../utils/utils';
import { resolveAgentDialConfig } from '../../utils/voiceDialConfig';

const router = Router();

// POST /make
router.post('/make', requireAuth, async (req: Request, res: Response) => {
  try {
    const { to, from } = makeCallSchema.parse(req.body);
    const agentId = req.userId!;

    // Normalize phone numbers
    const normalizedTo = normalizePhoneNumber(to);
    let normalizedFrom: string;

    if (from) {
      normalizedFrom = normalizePhoneNumber(from);
    } else {
      const dialConfig = await resolveAgentDialConfig(agentId);
      if (!dialConfig) {
        return res.status(400).json({ error: 'No active seat with an assigned phone number' });
      }
      normalizedFrom = dialConfig.agentNumber;
    }

    console.info(`Initiating call from ${normalizedFrom} to ${normalizedTo} for agent ${agentId}`);

    console.log('PUBLIC_URL', process.env.PUBLIC_URL);

    // Make the call via Twilio
    const call = await twilioClient.calls.create({
      url: `${process.env.PUBLIC_URL}/twilio/voice`,
      to: normalizedTo,
      from: normalizedFrom,
      statusCallback: `${process.env.PUBLIC_URL}/webhooks/twilio/call-status`,
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

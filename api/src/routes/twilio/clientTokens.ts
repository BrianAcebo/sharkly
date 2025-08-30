import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import twilio from 'twilio';
import { supabase } from '../../utils/supabaseClient';

const router = Router();

// POST /generate-token - Generate Twilio Client token for WebRTC calls
router.post('/generate-token', requireAuth, async (req: Request, res: Response) => {
  try {
    const agentId = req.userId!;
    let agentPhoneNumber;

    if (process.env.NODE_ENV === 'development') {
      agentPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    } else {
      // Get the agent's phone number
      const agentNumber = await supabase
        .from('agent_phone_numbers')
        .select('phone_number')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .single();

      if (agentNumber.error || !agentNumber.data) {
        return res.status(404).json({ 
          error: 'No active phone number found for this agent' 
        });
      }

      agentPhoneNumber = agentNumber.data.phone_number;
    }

    // Create Twilio Client token with proper Voice grant
    const token = new twilio.jwt.AccessToken(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_API_KEY_SID!,
      process.env.TWILIO_API_KEY_SECRET!,
      {
        identity: `agent_${agentId}`,
        ttl: 3600 // 1 hour
      }
    );

    // Add Voice grant for making/receiving calls
    // For outgoing calls to phone numbers, we need a TwiML app
    const voiceGrant = new twilio.jwt.AccessToken.VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID!,
      incomingAllow: true
    });
    
    token.addGrant(voiceGrant);

    res.json({
      token: token.toJwt(),
      phoneNumber: agentPhoneNumber
    });

  } catch (error: unknown) {
    console.error('Error generating client token:', error);
    res.status(500).json({ 
      error: 'Failed to generate client token' 
    });
  }
});

export default router;

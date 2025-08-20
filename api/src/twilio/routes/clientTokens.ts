import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// POST /generate-token - Generate Twilio Client token for WebRTC calls
router.post('/generate-token', requireAuth, async (req: Request, res: Response) => {
  try {
    const agentId = req.userId!;
    
    // Create Supabase client
    const supabase = createClient(
      process.env.PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the agent's phone number
    const { data: agentNumber, error: numberError } = await supabase
      .from('agent_phone_numbers')
      .select('phone_number')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .single();

    if (numberError || !agentNumber) {
      return res.status(404).json({ 
        error: 'No active phone number found for this agent' 
      });
    }

    // Create Twilio Client token
    const token = new twilio.jwt.AccessToken(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_API_KEY!,
      process.env.TWILIO_API_SECRET!,
      {
        identity: `agent_${agentId}`,
        ttl: 3600 // 1 hour
      }
    );

    // Add Voice grant for making/receiving calls
    const voiceGrant = new twilio.jwt.AccessToken.VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID || process.env.TWILIO_ACCOUNT_SID!,
      incomingAllow: true
    });
    token.addGrant(voiceGrant);

    // Add capability for the agent's phone number
    const capability = new twilio.jwt.ClientCapability({
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!
    });

    capability.addScope(new twilio.jwt.ClientCapability.OutgoingClientScope({
      applicationSid: process.env.TWILIO_TWIML_APP_SID || process.env.TWILIO_ACCOUNT_SID!
    }));

    capability.addScope(new twilio.jwt.ClientCapability.IncomingClientScope(agentNumber.phone_number));

    res.json({
      token: token.toJwt(),
      capability: capability.toJwt(),
      phoneNumber: agentNumber.phone_number
    });

  } catch (error: unknown) {
    console.error('Error generating client token:', error);
    res.status(500).json({ 
      error: 'Failed to generate client token' 
    });
  }
});

// POST /make-webrtc-call - Initiate WebRTC call
router.post('/make-webrtc-call', requireAuth, async (req: Request, res: Response) => {
  try {
    const { to, from } = req.body;
    const agentId = req.userId!;

    if (!to || !from) {
      return res.status(400).json({ 
        error: 'Missing required parameters: to, from' 
      });
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Validate the agent owns the 'from' number
    const { data: agentNumber, error: numberError } = await supabase
      .from('agent_phone_numbers')
      .select('phone_number')
      .eq('agent_id', agentId)
      .eq('phone_number', from)
      .eq('is_active', true)
      .single();

    if (numberError || !agentNumber) {
      return res.status(403).json({ 
        error: 'Unauthorized to use this phone number' 
      });
    }

    // Create TwiML for the call
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.dial({
      callerId: from,
      answerOnBridge: true
    }, to);

    res.set('Content-Type', 'text/xml');
    res.send(twiml.toString());

  } catch (error: unknown) {
    console.error('Error making WebRTC call:', error);
    res.status(500).json({ 
      error: 'Failed to initiate WebRTC call' 
    });
  }
});

export default router;

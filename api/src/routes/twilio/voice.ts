import { Router, Request, Response } from 'express';
import twilio from 'twilio';

const router = Router();

router.post("/voice", (req, res) => {
  const to = (req.body?.To || "").trim();
  const e164 = /^\+\d{7,15}$/;
  const vr = new twilio.twiml.VoiceResponse();

  if (!e164.test(to)) {
    vr.say("Invalid destination number.");
  } else {
    const dial = vr.dial({ callerId: process.env.TWILIO_CALLER_ID! });
    dial.number(to);
  }

  res.type("text/xml").send(vr.toString());
});

// GET /twilio/voice - Serve TwiML XML for voice calls
router.get('/voice', (req: Request, res: Response) => {
  try {
    console.info('Voice TwiML requested');
    
    // Set the content type to XML
    res.set('Content-Type', 'text/xml');
    
    // Return the TwiML XML content
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">Brian says he loves you very much!</Say>
  <Play>http://demo.twilio.com/docs/classic.mp3</Play>
</Response>`;
    
    res.send(twiml);
    
  } catch (error) {
    console.error('Error serving voice TwiML:', error);
    
    // Return a simple error TwiML response
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">We're sorry, but there was an error processing your call. Please try again later.</Say>
</Response>`;
    
    res.set('Content-Type', 'text/xml');
    res.send(errorTwiml);
  }
});

export default router;

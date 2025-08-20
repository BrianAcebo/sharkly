import { Router, Request, Response } from 'express';

const router = Router();

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

import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// Validation schema for call status webhook
const callStatusSchema = z.object({
  CallSid: z.string(),
  CallStatus: z.string(),
  CallDuration: z.string().optional()
});

// POST /webhooks/twilio/call-status
router.post('/webhooks/twilio/call-status', async (req: Request, res: Response) => {
  try {
    const webhookData = callStatusSchema.parse(req.body);
    
    console.info('Call status update received:', {
      callSid: webhookData.CallSid,
      status: webhookData.CallStatus,
      duration: webhookData.CallDuration
    });

    // Here you could update a calls table in your database
    // For now, we'll just log the status updates
    
    switch (webhookData.CallStatus) {
      case 'initiated':
        console.info(`Call ${webhookData.CallSid} initiated`);
        break;
      case 'ringing':
        console.info(`Call ${webhookData.CallSid} is ringing`);
        break;
      case 'answered':
        console.info(`Call ${webhookData.CallSid} was answered`);
        break;
      case 'completed':
        console.info(`Call ${webhookData.CallSid} completed with duration: ${webhookData.CallDuration || 'unknown'}`);
        break;
      case 'failed':
        console.warn(`Call ${webhookData.CallSid} failed`);
        break;
      case 'busy':
        console.info(`Call ${webhookData.CallSid} was busy`);
        break;
      case 'no-answer':
        console.info(`Call ${webhookData.CallSid} was not answered`);
        break;
      default:
        console.info(`Call ${webhookData.CallSid} status: ${webhookData.CallStatus}`);
    }

    // Always return 200 to Twilio
    res.status(200).send('OK');

  } catch (error) {
    console.error('Error processing call status webhook:', error);
    
    // Always return 200 to Twilio to prevent retries
    res.status(200).send('OK');
  }
});

export default router;

// api/src/middleware/twilio.ts
import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import twilio from 'twilio';

export const verifyTwilio = (req: Request, res: Response, next: NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';
  const sig = req.get('X-Twilio-Signature') || req.get('x-twilio-signature');

  // DEV: unsigned requests require a simple shared header
  if (!isProd && !sig) {
    console.log('[twilio] devToken:', req.get('X-Dev-Auth'), process.env.DEV_TWILIO_INTERNAL_TOKEN);
    if ((req.get('X-Dev-Auth') === process.env.DEV_TWILIO_INTERNAL_TOKEN) || (process.env.NODE_ENV === 'development' && req.params.dev === '1')) return next();
    return res.status(403).send('Dev auth required');
  }

  // PROD (and any signed request in dev): verify Twilio
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const host = process.env.WEBHOOK_PUBLIC_HOST || process.env.NGROK_DOMAIN;
  if (!authToken || !host) return res.status(500).send('Server misconfigured');

  const fullUrl = `https://${host}${req.originalUrl}`;
  const ok = twilio.validateRequest(authToken, String(sig), fullUrl, req.body || {});
  return ok ? next() : res.status(403).send('Invalid Twilio signature');
};

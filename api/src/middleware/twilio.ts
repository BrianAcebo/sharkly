// api/src/middleware/twilio.ts
import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import twilio from 'twilio';

export const verifyTwilio = (req: Request, res: Response, next: NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';
  const sig = req.get('X-Twilio-Signature') || req.get('x-twilio-signature');

  // DEV: bypass signature verification entirely
  if (!isProd) {
    return next();
  }

  // PROD: verify Twilio signature. Use actual host/proto seen by Express to avoid mismatch.
  const parentAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const subaccountAuthToken = process.env.TWILIO_SUBACCOUNT_AUTH_TOKEN; // optional
  if (!sig || !parentAuthToken) return res.status(500).send('Server misconfigured');

  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const hostHdr = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
  const fullUrl = `${proto}://${hostHdr}${req.originalUrl}`;

  // Try parent token and optional subaccount token
  const candidates = [parentAuthToken, subaccountAuthToken].filter(Boolean) as string[];
  const ok = candidates.some((token) => twilio.validateRequest(token, String(sig), fullUrl, req.body || {}));

  if (ok) return next();

  // Dev override for subaccounts: if allowed, accept requests from any known subaccount SID
  if (process.env.ALLOW_DEV_WEBHOOKS === 'true') {
    const subSid = (req.headers['x-twilio-accountsid'] as string) || '';
    if (subSid && /^AC/.test(subSid)) {
      // Accept for dev to unblock; logs will indicate override
      console.warn('[twilio] signature invalid; allowed by ALLOW_DEV_WEBHOOKS for subaccount', subSid);
      return next();
    }
  }

  return res.status(403).send('Invalid Twilio signature');
};

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { isServerWebhookPath } from '../utils/webhookPaths.js';
import { captureApiError } from '../utils/sentryCapture.js';

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Never require JWT on provider webhooks (Stripe, Shopify, Supabase Auth email hook, etc.)
    if (isServerWebhookPath(req.path)) {
      next();
      return;
    }

    // Get the authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header required' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.warn('[auth] Token validation failed:', {
        error: error?.message ?? (user ? null : 'No user'),
        code: error?.code,
        status: error?.status
      });
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Add user info to request
    req.userId = user.id;
    req.user = {
      id: user.id,
      ...(user.email ? { email: user.email } : {}),
    } as Request['user'];

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    captureApiError(error, req, { feature: 'auth-middleware' });
    res.status(500).json({ error: 'Authentication failed' });
  }
};

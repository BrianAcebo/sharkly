import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get the authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header required' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Add user info to request
    req.userId = user.id;
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

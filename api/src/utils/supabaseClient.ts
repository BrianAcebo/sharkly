import { createClient } from '@supabase/supabase-js';
import { HttpError } from '../error/httpError.js';

// Prefer server credentials when running in API (service role bypasses RLS/priv issues)
const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new HttpError('Missing Supabase environment variables', 500);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

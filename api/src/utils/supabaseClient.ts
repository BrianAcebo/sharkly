import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { HttpError } from '../error/httpError.js';

// Supabase URL and Anon Key for user authentication
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new HttpError('Missing Supabase environment variables', 500);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

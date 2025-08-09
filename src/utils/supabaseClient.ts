import { createClient } from '@supabase/supabase-js';

// Public Supabase URL and Anon Key
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		// Enable automatic session refresh
		autoRefreshToken: true,
		// Persist session in localStorage
		persistSession: true,
		// Detect session in URL (for OAuth flows)
		detectSessionInUrl: true,
		// Storage key for session
		storageKey: 'paperboat-auth-token',
		// Flow type for auth
		flowType: 'pkce'
	},
	// Global headers
	global: {
		headers: {
			'X-Client-Info': 'paperboat-crm'
		}
	}
});

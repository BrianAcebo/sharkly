import { User } from '@supabase/supabase-js';

interface TeamMember {
	id: string;
	profile_id: string;
	organization_id: string;
	role: string;
	created_at: string;
}

declare global {
	namespace Express {
		interface Request {
			user?: User;
			teamMember?: TeamMember;
		}
	}
}

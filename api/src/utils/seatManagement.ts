import { supabase } from './supabaseClient.js';

export async function getOrganizationSeatAssignments(orgId: string) {
	const { data, error } = await supabase
		.from('seats')
		.select('*')
		.eq('org_id', orgId);

	if (error) {
		throw error;
	}

	return data ?? [];
}



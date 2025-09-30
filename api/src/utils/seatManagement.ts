import { supabase } from './supabaseClient';

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

export async function clearSeatPhoneAssignment(seatId: string) {
	await supabase
		.from('seats')
		.update({ phone_sid: null, phone_e164: null, updated_at: new Date().toISOString() })
		.eq('id', seatId);
}



import { supabase } from '../utils/supabaseClient.js';

interface AgentDialConfig {
	agentNumber: string;
	formattedNumber: string;
	organizationId: string;
}

const toE164 = (value: string) => {
	const digits = value.replace(/\D/g, '');
	if (!digits) return '';
	if (value.startsWith('+')) return value;
	if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
	if (digits.length === 10) return `+1${digits}`;
	return `+${digits}`;
};

export async function resolveAgentDialConfig(agentId: string): Promise<AgentDialConfig | null> {
	const { data: membership, error: membershipError } = await supabase
		.from('user_organizations')
		.select('organization_id')
		.eq('user_id', agentId)
		.single();

	if (membershipError || !membership?.organization_id) {
		console.warn('[voice] agent not in organization', agentId, membershipError);
		return null;
	}

	const orgId = membership.organization_id;

	const { data: seat, error: seatError } = await supabase
		.from('seats')
		.select('id')
		.eq('org_id', orgId)
		.eq('user_id', agentId)
		.eq('status', 'active')
		.single();

	if (seatError || !seat?.id) {
		console.warn('[voice] agent has no active seat', agentId, seatError);
		return null;
	}

	const { data: phoneNumber, error: phoneError } = await supabase
		.from('phone_numbers')
		.select('phone_number, capabilities')
		.eq('org_id', orgId)
		.eq('seat_id', seat.id)
		.eq('status', 'assigned')
		.single();

	if (phoneError || !phoneNumber?.phone_number) {
		console.warn('[voice] no assigned phone number for seat', seat.id, phoneError);
		return null;
	}

	if (phoneNumber.capabilities?.voice === false) {
		console.warn('[voice] assigned number is not voice capable', seat.id);
		return null;
	}

	const agentNumber = toE164(phoneNumber.phone_number);
	if (!agentNumber) {
		console.warn('[voice] failed to normalize agent number', phoneNumber.phone_number);
		return null;
	}

	return {
		agentNumber,
		formattedNumber: agentNumber,
		organizationId: orgId
	};
}



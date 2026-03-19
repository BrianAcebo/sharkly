/**
 * Server-side helper to create in-app notifications (persistent, real-time panel).
 * Uses service-role Supabase so we can insert for any user.
 */

import { supabase } from '../utils/supabaseClient.js';

export interface CreateNotificationInput {
	title: string;
	message: string;
	type: string;
	priority?: 'low' | 'medium' | 'high';
	action_url?: string | null;
	metadata?: Record<string, unknown>;
	/** When true, notification appears in panel but does not trigger a toast. */
	skipToast?: boolean;
}

/**
 * Create a single notification for a user. Used for billing, audit complete, invite accepted, etc.
 */
export async function createNotificationForUser(
	userId: string,
	organizationId: string | null,
	input: CreateNotificationInput
): Promise<void> {
	try {
		await supabase.from('notifications').insert({
			user_id: userId,
			organization_id: organizationId,
			title: input.title,
			message: input.message,
			type: input.type,
			priority: input.priority ?? 'medium',
			action_url: input.action_url ?? null,
			metadata: input.metadata ?? {},
			read: false,
			shown: input.skipToast ?? false
		});
	} catch (e) {
		console.warn('[notifications] Failed to create notification for user', { userId, type: input.type, error: e });
	}
}

/**
 * Create a notification for the organization owner (e.g. payment failed, credits low).
 * No-op if org has no owner_id.
 */
export async function createNotificationForOrgOwner(
	organizationId: string,
	input: CreateNotificationInput
): Promise<void> {
	const { data: org } = await supabase
		.from('organizations')
		.select('owner_id')
		.eq('id', organizationId)
		.single();

	if (!org?.owner_id) return;
	await createNotificationForUser(org.owner_id, organizationId, input);
}

const CREDITS_LOW_THRESHOLD = 50;

/**
 * If credits remaining is below threshold, notify org owner. Call after any credit spend.
 */
export async function maybeNotifyCreditsLow(organizationId: string, creditsRemaining: number): Promise<void> {
	if (creditsRemaining > CREDITS_LOW_THRESHOLD) return;
	await createNotificationForOrgOwner(organizationId, {
		title: 'Credits running low',
		message: `You have ${creditsRemaining} credits remaining. Add more in Billing to avoid interruption.`,
		type: 'credits_low',
		priority: 'medium',
		action_url: '/settings/credits',
		metadata: { credits_remaining: creditsRemaining }
	});
}

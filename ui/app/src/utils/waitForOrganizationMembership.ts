import { supabase } from './supabaseClient';

/**
 * After billing or org creation, `user_organizations` can lag behind the success callback.
 * Poll until membership is visible so AuthProvider and useSites see `organization_id`.
 */
export async function waitForOrganizationMembership(
	updateUser: () => Promise<void>,
	options?: { maxAttempts?: number; delayMs?: number }
): Promise<void> {
	const maxAttempts = options?.maxAttempts ?? 15;
	const delayMs = options?.delayMs ?? 350;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		await updateUser();
		const {
			data: { session }
		} = await supabase.auth.getSession();
		if (!session?.user) return;

		const { data, error } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', session.user.id)
			.maybeSingle();

		if (error) {
			console.warn('waitForOrganizationMembership: user_organizations query', error);
		}
		if (data?.organization_id) return;

		await new Promise((r) => setTimeout(r, delayMs));
	}
}

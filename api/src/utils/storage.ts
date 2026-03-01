import { supabase } from './supabaseClient.js';

/**
 * Ensure a private storage bucket exists. No-op if it already exists.
 */
export async function ensureRawDocumentsBucket(bucketName = 'raw_documents') {
	// list buckets and check existence (supabase-js v2 supports listBuckets)
	const { data: buckets, error } = await supabase.storage.listBuckets();
	if (error) {
		console.warn('listBuckets failed; attempting createBucket anyway', error);
	}
	const exists = (buckets ?? []).some((b) => b.name === bucketName);
	if (exists) return;

	// Create as private bucket
	const { error: createErr } = await supabase.storage.createBucket(bucketName, {
		public: false
	});
	if (createErr) {
		// If create failed due to already exists in a race, ignore
		if ((createErr as any)?.message && /exists/i.test((createErr as any).message)) {
			return;
		}
		console.warn('Failed to create bucket', bucketName, createErr);
	}
}

export default { ensureRawDocumentsBucket };



import { supabase } from '../utils/supabaseClient';

/**
 * When every page in a cluster is `published`, mark the parent topic and cluster `complete`
 * so the topic queue / Completed tab match in-app publication state.
 */
export async function syncClusterTopicCompletionIfFullyPublished(
	clusterId: string | null | undefined
): Promise<{ updated: boolean }> {
	if (!clusterId) return { updated: false };

	const { data: pages, error: pagesErr } = await supabase
		.from('pages')
		.select('status')
		.eq('cluster_id', clusterId);
	if (pagesErr || !pages?.length) return { updated: false };

	const allPublished = pages.every((p) => p.status === 'published');
	if (!allPublished) return { updated: false };

	const { data: cluster, error: clusterErr } = await supabase
		.from('clusters')
		.select('id, topic_id, status')
		.eq('id', clusterId)
		.maybeSingle();
	if (clusterErr || !cluster?.topic_id) return { updated: false };

	const { data: topic } = await supabase
		.from('topics')
		.select('id, status')
		.eq('id', cluster.topic_id)
		.maybeSingle();

	const topicNeeds = topic != null && topic.status !== 'complete';
	const clusterNeeds = cluster.status !== 'complete';

	if (!topicNeeds && !clusterNeeds) return { updated: false };

	const now = new Date().toISOString();
	if (topicNeeds) {
		await supabase
			.from('topics')
			.update({ status: 'complete', updated_at: now })
			.eq('id', cluster.topic_id);
	}
	if (clusterNeeds) {
		await supabase
			.from('clusters')
			.update({ status: 'complete', completion_pct: 100, updated_at: now })
			.eq('id', clusterId);
	}
	return { updated: true };
}

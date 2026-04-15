import { addDays, addWeeks, format, parseISO, startOfWeek } from 'date-fns';
import type { Topic } from '../hooks/useTopics';
import type { Cluster } from '../hooks/useClusters';

export type ScheduleCadence = 'daily' | 'weekly';
/** `article` = N articles per day/week in topic-queue order; `cluster` = one cluster per day/week (all its pieces on that day) */
export type ScheduleBundle = 'article' | 'cluster';

export interface ScheduleSettings {
	cadence: ScheduleCadence;
	/** Meaning depends on cadence: articles per day, or articles per week */
	amount: number;
	bundle: ScheduleBundle;
	/** First anchor date (YYYY-MM-DD) */
	startDate: string;
	/** Show published pieces after the computed schedule */
	includePublished?: boolean;
}

export interface SchedulePage {
	id: string;
	title: string;
	keyword?: string;
	clusterId: string;
	clusterTitle: string;
	status: 'planned' | 'brief_generated' | 'draft' | 'published';
}

/** Order pages by topic queue then cluster (same order as Strategy). */
function orderPagesByTopicQueue(
	topics: Topic[],
	clusters: Cluster[],
	pages: SchedulePage[]
): SchedulePage[] {
	const byCluster = new Map<string, SchedulePage[]>();
	for (const p of pages) {
		if (!byCluster.has(p.clusterId)) byCluster.set(p.clusterId, []);
		byCluster.get(p.clusterId)!.push(p);
	}
	const topicOrder = topics.map((t) => t.id);
	const clustersByTopic = new Map<string, Cluster[]>();
	for (const c of clusters) {
		const list = clustersByTopic.get(c.topicId) ?? [];
		list.push(c);
		clustersByTopic.set(c.topicId, list);
	}
	for (const [, list] of clustersByTopic) {
		list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
	}
	const out: SchedulePage[] = [];
	const seenCluster = new Set<string>();
	for (const topicId of topicOrder) {
		for (const c of clustersByTopic.get(topicId) ?? []) {
			if (seenCluster.has(c.id)) continue;
			seenCluster.add(c.id);
			const chunk = byCluster.get(c.id);
			if (chunk?.length) out.push(...chunk);
		}
	}
	for (const c of clusters) {
		if (seenCluster.has(c.id)) continue;
		const chunk = byCluster.get(c.id);
		if (chunk?.length) out.push(...chunk);
	}
	return out;
}

/** Unfinished pages only, ordered by topic queue then cluster order (pages keep DB order within cluster). */
export function buildOrderedUnpublishedPages(
	topics: Topic[],
	clusters: Cluster[],
	pages: SchedulePage[]
): SchedulePage[] {
	const unfinished = pages.filter((p) => p.status !== 'published');
	return orderPagesByTopicQueue(topics, clusters, unfinished);
}

/** Published pages in topic-queue order (for display after the main schedule). */
export function buildOrderedPublishedPages(
	topics: Topic[],
	clusters: Cluster[],
	pages: SchedulePage[]
): SchedulePage[] {
	const published = pages.filter((p) => p.status === 'published');
	return orderPagesByTopicQueue(topics, clusters, published);
}

/** Group unfinished pages by cluster in topic-queue order; each inner array is one cluster’s pages. */
export function buildClusterGroupsInQueueOrder(
	topics: Topic[],
	clusters: Cluster[],
	pages: SchedulePage[]
): SchedulePage[][] {
	const ordered = buildOrderedUnpublishedPages(topics, clusters, pages);
	const groups: SchedulePage[][] = [];
	let currentCluster: string | null = null;
	let current: SchedulePage[] = [];
	for (const p of ordered) {
		if (p.clusterId !== currentCluster) {
			if (current.length) groups.push(current);
			currentCluster = p.clusterId;
			current = [p];
		} else {
			current.push(p);
		}
	}
	if (current.length) groups.push(current);
	return groups;
}

/** Map page id → YYYY-MM-DD scheduled day */
export function assignScheduleDates(
	items: SchedulePage[],
	settings: ScheduleSettings,
	clusterGroups: SchedulePage[][]
): Map<string, string> {
	const map = new Map<string, string>();
	const start = parseISO(settings.startDate);
	const amount = Math.max(1, Math.floor(settings.amount));

	if (settings.bundle === 'cluster') {
		const groups = clusterGroups.length ? clusterGroups : items.length ? [[...items]] : [];
		if (settings.cadence === 'daily') {
			groups.forEach((group, dayIdx) => {
				const d = format(addDays(start, dayIdx), 'yyyy-MM-dd');
				for (const p of group) map.set(p.id, d);
			});
		} else {
			groups.forEach((group, weekIdx) => {
				const weekStart = startOfWeek(addWeeks(start, weekIdx), { weekStartsOn: 1 });
				const d = format(weekStart, 'yyyy-MM-dd');
				for (const p of group) map.set(p.id, d);
			});
		}
		return map;
	}

	// Article mode: flat queue
	if (items.length === 0) return map;

	if (settings.cadence === 'daily') {
		let dayIdx = 0;
		for (let i = 0; i < items.length; i += amount) {
			const chunk = items.slice(i, i + amount);
			const d = format(addDays(start, dayIdx), 'yyyy-MM-dd');
			for (const p of chunk) map.set(p.id, d);
			dayIdx += 1;
		}
		return map;
	}

	// Weekly: `amount` articles per calendar week, spread Mon–Sun within each week
	let index = 0;
	let weekNum = 0;
	while (index < items.length) {
		const chunk = items.slice(index, index + amount);
		const weekStart = startOfWeek(addWeeks(start, weekNum), { weekStartsOn: 1 });
		const n = chunk.length;
		chunk.forEach((p, j) => {
			const dayInWeek = n === 1 ? 0 : Math.round((j * 6) / (n - 1));
			map.set(p.id, format(addDays(weekStart, dayInWeek), 'yyyy-MM-dd'));
		});
		index += amount;
		weekNum += 1;
	}
	return map;
}

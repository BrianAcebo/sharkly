import type { Node, Edge } from '@xyflow/react';
import { supabase } from '../../utils/supabaseClient';
import type { EntityType } from '../../types/entities';

type NodeData = { label: string; type: string; entityId: string; slugType: EntityType };
type EdgeData = {
	transform_type?: string | null;
	source_api?: string | null;
	source_url?: string | null;
	retrieved_at?: string | null;
	confidence_score?: number | null;
	tooltip?: string;
};

const typeToTable: Record<EntityType, string> = {
	person: 'people',
	business: 'businesses',
	email: 'emails',
	phone: 'phones',
	username: 'usernames',
	social_profile: 'social_profiles',
	image: 'images',
	ip: 'ip_addresses',
	domain: 'domains',
	leak: 'paste_leaks',
	document: 'documents',
	property: 'properties',
	case: 'cases'
};

const typeToDisplay: Record<EntityType, string> = {
	person: 'Person',
	business: 'Company',
	email: 'Email',
	phone: 'Phone',
	username: 'Username',
	social_profile: 'Social Profile',
	image: 'Image',
	ip: 'IP Address',
	domain: 'Domain',
	leak: 'Leak',
	document: 'Document',
	property: 'Property',
	case: 'Case'
};

async function getLabelFor(type: EntityType, id: string, hydrate: boolean): Promise<string> {
	if (!hydrate) {
		// Fast fallback label without hitting the database
		const pretty = typeToDisplay[type] ?? type;
		return `${pretty}: ${id.slice(0, 6)}…`;
	}
	try {
		const table = typeToTable[type];
		if (!table) return `${type}:${id}`;
		switch (type) {
			case 'person': {
				const { data } = await supabase.from(table).select('name').eq('id', id).single();
				const name = (data as any)?.name || {};
				const full = [name.first, name.middle, name.last].filter(Boolean).join(' ').trim();
				return full || `${type}:${id}`;
			}
			case 'business': {
				const { data } = await supabase.from(table).select('name').eq('id', id).single();
				return ((data as any)?.name as string) || `${type}:${id}`;
			}
			case 'email': {
				const { data } = await supabase.from(table).select('email').eq('id', id).single();
				return (data as any)?.email?.address || (data as any)?.address || `${type}:${id}`;
			}
			case 'phone': {
				const { data } = await supabase.from(table).select('phone').eq('id', id).single();
				return (data as any)?.phone?.number_e164 || (data as any)?.number_e164 || `${type}:${id}`;
			}
			case 'username': {
				const { data } = await supabase.from(table).select('username').eq('id', id).single();
				return (data as any)?.username?.value || `${type}:${id}`;
			}
			case 'social_profile': {
				const { data } = await supabase.from(table).select('profile').eq('id', id).single();
				const prof = (data as any)?.profile;
				return prof?.handle ? `@${prof.handle}` : `${type}:${id}`;
			}
			case 'domain': {
				const { data } = await supabase.from(table).select('name').eq('id', id).single();
				return (data as any)?.name || `${type}:${id}`;
			}
			case 'image': {
				const { data } = await supabase.from(table).select('title, url').eq('id', id).single();
				return (data as any)?.title || (data as any)?.url || `${type}:${id}`;
			}
			case 'document': {
				const { data } = await supabase.from(table).select('title, metadata, doc').eq('id', id).single();
				return (data as any)?.title || (data as any)?.metadata?.author || (data as any)?.doc?.type || `${type}:${id}`;
			}
			case 'ip': {
				const { data } = await supabase.from(table).select('ip, address').eq('id', id).single();
				return (data as any)?.ip?.address || (data as any)?.address || `${type}:${id}`;
			}
			case 'property': {
				const { data } = await supabase.from(table).select('address_full').eq('id', id).single();
				return (data as any)?.address_full || `${type}:${id}`;
			}
			default:
				return `${type}:${id}`;
		}
	} catch {
		return `${type}:${id}`;
	}
}

export interface BuildGraphOptions {
	depth?: 1 | 2;
	minConfidence?: number; // 0..1
	allowedTypes?: EntityType[]; // which neighbor types to include
	hydrateLabels?: boolean; // query DB to fetch human-friendly labels
}

function colorForConfidence(c: number | null | undefined): string {
	if (c == null || isNaN(c)) {
		return '#94a3b8'; // slate-400
	}
	// Use brand blues instead of green: slate-400 -> blue-500 -> indigo-600
	const clamped = Math.max(0, Math.min(1, c));
	if (clamped < 0.5) {
		const t = clamped / 0.5; // 0..1
		// slate-400 (#94a3b8) to blue-500 (#3b82f6)
		const r = Math.round(0x94 + (0x3b - 0x94) * t);
		const g = Math.round(0xa3 + (0x82 - 0xa3) * t);
		const b = Math.round(0xb8 + (0xf6 - 0xb8) * t);
		return `rgb(${r},${g},${b})`;
	}
	const t = (clamped - 0.5) / 0.5; // 0..1
	// blue-500 (#3b82f6) to indigo-600 (#4f46e5)
	const r = Math.round(0x3b + (0x4f - 0x3b) * t);
	const g = Math.round(0x82 + (0x46 - 0x82) * t);
	const b = Math.round(0xf6 + (0xe5 - 0xf6) * t);
	return `rgb(${r},${g},${b})`;
}

function widthForConfidence(c: number | null | undefined): number {
	if (c == null || isNaN(c)) return 1.25;
	return 1 + 3 * Math.max(0, Math.min(1, c));
}

const SECOND_HOP_EDGE_COLOR = '#f97316'; // orange-500

export async function buildEntityGraph(
	rootType: 'person' | 'business',
	rootId: string,
	opts: BuildGraphOptions = {}
): Promise<{
	nodes: Node<NodeData>[];
	edges: Edge<NodeData & EdgeData>[];
}> {
	const depth = opts.depth ?? 1;
	const minConf = opts.minConfidence ?? 0;
	const hydrate = opts.hydrateLabels ?? true;
	const allowed = new Set<EntityType>((opts.allowedTypes && opts.allowedTypes.length ? opts.allowedTypes : ([
		'email',
		'phone',
		'username',
		'social_profile',
		'image',
		'ip',
		'domain',
		'leak',
		'document',
		'property',
		'business',
		'person'
	] as EntityType[])) as any);
	// Root node
	const rootLabel = await getLabelFor(rootType, rootId, hydrate);
	const nodes: Node<NodeData>[] = [
		{
			id: `${rootType}:${rootId}`,
			type: 'default',
			position: { x: 0, y: 0 },
			data: { label: rootLabel, type: typeToDisplay[rootType], entityId: rootId, slugType: rootType }
		}
	];
	const edges: Edge<NodeData & EdgeData>[] = [];

	// First-degree relationships via entity_edges
	const { data: edgeRows } = await supabase
		.from('entity_edges')
		.select('source_type, source_id, target_type, target_id, transform_type, source_api, source_url, retrieved_at, confidence_score')
		.or(`and(source_type.eq.${rootType},source_id.eq.${rootId}),and(target_type.eq.${rootType},target_id.eq.${rootId})`);

	const neighbors: Array<{ type: EntityType; id: string; direction: 'out' | 'in'; edge: any }> = [];
	for (const row of edgeRows ?? []) {
		const srcType = (row as any).source_type as EntityType;
		const srcId = (row as any).source_id as string;
		const tgtType = (row as any).target_type as EntityType;
		const tgtId = (row as any).target_id as string;
		if (srcType === rootType && srcId === rootId) {
			neighbors.push({ type: tgtType, id: tgtId, direction: 'out', edge: row });
		} else {
			neighbors.push({ type: srcType, id: srcId, direction: 'in', edge: row });
		}
	}

	// Deduplicate neighbors
	const uniqMap = new Map<string, { type: EntityType; id: string; direction: 'out' | 'in'; edge: any }>();
	for (const n of neighbors) {
		uniqMap.set(`${n.type}:${n.id}`, n);
	}
	const firstNeighbors = Array.from(uniqMap.values()).filter((n) => allowed.has(n.type));

	// Compute positions in a circle around root
	const radius1 = 360;
	const angleStep1 = firstNeighbors.length > 0 ? (2 * Math.PI) / firstNeighbors.length : 0;
	const pushed = new Set<string>([`${rootType}:${rootId}`]);
	for (let i = 0; i < firstNeighbors.length; i++) {
		const n = firstNeighbors[i];
		const angle = i * angleStep1;
		const x = Math.cos(angle) * radius1;
		const y = Math.sin(angle) * radius1;
		const label = await getLabelFor(n.type, n.id, hydrate);
		const nodeId = `${n.type}:${n.id}`;
		if (!pushed.has(nodeId)) {
			nodes.push({
				id: nodeId,
				type: 'default',
				position: { x, y },
				data: { label, type: typeToDisplay[n.type] ?? 'Unknown', entityId: n.id, slugType: n.type }
			});
			pushed.add(nodeId);
		}
		const c = (n.edge as any)?.confidence_score as number | null | undefined;
		const stroke = colorForConfidence(c);
		const width = widthForConfidence(c);
		const manual = typeof (n.edge as any)?.transform_type === 'string' && /(manual|unlink|attach)/i.test((n.edge as any).transform_type);
		const tooltip =
			`type=${(n.edge as any)?.transform_type ?? '—'} • conf=${c ?? '—'} • api=${(n.edge as any)?.source_api ?? '—'} • at=${(n.edge as any)?.retrieved_at ?? '—'}`;
		edges.push({
			id: `${rootType}:${rootId}__${nodeId}`,
			source: n.direction === 'out' ? `${rootType}:${rootId}` : nodeId,
			target: n.direction === 'out' ? nodeId : `${rootType}:${rootId}`,
			type: 'floating',
			data: {
				transform_type: (n.edge as any)?.transform_type ?? null,
				source_api: (n.edge as any)?.source_api ?? null,
				source_url: (n.edge as any)?.source_url ?? null,
				retrieved_at: (n.edge as any)?.retrieved_at ?? null,
				confidence_score: c ?? null,
				tooltip
			},
			style: {
				stroke,
				strokeWidth: width,
				opacity: c == null ? 0.8 : 1,
				strokeDasharray: manual ? '6 4' : undefined
			}
		});
	}

	if (depth === 2) {
		// Build second-degree neighbors around each first-degree node
		const radius2 = 620;
		let idx2 = 0;
		for (const fn of firstNeighbors) {
			// Load edges touching this neighbor
			const { data: nEdges } = await supabase
				.from('entity_edges')
				.select('source_type, source_id, target_type, target_id, transform_type, source_api, source_url, retrieved_at, confidence_score')
				.or(`and(source_type.eq.${fn.type},source_id.eq.${fn.id}),and(target_type.eq.${fn.type},target_id.eq.${fn.id})`);
			const local: Array<{ type: EntityType; id: string; direction: 'out' | 'in'; edge: any }> = [];
			for (const row of nEdges ?? []) {
				const srcType = (row as any).source_type as EntityType;
				const srcId = (row as any).source_id as string;
				const tgtType = (row as any).target_type as EntityType;
				const tgtId = (row as any).target_id as string;
				const thisId = `${fn.type}:${fn.id}`;
				if (srcType === fn.type && srcId === fn.id) {
					// out from neighbor
					if (`${tgtType}:${tgtId}` !== `${rootType}:${rootId}`) {
						local.push({ type: tgtType, id: tgtId, direction: 'out', edge: row });
					}
				} else if (tgtType === fn.type && tgtId === fn.id) {
					if (`${srcType}:${srcId}` !== `${rootType}:${rootId}`) {
						local.push({ type: srcType, id: srcId, direction: 'in', edge: row });
					}
				}
			}
			// Dedup and filter
			const localMap = new Map<string, { type: EntityType; id: string; direction: 'out' | 'in'; edge: any }>();
			for (const n of local) localMap.set(`${n.type}:${n.id}`, n);
			const seconds = Array.from(localMap.values()).filter((n) => allowed.has(n.type) && ((n.edge?.confidence_score ?? 1) >= minConf));
			const angleStep2 = seconds.length > 0 ? (2 * Math.PI) / seconds.length : 0;
			for (let j = 0; j < seconds.length; j++) {
				const n2 = seconds[j];
				const angle = (idx2++ + j) * angleStep2;
				const x = Math.cos(angle) * radius2;
				const y = Math.sin(angle) * radius2;
				const nodeId = `${n2.type}:${n2.id}`;
				if (!pushed.has(nodeId)) {
					const label = await getLabelFor(n2.type, n2.id, hydrate);
					nodes.push({
						id: nodeId,
						type: 'default',
						position: { x, y },
						data: { label, type: typeToDisplay[n2.type] ?? 'Unknown', entityId: n2.id, slugType: n2.type }
					});
					pushed.add(nodeId);
				}
				const c = (n2.edge as any)?.confidence_score as number | null | undefined;
				if (c != null && c < minConf) continue;
				const stroke = SECOND_HOP_EDGE_COLOR;
				const width = widthForConfidence(c);
				const manual = typeof (n2.edge as any)?.transform_type === 'string' && /(manual|unlink|attach)/i.test((n2.edge as any).transform_type);
				const tooltip =
					`type=${(n2.edge as any)?.transform_type ?? '—'} • conf=${c ?? '—'} • api=${(n2.edge as any)?.source_api ?? '—'} • at=${(n2.edge as any)?.retrieved_at ?? '—'}`;
				edges.push({
					id: `${fn.type}:${fn.id}__${nodeId}`,
					source: n2.direction === 'out' ? `${fn.type}:${fn.id}` : nodeId,
					target: n2.direction === 'out' ? nodeId : `${fn.type}:${fn.id}`,
					type: 'floating',
					data: {
						transform_type: (n2.edge as any)?.transform_type ?? null,
						source_api: (n2.edge as any)?.source_api ?? null,
						source_url: (n2.edge as any)?.source_url ?? null,
						retrieved_at: (n2.edge as any)?.retrieved_at ?? null,
						confidence_score: c ?? null,
						tooltip
					},
					style: {
						stroke,
						strokeWidth: width,
						opacity: c == null ? 0.8 : 1,
						strokeDasharray: manual ? '6 4' : undefined
					}
				});
			}
		}
	}

	return { nodes, edges };
}



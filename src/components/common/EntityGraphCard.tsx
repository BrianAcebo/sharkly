import { useEffect, useMemo, useState } from 'react';
import ComponentCard from './ComponentCard';
import FloatingEdgesGraph from '../graphs/FloatingEdges/FloatingEdgesGraph';
import type { Node, Edge } from '@xyflow/react';
import { buildEntityGraph } from '../../utils/graph/buildEntityGraph';
import type { EntityType } from '../../types/entities';

type NodeData = { label: string; type: string };

export default function EntityGraphCard({
	title = 'Graph',
	rootType,
	rootId
}: {
	title?: string;
	rootType: 'person' | 'business';
	rootId: string;
}) {
	const [nodes, setNodes] = useState<Node<NodeData>[]>([]);
	const [edges, setEdges] = useState<Edge<NodeData>[]>([]);
	const [loading, setLoading] = useState(false);
	const [depth, setDepth] = useState<1 | 2>(1);
	const [minConfidencePct, setMinConfidencePct] = useState<number>(0); // 0..100
	const [typeFilters, setTypeFilters] = useState<Record<EntityType, boolean>>({
		person: true,
		business: true,
		email: true,
		phone: true,
		username: true,
		social_profile: true,
		image: true,
		ip: true,
		domain: true,
		leak: true,
		document: true,
		property: true,
		case: false
	});

	useEffect(() => {
		let cancelled = false;
		(async () => {
			if (!rootId) return;
			setLoading(true);
			try {
				const allowed = (Object.keys(typeFilters) as EntityType[]).filter((t) => typeFilters[t]);
				const built = await buildEntityGraph(rootType, rootId, {
					depth,
					minConfidence: (minConfidencePct || 0) / 100,
					allowedTypes: allowed
				});
				if (!cancelled) {
					setNodes(built.nodes);
					setEdges(built.edges);
				}
			} catch (e) {
				if (!cancelled) {
					setNodes([]);
					setEdges([]);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [rootType, rootId, depth, minConfidencePct, JSON.stringify(typeFilters)]);

	const toggleType = (t: EntityType) =>
		setTypeFilters((prev) => ({
			...prev,
			[t]: !prev[t]
		}));

	return (
		<ComponentCard>
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-lg font-semibold">{title}</h3>
				<div className="flex flex-wrap items-center gap-2">
					<label className="text-xs text-muted-foreground">Depth</label>
					<select
						className="rounded border px-2 py-1 text-xs"
						value={depth}
						onChange={(e) => setDepth((e.target.value === '2' ? 2 : 1) as 1 | 2)}
					>
						<option value="1">1 hop</option>
						<option value="2">2 hops</option>
					</select>
					<label className="ml-3 text-xs text-muted-foreground">Min confidence</label>
					<input
						type="range"
						min={0}
						max={100}
						value={minConfidencePct}
						onChange={(e) => setMinConfidencePct(parseInt(e.target.value || '0', 10))}
					/>
					<span className="text-xs tabular-nums">{minConfidencePct}%</span>
				</div>
			</div>
			<div className="mb-2 flex flex-wrap items-center gap-3">
				{(['email','phone','username','social_profile','image','domain','ip','document','leak','property'] as EntityType[]).map((t) => (
					<label key={t} className="flex items-center gap-1 text-xs">
						<input type="checkbox" checked={typeFilters[t]} onChange={() => toggleType(t)} />
						<span className="capitalize">{t.replace('_', ' ')}</span>
					</label>
				))}
			</div>
			<div className="h-[420px] w-full rounded border">
				{loading ? (
					<div className="p-4 text-sm text-muted-foreground">Building graph…</div>
				) : (
					<FloatingEdgesGraph nodes={nodes} edges={edges} />
				)}
			</div>
		</ComponentCard>
	);
}



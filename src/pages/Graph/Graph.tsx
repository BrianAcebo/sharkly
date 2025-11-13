import { useEffect, useState } from 'react';
import { mockCases } from '../../data';
import type { Case } from '../../types/case';
import NotFound from '../Error/NotFound';
import { AuthLoadingState } from '../../contexts/AuthContext';
import { AuthLoading } from '../../components/AuthLoading';
import FloatingEdgesGraph from '../../components/graphs/FloatingEdges/FloatingEdgesGraph';
import { useParams } from 'react-router-dom';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { getCaseById } from '../../api/cases';
import type { Node, Edge } from '@xyflow/react';
import { buildEntityGraph } from '../../utils/graph/buildEntityGraph';

export default function Graph() {
	const [caseReport, setCaseReport] = useState<Case | null>(null);
	const [loading, setLoading] = useState(true);
	const [nodes, setNodes] = useState<Node<any>[]>([]);
	const [edges, setEdges] = useState<Edge<any>[]>([]);
	const [buildingGraph, setBuildingGraph] = useState(false);
	const [depth, setDepth] = useState<1 | 2>(2);
	const [minConfidencePct, setMinConfidencePct] = useState<number>(0);

	const params = useParams();
    const routeId = params.id as string | undefined;

    const { setTitle, setReturnTo } = useBreadcrumbs();

    useEffect(() => {
        setTitle(caseReport?.title || '');
        setReturnTo({ path: '/cases', label: 'Cases' });
    }, [caseReport, setTitle, setReturnTo]);

	useEffect(() => {
        const caseId = routeId || window.location.pathname.split('/').pop() || '';

        let active = true;
        async function run() {
            try {
                const row = await getCaseById(caseId);
                if (!active) return;
                const mapped: Case = {
                    ...row,
                    subject: row.subject ?? {
                        id: row.id,
                        type: 'person',
                        name: {
                            full: row.title,
                            given: '',
                            family: ''
                        },
                        email: '',
                        avatar: '',
                        location: { city: '', country: '', ip: '' },
                        devices: [],
                        social_profiles: []
                    }
                } as Case;
                setCaseReport(mapped);
            } catch (error) {
                // Fallback to mock data
                try {
                    const fallback = mockCases.find((c) => c.id === caseId) || null;
                    setCaseReport(fallback as unknown as Case);
                } catch {
                    console.error('Error fetching case:', error);
                }
            } finally {
                if (active) setLoading(false);
            }
        }
        run();
        return () => {
            active = false;
        };
	}, [routeId]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			if (!caseReport) return;
			// Derive root from case subject
			const subjType = (caseReport.subject_type === 'company' ? 'business' : caseReport.subject_type) as
				| 'person'
				| 'business'
				| null
				| undefined;
			const subjId = (caseReport.subject_id ?? caseReport.subject?.id) as string | undefined;
			if (!subjType || !subjId) return;
			try {
				setBuildingGraph(true);
				const built = await buildEntityGraph(subjType, subjId, {
					depth,
					minConfidence: (minConfidencePct || 0) / 100,
					hydrateLabels: false
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
				if (!cancelled) setBuildingGraph(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [caseReport, depth, minConfidencePct]);

	if (loading) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	if (!caseReport) {
		return <NotFound />;
	}

	return (
		<div className="flex h-main-viewport-height w-full flex-col">
			<div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-4 pt-6">
				<div>
					<h1 className="text-2xl font-semibold">Graph</h1>
					<p className="text-sm text-muted-foreground">{caseReport.title}</p>
				</div>
				<div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
					<label className="text-muted-foreground">Depth</label>
					<select
						className="rounded border px-2 py-1 text-xs md:text-sm"
						value={depth}
						onChange={(e) => setDepth((e.target.value === '2' ? 2 : 1) as 1 | 2)}
					>
						<option value="1">1 hop</option>
						<option value="2">2 hops</option>
					</select>
					<label className="ml-3 text-muted-foreground">Min confidence</label>
					<input
						type="range"
						min={0}
						max={100}
						value={minConfidencePct}
						onChange={(e) => setMinConfidencePct(Number.parseInt(e.target.value || '0', 10))}
					/>
					<span className="text-xs tabular-nums md:text-sm">{minConfidencePct}%</span>
				</div>
			</div>
			<div className="flex-1 px-6 pb-6">
				<div className="h-full">
					{buildingGraph ? (
						<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
							Building graph…
						</div>
					) : (
						<FloatingEdgesGraph nodes={nodes} edges={edges} />
					)}
				</div>
			</div>
		</div>
	);
}

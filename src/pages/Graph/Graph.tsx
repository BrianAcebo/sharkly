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
				const built = await buildEntityGraph(subjType, subjId, { depth: 2, hydrateLabels: false });
				if (!cancelled) {
					setNodes(built.nodes);
					setEdges(built.edges);
				}
			} catch (e) {
				if (!cancelled) {
					setNodes([]);
					setEdges([]);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [caseReport]);

	if (loading) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	if (!caseReport) {
		return <NotFound />;
	}

	return (
		<div className="h-main-viewport-height w-full">
			<FloatingEdgesGraph nodes={nodes} edges={edges} />
		</div>
	);
}

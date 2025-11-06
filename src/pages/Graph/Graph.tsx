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

export default function Graph() {
	const [caseReport, setCaseReport] = useState<Case | null>(null);
	const [loading, setLoading] = useState(true);

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

	if (loading) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	if (!caseReport) {
		return <NotFound />;
	}

	return (
		<div className="h-main-viewport-height w-full">
			<FloatingEdgesGraph />
		</div>
	);
}

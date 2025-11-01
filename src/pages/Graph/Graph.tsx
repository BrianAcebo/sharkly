import { useEffect, useState } from 'react';
import { mockCases } from '../../data';
import type { Case } from '../../types/case';
import NotFound from '../Error/NotFound';
import { AuthLoadingState } from '../../contexts/AuthContext';
import { AuthLoading } from '../../components/AuthLoading';
import FloatingEdgesGraph from '../../components/graphs/FloatingEdges/FloatingEdgesGraph';

export default function Graph() {
	const [caseReport, setCaseReport] = useState<Case | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const caseId = window.location.pathname.split('/').pop();

		try {
			const caseReportData = mockCases.find((c) => c.id === caseId);
			if (caseReportData) {
				setCaseReport(caseReportData);
			} else {
				throw new Error('Case not found');
			}
		} catch (error) {
			console.error('Error:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	if (loading) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	if (!caseReport) {
		return <NotFound />;
	}

	return (
		<div className="h-[calc(var(--screen-visible)-32px)] w-full md:h-[calc(var(--screen-visible)-48px)]">
			<FloatingEdgesGraph />
		</div>
	);
}

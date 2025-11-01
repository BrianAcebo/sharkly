import { useEffect, useState } from 'react';
import PageMeta from '../../components/common/PageMeta';
import { mockCases } from '../../data';
import type { Case } from '../../types/case';
import CaseHeader from '../../components/cases/CaseHeader';
import EntityProfile from '../../components/cases/EntityProfile';
import DevicesSection from '../../components/cases/DevicesSection';
import SocialProfiles from '../../components/cases/SocialProfiles';
import CaseMetadata from '../../components/cases/CaseMetadata';
import NotFound from '../Error/NotFound';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { AuthLoadingState } from '../../contexts/AuthContext';
import { AuthLoading } from '../../components/AuthLoading';

export default function CaseDetail() {
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
			console.error('Error fetching case report:', error);
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
		<div>
			<PageMeta title={caseReport?.title || ''} description={caseReport?.description || ''} />
			<div className="min-h-screen">
				{/* Main Content */}
				<div className="max-w-8xl mx-auto space-y-6">
					<PageBreadcrumb pageTitle={caseReport?.entity.name || ''} />

					<CaseHeader caseData={caseReport} />

					<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
						{/* Left Column */}
						<div className="space-y-6 lg:col-span-2">
							<EntityProfile entity={caseReport?.entity} />
							<DevicesSection devices={caseReport?.entity.devices} />
						</div>

						{/* Right Column */}
						<div className="space-y-6">
							<SocialProfiles profiles={caseReport?.entity.socialProfiles} />
							<CaseMetadata caseData={caseReport} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

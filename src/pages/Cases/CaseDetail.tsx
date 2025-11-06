import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import type { Case, SubjectSocialProfile } from '../../types/case';
import CaseHeader from '../../components/cases/CaseHeader';
import PersonProfile from '../../components/cases/PersonProfile';
import BusinessProfile from '../../components/cases/BusinessProfile';
import DevicesSection from '../../components/cases/DevicesSection';
import SocialProfiles from '../../components/cases/SocialProfiles';
import CaseEntityGraph from '../../components/cases/CaseEntityGraph';
import CaseNotes from '../../components/cases/CaseNotes';
import CaseWebMentions from '../../components/cases/CaseWebMentions';
import CaseActivity from '../../components/cases/CaseActivity';
import CaseEvidence from '../../components/cases/CaseEvidence';
import type { PersonRecord } from '../../types/person';
import type { BusinessRecord } from '../../types/business';
import NotFound from '../Error/NotFound';
import { AuthLoadingState } from '../../contexts/AuthContext';
import { AuthLoading } from '../../components/AuthLoading';
import { getCaseById } from '../../api/cases';
//
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '../../components/ui/alert-dialog';
import { archiveCase, unarchiveCase, deleteCase } from '../../api/cases';
import { useNavigate } from 'react-router-dom';
//
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import EditCaseDialog from '../../components/cases/EditCaseDialog';
import CaseAssignees from '../../components/cases/CaseAssignees';

export default function CaseDetail() {
    const params = useParams();
    const routeId = params.id as string | undefined;
    const [caseReport, setCaseReport] = useState<Case | null>(null);
	const [loading, setLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const navigate = useNavigate();

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
                console.error('Error fetching case:', error);
            } finally {
                if (active) setLoading(false);
            }
        }
        run();
        return () => {
            active = false;
        };
    }, [routeId]);

    // No inline editing; modal handles edits

	if (loading) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	if (!caseReport) {
		return <NotFound />;
	}

	return (
		<div>
			<PageMeta title={caseReport?.title || ''} description={caseReport?.description || ''} />
			<div className="min-h-screen-height-visible">
				{/* Main Content */}
				<div className="max-w-8xl mx-auto space-y-6">
                    {/* Action bar */}
                    <div className="flex items-center justify-between w-full">
                        <CaseHeader
                            caseData={caseReport}
                            onEdit={() => setEditOpen(true)}
                            onArchive={async () => {
                                try {
                                    await archiveCase(caseReport.id);
                                    const refreshed = await getCaseById(caseReport.id);
                                    setCaseReport(refreshed);
                                } catch (e) { console.error('Archive failed', e); }
                            }}
                            onUnarchive={async () => {
                                try {
                                    await unarchiveCase(caseReport.id);
                                    const refreshed = await getCaseById(caseReport.id);
                                    setCaseReport(refreshed);
                                } catch (e) { console.error('Unarchive failed', e); }
                            }}
                            onDelete={() => setDeleteOpen(true)}
                        />
                    </div>

                    {
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            <div className="space-y-6 lg:col-span-2">
                                {caseReport?.subject && caseReport.subject_type !== 'company' && (
                                    <PersonProfile person={caseReport.subject as unknown as PersonRecord} />
                                )}
                                {caseReport?.subject && caseReport.subject_type !== 'company' && (
                                    <DevicesSection devices={(caseReport.subject as unknown as PersonRecord).devices} />
                                )}
                                {caseReport?.subject && caseReport.subject_type === 'company' && (
                                    <BusinessProfile business={caseReport.subject as unknown as BusinessRecord} />
                                )}
                                {caseReport?.subject && caseReport.subject_type !== 'company' && (
                                    <CaseWebMentions
                                        personId={(caseReport.subject as unknown as PersonRecord).id}
                                        allowManage
                                    />
                                )}
                                <CaseNotes caseId={caseReport.id} />
                            </div>
                            <div className="space-y-6">
                                {caseReport?.subject && caseReport.subject_type !== 'company' && (
                                    <SocialProfiles
                                        profiles={
                                            ((caseReport.subject as unknown as PersonRecord)
                                                .social_profiles as unknown as SubjectSocialProfile[]) ?? []
                                        }
                                    />
                                )}
                                <CaseEntityGraph caseData={caseReport} />
                                <CaseEvidence caseId={caseReport.id} subjectId={(caseReport.subject as unknown as PersonRecord)?.id ?? null} />
                                <CaseAssignees caseData={caseReport} />
                                <CaseActivity caseId={caseReport.id} />
                            </div>
                        </div>
                    }
				</div>
			</div>
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this case?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the case.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                            try {
                                await deleteCase(caseReport.id);
                                setDeleteOpen(false);
                                navigate('/cases');
                            } catch (e) {
                                console.error('Delete failed', e);
                            }
                        }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {caseReport && (
                <EditCaseDialog
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    caseData={caseReport}
                    onUpdated={async () => {
                        const refreshed = await getCaseById(caseReport.id);
                        setCaseReport(refreshed);
                    }}
                />
            )}
        </div>
	);
}

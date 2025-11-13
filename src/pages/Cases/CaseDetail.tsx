import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import type { Case, SubjectDevice, SubjectSocialProfile } from '../../types/case';
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
import { getPersonById } from '../../api/people';
import { getBusinessById } from '../../api/businesses';
import { formatPersonName } from '../../utils/person';
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

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const isPersonSnapshot = (value: unknown): value is PersonRecord =>
	isObject(value) && 'emails' in value;

const isBusinessSnapshot = (value: unknown): value is BusinessRecord =>
	isObject(value) && 'ein_tax_id' in value;

const normalizeSocialProfile = (entry: unknown): SubjectSocialProfile | null => {
	if (!isObject(entry)) {
		return null;
	}

	if ('profile' in entry && isObject(entry.profile)) {
		const prof = entry.profile;
		const handleRaw = typeof prof.handle === 'string' ? prof.handle : '';
		const username =
			handleRaw.replace(/^@/, '') ||
			(typeof prof.display_name === 'string' ? prof.display_name : '');
		const platform = typeof prof.platform === 'string' ? prof.platform : 'unknown';
		const url = typeof prof.profile_url === 'string' ? prof.profile_url : undefined;
		if (!platform && !username && !url) return null;
		return {
			platform,
			username,
			url
		};
	}

	const platform = typeof entry.platform === 'string' ? entry.platform : 'unknown';
	const username = typeof entry.username === 'string' ? entry.username.replace(/^@/, '') : '';
	const url = typeof entry.url === 'string' ? entry.url : undefined;
	if (!platform && !username && !url) return null;
	return {
		platform,
		username,
		url
	};
};

export default function CaseDetail() {
    const params = useParams();
    const routeId = params.id as string | undefined;
    const [caseReport, setCaseReport] = useState<Case | null>(null);
	const [loading, setLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [personSubject, setPersonSubject] = useState<PersonRecord | null>(null);
    const [businessSubject, setBusinessSubject] = useState<BusinessRecord | null>(null);
    const navigate = useNavigate();

    const { setTitle, setReturnTo } = useBreadcrumbs();

    useEffect(() => {
        setTitle(caseReport?.title || '');
        setReturnTo({ path: '/cases', label: 'Cases' });
    }, [caseReport, setTitle, setReturnTo]);

	useEffect(() => {
        const caseId = routeId || window.location.pathname.split('/').pop() || '';
        if (!caseId) {
            setCaseReport(null);
            setPersonSubject(null);
            setBusinessSubject(null);
            setLoading(false);
            return;
        }

        let active = true;
        setLoading(true);
        setPersonSubject(null);
        setBusinessSubject(null);

        (async () => {
            try {
                const row = await getCaseById(caseId);
                if (!active) return;

                const subjectType =
                    (row.subject_type as 'person' | 'company' | null) ??
                    ((row.subject as { type?: string } | null)?.type as 'person' | 'company' | null) ??
                    null;
                const subjectId =
                    (row.subject_id as string | null) ??
                    ((row.subject as { id?: string } | null)?.id ?? null);

                let resolvedPerson: PersonRecord | null = null;
                let resolvedBusiness: BusinessRecord | null = null;

                const subjectSnapshot = row.subject;

                if (subjectType === 'person' && subjectId) {
                    if (isPersonSnapshot(subjectSnapshot)) {
                        resolvedPerson = subjectSnapshot;
                    } else {
                        try {
                            const fetched = await getPersonById(subjectId);
                            if (!active) return;
                            resolvedPerson = fetched;
                        } catch (err) {
                            console.error('Failed to load linked person for case', err);
                        }
                    }
                } else if (subjectType === 'company' && subjectId) {
                    if (isBusinessSnapshot(subjectSnapshot)) {
                        resolvedBusiness = subjectSnapshot;
                    } else {
                        try {
                            const fetched = await getBusinessById(subjectId);
                            if (!active) return;
                            resolvedBusiness = fetched;
                        } catch (err) {
                            console.error('Failed to load linked business for case', err);
                        }
                    }
                }

                const mapped: Case = {
                    ...row,
                    subject: (resolvedPerson ?? resolvedBusiness ?? row.subject ?? null) as Case['subject']
                };

                if (!active) return;
                setCaseReport(mapped);
                setPersonSubject(resolvedPerson);
                setBusinessSubject(resolvedBusiness);
            } catch (error) {
                console.error('Error fetching case:', error);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [routeId]);

    // No inline editing; modal handles edits

    const personForDisplay: PersonRecord | null = useMemo(() => {
        if (!caseReport || caseReport.subject_type === 'company') return null;
        if (personSubject) return personSubject;
        const snapshot = caseReport.subject;
        return isPersonSnapshot(snapshot) ? snapshot : null;
    }, [caseReport, personSubject]);

    const businessForDisplay: BusinessRecord | null = useMemo(() => {
        if (!caseReport || caseReport.subject_type !== 'company') return null;
        if (businessSubject) return businessSubject;
        const snapshot = caseReport.subject;
        return isBusinessSnapshot(snapshot) ? snapshot : null;
    }, [caseReport, businessSubject]);

    const socialProfilesForDisplay: SubjectSocialProfile[] = useMemo(() => {
        if (!personForDisplay || !Array.isArray(personForDisplay.social_profiles)) return [];
        return personForDisplay.social_profiles
            .map((entry) => normalizeSocialProfile(entry))
            .filter((profile): profile is SubjectSocialProfile => Boolean(profile));
    }, [personForDisplay]);

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
                                {personForDisplay && (
                                    <PersonProfile person={personForDisplay} />
                                )}
                                {personForDisplay && personForDisplay.devices?.length ? (
                                    <DevicesSection devices={(personForDisplay.devices ?? []) as SubjectDevice[]} />
                                ) : null}
                                {businessForDisplay && (
                                    <BusinessProfile business={businessForDisplay} />
                                )}
                                {personForDisplay && (
                                    <CaseWebMentions
                                        entity={{
                                            id: personForDisplay.id,
                                            type: 'person',
                                            name: formatPersonName(personForDisplay.name)
                                        }}
                                        allowManage
                                    />
                                )}
                                <CaseNotes caseId={caseReport.id} />
                            </div>
                            <div className="space-y-6">
                                {personForDisplay && socialProfilesForDisplay.length > 0 && (
                                    <SocialProfiles profiles={socialProfilesForDisplay} />
                                )}
                                <CaseEntityGraph caseData={caseReport} />
                                <CaseEvidence
                                    caseId={caseReport.id}
                                    subjectId={personForDisplay?.id ?? businessForDisplay?.id ?? null}
                                />
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

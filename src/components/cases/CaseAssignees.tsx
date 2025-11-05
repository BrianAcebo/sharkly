import React from 'react';
import { Plus } from 'lucide-react';
import type { Case } from '../../types/case';
import ComponentCard from '../common/ComponentCard';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '../../contexts/AuthContext';
import { updateCase } from '../../api/cases';

interface CaseAssigneesProps {
	caseData: Case;
}

const CaseAssignees: React.FC<CaseAssigneesProps> = ({ caseData }) => {
    const { teamMembers } = useTeamMembers();
    const { user } = useAuth();
    const [controlsOpen, setControlsOpen] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    // Normalize assigned list: accept either string[] of user IDs or Investigator[]
    const assignees = React.useMemo(() => {
        const raw = (caseData as unknown as { assigned_to?: unknown }).assigned_to as unknown;
        if (!Array.isArray(raw)) return [] as Array<{ id: string; first_name: string; last_name: string; avatar?: string }>;
        // If first element looks like an object with profile, map from there
        const first = raw[0] as unknown;
        if (first && typeof first === 'object' && 'profile' in (first as Record<string, unknown>)) {
            return (raw as Array<{ profile: { id: string; first_name: string; last_name: string; avatar?: string } }>).map((r) => r.profile);
        }
        // Otherwise assume string[] of ids and hydrate from team members
        const ids = raw as string[];
        return ids
            .map((id) => teamMembers.find((m) => m.profile.id === id)?.profile)
            .filter(Boolean) as Array<{ id: string; first_name: string; last_name: string; avatar?: string }>;
    }, [caseData, teamMembers]);
    // Maintain ids for persistence
    const assignedIds: string[] = React.useMemo(() => {
        const raw = (caseData as unknown as { assigned_to?: unknown }).assigned_to as unknown;
        if (!Array.isArray(raw)) return [];
        const first = raw[0] as unknown;
        if (first && typeof first === 'object' && 'profile' in (first as Record<string, unknown>)) {
            return (raw as Array<{ profile: { id: string } }>).map((r) => r.profile.id);
        }
        return raw as string[];
    }, [caseData]);

    const persist = async (ids: string[]) => {
        setSaving(true);
        try {
            await updateCase(caseData.id, { assigned_to: ids });
        } finally {
            setSaving(false);
        }
    };

    return (
		<>
            <ComponentCard>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Assigned Investigators</h3>
                    <Button variant="ghost" size="icon" onClick={() => setControlsOpen((o) => !o)} aria-label="Manage assignees">
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>

                <div>
                    <div className="mt-1 flex flex-wrap gap-2">
                        {assignees.length > 0 ? (
                            assignees.map((profile, index) => (
                                <div key={index} className="flex items-center gap-2 rounded-full border px-2 py-1">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={profile.avatar || ''} alt={profile.first_name} />
                                        <AvatarFallback>{(profile.first_name || '?').charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{profile.first_name} {profile.last_name}</span>
                                    {controlsOpen && (
                                        <button
                                            className="text-xs opacity-70 hover:opacity-100"
                                            onClick={() => persist(assignedIds.filter((x) => x !== profile.id))}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <span className="text-xs text-gray-500">No assignees</span>
                        )}
                    </div>
                </div>

                {controlsOpen && (
                    <div className="mt-3 flex items-center gap-2">
                        <Select onValueChange={(v) => { if (!assignedIds.includes(v)) void persist([...assignedIds, v]); }}>
                            <SelectTrigger className="w-64">
                                <SelectValue placeholder="Add investigator" />
                            </SelectTrigger>
                            <SelectContent>
                                {teamMembers.map((m) => (
                                    <SelectItem key={m.profile.id} value={m.profile.id}>
                                        {m.profile.first_name} {m.profile.last_name} ({m.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" disabled={saving} onClick={() => { if (user?.id && !assignedIds.includes(user.id)) void persist([...assignedIds, user.id]); }}>Assign to me</Button>
                    </div>
                )}
            </ComponentCard>
		</>
	);
};

export default CaseAssignees;

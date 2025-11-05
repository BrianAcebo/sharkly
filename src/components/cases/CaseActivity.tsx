import * as React from 'react';
import ComponentCard from '../common/ComponentCard';
import { listCaseActivity, type CaseAuditEntry } from '../../api/cases';
import { supabase } from '../../utils/supabaseClient';
import { UserAvatar } from '../common/UserAvatar';
import { useAuth } from '../../contexts/AuthContext';

type ProfileMini = { id: string; first_name?: string; last_name?: string; avatar?: string };

export default function CaseActivity({ caseId }: { caseId: string }) {
  const [entries, setEntries] = React.useState<CaseAuditEntry[]>([]);
  const [profiles, setProfiles] = React.useState<Record<string, ProfileMini>>({});
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const pageSize = 3;
  const { user } = useAuth();

  React.useEffect(() => {
    (async () => {
      try {
        const rows = await listCaseActivity(caseId, user?.id);
        setEntries(rows);
        const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[];
        if (actorIds.length) {
          const { data } = await supabase
            .from('profiles')
            .select('id,first_name,last_name,avatar')
            .in('id', actorIds);
          const map: Record<string, ProfileMini> = {};
          (data || []).forEach((p: ProfileMini) => (map[p.id] = p));
          setProfiles(map);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [caseId, user?.id]);

  const labelFor = (e: CaseAuditEntry) => {
    // e.action examples: note_created, note_deleted, evidence_uploaded, case_updated
    const action = e.action.replace(/_/g, ' ');
    const entity = e.entity.replace(/_/g, ' ');
    return `${action.charAt(0).toUpperCase() + action.slice(1)} ${entity}`;
  };

  const describeChanges = (e: CaseAuditEntry) => {
    const d = (e.details || {}) as Record<string, unknown>;
    const changed = (d.changed_fields as string[] | undefined) || [];
    if (changed.length === 0) return null;
    return `${changed.slice(0, 4).join(', ')}${changed.length > 4 ? ` (+${changed.length - 4} more)` : ''}`;
  };

  return (
    <ComponentCard>
      <h3 className="mb-4 text-lg font-semibold">Case Activity</h3>
      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-gray-500">No recent activity.</div>
      ) : (
        <>
        <ul className="space-y-3">
          {entries.slice((page-1)*pageSize, (page-1)*pageSize + pageSize).map((e) => {
            const p = (e.actor_id && profiles[e.actor_id]) || undefined;
            const name = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'System';
            return (
              <li key={e.id} className="flex items-start gap-3 rounded border p-3">
                <UserAvatar user={{ name, avatar: p?.avatar || null }} size="sm" />
                <div className="flex-1">
                  <div className="text-sm">
                    <a href={`/investigators/${e.actor_id ?? ''}`} className="font-medium hover:underline">{name || 'User'}</a> {labelFor(e)}
                  </div>
                  <div className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString()}</div>
                  {describeChanges(e) && (
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">Fields: {describeChanges(e)}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex items-center justify-between">
          <button className="text-sm text-gray-600 disabled:opacity-50" disabled={page<=1} onClick={() => setPage((p)=>Math.max(1,p-1))}>Previous</button>
          <span className="text-xs text-gray-500">Page {page} of {Math.max(1, Math.ceil(entries.length / pageSize))}</span>
          <button className="text-sm text-gray-600 disabled:opacity-50" disabled={page>=Math.ceil(entries.length/pageSize)} onClick={()=>setPage((p)=>p+1)}>Next</button>
        </div>
        </>
      )}
    </ComponentCard>
  );
}



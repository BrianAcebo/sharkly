import * as React from 'react';
import ComponentCard from '../common/ComponentCard';
import { listCaseActivity, type AuditLogEntry } from '../../api/cases';
import { supabase } from '../../utils/supabaseClient';
import { UserAvatar } from '../common/UserAvatar';

type ProfileMini = { id: string; first_name?: string; last_name?: string; avatar?: string };

export default function CaseActivity({ caseId }: { caseId: string }) {
  const [entries, setEntries] = React.useState<AuditLogEntry[]>([]);
  const [profiles, setProfiles] = React.useState<Record<string, ProfileMini>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const rows = await listCaseActivity(caseId);
        setEntries(rows);
        const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[];
        if (actorIds.length) {
          const { data } = await supabase
            .from('profiles')
            .select('id,first_name,last_name,avatar')
            .in('id', actorIds);
          const map: Record<string, ProfileMini> = {};
          (data || []).forEach((p: any) => (map[p.id] = p));
          setProfiles(map);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [caseId]);

  const labelFor = (e: AuditLogEntry) => {
    const entity = e.table_name.replace(/^public\./, '');
    switch (e.action) {
      case 'INSERT':
        return `Created ${entity}`;
      case 'UPDATE':
        return `Updated ${entity}`;
      case 'DELETE':
        return `Deleted ${entity}`;
      default:
        return `${e.action} ${entity}`;
    }
  };

  return (
    <ComponentCard>
      <h3 className="mb-4 text-lg font-semibold">Case Activity</h3>
      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-gray-500">No recent activity.</div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => {
            const p = (e.actor_id && profiles[e.actor_id]) || undefined;
            const name = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'System';
            return (
              <li key={e.id} className="flex items-start gap-3 rounded border p-3">
                <UserAvatar user={{ name, avatar: p?.avatar || null }} size="sm" />
                <div className="flex-1">
                  <div className="text-sm">
                    <span className="font-medium">{name || 'User'}</span> {labelFor(e)}
                  </div>
                  <div className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString()}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ComponentCard>
  );
}



import * as React from 'react';
import ComponentCard from '../common/ComponentCard';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { createCaseNote, deleteCaseNote, listCaseNotes, type CaseNote } from '../../api/cases';
import { supabase } from '../../utils/supabaseClient';
import { UserAvatar } from '../common/UserAvatar';
import { useAuth } from '../../contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../ui/alert-dialog';

export default function CaseNotes({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const [notes, setNotes] = React.useState<CaseNote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [authors, setAuthors] = React.useState<Record<string, { first_name?: string; last_name?: string; avatar?: string }>>({});
  const [content, setContent] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const orgId = user?.organization_id;
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const rows = await listCaseNotes(caseId);
      setNotes(rows);
      const ids = Array.from(new Set(rows.map((r) => r.author_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data } = await supabase.from('profiles').select('id,first_name,last_name,avatar').in('id', ids);
        const map: Record<string, { first_name?: string; last_name?: string; avatar?: string }> = {};
        (data as Array<{ id: string; first_name?: string; last_name?: string; avatar?: string }> | null || []).forEach((p) => {
          map[p.id] = p;
        });
        setAuthors(map);
      } else {
        setAuthors({});
      }
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const addNote = async () => {
    if (!orgId) return;
    const text = content.trim();
    if (!text) return;
    await createCaseNote({ case_id: caseId, organization_id: orgId, author_id: user?.id ?? null, content: text, data_source_tags: tags });
    setContent('');
    setTags([]);
    await load();
  };

  const remove = async () => {
    if (!deleteId) return;
    await deleteCaseNote(deleteId);
    setDeleteId(null);
    await load();
  };

  return (
    <ComponentCard>
      <div className="mb-3 text-lg font-semibold">Case Notes</div>
      <div className="space-y-3">
        <div className="space-y-2">
          <Textarea
            rows={6}
            placeholder="Add a private note for your team..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {/* <div>
            <div className="mb-1 text-xs text-gray-500">Data-source tags</div>
            <div className="flex flex-wrap gap-2">
              {tags.map((t, i) => (
                <span key={t + i} className="flex items-center gap-2 rounded border px-2 py-1 text-xs">
                  {t}
                  <button onClick={() => setTags((cur) => cur.filter((x, idx) => idx !== i))}>×</button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Add tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const v = tagInput.trim();
                    if (!v) return;
                    setTags((cur) => Array.from(new Set([...cur, v])));
                    setTagInput('');
                  }
                }}
              />
            </div>
          </div> */}
          <div className="flex justify-end">
            <Button size="sm" onClick={addNote} disabled={!content.trim()}>Add Note</Button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="text-sm text-gray-500">No notes yet.</div>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => {
              const a = (n.author_id && authors[n.author_id]) || undefined;
              const name = a ? `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'User' : 'User';
              return (
              <li key={n.id} className="rounded border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <UserAvatar user={{ name, avatar: a?.avatar || null }} size="sm" />
                  <div>
                    <div className="text-sm font-medium">{name}</div>
                    <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-sm">{n.content}</div>
                {(n.data_source_tags && n.data_source_tags.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {n.data_source_tags.map((t, i) => (
                      <span key={t + i} className="rounded border px-2 py-0.5 text-[11px]">{t}</span>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(n.id)}>Delete</Button>
                </div>
              </li>
            )})}
          </ul>
        )}
      </div>
      <AlertDialog open={Boolean(deleteId)} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the note from this case.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ComponentCard>
  );
}



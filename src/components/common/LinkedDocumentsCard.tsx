import ComponentCard from './ComponentCard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import TextArea from '../form/input/TextArea';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { searchDocuments, createDocument, attachDocumentToPerson, attachDocumentToProperty, detachDocumentFromPerson, detachDocumentFromProperty } from '../../api/documents';
import { Link2Off, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

export type LinkedDocumentItem = {
  id: string;
  title: string;
  linkTo: string;
  transformType?: string | null;
  confidenceScore?: number | null;
  retrievedAt?: string | null;
};

export default function LinkedDocumentsCard({
  title = 'Documents',
  items,
  onUnlink,
  displayName,
  ownerId,
  organizationId,
  ownerType = 'person',
  onAttached
}: {
  title?: string;
  items: LinkedDocumentItem[];
  onUnlink: (documentId: string) => void | Promise<void>;
  displayName?: string;
  ownerId: string;
  organizationId: string;
  ownerType?: 'person' | 'property' | 'business';
  onAttached?: (doc: { id: string; title: string }) => void;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [docType, setDocType] = useState<'court' | 'filing' | 'pdf' | 'other'>('other');
  const [sourceUrl, setSourceUrl] = useState('');
  const [author, setAuthor] = useState('');
  const [date, setDate] = useState('');
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const runSearch = async (v: string) => {
    if (!organizationId || v.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await searchDocuments(organizationId, v, 10);
      setResults(rows);
    } finally {
      setLoading(false);
    }
  };

  const attach = async (documentId: string, title: string, transform: 'manual_link' | 'manual_create' = 'manual_link') => {
    if (ownerType === 'person') {
      await attachDocumentToPerson(documentId, ownerId, { transform_type: transform });
    } else if (ownerType === 'property') {
      await attachDocumentToProperty(documentId, ownerId, { transform_type: transform });
    } else {
      const { attachDocumentToBusiness } = await import('../../api/documents');
      await attachDocumentToBusiness(documentId, ownerId, { transform_type: transform });
    }
    onAttached?.({ id: documentId, title });
    toast.success('Document linked');
  };

  const truncate = (val: string, limit = 80) => {
    if (!val) return '—';
    return val.length > limit ? `${val.slice(0, limit - 1)}…` : val;
  };

  const createAndAttach = async () => {
    setCreating(true);
    try {
      const created = await createDocument({
        organization_id: organizationId,
        doc: { type: docType },
        source_url: sourceUrl.trim() || null,
        text: text.trim() || null,
        metadata: { author: author.trim() || null, date: date.trim() || null }
      });
      await attach(created.id, `${docType}${author ? `: ${author}` : ''}`, 'manual_create');
      setManageOpen(false);
      setQuery('');
      setSourceUrl('');
      setAuthor('');
      setDate('');
      setText('');
      setDocType('other');
    } catch (err) {
      console.error('Failed to create document', err);
      toast.error('Failed to create document.');
    } finally {
      setCreating(false);
    }
  };

  const uploadAndAttach = async () => {
    if (!organizationId || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const path = `${organizationId}/${Date.now()}-${file.name.replace(/\s+/g, '+')}`;
        const upRes = await supabase.storage.from('evidence').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/pdf'
        });
        if (upRes.error) throw upRes.error;
        const created = await createDocument({
          organization_id: organizationId,
          doc: { type: docType },
          metadata: { author: author.trim() || file.name, date: date.trim() || null },
          source_url: path,
          text: text.trim() || null
        });
        await attach(created.id, `${docType}${author ? `: ${author}` : ''}`, 'manual_create');
      }
      setFiles([]);
      setManageOpen(false);
      setQuery('');
      setSourceUrl('');
      setAuthor('');
      setDate('');
      setText('');
      setDocType('other');
      toast.success('Document(s) uploaded and linked.');
    } catch (e) {
      console.error('Upload failed', e);
      toast.error('Failed to upload documents.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ComponentCard>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
          <Pencil className="size-4" />
        </Button>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No documents linked.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded border p-3">
                <Link to={i.linkTo} className="text-sm font-medium hover:underline">
                  {i.title}
                </Link>
                <Button size="sm" variant="ghost" onClick={() => onUnlink(i.id)} title="Unlink">
                  <Link2Off className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Manage Dialog */}
      <div className={manageOpen ? '' : 'hidden'}>
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setManageOpen(false)} />
        <div className="fixed left-1/2 top-1/2 z-50 w-[min(700px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-4 shadow-xl">
          <div className="mb-3 text-lg font-semibold">Manage documents</div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">Search and attach</div>
                <Input
                  placeholder="Search by text/author/url…"
                  value={query}
                  onChange={async (e) => {
                    const v = e.target.value;
                    setQuery(v);
                    await runSearch(v);
                  }}
                />
              </div>
              <div className="max-h-72 space-y-2 overflow-auto">
                {loading ? (
                  <div className="text-muted-foreground text-sm">Searching…</div>
                ) : (
                  results.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded border p-3">
                      <div className="text-sm font-medium max-w-[50ch] truncate" title={r.title}>
                        {truncate(r.title, 80)}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await attach(r.id, r.title, 'manual_link');
                          } catch (err) {
                            console.error('Failed to link document', err);
                            toast.error('Failed to link document.');
                          }
                        }}
                      >
                        Attach
                      </Button>
                    </div>
                  ))
                )}
              </div>
              {items.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Currently linked</div>
                  <div className="space-y-2">
                    {items.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded border p-3">
                        <Link to={e.linkTo} className="text-sm font-medium hover:underline max-w-[50ch] truncate" title={e.title}>
                          {truncate(e.title, 80)}
                        </Link>
                        <Button size="sm" variant="ghost" onClick={() => onUnlink(e.id)}>
                          Unlink
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">Create new document</div>
                <div className="grid grid-cols-2 gap-2">
                  <select className="rounded border p-2 text-sm" value={docType} onChange={(e) => setDocType(e.target.value as any)}>
                    <option value="court">court</option>
                    <option value="filing">filing</option>
                    <option value="pdf">pdf</option>
                    <option value="other">other</option>
                  </select>
                  <Input placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
                </div>
                <Input placeholder="Source URL" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
                <Input placeholder="Date (YYYY-MM-DD)" value={date} onChange={(e) => setDate(e.target.value)} />
                <TextArea placeholder="Text (optional)" value={text} onChange={setText} />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Or upload</div>
                <div
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed p-6 text-center hover:bg-muted/50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dropped = Array.from(e.dataTransfer.files || []).filter((f) => !!f);
                    setFiles(dropped);
                  }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = '*/*';
                    input.onchange = (e: any) => setFiles(Array.from(e.target.files || []));
                    input.click();
                  }}
                >
                  <div className="text-sm font-medium">Drag & drop documents</div>
                  <div className="text-xs text-gray-500">or click to browse</div>
                </div>
                {files.length > 0 && (
                  <div className="rounded border p-3">
                    <div className="mb-2 text-xs text-muted-foreground">Ready</div>
                    <ul className="space-y-1 text-sm">
                      {files.map((f) => (
                        <li key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center justify-between">
                          <span className="truncate">{f.name}</span>
                          <span className="text-xs text-gray-500">{(f.size / 1024).toFixed(1)} KB</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setManageOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (files.length > 0) {
                      await uploadAndAttach();
                    } else {
                      await createAndAttach();
                    }
                  }}
                  disabled={creating || uploading}
                >
                  {creating || uploading ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}



import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { useAuth } from '../../contexts/AuthContext';
import useDebounce from '../../hooks/useDebounce';
import { searchDocuments, createDocument } from '../../api/documents';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import TextArea from '../../components/form/input/TextArea';
import { supabase } from '../../utils/supabaseClient';

export default function DocumentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; title: string }>>([]);
  const debounced = useDebounce(q, 350);
  const [createOpen, setCreateOpen] = useState(false);
  const [docType, setDocType] = useState<'court' | 'filing' | 'pdf' | 'other'>('other');
  const [author, setAuthor] = useState('');
  const [date, setDate] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [text, setText] = useState('');
  const [creating, setCreating] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const rows = await searchDocuments(user.organization_id, debounced, 24);
        if (!active) return;
        setResults(rows);
      } finally {
        if (active) setLoading(false);
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [user?.organization_id, debounced]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageMeta title="Documents" description="Documents directory" noIndex />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <div className="flex items-center gap-2">
          <div className="w-full max-w-sm">
            <Input placeholder="Search documents…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} title="Create document">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : results.length === 0 ? (
        <div className="text-sm text-muted-foreground">No documents found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {results.map((i) => (
            <Card key={i.id} className="cursor-pointer" onClick={() => navigate(`/documents/${i.id}`)}>
              <CardHeader>
                <div className="font-medium truncate">{i.title}</div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">Document</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create document</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              <select className="rounded border p-2 text-sm" value={docType} onChange={(e) => setDocType(e.target.value as any)}>
                <option value="court">court</option>
                <option value="filing">filing</option>
                <option value="pdf">pdf</option>
                <option value="other">other</option>
              </select>
              <Input placeholder="Author (optional)" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <Input placeholder="Date (optional, YYYY-MM-DD)" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input placeholder="Source URL (optional)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
            <TextArea placeholder="Text (optional)" value={text} onChange={setText} />
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
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!user?.organization_id) return;
                  if (files.length > 0) {
                    setUploading(true);
                    try {
                      const createdIds: string[] = [];
                      for (const file of files) {
                        const path = `${user.organization_id}/${Date.now()}-${file.name.replace(/\s+/g, '+')}`;
                        const upRes = await supabase.storage.from('evidence').upload(path, file, {
                          cacheControl: '3600',
                          upsert: false,
                          contentType: file.type || 'application/pdf'
                        });
                        if (upRes.error) throw upRes.error;
                        const created = await createDocument({
                          organization_id: user.organization_id,
                          doc: { type: docType },
                          metadata: { author: author.trim() || file.name, date: date.trim() || null },
                          source_url: path,
                          text: text.trim() || null
                        });
                        createdIds.push(created.id);
                      }
                      toast.success(files.length > 1 ? 'Documents uploaded.' : 'Document uploaded.');
                      setFiles([]);
                      setCreateOpen(false);
                      const rows = await searchDocuments(user.organization_id, debounced, 24);
                      setResults(rows);
                      if (createdIds.length === 1) navigate(`/documents/${createdIds[0]}`);
                    } catch (e) {
                      console.error('Upload failed', e);
                      toast.error('Failed to upload documents.');
                    } finally {
                      setUploading(false);
                    }
                  } else {
                    setCreating(true);
                    try {
                      const created = await createDocument({
                        organization_id: user.organization_id,
                        doc: { type: docType },
                        metadata: { author: author.trim() || null, date: date.trim() || null },
                        source_url: sourceUrl.trim() || null,
                        text: text.trim() || null
                      });
                      toast.success('Document created.');
                      setCreateOpen(false);
                      setAuthor('');
                      setDate('');
                      setSourceUrl('');
                      setText('');
                      navigate(`/documents/${created.id}`);
                    } catch (e) {
                      console.error('Failed to create document', e);
                      toast.error('Failed to create document.');
                    } finally {
                      setCreating(false);
                    }
                  }
                }}
                disabled={creating || uploading}
              >
                {creating || uploading ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



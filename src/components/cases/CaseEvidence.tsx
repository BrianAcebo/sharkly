import * as React from 'react';
import ComponentCard from '../common/ComponentCard';
import { Button } from '../ui/button';
import { listEvidence, uploadEvidence, deleteEvidence } from '../../api/cases';
import { Evidence } from '../../types/case';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
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
import { toast } from 'sonner';

export default function CaseEvidence({ caseId, subjectId }: { caseId: string; subjectId?: string | null }) {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const [items, setItems] = React.useState<Evidence[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [signedUrls, setSignedUrls] = React.useState<Record<string, string>>({});
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerItem, setViewerItem] = React.useState<Evidence | null>(null);
  const [viewerUrl, setViewerUrl] = React.useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const formatFileName = React.useCallback((name: string, maxLen = 48) => {
    const cleaned = name.replace(/\+/g, ' ');
    if (cleaned.length <= maxLen) return cleaned;
    const dot = cleaned.lastIndexOf('.');
    const ext = dot !== -1 ? cleaned.slice(dot) : '';
    const base = dot !== -1 ? cleaned.slice(0, dot) : cleaned;
    const keep = Math.max(8, Math.floor((maxLen - ext.length - 1) / 2));
    const head = base.slice(0, keep);
    const tail = base.slice(-keep);
    return `${head}\u2026${tail}${ext}`; // middle ellipsis
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listEvidence(caseId);
      setItems(rows);
      // prefetch signed urls for previews
      const map: Record<string, string> = {};
      for (const r of rows) {
        if (r.file_type.startsWith('image/')) {
          const { data } = await supabase.storage.from('evidence').createSignedUrl(r.storage_path, 60 * 10);
          if (data?.signedUrl) map[r.id] = data.signedUrl;
        }
      }
      setSignedUrls(map);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onUpload = async () => {
    if (!orgId) {
      toast.error('Missing organization. Please re-load or re-authenticate.');
      return;
    }
    if (files.length === 0) {
      toast.info('No files selected. Choose one or more files to upload.');
      return;
    }
    setErrorText(null);
    setUploading(true);
    try {
      await uploadEvidence({
        organization_id: orgId,
        case_id: caseId,
        subject_id: subjectId ?? null,
        uploader_id: user?.id ?? null,
        files
      });
      setFiles([]);
      toast.success('Upload complete');
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setErrorText(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const addFiles = (incoming: File[]) => {
    if (!incoming.length) return;
    setFiles((prev) => {
      const map = new Map<string, File>();
      [...prev, ...incoming].forEach((f) => {
        map.set(`${f.name}-${f.size}-${f.lastModified}`, f);
      });
      return Array.from(map.values());
    });
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    const dropped = Array.from(dt.files || []);
    addFiles(dropped);
  };

  const confirmDelete = (id: string) => setDeleteId(id);
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteEvidence(deleteId);
      setDeleteId(null);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete evidence';
      toast.error(message);
    }
  };

  const openViewer = async (it: Evidence) => {
    setViewerItem(it);
    setViewerLoading(true);
    try {
      const { data, error } = await supabase.storage.from('evidence').createSignedUrl(it.storage_path, 60 * 10);
      if (error) throw error;
      setViewerUrl(data?.signedUrl || null);
      setViewerOpen(true);
    } finally {
      setViewerLoading(false);
    }
  };

  return (
    <ComponentCard>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Evidence</h3>
      </div>
      <div className="mb-4 rounded border p-0">
        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border-dashed p-8 text-center hover:bg-muted/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-sm font-medium">Drag & drop files here</div>
          <div className="text-xs text-gray-500">or click to browse (images, PDFs)</div>
          <div className="mt-3">
            <Button size="sm" variant="secondary" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Choose files'}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={onFileInputChange}
          />
        </div>
        {files.length > 0 && (
          <div className="border-t p-4">
            <div className="mb-2 text-xs text-gray-500">Ready to upload</div>
            <ul className="space-y-1 text-sm">
              {files.map((f) => (
                <li key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center justify-between">
                  <span className="truncate">{f.name}</span>
                  <span className="text-xs text-gray-500">{(f.size / 1024).toFixed(1)} KB</span>
                </li>
              ))}
            </ul>
            {errorText && <div className="mt-2 text-xs text-red-600">{errorText}</div>}
            <div className="mt-3 flex justify-end">
              <Button type="button" size="sm" onClick={onUpload} disabled={uploading}>
                {uploading ? 'Uploading...' : `Upload ${files.length}`}
              </Button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">No evidence yet.</div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.id} className="flex flex-col gap-3 rounded border p-3">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                {it.file_type.startsWith('image/') && signedUrls[it.id] ? (
                  <img src={signedUrls[it.id]} alt={it.file_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                    {it.file_type === 'application/pdf' ? 'PDF' : 'FILE'}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <button
                  className="max-w-full truncate text-left text-sm font-medium text-blue-600 hover:underline"
                  onClick={() => void openViewer(it)}
                  title={it.file_name.replace(/\+/g, ' ')}
                >
                  {formatFileName(it.file_name)}
                </button>
                <div className="text-xs text-gray-500">
                  {(it.file_size / 1024).toFixed(1)} KB • {new Date(it.created_at).toLocaleString()}
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="text-xs text-blue-600" onClick={() => void openViewer(it)}>View</button>
                  <Button variant="ghost" size="sm" onClick={() => confirmDelete(it.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewerItem?.file_name || 'Preview'}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto">
            {viewerLoading ? (
              <div className="p-6 text-sm text-gray-500">Loading preview...</div>
            ) : viewerUrl && viewerItem ? (
              viewerItem.file_type.startsWith('image/') ? (
                <img src={viewerUrl} alt={viewerItem.file_name} className="max-h-[70vh] w-auto" />
              ) : viewerItem.file_type === 'application/pdf' ? (
                <iframe src={viewerUrl} className="h-[70vh] w-full" title="PDF preview" />
              ) : (
                <div className="p-4 text-sm">
                  Preview not available.{' '}
                  <a className="text-blue-600 underline" href={viewerUrl} target="_blank" rel="noreferrer">
                    Download file
                  </a>
                </div>
              )
            ) : (
              <div className="p-6 text-sm text-gray-500">No preview available.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete evidence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected file from storage and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ComponentCard>
  );
}



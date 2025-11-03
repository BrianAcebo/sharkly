import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Separator } from '../ui/separator';
import { useAuth } from '../../contexts/AuthContext';
import {
  CatalogItem,
  deleteCaseCategory,
  deleteCaseTag,
  ensureCaseCategory,
  ensureCaseTags,
  listCaseCategories,
  listCaseTags,
  renameCaseCategory,
  renameCaseTag
} from '../../api/cases';
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

type EditableItem = CatalogItem & { editing?: boolean; newName?: string };

export default function CategoryTagManager({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const [loading, setLoading] = React.useState(false);
  const [categories, setCategories] = React.useState<EditableItem[]>([]);
  const [tags, setTags] = React.useState<EditableItem[]>([]);
  const [newCategory, setNewCategory] = React.useState('');
  const [newTag, setNewTag] = React.useState('');
  const [confirm, setConfirm] = React.useState<{ type: 'category' | 'tag'; name: string } | null>(null);

  const reload = React.useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [cats, tgs] = await Promise.all([
        listCaseCategories(orgId),
        listCaseTags(orgId)
      ]);
      setCategories(cats);
      setTags(tgs);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  React.useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  const handleAddCategory = async () => {
    if (!orgId || !newCategory.trim()) return;
    await ensureCaseCategory(orgId, newCategory.trim());
    setNewCategory('');
    reload();
  };

  const handleAddTag = async () => {
    if (!orgId || !newTag.trim()) return;
    await ensureCaseTags(orgId, [newTag.trim()]);
    setNewTag('');
    reload();
  };

  const startEdit = (type: 'category' | 'tag', id: string) => {
    if (type === 'category') {
      setCategories((s) => s.map((c) => (c.id === id ? { ...c, editing: true, newName: c.name } : c)));
    } else {
      setTags((s) => s.map((t) => (t.id === id ? { ...t, editing: true, newName: t.name } : t)));
    }
  };

  const saveEdit = async (type: 'category' | 'tag', id: string) => {
    if (!orgId) return;
    if (type === 'category') {
      const item = categories.find((c) => c.id === id);
      if (!item || !item.newName || item.newName.trim() === item.name) {
        setCategories((s) => s.map((c) => (c.id === id ? { ...c, editing: false } : c)));
        return;
      }
      await renameCaseCategory(orgId, item.name, item.newName.trim());
      reload();
    } else {
      const item = tags.find((t) => t.id === id);
      if (!item || !item.newName || item.newName.trim() === item.name) {
        setTags((s) => s.map((t) => (t.id === id ? { ...t, editing: false } : t)));
        return;
      }
      await renameCaseTag(orgId, item.name, item.newName.trim());
      reload();
    }
  };

  const cancelEdit = (type: 'category' | 'tag', id: string) => {
    if (type === 'category') {
      setCategories((s) => s.map((c) => (c.id === id ? { ...c, editing: false, newName: c.name } : c)));
    } else {
      setTags((s) => s.map((t) => (t.id === id ? { ...t, editing: false, newName: t.name } : t)));
    }
  };

  const confirmDelete = (type: 'category' | 'tag', name: string) => setConfirm({ type, name });

  const doDelete = async () => {
    if (!orgId || !confirm) return;
    if (confirm.type === 'category') {
      await deleteCaseCategory(orgId, confirm.name);
    } else {
      await deleteCaseTag(orgId, confirm.name);
    }
    setConfirm(null);
    reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage categories & tags</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="font-medium">Categories</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex gap-2">
                <Input
                  placeholder="Add category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                />
                <Button onClick={handleAddCategory} disabled={!newCategory.trim()}>Add</Button>
              </div>
              <Separator className="my-2" />
              <div className="space-y-2">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    {c.editing ? (
                      <>
                        <Input
                          value={c.newName || ''}
                          onChange={(e) => setCategories((s) => s.map((x) => (x.id === c.id ? { ...x, newName: e.target.value } : x)))}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={() => saveEdit('category', c.id)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => cancelEdit('category', c.id)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate">{c.name}</span>
                        <Button size="sm" variant="outline" onClick={() => startEdit('category', c.id)}>Rename</Button>
                        <Button size="sm" variant="destructive" onClick={() => confirmDelete('category', c.name)}>Delete</Button>
                      </>
                    )}
                  </div>
                ))}
                {!loading && categories.length === 0 && <div className="text-sm text-gray-500">No categories yet.</div>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="font-medium">Tags</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex gap-2">
                <Input
                  placeholder="Add tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button onClick={handleAddTag} disabled={!newTag.trim()}>Add</Button>
              </div>
              <Separator className="my-2" />
              <div className="space-y-2">
                {tags.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    {t.editing ? (
                      <>
                        <Input
                          value={t.newName || ''}
                          onChange={(e) => setTags((s) => s.map((x) => (x.id === t.id ? { ...x, newName: e.target.value } : x)))}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={() => saveEdit('tag', t.id)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => cancelEdit('tag', t.id)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate">{t.name}</span>
                        <Button size="sm" variant="outline" onClick={() => startEdit('tag', t.id)}>Rename</Button>
                        <Button size="sm" variant="destructive" onClick={() => confirmDelete('tag', t.name)}>Delete</Button>
                      </>
                    )}
                  </div>
                ))}
                {!loading && tags.length === 0 && <div className="text-sm text-gray-500">No tags yet.</div>}
              </div>
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={Boolean(confirm)} onOpenChange={(v) => !v && setConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {confirm?.type}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove it from the catalog and from any cases that use it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={doDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}



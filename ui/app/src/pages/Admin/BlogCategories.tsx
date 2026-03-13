import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Tag, Loader2, Check, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import PageMeta from '../../components/common/PageMeta';
import { useBlogCategories, type BlogCategory } from '../../hooks/useBlog';

type EditState = {
  name: string;
  description: string;
  meta_title: string;
  meta_description: string;
  sort_order: number;
};

const EMPTY: EditState = { name: '', description: '', meta_title: '', meta_description: '', sort_order: 0 };

export default function BlogCategories() {
  const { categories, loading, create, update, remove } = useBlogCategories();
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<EditState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function openNew() {
    setForm(EMPTY);
    setEditId('new');
  }

  function openEdit(cat: BlogCategory) {
    setForm({
      name: cat.name,
      description: cat.description ?? '',
      meta_title: cat.meta_title ?? '',
      meta_description: cat.meta_description ?? '',
      sort_order: cat.sort_order,
    });
    setEditId(cat.id);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (editId === 'new') {
        await create(form);
        toast.success('Category created');
      } else if (editId) {
        await update(editId, form);
        toast.success('Category updated');
      }
      setEditId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await remove(id);
      toast.success('Category deleted');
    } catch {
      toast.error('Failed to delete category');
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  return (
    <>
      <PageMeta title="Blog Categories | Admin" description="Manage blog categories" />

      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
              <Tag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Blog Categories</h1>
              <p className="text-sm text-gray-500">{categories.length} categories</p>
            </div>
          </div>
          <Button size="sm" onClick={openNew} disabled={editId === 'new'}>
            <Plus className="mr-2 h-4 w-4" />
            New Category
          </Button>
        </div>

        {/* New category form */}
        {editId === 'new' && (
          <CategoryForm
            form={form}
            setForm={setForm}
            onSave={handleSave}
            onCancel={() => setEditId(null)}
            saving={saving}
            title="New Category"
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-12 text-center">
            <Tag className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500">No categories yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id}>
                {editId === cat.id ? (
                  <CategoryForm
                    form={form}
                    setForm={setForm}
                    onSave={handleSave}
                    onCancel={() => setEditId(null)}
                    saving={saving}
                    title={`Edit: ${cat.name}`}
                  />
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">{cat.name}</p>
                        <span className="font-mono text-xs text-gray-400">/{cat.slug}</span>
                      </div>
                      {cat.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(cat)}
                        className="rounded p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {confirmId === cat.id ? (
                        <div className="flex items-center gap-1 text-xs">
                          <button
                            onClick={() => handleDelete(cat.id)}
                            disabled={deletingId === cat.id}
                            className="flex items-center gap-1 rounded px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium"
                          >
                            {deletingId === cat.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="flex items-center gap-1 rounded px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(cat.id)}
                          className="rounded p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link to="/admin/blog" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Blog CMS
          </Link>
        </div>
      </div>
    </>
  );
}

function CategoryForm({
  form, setForm, onSave, onCancel, saving, title,
}: {
  form: EditState;
  setForm: (f: EditState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
}) {
  return (
    <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block col-span-2 sm:col-span-1">
          <span className="text-xs text-gray-500 font-medium">Name *</span>
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Glossary"
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block col-span-2 sm:col-span-1">
          <span className="text-xs text-gray-500 font-medium">Sort Order</span>
          <input
            type="number"
            value={form.sort_order}
            onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block col-span-2">
          <span className="text-xs text-gray-500 font-medium">Description</span>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="Shown on the category page..."
            className="mt-1 w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 font-medium">Meta Title</span>
          <input
            value={form.meta_title}
            onChange={e => setForm({ ...form, meta_title: e.target.value })}
            placeholder="Category page title for Google..."
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500 font-medium">Meta Description</span>
          <input
            value={form.meta_description}
            onChange={e => setForm({ ...form, meta_description: e.target.value })}
            placeholder="Shown in Google search results..."
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </div>
      <div className="flex items-center gap-2 mt-4 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-2 h-3.5 w-3.5" />}
          Save
        </Button>
      </div>
    </div>
  );
}

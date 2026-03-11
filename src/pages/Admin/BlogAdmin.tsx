import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ExternalLink, Globe, FileText, Tag, Loader2, Star, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import PageMeta from '../../components/common/PageMeta';
import { useBlogPosts } from '../../hooks/useBlog';

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  draft:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  archived:  'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

export default function BlogAdmin() {
  const navigate = useNavigate();
  const { posts, loading, remove } = useBlogPosts();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await remove(id);
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  const counts = {
    all: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    draft: posts.filter(p => p.status === 'draft').length,
    archived: posts.filter(p => p.status === 'archived').length,
  };

  return (
    <>
      <PageMeta title="Blog CMS | Admin" description="Manage blog posts and content" />

      <div className="mx-auto max-w-6xl p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Blog CMS</h1>
              <p className="text-sm text-gray-500">{counts.published} published · {counts.draft} draft</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/blog/categories">
              <Button variant="outline" size="sm">
                <Tag className="mr-2 h-4 w-4" />
                Categories
              </Button>
            </Link>
            <Button size="sm" onClick={() => navigate('/admin/blog/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {(['all', 'published', 'draft', 'archived'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                filter === f
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {f} <span className="ml-1 text-xs text-gray-400">({counts[f]})</span>
            </button>
          ))}
        </div>

        {/* Posts table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
            <FileText className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500">No posts yet</p>
            <Button size="sm" className="mt-4" onClick={() => navigate('/admin/blog/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first post
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Published</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filtered.map(post => (
                  <tr key={post.id} className="group bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {post.featured && <Star className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{post.title}</p>
                          <p className="text-xs text-gray-400 font-mono">/{post.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {post.blog_categories ? (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {post.blog_categories.name}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[post.status]}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {post.status === 'published' && (
                          <a
                            href={`${import.meta.env.VITE_MARKETING_URL ?? 'https://sharkly.co'}/blog/${post.blog_categories?.slug ?? 'uncategorized'}/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                            title="View on blog"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          onClick={() => navigate(`/admin/blog/edit/${post.id}`)}
                          className="rounded p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {confirmId === post.id ? (
                          <div className="flex items-center gap-1 text-xs">
                            <button
                              onClick={() => handleDelete(post.id)}
                              disabled={deletingId === post.id}
                              className="rounded px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium"
                            >
                              {deletingId === post.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Delete'}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmId(post.id)}
                            className="rounded p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Back */}
        <div className="mt-6">
          <Link to="/admin" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
            <ExternalLink className="h-3.5 w-3.5" />
            Back to Admin Dashboard
          </Link>
        </div>
      </div>
    </>
  );
}

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listSubjects, type SubjectRecord } from '../../api/subjects';
import PageMeta from '../../components/common/PageMeta';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function SubjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<SubjectRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const { results: rows, total: t } = await listSubjects(user.organization_id, search, page, perPage);
        if (!active) return;
        setResults(rows);
        setTotal(t);
      } finally {
        if (active) setLoading(false);
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [user?.organization_id, search, page, perPage]);

  const numPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div>
      <PageMeta title="Subjects" description="Subjects" />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Subjects</h1>
          <div className="w-full max-w-sm">
            <Input
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : results.length === 0 ? (
          <div className="text-sm text-gray-500">No subjects found.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {results.map((s) => (
              <Card key={s.id} className="cursor-pointer" onClick={() => navigate(`/subjects/${s.id}`)}>
                <CardHeader className="flex flex-row items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={s.avatar || undefined} alt={s.name} />
                    <AvatarFallback>{s.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{s.type}</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">{s.email || '-'}</div>
                  <div className="text-xs text-gray-500 mt-1">Updated {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {numPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <div className="text-sm">Page {page} of {numPages}</div>
            <Button size="sm" variant="outline" disabled={page === numPages} onClick={() => setPage((p) => Math.min(numPages, p + 1))}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}



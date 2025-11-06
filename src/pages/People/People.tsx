import * as React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listPeople } from '../../api/people';
import type { PersonRecord } from '../../types/person';
import PageMeta from '../../components/common/PageMeta';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { formatPersonName } from '../../utils/person';
import { UserAvatar } from '../../components/common/UserAvatar';
import useDebounce from '../../hooks/useDebounce';

export default function PeoplePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<PersonRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const { results: rows, total: t } = await listPeople(user.organization_id, debouncedSearch, page, perPage);
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
  }, [user?.organization_id, debouncedSearch, page, perPage]);

  const numPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div>
      <PageMeta title="People" description="Directory of people" noIndex />
      <div className="mx-auto max-w-7xl space-y-6 min-h-screen-height-visible">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">People</h1>
          <div className="w-full max-w-sm">
            <Input
              placeholder="Search people..."
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
          <div className="text-sm text-gray-500">No people found.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {results.map((person) => {
              const name = formatPersonName(person.name);
              const primaryEmail = person.emails?.[0]?.email.address ?? '-';
              return (
                <Card key={person.id} className="cursor-pointer" onClick={() => navigate(`/people/${person.id}`)}>
                <CardHeader className="flex flex-row items-center gap-3">
                  <UserAvatar
                    user={{
                      name: name,
                      avatar: person.avatar || null
                    }}
                    size="lg"
                  />
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-gray-500 capitalize">Person</div>
                  </div>
                </CardHeader>
                <CardContent>
                      <div className="text-sm text-gray-600">{primaryEmail}</div>
                  <div className="text-xs text-gray-500 mt-1">Updated {formatDistanceToNow(new Date(person.updated_at), { addSuffix: true })}</div>
                </CardContent>
              </Card>
              );
            })}
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



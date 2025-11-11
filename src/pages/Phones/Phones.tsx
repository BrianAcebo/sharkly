import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { useAuth } from '../../contexts/AuthContext';
import useDebounce from '../../hooks/useDebounce';
import { searchPhones, createPhone } from '../../api/phones';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { formatE164Input, isValidE164 } from '../../utils/phone';

export default function PhonesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; number_e164: string }>>([]);
  const debounced = useDebounce(q, 350);
  const [createOpen, setCreateOpen] = useState(false);
  const [newNumber, setNewNumber] = useState('');

  useEffect(() => {
    let active = true;
    async function run() {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const rows = await searchPhones(user.organization_id, debounced, 24);
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
      <PageMeta title="Phones" description="Phones directory" noIndex />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Phones</h1>
        <div className="flex items-center gap-2">
          <div className="w-full max-w-sm">
            <Input placeholder="Search phones…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} title="Create phone">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : results.length === 0 ? (
        <div className="text-sm text-muted-foreground">No phones found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {results.map((p) => (
            <Card key={p.id} className="cursor-pointer" onClick={() => navigate(`/phones/${p.id}`)}>
              <CardHeader>
                <div className="font-medium">{p.number_e164}</div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">Phone</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create phone</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="+441234567890" value={newNumber} onChange={(e) => setNewNumber(formatE164Input(e.target.value))} />
            {!newNumber || isValidE164(newNumber) ? null : (
              <div className="text-xs text-red-600">Enter a valid E.164 number.</div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!user?.organization_id) return;
                  const e164 = newNumber.trim();
                  if (!isValidE164(e164)) {
                    toast.error('Enter a valid E.164 number.');
                    return;
                  }
                  try {
                    const created = await createPhone({
                      organization_id: user.organization_id,
                      number_e164: e164,
                      line_type: 'unknown',
                      messaging_apps: [],
                      spam_reports: 0
                    });
                    toast.success('Phone created.');
                    setCreateOpen(false);
                    navigate(`/phones/${created.id}`);
                  } catch (e) {
                    console.error('Failed to create phone', e);
                    toast.error('Failed to create phone.');
                  }
                }}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



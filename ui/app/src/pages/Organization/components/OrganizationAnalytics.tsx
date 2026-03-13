import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../../utils/api';
import { supabase } from '../../../utils/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Card, CardContent } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList } from '../../../components/ui/tabs';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import DatePicker from '../../../components/form/date-picker';

interface AnalyticsRow {
    agent_id: string;
    calls: number;
    seconds: number;
    minutes: number;
    cost: number;
}

interface AnalyticsResponse {
    success: boolean;
    start: string;
    end: string;
    totals: { calls: number; seconds: number; minutes: number; cost: number };
    rows: AnalyticsRow[];
}

interface Props {
    orgId: string;
}

const formatCurrency = (n: number) => `$${(n || 0).toFixed(2)}`;
const formatMinutes = (n: number) => `${(n || 0).toFixed(2)} min`;

const OrganizationAnalytics: React.FC<Props> = ({ orgId }) => {
    const [activeTab, setActiveTab] = useState<'usage' | 'history'>('usage');
    const [data, setData] = useState<AnalyticsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    interface HistoryRow { id: string; call_start_time: string; call_direction: string; from_number: string; to_number: string; agent_id: string; call_status: string; call_duration: number }
    const [history, setHistory] = useState<HistoryRow[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<string>('all');
    const [agentNames, setAgentNames] = useState<Record<string, string>>({});
    const [agentPhones, setAgentPhones] = useState<Record<string, string[]>>({});
    const [allAgents, setAllAgents] = useState<{ id: string; name: string }[]>([]);
    const [page, setPage] = useState(1);
    const pageSize = 25;
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await api.get(`/api/billing/voice-analytics/${orgId}`);
                if (!cancelled) {
                    if (!res.ok) {
                        throw new Error('Failed to load analytics');
                    }
                    const json = (await res.json()) as AnalyticsResponse;
                    setData(json);
                }
            } catch {
                if (!cancelled) setError('Failed to load analytics');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [orgId]);

    // Fetch recent call history for the organization and map agent names
    useEffect(() => {
        let cancelled = false;
        const fetchHistory = async () => {
            try {
                setHistoryLoading(true);
                // Build base query with filters
                let query = supabase
                    .from('call_history')
                    .select('id, call_start_time, call_direction, from_number, to_number, agent_id, call_status, call_duration')
                    .eq('organization_id', orgId);
                if (selectedAgent !== 'all') {
                    // Filter by agent and their numbers
                    query = query.eq('agent_id', selectedAgent);
                }
                if (startDate) {
                    query = query.gte('call_start_time', `${startDate}T00:00:00.000Z`);
                }
                if (endDate) {
                    query = query.lte('call_start_time', `${endDate}T23:59:59.999Z`);
                }
                // Pagination
                const from = (page - 1) * pageSize;
                const to = from + pageSize - 1;
                const { data: rows, error: histErr } = await query
                    .order('call_start_time', { ascending: false })
                    .range(from, to);
                if (histErr) throw histErr;
                const list = rows || [];
                if (!cancelled) setHistory(list);

                // Load agent names from profiles
                const agentIds = Array.from(new Set(list.map((r) => r.agent_id).filter(Boolean)));
                if (agentIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, first_name, last_name')
                        .in('id', agentIds);
                    const map: Record<string, string> = {};
                    (profiles || []).forEach((p) => {
                        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
                        map[p.id] = name || p.id;
                    });
                    if (!cancelled) setAgentNames(map);
                }

                // Map agents to their assigned phone numbers (via seats and phone_numbers)
                const { data: seats } = await supabase
                    .from('seats')
                    .select('id, user_id')
                    .eq('org_id', orgId);
                const seatIds = (seats || []).map((s) => s.id);
                const numbersBySeat: Record<string, string[]> = {};
                if (seatIds.length > 0) {
                    const { data: phones } = await supabase
                        .from('phone_numbers')
                        .select('seat_id, phone_number, status')
                        .in('seat_id', seatIds)
                        .in('status', ['assigned', 'available']);
                    (phones || []).forEach((p) => {
                        const sid = p.seat_id as string;
                        if (!numbersBySeat[sid]) numbersBySeat[sid] = [];
                        if (p.phone_number) numbersBySeat[sid].push(p.phone_number);
                    });
                }
                const phonesByAgent: Record<string, string[]> = {};
                (seats || []).forEach((s) => {
                    const nums = numbersBySeat[s.id] || [];
                    if (s.user_id) {
                        phonesByAgent[s.user_id as string] = (phonesByAgent[s.user_id as string] || []).concat(nums);
                    }
                });
                if (!cancelled) setAgentPhones(phonesByAgent);

                // Build agent list from profiles referenced by seats or history
                const userIdsFromSeats = Array.from(new Set((seats || []).map((s) => s.user_id).filter(Boolean) as string[]));
                const agentIdsFromHistory = Array.from(new Set(list.map((r) => r.agent_id).filter(Boolean) as string[]));
                const allUserIds = Array.from(new Set([...userIdsFromSeats, ...agentIdsFromHistory]));
                if (allUserIds.length > 0) {
                    const { data: seatProfiles } = await supabase
                        .from('profiles')
                        .select('id, first_name, last_name')
                        .in('id', allUserIds);
                    const nameMap: Record<string, string> = {};
                    const agentList: { id: string; name: string }[] = [];
                    (seatProfiles || []).forEach((p) => {
                        const full = `${p.first_name || ''} ${p.last_name || ''}`.trim();
                        const label = full || p.id;
                        nameMap[p.id] = label;
                        agentList.push({ id: p.id, name: label });
                    });
                    if (!cancelled) {
                        setAgentNames(nameMap);
                        setAllAgents(agentList);
                    }
                } else {
                    if (!cancelled) setAllAgents([]);
                }
            } catch {
                // silent
            } finally {
                if (!cancelled) setHistoryLoading(false);
            }
        };
        if (activeTab === 'history') {
            fetchHistory();
        }
        return () => { cancelled = true; };
    }, [orgId, activeTab, selectedAgent, page, startDate, endDate]);

    const rows = useMemo(() => data?.rows ?? [], [data]);
    const totals = data?.totals;
    const filteredHistory = useMemo(() => {
        let h = history;
        if (selectedAgent !== 'all') {
            const nums = agentPhones[selectedAgent] || [];
            h = h.filter((x) => x.agent_id === selectedAgent || nums.includes(x.from_number) || nums.includes(x.to_number));
        }
        return h;
    }, [history, selectedAgent, agentPhones]);

    // Fallback: build per-agent rows from history if backend rows are empty
    const fallbackRows: AnalyticsRow[] = useMemo(() => {
        const map: Record<string, { calls: number; seconds: number }> = {};
        history.forEach((h) => {
            if (!h.agent_id) return;
            if (!map[h.agent_id]) map[h.agent_id] = { calls: 0, seconds: 0 };
            map[h.agent_id].calls += 1;
            map[h.agent_id].seconds += Number(h.call_duration || 0);
        });
        return Object.entries(map).map(([agent_id, v]) => ({
            agent_id,
            calls: v.calls,
            seconds: v.seconds,
            minutes: v.seconds / 60,
            cost: 0
        }));
    }, [history]);

    if (loading) {
        return <div className="text-sm text-gray-500 dark:text-gray-400">Loading analytics…</div>;
    }
    if (error) {
        return <div className="text-sm text-red-500">{error}</div>;
    }

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'usage' | 'history')} className="space-y-4">
                <TabsList className="flex justify-start gap-2 p-0">
                    <Button size="sm" variant={activeTab === 'usage' ? 'outline' : 'ghost'} onClick={() => setActiveTab('usage')}>Usage</Button>
                    <Button size="sm" variant={activeTab === 'history' ? 'outline' : 'ghost'} onClick={() => setActiveTab('history')}>History</Button>
                </TabsList>

                <TabsContent value="usage" className="space-y-6">
            {totals && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Total Calls</div>
                            <div className="mt-1 text-2xl font-semibold">{totals.calls}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Total Minutes</div>
                            <div className="mt-1 text-2xl font-semibold">{formatMinutes(totals.minutes)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Total Seconds</div>
                            <div className="mt-1 text-2xl font-semibold">{totals.seconds}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Total Cost</div>
                            <div className="mt-1 text-2xl font-semibold">{formatCurrency(totals.cost)}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead className="text-right">Calls</TableHead>
                        <TableHead className="text-right">Minutes</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(rows.length === 0 && fallbackRows.length === 0) && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-sm text-gray-500 dark:text-gray-400">No voice usage yet.</TableCell>
                        </TableRow>
                    )}
                    {(rows.length > 0 ? rows : fallbackRows).map((r) => (
                        <TableRow key={r.agent_id}>
                            <TableCell>{agentNames[r.agent_id] || r.agent_id}</TableCell>
                            <TableCell className="text-right">{r.calls}</TableCell>
                            <TableCell className="text-right">{(r.minutes || r.seconds / 60).toFixed(2)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.cost)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
            <div>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
                    <div className="w-56">
                        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by agent" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Agents</SelectItem>
                                {allAgents.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-48">
                            <DatePicker id="history-start" label="Start" onChange={(dates: unknown) => {
                                const d = Array.isArray(dates) ? dates[0] : dates;
                                setStartDate(d ? d.toISOString().slice(0,10) : null);
                            }} />
                        </div>
                        <div className="w-48">
                            <DatePicker id="history-end" label="End" onChange={(dates: unknown) => {
                                const d = Array.isArray(dates) ? dates[0] : dates;
                                setEndDate(d ? d.toISOString().slice(0,10) : null);
                            }} />
                        </div>
                    </div>
                </div>
                {historyLoading ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Loading history…</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Direction</TableHead>
                                <TableHead>From</TableHead>
                                <TableHead>To</TableHead>
                                <TableHead>Agent</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                                <TableHead className="text-right">Duration</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredHistory.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-sm text-gray-500 dark:text-gray-400">No calls yet.</TableCell>
                                </TableRow>
                            )}
                            {filteredHistory.map((h) => (
                                <TableRow key={h.id}>
                                    <TableCell>{new Date(h.call_start_time).toLocaleString()}</TableCell>
                                    <TableCell className="capitalize">{h.call_direction}</TableCell>
                                    <TableCell>{h.from_number}</TableCell>
                                    <TableCell>{h.to_number}</TableCell>
                                    <TableCell>{agentNames[h.agent_id] || h.agent_id}</TableCell>
                                    <TableCell className="text-right capitalize">{h.call_status}</TableCell>
                                    <TableCell className="text-right">{Math.floor((h.call_duration || 0) / 60)}:{String((h.call_duration || 0) % 60).padStart(2, '0')}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                <div className="mt-3 flex items-center justify-end gap-3 text-sm">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                    <div>Page {page}</div>
                    <Button size="sm" variant="outline" disabled={filteredHistory.length < pageSize} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
            </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default OrganizationAnalytics;

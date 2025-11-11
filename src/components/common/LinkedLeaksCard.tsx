import ComponentCard from './ComponentCard';
import { Button } from '../ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { Coins, Pencil, Zap, Link2Off, FileWarning } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { getActionCost, ActionKey, ENABLE_ACTION_FLAGS } from '../../constants/costs';
import { searchLeaks, attachLeakToPhone, detachLeakFromPhone } from '../../api/leaks';

export type LinkedLeakItem = {
	id: string;
	source: string;
	snippet?: string | null;
	linkTo: string;
	transformType?: string | null;
	confidenceScore?: number | null;
	retrievedAt?: string | null;
	sourceApi?: string | null;
	sourceUrl?: string | null;
};

export default function LinkedLeaksCard({
	title = 'Leaks',
	items,
	onUnlink,
	displayName,
	ownerId,
	organizationId,
	onAttached,
	ownerType = 'phone'
}: {
	title?: string;
	items: LinkedLeakItem[];
	onUnlink: (leakId: string) => void | Promise<void>;
	displayName?: string;
	ownerId: string;
	organizationId: string;
	onAttached?: (item: { id: string; source: string }) => void;
	ownerType?: 'phone';
}) {
	const [manageOpen, setManageOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<Array<{ id: string; source: string; content_snippet: string | null }>>([]);
	const [loading, setLoading] = useState(false);

	const runSearch = async (v: string) => {
		if (!organizationId || v.trim().length < 2) {
			setResults([]);
			return;
		}
		setLoading(true);
		try {
			const rows = await searchLeaks(organizationId, v, 10);
			setResults(rows.map((r) => ({ id: r.id, source: r.source, content_snippet: r.content_snippet ?? null })));
		} finally {
			setLoading(false);
		}
	};

	const attachLeak = async (leakId: string, extras?: { transform_type?: string }) => {
		if (ownerType === 'phone') {
			await attachLeakToPhone(leakId, ownerId, { transform_type: extras?.transform_type ?? 'manual_link' });
		}
	};

	return (
		<ComponentCard>
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-lg font-semibold">{title}</h3>
				<div className="flex items-center gap-2">
					{ENABLE_ACTION_FLAGS[ActionKey.DiscoverProperties] ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button size="sm" variant="outline">
									<Zap className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuLabel>Perform Action</DropdownMenuLabel>
								<div className="flex justify-between gap-2">
									<div>
										<DropdownMenuItem className="group flex cursor-pointer items-center justify-between gap-2">
											Discover leaks
										</DropdownMenuItem>
									</div>
									<div className="w-20">
										<DropdownMenuItem disabled>
											<span className="border-l pl-3 text-sm text-gray-500">
												{getActionCost(ActionKey.DiscoverProperties)} <Coins className="ml-0.5 inline-block size-3" />
											</span>
										</DropdownMenuItem>
									</div>
								</div>
								<DropdownMenuSeparator />
								<DropdownMenuItem disabled>Actions will run for {displayName ?? 'selection'}</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
					<Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
						<Pencil className="size-4" />
					</Button>
				</div>
			</div>

			<div className="space-y-3">
				{items.length === 0 ? (
					<p className="text-muted-foreground text-sm">No leaks linked.</p>
				) : (
					items.map((l) => (
						<div key={l.id} className="flex items-center justify-between rounded-lg border p-4">
							<div className="flex min-w-0 items-center gap-3">
								<div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
									<FileWarning className="h-5 w-5 text-slate-700 dark:text-slate-200" />
								</div>
								<div>
									<Link to={l.linkTo} className="group text-base font-medium text-blue-600 hover:underline">
										{l.source}
									</Link>
									{l.snippet ? <div className="text-xs text-muted-foreground line-clamp-1">{l.snippet}</div> : null}
									<div className="text-muted-foreground mt-1 text-xs">
										{l.transformType ? <span className="rounded border px-2 py-0.5">{l.transformType}</span> : null}
										{l.confidenceScore != null ? <span className="ml-2">Confidence: {(l.confidenceScore * 100).toFixed(0)}%</span> : null}
										{l.retrievedAt ? <span className="ml-2">Retrieved: {new Date(l.retrievedAt).toLocaleString()}</span> : null}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<Button size="sm" variant="ghost" onClick={() => onUnlink(l.id)} title="Unlink">
                                    <Link2Off className="h-4 w-4" />
                                </Button>
							</div>
						</div>
					))
				)}
			</div>

			{/* Manage Dialog */}
			<div className={manageOpen ? '' : 'hidden'}>
				<div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setManageOpen(false)} />
				<div className="fixed left-1/2 top-1/2 z-50 w-[min(700px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-4 shadow-xl">
					<div className="mb-3 text-lg font-semibold">Manage leaks</div>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div className="space-y-3">
							<div className="space-y-2">
								<div className="text-sm font-medium">Search and attach</div>
								<Input
									placeholder="Search leak…"
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
											<div className="text-sm font-medium">{r.source}</div>
											<Button
												size="sm"
												variant="outline"
												onClick={async () => {
													try {
														await attachLeak(r.id, { transform_type: 'manual_link' });
														onAttached?.({ id: r.id, source: r.source });
														toast.success('Leak linked');
													} catch (err) {
														console.error('Failed to link leak', err);
														toast.error('Failed to link leak.');
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
										{items.map((l) => (
											<div key={l.id} className="flex items-center justify-between rounded border p-3">
												<Link to={l.linkTo} className="text-sm font-medium hover:underline">
													{l.source}
												</Link>
												<Button size="sm" variant="ghost" onClick={() => onUnlink(l.id)}>
													Unlink
												</Button>
											</div>
										))}
									</div>
								</div>
							) : null}
						</div>
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">
								Link existing leaks to this phone. Creating leaks manually is supported on the leaks page.
							</p>
						</div>
					</div>
					<div className="mt-4 flex justify-end">
						<Button variant="outline" onClick={() => setManageOpen(false)}>
							Close
						</Button>
					</div>
				</div>
			</div>
		</ComponentCard>
	);
}



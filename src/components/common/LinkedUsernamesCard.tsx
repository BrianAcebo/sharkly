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
import { Coins, Pencil, Zap, Link2Off, AtSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { getActionCost, ActionKey, ENABLE_ACTION_FLAGS } from '../../constants/costs';
import { searchUsernames } from '../../api/usernames';
import { attachUsernameToLeak, detachUsernameFromLeak } from '../../api/leaks';

export type LinkedUsernameItem = {
	id: string;
	value: string;
	linkTo: string;
	transformType?: string | null;
	confidenceScore?: number | null;
	retrievedAt?: string | null;
	sourceApi?: string | null;
	sourceUrl?: string | null;
};

export default function LinkedUsernamesCard({
	title = 'Usernames',
	items,
	onUnlink,
	displayName,
	ownerId,
	organizationId,
	onAttached,
	ownerType = 'leak'
}: {
	title?: string;
	items: LinkedUsernameItem[];
	onUnlink: (usernameId: string) => void | Promise<void>;
	displayName?: string;
	ownerId: string;
	organizationId: string;
	onAttached?: (item: { id: string; value: string }) => void;
	ownerType?: 'leak' | 'profile';
}) {
	const [manageOpen, setManageOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<Array<{ id: string; value: string }>>([]);
	const [loading, setLoading] = useState(false);

	const runSearch = async (v: string) => {
		if (!organizationId || v.trim().length < 2) {
			setResults([]);
			return;
		}
		setLoading(true);
		try {
			const rows = await searchUsernames(organizationId, v, 10);
			setResults(rows);
		} finally {
			setLoading(false);
		}
	};

	return (
		<ComponentCard>
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-lg font-semibold">{title}</h3>
				<div className="flex items-center gap-2">
					{ENABLE_ACTION_FLAGS[ActionKey.DiscoverProfiles] ? (
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
											Discover usernames
										</DropdownMenuItem>
									</div>
									<div className="w-20">
										<DropdownMenuItem disabled>
											<span className="border-l pl-3 text-sm text-gray-500">
												{getActionCost(ActionKey.DiscoverProfiles)} <Coins className="ml-0.5 inline-block size-3" />
											</span>
										</DropdownMenuItem>
									</div>
								</div>
								<DropdownMenuSeparator />
								<DropdownMenuItem disabled>Actions will run for "{displayName ?? 'selection'}"</DropdownMenuItem>
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
					<p className="text-muted-foreground text-sm">No usernames linked.</p>
				) : (
					items.map((u) => (
						<div key={u.id} className="flex items-center justify-between rounded-lg border p-4">
							<div className="flex min-w-0 items-center gap-3">
								<div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
									<AtSign className="h-5 w-5 text-slate-700 dark:text-slate-200" />
								</div>
								<div>
									<Link to={u.linkTo} className="group text-base font-medium text-blue-600 hover:underline">
										@{u.value}
									</Link>
									<div className="text-muted-foreground mt-1 text-xs">
										{u.transformType ? <span className="rounded border px-2 py-0.5">{u.transformType}</span> : null}
										{u.confidenceScore != null ? <span className="ml-2">Confidence: {(u.confidenceScore * 100).toFixed(0)}%</span> : null}
										{u.retrievedAt ? <span className="ml-2">Retrieved: {new Date(u.retrievedAt).toLocaleString()}</span> : null}
										{u.sourceApi ? <span className="ml-2">via {u.sourceApi}</span> : null}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<Button size="sm" variant="ghost" onClick={() => onUnlink(u.id)} title="Unlink">
									<Link2Off className="h-4 w-4" />
								</Button>
							</div>
						</div>
					))
				)}
			</div>

			{/* Manage Dialog (lightweight custom) */}
			<div className={manageOpen ? '' : 'hidden'}>
				<div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setManageOpen(false)} />
				<div className="fixed left-1/2 top-1/2 z-50 w-[min(700px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-4 shadow-xl">
					<div className="mb-3 text-lg font-semibold">Manage usernames</div>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div className="space-y-3">
							<div className="space-y-2">
								<div className="text-sm font-medium">Search and attach</div>
								<Input
									placeholder="Search username…"
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
											<div className="text-sm font-medium">@{r.value}</div>
											<Button
												size="sm"
												variant="outline"
												onClick={async () => {
													try {
														if (ownerType === 'profile') {
															const { attachProfileToUsername } = await import('../../api/social_profiles');
															await attachProfileToUsername(ownerId, r.id, { transform_type: 'manual_link' });
														} else {
															await attachUsernameToLeak(ownerId, r.id, { transform_type: 'manual_link' });
														}
														onAttached?.({ id: r.id, value: r.value });
														toast.success('Username linked');
													} catch (err) {
														console.error('Failed to link username', err);
														toast.error('Failed to link username.');
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
										{items.map((u) => (
											<div key={u.id} className="flex items-center justify-between rounded border p-3">
												<Link to={u.linkTo} className="text-sm font-medium hover:underline">
													@{u.value}
												</Link>
												<Button size="sm" variant="ghost" onClick={() => onUnlink(u.id)}>
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
								Link existing usernames to this leak. Creating usernames manually is not supported here; create them via discovery flows.
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



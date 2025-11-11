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
import { searchEmails } from '../../api/emails';
import { addEmailToPerson } from '../../api/people';
import { attachLeakToEmail } from '../../api/leaks';
import { getActionCost, ActionKey, ENABLE_ACTION_FLAGS } from '../../constants/costs';
import type { EmailLeak, EmailProfileRef } from '../../types/email';

export type LinkedEmailItem = {
	id: string;
	address: string;
	domain?: string | null;
	linkTo: string;
	transformType?: string | null;
	confidenceScore?: number | null;
	retrievedAt?: string | null;
	sourceApi?: string | null;
	sourceUrl?: string | null;
};

export default function LinkedEmailsCard({
	title = 'Emails',
	items,
	onUnlink,
	displayName,
	ownerId,
	organizationId,
	onAttached,
	ownerType = 'person'
}: {
	title?: string;
	items: LinkedEmailItem[];
	onUnlink: (emailId: string) => void | Promise<void>;
	displayName?: string;
	ownerId: string;
	organizationId: string;
	ownerType?: 'person' | 'leak' | 'username' | 'profile';
	onAttached?: (email: { id: string; address: string; domain?: string | null }) => void;
}) {
	const [manageOpen, setManageOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<Array<{ id: string; address: string; domain: string | null; organization_id: string }>>([]);
	const [loading, setLoading] = useState(false);
	const [creating, setCreating] = useState(false);
	const [newAddress, setNewAddress] = useState('');
	const [createDomainChecked, setCreateDomainChecked] = useState(false);

	const runSearch = async (v: string) => {
		if (!organizationId || v.trim().length < 2) {
			setResults([]);
			return;
		}
		setLoading(true);
		try {
			const rows = await searchEmails(organizationId, v, 10);
			setResults(rows);
		} finally {
			setLoading(false);
		}
	};

	const attach = async (emailId: string, address: string, domain: string | null) => {
		if (ownerType === 'leak') {
			await attachLeakToEmail(ownerId, emailId, { transform_type: 'manual_link' });
			onAttached?.({ id: emailId, address, domain });
			toast.success('Email linked');
			return;
		}
		if (ownerType === 'username') {
			const { attachEmailToUsername } = await import('../../api/usernames');
			await attachEmailToUsername(ownerId, emailId, { transform_type: 'manual_link' });
			onAttached?.({ id: emailId, address, domain });
			toast.success('Email linked');
			return;
		}
		if (ownerType === 'profile') {
			const { attachProfileToEmail } = await import('../../api/social_profiles');
			await attachProfileToEmail(ownerId, emailId, { transform_type: 'manual_link' });
			onAttached?.({ id: emailId, address, domain });
			toast.success('Email linked');
			return;
		}
		await addEmailToPerson(ownerId, organizationId, {
			id: emailId,
			organization_id: organizationId,
			email: { address, domain, first_seen: null },
			leaks: [] as EmailLeak[],
			profiles: [] as EmailProfileRef[]
		} as unknown as import('../../types/email').EmailRecord);
		onAttached?.({ id: emailId, address, domain });
		toast.success('Email linked');
	};

	const createAndAttach = async () => {
		const addr = newAddress.trim();
		if (!addr) {
			toast.error('Email address is required.');
			return;
		}
		setCreating(true);
		try {
			await addEmailToPerson(ownerId, organizationId, {
				email: {
					address: addr,
					domain: addr.includes('@') ? (addr.split('@')[1] ?? null) : null,
					first_seen: null
				},
				leaks: [] as EmailLeak[],
				profiles: [] as EmailProfileRef[]
			} as unknown as import('../../types/email').EmailRecord);
			onAttached?.({ id: 'new', address: addr, domain: addr.includes('@') ? (addr.split('@')[1] ?? null) : null });
			toast.success('Email created and linked.');
			setManageOpen(false);
			setQuery('');
			setNewAddress('');
			setCreateDomainChecked(false);
		} catch (error) {
			console.error(error);
			toast.error('Failed to create email.');
		} finally {
			setCreating(false);
		}
	};

	return (
		<ComponentCard>
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-lg font-semibold">{title}</h3>
				<div className="flex items-center gap-2">
					{ENABLE_ACTION_FLAGS[ActionKey.DiscoverEmails] ? (
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
										Discover emails
									</DropdownMenuItem>
								</div>
								<div className="w-20">
									<DropdownMenuItem disabled>
										<span className="border-l pl-3 text-sm text-gray-500">
											{getActionCost(ActionKey.DiscoverEmails)} <Coins className="ml-0.5 inline-block size-3" />
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
					<p className="text-muted-foreground text-sm">No emails linked.</p>
				) : (
					items.map((e) => (
						<div key={e.id} className="flex items-center justify-between rounded-lg border p-4">
							<div className="flex min-w-0 items-center gap-3">
								<div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
									<AtSign className="h-5 w-5 text-slate-700 dark:text-slate-200" />
								</div>
								<div>
									<Link to={e.linkTo} className="group text-base font-medium text-blue-600 hover:underline">
										{e.address}
									</Link>
									{e.domain ? <div className="text-xs text-muted-foreground">{e.domain}</div> : null}
									<div className="text-muted-foreground mt-1 text-xs">
										{e.transformType ? <span className="rounded border px-2 py-0.5">{e.transformType}</span> : null}
										{e.confidenceScore != null ? (
											<span className="ml-2">Confidence: {(e.confidenceScore * 100).toFixed(0)}%</span>
										) : null}
										{e.retrievedAt ? <span className="ml-2">Retrieved: {new Date(e.retrievedAt).toLocaleString()}</span> : null}
										{e.sourceApi ? <span className="ml-2">via {e.sourceApi}</span> : null}
										{e.sourceUrl ? (
											<span className="ml-2">
												<a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">
													source
												</a>
											</span>
										) : null}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<Button size="sm" variant="ghost" onClick={() => onUnlink(e.id)} title="Unlink">
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
					<div className="mb-3 text-lg font-semibold">Manage emails</div>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div className="space-y-3">
							<div className="space-y-2">
								<div className="text-sm font-medium">Search and attach</div>
								<Input
									placeholder="Search email address…"
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
									results.map((em) => (
										<div key={em.id} className="flex items-center justify-between rounded border p-3">
											<div className="text-sm font-medium">{em.address}</div>
											<Button
												size="sm"
												variant="outline"
												onClick={async () => {
													try {
														await attach(em.id, em.address, em.domain);
													} catch (err) {
														console.error('Failed to link email', err);
														toast.error('Failed to link email.');
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
										{items.map((e) => (
											<div key={e.id} className="flex items-center justify-between rounded border p-3">
												<Link to={e.linkTo} className="text-sm font-medium hover:underline">
													{e.address}
												</Link>
												<Button size="sm" variant="ghost" onClick={() => onUnlink(e.id)}>
													Unlink
												</Button>
											</div>
										))}
									</div>
								</div>
							) : null}
						</div>
						{ownerType === 'person' ? (
							<div className="space-y-3">
								<div className="space-y-2">
									<div className="text-sm font-medium">Create new email</div>
									<Input placeholder="address@example.com" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
									<label className="flex items-center gap-2 text-xs text-muted-foreground">
										<input type="checkbox" checked={createDomainChecked} onChange={(e) => setCreateDomainChecked(e.target.checked)} />
										<span>Also create domain from this address</span>
									</label>
									<div className="bg-muted/40 text-muted-foreground rounded-md border border-dashed p-3 text-xs">
										This email will be created and automatically linked to{' '}
										<span className="text-foreground font-medium">{displayName ?? 'selection'}</span>.
									</div>
								</div>
								<Button onClick={async () => {
									await createAndAttach();
									if (createDomainChecked && organizationId) {
										try {
											const addr = newAddress.trim();
											const domainName = addr.includes('@') ? addr.split('@')[1] : '';
											if (domainName) {
												const { createDomain } = await import('../../api/domains');
												await createDomain({ organization_id: organizationId, name: domainName });
											}
										} catch (err) {
											console.error('Failed to create domain for email', err);
										}
									}
								}} disabled={creating}>
									{creating ? 'Creating…' : 'Create email'}
								</Button>
							</div>
						) : null}
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



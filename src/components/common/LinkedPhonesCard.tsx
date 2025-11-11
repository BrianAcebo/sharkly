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
import { Coins, Pencil, Zap, Link2Off, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getActionCost, ActionKey, ENABLE_ACTION_FLAGS } from '../../constants/costs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { useState } from 'react';
import { toast } from 'sonner';
import { searchPhones, createPhone, attachPhoneToPerson } from '../../api/phones';
import { formatPhoneInput, formatE164PhoneNumber, isValidUS10Digits } from '../../utils/phone';

export type LinkedPhoneItem = {
	id: string;
	number_e164: string;
	linkTo: string;
	transformType?: string | null;
	confidenceScore?: number | null;
	retrievedAt?: string | null;
	sourceApi?: string | null;
	sourceUrl?: string | null;
};

export default function LinkedPhonesCard({
	title = 'Phones',
	items,
	onUnlink,
	displayName,
	ownerId,
	organizationId,
	onAttached
}: {
	title?: string;
	items: LinkedPhoneItem[];
	onUnlink: (phoneId: string) => void | Promise<void>;
	displayName?: string;
	ownerId: string;
	organizationId: string;
	onAttached?: (phone: { id: string; number_e164: string }) => void;
}) {
	const [manageOpen, setManageOpen] = useState(false);
	const [phoneQuery, setPhoneQuery] = useState('');
	const [phoneResults, setPhoneResults] = useState<Array<{ id: string; number_e164: string }>>([]);
	const [phoneLoading, setPhoneLoading] = useState(false);
	const [newPhoneNumber, setNewPhoneNumber] = useState('');
	const [countryCode, setCountryCode] = useState('+1');
	const [creatingPhone, setCreatingPhone] = useState(false);

	const runSearch = async (v: string) => {
		if (!organizationId || v.trim().length < 2) {
			setPhoneResults([]);
			return;
		}
		setPhoneLoading(true);
		try {
			const results = await searchPhones(organizationId, v, 10);
			setPhoneResults(results);
		} finally {
			setPhoneLoading(false);
		}
	};

	return (
		<ComponentCard>
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-lg font-semibold">{title}</h3>
				<div className="flex items-center gap-2">
					{ENABLE_ACTION_FLAGS[ActionKey.DiscoverPhones] ? (
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
										Discover phones
									</DropdownMenuItem>
								</div>
								<div className="w-20">
									<DropdownMenuItem disabled>
										<span className="border-l pl-3 text-sm text-gray-500">
											{getActionCost(ActionKey.DiscoverPhones)} <Coins className="ml-0.5 inline-block size-3" />
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
					<p className="text-muted-foreground text-sm">No phones linked.</p>
				) : (
					items.map((p) => (
						<div key={p.id} className="flex items-center justify-between rounded-lg border p-4">
							<div className="flex min-w-0 items-center gap-3">
								<div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
									<Phone className="h-5 w-5 text-slate-700 dark:text-slate-200" />
								</div>
								<div>
									<Link to={p.linkTo} className="group text-base font-medium text-blue-600 hover:underline">
										{formatE164PhoneNumber(p.number_e164)}
									</Link>
									<div className="text-muted-foreground mt-1 text-xs">
										{p.transformType ? <span className="rounded border px-2 py-0.5">{p.transformType}</span> : null}
										{p.confidenceScore != null ? (
											<span className="ml-2">Confidence: {(p.confidenceScore * 100).toFixed(0)}%</span>
										) : null}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<Button size="sm" variant="ghost" onClick={() => onUnlink(p.id)} title="Unlink">
									<Link2Off className="h-4 w-4" />
								</Button>
							</div>
						</div>
					))
				)}
			</div>

			<Dialog open={manageOpen} onOpenChange={setManageOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Manage phones</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div className="space-y-3">
							<div className="space-y-2">
								<div className="text-sm font-medium">Search and attach</div>
								<Input
									placeholder="Search phone number…"
									value={phoneQuery}
									onChange={async (e) => {
										const v = e.target.value;
										setPhoneQuery(v);
										await runSearch(v);
									}}
								/>
							</div>
							<div className="max-h-72 space-y-2 overflow-auto">
								{phoneLoading ? (
									<div className="text-muted-foreground text-sm">Searching…</div>
								) : (
									phoneResults.map((ph) => (
										<div key={ph.id} className="flex items-center justify-between rounded border p-3">
											<div className="text-sm font-medium">{ph.number_e164}</div>
											<Button
												size="sm"
												variant="outline"
												onClick={async () => {
													try {
														await attachPhoneToPerson(ph.id, ownerId, {
															transform_type: 'manual_link'
														});
														onAttached?.({ id: ph.id, number_e164: ph.number_e164 });
														toast.success('Phone linked');
													} catch (err) {
														console.error('Failed to link phone', err);
														toast.error('Failed to link phone.');
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
										{items.map((p) => (
											<div key={p.id} className="flex items-center justify-between rounded border p-3">
												<Link to={p.linkTo} className="text-sm font-medium hover:underline">
													{p.number_e164}
												</Link>
												<Button size="sm" variant="ghost" onClick={() => onUnlink(p.id)}>
													Unlink
												</Button>
											</div>
										))}
									</div>
								</div>
							) : null}
						</div>
						<div className="space-y-3">
							<div className="space-y-2">
								<label className="text-sm font-medium">Create new phone</label>
								<div className="flex items-center gap-2">
									<Input
										className="w-28"
										placeholder="+1"
										value={countryCode}
										onChange={(e) => {
											let v = (e.target.value ?? '').trim();
											v = v.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
											if (!v.startsWith('+')) v = `+${v.replace(/\+/g, '')}`;
											const digits = v.slice(1).replace(/\D/g, '').slice(0, 4);
											setCountryCode(`+${digits}`);
										}}
									/>
									<Input
										placeholder="(123) 456-7890"
										value={newPhoneNumber}
										onChange={(e) => setNewPhoneNumber(formatPhoneInput(e.target.value))}
									/>
								</div>
								{newPhoneNumber && !isValidUS10Digits(newPhoneNumber) ? (
									<div className="text-xs text-red-600">Enter a valid 10‑digit local number.</div>
								) : null}
								<div className="bg-muted/40 text-muted-foreground rounded-md border border-dashed p-3 text-xs">
									This phone will be created and automatically linked to{' '}
									<span className="text-foreground font-medium">{displayName ?? 'this person'}</span>.
								</div>
							</div>
							<Button
								onClick={async () => {
									if (!organizationId || !newPhoneNumber.trim()) {
										toast.error('Phone number is required.');
										return;
									}
									if (!isValidUS10Digits(newPhoneNumber)) {
										toast.error('Invalid local number. Enter 10 digits.');
										return;
									}
									const ccDigits = (countryCode || '+').replace(/\D/g, '');
									if (ccDigits.length === 0) {
										toast.error('Country code is required.');
										return;
									}
									const localDigits = newPhoneNumber.replace(/\D/g, '');
									const e164 = `+${ccDigits}${localDigits}`;
									setCreatingPhone(true);
									try {
										try {
											const created = await createPhone({
												organization_id: organizationId,
												number_e164: e164,
												line_type: 'unknown',
												messaging_apps: [],
												spam_reports: 0
											});
											await attachPhoneToPerson(created.id, ownerId, {
												transform_type: 'manual_create'
											});
											onAttached?.({ id: created.id, number_e164: created.phone.number_e164 });
											toast.success('Phone created and linked.');
										} catch (err) {
											// If duplicate phone in org, find and link
											const anyErr = err as { message?: string; code?: string | number; status?: number };
											const message: string = anyErr?.message ?? '';
											const code: string | number | undefined = anyErr?.code ?? anyErr?.status;
											const isDuplicate =
												code === 409 ||
												code === '23505' ||
												/duplicate key value/i.test(message) ||
												/unique constraint/i.test(message);
											if (isDuplicate) {
												try {
													const matches = await searchPhones(organizationId, e164, 5);
													const exact = matches.find((m) => (m.number_e164 || '').replace(/\s+/g, '') === e164);
													const toLink = exact ?? matches[0];
													if (toLink) {
														await attachPhoneToPerson(toLink.id, ownerId, { transform_type: 'manual_link' });
														onAttached?.({ id: toLink.id, number_e164: toLink.number_e164 });
														toast.success('Existing phone found and linked.');
													} else {
														toast.error('Phone already exists but could not be found to link.');
													}
												} catch (linkErr) {
													console.error('Failed to link existing phone after duplicate', linkErr);
													toast.error('Failed to link existing phone.');
												}
											} else {
												throw err;
											}
										}
										setNewPhoneNumber('');
										setManageOpen(false);
									} catch (err) {
										console.error(err);
										toast.error('Failed to create phone.');
									} finally {
										setCreatingPhone(false);
									}
								}}
								disabled={creatingPhone || (newPhoneNumber ? !isValidUS10Digits(newPhoneNumber) : true)}
							>
								{creatingPhone ? 'Creating…' : 'Create phone'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</ComponentCard>
	);
}



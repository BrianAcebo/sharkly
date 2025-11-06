import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import PageMeta from '../../components/common/PageMeta';
import { AuthLoading } from '../../components/AuthLoading';
import { AuthLoadingState } from '../../contexts/AuthContext';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { getBusinessById, updateBusiness } from '../../api/businesses';
import type { BusinessRecord } from '../../types/business';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Separator } from '../../components/ui/separator';
import { UserAvatar } from '../../components/common/UserAvatar';
import { formatDistanceToNow } from 'date-fns';

export default function BusinessDetail() {
	const { id } = useParams<{ id: string }>();
	const { setTitle, setReturnTo } = useBreadcrumbs();
	const [row, setRow] = useState<BusinessRecord | null>(null);
	const [editMode, setEditMode] = useState(false);
	const [saving, setSaving] = useState(false);
	const [draft, setDraft] = useState<{ name: string; ein: string; avatar: string }>({
		name: '',
		ein: '',
		avatar: ''
	});

	useEffect(() => {
		let active = true;
		(async () => {
			if (!id) return;
			const data = await getBusinessById(id);
			if (!active) return;
			setRow(data);
			setDraft({
				name: data.name,
				ein: data.ein_tax_id ?? '',
				avatar: data.avatar ?? ''
			});
		})();
		return () => {
			active = false;
		};
	}, [id]);

	useEffect(() => {
		if (!row) return;
		setTitle(row.name);
		setReturnTo({ path: '/businesses', label: 'Businesses' });
		setDraft({
			name: row.name,
			ein: row.ein_tax_id ?? '',
			avatar: row.avatar ?? ''
		});
	}, [row, setTitle, setReturnTo]);

	if (!row) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	const save = async () => {
		if (!row || !id) return;
		setSaving(true);
		try {
			const updated = await updateBusiness(id, {
				name: draft.name.trim() || row.name,
				ein_tax_id: draft.ein.trim() || null,
				avatar: draft.avatar.trim() || null
			});
			setRow(updated);
			setEditMode(false);
		} finally {
			setSaving(false);
		}
	};

	const addressesCount = Array.isArray(row.addresses) ? row.addresses.length : 0;
	const officersCount = Array.isArray(row.officers) ? row.officers.length : 0;
	const domainsCount = Array.isArray(row.domains) ? row.domains.length : 0;

	return (
		<div>
			<PageMeta title={row.name} description="Business" noIndex />
			<div className="mx-auto max-w-5xl space-y-6 p-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-semibold">{row.name}</h1>
					{!editMode ? (
						<Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
							Edit
						</Button>
					) : (
						<div className="flex items-center gap-2">
							<Button size="sm" variant="outline" onClick={() => setEditMode(false)} disabled={saving}>
								Cancel
							</Button>
							<Button size="sm" onClick={save} disabled={saving}>
								{saving ? 'Saving...' : 'Save'}
							</Button>
						</div>
					)}
				</div>

				<div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-900">
					<div className="flex items-start gap-4">
						<UserAvatar
							user={{
								name: row.name,
								avatar: row.avatar ?? null
							}}
							size="lg"
						/>
						<div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
							<div>
								<span className="font-medium">EIN / Tax ID:</span> {row.ein_tax_id || '—'}
							</div>
							<div>
								<span className="font-medium">Officers:</span> {officersCount > 0 ? officersCount : '—'}
							</div>
							<div>
								<span className="font-medium">Addresses:</span> {addressesCount > 0 ? addressesCount : '—'}
							</div>
							<div>
								<span className="font-medium">Domains:</span> {domainsCount > 0 ? domainsCount : '—'}
							</div>
							<div className="text-xs text-gray-500">
								Updated {formatDistanceToNow(new Date(row.updated_at), { addSuffix: true })}
							</div>
						</div>
					</div>
				</div>

				{!editMode ? (
					<div className="space-y-6 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-900">
						<div>
							<h2 className="text-base font-semibold">Registration</h2>
							<pre className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
								{row.registration ? JSON.stringify(row.registration, null, 2) : '—'}
							</pre>
						</div>
						<Separator />
						<div>
							<h2 className="text-base font-semibold">Officers</h2>
							<pre className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
								{officersCount > 0 ? JSON.stringify(row.officers, null, 2) : '—'}
							</pre>
						</div>
						<Separator />
						<div>
							<h2 className="text-base font-semibold">Addresses</h2>
							<pre className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
								{addressesCount > 0 ? JSON.stringify(row.addresses, null, 2) : '—'}
							</pre>
						</div>
					</div>
				) : (
					<div className="space-y-6 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-900">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							<div>
								<label className="text-sm font-medium">Business name</label>
								<Input value={draft.name} onChange={(e) => setDraft((cur) => ({ ...cur, name: e.target.value }))} />
							</div>
							<div>
								<label className="text-sm font-medium">EIN / Tax ID</label>
								<Input value={draft.ein} onChange={(e) => setDraft((cur) => ({ ...cur, ein: e.target.value }))} />
							</div>
							<div>
								<label className="text-sm font-medium">Avatar URL</label>
								<Input value={draft.avatar} onChange={(e) => setDraft((cur) => ({ ...cur, avatar: e.target.value }))} />
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}



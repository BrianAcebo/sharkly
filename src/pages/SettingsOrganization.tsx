/**
 * Settings: Organization
 * Edit organization name (owner only). Read-only info for all members.
 */

import { useState, useEffect } from 'react';
import PageMeta from '../components/common/PageMeta';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import InputField from '../components/form/input/InputField';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Building2, Loader2 } from 'lucide-react';

interface OrganizationRow {
	id: string;
	name: string;
	owner_id: string;
	created_at: string;
	max_seats: number | null;
}

export default function SettingsOrganization() {
	const { user, refreshUser } = useAuth();
	const [organization, setOrganization] = useState<OrganizationRow | null>(null);
	const [name, setName] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const isOwner = !!user && !!organization && organization.owner_id === user.id;

	useEffect(() => {
		if (!user?.organization_id) {
			setLoading(false);
			return;
		}
		let cancelled = false;
		(async () => {
			const { data, error } = await supabase
				.from('organizations')
				.select('id, name, owner_id, created_at, max_seats')
				.eq('id', user.organization_id)
				.single();
			if (cancelled) return;
			if (error || !data) {
				setOrganization(null);
				setLoading(false);
				return;
			}
			setOrganization(data as OrganizationRow);
			setName((data as OrganizationRow).name ?? '');
			setLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, [user?.organization_id]);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!organization || !user?.organization_id) return;
		if (organization.owner_id !== user.id) {
			toast.error('Only the organization owner can change the name');
			return;
		}
		const trimmed = name.trim();
		if (!trimmed) {
			toast.error('Organization name is required');
			return;
		}
		setSaving(true);
		try {
			const { error } = await supabase
				.from('organizations')
				.update({ name: trimmed })
				.eq('id', organization.id);
			if (error) throw error;
			setOrganization((prev) => (prev ? { ...prev, name: trimmed } : null));
			await refreshUser();
			toast.success('Organization name updated');
		} catch (err) {
			console.error(err);
			toast.error('Failed to update organization name');
		} finally {
			setSaving(false);
		}
	};

	if (!user?.organization_id) {
		return (
			<>
				<PageMeta title="Organization" description="Organization settings" />
				<div className="flex items-center gap-3">
					<Building2 className="size-5 text-gray-400" />
					<div>
						<h1 className="font-montserrat text-xl font-bold text-gray-900 dark:text-white">
							Organization
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							You are not in an organization. Create or join one from the Organization page.
						</p>
					</div>
				</div>
			</>
		);
	}

	if (loading) {
		return (
			<>
				<PageMeta title="Organization" description="Organization settings" />
				<div className="mt-8 flex justify-center">
					<Loader2 className="size-5 animate-spin text-gray-400" />
				</div>
			</>
		);
	}

	if (!organization) {
		return (
			<>
				<PageMeta title="Organization" description="Organization settings" />
				<div className="flex items-center gap-3">
					<Building2 className="size-5 text-gray-400" />
					<div>
						<h1 className="font-montserrat text-xl font-bold text-gray-900 dark:text-white">
							Organization
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">Organization not found.</p>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<PageMeta title="Organization" description="Organization settings" />
			<div className="flex items-center gap-3">
				<Building2 className="size-5 text-gray-400" />
				<div>
					<h1 className="font-montserrat text-xl font-bold text-gray-900 dark:text-white">
						Organization
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						{isOwner ? 'Update your organization name and view details.' : 'View your organization details.'}
					</p>
				</div>
			</div>

			<div className="mt-6 space-y-5">
				<form onSubmit={handleSave} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
					<p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
						Organization details
					</p>
					<div className="space-y-4 max-w-md">
						<div>
							<Label htmlFor="org-name" className="text-sm">Organization name</Label>
							<InputField
								id="org-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Acme Inc"
								className="mt-1"
								disabled={!isOwner}
							/>
							{!isOwner && (
								<p className="mt-1 text-[11px] text-gray-400">Only the organization owner can change the name.</p>
							)}
						</div>
						<div className="text-sm text-gray-500 dark:text-gray-400">
							<span className="font-medium text-gray-700 dark:text-gray-300">Organization ID</span>
							<span className="ml-2 font-mono text-xs">{organization.id}</span>
						</div>
						{/* {organization.max_seats != null && (
							<div className="text-sm text-gray-500 dark:text-gray-400">
								<span className="font-medium text-gray-700 dark:text-gray-300">Max seats</span>
								<span className="ml-2">{organization.max_seats}</span>
							</div>
						)} */}
						<div className="text-sm text-gray-500 dark:text-gray-400">
							<span className="font-medium text-gray-700 dark:text-gray-300">Created</span>
							<span className="ml-2">{new Date(organization.created_at).toLocaleDateString()}</span>
						</div>
						{isOwner && (
							<Button
								type="submit"
								disabled={saving || name.trim() === organization.name}
								className="bg-brand-500 hover:bg-brand-600 text-white"
							>
								{saving && <Loader2 className="mr-2 size-4 animate-spin" />}
								{saving ? 'Saving…' : 'Save changes'}
							</Button>
						)}
					</div>
				</form>
			</div>
		</>
	);
}

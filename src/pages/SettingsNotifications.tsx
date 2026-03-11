/**
 * Settings: Notifications
 * Toggle preferences for rank drop alerts, weekly summary,
 * credit low warnings, and cluster completion notifications.
 */

import { useState, useEffect } from 'react';
import PageMeta from '../components/common/PageMeta';
import { Button } from '../components/ui/button';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Bell, Loader2 } from 'lucide-react';

interface NotificationPrefs {
	rank_drop_alerts: boolean;
	weekly_summary: boolean;
	credit_low_warning: boolean;
	cluster_completion: boolean;
	email_enabled: boolean;
	in_app_enabled: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
	rank_drop_alerts: true,
	weekly_summary: true,
	credit_low_warning: true,
	cluster_completion: true,
	email_enabled: true,
	in_app_enabled: true
};

function Toggle({
	checked,
	onChange,
	disabled
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<button
			role="switch"
			aria-checked={checked}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
				checked ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
			}`}
		>
			<span
				className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
					checked ? 'translate-x-4' : 'translate-x-0'
				}`}
			/>
		</button>
	);
}

interface PrefRowProps {
	label: string;
	description: string;
	checked: boolean;
	onChange: (v: boolean) => void;
	disabled?: boolean;
}

function PrefRow({ label, description, checked, onChange, disabled }: PrefRowProps) {
	return (
		<div className="flex items-center justify-between py-4">
			<div className="pr-6">
				<p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
				<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
			</div>
			<Toggle checked={checked} onChange={onChange} disabled={disabled} />
		</div>
	);
}

export default function SettingsNotifications() {
	const { user } = useAuth();
	const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!user?.id) return;
		const load = async () => {
			const { data } = await supabase
				.from('profiles')
				.select('notification_prefs')
				.eq('id', user.id)
				.maybeSingle();
			if (data?.notification_prefs) {
				setPrefs({ ...DEFAULT_PREFS, ...data.notification_prefs });
			}
			setLoading(false);
		};
		load();
	}, [user?.id]);

	const set = (key: keyof NotificationPrefs) => (val: boolean) =>
		setPrefs((p) => ({ ...p, [key]: val }));

	const save = async () => {
		if (!user?.id) return;
		setSaving(true);
		const { error } = await supabase
			.from('profiles')
			.update({ notification_prefs: prefs })
			.eq('id', user.id);
		setSaving(false);
		if (error) {
			toast.error('Failed to save preferences');
		} else {
			toast.success('Notification preferences saved');
		}
	};

	return (
		<>
			<PageMeta title="Notifications" description="Manage notification preferences" />

			<div className="flex items-center gap-3">
				<Bell className="size-5 text-gray-400" />
				<div>
					<h1 className="font-montserrat text-xl font-bold text-gray-900 dark:text-white">
						Notifications
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Control what alerts you receive and how.
					</p>
				</div>
			</div>

			{loading ? (
				<div className="mt-8 flex justify-center">
					<Loader2 className="size-5 animate-spin text-gray-400" />
				</div>
			) : (
				<div className="mt-6 space-y-4">
					{/* Alert types */}
					<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
						<div className="border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
							<p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
								Alert types
							</p>
						</div>
						<div className="divide-y divide-gray-100 px-5 dark:divide-gray-800">
							<PrefRow
								label="Rank drop alerts"
								description="Notify when a tracked keyword drops 3 or more positions."
								checked={prefs.rank_drop_alerts}
								onChange={set('rank_drop_alerts')}
							/>
							<PrefRow
								label="Weekly summary"
								description="A digest of your rankings, credits used, and top wins every Monday."
								checked={prefs.weekly_summary}
								onChange={set('weekly_summary')}
							/>
							<PrefRow
								label="Credit low warning"
								description="Alert when your included credits fall below 50."
								checked={prefs.credit_low_warning}
								onChange={set('credit_low_warning')}
							/>
							<PrefRow
								label="Cluster completion"
								description="Notify when all content in a cluster has been published."
								checked={prefs.cluster_completion}
								onChange={set('cluster_completion')}
							/>
						</div>
					</div>

					{/* Delivery channels */}
					<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
						<div className="border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
							<p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
								Delivery
							</p>
						</div>
						<div className="divide-y divide-gray-100 px-5 dark:divide-gray-800">
							<PrefRow
								label="Email notifications"
								description={`Sent to ${user?.email ?? 'your email address'}.`}
								checked={prefs.email_enabled}
								onChange={set('email_enabled')}
							/>
							<PrefRow
								label="In-app notifications"
								description="Show alerts inside the Sharkly dashboard."
								checked={prefs.in_app_enabled}
								onChange={set('in_app_enabled')}
							/>
						</div>
					</div>

					<div className="flex justify-end">
						<Button
							onClick={save}
							disabled={saving}
							className="bg-brand-500 hover:bg-brand-600 text-white"
						>
							{saving && <Loader2 className="mr-2 size-4 animate-spin" />}
							{saving ? 'Saving…' : 'Save preferences'}
						</Button>
					</div>
				</div>
			)}
		</>
	);
}

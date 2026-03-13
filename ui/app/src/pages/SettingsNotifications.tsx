/**
 * Settings: Notifications
 * Toggle preferences for rank drop alerts, weekly summary,
 * credit low warnings, cluster completion; enable browser push and system settings.
 */

import { useState, useEffect, useCallback } from 'react';
import PageMeta from '../components/common/PageMeta';
import { Button } from '../components/ui/button';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Bell, Loader2, BellRing, ExternalLink } from 'lucide-react';

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

type NotificationPermissionState = NotificationPermission | 'unsupported';

function getNotificationPermission(): NotificationPermissionState {
	if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
	return Notification.permission;
}

export default function SettingsNotifications() {
	const { user } = useAuth();
	const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [pushPermission, setPushPermission] = useState<NotificationPermissionState>(getNotificationPermission());
	const [requestingPush, setRequestingPush] = useState(false);

	const refreshPushPermission = useCallback(() => {
		setPushPermission(getNotificationPermission());
	}, []);

	useEffect(() => {
		refreshPushPermission();
		const handleVisibility = () => {
			if (!document.hidden) refreshPushPermission();
		};
		document.addEventListener('visibilitychange', handleVisibility);
		return () => document.removeEventListener('visibilitychange', handleVisibility);
	}, [refreshPushPermission]);

	const openSystemSettingsGuide = useCallback(() => {
		if (typeof navigator === 'undefined' || typeof window === 'undefined') return;
		const platform = navigator.userAgent.toLowerCase();
		let guideUrl = 'https://support.google.com/chrome/answer/3220216?hl=en';
		if (platform.includes('mac')) {
			guideUrl = 'https://support.apple.com/guide/mac-help/change-notifications-settings-in-mac-mh40577/mac';
		} else if (platform.includes('win')) {
			guideUrl = 'https://support.microsoft.com/windows/change-notification-settings-in-windows-10-6448c37f-8733-44bb-b43f-b660fdb58dff';
		} else if (platform.includes('linux') || platform.includes('ubuntu')) {
			guideUrl = 'https://help.ubuntu.com/stable/ubuntu-help/shell-notifications.html';
		}
		window.open(guideUrl, '_blank', 'noopener');
	}, []);

	const requestPushPermission = useCallback(async () => {
		if (!('Notification' in window)) {
			toast.error('Browser notifications are not supported');
			return;
		}
		setRequestingPush(true);
		try {
			const permission = await Notification.requestPermission();
			setPushPermission(permission);
			if (permission === 'granted') {
				toast.success('Browser notifications enabled');
			} else if (permission === 'denied') {
				toast.error('Notifications blocked. You can enable them in your browser or system settings.');
			}
		} catch (e) {
			console.error(e);
			toast.error('Could not request notification permission');
		} finally {
			setRequestingPush(false);
		}
	}, []);

	const sendTestNotification = useCallback(() => {
		if (!('Notification' in window) || Notification.permission !== 'granted') return;
		try {
			const n = new Notification('Sharkly', {
				body: 'This is a test notification. You’ll see alerts like this when you get rank drops, credit warnings, and more.',
				icon: '/images/logos/logo.svg',
				tag: 'sharkly-test'
			});
			setTimeout(() => n.close(), 6000);
			toast.success('Test notification sent');
		} catch (e) {
			console.error(e);
			toast.error('Could not send test notification');
		}
	}, []);

	useEffect(() => {
		if (!user?.id) return;
		const load = async () => {
			const { data, error } = await supabase
				.from('profiles')
				.select('notification_prefs')
				.eq('id', user.id)
				.maybeSingle();
			if (error) {
				console.error('Error loading notification preferences:', error);
				return;
			}
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
							{/* <PrefRow
								label="In-app notifications"
								description="Show alerts inside the Sharkly dashboard."
								checked={prefs.in_app_enabled}
								onChange={set('in_app_enabled')}
							/> */}
						</div>
					</div>

					{/* Browser push notifications */}
					<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
						<div className="border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
							<p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
								<BellRing className="size-3.5" />
								Browser (push) notifications
							</p>
						</div>
						<div className="px-5 py-4 space-y-4">
							<p className="text-sm text-gray-600 dark:text-gray-400">
								{pushPermission === 'granted'
									? 'Notifications are enabled. You’ll see alerts on your computer when you get rank drops, credit warnings, and more.'
									: pushPermission === 'denied'
										? 'Notifications are currently blocked. Enable them in your browser or system settings to get alerts on your computer.'
										: pushPermission === 'unsupported'
											? 'Browser notifications are not supported in this environment.'
											: 'Enable browser notifications to get alerts on your computer (rank drops, credit warnings, cluster completion).'}
							</p>
							{(pushPermission === 'default' || pushPermission === 'denied') && (
								<div className="space-y-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 text-sm text-gray-600 dark:text-gray-300">
									<ol className="list-decimal space-y-2 pl-5 pr-1">
										<li>
											Click <strong>Enable browser notifications</strong> below and allow the prompt in your browser.
										</li>
										<li>
											Allow notifications for this site in your computer’s system settings:
											<ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-gray-500 dark:text-gray-400">
												<li>macOS: System Settings → Notifications → your browser</li>
												<li>Windows: Settings → System → Notifications & actions</li>
												<li>Linux: Settings → Notifications → Applications</li>
											</ul>
										</li>
									</ol>
									<p className="text-xs text-gray-500 dark:text-gray-400">
										After changing system settings, you may need to relaunch your browser.
									</p>
								</div>
							)}
							<div className="flex flex-wrap items-center gap-2">
								{(pushPermission === 'default' || pushPermission === 'denied') && (
									<Button
										onClick={requestPushPermission}
										disabled={requestingPush}
										className="bg-brand-500 hover:bg-brand-600 text-white"
									>
										{requestingPush && <Loader2 className="mr-2 size-4 animate-spin" />}
										{requestingPush ? 'Requesting…' : 'Enable browser notifications'}
									</Button>
								)}
								{pushPermission === 'granted' && (
									<Button
										variant="outline"
										size="sm"
										onClick={sendTestNotification}
									>
										Send test notification
									</Button>
								)}
								{(pushPermission === 'denied' || pushPermission === 'default') && (
									<Button
										variant="ghost"
										size="sm"
										onClick={openSystemSettingsGuide}
										className="text-gray-600 dark:text-gray-400"
									>
										<ExternalLink className="mr-1.5 size-3.5" />
										More on system settings
									</Button>
								)}
							</div>
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

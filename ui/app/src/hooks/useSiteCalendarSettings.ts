import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { ScheduleSettings } from '../utils/contentSchedule';

function rowToSettings(row: {
	cadence: string;
	amount: number;
	bundle: string;
	start_date: string;
	include_published: boolean;
}): ScheduleSettings {
	const start =
		typeof row.start_date === 'string'
			? row.start_date.slice(0, 10)
			: String(row.start_date).slice(0, 10);
	return {
		cadence: row.cadence === 'weekly' ? 'weekly' : 'daily',
		amount: Math.max(1, Math.min(50, Number(row.amount) || 1)),
		bundle: row.bundle === 'cluster' ? 'cluster' : 'article',
		startDate: start,
		includePublished: Boolean(row.include_published)
	};
}

export function useSiteCalendarSettings(siteId: string | null) {
	const [settings, setSettings] = useState<ScheduleSettings | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const refetch = useCallback(async () => {
		if (!siteId) {
			setSettings(null);
			setLoading(false);
			return;
		}
		setSettings(null);
		setLoading(true);
		try {
			const { data, error } = await supabase
				.from('site_calendar_settings')
				.select('cadence, amount, bundle, start_date, include_published')
				.eq('site_id', siteId)
				.maybeSingle();

			if (error) throw error;
			setSettings(data ? rowToSettings(data) : null);
		} catch {
			setSettings(null);
		} finally {
			setLoading(false);
		}
	}, [siteId]);

	useEffect(() => {
		void refetch();
	}, [refetch]);

	const save = useCallback(
		async (s: ScheduleSettings): Promise<{ error: string | null }> => {
			if (!siteId) return { error: 'No site selected' };
			setSaving(true);
			try {
				const now = new Date().toISOString();
				const { error } = await supabase.from('site_calendar_settings').upsert(
					{
						site_id: siteId,
						cadence: s.cadence,
						amount: s.amount,
						bundle: s.bundle,
						start_date: s.startDate,
						include_published: s.includePublished ?? false,
						updated_at: now
					},
					{ onConflict: 'site_id' }
				);
				if (error) return { error: error.message };
				setSettings(s);
				return { error: null };
			} catch (err) {
				return { error: err instanceof Error ? err.message : 'Failed to save' };
			} finally {
				setSaving(false);
			}
		},
		[siteId]
	);

	return { settings, loading, saving, save, refetch };
}

import { useMemo, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, EventClickArg, EventContentArg } from '@fullcalendar/core';
import { addDays, format, max as maxDate, parseISO } from 'date-fns';
import type { Topic } from '../../hooks/useTopics';
import type { Cluster } from '../../hooks/useClusters';
import {
	assignScheduleDates,
	buildClusterGroupsInQueueOrder,
	buildOrderedPublishedPages,
	buildOrderedUnpublishedPages,
	type ScheduleBundle,
	type ScheduleCadence,
	type SchedulePage,
	type ScheduleSettings
} from '../../utils/contentSchedule';
import { ChevronDown, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { useSiteCalendarSettings } from '../../hooks/useSiteCalendarSettings';

/** Same bucket names as `components/Calendar.tsx` for `fc-bg-*` + `event-fc-color` styling */
function statusToCalendarKey(status: SchedulePage['status']): string {
	switch (status) {
		case 'planned':
			return 'Danger';
		case 'brief_generated':
			return 'Primary';
		case 'draft':
			return 'Warning';
		case 'published':
			return 'Success';
		default:
			return 'Primary';
	}
}

/** Matches `components/Calendar.tsx` `renderEventContent` */
function scheduleEventContent(eventInfo: EventContentArg) {
	const colorClass = `fc-bg-${String(eventInfo.event.extendedProps.calendar).toLowerCase()}`;
	return (
		<div className={`event-fc-color fc-event-main flex ${colorClass} rounded-sm p-1`}>
			<div className="fc-daygrid-event-dot"></div>
			<div className="fc-event-time">{eventInfo.timeText}</div>
			<div className="fc-event-title">{eventInfo.event.title}</div>
		</div>
	);
}

export type ContentScheduleCalendarProps = {
	siteId: string | null;
	pages: SchedulePage[];
	topics: Topic[];
	clusters: Cluster[];
	loading?: boolean;
};

export function ContentScheduleCalendar({
	siteId,
	pages,
	topics,
	clusters,
	loading = false
}: ContentScheduleCalendarProps) {
	const navigate = useNavigate();
	const {
		settings: savedFromDb,
		loading: settingsLoading,
		saving,
		save
	} = useSiteCalendarSettings(siteId);
	const [cadence, setCadence] = useState<ScheduleCadence>('daily');
	const [amount, setAmount] = useState(1);
	const [bundle, setBundle] = useState<ScheduleBundle>('article');
	const [startDate, setStartDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
	const [includePublished, setIncludePublished] = useState(false);
	const [prefsOpen, setPrefsOpen] = useState(false);

	useEffect(() => {
		if (!savedFromDb) return;
		setCadence(savedFromDb.cadence);
		setAmount(savedFromDb.amount);
		setBundle(savedFromDb.bundle);
		setStartDate(savedFromDb.startDate);
		setIncludePublished(savedFromDb.includePublished ?? false);
	}, [savedFromDb]);

	const persist = useCallback(async () => {
		const { error } = await save({
			cadence,
			amount,
			bundle,
			startDate,
			includePublished
		});
		if (error) {
			toast.error(error);
		} else {
			toast.success('Schedule preferences saved');
		}
	}, [save, cadence, amount, bundle, startDate, includePublished]);

	const orderedUnpublished = useMemo(
		() => buildOrderedUnpublishedPages(topics, clusters, pages),
		[topics, clusters, pages]
	);

	const clusterGroups = useMemo(
		() => buildClusterGroupsInQueueOrder(topics, clusters, pages),
		[topics, clusters, pages]
	);

	const dateByPageId = useMemo(() => {
		const settings: ScheduleSettings = { cadence, amount, bundle, startDate };
		const base = assignScheduleDates(orderedUnpublished, settings, clusterGroups);
		const merged = new Map(base);
		if (!includePublished) return merged;

		const orderedPub = buildOrderedPublishedPages(topics, clusters, pages);
		if (orderedPub.length === 0) return merged;

		let anchor = parseISO(startDate);
		if (merged.size > 0) {
			anchor = maxDate([...merged.values()].map((d) => parseISO(d)));
		}
		let d = addDays(anchor, 1);
		for (const p of orderedPub) {
			merged.set(p.id, format(d, 'yyyy-MM-dd'));
			d = addDays(d, 1);
		}
		return merged;
	}, [
		cadence,
		amount,
		bundle,
		startDate,
		orderedUnpublished,
		clusterGroups,
		includePublished,
		topics,
		clusters,
		pages
	]);

	const events: EventInput[] = useMemo(() => {
		const list: EventInput[] = [];
		const toShow = includePublished ? pages : pages.filter((p) => p.status !== 'published');
		for (const p of toShow) {
			const when = dateByPageId.get(p.id);
			if (!when) continue;
			list.push({
				id: p.id,
				title: p.title,
				start: when,
				allDay: true,
				extendedProps: {
					calendar: statusToCalendarKey(p.status),
					clusterId: p.clusterId
				}
			});
		}
		return list;
	}, [pages, dateByPageId, includePublished]);

	const onEventClick = useCallback(
		(arg: EventClickArg) => {
			const id = arg.event.id;
			const clusterId = arg.event.extendedProps.clusterId as string;
			if (id && clusterId) {
				navigate(`/workspace/${id}`);
			}
		},
		[navigate]
	);

	if (!siteId) return null;

	const inputClass =
		'dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90';

	return (
		<div className="space-y-4">
			<Collapsible open={prefsOpen} onOpenChange={setPrefsOpen}>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<h2 className="font-montserrat text-base font-bold text-gray-900 dark:text-white">
						Article schedule
					</h2>
					<CollapsibleTrigger asChild>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="shrink-0 gap-1.5 [&[data-state=open]>svg]:rotate-180"
							aria-expanded={prefsOpen}
						>
							<Settings className="size-4 shrink-0" />
						</Button>
					</CollapsibleTrigger>
				</div>
				<CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
					<div className="flex flex-wrap items-end gap-4 pt-4">
						<div>
							<label className="mb-1 block text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
								Cadence
							</label>
							<select
								value={cadence}
								onChange={(e) => setCadence(e.target.value as ScheduleCadence)}
								className={inputClass}
							>
								<option value="daily">Per day</option>
								<option value="weekly">Per week</option>
							</select>
						</div>
						{bundle === 'article' && (
							<div>
								<label className="mb-1 block text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
									{cadence === 'daily' ? 'Articles per day' : 'Articles per week'}
								</label>
								<input
									type="number"
									min={1}
									max={50}
									value={amount}
									onChange={(e) =>
										setAmount(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))
									}
									className={`w-24 ${inputClass}`}
								/>
							</div>
						)}
						<div>
							<label className="mb-1 block text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
								Packaging
							</label>
							<select
								value={bundle}
								onChange={(e) => setBundle(e.target.value as ScheduleBundle)}
								className={inputClass}
							>
								<option value="article">Articles in topic order</option>
								<option value="cluster">
									One cluster per {cadence === 'daily' ? 'day' : 'week'}
								</option>
							</select>
						</div>
						<div>
							<label className="mb-1 block text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
								Start date
							</label>
							<input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className={inputClass}
							/>
						</div>
						<label className="flex cursor-pointer items-center gap-2 pb-1 text-sm text-gray-700 dark:text-gray-300">
							<input
								type="checkbox"
								checked={includePublished}
								onChange={(e) => setIncludePublished(e.target.checked)}
								className="rounded border-gray-300"
							/>
							Show published (after schedule)
						</label>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="ml-auto"
							disabled={saving || settingsLoading}
							onClick={() => void persist()}
						>
							{saving ? 'Saving…' : 'Save preferences'}
						</Button>
					</div>
				</CollapsibleContent>
			</Collapsible>

			<p className="text-sm text-gray-500 dark:text-gray-400">
				Topic-queue order matches Strategy. Click an event to open the workspace.
			</p>

			<div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-900 dark:bg-white/3">
				<div className="custom-calendar">
					{loading || settingsLoading ? (
						<div className="h-[min(480px,70vh)] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
					) : events.length === 0 ? (
						<div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
							No articles to place yet. Generate clusters from Strategy so pieces appear here.
						</div>
					) : (
						<FullCalendar
							plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
							initialView="dayGridMonth"
							headerToolbar={{
								left: 'prev,next today',
								center: 'title',
								right: 'dayGridMonth,timeGridWeek,timeGridDay'
							}}
							events={events}
							selectable={false}
							eventClick={onEventClick}
							eventContent={scheduleEventContent}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

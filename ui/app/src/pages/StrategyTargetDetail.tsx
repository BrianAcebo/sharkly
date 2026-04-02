import React, { useState, useCallback, useEffect } from 'react';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { FunnelTag } from '../components/shared/FunnelTag';
import { inferClusterContentPageType, pageTypeColor } from '../lib/seoUtils';
import { CreditBadge, CreditCost } from '../components/shared/CreditBadge';
import { TaskProgressWidget } from '../components/shared/TaskProgressWidget';
import type { TaskStep, TaskStatus } from '../components/shared/TaskProgressWidget';
import { Button } from '../components/ui/button';
import { Link, useNavigate, useParams, useLocation } from 'react-router';
import {
	GripVertical,
	Sparkles,
	Loader2,
	ChevronDown,
	ChevronUp,
	Search,
	AlertTriangle,
	Trash2,
	History,
	RotateCcw,
	CheckCircle2,
	Check,
	Clock,
	TrendingUp,
	Zap,
	Lock,
	FileText,
	Pencil,
	Eye,
	ArrowRightLeft,
	Download
} from 'lucide-react';
import { useSiteContext } from '../contexts/SiteContext';
import { useTopics } from '../hooks/useTopics';
import { useTargetTopics } from '../hooks/useTargetTopics';
import { useTargets } from '../hooks/useTargets';
import { useStrategyRuns } from '../hooks/useStrategyRuns';
import { useOrganization } from '../hooks/useOrganization';
import { supabase } from '../utils/supabaseClient';
import { api } from '../utils/api';
import { toast } from 'sonner';
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent
} from '@dnd-kit/core';
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
	useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Topic } from '../hooks/useTopics';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import InputField from '../components/form/input/InputField';
import { CREDIT_COSTS } from '../lib/credits';
import { downloadStrategyCsv, downloadStrategyXlsx } from '../lib/strategyTargetExport';
import { KeywordLookupModal } from '../components/strategy/KeywordLookupModal';
import { EditTargetModal } from '../components/strategy/EditTargetModal';
import { MoveTopicModal } from '../components/strategy/MoveTopicModal';
import { Slider } from '../components/ui/slider';
import TextArea from '../components/form/input/TextArea';
const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? 'https://sharkly.co';
const IGS_LINK = `${MARKETING_URL}/blog/glossary/what-is-information-gain-score-igs`;

// Returns a recommended article count and plain-English explanation based
// on how competitive the topic keyword is (0–100 difficulty scale) AND
// how wide the topic's keyword landscape is (monthly search volume as proxy).
//
// KD alone is wrong: "shopify url structure" (KD 56, vol 500) is narrow —
// there are only ~6-8 supportable angles. But "shopify seo" (KD 56, vol 50k)
// is broad — 18 articles is genuinely appropriate.
//
// Volume tiers as supply proxy:
//   < 500/mo  → narrow topic,  cap at 6  articles regardless of KD
//   < 2,000   → medium-narrow, cap at 10 articles
//   < 8,000   → medium,        cap at 14 articles
//   ≥ 8,000   → broad enough,  no supply cap (KD drives the count)
function getArticleRecommendation(
	kd: number,
	volume?: number
): {
	count: number;
	label: string;
	color: string;
	reason: React.ReactNode;
} {
	// KD-based baseline count
	let baseCount: number;
	let label: string;
	let color: string;
	let reason: React.ReactNode;

	if (kd <= 15) {
		baseCount = 5;
		label = 'Low competition';
		color = 'text-success-600 dark:text-success-400';
		reason = (
			<>
				This is a low-competition topic — 5 well-written articles is enough to fully cover it and
				rank quickly. Don&apos;t pad it out just for the sake of more content. A 5-article cluster
				that completely covers a narrow topic, with strong internal linking and genuine{' '}
				<a
					href={IGS_LINK}
					target="_blank"
					rel="noopener noreferrer"
					className="text-brand-500 hover:text-brand-600 underline underline-offset-2"
				>
					IGS signals
				</a>
				, will outperform a 20-article cluster of thin Skyscraper content every time.
			</>
		);
	} else if (kd <= 30) {
		baseCount = 8;
		label = 'Moderate competition';
		color = 'text-brand-600 dark:text-brand-400';
		reason =
			"There's a moderate level of competition here. 8 articles gives you solid coverage of the topic — deep enough to outrank most sites without creating thin filler content.";
	} else if (kd <= 45) {
		baseCount = 12;
		label = 'Competitive';
		color = 'text-warning-600 dark:text-warning-400';
		reason =
			"This is a competitive keyword. You'll need around 12 articles covering the full range of questions people ask to build enough authority to rank.";
	} else {
		baseCount = 18;
		label = 'Highly competitive';
		color = 'text-error-600 dark:text-error-400';
		reason =
			"This is a tough keyword with a lot of established competition. 18–20 articles covering every angle gives you the best shot at ranking — but only generate what you'll actually publish.";
	}

	// Volume-based supply cap: narrow topics don't have 18 distinct angles to write about.
	// Recommending 18 for a 500/mo topic results in off-topic padding — worse than fewer.
	const vol = volume ?? 0;
	let supplyCap: number;
	let supplyNote = '';

	if (vol > 0 && vol < 500) {
		supplyCap = 6;
		supplyNote =
			" This is a narrow topic with limited search volume, so we've capped the recommendation — there simply aren't enough distinct angles to fill more articles with quality content.";
	} else if (vol < 2000) {
		supplyCap = 10;
		supplyNote =
			" Search volume suggests this is a fairly specific topic, so we've adjusted the recommendation to avoid padding with off-topic content.";
	} else if (vol < 8000) {
		supplyCap = 14;
		supplyNote = '';
	} else {
		supplyCap = 20; // no cap for broad topics
		supplyNote = '';
	}

	const count = Math.min(baseCount, supplyCap);

	// Append supply note to reason if we capped below the KD-based count
	if (count < baseCount && supplyNote) {
		reason =
			typeof reason === 'string' ? (
				reason + supplyNote
			) : (
				<>
					{reason}
					{supplyNote}
				</>
			);
	}

	return { count, label, color, reason };
}

const FILTERS = [
	'All',
	'Achievable Now',
	'Build Toward',
	'BoFu',
	'MoFu',
	'ToFu',
	'Quick Wins'
] as const;

function strategyFilterLabel(activeFilter: string): string {
	const m: Record<string, string> = {
		all: 'All',
		achievablenow: 'Achievable Now',
		buildtoward: 'Build Toward',
		bofu: 'BoFu',
		mofu: 'MoFu',
		tofu: 'ToFu',
		quickwins: 'Quick Wins'
	};
	return m[activeFilter] ?? activeFilter;
}

const FUNNEL_OPTIONS: { value: Topic['funnel']; label: string }[] = [
	{ value: 'tofu', label: 'ToFu' },
	{ value: 'mofu', label: 'MoFu' },
	{ value: 'bofu', label: 'BoFu' }
];

function SortableTopicRow({
	topic,
	startingTopicId,
	hasCreditsForCluster,
	onStartCluster,
	onDeleteTopic,
	onEditTopic,
	onOpenMoveModal,
	otherTargets,
	movingTopicId,
	deletingTopicId,
	isUnlocked,
	clustersToUnlock
}: {
	topic: Topic;
	startingTopicId: string | null;
	hasCreditsForCluster: boolean;
	onStartCluster: (id: string) => void;
	onDeleteTopic: (id: string) => void;
	onEditTopic: (topic: Topic) => void;
	onOpenMoveModal: (topic: Topic) => void;
	otherTargets: Array<{ id: string; name: string }>;
	movingTopicId: string | null;
	deletingTopicId: string | null;
	isUnlocked: boolean;
	clustersToUnlock: number;
}) {
	const [confirmDelete, setConfirmDelete] = useState(false);
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: topic.id
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition
	};

	const kdColor =
		topic.kd < 25
			? 'text-success-600 font-bold'
			: topic.kd <= 45
				? 'text-warning-600 font-bold'
				: 'text-error-600 font-bold';
	const authLabel =
		topic.authorityFit === 'achievable'
			? 'Start Now'
			: topic.authorityFit === 'buildToward'
				? 'Build Toward'
				: 'Long-Term';
	const AuthIcon =
		topic.authorityFit === 'achievable'
			? CheckCircle2
			: topic.authorityFit === 'buildToward'
				? Clock
				: TrendingUp;
	const authColor =
		topic.authorityFit === 'achievable'
			? 'text-brand-600 dark:text-brand-400 font-semibold'
			: topic.authorityFit === 'buildToward'
				? 'text-warning-600 font-semibold'
				: 'text-gray-500 dark:text-gray-400';
	const isActive = topic.status === 'active';

	return (
		<tr
			ref={setNodeRef}
			style={style}
			className={`group border-b border-gray-200 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 ${
				isActive ? 'border-l-brand-500 dark:border-l-brand-500 border-l-4' : ''
			} ${isDragging ? 'bg-gray-100 opacity-50 dark:bg-gray-800' : ''} ${
				!isUnlocked ? 'opacity-60' : ''
			}`}
		>
			<td className="px-4 py-4" {...attributes} {...listeners}>
				<GripVertical className="invisible cursor-grab text-gray-500 opacity-0 transition-all duration-200 group-hover:visible group-hover:text-gray-900 group-hover:opacity-100 active:cursor-grabbing dark:text-gray-400 dark:group-hover:opacity-100" />
			</td>
			<td className="px-4 py-4 text-[13px] text-gray-500 dark:text-gray-400">{topic.priority}</td>
			<td className="px-4 py-4">
				<div className="font-semibold text-gray-900 dark:text-white">{topic.title}</div>
				<div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{topic.reasoning}</div>
			</td>
			<td className="px-4 py-4">
				<FunnelTag stage={topic.funnel} />
			</td>
			<td className="px-4 py-4 text-sm">{topic.volume.toLocaleString()}</td>
			<td className={`px-4 py-4 text-sm ${kdColor}`}>{topic.kd}%</td>
			<td className="px-4 py-4 text-sm">${topic.cpc.toFixed(2)}</td>
			<td className={`px-4 py-4 text-sm ${authColor}`}>
				<div className="flex items-center gap-1.5">
					<AuthIcon className="size-3.5 shrink-0" />
					{authLabel}
				</div>
			</td>
			<td className="px-4 py-4">
				<div className="flex items-center gap-5">
					{topic.clusterId ? (
						<Link to={`/clusters/${topic.clusterId}`}>
							<Button size="sm" className="bg-brand-500 hover:bg-brand-600 text-white">
								View Cluster
							</Button>
						</Link>
					) : !isUnlocked ? (
						<div className="flex items-center gap-2">
							<div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[12px] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
								<Lock className="size-3 shrink-0" />
								{clustersToUnlock === 1
									? '1 more cluster to unlock'
									: `${clustersToUnlock} clusters to unlock`}
							</div>
						</div>
					) : (
						<Button
							size="sm"
							variant="outline"
							className="border-gray-200 dark:border-gray-700"
							onClick={() => onStartCluster(topic.id)}
							disabled={!!startingTopicId || !hasCreditsForCluster}
						>
							<CreditBadge
								cost={CREDIT_COSTS.CLUSTER_GENERATION}
								action="Cluster"
								sufficient={hasCreditsForCluster}
							/>
							<span className="ml-1.5">
								{startingTopicId === topic.id ? 'Creating...' : 'Start Cluster'}
							</span>
						</Button>
					)}

					{/* Edit button */}
					{!confirmDelete && (
						<button
							type="button"
							title="Edit topic"
							onClick={() => onEditTopic(topic)}
							className="invisible rounded p-1 text-gray-400 transition-colors group-hover:visible hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
						>
							<Pencil className="size-3.5" />
						</button>
					)}

					{/* Move to another target */}
					{!confirmDelete && otherTargets.length > 0 && (
						<button
							type="button"
							title="Move to another strategy"
							disabled={movingTopicId === topic.id}
							onClick={() => onOpenMoveModal(topic)}
							className="invisible rounded p-1 text-gray-400 transition-colors group-hover:visible hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-gray-700 dark:hover:text-gray-200"
						>
							<ArrowRightLeft className="size-3.5" />
						</button>
					)}

					{/* Delete button — shows inline confirm to prevent accidents */}
					{!confirmDelete ? (
						<button
							type="button"
							title="Remove topic"
							onClick={() => setConfirmDelete(true)}
							className="invisible ml-1 rounded p-1 text-gray-400 transition-colors group-hover:visible hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
						>
							<Trash2 className="size-3.5" />
						</button>
					) : (
						<div className="flex items-center gap-1 text-[11px]">
							<span className="text-gray-500 dark:text-gray-400">Remove?</span>
							<button
								type="button"
								onClick={() => {
									setConfirmDelete(false);
									onDeleteTopic(topic.id);
								}}
								disabled={deletingTopicId === topic.id}
								className="rounded px-1.5 py-0.5 font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
							>
								{deletingTopicId === topic.id ? '…' : 'Yes'}
							</button>
							<button
								type="button"
								onClick={() => setConfirmDelete(false)}
								className="rounded px-1.5 py-0.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
							>
								No
							</button>
						</div>
					)}
				</div>
			</td>
		</tr>
	);
}

type TopicSuggestion = {
	title: string;
	keyword: string;
	/** Total monthly search volume across all keywords in the topic cluster */
	monthly_searches: number;
	/** Average keyword difficulty across the topic cluster (0–100) */
	keyword_difficulty: number;
	/** Estimated number of related keywords in this topic cluster */
	keyword_count?: number;
	cpc: number;
	funnel_stage: string;
	authority_fit: string;
	priority_score: number;
	ai_reasoning: string;
	kgr_score?: number | null;
	allintitle_count?: number;
	data_source?: 'serp_researched' | 'estimated';
	discovery_source?:
		| 'seed'
		| 'google_paa'
		| 'google_related'
		| 'competitor_gap'
		| 'ai_brainstorm'
		| 'serp_discovery';
};

type ResearchContext = {
	seeds_used: string[];
	discovery_queries_run: number;
	competitors_analyzed: string[];
	competitor_signals: string[];
	people_also_ask: string[];
	related_searches: string[];
	organic_titles_sampled: string[];
	keywords_from_paa: number;
	keywords_from_related: number;
	keywords_from_organic: number;
	keywords_from_competitors: number;
	keywords_from_ai: number;
	topics_researched: number;
	traffic_tier: string;
	monthly_impressions: number;
	has_gsc_data: boolean;
};

export default function StrategyTargetDetail() {
	const { targetId } = useParams<{ targetId: string }>();
	const location = useLocation();
	const [activeFilter, setActiveFilter] = useState<string>('all');
	const [strategyView, setStrategyView] = useState<'topics' | 'keywords'>('topics');
	const [startingTopicId, setStartingTopicId] = useState<string | null>(null);
	// Cluster article count dialog state
	const [clusterDialogOpen, setClusterDialogOpen] = useState(false);
	const [clusterDialogTopic, setClusterDialogTopic] = useState<Topic | null>(null);
	const [clusterArticleCount, setClusterArticleCount] = useState(6);
	const [addTopicOpen, setAddTopicOpen] = useState(false);
	const [addTopicSubmitting, setAddTopicSubmitting] = useState(false);
	const [editTopicId, setEditTopicId] = useState<string | null>(null);
	const [keywordLookupOpen, setKeywordLookupOpen] = useState(false);
	const [keywordLookupInit, setKeywordLookupInit] = useState('');
	const [addTopicForm, setAddTopicForm] = useState({
		title: '',
		keyword: '',
		funnel: 'mofu' as Topic['funnel'],
		reasoning: ''
	});
	const [topicMetrics, setTopicMetrics] = useState<{
		monthly_searches: number | null;
		keyword_difficulty: number | null;
		cpc: number | null;
	} | null>(null);
	const [lookingUpMetrics, setLookingUpMetrics] = useState(false);
	const [reordering, setReordering] = useState(false);

	// Strategy suggestion state
	const [suggestOpen, setSuggestOpen] = useState(false);
	const [suggesting, setSuggesting] = useState(false);
	const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
	const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
	const [addingSelected, setAddingSelected] = useState(false);
	const [trafficTier, setTrafficTier] = useState<string | null>(null);
	const [strategyRationale, setStrategyRationale] = useState<string>('');
	const [researchContext, setResearchContext] = useState<ResearchContext | null>(null);
	const [researchExpanded, setResearchExpanded] = useState(true);
	const [lastRunId, setLastRunId] = useState<string | null>(null);

	// Site readiness check for strategy generation
	const [siteIncompleteOpen, setSiteIncompleteOpen] = useState(false);
	const [siteIncompleteFields, setSiteIncompleteFields] = useState<string[]>([]);

	// Seed keywords input — opens after pre-flight, before API call
	const [seedModalOpen, setSeedModalOpen] = useState(false);
	const [seedInput, setSeedInput] = useState('');
	const [seedChips, setSeedChips] = useState<string[]>([]);

	// Task progress widget state
	const STRATEGY_STEPS: TaskStep[] = [
		{ id: 'authority', label: 'Checking your site authority', status: 'pending' },
		{ id: 'keywords', label: 'Pulling real keyword data for your topics', status: 'pending' },
		{ id: 'google', label: 'Searching Google for related questions', status: 'pending' },
		{ id: 'competitors', label: 'Scanning what competitors write about', status: 'pending' },
		{ id: 'brainstorm', label: 'Mapping every topic your niche needs to cover', status: 'pending' },
		{ id: 'validate', label: 'Matching keyword data to each topic', status: 'pending' },
		{ id: 'competition', label: 'Checking how hard each topic is to rank for', status: 'pending' },
		{ id: 'metrics', label: 'Calculating search volume and value per topic', status: 'pending' },
		{ id: 'rank', label: 'Ordering topics from easiest wins to long-term goals', status: 'pending' }
	];
	const [taskWidgetOpen, setTaskWidgetOpen] = useState(false);
	const [taskStatus, setTaskStatus] = useState<TaskStatus>('running');
	const [taskSteps, setTaskSteps] = useState<TaskStep[]>(STRATEGY_STEPS);
	const [taskError, setTaskError] = useState<string | undefined>();

	const navigate = useNavigate();
	const { selectedSite } = useSiteContext();
	// Target-scoped topics; site topics for unlock progress
	const {
		topics,
		loading,
		refetch: refetchTopics,
		deleteTopic,
		moveTopic
	} = useTargetTopics(targetId ?? null);
	const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
	const [movingTopicId, setMovingTopicId] = useState<string | null>(null);
	const {
		targets,
		loading: targetsLoading,
		updateTarget,
		deleteTarget,
		refetch: refetchTargets
	} = useTargets(selectedSite?.id ?? null);
	const target = targets.find((t) => t.id === targetId);
	const otherTargets = targets.filter((t) => t.id !== targetId);

	const handleMoveTopic = useCallback(
		async (topicId: string, destinationTargetId: string) => {
			setMovingTopicId(topicId);
			const { error } = await moveTopic(topicId, destinationTargetId);
			setMovingTopicId(null);
			if (error) {
				toast.error(error);
			} else {
				const dest = targets.find((t) => t.id === destinationTargetId);
				toast.success(`Moved to "${dest?.name ?? 'target'}"`);
			}
		},
		[moveTopic, targets]
	);
	const [editTargetOpen, setEditTargetOpen] = useState(false);
	const [moveTopicModalOpen, setMoveTopicModalOpen] = useState(false);
	const [moveTopicModalTopic, setMoveTopicModalTopic] = useState<Topic | null>(null);
	const [ecommercePageMatch, setEcommercePageMatch] = useState<{
		id: string;
		type: 'product' | 'collection';
	} | null>(null);

	const achievableClustersAmount = topics.filter((t) => t.authorityFit === 'achievable').length;
	const buildTowardClustersAmount = topics.filter((t) => t.authorityFit === 'buildToward').length;

	// Gamified unlock thresholds — complete clusters to advance tiers
	const UNLOCK_BUILD_TOWARD = Math.min(2, achievableClustersAmount); // clusters built to unlock "Build Toward" topics
	const UNLOCK_LONG_TERM = Math.min(5, buildTowardClustersAmount); // clusters built to unlock "Long-Term" topics

	// When target has a destination URL, check if it matches an ecommerce page (for Product/Collection badge)
	useEffect(() => {
		if (!selectedSite?.id || !target?.destinationPageUrl?.trim()) {
			setEcommercePageMatch(null);
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				const {
					data: { session }
				} = await supabase.auth.getSession();
				const token = session?.access_token;
				if (!token) return;
				const res = await api.get(`/api/ecommerce?siteId=${encodeURIComponent(selectedSite.id)}`);
				if (!res.ok || cancelled) return;
				const data = (await res.json()) as {
					pages?: Array<{ id: string; type: string; url: string | null }>;
				};
				const pages = data.pages ?? [];
				const url = target.destinationPageUrl?.trim();
				const match = pages.find((p) => p.url && p.url.trim() === url);
				if (!cancelled && match) {
					setEcommercePageMatch({ id: match.id, type: match.type as 'product' | 'collection' });
				} else {
					setEcommercePageMatch(null);
				}
			} catch {
				if (!cancelled) setEcommercePageMatch(null);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [selectedSite?.id, target?.destinationPageUrl]);

	const {
		runs: strategyRuns,
		loading: runsLoading,
		refetch: refetchRuns,
		deleteRun
	} = useStrategyRuns(selectedSite?.id ?? null, targetId ?? null);
	const { organization, refetch: refetchOrg } = useOrganization();
	const creditsRemaining =
		organization?.included_credits_remaining ?? organization?.included_credits ?? 0;
	const hasCreditsForCluster = creditsRemaining >= CREDIT_COSTS.CLUSTER_GENERATION;

	// Gamified unlock — site-wide (topics across all targets)
	const clustersBuilt = topics.filter((t) => !!t.clusterId).length;
	const buildTowardUnlocked = clustersBuilt >= UNLOCK_BUILD_TOWARD;
	const longTermUnlocked = clustersBuilt >= UNLOCK_LONG_TERM;

	const getTopicUnlocked = (authorityFit: string) => {
		if (authorityFit === 'achievable') return true;
		if (authorityFit === 'buildToward') return buildTowardUnlocked;
		return longTermUnlocked;
	};

	const getClustersToUnlock = (authorityFit: string) => {
		if (authorityFit === 'buildToward') return Math.max(0, UNLOCK_BUILD_TOWARD - clustersBuilt);
		return Math.max(0, UNLOCK_LONG_TERM - clustersBuilt);
	};

	const topicCount = topics.length;

	// Handle just-generated navigation from Add Target modal
	React.useEffect(() => {
		const state = location.state as {
			justGenerated?: boolean;
			runId?: string;
			suggestions?: TopicSuggestion[];
		} | null;
		if (state?.justGenerated && state?.suggestions?.length && targetId) {
			setSuggestions(state.suggestions);
			setLastRunId(state.runId ?? null);
			setSelectedSuggestions(new Set(state.suggestions.map((_, i) => i)));
			setSuggestOpen(true);
			window.history.replaceState({}, '', location.pathname);
		}
	}, [targetId, location.state, location.pathname]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	);

	// Opens the article count dialog — sets recommended count based on topic KD and volume
	const openClusterDialog = (topicId: string) => {
		const topic = topics.find((t) => t.id === topicId);
		if (!topic) return;
		const rec = getArticleRecommendation(topic.kd ?? 30, topic.volume ?? 0);
		setClusterArticleCount(rec.count);
		setClusterDialogTopic(topic);
		setClusterDialogOpen(true);
	};

	const CLUSTER_STEPS: TaskStep[] = [
		{ id: 'research', label: 'Running keyword research', status: 'pending' },
		{ id: 'serper', label: 'Scanning Google for related questions', status: 'pending' },
		{ id: 'curate', label: 'AI curating the best article angles', status: 'pending' },
		{ id: 'dedup', label: 'Filtering for relevance and diversity', status: 'pending' },
		{ id: 'build', label: 'Building your content cluster', status: 'pending' }
	];

	const [clusterWidgetOpen, setClusterWidgetOpen] = useState(false);
	const [clusterWidgetStatus, setClusterWidgetStatus] = useState<TaskStatus>('running');
	const [clusterWidgetSteps, setClusterWidgetSteps] = useState<TaskStep[]>(CLUSTER_STEPS);
	const [clusterWidgetError, setClusterWidgetError] = useState<string | undefined>();

	const handleStartCluster = async (topicId: string, maxArticles: number) => {
		setClusterDialogOpen(false);
		setStartingTopicId(topicId);
		// Open widget — first step active, others pending
		setClusterWidgetSteps(
			CLUSTER_STEPS.map((s, i) => ({
				...s,
				status: (i === 0 ? 'active' : 'pending') as 'active' | 'pending'
			}))
		);
		setClusterWidgetStatus('running');
		setClusterWidgetError(undefined);
		setClusterWidgetOpen(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in to continue');
				setClusterWidgetStatus('error');
				setClusterWidgetError('Not signed in.');
				return;
			}
			const res = await api.post('/api/clusters', { topicId, maxArticles });

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				if (res.status === 402) {
					const msg = `Insufficient credits. Need ${data.required ?? CREDIT_COSTS.CLUSTER_GENERATION}, have ${data.available ?? 0}.`;
					toast.error(msg);
					setClusterWidgetStatus('error');
					setClusterWidgetError(msg);
					return;
				}
				throw new Error(data?.error || 'Failed to create cluster');
			}

			// createCluster returns plain JSON { clusterId }
			const data = await res.json().catch(() => ({}));
			const clusterId: string | null = data?.clusterId ?? null;

			// Mark all steps complete now that the response is back
			setClusterWidgetSteps((prev) => prev.map((s) => ({ ...s, status: 'complete' as const })));
			setClusterWidgetStatus('done');
			if (!clusterId) {
				toast.error('Cluster created but missing ID');
				return;
			}
			await refetchTopics();
			refetchOrg();
			// Brief pause so user sees the "done" state before redirect
			setTimeout(() => navigate(`/clusters/${clusterId}`), 800);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to create cluster';
			toast.error(msg);
			setClusterWidgetStatus('error');
			setClusterWidgetError(msg);
		} finally {
			setStartingTopicId(null);
		}
	};

	const handleRestoreRun = useCallback((run: (typeof strategyRuns)[0]) => {
		const incoming = run.suggestions as TopicSuggestion[];
		setSuggestions(incoming);
		setTrafficTier(run.trafficTier ?? null);
		setStrategyRationale(run.strategyRationale ?? '');
		setResearchContext(run.researchContext as ResearchContext | null);
		setSelectedSuggestions(new Set(incoming.map((_, i) => i)));
		setSuggestOpen(true);
	}, []);

	const handleDeleteTopic = useCallback(
		async (topicId: string) => {
			const topic = topics.find((t) => t.id === topicId);
			if (topic?.clusterId) {
				toast.error('This topic has an active cluster. Delete the cluster first.');
				return;
			}
			setDeletingTopicId(topicId);
			const { error } = await deleteTopic(topicId);
			setDeletingTopicId(null);
			if (error) {
				console.error(error);
				toast.error('Failed to remove topic');
			} else {
				toast.success('Topic removed');
			}
		},
		[topics, deleteTopic]
	);

	const resetTopicForm = useCallback(() => {
		setAddTopicForm({ title: '', keyword: '', funnel: 'mofu', reasoning: '' });
		setTopicMetrics(null);
		setEditTopicId(null);
	}, []);

	const openAddTopic = useCallback(() => {
		resetTopicForm();
		setAddTopicOpen(true);
	}, [resetTopicForm]);

	const openEditTopic = useCallback((topic: Topic) => {
		setEditTopicId(topic.id);
		setAddTopicForm({
			title: topic.title,
			keyword: topic.keyword ?? topic.title,
			funnel: topic.funnel,
			reasoning: topic.reasoning ?? ''
		});
		setTopicMetrics(
			topic.volume || topic.kd || topic.cpc
				? {
						monthly_searches: topic.volume || null,
						keyword_difficulty: topic.kd || null,
						cpc: topic.cpc || null
					}
				: null
		);
		setAddTopicOpen(true);
	}, []);

	const lookupKeywordMetrics = useCallback(async (kw: string) => {
		const keyword = kw.trim();
		if (!keyword) return;
		setLookingUpMetrics(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in to continue');
				return;
			}
			const res = await api.post(
				'/api/strategy/keyword-metrics',
				{ keyword },
				{ credentials: 'include' }
			);
			if (res.ok) {
				const data = await res.json();
				if (
					data.monthly_searches !== null ||
					data.keyword_difficulty !== null ||
					data.cpc !== null
				) {
					setTopicMetrics(data);
				} else {
					setTopicMetrics(null);
				}
			}
		} catch {
			// silent — metrics are optional enrichment
		} finally {
			setLookingUpMetrics(false);
		}
	}, []);

	const handleAddTopic = useCallback(async () => {
		if (!selectedSite?.id) {
			toast.error('Select a site first');
			return;
		}
		const title = addTopicForm.title.trim();
		const keyword = addTopicForm.keyword.trim() || title;
		if (!title) {
			toast.error('Enter a topic title');
			return;
		}

		// S2-3: Cannibalization check before adding new topic
		if (!editTopicId && keyword) {
			try {
				const {
					data: { session }
				} = await supabase.auth.getSession();
				const token = session?.access_token;
				if (token) {
					const res = await api.get(
						`/api/sites/${selectedSite.id}/check-cannibalization?keyword=${encodeURIComponent(keyword)}`
					);
					if (res.ok) {
						const data = (await res.json()) as {
							hasConflict?: boolean;
							conflict?: { keyword: string; pages: Array<{ title: string }> };
						};
						if (data.hasConflict && data.conflict) {
							const pageList = data.conflict.pages.map((p) => p.title).join(', ');
							const proceed = window.confirm(
								`Keyword cannibalization: "${data.conflict.keyword}" is already targeted by ${pageList}. Adding this topic will split ranking signals. Consolidate or differentiate keywords instead. Proceed anyway?`
							);
							if (!proceed) return;
						}
					}
				}
			} catch {
				// silent — proceed if check fails
			}
		}

		// S2-5: Topical dilution check — <20% entity overlap with existing = amber warning (product-gaps V1.2d)
		if (!editTopicId && keyword) {
			const { detectTopicalDilution } = await import('../lib/topicalDilution');
			const existingKeywords = topics
				.filter((t) => t.id !== editTopicId)
				.map((t) => (t.keyword || t.title || '').trim())
				.filter(Boolean);
			const dilution = detectTopicalDilution(keyword, existingKeywords);
			if (dilution) {
				const proceed = window.confirm(`${dilution.message}\n\n${dilution.action}`);
				if (!proceed) return;
			}
		}

		setAddTopicSubmitting(true);
		try {
			if (editTopicId) {
				// Update existing topic
				const { error } = await supabase
					.from('topics')
					.update({
						title,
						keyword,
						funnel_stage: addTopicForm.funnel,
						ai_reasoning: addTopicForm.reasoning.trim() || null,
						...(topicMetrics
							? {
									monthly_searches: topicMetrics.monthly_searches ?? 0,
									keyword_difficulty: topicMetrics.keyword_difficulty ?? 0,
									cpc: topicMetrics.cpc ?? 0
								}
							: {})
					})
					.eq('id', editTopicId)
					.eq('site_id', selectedSite.id);
				if (error) throw error;

				// Sync keyword + title down to the cluster and its focus page
				const editedTopic = topics.find((t) => t.id === editTopicId);
				if (editedTopic?.clusterId) {
					const clusterId = editedTopic.clusterId;

					const [{ error: clusterErr }, { error: pageErr }] = await Promise.all([
						supabase
							.from('clusters')
							.update({ title, target_keyword: keyword })
							.eq('id', clusterId)
							.eq('site_id', selectedSite.id),
						supabase
							.from('pages')
							.update({ keyword })
							.eq('cluster_id', clusterId)
							.eq('type', 'focus_page')
							.eq('site_id', selectedSite.id)
					]);

					if (clusterErr) console.warn('[Strategy] cluster sync failed:', clusterErr.message);
					if (pageErr) console.warn('[Strategy] focus page sync failed:', pageErr.message);
				}

				toast.success('Topic updated');
			} else {
				// Insert new topic (target-scoped)
				if (!targetId) {
					toast.error('No target selected');
					return;
				}
				const nextOrder = topicCount + 1;
				const { error } = await supabase.from('topics').insert({
					site_id: selectedSite.id,
					target_id: targetId,
					title,
					keyword,
					monthly_searches: topicMetrics?.monthly_searches ?? 0,
					keyword_difficulty: topicMetrics?.keyword_difficulty ?? 0,
					cpc: topicMetrics?.cpc ?? 0,
					funnel_stage: addTopicForm.funnel,
					authority_fit: 'achievable',
					status: 'queued',
					sort_order: nextOrder,
					ai_reasoning: addTopicForm.reasoning.trim() || null
				});
				if (error) throw error;
				toast.success('Topic added');
			}
			setAddTopicOpen(false);
			resetTopicForm();
			await refetchTopics();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save topic');
		} finally {
			setAddTopicSubmitting(false);
		}
	}, [
		selectedSite?.id,
		targetId,
		addTopicForm,
		topicCount,
		refetchTopics,
		editTopicId,
		topicMetrics,
		resetTopicForm,
		topics
	]);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;
			if (!over || active.id === over.id) return;
			const oldIndex = topics.findIndex((t) => t.id === active.id);
			const newIndex = topics.findIndex((t) => t.id === over.id);
			if (oldIndex === -1 || newIndex === -1) return;
			const reordered = [...topics];
			const [removed] = reordered.splice(oldIndex, 1);
			reordered.splice(newIndex, 0, removed);
			setReordering(true);
			try {
				await Promise.all(
					reordered.map((t, i) =>
						supabase
							.from('topics')
							.update({ sort_order: i + 1, updated_at: new Date().toISOString() })
							.eq('id', t.id)
					)
				);
				await refetchTopics();
				toast.success('Order saved');
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Failed to save order');
			} finally {
				setReordering(false);
			}
		},
		[topics, refetchTopics]
	);

	// Step 1: pre-flight check → open seed keywords modal
	const handleGenerateStrategy = useCallback(() => {
		if (!selectedSite?.id) {
			toast.error('Select a site first');
			return;
		}

		// Only niche is hard-required — everything else we can work around.
		// Competitor URLs are optional (we find competitors from SERP).
		// Customer description is optional (helps quality but not blocking).
		// DA is auto-fetched from Moz — users don't know this number.
		const missing: string[] = [];
		if (!selectedSite.niche?.trim()) missing.push('Niche / what you offer');

		if (missing.length > 0) {
			setSiteIncompleteFields(missing);
			setSiteIncompleteOpen(true);
			return;
		}

		// Pre-populate seeds from target or niche
		if (seedChips.length === 0) {
			if (target?.seedKeywords?.length) {
				setSeedChips([...target.seedKeywords]);
			} else if (selectedSite.niche) {
				setSeedChips([selectedSite.niche]);
			}
		}
		setSeedModalOpen(true);
	}, [selectedSite, target, seedChips]);

	// Step 2: fire API with seed keywords
	const handleRunResearch = useCallback(async () => {
		const seeds = [...seedChips];
		if (seedInput.trim())
			seeds.push(
				...seedInput
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean)
			);

		if (seeds.length === 0) {
			toast.error('Add at least one seed keyword');
			return;
		}

		setSeedModalOpen(false);

		// Reset and open the progress widget
		setTaskSteps(
			STRATEGY_STEPS.map((s, i) => ({
				...s,
				status: (i === 0 ? 'active' : 'pending') as 'active' | 'pending'
			}))
		);
		setTaskStatus('running');
		setTaskError(undefined);
		setTaskWidgetOpen(true);
		setSuggesting(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in to continue');
				setTaskStatus('error');
				setTaskError('Authentication required. Please sign in.');
				return;
			}
			const res = await api.post('/api/strategy/suggest', {
				siteId: selectedSite!.id,
				seedKeywords: seeds,
				...(targetId && { targetId })
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				if (res.status === 402) {
					const msg = `Insufficient credits. Need ${data.required ?? CREDIT_COSTS.STRATEGY_GENERATION}, have ${data.available ?? 0}.`;
					toast.error(msg);
					setTaskStatus('error');
					setTaskError(msg);
					return;
				}
				throw new Error(data?.error || 'Failed to generate suggestions');
			}

			// Consume NDJSON stream
			const reader = res.body?.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			let result: {
				suggestions?: TopicSuggestion[];
				strategyRationale?: string;
				researchContext?: unknown;
				trafficTier?: string | null;
				runId?: string | null;
			} = {};

			const processNdjsonLine = (line: string) => {
				if (!line.trim()) return;
				try {
					const ev = JSON.parse(line) as {
						type: string;
						id?: string;
						message?: string;
						suggestions?: TopicSuggestion[];
						strategyRationale?: string;
						researchContext?: unknown;
						trafficTier?: string | null;
						runId?: string | null;
					};
					if (ev.type === 'step' && ev.id) {
						setTaskSteps((prev) => {
							const stepIdx = STRATEGY_STEPS.findIndex((st) => st.id === ev.id);
							if (stepIdx === -1) return prev;
							return prev.map((s, i) => {
								if (i <= stepIdx) return { ...s, status: 'complete' as const };
								if (i === stepIdx + 1) return { ...s, status: 'active' as const };
								return s;
							});
						});
					} else if (ev.type === 'done') {
						result = {
							suggestions: ev.suggestions,
							strategyRationale: ev.strategyRationale,
							researchContext: ev.researchContext,
							trafficTier: ev.trafficTier,
							runId: ev.runId
						};
					} else if (ev.type === 'error') {
						throw new Error(ev.message ?? 'Failed to generate suggestions');
					}
				} catch (parseErr) {
					if (!(parseErr instanceof SyntaxError)) throw parseErr;
				}
			};

			if (reader) {
				while (true) {
					const { done, value } = await reader.read();
					if (value) {
						buffer += decoder.decode(value, { stream: true });
					}
					const lines = buffer.split('\n');
					buffer = lines.pop() ?? '';
					for (const line of lines) {
						processNdjsonLine(line);
					}
					if (done) {
						// Last chunk may not end with \n — flush remainder as a final line.
						if (buffer.trim()) {
							processNdjsonLine(buffer);
							buffer = '';
						}
						break;
					}
				}
			}

			setTaskStatus('done');
			const incoming: TopicSuggestion[] = result.suggestions ?? [];
			setSuggestions(incoming);
			setTrafficTier(result.trafficTier ?? null);
			setStrategyRationale(result.strategyRationale ?? '');
			setResearchContext((result.researchContext ?? null) as ResearchContext | null);
			setResearchExpanded(true);
			setLastRunId(result.runId ?? null);
			// All topics pre-selected — the order IS the strategy, not the selection.
			// Users deselect what they don't want; nothing is hidden by default.
			const preSelected = new Set(incoming.map((_, i) => i));
			setSelectedSuggestions(preSelected);
			// Small delay so the user sees the "done" state before the picker opens
			setTimeout(() => setSuggestOpen(true), 900);
			refetchOrg();
			refetchRuns();
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to generate strategy';
			toast.error(msg);
			setTaskStatus('error');
			setTaskError(msg);
		} finally {
			setSuggesting(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedSite, seedChips, seedInput, targetId, refetchOrg]);

	const handleAddSelected = useCallback(async () => {
		if (!selectedSite?.id || !targetId || selectedSuggestions.size === 0) return;

		// S2-5: Topical dilution check for bulk add from suggestions
		const chosen = suggestions.filter((_, i) => selectedSuggestions.has(i));
		const existingKeywords = topics.map((t) => (t.keyword || t.title || '').trim()).filter(Boolean);
		if (existingKeywords.length >= 5 && chosen.length > 0) {
			const { detectTopicalDilution } = await import('../lib/topicalDilution');
			const atRisk = chosen.filter((s) => {
				const kw = (s.keyword || s.title || '').trim();
				return kw && detectTopicalDilution(kw, existingKeywords);
			});
			if (atRisk.length > 0) {
				const proceed = window.confirm(
					`${atRisk.length} of your selected topic${atRisk.length !== 1 ? 's are' : ' is'} outside what your site usually covers. Adding unrelated content can make Google less confident in your expertise.\n\nAdd anyway?`
				);
				if (!proceed) return;
			}
		}

		setAddingSelected(true);
		try {
			const { data: session } = await supabase.auth.getSession();
			const token = session?.session?.access_token;
			if (!token) throw new Error('Please sign in to continue');

			const indices = [...selectedSuggestions].sort((a, b) => a - b);

			if (lastRunId) {
				// Use accept-from-run when we have the run (cleaner, links to run)
				const res = await api.post(`/api/targets/${targetId}/topics/accept-from-run`, {
					runId: lastRunId,
					suggestionIndices: indices
				});
				if (!res.ok) {
					const err = (await res.json().catch(() => ({}))) as { error?: string };
					throw new Error(err?.error ?? 'Failed to add topics');
				}
			} else {
				// Fallback: direct insert with target_id (e.g. after refresh)
				const chosen = suggestions.filter((_, i) => selectedSuggestions.has(i));
				const nextOrder = topicCount + 1;
				const rows = chosen.map((s, i) => ({
					site_id: selectedSite.id,
					target_id: targetId!,
					title: s.title,
					keyword: s.keyword,
					monthly_searches: s.monthly_searches ?? 0,
					keyword_difficulty: s.keyword_difficulty ?? 0,
					cpc: s.cpc ?? 0,
					funnel_stage: s.funnel_stage ?? 'mofu',
					authority_fit: s.authority_fit ?? 'achievable',
					status: 'queued',
					sort_order: nextOrder + i,
					ai_reasoning: s.ai_reasoning ?? null
				}));
				const { error } = await supabase.from('topics').insert(rows);
				if (error) throw error;
			}

			const count = indices.length;
			toast.success(`Added ${count} topic${count !== 1 ? 's' : ''} to your strategy`);
			setSuggestOpen(false);
			setSuggestions([]);
			setSelectedSuggestions(new Set());
			setLastRunId(null);
			await refetchTopics();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to add topics');
		} finally {
			setAddingSelected(false);
		}
	}, [
		selectedSite?.id,
		targetId,
		suggestions,
		selectedSuggestions,
		topics,
		topicCount,
		refetchTopics,
		lastRunId
	]);

	const filteredTopics =
		activeFilter === 'all'
			? topics
			: topics.filter((t) => {
					if (activeFilter === 'achievablenow') return t.authorityFit === 'achievable';
					if (activeFilter === 'buildtoward') return t.authorityFit === 'buildToward';
					if (activeFilter === 'bofu') return t.funnel === 'bofu';
					if (activeFilter === 'mofu') return t.funnel === 'mofu';
					if (activeFilter === 'tofu') return t.funnel === 'tofu';
					if (activeFilter === 'quickwins')
						return (
							t.authorityFit === 'achievable' &&
							(t.funnel === 'mofu' || t.funnel === 'bofu') &&
							(t.kgrScore == null || t.kgrScore < 0.25)
						);
					return true;
				});

	// Cap "clusters to unlock" by how many locked topics exist in that tier (max 3 or whatever is left)
	const buildTowardLockedCount = filteredTopics.filter(
		(t) => t.authorityFit === 'buildToward'
	).length;
	const longTermLockedCount = filteredTopics.filter((t) => t.authorityFit === 'locked').length;
	const buildTowardClustersDisplay = Math.min(
		Math.max(0, UNLOCK_BUILD_TOWARD - clustersBuilt),
		Math.max(1, buildTowardLockedCount)
	);
	const longTermClustersDisplay = Math.min(
		Math.max(0, UNLOCK_LONG_TERM - clustersBuilt),
		Math.max(1, longTermLockedCount)
	);
	const getClustersToUnlockDisplay = (authorityFit: string) => {
		if (authorityFit === 'buildToward') return buildTowardClustersDisplay;
		if (authorityFit === 'locked') return longTermClustersDisplay;
		return 0;
	};

	if (!targetId) {
		return (
			<div className="p-8 text-center text-gray-500">
				<Link to="/strategy" className="text-brand-500 hover:underline">
					← Back to Strategy
				</Link>
			</div>
		);
	}
	if (targetsLoading && !target) {
		return (
			<div className="flex items-center justify-center p-12">
				<div className="text-gray-500 dark:text-gray-400">Loading target…</div>
			</div>
		);
	}
	if (!target) {
		return (
			<div className="p-8 text-center text-gray-500">
				<p>Target not found.</p>
				<Link to="/strategy" className="text-brand-500 mt-2 inline-block hover:underline">
					← Back to Strategy
				</Link>
			</div>
		);
	}

	return (
		<>
			<PageMeta title={target?.name ?? 'Topic Plan'} description="Your topic plan" noIndex />

			<div className="space-y-6">
				{/* Breadcrumb + target header */}
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<Link
							to="/strategy"
							className="text-[13px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						>
							← Strategy
						</Link>
						<h1 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
							{target?.name ?? '…'}
						</h1>
						{target?.destinationPageLabel && (
							<span className="mt-1 inline-flex items-center gap-1.5">
								<a
									href={target.destinationPageUrl ?? '#'}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
								>
									→ {target.destinationPageLabel}
								</a>
								{ecommercePageMatch && (
									<Link
										to={`/ecommerce/${ecommercePageMatch.id}`}
										className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
									>
										{ecommercePageMatch.type === 'product' ? 'Product' : 'Collection'}
										<Check className="size-3" />
									</Link>
								)}
							</span>
						)}
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button variant="outline" size="sm" onClick={() => setEditTargetOpen(true)}>
							<Pencil className="mr-1.5 size-3.5" />
							Edit Target
						</Button>
						<Button
							className="bg-brand-500 hover:bg-brand-600"
							disabled={
								suggesting ||
								!selectedSite?.id ||
								!targetId ||
								creditsRemaining < CREDIT_COSTS.STRATEGY_GENERATION
							}
							onClick={handleGenerateStrategy}
						>
							{suggesting ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<CreditBadge
									cost={CREDIT_COSTS.STRATEGY_GENERATION}
									action="Strategy"
									sufficient={creditsRemaining >= CREDIT_COSTS.STRATEGY_GENERATION}
								/>
							)}
							<span className="ml-2">
								{suggesting
									? 'Generating…'
									: topicCount === 0
										? '✨ Generate Topic Plan'
										: '✨ Regenerate'}
							</span>
						</Button>
						<Button
							variant="outline"
							className="border-gray-200 dark:border-gray-700"
							onClick={openAddTopic}
							disabled={!selectedSite?.id || !targetId}
						>
							+ Add Topic
						</Button>
					</div>
				</div>

				<PageHeader
					title=""
					subtitle={
						topicCount === 0
							? 'Add topics or generate an AI-recommended plan.'
							: `${topicCount} topic${topicCount !== 1 ? 's' : ''} — drag to re-prioritize.`
					}
				/>

				{selectedSite &&
					(() => {
						// Use rationale from current session, or from a past run only when we have topics.
						// Don't show past-run rationale when target has no topics — it would say "you've got great topics" misleadingly.
						const liveRationale =
							strategyRationale ||
							(topics.length > 0 ? strategyRuns[0]?.strategyRationale : null) ||
							null;
						if (!liveRationale) return null;
						return (
							<AIInsightBlock variant="analyst" label="AI STRATEGIST" message={liveRationale} />
						);
					})()}

				{/* Gamified unlock progress banner */}
				{topics.length > 0 && !longTermUnlocked && (
					<div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
						<div className="bg-brand-50 dark:bg-brand-950/30 flex size-8 shrink-0 items-center justify-center rounded-full">
							<TrendingUp className="text-brand-500 size-4" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="text-[13px] font-semibold text-gray-900 dark:text-white">
								{!buildTowardUnlocked
									? `Build ${UNLOCK_BUILD_TOWARD - clustersBuilt} more cluster${UNLOCK_BUILD_TOWARD - clustersBuilt !== 1 ? 's' : ''} to unlock "Build Toward" topics`
									: `Build ${UNLOCK_LONG_TERM - clustersBuilt} more cluster${UNLOCK_LONG_TERM - clustersBuilt !== 1 ? 's' : ''} to unlock "Long-Term" topics`}
							</div>
							<div className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">
								{!buildTowardUnlocked
									? 'Complete your first clusters to build site authority and unlock the next tier'
									: 'Keep building clusters to reach your long-term growth topics'}
							</div>
						</div>
						<div className="flex shrink-0 items-center gap-1.5">
							{Array.from({
								length: !buildTowardUnlocked ? UNLOCK_BUILD_TOWARD : UNLOCK_LONG_TERM
							}).map((_, i) => (
								<span
									key={i}
									className={`inline-block size-2.5 rounded-full transition-colors ${
										i < clustersBuilt ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
									}`}
								/>
							))}
							<span className="ml-1 text-[12px] font-semibold text-gray-600 dark:text-gray-300">
								{clustersBuilt} / {!buildTowardUnlocked ? UNLOCK_BUILD_TOWARD : UNLOCK_LONG_TERM}
							</span>
						</div>
					</div>
				)}

				{/* View toggle: Topics | Keywords (V1 — SITEMAP / Roadmap) */}
				{topics.length > 0 && (
					<div className="mt-5 flex flex-wrap items-center gap-4">
						<div className="flex flex-wrap items-center gap-2">
							<div className="flex rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-800">
								<button
									type="button"
									onClick={() => setStrategyView('topics')}
									className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${
										strategyView === 'topics'
											? 'bg-brand-500 dark:bg-brand-600 text-white'
											: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
									}`}
								>
									Topics view
								</button>
								<button
									type="button"
									onClick={() => setStrategyView('keywords')}
									className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${
										strategyView === 'keywords'
											? 'bg-brand-500 dark:bg-brand-600 text-white'
											: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
									}`}
								>
									Keywords view
								</button>
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="gap-2 border-gray-200 dark:border-gray-700"
										disabled={loading || filteredTopics.length === 0}
									>
										<Download className="size-4" />
										Export
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem
										onSelect={() => {
											if (filteredTopics.length === 0) return;
											downloadStrategyCsv({
												topics: filteredTopics,
												siteName: selectedSite?.name ?? 'Site',
												targetName: target?.name ?? 'Target',
												filterLabel: strategyFilterLabel(activeFilter)
											});
											toast.success('CSV downloaded');
										}}
									>
										Download CSV
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={() => {
											if (filteredTopics.length === 0) return;
											downloadStrategyXlsx({
												topics: filteredTopics,
												siteName: selectedSite?.name ?? 'Site',
												targetName: target?.name ?? 'Target',
												filterLabel: strategyFilterLabel(activeFilter)
											});
											toast.success('Excel workbook downloaded');
										}}
									>
										Download Excel (.xlsx)
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
						<div className="flex flex-wrap gap-2">
							{FILTERS.map((f) => {
								const isActive =
									activeFilter === f.toLowerCase().replace(' ', '') ||
									(activeFilter === 'all' && f === 'All');
								return (
									<button
										key={f}
										onClick={() =>
											setActiveFilter(f === 'All' ? 'all' : f.toLowerCase().replace(' ', ''))
										}
										className={`rounded-full px-3 py-1.5 text-[13px] ${
											isActive
												? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300 border font-semibold'
												: 'border border-gray-200 bg-white text-gray-600 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white'
										}`}
									>
										{f}
									</button>
								);
							})}
						</div>
					</div>
				)}

				{/* Topic table or Keywords table */}
				<div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
					{loading ? (
						<div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading topics…</div>
					) : topics.length === 0 ? (
						<div className="p-8 text-center">
							<p className="text-gray-600 dark:text-gray-400">No topics yet.</p>
							<p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
								Add a topic manually or complete onboarding to get an AI-generated strategy.
							</p>
							<Button
								className="bg-brand-500 hover:bg-brand-600 mt-4 text-white"
								onClick={openAddTopic}
								disabled={!selectedSite?.id}
							>
								+ Add Topic
							</Button>
						</div>
					) : strategyView === 'keywords' ? (
						<>
							<table className="w-full">
								<thead>
									<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
										<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
											Keyword
										</th>
										<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
											Topic
										</th>
										<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
											Page Type
										</th>
										<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
											Searches/mo (US)
										</th>
										<th
											className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400"
											title="How hard it is to rank for this"
										>
											Competition
										</th>
										<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
											Intent
										</th>
										<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
											Authority Fit
										</th>
										<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
											Action
										</th>
									</tr>
								</thead>
								<tbody>
									{filteredTopics.map((topic, idx) => {
										const prevTopic = filteredTopics[idx - 1];
										const isUnlocked = getTopicUnlocked(topic.authorityFit);
										const clustersToUnlock = getClustersToUnlock(topic.authorityFit);
										const showBuildTowardDivider =
											!buildTowardUnlocked &&
											topic.authorityFit === 'buildToward' &&
											prevTopic?.authorityFit === 'achievable';
										const showLongTermDivider =
											!longTermUnlocked &&
											topic.authorityFit === 'locked' &&
											prevTopic?.authorityFit !== 'locked';
										return (
											<React.Fragment key={topic.id}>
												{showBuildTowardDivider && (
													<tr>
														<td colSpan={8} className="px-4 pt-4 pb-2">
															<div className="flex items-center gap-3">
																<div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
																<div className="border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-700/40 dark:bg-warning-900/20 dark:text-warning-400 flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold">
																	<Lock className="size-3 shrink-0" />
																	Build {UNLOCK_BUILD_TOWARD - clustersBuilt} more cluster
																	{UNLOCK_BUILD_TOWARD - clustersBuilt !== 1 ? 's' : ''} to unlock
																	<span className="flex items-center gap-0.5">
																		{Array.from({ length: UNLOCK_BUILD_TOWARD }).map((_, i) => (
																			<span
																				key={i}
																				className={`inline-block size-1.5 rounded-full ${i < clustersBuilt ? 'bg-warning-500' : 'bg-warning-200 dark:bg-warning-800'}`}
																			/>
																		))}
																	</span>
																</div>
																<div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
															</div>
														</td>
													</tr>
												)}
												{showLongTermDivider && (
													<tr key={`divider-lt-${idx}`}>
														<td colSpan={8} className="px-4 pt-4 pb-2">
															<div className="flex items-center gap-3">
																<div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
																<div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
																	<Lock className="size-3 shrink-0" />
																	Build {UNLOCK_LONG_TERM - clustersBuilt} more cluster
																	{UNLOCK_LONG_TERM - clustersBuilt !== 1 ? 's' : ''} to unlock
																	<span className="flex items-center gap-0.5">
																		{Array.from({ length: UNLOCK_LONG_TERM }).map((_, i) => (
																			<span
																				key={i}
																				className={`inline-block size-1.5 rounded-full ${i < clustersBuilt ? 'bg-gray-500' : 'bg-gray-200 dark:bg-gray-700'}`}
																			/>
																		))}
																	</span>
																</div>
																<div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
															</div>
														</td>
													</tr>
												)}
												<tr
													className={`border-b border-gray-200 last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 ${!isUnlocked ? 'opacity-60' : ''}`}
												>
													<td className="px-4 py-3 font-mono text-[13px] text-gray-900 dark:text-white">
														{topic.keyword}
													</td>
													<td className="px-4 py-3 text-[13px] text-gray-700 dark:text-gray-300">
														{topic.title}
													</td>
													<td className="px-4 py-3">
														{(() => {
															const pt = inferClusterContentPageType(topic.keyword, topic.title);
															return (
																<span
																	className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${pageTypeColor(pt)}`}
																>
																	{pt}
																</span>
															);
														})()}
													</td>
													<td className="px-4 py-3 text-sm">{topic.volume.toLocaleString()}</td>
													<td className="px-4 py-3 text-sm">{topic.kd}</td>
													<td className="px-4 py-3">
														<FunnelTag stage={topic.funnel} showTooltip />
													</td>
													<td className="px-4 py-3 text-[13px]">
														{topic.authorityFit === 'achievable' ? (
															<span className="text-brand-600 dark:text-brand-400 flex items-center gap-1 font-semibold">
																<CheckCircle2 className="size-3.5 shrink-0" /> Start Now
															</span>
														) : topic.authorityFit === 'buildToward' ? (
															<span className="text-warning-600 flex items-center gap-1 font-semibold">
																<Clock className="size-3.5 shrink-0" /> Build Toward
															</span>
														) : (
															<span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
																<TrendingUp className="size-3.5 shrink-0" /> Long-Term
															</span>
														)}
													</td>
													<td className="px-4 py-3">
														{topic.status === 'active' ? (
															<Link to="/clusters">
																<Button variant="outline" size="sm">
																	View Cluster
																</Button>
															</Link>
														) : !isUnlocked ? (
															<div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[12px] text-gray-400 dark:border-gray-700 dark:bg-gray-800">
																<Lock className="size-3 shrink-0" />
																{clustersToUnlock === 1
																	? '1 more cluster'
																	: `${clustersToUnlock} clusters`}{' '}
																to unlock
															</div>
														) : (
															<Button
																size="sm"
																className="bg-brand-500 hover:bg-brand-600 text-white"
																disabled={!hasCreditsForCluster}
																onClick={() => openClusterDialog(topic.id)}
															>
																Start Cluster
															</Button>
														)}
													</td>
												</tr>
											</React.Fragment>
										);
									})}
								</tbody>
							</table>
							{/* Research a keyword — opens lookup modal */}
							<div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
								<button
									onClick={() => setKeywordLookupOpen(true)}
									className="hover:text-brand-500 dark:hover:text-brand-400 flex items-center gap-2 text-sm text-gray-400 transition-colors dark:text-gray-500"
								>
									<span className="flex size-6 items-center justify-center rounded-full border border-dashed border-gray-300 dark:border-gray-600">
										+
									</span>
									Research a keyword — <CreditCost amount={CREDIT_COSTS.KEYWORD_LOOKUP} />
								</button>
							</div>
						</>
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={filteredTopics.map((t) => t.id)}
								strategy={verticalListSortingStrategy}
							>
								<table className="w-full">
									<thead>
										<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
											<th className="w-8 px-4 py-3" />
											<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												#
											</th>
											<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												Topic
											</th>
											<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												Funnel
											</th>
											<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												Searches/mo (US)
											</th>
											<th
												className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400"
												title="How hard it is to rank for this topic (0% = easy, 100% = very competitive)"
											>
												Difficulty
											</th>
											<th
												className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400"
												title="Average ad cost per click in the US — higher means more commercial value"
											>
												Ad Value (US)
											</th>
											<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												Ready to Tackle
											</th>
											<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												Action
											</th>
										</tr>
									</thead>
									<tbody>
										{filteredTopics.map((topic, idx) => {
											const prevTopic = filteredTopics[idx - 1];
											const isUnlocked = getTopicUnlocked(topic.authorityFit);
											const clustersToUnlock = getClustersToUnlock(topic.authorityFit);

											// Show a tier divider when crossing from achievable→buildToward or buildToward→longTerm
											const showBuildTowardDivider =
												!buildTowardUnlocked &&
												topic.authorityFit === 'buildToward' &&
												prevTopic?.authorityFit === 'achievable';
											const showLongTermDivider =
												!longTermUnlocked &&
												topic.authorityFit === 'locked' &&
												prevTopic?.authorityFit !== 'locked';

											return (
												<React.Fragment key={topic.id}>
													{showBuildTowardDivider && (
														<tr>
															<td colSpan={9} className="px-4 pt-5 pb-2">
																<div className="flex items-center gap-3">
																	<div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
																	<div className="border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-700/40 dark:bg-warning-900/20 dark:text-warning-400 flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold">
																		<Lock className="size-3 shrink-0" />
																		Build {UNLOCK_BUILD_TOWARD - clustersBuilt} more cluster
																		{UNLOCK_BUILD_TOWARD - clustersBuilt !== 1 ? 's' : ''} to unlock
																		these topics
																		<span className="text-warning-500 dark:text-warning-500 flex items-center gap-0.5">
																			{Array.from({ length: UNLOCK_BUILD_TOWARD }).map((_, i) => (
																				<span
																					key={i}
																					className={`inline-block size-1.5 rounded-full ${i < clustersBuilt ? 'bg-warning-500' : 'bg-warning-200 dark:bg-warning-800'}`}
																				/>
																			))}
																		</span>
																	</div>
																	<div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
																</div>
															</td>
														</tr>
													)}
													{showLongTermDivider && (
														<tr key={`divider-lt-${idx}`}>
															<td colSpan={9} className="px-4 pt-5 pb-2">
																<div className="flex items-center gap-3">
																	<div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
																	<div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
																		<Lock className="size-3 shrink-0" />
																		Build {UNLOCK_LONG_TERM - clustersBuilt} more cluster
																		{UNLOCK_LONG_TERM - clustersBuilt !== 1 ? 's' : ''} to unlock
																		these topics
																		<span className="flex items-center gap-0.5 text-gray-400 dark:text-gray-500">
																			{Array.from({ length: UNLOCK_LONG_TERM }).map((_, i) => (
																				<span
																					key={i}
																					className={`inline-block size-1.5 rounded-full ${i < clustersBuilt ? 'bg-gray-500' : 'bg-gray-200 dark:bg-gray-700'}`}
																				/>
																			))}
																		</span>
																	</div>
																	<div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
																</div>
															</td>
														</tr>
													)}
													<SortableTopicRow
														key={topic.id}
														topic={topic}
														startingTopicId={startingTopicId}
														hasCreditsForCluster={hasCreditsForCluster}
														onStartCluster={openClusterDialog}
														onDeleteTopic={handleDeleteTopic}
														onEditTopic={openEditTopic}
														onOpenMoveModal={(t) => {
															setMoveTopicModalTopic(t);
															setMoveTopicModalOpen(true);
														}}
														otherTargets={otherTargets}
														movingTopicId={movingTopicId}
														deletingTopicId={deletingTopicId}
														isUnlocked={isUnlocked}
														clustersToUnlock={clustersToUnlock}
													/>
												</React.Fragment>
											);
										})}
									</tbody>
								</table>
							</SortableContext>
						</DndContext>
					)}
				</div>

				{topics.length > 0 && (
					<div className="mt-4 p-4 text-center text-[13px] text-gray-500 dark:text-gray-400">
						{reordering
							? 'Saving order…'
							: `Showing ${filteredTopics.length} topic${filteredTopics.length !== 1 ? 's' : ''}`}
					</div>
				)}
			</div>

			{/* ── Cluster Article Count Dialog ──────────────────────────────────── */}
			<Dialog open={clusterDialogOpen} onOpenChange={setClusterDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<FileText className="text-brand-500 size-4" />
							How many articles to generate?
						</DialogTitle>
						<DialogDescription>
							We'll research real keyword data to find the best supporting articles for this topic.
						</DialogDescription>
					</DialogHeader>

					{clusterDialogTopic &&
						(() => {
							const rec = getArticleRecommendation(
								clusterDialogTopic.kd ?? 30,
								clusterDialogTopic.volume ?? 0
							);
							return (
								<div className="space-y-5 py-2">
									{/* Topic being clustered */}
									<div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800">
										<div className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
											Topic
										</div>
										<div className="mt-0.5 font-semibold text-gray-900 dark:text-white">
											{clusterDialogTopic.title}
										</div>
										<div className="mt-0.5 font-mono text-xs text-gray-500 dark:text-gray-400">
											{clusterDialogTopic.keyword}
										</div>
									</div>

									{/* Recommendation badge */}
									<div className="rounded-lg border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900">
										<div className="flex items-center justify-between">
											<span className="text-[12px] font-medium text-gray-600 dark:text-gray-400">
												We recommend
											</span>
											<span className={`text-[13px] font-semibold ${rec.color}`}>
												{rec.label} · difficulty {clusterDialogTopic.kd ?? '—'}%
											</span>
										</div>
										<div className="mt-2 text-[12.5px] leading-relaxed text-gray-600 dark:text-gray-400">
											{rec.reason}
										</div>
									</div>

									{/* Slider */}
									<div>
										<div className="mb-3 flex items-center justify-between">
											<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
												Articles to generate
											</span>
											<span className="text-brand-600 dark:text-brand-400 text-2xl font-bold tabular-nums">
												{clusterArticleCount}
												{clusterArticleCount === rec.count && (
													<span className="ml-1.5 text-[11px] font-medium text-gray-400">
														recommended
													</span>
												)}
											</span>
										</div>
										<Slider
											min={3}
											max={20}
											step={1}
											value={clusterArticleCount}
											onChange={(e) => setClusterArticleCount(Number(e.target.value))}
											className="accent-brand-500"
										/>
										<div className="mt-1.5 flex justify-between text-[11px] text-gray-400">
											<span>3 — focused</span>
											<span>20 — full coverage</span>
										</div>
										{/* Tick marks at key positions */}
										<div className="relative mt-1 flex justify-between px-0.5">
											{Array.from({ length: 18 }, (_, i) => i + 3).map((n) => (
												<div key={n} className="flex flex-col items-center">
													<div
														className={`h-1 w-px ${n === rec.count ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
													/>
													{n === rec.count && (
														<span className="text-brand-500 text-[9px] font-bold">rec</span>
													)}
												</div>
											))}
										</div>
									</div>
								</div>
							);
						})()}

					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={() => setClusterDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							className="bg-brand-500 hover:bg-brand-600 text-white"
							disabled={!clusterDialogTopic || !!startingTopicId}
							onClick={() =>
								clusterDialogTopic && handleStartCluster(clusterDialogTopic.id, clusterArticleCount)
							}
						>
							{startingTopicId ? (
								<>
									<Loader2 className="mr-2 size-4 animate-spin" /> Creating…
								</>
							) : (
								<>
									<Sparkles className="mr-2 size-4" /> Generate {clusterArticleCount} Article
									{clusterArticleCount !== 1 ? 's' : ''}
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Add Topic dialog */}
			<Dialog
				open={addTopicOpen}
				onOpenChange={(open) => {
					if (!open) {
						setAddTopicOpen(false);
						resetTopicForm();
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{editTopicId ? 'Edit Topic' : 'Add Topic'}</DialogTitle>
						<DialogDescription>
							{editTopicId
								? 'Update this topic. Enter the target keyword to pull live search data.'
								: 'Add a topic to your strategy. Enter the target keyword to pull live search data.'}
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-5 py-4">
						<div className="grid gap-3">
							<Label htmlFor="topic-title">Title</Label>
							<InputField
								id="topic-title"
								placeholder="e.g. Cyber Crime Investigation"
								value={addTopicForm.title}
								onChange={(e) => setAddTopicForm((f) => ({ ...f, title: e.target.value }))}
								className="dark:border-gray-700 dark:bg-gray-900"
							/>
						</div>
						<div className="grid gap-3">
							<Label htmlFor="topic-keyword">
								Target keyword
								<span className="ml-1.5 text-xs font-normal text-gray-400">
									(tab out to fetch real data)
								</span>
							</Label>
							<div className="relative">
								<InputField
									id="topic-keyword"
									placeholder="e.g. cyber crime investigation"
									value={addTopicForm.keyword}
									onChange={(e) => {
										setAddTopicForm((f) => ({ ...f, keyword: e.target.value }));
										setTopicMetrics(null);
									}}
									onBlur={(e) => {
										const kw = e.target.value.trim() || addTopicForm.title.trim();
										if (kw) lookupKeywordMetrics(kw);
									}}
									className="pr-8 dark:border-gray-700 dark:bg-gray-900"
								/>
								{lookingUpMetrics && (
									<Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-gray-400" />
								)}
							</div>
							{/* Live keyword metrics card */}
							{topicMetrics && !lookingUpMetrics && (
								<div className="border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/30 flex gap-3 rounded-lg border px-3 py-2.5">
									<div className="text-center">
										<div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
											Volume/mo
										</div>
										<div className="text-sm font-bold text-gray-900 dark:text-white">
											{topicMetrics.monthly_searches != null
												? topicMetrics.monthly_searches.toLocaleString()
												: '—'}
										</div>
									</div>
									<div className="bg-brand-200 dark:bg-brand-800 w-px" />
									<div className="text-center">
										<div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
											Competition
										</div>
										<div
											className={`text-sm font-bold ${
												(topicMetrics.keyword_difficulty ?? 100) < 25
													? 'text-success-600'
													: (topicMetrics.keyword_difficulty ?? 100) <= 45
														? 'text-warning-600'
														: 'text-error-600'
											}`}
										>
											{topicMetrics.keyword_difficulty != null
												? `${topicMetrics.keyword_difficulty}%`
												: '—'}
										</div>
									</div>
									<div className="bg-brand-200 dark:bg-brand-800 w-px" />
									<div className="text-center">
										<div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
											Ad Value
										</div>
										<div className="text-sm font-bold text-gray-900 dark:text-white">
											{topicMetrics.cpc != null ? `$${topicMetrics.cpc.toFixed(2)}` : '—'}
										</div>
									</div>
								</div>
							)}
							{!topicMetrics && !lookingUpMetrics && addTopicForm.keyword.trim() === '' && (
								<p className="text-[12px] text-gray-400 dark:text-gray-500">
									Enter a keyword and tab out — we'll pull real search volume, competition, and ad
									value from DataForSEO.
								</p>
							)}
						</div>
						<div className="grid gap-3">
							<Label>Funnel stage</Label>
							<div className="flex gap-2">
								{FUNNEL_OPTIONS.map((opt) => (
									<Button
										key={opt.value}
										type="button"
										size="sm"
										variant={addTopicForm.funnel === opt.value ? 'flat' : 'outline'}
										className={
											addTopicForm.funnel === opt.value
												? 'bg-brand-500 hover:bg-brand-600 text-white'
												: ''
										}
										onClick={() => setAddTopicForm((f) => ({ ...f, funnel: opt.value }))}
									>
										{opt.label}
									</Button>
								))}
							</div>
						</div>
						<div className="grid gap-3">
							<Label htmlFor="topic-reasoning">Notes (optional)</Label>
							<TextArea
								id="topic-reasoning"
								placeholder="Why this topic matters for your business"
								value={addTopicForm.reasoning}
								onChange={(e) => setAddTopicForm((f) => ({ ...f, reasoning: e.target.value }))}
								className="dark:border-gray-700 dark:bg-gray-900"
								rows={6}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setAddTopicOpen(false);
								resetTopicForm();
							}}
							disabled={addTopicSubmitting}
						>
							Cancel
						</Button>
						<Button
							className="bg-brand-500 hover:bg-brand-600 text-white"
							onClick={handleAddTopic}
							disabled={addTopicSubmitting || !addTopicForm.title.trim()}
						>
							{addTopicSubmitting
								? editTopicId
									? 'Saving…'
									: 'Adding…'
								: editTopicId
									? 'Save Changes'
									: 'Add Topic'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<KeywordLookupModal
				open={keywordLookupOpen}
				onClose={() => {
					setKeywordLookupOpen(false);
					setKeywordLookupInit('');
				}}
				siteId={selectedSite?.id}
				initialKeyword={keywordLookupInit}
				onAddToStrategy={(kw) => {
					resetTopicForm();
					setAddTopicForm((f) => ({ ...f, keyword: kw, title: kw }));
					setAddTopicOpen(true);
				}}
			/>

			{/* Seed Keywords modal */}
			<Dialog
				open={seedModalOpen}
				onOpenChange={(o) => {
					if (!suggesting) setSeedModalOpen(o);
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Search className="text-brand-500 size-5" />
							Seed keywords for this target
						</DialogTitle>
						<DialogDescription>
							Enter the target page name and related search terms. We'll find topics that can drive
							traffic to this page — questions, guides, and comparisons people search for before
							landing on your destination.
						</DialogDescription>

						<p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
							Use specific keywords that are relevant to the target. Generic keywords will likely
							throw off the results and lead to topics not related to the target.
						</p>
					</DialogHeader>

					<div className="space-y-4 py-2">
						{/* Chip display */}
						{seedChips.length > 0 && (
							<div className="flex flex-wrap gap-2">
								{seedChips.map((chip) => (
									<span
										key={chip}
										className="border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium"
									>
										{chip}
										<button
											type="button"
											onClick={() => setSeedChips((prev) => prev.filter((c) => c !== chip))}
											className="text-brand-400 hover:text-brand-700 dark:hover:text-brand-200"
										>
											×
										</button>
									</span>
								))}
							</div>
						)}

						{/* Input */}
						<div className="flex gap-2">
							<div className="relative flex-1">
								<InputField
									placeholder={
										target?.name
											? `e.g. "${target.name}", "best ${target.name}", "${target.name} comparison"`
											: 'e.g. target name, "best [target]", "[target] vs alternatives"'
									}
									value={seedInput}
									onChange={(e) => setSeedInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ',') {
											e.preventDefault();
											const val = seedInput.trim().replace(/,$/, '');
											if (val && !seedChips.includes(val)) setSeedChips((prev) => [...prev, val]);
											setSeedInput('');
										}
									}}
									className="dark:border-gray-700 dark:bg-gray-900"
								/>
							</div>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									const val = seedInput.trim().replace(/,$/, '');
									if (val && !seedChips.includes(val)) setSeedChips((prev) => [...prev, val]);
									setSeedInput('');
								}}
								disabled={!seedInput.trim()}
							>
								Add
							</Button>
						</div>
						<p className="text-[12px] text-gray-400 dark:text-gray-500">
							Press{' '}
							<kbd className="rounded border border-gray-200 bg-gray-100 px-1 dark:border-gray-700 dark:bg-gray-800">
								Enter
							</kbd>{' '}
							or{' '}
							<kbd className="rounded border border-gray-200 bg-gray-100 px-1 dark:border-gray-700 dark:bg-gray-800">
								,
							</kbd>{' '}
							to add each keyword. Add 1–5 seed terms for best results.
						</p>

						{/* What we'll research */}
						<div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
							<p className="mb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
								What we'll research for you
							</p>
							<ul className="space-y-1.5 text-[12.5px] text-gray-600 dark:text-gray-400">
								<li className="flex items-center gap-2">
									<span className="size-1.5 shrink-0 rounded-full bg-red-400" />
									Keyword Discovery — real keyword data and metrics
								</li>
								<li className="flex items-center gap-2">
									<span className="size-1.5 shrink-0 rounded-full bg-blue-400" />
									People Also Ask — real questions users type into Google
								</li>
								<li className="flex items-center gap-2">
									<span className="size-1.5 shrink-0 rounded-full bg-purple-400" />
									Related Searches — Google's own keyword variations
								</li>
								<li className="flex items-center gap-2">
									<span className="size-1.5 shrink-0 rounded-full bg-orange-400" />
									Competitor Gaps — topics your competitors rank for that you don't
								</li>
								<li className="flex items-center gap-2">
									<span className="bg-brand-400 size-1.5 shrink-0 rounded-full" />
									AI Brainstorm — seasonal, local, and contextual angles research misses
								</li>
							</ul>
						</div>
					</div>

					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={() => setSeedModalOpen(false)}>
							Cancel
						</Button>
						<Button
							className="bg-brand-500 hover:bg-brand-600 text-white"
							onClick={handleRunResearch}
							disabled={seedChips.length === 0 && !seedInput.trim()}
						>
							<CreditBadge
								cost={CREDIT_COSTS.STRATEGY_GENERATION}
								action="Research"
								sufficient={creditsRemaining >= CREDIT_COSTS.STRATEGY_GENERATION}
							/>
							<span className="ml-2">Start Research →</span>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Site details incomplete — block strategy generation */}
			<Dialog open={siteIncompleteOpen} onOpenChange={setSiteIncompleteOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<span className="bg-warning-100 dark:bg-warning-900/30 flex size-7 items-center justify-center rounded-full">
								<AlertTriangle className="text-warning-500 size-4" />
							</span>
							Complete Your Site Details First
						</DialogTitle>
						<DialogDescription>
							We just need to know what your site is about to generate a relevant strategy. This
							takes 30 seconds to set up.
						</DialogDescription>
					</DialogHeader>
					<div className="py-2">
						<p className="mb-2 text-[13px] font-semibold text-gray-700 dark:text-gray-300">
							Missing information:
						</p>
						<ul className="space-y-1.5">
							{siteIncompleteFields.map((f) => (
								<li
									key={f}
									className="flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-400"
								>
									<span className="bg-warning-500 size-1.5 shrink-0 rounded-full" />
									{f}
								</li>
							))}
						</ul>
					</div>
					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={() => setSiteIncompleteOpen(false)}>
							Cancel
						</Button>
						<Button
							className="bg-brand-500 hover:bg-brand-600 text-white"
							onClick={() => {
								setSiteIncompleteOpen(false);
								navigate('/sites');
							}}
						>
							Go to Site Settings →
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ── Past Runs ──────────────────────────────────────────────────── */}
			{(strategyRuns.length > 0 || runsLoading) && (
				<div className="mt-6 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
					<div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
						<History className="size-4 text-gray-400" />
						<span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
							Past Strategy Runs
						</span>
						<span className="ml-auto text-[11px] text-gray-400">
							Click any run to re-open its full topic list
						</span>
					</div>
					{runsLoading ? (
						<div className="px-4 py-6 text-center text-sm text-gray-400">Loading runs…</div>
					) : (
						<div className="divide-y divide-gray-100 dark:divide-gray-800">
							{strategyRuns.map((run) => (
								<div
									key={run.id}
									className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
								>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span className="text-[13px] font-medium text-gray-900 dark:text-white">
												{run.seedsUsed.join(', ')}
											</span>
											<span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
												{(run.suggestions as unknown[]).length} topics
											</span>
											{run.trafficTier && (
												<span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
													{run.trafficTier}
												</span>
											)}
										</div>
										<div className="mt-0.5 text-[11px] text-gray-400">
											{new Date(run.createdAt).toLocaleDateString(undefined, {
												month: 'short',
												day: 'numeric',
												year: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											})}
											{' · '}
											{run.creditsUsed} credits used
										</div>
									</div>
									<button
										type="button"
										onClick={() => handleRestoreRun(run)}
										className="hover:border-brand-300 hover:text-brand-600 dark:hover:border-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-600 transition-colors dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
									>
										<Eye className="size-3" />
										View
									</button>
									<button
										type="button"
										onClick={() => deleteRun(run.id)}
										className="invisible rounded p-1 text-gray-400 group-hover:visible hover:text-red-500"
										title="Delete run"
									>
										<Trash2 className="size-3.5" />
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			<TaskProgressWidget
				open={taskWidgetOpen}
				title={topicCount === 0 ? 'Generating Strategy' : 'Regenerating Strategy'}
				status={taskStatus}
				steps={taskSteps}
				errorMessage={taskError}
				disableAutoAdvance
				onClose={() => setTaskWidgetOpen(false)}
			/>

			<TaskProgressWidget
				open={clusterWidgetOpen}
				title="Building Content Cluster"
				status={clusterWidgetStatus}
				steps={clusterWidgetSteps}
				errorMessage={clusterWidgetError}
				disableAutoAdvance
				onClose={() => setClusterWidgetOpen(false)}
			/>

			{/* Strategy suggestions picker */}
			<Dialog
				open={suggestOpen}
				onOpenChange={(o) => {
					if (!addingSelected) setSuggestOpen(o);
				}}
			>
				<DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Sparkles className="text-brand-500 h-5 w-5" />
							AI Strategy Suggestions
						</DialogTitle>
						<DialogDescription>
							Topic areas ranked <strong>easiest to hardest</strong> — each topic is a keyword
							cluster with aggregate stats (total keywords, total volume, avg KD) just like SEMrush.
							Start with achievable topics and build up as your site grows.
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 space-y-2 overflow-y-auto py-2 pr-1">
						{/* Research Basis — collapsible */}
						{(strategyRationale || researchContext) && (
							<div className="border-brand-100 bg-brand-50/60 dark:border-brand-900/40 dark:bg-brand-950/30 mb-3 overflow-hidden rounded-lg border">
								<button
									type="button"
									onClick={() => setResearchExpanded((v) => !v)}
									className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
								>
									<div className="flex items-center gap-2">
										<Search className="text-brand-500 size-3.5 shrink-0" />
										<span className="text-brand-700 dark:text-brand-300 text-[12px] font-semibold">
											Why These Topics?
										</span>
										<span className="bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
											How we chose them
										</span>
										{researchContext && (
											<span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
												{(researchContext as Record<string, unknown>).dataforseo_keywords_found
													? `${(researchContext as Record<string, unknown>).dataforseo_keywords_found} keywords analyzed`
													: `${(researchContext.keywords_from_paa ?? 0) + (researchContext.keywords_from_related ?? 0) + (researchContext.keywords_from_organic ?? 0)} signals`}
												{' · '}
												{researchContext.topics_researched ?? 0} topics
											</span>
										)}
									</div>
									{researchExpanded ? (
										<ChevronUp className="text-brand-400 size-3.5 shrink-0" />
									) : (
										<ChevronDown className="text-brand-400 size-3.5 shrink-0" />
									)}
								</button>

								{researchExpanded && (
									<div className="border-brand-100 dark:border-brand-900/40 space-y-3 border-t px-3.5 pt-3 pb-3.5">
										{/* Strategic rationale — plain English from Claude */}
										{strategyRationale && (
											<p className="text-[12.5px] leading-relaxed text-gray-700 dark:text-gray-300">
												{strategyRationale}
											</p>
										)}

										{researchContext && (
											<div className="space-y-3">
												{/* How we did this — plain language */}
												<p className="text-[12.5px] leading-relaxed text-gray-600 dark:text-gray-400">
													{(researchContext as Record<string, unknown>)
														.dataforseo_keywords_found ? (
														<>
															We searched Google and pulled{' '}
															<strong className="text-gray-700 dark:text-gray-300">
																{String(
																	(researchContext as Record<string, unknown>)
																		.dataforseo_keywords_found
																)}{' '}
																real search terms
															</strong>{' '}
															people actually type in. We then grouped them into content topics and
															sorted them from easiest to hardest to rank for — so you tackle the
															quick wins first and build up over time. Search volume and ad cost
															figures are{' '}
															<strong className="text-gray-700 dark:text-gray-300">
																real data from the US market
															</strong>
															, not estimates.
														</>
													) : (
														<>
															We searched Google for questions people ask, looked at what
															competitors write about, and grouped the results into content topics.
															Topics are sorted from easiest to hardest based on your site's current
															authority level
															{trafficTier ? ` and how much traffic your site already gets` : ''}.
														</>
													)}
												</p>

												{/* Stats strip */}
												<div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
													<span>
														{researchContext.discovery_queries_run ?? 0} Google searches run
													</span>
													{(researchContext as Record<string, unknown>)
														.dataforseo_keywords_found ? (
														<>
															<span className="text-gray-300 dark:text-gray-700">·</span>
															<span className="font-medium text-green-600 dark:text-green-400">
																{String(
																	(researchContext as Record<string, unknown>)
																		.dataforseo_keywords_found
																)}{' '}
																real search terms pulled
															</span>
														</>
													) : (
														<>
															<span className="text-gray-300 dark:text-gray-700">·</span>
															<span>
																{(researchContext.keywords_from_paa ?? 0) +
																	(researchContext.keywords_from_related ?? 0) +
																	(researchContext.keywords_from_organic ?? 0)}{' '}
																search signals collected
															</span>
														</>
													)}
													{(researchContext.competitors_analyzed?.length ?? 0) > 0 && (
														<>
															<span className="text-gray-300 dark:text-gray-700">·</span>
															<span>
																{researchContext.competitors_analyzed.length} competitor
																{researchContext.competitors_analyzed.length > 1 ? 's' : ''} checked
															</span>
														</>
													)}
													<span className="text-gray-300 dark:text-gray-700">·</span>
													<span>{researchContext.topics_researched ?? 0} topics mapped</span>
												</div>

												{/* Collapsible detailed breakdown */}
												<details className="group">
													<summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-gray-400 select-none hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
														<ChevronDown className="size-3 transition-transform group-open:rotate-180" />
														See what we searched for
													</summary>
													<div className="mt-2 space-y-2 pl-4">
														{researchContext.seeds_used?.length > 0 && (
															<div>
																<div className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
																	Your Topic Seeds
																</div>
																<div className="flex flex-wrap gap-1.5">
																	{researchContext.seeds_used.map((s) => (
																		<span
																			key={s}
																			className="bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300 rounded-full px-2 py-0.5 text-[11px] font-medium"
																		>
																			{s}
																		</span>
																	))}
																</div>
															</div>
														)}
														{researchContext.people_also_ask?.length > 0 && (
															<div>
																<div className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
																	Questions People Ask on Google
																</div>
																<div className="flex flex-wrap gap-1.5">
																	{researchContext.people_also_ask.slice(0, 8).map((q) => (
																		<span
																			key={q}
																			className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
																		>
																			{q}
																		</span>
																	))}
																</div>
															</div>
														)}
														{researchContext.competitors_analyzed?.length > 0 && (
															<div>
																<div className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
																	Competitor Sites Checked
																</div>
																<div className="flex flex-wrap gap-2">
																	{researchContext.competitors_analyzed.map((c) => (
																		<span
																			key={c}
																			className="text-[11px] font-medium text-gray-700 dark:text-gray-300"
																		>
																			{c}
																		</span>
																	))}
																</div>
															</div>
														)}
													</div>
												</details>
											</div>
										)}
									</div>
								)}
							</div>
						)}

						{suggestions.length === 0 ? (
							<p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
								No suggestions generated.
							</p>
						) : (
							<>
								<div className="mb-3 flex items-center justify-between">
									<span className="text-sm text-gray-500 dark:text-gray-400">
										{selectedSuggestions.size} of {suggestions.length} selected
									</span>
									<div className="flex gap-2">
										<button
											type="button"
											className="text-brand-500 text-xs hover:underline"
											onClick={() => setSelectedSuggestions(new Set(suggestions.map((_, i) => i)))}
										>
											Select all
										</button>
										<span className="text-gray-300 dark:text-gray-600">·</span>
										<button
											type="button"
											className="text-xs text-gray-400 hover:underline"
											onClick={() => setSelectedSuggestions(new Set())}
										>
											Deselect all
										</button>
									</div>
								</div>
								{suggestions.map((s, i) => {
									const checked = selectedSuggestions.has(i);
									const authColor =
										s.authority_fit === 'achievable'
											? 'text-brand-600 dark:text-brand-400'
											: s.authority_fit === 'buildToward'
												? 'text-warning-600'
												: 'text-gray-500 dark:text-gray-400';
									const AuthIcon =
										s.authority_fit === 'achievable'
											? CheckCircle2
											: s.authority_fit === 'buildToward'
												? Clock
												: TrendingUp;
									const authLabel =
										s.authority_fit === 'achievable'
											? 'Start Now'
											: s.authority_fit === 'buildToward'
												? 'Build Toward'
												: 'Long-Term';
									const kdColor =
										s.keyword_difficulty < 25
											? 'text-success-600'
											: s.keyword_difficulty <= 45
												? 'text-warning-600'
												: 'text-error-600';
									return (
										<div key={i}>
											<button
												type="button"
												onClick={() => {
													setSelectedSuggestions((prev) => {
														const next = new Set(prev);
														if (next.has(i)) next.delete(i);
														else next.add(i);
														return next;
													});
												}}
												className={`w-full rounded-lg border p-3 text-left transition-colors ${
													checked
														? 'border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/40'
														: 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
												}`}
											>
												<div className="flex items-start gap-3">
													<div
														className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
															checked
																? 'border-brand-500 bg-brand-500'
																: 'border-gray-300 dark:border-gray-600'
														}`}
													>
														{checked && (
															<svg
																className="h-2.5 w-2.5 text-white"
																viewBox="0 0 10 8"
																fill="currentColor"
															>
																<path
																	d="M1 4l3 3 5-6"
																	stroke="currentColor"
																	strokeWidth="1.5"
																	fill="none"
																	strokeLinecap="round"
																	strokeLinejoin="round"
																/>
															</svg>
														)}
													</div>
													<div className="min-w-0 flex-1">
														{/* Title + priority badge */}
														<div className="flex items-center justify-between gap-2">
															<span className="text-sm leading-snug font-semibold text-gray-900 dark:text-white">
																{s.title}
															</span>
															<span
																className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${authColor}`}
																style={{ background: 'transparent' }}
															>
																<AuthIcon className="size-3 shrink-0" />
																{authLabel}
															</span>
														</div>

														{/* SEMrush-style aggregate stats */}
														<div className="mt-2 grid grid-cols-3 gap-2">
															<div className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5 dark:border-gray-800 dark:bg-gray-900/50">
																<div className="text-[9px] font-medium tracking-wider text-gray-400 uppercase">
																	All Keywords
																</div>
																<div className="mt-0.5 text-[13px] font-semibold text-gray-900 dark:text-white">
																	{s.keyword_count != null ? s.keyword_count.toLocaleString() : '—'}
																</div>
															</div>
															<div className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5 dark:border-gray-800 dark:bg-gray-900/50">
																<div className="text-[9px] font-medium tracking-wider text-gray-400 uppercase">
																	Monthly Searches
																</div>
																<div className="mt-0.5 text-[13px] font-semibold text-gray-900 dark:text-white">
																	{(s.monthly_searches ?? 0).toLocaleString()}
																	<span className="text-[10px] font-normal text-gray-400">
																		{' '}
																		US/mo
																	</span>
																</div>
															</div>
															<div className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5 dark:border-gray-800 dark:bg-gray-900/50">
																<div className="text-[9px] font-medium tracking-wider text-gray-400 uppercase">
																	Competition
																</div>
																<div className={`mt-0.5 text-[13px] font-semibold ${kdColor}`}>
																	{s.keyword_difficulty}%
																</div>
															</div>
														</div>

														{/* Secondary row */}
														<div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
															<span title="Average cost per click in Google Ads (US). Higher = more commercial value. May vary slightly from other tools.">
																${(s.cpc ?? 0).toFixed(2)} avg ad cost (US)
															</span>
															<span className="text-gray-300 dark:text-gray-700">·</span>
															<FunnelTag stage={s.funnel_stage as Topic['funnel']} />
															{s.kgr_score != null && s.kgr_score < 0.25 && (
																<>
																	<span className="text-gray-300 dark:text-gray-700">·</span>
																	<span className="text-success-600 dark:text-success-400 flex items-center gap-1 font-semibold">
																		<Zap className="size-3 shrink-0" /> Quick Win
																	</span>
																</>
															)}
														</div>

														{/* "How we found this" collapsible */}
														{s.ai_reasoning && (
															<details className="group mt-2">
																<summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] text-gray-400 select-none hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
																	<ChevronDown className="size-3 transition-transform group-open:rotate-180" />
																	How we found this
																</summary>
																<p className="mt-1 pl-4 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
																	{s.ai_reasoning}
																</p>
															</details>
														)}
													</div>
												</div>
											</button>
										</div>
									);
								})}
							</>
						)}
					</div>

					<DialogFooter className="mt-2 border-t border-gray-100 pt-4 dark:border-gray-800">
						<Button
							variant="outline"
							onClick={() => setSuggestOpen(false)}
							disabled={addingSelected}
						>
							Cancel
						</Button>
						<Button
							className="bg-brand-500 hover:bg-brand-600 text-white"
							onClick={handleAddSelected}
							disabled={addingSelected || selectedSuggestions.size === 0}
						>
							{addingSelected ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding…
								</>
							) : (
								`Add ${selectedSuggestions.size} Topic${selectedSuggestions.size !== 1 ? 's' : ''}`
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<MoveTopicModal
				open={moveTopicModalOpen}
				onClose={() => {
					setMoveTopicModalOpen(false);
					setMoveTopicModalTopic(null);
				}}
				topic={moveTopicModalTopic}
				targets={otherTargets}
				onMove={handleMoveTopic}
				moving={movingTopicId !== null}
			/>
			<EditTargetModal
				open={editTargetOpen}
				onClose={() => setEditTargetOpen(false)}
				target={target ?? null}
				onSave={async (id, input) => {
					const result = await updateTarget(id, input);
					if (!result.error) refetchTargets();
					return result;
				}}
				onDelete={async (id) => {
					const result = await deleteTarget(id);
					if (!result.error) {
						refetchTargets();
						navigate('/strategy');
					}
					return result;
				}}
			/>
		</>
	);
}

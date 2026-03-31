import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
	Search,
	LayoutDashboard,
	Command,
	ArrowUp,
	ArrowDown,
	X,
	MapIcon,
	GitFork,
	ShoppingBag,
	BarChart2,
	TrendingUp,
	Wrench,
	Code2,
	Globe,
	Bot,
	Settings,
	MessageSquare,
	FileText,
	Target,
	Tag
} from 'lucide-react';
import { useNavigate } from 'react-router';
import useDebounce from '../../hooks/useDebounce';
import { useSiteContext } from '../../contexts/SiteContext';
import { useSites } from '../../hooks/useSites';
import { useClusters } from '../../hooks/useClusters';
import { useTargets } from '../../hooks/useTargets';
import { useTopics } from '../../hooks/useTopics';
import { useOrganization } from '../../hooks/useOrganization';
import { useChat } from '../../contexts/ChatContext';
import { api } from '../../utils/api';
import { supabase } from '../../utils/supabaseClient';
import { canAccessPerformance, canAccessTechnical, canAccessCROStudio } from '../../utils/featureGating';
import type { OrganizationRow } from '../../types/billing';

interface CommandPaletteProps {
	onClose: () => void;
	ref: React.RefObject<HTMLDivElement>;
}

type ResultType = 'page' | 'site' | 'cluster' | 'target' | 'topic' | 'ecommerce' | 'workspace';

interface SearchResult {
	id: string;
	type: ResultType;
	title: string;
	subtitle?: string;
	icon: React.ReactNode;
	path: string;
	score: number;
}

// Static navigation pages — aligned with AppSidebar
function buildStaticPages(organization: OrganizationRow | null): Omit<SearchResult, 'score'>[] {
	const canPerf = canAccessPerformance(organization);
	const canTech = canAccessTechnical(organization);
	const canCRO = canAccessCROStudio(organization);

	const pages: Omit<SearchResult, 'score'>[] = [
		{
			id: 'nav-dashboard',
			type: 'page',
			title: 'Dashboard',
			subtitle: 'Overview and metrics',
			icon: <LayoutDashboard className="h-4 w-4" />,
			path: '/dashboard'
		},
		{
			id: 'nav-strategy',
			type: 'page',
			title: 'Strategy',
			subtitle: 'Strategy targets and topics',
			icon: <MapIcon className="h-4 w-4" />,
			path: '/strategy'
		},
		{
			id: 'nav-clusters',
			type: 'page',
			title: 'Clusters',
			subtitle: 'Content clusters',
			icon: <GitFork className="h-4 w-4" />,
			path: '/clusters'
		},
		{
			id: 'nav-ecommerce',
			type: 'page',
			title: 'Ecommerce',
			subtitle: 'Product and collection SEO',
			icon: <ShoppingBag className="h-4 w-4" />,
			path: '/ecommerce'
		}
	];

	if (canPerf) {
		pages.push(
			{
				id: 'nav-performance',
				type: 'page',
				title: 'Performance',
				subtitle: 'Traffic and GSC data',
				icon: <BarChart2 className="h-4 w-4" />,
				path: '/performance'
			},
			{
				id: 'nav-rankings',
				type: 'page',
				title: 'Rankings',
				subtitle: 'Keyword positions',
				icon: <TrendingUp className="h-4 w-4" />,
				path: '/rankings'
			}
		);
	}

	pages.push({
		id: 'nav-schema',
		type: 'page',
		title: 'Schema Generator',
		subtitle: 'Create schema markup',
		icon: <Code2 className="h-4 w-4" />,
		path: '/schema-generator'
	});

	if (canCRO) {
		pages.push({
			id: 'nav-cro-studio',
			type: 'page',
			title: 'CRO Studio',
			subtitle: 'Destination page conversion audits',
			icon: <Target className="h-4 w-4" />,
			path: '/cro-studio'
		});
	}

	if (canTech) {
		pages.push({
			id: 'nav-technical',
			type: 'page',
			title: 'Site Audit',
			subtitle: 'Technical audit',
			icon: <Wrench className="h-4 w-4" />,
			path: '/technical'
		});
	}

	pages.push(
		{
			id: 'nav-sites',
			type: 'page',
			title: 'Sites',
			subtitle: 'Manage sites',
			icon: <Globe className="h-4 w-4" />,
			path: '/sites'
		},
		{
			id: 'nav-assistant',
			type: 'page',
			title: 'AI Assistant',
			subtitle: 'Chat with AI',
			icon: <Bot className="h-4 w-4" />,
			path: '/assistant'
		},
		{
			id: 'nav-notifications',
			type: 'page',
			title: 'Notifications',
			subtitle: 'View notifications',
			icon: <MessageSquare className="h-4 w-4" />,
			path: '/notifications'
		},
		{
			id: 'nav-settings',
			type: 'page',
			title: 'Settings',
			subtitle: 'Account and organization',
			icon: <Settings className="h-4 w-4" />,
			path: '/settings'
		},
		{
			id: 'nav-settings-profile',
			type: 'page',
			title: 'Settings → Profile',
			subtitle: 'Profile settings',
			icon: <Settings className="h-4 w-4" />,
			path: '/settings/profile'
		},
		{
			id: 'nav-settings-credits',
			type: 'page',
			title: 'Settings → Credits',
			subtitle: 'Credits and usage',
			icon: <Settings className="h-4 w-4" />,
			path: '/settings/credits'
		},
		{
			id: 'nav-settings-billing',
			type: 'page',
			title: 'Settings → Billing',
			subtitle: 'Billing and subscription',
			icon: <Settings className="h-4 w-4" />,
			path: '/settings/billing'
		}
	);

	return pages;
}

function fuzzySearch(query: string, text: string): number {
	if (!query) return 0;
	const queryLower = query.toLowerCase();
	const textLower = text.toLowerCase();
	if (textLower === queryLower) return 100;
	if (textLower.startsWith(queryLower)) return 90;
	if (textLower.includes(queryLower)) return 70;
	const words = textLower.split(/\s+/);
	let maxWordScore = 0;
	for (const word of words) {
		if (word.startsWith(queryLower)) maxWordScore = Math.max(maxWordScore, 80);
		else if (word.includes(queryLower)) maxWordScore = Math.max(maxWordScore, 60);
	}
	if (maxWordScore > 0) return maxWordScore;
	let qi = 0,
		ti = 0,
		score = 0;
	while (qi < queryLower.length && ti < textLower.length) {
		if (queryLower[qi] === textLower[ti]) {
			score += 10;
			qi++;
		}
		ti++;
	}
	return qi === queryLower.length ? Math.max(score, 30) : 0;
}

function scoreFields(query: string, ...fields: (string | null | undefined)[]): number {
	const q = query.toLowerCase();
	let best = 0;
	for (const f of fields) {
		if (f) best = Math.max(best, fuzzySearch(q, f));
	}
	return best;
}

const typeLabels: Record<ResultType, string> = {
	page: 'Page',
	site: 'Site',
	cluster: 'Cluster',
	target: 'Target',
	topic: 'Topic',
	ecommerce: 'Ecommerce',
	workspace: 'Workspace'
};

const CommandPalette = React.forwardRef<HTMLDivElement, CommandPaletteProps>(({ onClose }, ref) => {
	const navigate = useNavigate();
	const { clearChat } = useChat();
	const { selectedSite } = useSiteContext();
	const { sites } = useSites();
	const { clusters } = useClusters(selectedSite?.id ?? null);
	const { targets } = useTargets(selectedSite?.id ?? null);
	const { topics } = useTopics(selectedSite?.id ?? null);
	const { organization } = useOrganization();

	const [query, setQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [ecommercePages, setEcommercePages] = useState<
		Array<{ id: string; name: string; type: string }>
	>([]);
	const [workspacePages, setWorkspacePages] = useState<
		Array<{ id: string; title: string; keyword: string }>
	>([]);
	const inputRef = useRef<HTMLInputElement>(null);
	const resultsRef = useRef<HTMLDivElement>(null);

	const debouncedQuery = useDebounce(query, 150);

	// Fetch ecommerce pages when palette opens
	useEffect(() => {
		if (!selectedSite?.id) {
			setEcommercePages([]);
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
				const res = await api.get(
					`/api/ecommerce?siteId=${encodeURIComponent(selectedSite.id)}&limit=100&offset=0`
				);
				if (!res.ok) return;
				const data = (await res.json()) as {
					pages?: Array<{ id: string; name: string; type: string }>;
				};
				if (!cancelled) setEcommercePages(data.pages ?? []);
			} catch {
				if (!cancelled) setEcommercePages([]);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [selectedSite?.id]);

	// Fetch workspace pages (content cluster pages)
	useEffect(() => {
		if (!selectedSite?.id) {
			setWorkspacePages([]);
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				const { data } = await supabase
					.from('pages')
					.select('id, title, keyword')
					.eq('site_id', selectedSite.id)
					.limit(100);
				if (!cancelled && data)
					setWorkspacePages(
						data.map((r) => ({ id: r.id, title: r.title ?? '', keyword: r.keyword ?? '' }))
					);
			} catch {
				if (!cancelled) setWorkspacePages([]);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [selectedSite?.id]);

	const staticPages = useMemo(() => buildStaticPages(organization), [organization]);

	const allResults = useMemo(() => {
		const q = debouncedQuery.trim();
		const results: SearchResult[] = [];

		const add = (items: SearchResult[]) => {
			items.forEach((r) => results.push(r));
		};

		if (!q) {
			// No query: show pages only; clusters/entities appear when user searches
			add(
				staticPages.slice(0, 12).map((p) => ({
					...p,
					score: 1
				}))
			);
			return results;
		}

		const qLower = q.toLowerCase();

		// Static pages
		staticPages.forEach((p) => {
			const score = Math.max(scoreFields(qLower, p.title, p.subtitle), 0);
			if (score > 0) results.push({ ...p, score });
		});

		// Sites
		sites.forEach((s) => {
			const score = Math.max(scoreFields(qLower, s.name, s.url), 0);
			if (score > 0)
				results.push({
					id: s.id,
					type: 'site',
					title: s.name,
					subtitle: s.url || 'Site',
					icon: <Globe className="h-4 w-4" />,
					path: `/sites/${s.id}`,
					score
				});
		});

		// Clusters
		clusters.forEach((c) => {
			const score = Math.max(
				scoreFields(qLower, c.title, c.targetKeyword, c.destinationPageLabel),
				0
			);
			if (score > 0)
				results.push({
					id: c.id,
					type: 'cluster',
					title: c.title,
					subtitle: c.destinationPageLabel || c.targetKeyword,
					icon: <GitFork className="h-4 w-4" />,
					path: `/clusters/${c.id}`,
					score
				});
		});

		// Strategy targets (destinations)
		targets.forEach((t) => {
			const score = Math.max(
				scoreFields(qLower, t.name, t.destinationPageLabel, t.destinationPageUrl),
				0
			);
			if (score > 0)
				results.push({
					id: t.id,
					type: 'target',
					title: t.name,
					subtitle: t.destinationPageLabel || 'Destination',
					icon: <Target className="h-4 w-4" />,
					path: `/strategy/${t.id}`,
					score
				});
		});

		// Topics
		topics.forEach((t) => {
			const score = Math.max(scoreFields(qLower, t.title, t.keyword), 0);
			if (score > 0)
				results.push({
					id: t.id,
					type: 'topic',
					title: t.title,
					subtitle: t.keyword,
					icon: <Tag className="h-4 w-4" />,
					path: t.clusterId ? `/clusters/${t.clusterId}` : '/strategy',
					score
				});
		});

		// Ecommerce pages
		ecommercePages.forEach((p) => {
			const score = Math.max(scoreFields(qLower, p.name), 0);
			if (score > 0)
				results.push({
					id: p.id,
					type: 'ecommerce',
					title: p.name,
					subtitle: p.type === 'product' ? 'Product' : 'Collection',
					icon: <ShoppingBag className="h-4 w-4" />,
					path: `/ecommerce/${p.id}`,
					score
				});
		});

		// Workspace pages
		workspacePages.forEach((p) => {
			const score = Math.max(scoreFields(qLower, p.title, p.keyword), 0);
			if (score > 0)
				results.push({
					id: p.id,
					type: 'workspace',
					title: p.title,
					subtitle: p.keyword || 'Content page',
					icon: <FileText className="h-4 w-4" />,
					path: `/workspace/${p.id}`,
					score
				});
		});

		return results.sort((a, b) => b.score - a.score).slice(0, 20);
	}, [
		debouncedQuery,
		staticPages,
		sites,
		clusters,
		targets,
		topics,
		ecommercePages,
		workspacePages,
		selectedSite
	]);

	useEffect(() => {
		setSelectedIndex(0);
	}, [allResults.length]);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	// Scroll selected into view
	useEffect(() => {
		const container = resultsRef.current;
		if (!container) return;
		const el = container.querySelector(`[data-index="${selectedIndex}"]`);
		el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}, [selectedIndex]);

	const handleResultSelect = useCallback(
		(result: SearchResult) => {
			if (result.path === '/assistant' || result.path === '/assistant/') {
				clearChat();
			}
			navigate(result.path);
			onClose();
		},
		[navigate, onClose, clearChat]
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					setSelectedIndex((prev) => (prev + 1) % Math.max(1, allResults.length));
					break;
				case 'ArrowUp':
					e.preventDefault();
					setSelectedIndex(
						(prev) => (prev - 1 + allResults.length) % Math.max(1, allResults.length)
					);
					break;
				case 'Enter':
					e.preventDefault();
					if (allResults[selectedIndex]) handleResultSelect(allResults[selectedIndex]);
					break;
				case 'Escape':
					onClose();
					break;
			}
		},
		[allResults, selectedIndex, handleResultSelect, onClose]
	);

	const renderResults = useMemo(() => {
		if (allResults.length === 0) {
			return (
				<div className="p-8 text-center text-gray-500 dark:text-gray-400">
					<Search className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
					<p className="text-sm">No results found</p>
					<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
						Try topics, clusters, destinations, sites, or pages
					</p>
				</div>
			);
		}
		return (
			<div ref={resultsRef} className="py-2">
				{allResults.map((result, index) => (
					<div
						key={`${result.type}-${result.id}`}
						data-index={index}
						className={`cursor-pointer px-4 py-3 transition-colors duration-150 ${
							index === selectedIndex
								? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 border-l-2'
								: 'hover:bg-gray-50 dark:hover:bg-gray-800'
						}`}
						onClick={() => handleResultSelect(result)}
					>
						<div className="flex items-center space-x-3">
							<div className="shrink-0 text-gray-400">{result.icon}</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-gray-900 dark:text-white">
									{result.title}
								</p>
								{result.subtitle && (
									<p className="truncate text-xs text-gray-500 dark:text-gray-400">
										{result.subtitle}
									</p>
								)}
							</div>
							<div className="shrink-0">
								<span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-400 dark:bg-gray-700">
									{typeLabels[result.type]}
								</span>
							</div>
						</div>
					</div>
				))}
			</div>
		);
	}, [allResults, selectedIndex, handleResultSelect]);

	return (
		<div
			ref={ref}
			className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="mx-4 max-h-[70vh] w-full max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="border-b border-gray-200 p-4 dark:border-gray-700">
					<div className="mb-3 flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<Command className="h-5 w-5 text-gray-400" />
							<span className="text-sm font-medium text-gray-600 dark:text-gray-300">
								Sharkly Command Palette
							</span>
						</div>
						<button
							onClick={onClose}
							className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
						>
							<X className="h-4 w-4 text-gray-400" />
						</button>
					</div>
					<div className="relative">
						<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
						<input
							ref={inputRef}
							type="text"
							placeholder="Search topics, clusters, destinations, sites, pages..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={handleKeyDown}
							className="focus:ring-brand-500 w-full rounded-lg border border-gray-300 bg-white py-3 pr-4 pl-10 text-sm text-gray-900 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck={false}
						/>
					</div>
				</div>
				<div className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 max-h-[60vh] overflow-y-auto pb-10">
					{renderResults}
				</div>
				<div className="border-t border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<span className="flex items-center space-x-1">
								<ArrowUp className="h-3 w-3" />
								<ArrowDown className="h-3 w-3" />
								<span>Navigate</span>
							</span>
							<span>Enter to select</span>
							<span>Esc to close</span>
						</div>
						<span className="font-medium">
							{allResults.length} result{allResults.length !== 1 ? 's' : ''}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
});

CommandPalette.displayName = 'CommandPalette';

export default CommandPalette;

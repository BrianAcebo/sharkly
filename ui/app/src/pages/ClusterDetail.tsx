import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import {
	ReactFlow,
	Background,
	Controls,
	useNodesState,
	useEdgesState,
	MarkerType,
	Handle,
	Position,
	type Node,
	type Edge,
	type NodeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../../xy-theme.css';
import FloatingEdge from '../components/graphs/FloatingEdges/FloatingEdge';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { detectPageType, formatPageTypeDisplay, pageTypeColor } from '../lib/seoUtils';
import { ReverseSiloAlert } from '../components/shared/ReverseSiloAlert';
import { Button } from '../components/ui/button';
import { useTheme } from '../hooks/useTheme';
import { useCluster } from '../hooks/useCluster';
import { useClusterPages } from '../hooks/useClusterPages';
import { useOrganization } from '../hooks/useOrganization';
import {
	X,
	Sparkles,
	Check,
	Map as MapIcon,
	List,
	Link2,
	Settings,
	Plus,
	Trash2,
	CircleDollarSign,
	History,
	RotateCcw,
	RefreshCw,
	Loader2,
	ChevronDown as ChevronDownIcon,
	Star,
	Route
} from 'lucide-react';
import { cn } from '../utils/common';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';
import { api } from '../utils/api';
import { CREDIT_COSTS } from '../lib/credits';
import { CreditBadge } from '../components/shared/CreditBadge';
import { TaskProgressWidget } from '../components/shared/TaskProgressWidget';
import type { TaskStep, TaskStatus } from '../components/shared/TaskProgressWidget';
import { useClusterRuns, type ClusterRunSuggestion } from '../hooks/useClusterRuns';
import { FunnelTag } from '../components/shared/FunnelTag';
import {
	generateInternalLinkSuggestions,
	getPlacementLabel,
	getEquityLabel,
	type ClusterPage,
	type LinkSuggestion
} from '../lib/internalLinkSuggestions';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription
} from '../components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '../components/ui/alert-dialog';
import { Label } from '../components/ui/label';
import InputField from '../components/form/input/InputField';
import type { PageData } from '../hooks/useClusterPages';
import { FunnelVisualizer } from '../components/cluster/FunnelVisualizer';
import { ClusterHealthCheck } from '../components/cluster/ClusterHealthCheck';
import { useClusterIntelligence } from '../hooks/useClusterIntelligence';
import { useAuth } from '../hooks/useAuth';
import { useCROStudioUpgrade } from '../contexts/CROStudioUpgradeContext';

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? 'https://sharkly.co';

// ---------------------------------------------------------------------------
// Reverse Silo Visual Map — Section 17.6 / US8117209B1
// Hub-and-spoke SVG showing the exact link flow required for the reverse silo.
// ---------------------------------------------------------------------------
const GROUP_PALETTE = [
	{ node: '#f59e0b', stroke: '#b45309', text: '#fff', label: 'Group A' },
	{ node: '#8b5cf6', stroke: '#6d28d9', text: '#fff', label: 'Group B' },
	{ node: '#10b981', stroke: '#047857', text: '#fff', label: 'Group C' },
	{ node: '#3b82f6', stroke: '#1d4ed8', text: '#fff', label: 'Group D' },
	{ node: '#ec4899', stroke: '#be185d', text: '#fff', label: 'Group E' }
];

function edgePt(fx: number, fy: number, tx: number, ty: number, r: number) {
	const dx = tx - fx,
		dy = ty - fy,
		d = Math.sqrt(dx * dx + dy * dy) || 1;
	return { x: fx + (dx / d) * r, y: fy + (dy / d) * r };
}

function curvedPath(x1: number, y1: number, x2: number, y2: number, bend: number) {
	const mx = (x1 + x2) / 2,
		my = (y1 + y2) / 2;
	const dx = x2 - x1,
		dy = y2 - y1;
	const d = Math.sqrt(dx * dx + dy * dy) || 1;
	return `M ${x1} ${y1} Q ${mx - (dy / d) * bend} ${my + (dx / d) * bend} ${x2} ${y2}`;
}

function ReverseSiloMap({ pages }: { pages: PageData[] }) {
	const [hovered, setHovered] = React.useState<string | null>(null);
	const focusPage = pages.find((p) => p.type === 'focus_page');
	const articles = pages.filter((p) => p.type === 'article');

	if (!focusPage) return null;

	const W = 540,
		H = 540,
		CX = 270,
		CY = 270;
	const n = articles.length;
	const FOCUS_R = 52;
	const ART_R = n <= 6 ? 30 : n <= 12 ? 26 : n <= 18 ? 22 : 18;
	const ORBIT_R = n <= 6 ? 155 : n <= 10 ? 185 : n <= 16 ? 210 : 230;

	const positions = articles.map((_, i) => {
		const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
		return { x: CX + ORBIT_R * Math.cos(angle), y: CY + ORBIT_R * Math.sin(angle) };
	});

	// Groups of 5
	const groups: number[][] = [];
	for (let g = 0; g < n; g += 5)
		groups.push(Array.from({ length: Math.min(5, n - g) }, (_, j) => g + j));

	const articleGroup = (idx: number) => Math.floor(idx / 5);
	const palette = (idx: number) => GROUP_PALETTE[articleGroup(idx) % GROUP_PALETTE.length];

	const criticalMissing = articles.length; // all assumed pending since no implemented data

	return (
		<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
				<div>
					<p className="text-[13px] font-semibold text-gray-900 dark:text-white">
						Reverse Silo Link Map
					</p>
					<p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
						US8117209B1 — Reasonable Surfer Model · Link equity flows from articles → focus page
					</p>
				</div>
				<div className="flex items-center gap-2">
					{criticalMissing > 0 && (
						<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
							{articles.length} critical links to add
						</span>
					)}
				</div>
			</div>

			{/* SVG diagram */}
			<div className="p-4">
				<svg
					viewBox={`0 0 ${W} ${H}`}
					className="mx-auto w-full max-w-[520px]"
					style={{ maxHeight: 480 }}
				>
					<defs>
						{/* Arrowheads */}
						<marker
							id="ah-critical"
							markerWidth="8"
							markerHeight="6"
							refX="7"
							refY="3"
							orient="auto"
						>
							<polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
						</marker>
						<marker
							id="ah-focus-out"
							markerWidth="8"
							markerHeight="6"
							refX="7"
							refY="3"
							orient="auto"
						>
							<polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
						</marker>
						{/* Focus page glow filter */}
						<filter id="focus-glow">
							<feGaussianBlur stdDeviation="4" result="blur" />
							<feMerge>
								<feMergeNode in="blur" />
								<feMergeNode in="SourceGraphic" />
							</feMerge>
						</filter>
					</defs>

					{/* ── Group sector backgrounds ──────────────────────── */}
					{groups.map((group, gi) => {
						if (group.length < 2) return null;
						const pal = GROUP_PALETTE[gi % GROUP_PALETTE.length];
						// Draw a subtle arc connecting the group's first and last article
						const first = positions[group[0]];
						const last = positions[group[group.length - 1]];
						return (
							<path
								key={`sector-${gi}`}
								d={curvedPath(first.x, first.y, last.x, last.y, -ORBIT_R * 0.35)}
								stroke={pal.node}
								strokeWidth="28"
								strokeLinecap="round"
								fill="none"
								opacity="0.10"
							/>
						);
					})}

					{/* ── Article ↔ Article mesh lines (within group, undirected) ── */}
					{groups.map((group, gi) => {
						const pal = GROUP_PALETTE[gi % GROUP_PALETTE.length];
						return group.flatMap((ai, ii) =>
							group.slice(ii + 1).map((aj) => {
								const pa = positions[ai],
									pb = positions[aj];
								// Bend away from center
								const mx = (pa.x + pb.x) / 2,
									my = (pa.y + pb.y) / 2;
								const outward = Math.sqrt((mx - CX) ** 2 + (my - CY) ** 2);
								const bendDir = outward > 0 ? 1 : 0;
								const dx = mx - CX,
									dy = my - CY;
								const dLen = Math.sqrt(dx * dx + dy * dy) || 1;
								const cpx = mx + (dx / dLen) * 28 * bendDir;
								const cpy = my + (dy / dLen) * 28 * bendDir;
								return (
									<path
										key={`mesh-${ai}-${aj}`}
										d={`M ${pa.x} ${pa.y} Q ${cpx} ${cpy} ${pb.x} ${pb.y}`}
										stroke={pal.node}
										strokeWidth="1.5"
										strokeDasharray="4 3"
										fill="none"
										opacity="0.45"
									/>
								);
							})
						);
					})}

					{/* ── Article → Focus arrows (CRITICAL) ──────────────── */}
					{articles.map((_, i) => {
						const p = positions[i];
						const e1 = edgePt(p.x, p.y, CX, CY, ART_R + 2);
						const e2 = edgePt(CX, CY, p.x, p.y, FOCUS_R + 2);
						const isHov = hovered === articles[i].id;
						return (
							<path
								key={`art-focus-${i}`}
								d={curvedPath(e1.x, e1.y, e2.x, e2.y, 18)}
								stroke={isHov ? '#d97706' : '#f59e0b'}
								strokeWidth={isHov ? 3 : 2}
								fill="none"
								markerEnd="url(#ah-critical)"
								opacity={hovered && !isHov ? 0.25 : 0.9}
							/>
						);
					})}

					{/* ── Focus → Article arrows (top 3, HIGH) ────────────── */}
					{articles.slice(0, Math.min(3, n)).map((_, i) => {
						const p = positions[i];
						const e1 = edgePt(CX, CY, p.x, p.y, FOCUS_R + 2);
						const e2 = edgePt(p.x, p.y, CX, CY, ART_R + 2);
						return (
							<path
								key={`focus-art-${i}`}
								d={curvedPath(e1.x, e1.y, e2.x, e2.y, -22)}
								stroke="#6366f1"
								strokeWidth="1.8"
								fill="none"
								markerEnd="url(#ah-focus-out)"
								opacity={hovered && hovered !== articles[i].id ? 0.2 : 0.75}
								strokeDasharray="6 3"
							/>
						);
					})}

					{/* ── Article nodes ────────────────────────────────────── */}
					{articles.map((art, i) => {
						const { x, y } = positions[i];
						const pal = palette(i);
						const isHov = hovered === art.id;
						const label = art.keyword.length > 14 ? art.keyword.slice(0, 13) + '…' : art.keyword;
						const groupLetter =
							GROUP_PALETTE[articleGroup(i) % GROUP_PALETTE.length].label.slice(-1);
						return (
							<g
								key={art.id}
								onMouseEnter={() => setHovered(art.id)}
								onMouseLeave={() => setHovered(null)}
								style={{ cursor: 'default' }}
							>
								<circle
									cx={x}
									cy={y}
									r={isHov ? ART_R + 3 : ART_R}
									fill={pal.node}
									stroke={isHov ? '#fff' : pal.stroke}
									strokeWidth={isHov ? 2.5 : 1.5}
									filter={isHov ? 'url(#focus-glow)' : undefined}
								/>
								{/* Group letter */}
								<text
									x={x}
									y={y - ART_R + 10}
									textAnchor="middle"
									fontSize="8"
									fill="rgba(255,255,255,0.7)"
									fontWeight="600"
								>
									{groupLetter}
								</text>
								{/* Index number */}
								<text
									x={x}
									y={y + 4}
									textAnchor="middle"
									fontSize={ART_R >= 26 ? '11' : '9'}
									fill={pal.text}
									fontWeight="700"
								>
									{i + 1}
								</text>
								{/* Hover label outside node */}
								{isHov && (
									<text
										x={x}
										y={y + ART_R + 14}
										textAnchor="middle"
										fontSize="10"
										fill="currentColor"
										className="fill-gray-900 dark:fill-white"
										fontWeight="600"
									>
										{label}
									</text>
								)}
							</g>
						);
					})}

					{/* ── Focus page node (center) ─────────────────────────── */}
					<circle
						cx={CX}
						cy={CY}
						r={FOCUS_R}
						fill="#14b8a6"
						stroke="#0f766e"
						strokeWidth="2"
						filter="url(#focus-glow)"
					/>
					<text
						x={CX}
						y={CY - 10}
						textAnchor="middle"
						fontSize="10"
						fill="white"
						fontWeight="700"
						opacity="0.85"
					>
						FOCUS
					</text>
					<text
						x={CX}
						y={CY + 4}
						textAnchor="middle"
						fontSize="10"
						fill="white"
						fontWeight="700"
						opacity="0.85"
					>
						PAGE
					</text>
					<text x={CX} y={CY + 18} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.65)">
						hub
					</text>
				</svg>
			</div>

			{/* Legend */}
			<div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-gray-100 px-5 py-3 text-[11px] dark:border-gray-800">
				<div className="flex items-center gap-1.5">
					<svg width="28" height="10">
						<line x1="2" y1="5" x2="20" y2="5" stroke="#f59e0b" strokeWidth="2.5" />
						<polygon points="18,2 26,5 18,8" fill="#f59e0b" />
					</svg>
					<span className="text-gray-600 dark:text-gray-400">
						Article → Focus{' '}
						<strong className="text-gray-800 dark:text-gray-200">
							(1.00× equity, first 400 words)
						</strong>
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<svg width="28" height="10">
						<line
							x1="2"
							y1="5"
							x2="20"
							y2="5"
							stroke="#6366f1"
							strokeWidth="1.8"
							strokeDasharray="4 2"
						/>
						<polygon points="18,2 26,5 18,8" fill="#6366f1" />
					</svg>
					<span className="text-gray-600 dark:text-gray-400">
						Focus → Top 3 articles{' '}
						<strong className="text-gray-800 dark:text-gray-200">(0.80× equity)</strong>
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<svg width="28" height="10">
						<line
							x1="2"
							y1="5"
							x2="26"
							y2="5"
							stroke="#f59e0b"
							strokeWidth="1.5"
							strokeDasharray="3 3"
							opacity="0.6"
						/>
					</svg>
					<span className="text-gray-600 dark:text-gray-400">
						Same-group cross-links{' '}
						<strong className="text-gray-800 dark:text-gray-200">(0.80× equity)</strong>
					</span>
				</div>
				{groups.length > 1 && (
					<div className="flex items-center gap-1">
						{groups.map((_, gi) => (
							<span
								key={gi}
								className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
								style={{ background: GROUP_PALETTE[gi % GROUP_PALETTE.length].node }}
							>
								{GROUP_PALETTE[gi % GROUP_PALETTE.length].label}
							</span>
						))}
						<span className="ml-1 text-gray-500 dark:text-gray-400">
							article groups (cross-link within group)
						</span>
					</div>
				)}
			</div>

			{/* Rule callouts */}
			<div className="grid grid-cols-3 gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
				<div className="rounded-lg bg-amber-50 px-3 py-2.5 dark:bg-amber-900/20">
					<p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
						Rule 1 — Critical
					</p>
					<p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-500">
						Every article must link to the focus page. Place it in the{' '}
						<strong>first 400 words</strong> for 1.00× equity.
					</p>
				</div>
				<div className="rounded-lg bg-indigo-50 px-3 py-2.5 dark:bg-indigo-900/20">
					<p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
						Rule 2 — High
					</p>
					<p className="mt-0.5 text-[11px] text-indigo-600 dark:text-indigo-500">
						Focus page links out to at least 3 supporting articles in body text. Establishes
						bidirectional topical relevance.
					</p>
				</div>
				<div className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800">
					<p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
						Rule 3 — Mesh
					</p>
					<p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
						Articles cross-link in groups of 5. Use <strong>2–5 descriptive words</strong> as anchor
						text. Never "click here" or "read more".
					</p>
				</div>
			</div>
		</div>
	);
}

function PriorityBadge({ priority }: { priority: LinkSuggestion['priority'] }) {
	if (priority === 'critical')
		return (
			<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
				Critical
			</span>
		);
	if (priority === 'high')
		return (
			<span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
				High
			</span>
		);
	return (
		<span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
			Medium
		</span>
	);
}

function renderLinkPriorityStars(placement_hint: LinkSuggestion['placement_hint']) {
	if (placement_hint === 'intro')
		return [1, 2, 3, 4, 5].map((i) => <Star key={i} className="size-2 fill-current" />);
	if (placement_hint === 'body')
		return [1, 2, 3, 4].map((i) => <Star key={i} className="size-2 fill-current" />);
	return [1].map((i) => <Star key={i} className="size-2 fill-current" />);
}

function InternalLinksTable({
	pages,
	destination
}: {
	pages: PageData[];
	destination?: { url: string; label: string } | null;
}) {
	const suggestions = useMemo(() => {
		const clusterPages: ClusterPage[] = pages.map((p) => ({
			id: p.id,
			title: p.title,
			keyword: p.keyword,
			type: p.type
		}));
		return generateInternalLinkSuggestions(
			clusterPages,
			[],
			destination?.url && destination?.label ? destination : undefined
		);
	}, [pages, destination]);

	// Group suggestions by from_page_id
	const groups = useMemo(() => {
		const map = new Map<
			string,
			{ pageId: string; pageTitle: string; pageType: string; links: LinkSuggestion[] }
		>();
		for (const s of suggestions) {
			if (!map.has(s.from_page_id)) {
				const page = pages.find((p) => p.id === s.from_page_id);
				map.set(s.from_page_id, {
					pageId: s.from_page_id,
					pageTitle: s.from_title ?? '—',
					pageType: page?.type ?? 'article',
					links: []
				});
			}
			map.get(s.from_page_id)!.links.push(s);
		}
		// Sort: focus_page first, then articles sorted by critical count desc
		return Array.from(map.values()).sort((a, b) => {
			if (a.pageType === 'focus_page') return -1;
			if (b.pageType === 'focus_page') return 1;
			const aCritical = a.links.filter((l) => l.priority === 'critical').length;
			const bCritical = b.links.filter((l) => l.priority === 'critical').length;
			return bCritical - aCritical;
		});
	}, [suggestions, pages]);

	// Track which groups are expanded (default: expand focus page + first 3 articles)
	const [expanded, setExpanded] = React.useState<Set<string>>(() => {
		const defaultOpen = new Set<string>();
		return defaultOpen;
	});
	// Init expanded once groups are ready
	React.useEffect(() => {
		if (groups.length > 0) {
			setExpanded(new Set(groups.slice(0, 4).map((g) => g.pageId)));
		}
	}, [groups.length]); // eslint-disable-line react-hooks/exhaustive-deps

	const toggleGroup = (id: string) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	if (suggestions.length === 0) {
		return (
			<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
				<p className="text-sm text-gray-500 dark:text-gray-400">
					No internal link suggestions right now. Add a focus page and articles to see suggested
					links.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{groups.map((group) => {
				const isOpen = expanded.has(group.pageId);
				const criticalCount = group.links.filter((l) => l.priority === 'critical').length;
				const isFocus = group.pageType === 'focus_page';

				return (
					<div
						key={group.pageId}
						className={cn(
							'overflow-hidden rounded-xl border',
							isFocus
								? 'border-teal-200 dark:border-teal-800'
								: criticalCount > 0
									? 'border-amber-200 dark:border-amber-800'
									: 'border-gray-200 dark:border-gray-700'
						)}
					>
						{/* Page header — click to expand/collapse */}
						<button
							onClick={() => toggleGroup(group.pageId)}
							className={cn(
								'flex w-full items-center justify-between px-4 py-3 text-left transition-colors',
								isFocus
									? 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/20 dark:hover:bg-teal-900/30'
									: criticalCount > 0
										? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30'
										: 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800'
							)}
						>
							<div className="flex min-w-0 items-center gap-2.5">
								<ChevronDownIcon
									className={cn(
										'h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform',
										isOpen && 'rotate-180'
									)}
								/>
								<span
									className={cn(
										'truncate text-[13px] font-semibold',
										isFocus ? 'text-teal-800 dark:text-teal-300' : 'text-gray-900 dark:text-white'
									)}
								>
									{group.pageTitle}
								</span>
								{isFocus && (
									<span className="flex-shrink-0 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-900/40 dark:text-teal-400">
										Focus Page
									</span>
								)}
							</div>
							<div className="ml-3 flex flex-shrink-0 items-center gap-2">
								{criticalCount > 0 && (
									<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
										{criticalCount} critical
									</span>
								)}
								<span className="text-[11px] text-gray-400 dark:text-gray-500">
									{group.links.length} link{group.links.length !== 1 ? 's' : ''}
								</span>
								<Link
									to={`/workspace/${group.pageId}`}
									onClick={(e) => e.stopPropagation()}
									className="text-brand-600 dark:text-brand-400 ml-1 flex-shrink-0 text-[11px] hover:underline"
								>
									Open →
								</Link>
							</div>
						</button>

						{/* Link rows */}
						{isOpen && (
							<div className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
								{group.links.map((s, i) => (
									<div
										key={`${s.from_page_id}-${s.to_page_id || s.to_url}-${i}`}
										className="flex flex-col gap-4 px-5 py-4"
									>
										<div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
											<PriorityBadge priority={s.priority} />
											<span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
												From
											</span>
											<Link
												to={`/workspace/${s.from_page_id}`}
												className="text-brand-600 dark:text-brand-400 text-[13px] font-semibold hover:underline"
											>
												{s.from_title ?? '—'}
											</Link>
											<span className="text-gray-300 dark:text-gray-600">→</span>
											<span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
												To
											</span>
											{s.to_url ? (
												<>
													<a
														href={s.to_url}
														target="_blank"
														rel="noopener noreferrer"
														className="text-brand-600 dark:text-brand-400 text-[13px] font-semibold hover:underline"
													>
														{s.to_title ?? s.anchor_text}
													</a>
													<span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-900/40 dark:text-teal-400">
														Connects to your store
													</span>
												</>
											) : (
												<Link
													to={`/workspace/${s.to_page_id}`}
													className="text-brand-600 dark:text-brand-400 text-[13px] font-semibold hover:underline"
												>
													{s.to_title ?? '—'}
												</Link>
											)}
										</div>

										<div className="flex flex-shrink-0 flex-row items-start justify-between gap-1">
											<p className="text-xs text-gray-400 dark:text-gray-500">
												Use anchor text:{' '}
												<code className="w-fit rounded bg-gray-100 px-2 py-0.5 font-mono text-[12px] text-gray-700 dark:bg-gray-800 dark:text-gray-300">
													"{s.anchor_text}"
												</code>
											</p>
											<div className="flex flex-col items-end justify-end gap-1">
												<div className="flex flex-row items-center gap-2">
													<span className="text-[11px] text-gray-400 dark:text-gray-500">
														{getPlacementLabel(s.placement_hint)}:
													</span>
													<span className="flex flex-row items-center gap-[0.5px] fill-current text-[11px] text-gray-400 dark:text-gray-500">
														{renderLinkPriorityStars(s.placement_hint)}
													</span>
												</div>
												<span className="text-right text-[11px] text-gray-400 dark:text-gray-500">
													{getEquityLabel(s.equity_multiplier)}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

const EDGE_COLORS = {
	light: { implemented: '#0891b2', notImplemented: '#94a3b8' },
	dark: { implemented: '#22d3ee', notImplemented: '#64748b' }
};

const BG_COLORS = { light: '#E8ECF0', dark: '#4b5563' };
const SPREAD_FACTOR = 1.8;

type ClusterNodeData = PageData & { label?: string };

const funnelBorderColors: Record<string, string> = {
	tofu: 'border-l-blue-light-600',
	mofu: 'border-l-warning-600',
	bofu: 'border-l-success-600'
};

function FocusPageNode({ data, selected }: NodeProps) {
	const d = data as ClusterNodeData;
	const statusLabel =
		d.status === 'published' ? 'Published' : d.status === 'draft' ? 'Draft' : 'Planned';
	return (
		<div
			className={cn(
				'relative rounded-lg border border-l-4 border-gray-200 bg-white p-3 text-left shadow-sm dark:border-gray-700 dark:bg-gray-900',
				funnelBorderColors[d.funnel] || 'border-l-blue-light-600',
				selected ? 'ring-brand-500 ring-2' : ''
			)}
		>
			<Handle type="target" position={Position.Left} id="target" />
			<div className="text-brand-600 dark:text-brand-400 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase">
				<CircleDollarSign className="size-3" />
				FOCUS PAGE
			</div>
			<div className="font-montserrat mt-1 text-sm font-bold text-gray-900 dark:text-white">
				{d.title}
			</div>
			<div className="mt-1 font-mono text-[11px] text-gray-500 dark:text-gray-400">
				{d.keyword} · {d.volume.toLocaleString()}
			</div>
			<div className="mt-3 flex gap-2">
				<span
					className={cn(
						'rounded-full px-2 py-0.5 text-[11px] font-semibold',
						d.status === 'published'
							? 'bg-success-600 dark:bg-success-500 text-white'
							: d.status === 'draft'
								? 'bg-warning-500 dark:bg-warning-600 text-white'
								: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
					)}
				>
					{statusLabel}
				</span>
				{(d.croScore ?? 0) > 0 && (
					<span className="bg-warning-500 dark:bg-warning-600 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white">
						CRO {d.croScore}
					</span>
				)}
			</div>
		</div>
	);
}

function ArticleNode({ data, selected }: NodeProps) {
	const d = data as ClusterNodeData;
	const statusLabel =
		d.status === 'published' ? 'Published' : d.status === 'draft' ? 'Draft' : 'Planned';
	const statusColor =
		d.status === 'published'
			? 'text-success-600 dark:text-success-400'
			: d.status === 'draft'
				? 'text-warning-600 dark:text-warning-400'
				: 'text-gray-500 dark:text-gray-400';
	const funnelLabel = d.funnel === 'tofu' ? 'ToFu' : d.funnel === 'mofu' ? 'MoFu' : 'BoFu';
	return (
		<div
			className={cn(
				'relative rounded-lg border border-l-4 border-gray-200 bg-white p-3 text-left shadow-sm dark:border-gray-700 dark:bg-gray-900',
				funnelBorderColors[d.funnel] || 'border-l-blue-light-600',
				selected ? 'ring-brand-500 ring-2' : ''
			)}
		>
			<Handle type="source" position={Position.Right} id="source" />
			<div className="text-[10px] font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
				{funnelLabel}
			</div>
			<div className="mt-1 text-[13px] font-semibold text-gray-900 dark:text-white">{d.title}</div>
			<div className="mt-1 font-mono text-[11px] text-gray-500 dark:text-gray-400">
				{d.keyword} · {d.volume.toLocaleString()}
			</div>
			<div className={cn('mt-2 flex items-center gap-1.5 text-[11px]', statusColor)}>
				<span
					className={cn(
						'size-1.5 rounded-full',
						d.status === 'published'
							? 'bg-success-600'
							: d.status === 'draft'
								? 'bg-warning-500'
								: 'bg-gray-400'
					)}
				/>
				{statusLabel}
			</div>
		</div>
	);
}

const nodeTypes = {
	focusPage: FocusPageNode as React.ComponentType<NodeProps>,
	article: ArticleNode as React.ComponentType<NodeProps>
};
const edgeTypes = { floating: FloatingEdge };

function buildNodesAndEdges(pages: PageData[], theme: 'light' | 'dark') {
	const focusPage = pages.find((p) => p.type === 'focus_page');
	const articles = pages.filter((p) => p.type === 'article');
	const colors = EDGE_COLORS[theme];
	const centerX = focusPage?.position_x ?? 400;
	const centerY = focusPage?.position_y ?? 300;
	const spread = (x: number, y: number) => ({
		x: centerX + (x - centerX) * SPREAD_FACTOR,
		y: centerY + (y - centerY) * SPREAD_FACTOR
	});
	const nodes: Node<ClusterNodeData>[] = [];
	const edges: Edge[] = [];
	if (focusPage) {
		const pos = spread(focusPage.position_x, focusPage.position_y);
		nodes.push({ id: focusPage.id, type: 'focusPage', position: pos, data: focusPage });
	}
	articles.forEach((p) => {
		const pos = spread(p.position_x, p.position_y);
		nodes.push({ id: p.id, type: 'article', position: pos, data: p });
		if (focusPage) {
			const isImplemented = p.status === 'published';
			const strokeColor = isImplemented ? colors.implemented : colors.notImplemented;
			edges.push({
				id: `${p.id}-${focusPage.id}`,
				source: p.id,
				target: focusPage.id,
				type: 'floating',
				markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor },
				style: {
					fill: 'none',
					stroke: strokeColor,
					strokeWidth: isImplemented ? 2 : 1.5,
					...(isImplemented ? {} : { strokeDasharray: '5,5' })
				}
			});
		}
	});
	return { nodes, edges };
}

type TabId = 'journey' | 'map' | 'content' | 'links' | 'settings';

export default function ClusterDetail() {
	const { id } = useParams();
	const { theme } = useTheme();
	const { cluster, loading: clusterLoading, refetch: refetchCluster } = useCluster(id ?? null);
	const {
		pages: dbPages,
		loading: pagesLoading,
		refetch: refetchPages
	} = useClusterPages(id ?? null);
	const {
		intelligence,
		loading: intelligenceLoading,
		error: intelligenceError,
		refetch: refetchIntelligence
	} = useClusterIntelligence(id ?? null);
	const { organization } = useOrganization();
	const navigate = useNavigate();
	const { session } = useAuth();
	const { openCROStudioUpgradeModal } = useCROStudioUpgrade();

	const articleCount = dbPages.filter((p) => p.type === 'article').length;

	const clusterSummary = useMemo(() => {
		const totalVolume = dbPages.reduce((s, p) => s + (p.volume || 0), 0);
		const kds = dbPages
			.filter((p) => p.kd > 0)
			.map((p) => p.kd)
			.sort((a, b) => a - b);
		const medianKd = kds.length
			? kds.length % 2 === 0
				? (kds[kds.length / 2 - 1] + kds[kds.length / 2]) / 2
				: kds[Math.floor(kds.length / 2)]
			: null;
		const cpcsWithVol = dbPages.filter((p) => p.cpc != null && p.volume > 0);
		const avgCpc = cpcsWithVol.length
			? cpcsWithVol.reduce((s, p) => s + p.cpc! * p.volume, 0) /
				cpcsWithVol.reduce((s, p) => s + p.volume, 0)
			: null;
		const intentCounts = { tofu: 0, mofu: 0, bofu: 0 };
		dbPages.forEach((p) => {
			intentCounts[p.funnel]++;
		});
		const primaryIntent = Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0][0] as
			| 'tofu'
			| 'mofu'
			| 'bofu';
		const intentLabel =
			primaryIntent === 'tofu'
				? 'Informational'
				: primaryIntent === 'mofu'
					? 'Commercial'
					: 'Transactional';
		const intentColor =
			primaryIntent === 'tofu'
				? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
				: primaryIntent === 'mofu'
					? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
					: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
		const realDataCount = dbPages.filter((p) => p.volume > 0).length;
		return {
			totalVolume,
			medianKd,
			avgCpc,
			intentCounts,
			primaryIntent,
			intentLabel,
			intentColor,
			realDataCount
		};
	}, [dbPages]);
	const creditsRemaining =
		organization?.included_credits_remaining ?? organization?.included_credits ?? 0;
	const hasCreditsForRegen = creditsRemaining >= CREDIT_COSTS.CLUSTER_GENERATION;

	const {
		runs: clusterRuns,
		loading: runsLoading,
		refetch: refetchRuns,
		deleteRun: deleteClusterRun
	} = useClusterRuns(id ?? null);

	const [activeTab, setActiveTab] = useState<TabId>('map');
	const [addArticleOpen, setAddArticleOpen] = useState(false);
	const [addArticleSubmitting, setAddArticleSubmitting] = useState(false);
	const [addArticleForm, setAddArticleForm] = useState({
		title: '',
		keyword: '',
		funnel: 'mofu' as 'tofu' | 'mofu' | 'bofu'
	});
	const [pageToDelete, setPageToDelete] = useState<PageData | null>(null);
	const [deleteSubmitting, setDeleteSubmitting] = useState(false);
	const [settingsForm, setSettingsForm] = useState({
		title: '',
		targetKeyword: '',
		destinationPageUrl: '',
		destinationPageLabel: ''
	});
	const [settingsSubmitting, setSettingsSubmitting] = useState(false);
	const [openCROStudioLoading, setOpenCROStudioLoading] = useState(false);

	// Regenerate cluster state
	const REGEN_STEPS: TaskStep[] = [
		{ id: 'research', label: 'Running keyword research', status: 'pending' },
		{ id: 'serper', label: 'Scanning Google for related questions', status: 'pending' },
		{ id: 'curate', label: 'AI curating the best article angles', status: 'pending' },
		{ id: 'dedup', label: 'Filtering for relevance and diversity', status: 'pending' },
		{ id: 'build', label: 'Preparing your new suggestions', status: 'pending' }
	];

	const [regenerating, setRegenerating] = useState(false);
	const [regenWidgetOpen, setRegenWidgetOpen] = useState(false);
	const [regenWidgetStatus, setRegenWidgetStatus] = useState<TaskStatus>('running');
	const [regenWidgetSteps, setRegenWidgetSteps] = useState<TaskStep[]>(REGEN_STEPS);
	const [regenWidgetError, setRegenWidgetError] = useState<string | undefined>();
	const [regenPickerOpen, setRegenPickerOpen] = useState(false);
	const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
	const [regenSuggestions, setRegenSuggestions] = useState<ClusterRunSuggestion[]>([]);
	const [regenSelected, setRegenSelected] = useState<Set<number>>(new Set());
	const [regenArticleCount, setRegenArticleCount] = useState(10);

	const handleOpenCROStudio = useCallback(async () => {
		if (!cluster?.destinationPageUrl?.trim()) return;
		if (organization?.has_cro_addon !== true) {
			openCROStudioUpgradeModal();
			return;
		}
		const token = session?.access_token;
		if (!token) {
			toast.error('Please sign in to continue');
			return;
		}
		setOpenCROStudioLoading(true);
		try {
			const res = await api.post('/api/cro-studio/audits', {
				page_url: cluster.destinationPageUrl.trim(),
				page_type: 'destination_page',
				page_label: cluster.destinationPageLabel?.trim() || null,
				cluster_id: cluster.id,
				site_id: cluster.siteId ?? null
			});
			const data = await res.json().catch(() => ({}));
			if (res.ok && data.audit_id) {
				toast.success('Audit complete');
				navigate(`/cro-studio/audit/${data.audit_id}`);
				return;
			}
			if (res.status === 402) {
				toast.error(
					`Insufficient credits. Need ${data.required ?? CREDIT_COSTS.CRO_STUDIO_AUDIT ?? 1}, have ${data.available ?? 0}.`
				);
				return;
			}
			toast.error(data.error ?? data.message ?? 'Failed to run audit');
		} finally {
			setOpenCROStudioLoading(false);
		}
	}, [
		cluster?.destinationPageUrl,
		cluster?.destinationPageLabel,
		cluster?.id,
		cluster?.siteId,
		organization?.has_cro_addon,
		session?.access_token,
		navigate,
		openCROStudioUpgradeModal
	]);
	const [addingSelected, setAddingSelected] = useState(false);

	const pagesForFlow = useMemo(() => {
		return dbPages.map((p) => ({
			id: p.id,
			clusterId: p.clusterId,
			title: p.title,
			type: p.type,
			keyword: p.keyword,
			volume: p.volume,
			kd: p.kd,
			funnel: p.funnel,
			status: p.status,
			seoScore: p.seoScore,
			croScore: p.croScore ?? 0,
			wordCount: p.wordCount,
			targetWordCount: p.targetWordCount,
			position_x: p.position_x,
			position_y: p.position_y
		}));
	}, [dbPages]);

	const { nodes: initialNodes, edges: initialEdges } = useMemo(
		() => buildNodesAndEdges(pagesForFlow, theme),
		[pagesForFlow, theme]
	);
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
	const [selectedNode, setSelectedNode] = useState<Node<ClusterNodeData> | null>(null);

	useEffect(() => {
		setNodes(initialNodes);
		setEdges(initialEdges);
	}, [initialNodes, initialEdges, setNodes, setEdges]);

	const onNodeClick = useCallback((_: React.MouseEvent, node: Node<ClusterNodeData>) => {
		setSelectedNode(node);
	}, []);
	const onPaneClick = useCallback(() => setSelectedNode(null), []);

	const totalPieces = dbPages.length;
	const completedPieces = dbPages.filter(
		(p) => p.status === 'published' || p.status === 'draft'
	).length;
	const selectedPage = selectedNode ? dbPages.find((p) => p.id === selectedNode.id) : null;

	// Sync settings form when cluster loads
	useEffect(() => {
		if (cluster)
			setSettingsForm({
				title: cluster.title,
				targetKeyword: cluster.targetKeyword,
				destinationPageUrl: cluster.destinationPageUrl ?? '',
				destinationPageLabel: cluster.destinationPageLabel ?? ''
			});
	}, [cluster]);

	// Switch to Internal Links tab when navigating via #internal-links (e.g. from ReverseSiloAlert)
	useEffect(() => {
		if (window.location.hash === '#internal-links') setActiveTab('links');
	}, [id]);

	const handleAddArticle = useCallback(async () => {
		if (!cluster || !id) return;
		const title = addArticleForm.title.trim() || 'New Article';
		const keyword = addArticleForm.keyword.trim() || title;

		// S2-3: Cannibalization check before adding article
		if (keyword && cluster.siteId) {
			try {
				const {
					data: { session }
				} = await supabase.auth.getSession();
				const token = session?.access_token;
				if (token) {
					const res = await api.get(
						`/api/sites/${cluster.siteId}/check-cannibalization?keyword=${encodeURIComponent(keyword)}`
					);
					if (res.ok) {
						const data = (await res.json()) as {
							hasConflict?: boolean;
							conflict?: { keyword: string; pages: Array<{ title: string }> };
						};
						if (data.hasConflict && data.conflict) {
							const pageList = data.conflict.pages.map((p) => p.title).join(', ');
							const proceed = window.confirm(
								`Keyword cannibalization: "${data.conflict.keyword}" is already targeted by ${pageList}. Adding this article will split ranking signals. Consolidate or differentiate keywords instead. Proceed anyway?`
							);
							if (!proceed) return;
						}
					}
				}
			} catch {
				// silent — proceed if check fails
			}
		}

		setAddArticleSubmitting(true);
		try {
			const articles = dbPages.filter((p) => p.type === 'article');
			const focusPage = dbPages.find((p) => p.type === 'focus_page');
			const centerX = focusPage?.position_x ?? 400;
			const centerY = focusPage?.position_y ?? 300;
			const radius = 150;
			const angle = (articles.length * 60 * Math.PI) / 180;
			const position_x = Math.round(centerX + radius * Math.cos(angle));
			const position_y = Math.round(centerY + radius * Math.sin(angle));
			const { error } = await supabase.from('pages').insert({
				cluster_id: id,
				site_id: cluster.siteId,
				type: 'article',
				title,
				keyword,
				monthly_searches: 0,
				keyword_difficulty: 30,
				funnel_stage: addArticleForm.funnel,
				status: 'planned',
				target_word_count: 1000,
				sort_order: dbPages.length + 1,
				position_x,
				position_y
			});
			if (error) throw error;
			toast.success('Article added');
			setAddArticleOpen(false);
			setAddArticleForm({ title: '', keyword: '', funnel: 'mofu' });
			await refetchPages();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to add article');
		} finally {
			setAddArticleSubmitting(false);
		}
	}, [cluster, id, dbPages, addArticleForm, refetchPages]);

	const handleDeletePage = useCallback(async () => {
		if (!pageToDelete) return;
		setDeleteSubmitting(true);
		try {
			const { error } = await supabase.from('pages').delete().eq('id', pageToDelete.id);
			if (error) throw error;
			toast.success('Removed from cluster');
			setPageToDelete(null);
			setSelectedNode(null);
			await refetchPages();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to remove');
		} finally {
			setDeleteSubmitting(false);
		}
	}, [pageToDelete, refetchPages]);

	const handleRegenerate = useCallback(async () => {
		if (!id) return;
		setRegenerating(true);
		// Open widget
		setRegenWidgetSteps(
			REGEN_STEPS.map((s, i) => ({
				...s,
				status: (i === 0 ? 'active' : 'pending') as 'active' | 'pending'
			}))
		);
		setRegenWidgetStatus('running');
		setRegenWidgetError(undefined);
		setRegenWidgetOpen(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in');
				setRegenWidgetStatus('error');
				setRegenWidgetError('Not signed in.');
				return;
			}
			const res = await api.post(`/api/clusters/${id}/regenerate`, {
				maxArticles: regenArticleCount
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				if (res.status === 402) {
					const msg = `Not enough credits. Need ${data.required ?? CREDIT_COSTS.CLUSTER_GENERATION}, you have ${data.available ?? 0}.`;
					toast.error(msg);
					setRegenWidgetStatus('error');
					setRegenWidgetError(msg);
					return;
				}
				throw new Error(data?.error || 'Failed to regenerate');
			}

			// Consume NDJSON stream
			const reader = res.body?.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			let result: { suggestions?: ClusterRunSuggestion[]; runId?: string | null } = {};

			const processNdjsonLine = (line: string) => {
				if (!line.trim()) return;
				try {
					const ev = JSON.parse(line) as {
						type: string;
						id?: string;
						message?: string;
						suggestions?: ClusterRunSuggestion[];
						runId?: string | null;
					};
					if (ev.type === 'step' && ev.id) {
						setRegenWidgetSteps((prev) => {
							const stepIdx = REGEN_STEPS.findIndex((st) => st.id === ev.id);
							if (stepIdx === -1) return prev;
							return prev.map((s, i) => {
								if (i <= stepIdx) return { ...s, status: 'complete' as const };
								if (i === stepIdx + 1) return { ...s, status: 'active' as const };
								return s;
							});
						});
					} else if (ev.type === 'done') {
						result = { suggestions: ev.suggestions, runId: ev.runId };
					} else if (ev.type === 'error') {
						throw new Error(ev.message ?? 'Failed to regenerate');
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
						if (buffer.trim()) {
							processNdjsonLine(buffer);
							buffer = '';
						}
						break;
					}
				}
			}

			setRegenWidgetStatus('done');
			const suggestions: ClusterRunSuggestion[] = result.suggestions ?? [];
			setRegenSuggestions(suggestions);
			const existingNorm = new Set(dbPages.map((p) => p.keyword.toLowerCase().trim()));
			setRegenSelected(
				new Set(
					suggestions
						.map((_, i) => i)
						.filter((i) => !existingNorm.has(suggestions[i].keyword.toLowerCase().trim()))
				)
			);
			// Brief pause so user sees the "done" state before picker opens
			setTimeout(() => setRegenPickerOpen(true), 800);
			await refetchRuns();
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to regenerate cluster';
			toast.error(msg);
			setRegenWidgetStatus('error');
			setRegenWidgetError(msg);
		} finally {
			setRegenerating(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, regenArticleCount, dbPages, refetchRuns]);

	const handleOpenRunPicker = useCallback(
		(suggestions: ClusterRunSuggestion[]) => {
			const existingNorm = new Set(dbPages.map((p) => p.keyword.toLowerCase().trim()));
			setRegenSuggestions(suggestions);
			setRegenSelected(
				new Set(
					suggestions
						.map((_, i) => i)
						.filter((i) => !existingNorm.has(suggestions[i].keyword.toLowerCase().trim()))
				)
			);
			setRegenPickerOpen(true);
		},
		[dbPages]
	);

	const handleAddSelected = useCallback(async () => {
		if (!cluster || !id) return;
		const toAdd = [...regenSelected].map((i) => regenSuggestions[i]).filter(Boolean);
		if (toAdd.length === 0) {
			toast('No articles selected');
			return;
		}
		setAddingSelected(true);
		try {
			const focusPage = dbPages.find((p) => p.type === 'focus_page');
			const existingArticles = dbPages.filter((p) => p.type === 'article');
			const centerX = focusPage?.position_x ?? 400;
			const centerY = focusPage?.position_y ?? 300;
			const rows = toAdd.map((s, idx) => {
				const angle = ((existingArticles.length + idx) * 60 * Math.PI) / 180;
				const radius = 150 + Math.floor((existingArticles.length + idx) / 6) * 80;
				return {
					cluster_id: id,
					site_id: cluster.siteId,
					type: 'article',
					title: s.keyword.charAt(0).toUpperCase() + s.keyword.slice(1),
					keyword: s.keyword,
					monthly_searches: s.monthly_searches,
					keyword_difficulty: s.keyword_difficulty,
					cpc: s.cpc,
					funnel_stage: s.funnel_stage,
					page_type: s.page_type,
					status: 'planned',
					target_word_count: 900,
					sort_order: dbPages.length + idx + 1,
					position_x: Math.round(centerX + radius * Math.cos(angle)),
					position_y: Math.round(centerY + radius * Math.sin(angle))
				};
			});
			const { error } = await supabase.from('pages').insert(rows);
			if (error) throw error;
			toast.success(`Added ${toAdd.length} article${toAdd.length !== 1 ? 's' : ''} to cluster`);
			setRegenPickerOpen(false);
			await refetchPages();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to add articles');
		} finally {
			setAddingSelected(false);
		}
	}, [cluster, id, regenSelected, regenSuggestions, dbPages, refetchPages]);

	const handleSaveSettings = useCallback(async () => {
		if (!cluster || !id) return;
		setSettingsSubmitting(true);
		try {
			const newTitle = settingsForm.title.trim() || cluster.title;
			const newKeyword = settingsForm.targetKeyword.trim() || cluster.targetKeyword;
			const destUrl = settingsForm.destinationPageUrl.trim() || null;
			const destLabel = settingsForm.destinationPageLabel.trim() || null;
			const hasDestination = !!destUrl;
			const keywordChanged = newKeyword !== cluster.targetKeyword;
			const titleChanged = newTitle !== cluster.title;

			// 1. Update the cluster
			const { error: clusterErr } = await supabase
				.from('clusters')
				.update({
					title: newTitle,
					target_keyword: newKeyword,
					...(hasDestination
						? {
								architecture: 'B',
								destination_page_url: destUrl,
								destination_page_label: destLabel || destUrl
							}
						: {
								architecture: 'A',
								destination_page_url: null,
								destination_page_label: null
							}),
					updated_at: new Date().toISOString()
				})
				.eq('id', id);
			if (clusterErr) throw clusterErr;

			// 2. Sync the parent topic — keyword and title stay in lockstep
			if (cluster.topicId && (keywordChanged || titleChanged)) {
				const { error: topicErr, count } = await supabase
					.from('topics')
					.update({
						...(keywordChanged && { keyword: newKeyword }),
						...(titleChanged && { title: newTitle })
					})
					.eq('id', cluster.topicId)
					.select('id')
					.limit(1);
				if (topicErr) {
					console.error('[ClusterDetail] Topic sync error:', topicErr);
					throw new Error(`Cluster saved but topic sync failed: ${topicErr.message}`);
				}
				if (count === 0) {
					console.warn(
						'[ClusterDetail] Topic sync: 0 rows updated — RLS may be blocking. Run migration: 2026-03-04_topics_update_rls.sql'
					);
					throw new Error(
						'Cluster saved but topic sync was blocked. Run the topics update RLS migration in Supabase.'
					);
				}
			} else if (!cluster.topicId) {
				console.warn('[ClusterDetail] No topicId on cluster — cannot sync to parent topic');
			}

			// 3. Sync the cluster's focus page keyword so the workspace uses the right keyword
			if (keywordChanged) {
				const { error: pageErr } = await supabase
					.from('pages')
					.update({ keyword: newKeyword })
					.eq('cluster_id', id)
					.eq('type', 'focus_page');
				if (pageErr)
					console.warn('[ClusterDetail] Focus page keyword sync error:', pageErr.message);
			}

			toast.success('Cluster updated');
			await refetchCluster();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save');
		} finally {
			setSettingsSubmitting(false);
		}
	}, [cluster, id, settingsForm, refetchCluster]);

	if (id && clusterLoading && !cluster) {
		return (
			<div className="flex h-[calc(100vh-120px)] items-center justify-center">
				<p className="text-gray-500 dark:text-gray-400">Loading cluster…</p>
			</div>
		);
	}

	if (id && !clusterLoading && !cluster) {
		return (
			<div className="flex h-[calc(100vh-120px)] flex-col items-center justify-center gap-4">
				<p className="text-gray-600 dark:text-gray-400">Cluster not found.</p>
				<Link to="/clusters">
					<Button variant="outline">Back to Clusters</Button>
				</Link>
			</div>
		);
	}

	const displayCluster = cluster!;
	// Derive funnel coverage live from actual pages (the stored JSON is never updated after creation)
	const funnelCoverage = {
		tofu: dbPages.filter((p) => p.funnel === 'tofu').length,
		mofu: dbPages.filter((p) => p.funnel === 'mofu').length,
		bofu: dbPages.filter((p) => p.funnel === 'bofu').length
	};

	const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
		{ id: 'map', label: 'Visual Map', icon: MapIcon },
		{ id: 'journey', label: 'Customer Journey', icon: Route },
		{ id: 'content', label: 'Content List', icon: List },
		{ id: 'links', label: 'Internal Links', icon: Link2 },
		{ id: 'settings', label: 'Cluster Settings', icon: Settings }
	];

	return (
		<>
			<PageMeta title={displayCluster.title} description="Cluster detail" noIndex />

			<div className="h-screen-height-visible flex min-h-0 flex-col">
				<PageHeader
					title={displayCluster.title}
					breadcrumb={
						<>
							<Link to="/strategy" className="text-brand-600 dark:text-brand-400 hover:underline">
								Strategy
							</Link>
							<span className="mx-1 text-gray-500 dark:text-gray-400">›</span>
							<Link to="/clusters" className="text-brand-600 dark:text-brand-400 hover:underline">
								Clusters
							</Link>
							<span className="mx-1 text-gray-500 dark:text-gray-400">›</span>
							<span className="text-gray-900 dark:text-white">{displayCluster.title}</span>
						</>
					}
					subtitle={`1 focus page + ${articleCount} supporting article${articleCount !== 1 ? 's' : ''} covering the complete topic · ${completedPieces} of ${totalPieces} complete`}
					rightContent={
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								className="border-gray-200 dark:border-gray-700"
								startIcon={<Plus className="size-4" />}
								onClick={() => setAddArticleOpen(true)}
							>
								Add Article
							</Button>
							<Button
								className="bg-brand-500 hover:bg-brand-600 text-white"
								disabled={regenerating || !hasCreditsForRegen}
								onClick={() => setConfirmRegenOpen(true)}
							>
								<CreditBadge
									cost={CREDIT_COSTS.CLUSTER_GENERATION}
									action="Regenerate"
									sufficient={hasCreditsForRegen}
								/>
								{regenerating ? (
									<Loader2 className="ml-2 size-4 animate-spin" />
								) : (
									<RefreshCw className="ml-2 size-4" />
								)}
								<span className="ml-1.5">
									{regenerating ? 'Researching...' : 'Regenerate Cluster'}
								</span>
							</Button>
						</div>
					}
				/>

				{/* Cluster health bar */}
				<div className="mt-6 flex min-h-0 flex-1 flex-col border border-gray-200 dark:border-gray-700">
					<div className="flex flex-wrap items-center gap-8 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-900">
						<div>
							<div className="text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">
								Funnel Coverage
							</div>
							<div className="flex h-2 w-40 overflow-hidden rounded-full">
								<div
									className="bg-blue-light-500 opacity-70"
									style={{ width: `${Math.max(1, (funnelCoverage.tofu || 0) * 10)}%` }}
								/>
								<div
									className="bg-warning-500"
									style={{ width: `${Math.max(1, (funnelCoverage.mofu || 0) * 10)}%` }}
								/>
								<div
									className="bg-success-600"
									style={{ width: `${Math.max(1, (funnelCoverage.bofu || 0) * 10)}%` }}
								/>
							</div>
							<p className="mt-1 flex flex-col gap-0.5 text-[11px]">
								{totalPieces === 0 ? (
									<span className="text-warning-600 dark:text-warning-400">
										Add articles to build your cluster
									</span>
								) : (
									<>
										<span className="text-blue-light-600 dark:text-blue-light-400">
											Supporting articles (ToFu)
										</span>
										<span className="leading-none text-gray-400">↓</span>
										<span className="text-warning-600 dark:text-warning-400">
											Focus page (MoFu)
										</span>
										<span className="leading-none text-gray-400">↓</span>
										<span className="text-success-600 dark:text-success-400">
											Destination (separate)
										</span>
									</>
								)}
							</p>
						</div>
						<div>
							<div className="text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">
								CRO Score
							</div>
							<div className="font-montserrat text-warning-600 dark:text-warning-400 text-2xl font-extrabold">
								{displayCluster.croScore ?? 0}/100
							</div>
						</div>
						<div>
							<div className="text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">
								Authority Fit
							</div>
							<div className="text-brand-600 dark:text-brand-400 flex items-center gap-1.5 text-sm font-semibold">
								<Check className="size-4" />
								Achievable Now
							</div>
						</div>
						<div>
							<div className="text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">
								Completion
							</div>
							<div className="text-sm font-semibold text-gray-900 dark:text-white">
								{completedPieces} of {totalPieces} pieces
							</div>
						</div>
						<div className="ml-auto max-w-md">
							{(() => {
								const tofu = funnelCoverage.tofu ?? 0;
								const mofu = funnelCoverage.mofu ?? 0;
								const remaining = totalPieces - completedPieces;
								// Clusters: ToFu supporting articles + 1 MoFu focus page. BoFu is the destination page (outside clusters).
								const breakdown = [
									tofu > 0 ? `${tofu} supporting article${tofu !== 1 ? 's' : ''} (ToFu)` : '',
									mofu > 0 ? '1 focus page (MoFu)' : ''
								]
									.filter(Boolean)
									.join(', ');

								let variant: 'success' | 'info' | 'warning' = 'success';
								let message: string;

								if (completedPieces === totalPieces && totalPieces > 0) {
									variant = 'success';
									message = `All ${totalPieces} piece${totalPieces !== 1 ? 's' : ''} are drafted or published — this cluster is fully covered. Make sure every article links back to the focus page.`;
								} else if (remaining > 0) {
									variant = 'info';
									message = `${articleCount} article${articleCount !== 1 ? 's' : ''} planned${breakdown ? ` (${breakdown})` : ''}. ${remaining} piece${remaining !== 1 ? 's' : ''} left to write. Articles build topical authority and link to your focus page — the destination (pricing, signup) lives outside the cluster.`;
								} else {
									variant = 'success';
									message = `${articleCount} article${articleCount !== 1 ? 's' : ''} ${breakdown ? `(${breakdown})` : ''}. Everything is written. Make sure internal links between articles and the focus page are in place.`;
								}

								return (
									<AIInsightBlock
										variant={variant}
										compact
										label="CLUSTER INSIGHT"
										message={message}
									/>
								);
							})()}
						</div>
					</div>

					{/* Reverse silo: alert when articles lack link to focus page (V1: no internal_links table yet, so 0) */}
					{id && <ReverseSiloAlert missingCount={0} clusterId={id} />}

					{/* Content: left nav + main + right panel (for map only) */}
					<div className="flex h-full min-h-0 flex-1 overflow-hidden">
						<div className="w-[200px] shrink-0 border-r border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
							<nav className="space-y-1">
								{tabs.map(({ id: tabId, label, icon: Icon }) => (
									<button
										key={tabId}
										type="button"
										onClick={() => setActiveTab(tabId)}
										className={cn(
											'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm',
											activeTab === tabId
												? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 font-semibold'
												: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
										)}
									>
										<Icon className="size-4 shrink-0" />
										{label}
									</button>
								))}
							</nav>
						</div>

						{/* Main content by tab */}
						<div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
							{activeTab === 'journey' && (
								<div className="flex-1 overflow-auto p-6">
									{pagesLoading ? (
										<div className="flex h-64 items-center justify-center">
											<p className="text-gray-500 dark:text-gray-400">Loading…</p>
										</div>
									) : (
										<>
											<FunnelVisualizer
												pages={dbPages}
												destinationUrl={displayCluster.destinationPageUrl}
												destinationLabel={displayCluster.destinationPageLabel}
												warnings={intelligence?.warnings?.slice(0, 2) ?? []}
												onAddDestination={() => setActiveTab('settings')}
												onAddArticle={() => setAddArticleOpen(true)}
												hasCROAddon={organization?.has_cro_addon === true}
												onOpenCROStudio={handleOpenCROStudio}
												openCROStudioLoading={openCROStudioLoading}
												onUnlockCROStudio={openCROStudioUpgradeModal}
											/>
											<ClusterHealthCheck
												intelligence={intelligence ?? null}
												loading={intelligenceLoading}
												error={intelligenceError}
												onRefetch={refetchIntelligence}
											/>
										</>
									)}
								</div>
							)}

							{activeTab === 'map' && (
								<div className="flex min-h-0 flex-1">
									<div className="relative flex-1">
										{pagesLoading ? (
											<div className="flex h-full items-center justify-center">
												<p className="text-gray-500 dark:text-gray-400">Loading map…</p>
											</div>
										) : (
											<ReactFlow
												nodes={nodes}
												edges={edges}
												onNodesChange={onNodesChange}
												onEdgesChange={onEdgesChange}
												onNodeClick={onNodeClick}
												onPaneClick={onPaneClick}
												nodeTypes={nodeTypes}
												edgeTypes={edgeTypes}
												colorMode={theme}
												fitView
												fitViewOptions={{ padding: 0.2, duration: 0 }}
											>
												<Background gap={20} color={BG_COLORS[theme]} />
												<Controls className="!rounded-lg !border !border-gray-200 !bg-white !shadow-sm dark:!border-gray-700 dark:!bg-gray-900" />
											</ReactFlow>
										)}
									</div>
									{/* Right detail panel (map only) */}
									<div className="flex min-h-0 w-[300px] shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
										{selectedNode && selectedPage ? (
											<>
												<div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
													<h3 className="font-montserrat text-base font-bold text-gray-900 dark:text-white">
														{selectedPage.title}
													</h3>
													<button
														onClick={() => setSelectedNode(null)}
														className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
													>
														<X className="size-4" />
													</button>
												</div>
												<div className="h-0 min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-5 pb-28">
													<div className="space-y-2.5 border-b border-gray-200 py-2.5 text-[13px] dark:border-gray-700">
														<div className="flex justify-between">
															<span className="text-gray-500 dark:text-gray-400">Content Type</span>
															<span className="text-gray-900 dark:text-white">
																{selectedPage.type === 'focus_page' ? 'Focus Page' : 'Blog Article'}
															</span>
														</div>
														<div className="flex justify-between">
															<span className="text-gray-500 dark:text-gray-400">Funnel Stage</span>
															<FunnelTag stage={selectedPage.funnel} />
														</div>
														<div className="flex justify-between">
															<span className="text-gray-500 dark:text-gray-400">
																Target Keyword
															</span>
															<span className="text-brand-600 dark:text-brand-400 font-mono text-xs">
																{selectedPage.keyword}
															</span>
														</div>
														<div className="flex justify-between">
															<span className="text-gray-500 dark:text-gray-400">
																Monthly Volume
															</span>
															<span className="text-gray-900 dark:text-white">
																{selectedPage.volume.toLocaleString()}
															</span>
														</div>
														<div className="flex justify-between">
															<span className="text-gray-500 dark:text-gray-400">Status</span>
															<span
																className={
																	selectedPage.status === 'published'
																		? 'text-success-600 dark:text-success-400'
																		: selectedPage.status === 'draft'
																			? 'text-warning-600 dark:text-warning-400'
																			: 'text-gray-500 dark:text-gray-400'
																}
															>
																{selectedPage.status}
															</span>
														</div>
													</div>
													<div className="mt-4">
														<AIInsightBlock
															variant="info"
															label={
																selectedPage.type === 'focus_page'
																	? 'FOCUS PAGE'
																	: 'WHY THIS ARTICLE'
															}
															compact
															message={
																selectedPage.type === 'focus_page'
																	? `Your cluster hub for "${selectedPage.keyword}". Nail the brief and word count here; supporting articles link back to strengthen rankings.`
																	: `Targets "${selectedPage.keyword}" (${selectedPage.volume.toLocaleString()}/mo). Supports your focus page and captures ${selectedPage.funnel === 'tofu' ? 'early-stage' : selectedPage.funnel === 'mofu' ? 'mid-funnel' : 'high-intent'} traffic.`
															}
														/>
													</div>
													<div className="mt-5 flex flex-col gap-2">
														<Link to={`/workspace/${selectedPage.id}`}>
															<Button className="bg-brand-500 hover:bg-brand-600 w-full text-white">
																Open in Workspace →
															</Button>
														</Link>
														{selectedPage.type === 'article' && (
															<Button
																variant="ghost"
																className="text-error-600 dark:text-error-400 w-full"
																onClick={() => setPageToDelete(selectedPage)}
															>
																Remove from Cluster
															</Button>
														)}
													</div>
												</div>
											</>
										) : (
											<div className="flex flex-col items-center justify-center p-8 text-center">
												<p className="text-sm text-gray-500 dark:text-gray-400">
													Click any node to see details and open the editor.
												</p>
												<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
													{totalPieces} pieces · Est.{' '}
													{(displayCluster.estimatedTraffic || 0).toLocaleString()} visits
												</p>
											</div>
										)}
									</div>
								</div>
							)}

							{activeTab === 'content' && (
								<div className="flex-1 overflow-auto p-6">
									{pagesLoading ? (
										<p className="text-gray-500 dark:text-gray-400">Loading…</p>
									) : dbPages.length === 0 ? (
										<p className="text-gray-500 dark:text-gray-400">
											No content yet. Add an article above.
										</p>
									) : (
										<>
											{/* Cluster keyword summary */}
											<div className="mb-4 grid grid-cols-4 gap-3">
												<div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
													<div className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
														Total Volume/mo
													</div>
													<div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
														{clusterSummary.totalVolume > 0
															? clusterSummary.totalVolume.toLocaleString()
															: '—'}
													</div>
													<div className="mt-0.5 text-[11px] text-gray-400">
														{clusterSummary.realDataCount} of {dbPages.length} pages have data
													</div>
												</div>
												<div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
													<div className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
														Avg Competition
													</div>
													<div
														className={`mt-1 text-xl font-bold ${
															clusterSummary.medianKd == null
																? 'text-gray-400'
																: clusterSummary.medianKd < 25
																	? 'text-success-600'
																	: clusterSummary.medianKd <= 45
																		? 'text-warning-600'
																		: 'text-error-600'
														}`}
													>
														{clusterSummary.medianKd != null
															? `${Math.round(clusterSummary.medianKd)}%`
															: '—'}
													</div>
													<div className="mt-0.5 text-[11px] text-gray-400">
														median across all pages
													</div>
												</div>
												<div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
													<div className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
														Avg Ad Value (US)
													</div>
													<div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
														{clusterSummary.avgCpc != null
															? `$${clusterSummary.avgCpc.toFixed(2)}`
															: '—'}
													</div>
													<div className="mt-0.5 text-[11px] text-gray-400">
														volume-weighted avg CPC
													</div>
												</div>
												<div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
													<div className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
														Primary Intent
													</div>
													<div className="mt-1">
														<span
															className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${clusterSummary.intentColor}`}
														>
															{clusterSummary.intentLabel}
														</span>
													</div>
													<div className="mt-0.5 text-[11px] text-gray-400">
														Info {clusterSummary.intentCounts.tofu} · Commercial{' '}
														{clusterSummary.intentCounts.mofu} · Transact.{' '}
														{clusterSummary.intentCounts.bofu}
													</div>
												</div>
											</div>

											<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
												<table className="w-full">
													<thead>
														<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
															<th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">
																Title
															</th>
															<th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">
																Page Type
															</th>
															<th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">
																Intent
															</th>
															<th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">
																Volume/mo
															</th>
															<th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">
																KD%
															</th>
															<th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">
																Ad Value
															</th>
															<th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">
																Status
															</th>
															<th className="w-[180px] px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">
																Actions
															</th>
														</tr>
													</thead>
													<tbody>
														{dbPages.map((p) => {
															const kdColor =
																p.kd === 0
																	? 'text-gray-400'
																	: p.kd < 25
																		? 'text-success-600 font-semibold'
																		: p.kd <= 45
																			? 'text-warning-600 font-semibold'
																			: 'text-error-600 font-semibold';
															return (
																<tr
																	key={p.id}
																	className="border-b border-gray-200 last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
																>
																	<td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
																		<div className="flex items-center gap-2">
																			{p.type === 'focus_page' && (
																				<span className="bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 rounded-full px-2 py-0.5 text-[10px] font-semibold">
																					Focus
																				</span>
																			)}
																			<span>{p.title}</span>
																		</div>
																		{p.keyword && p.keyword !== p.title && (
																			<div className="mt-0.5 font-mono text-[11px] text-gray-400">
																				{p.keyword}
																			</div>
																		)}
																	</td>
																	<td className="px-4 py-3">
																		{(() => {
																			const pt = p.pageType ?? detectPageType(p.keyword);
																			return (
																				<span
																					className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${pageTypeColor(pt)}`}
																				>
																					{formatPageTypeDisplay(pt)}
																				</span>
																			);
																		})()}
																	</td>
																	<td className="px-4 py-3">
																		<FunnelTag
																			stage={p.type === 'focus_page' ? 'money' : p.funnel}
																			showTooltip
																		/>
																	</td>
																	<td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
																		{p.volume > 0 ? (
																			p.volume.toLocaleString()
																		) : (
																			<span className="text-gray-400">—</span>
																		)}
																	</td>
																	<td className={`px-4 py-3 text-right text-sm ${kdColor}`}>
																		{p.kd > 0 ? (
																			`${p.kd}%`
																		) : (
																			<span className="text-gray-400">—</span>
																		)}
																	</td>
																	<td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
																		{p.cpc != null ? (
																			`$${p.cpc.toFixed(2)}`
																		) : (
																			<span className="text-gray-400">—</span>
																		)}
																	</td>
																	<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
																		{p.status}
																	</td>
																	<td className="px-4 py-3 text-right">
																		<Link to={`/workspace/${p.id}`}>
																			<Button size="sm" variant="outline" className="mr-2">
																				Open
																			</Button>
																		</Link>
																		{p.type === 'article' && (
																			<Button
																				size="sm"
																				variant="ghost"
																				className="text-error-600 dark:text-error-400"
																				onClick={() => setPageToDelete(p)}
																			>
																				<Trash2 className="size-4" />
																			</Button>
																		)}
																	</td>
																</tr>
															);
														})}
													</tbody>
												</table>
											</div>
										</>
									)}
								</div>
							)}

							{activeTab === 'links' && (
								<div id="internal-links" className="flex-1 overflow-auto p-6">
									<AIInsightBlock
										variant="info"
										label="INTERNAL LINKS · REVERSE SILO"
										message={
											<span>
												Every article must link to the focus page in the first 400 words (1.00×
												equity). Articles cross-link in groups of 5. The focus page links back to at
												least 3 articles. This is the{' '}
												<a
													href={`${MARKETING_URL}/blog/glossary/reverse-silo-internal-linking-strategy`}
													target="_blank"
													rel="noopener noreferrer"
													className="text-brand-600 dark:text-brand-400"
												>
													reverse silo model
												</a>{' '}
												— link equity flows upward to your money page.
											</span>
										}
									/>
									<div className="mt-4">
										<ReverseSiloMap pages={dbPages} />
									</div>
									<div className="mt-6">
										<p className="mb-3 text-[12px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
											Suggested Links
										</p>
										<InternalLinksTable
											pages={dbPages}
											destination={
												cluster?.destinationPageUrl && cluster?.destinationPageLabel
													? { url: cluster.destinationPageUrl, label: cluster.destinationPageLabel }
													: null
											}
										/>
									</div>
								</div>
							)}

							{activeTab === 'settings' && cluster && (
								<div className="flex-1 space-y-6 overflow-auto p-6">
									<div className="max-w-md rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
										<h3 className="font-montserrat text-lg font-bold text-gray-900 dark:text-white">
											Cluster Settings
										</h3>
										<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
											Update the cluster title and target keyword.
										</p>
										<div className="mt-6 grid gap-4">
											<InputField
												label="Title"
												value={settingsForm.title}
												onChange={(e) => setSettingsForm((f) => ({ ...f, title: e.target.value }))}
											/>
											<InputField
												label="Target keyword"
												value={settingsForm.targetKeyword}
												onChange={(e) =>
													setSettingsForm((f) => ({ ...f, targetKeyword: e.target.value }))
												}
											/>
											<div className="space-y-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
												<p className="text-xs font-medium text-gray-700 dark:text-gray-300">
													Destination page (optional)
												</p>
												<p className="text-[11px] text-gray-500 dark:text-gray-400">
													Does this cluster drive visitors to a product page, signup page, or
													service booking page?
												</p>
												<InputField
													label="Page URL"
													value={settingsForm.destinationPageUrl}
													onChange={(e) =>
														setSettingsForm((f) => ({ ...f, destinationPageUrl: e.target.value }))
													}
													placeholder="https://yoursite.com/product"
												/>
												<InputField
													label="Page label"
													value={settingsForm.destinationPageLabel}
													onChange={(e) =>
														setSettingsForm((f) => ({ ...f, destinationPageLabel: e.target.value }))
													}
													placeholder="e.g. Product Page"
												/>
											</div>
											<Button
												className="bg-brand-500 hover:bg-brand-600 text-white"
												onClick={handleSaveSettings}
												disabled={settingsSubmitting}
											>
												{settingsSubmitting ? 'Saving…' : 'Save changes'}
											</Button>
										</div>
									</div>

									{/* Regenerate settings + past runs */}
									<div className="max-w-2xl rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
										<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
											<div className="flex items-center gap-2">
												<RefreshCw className="size-4 text-gray-400" />
												<span className="font-semibold text-gray-800 dark:text-gray-200">
													Regenerate Cluster
												</span>
											</div>
											<div className="flex items-center gap-3">
												<label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
													Articles to suggest:
													<input
														type="number"
														min={3}
														max={20}
														value={regenArticleCount}
														onChange={(e) =>
															setRegenArticleCount(
																Math.max(3, Math.min(20, Number(e.target.value)))
															)
														}
														className="w-16 rounded-md border border-gray-200 bg-white px-2 py-1 text-center text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
													/>
												</label>
												<Button
													className="bg-brand-500 hover:bg-brand-600 text-white"
													size="sm"
													disabled={regenerating || !hasCreditsForRegen}
													onClick={() => setConfirmRegenOpen(true)}
												>
													<CreditBadge
														cost={CREDIT_COSTS.CLUSTER_GENERATION}
														action="Regenerate"
														sufficient={hasCreditsForRegen}
													/>
													{regenerating ? (
														<Loader2 className="ml-2 size-3 animate-spin" />
													) : (
														<Sparkles className="ml-2 size-3" />
													)}
													<span className="ml-1">
														{regenerating ? 'Researching...' : 'Run New Research'}
													</span>
												</Button>
											</div>
										</div>
										<p className="px-5 py-3 text-[12px] text-gray-500 dark:text-gray-400">
											Re-runs the full keyword research pipeline + Google PAA + AI curation and
											returns fresh article suggestions. Existing articles are never removed — you
											pick which new ones to add.
										</p>

										{/* Past runs list */}
										{(clusterRuns.length > 0 || runsLoading) && (
											<div className="border-t border-gray-100 dark:border-gray-800">
												<div className="flex items-center gap-2 px-5 py-3">
													<History className="size-3.5 text-gray-400" />
													<span className="text-[12px] font-semibold tracking-wider text-gray-600 uppercase dark:text-gray-400">
														Past Runs
													</span>
													<span className="ml-auto text-[11px] text-gray-400">
														Click any run to re-open its article list
													</span>
												</div>
												{runsLoading ? (
													<div className="px-5 py-4 text-center text-sm text-gray-400">
														Loading…
													</div>
												) : (
													<div className="divide-y divide-gray-100 dark:divide-gray-800">
														{clusterRuns.map((run) => {
															const existingNorm = new Set(
																dbPages.map((p) => p.keyword.toLowerCase().trim())
															);
															const newCount = run.suggestions.filter(
																(s) => !existingNorm.has(s.keyword.toLowerCase().trim())
															).length;
															return (
																<div
																	key={run.id}
																	className="group flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
																>
																	<div className="min-w-0 flex-1">
																		<div className="flex items-center gap-2">
																			<span className="text-[13px] font-medium text-gray-900 dark:text-white">
																				{run.suggestions.length} article suggestions
																			</span>
																			{newCount > 0 && (
																				<span className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
																					{newCount} new
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
																		</div>
																	</div>
																	<button
																		type="button"
																		onClick={() => handleOpenRunPicker(run.suggestions)}
																		className="hover:border-brand-300 hover:text-brand-600 dark:hover:border-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-600 transition-colors dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
																	>
																		<RotateCcw className="size-3" />
																		Review
																	</button>
																	<button
																		type="button"
																		onClick={() => deleteClusterRun(run.id)}
																		className="invisible rounded p-1 text-gray-400 group-hover:visible hover:text-red-500"
																		title="Delete run"
																	>
																		<Trash2 className="size-3.5" />
																	</button>
																</div>
															);
														})}
													</div>
												)}
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Add Article dialog */}
			<Dialog open={addArticleOpen} onOpenChange={setAddArticleOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add article</DialogTitle>
						<DialogDescription>
							Add a supporting article to this cluster. You can edit the brief and content in the
							workspace after.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<InputField
							label="Title"
							value={addArticleForm.title}
							onChange={(e) => setAddArticleForm((f) => ({ ...f, title: e.target.value }))}
							placeholder="e.g. How to Prevent Cyber Crime"
						/>
						<InputField
							label="Target keyword"
							value={addArticleForm.keyword}
							onChange={(e) => setAddArticleForm((f) => ({ ...f, keyword: e.target.value }))}
							placeholder="e.g. how to prevent cyber crime"
						/>
						<div className="grid gap-2">
							<Label>Funnel stage</Label>
							<div className="flex gap-2">
								{(['tofu', 'mofu', 'bofu'] as const).map((f) => (
									<Button
										key={f}
										type="button"
										size="sm"
										variant={addArticleForm.funnel === f ? 'default' : 'outline'}
										className={
											addArticleForm.funnel === f
												? 'bg-brand-500 hover:bg-brand-600 text-white'
												: ''
										}
										onClick={() => setAddArticleForm((prev) => ({ ...prev, funnel: f }))}
									>
										{f === 'tofu' ? 'ToFu' : f === 'mofu' ? 'MoFu' : 'BoFu'}
									</Button>
								))}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setAddArticleOpen(false)}
							disabled={addArticleSubmitting}
						>
							Cancel
						</Button>
						<Button
							className="bg-brand-500 hover:bg-brand-600 text-white"
							onClick={handleAddArticle}
							disabled={addArticleSubmitting}
						>
							{addArticleSubmitting ? 'Adding…' : 'Add article'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete page confirmation */}
			<AlertDialog open={!!pageToDelete} onOpenChange={(open) => !open && setPageToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove from cluster?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove &quot;{pageToDelete?.title}&quot; from the cluster. The page will be
							deleted. This cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteSubmitting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleDeletePage();
							}}
							disabled={deleteSubmitting}
							className="bg-error-600 hover:bg-error-700 text-white"
						>
							{deleteSubmitting ? 'Removing…' : 'Remove'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			{/* ── Regenerate confirmation ──────────────────────────────────────── */}
			<AlertDialog open={confirmRegenOpen} onOpenChange={setConfirmRegenOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Regenerate this cluster?</AlertDialogTitle>
						<AlertDialogDescription>
							This will run fresh keyword research and AI curation to generate a new set of article
							suggestions. <strong>Your existing articles won't be changed</strong> — you'll pick
							which new suggestions to add from a list. This costs{' '}
							<strong>
								<CreditBadge
									cost={CREDIT_COSTS.CLUSTER_GENERATION}
									action="Regenerate"
									sufficient={hasCreditsForRegen}
								/>
							</strong>{' '}
							credits.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-brand-500 hover:bg-brand-600 text-white"
							onClick={() => {
								setConfirmRegenOpen(false);
								handleRegenerate();
							}}
						>
							Yes, run new research
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* ── Regenerate progress widget ───────────────────────────────────── */}
			<TaskProgressWidget
				open={regenWidgetOpen}
				title="Regenerating Content Cluster"
				status={regenWidgetStatus}
				steps={regenWidgetSteps}
				errorMessage={regenWidgetError}
				disableAutoAdvance
				onClose={() => setRegenWidgetOpen(false)}
			/>

			{/* ── Regenerate picker modal ──────────────────────────────────────── */}
			<Dialog
				open={regenPickerOpen}
				onOpenChange={(o) => {
					if (!addingSelected) setRegenPickerOpen(o);
				}}
			>
				<DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Sparkles className="text-brand-500 size-5" />
							New Article Suggestions
						</DialogTitle>
						<DialogDescription>
							{regenSuggestions.length} article suggestions from fresh keyword research. Existing
							articles are not affected — select which ones to add.
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 overflow-y-auto py-2 pr-1">
						<div className="mb-2 flex items-center justify-between px-1">
							<span className="text-[12px] text-gray-500 dark:text-gray-400">
								{regenSelected.size} of {regenSuggestions.length} selected
							</span>
							<div className="flex gap-2">
								<button
									type="button"
									className="text-brand-600 dark:text-brand-400 text-[12px] hover:underline"
									onClick={() => setRegenSelected(new Set(regenSuggestions.map((_, i) => i)))}
								>
									Select all
								</button>
								<span className="text-gray-300 dark:text-gray-600">·</span>
								<button
									type="button"
									className="text-brand-600 dark:text-brand-400 text-[12px] hover:underline"
									onClick={() => setRegenSelected(new Set())}
								>
									Deselect all
								</button>
							</div>
						</div>

						{regenSuggestions.map((s, i) => {
							const isSelected = regenSelected.has(i);
							const existingNorm = new Set(dbPages.map((p) => p.keyword.toLowerCase().trim()));
							const alreadyExists = existingNorm.has(s.keyword.toLowerCase().trim());
							return (
								<button
									key={i}
									type="button"
									onClick={() => {
										if (alreadyExists) return;
										setRegenSelected((prev) => {
											const next = new Set(prev);
											if (next.has(i)) {
												next.delete(i);
											} else {
												next.add(i);
											}
											return next;
										});
									}}
									className={cn(
										'mb-1.5 flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
										alreadyExists
											? 'cursor-default border-gray-100 bg-gray-50 opacity-50 dark:border-gray-800 dark:bg-gray-800/30'
											: isSelected
												? 'border-brand-300 bg-brand-50/70 dark:border-brand-700/50 dark:bg-brand-900/20'
												: 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900'
									)}
								>
									<div
										className={cn(
											'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
											alreadyExists
												? 'border-gray-300 bg-gray-100 dark:border-gray-600'
												: isSelected
													? 'border-brand-500 bg-brand-500 dark:border-brand-400 dark:bg-brand-500'
													: 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
										)}
									>
										{isSelected && !alreadyExists && <Check className="size-3 text-white" />}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-1.5">
											<span className="text-sm font-medium text-gray-900 dark:text-white">
												{s.keyword}
											</span>
											{alreadyExists && (
												<span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
													Already in cluster
												</span>
											)}
											<FunnelTag stage={s.funnel_stage} compact />
											<span
												className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${pageTypeColor(s.page_type)}`}
											>
												{formatPageTypeDisplay(s.page_type)}
											</span>
											{s.source === 'dataforseo' && (
												<span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
													Real data
												</span>
											)}
										</div>
										<div className="mt-1 flex gap-3 text-[11px] text-gray-500 dark:text-gray-400">
											{s.monthly_searches != null && (
												<span>{s.monthly_searches.toLocaleString()} searches/mo</span>
											)}
											{s.keyword_difficulty != null && <span>KD {s.keyword_difficulty}%</span>}
											{s.cpc != null && <span>CPC ${s.cpc.toFixed(2)}</span>}
										</div>
									</div>
								</button>
							);
						})}
					</div>

					<DialogFooter className="border-t border-gray-100 pt-4 dark:border-gray-800">
						<Button
							variant="outline"
							onClick={() => setRegenPickerOpen(false)}
							disabled={addingSelected}
						>
							Cancel
						</Button>
						<Button
							className="bg-brand-500 hover:bg-brand-600 text-white"
							disabled={regenSelected.size === 0 || addingSelected}
							onClick={handleAddSelected}
						>
							{addingSelected ? (
								<Loader2 className="mr-2 size-4 animate-spin" />
							) : (
								<Plus className="mr-2 size-4" />
							)}
							{addingSelected
								? 'Adding…'
								: `Add ${regenSelected.size} article${regenSelected.size !== 1 ? 's' : ''}`}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

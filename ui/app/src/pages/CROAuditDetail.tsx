/**
 * CRO Studio — Individual audit view (fully updated per cro-studio.md spec).
 *
 * Destination page audit includes:
 *   - Headline insight (single deterministic sentence, always first — Tier 3 Rule 1)
 *   - Cluster journey panel (AIDA + MAP per page in cluster)
 *   - Above-the-fold score (0–4 mini audit — Tier 1)
 *   - Architecture violations + CTA language quality (with impact statements)
 *   - Unanswered questions / objection coverage (Tier 1)
 *   - 11-step Optimal Selling Journey incl. step 6b pricing (with impact statements)
 *   - Persuasion profile (bias cards with coherence, conflicts, synergies)
 *   - Cognitive load badge (clickable when High — 1 credit on-demand explanation)
 *   - Deep Analysis button (emotional arc — 3 credits, Tier 2)
 *   - FAQ generation (2 credits) + testimonial email (1 credit)
 *
 * SEO page audit: 5-item handoff checklist with impact statements.
 *
 * Conversion cost language used throughout — never audit/grading language (Tier 3 Rule 3).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router';
import {
	ArrowLeft,
	Search,
	ExternalLink,
	RefreshCw,
	Wand2,
	Check,
	CheckCircle2,
	XCircle,
	AlertCircle,
	AlertTriangle,
	Target,
	ChevronDown,
	ChevronUp,
	ChevronRight,
	Copy,
	Brain,
	HelpCircle,
	Mail,
	Zap,
	Eye,
	Sparkles,
	TrendingDown
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useOrganization } from '../hooks/useOrganization';
import { canAccessCROStudio } from '../utils/featureGating';
import { CROStudioGate } from '../components/cro/CROStudioGate';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { StatCard } from '../components/shared/StatCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { CreditCost } from '../components/shared/CreditBadge';
import { CREDIT_COSTS } from '../lib/credits';
import { toast } from 'sonner';
import { scrollIntoView } from '../utils/common';
import { api } from '../utils/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEO_ITEM_ORDER = [
	'handoff',
	'ctaFit',
	'funnelMismatch',
	'emotionalHook',
	'ctaPresent'
] as const;

const SEO_ITEM_LABELS: Record<string, string> = {
	handoff: 'Destination handoff — first link in first 400 words',
	ctaFit: 'CTA commitment level vs funnel stage',
	funnelMismatch: 'Funnel intent alignment',
	emotionalHook: 'Attention grabbing hook above fold',
	ctaPresent: 'CTA presence'
};

const REAUDIT_DAYS = 30;

// Impact statements — conversion cost language per finding type (cro-studio.md Tier 3)
const IMPACT_STATEMENTS: Record<string, string> = {
	no_urgency:
		'Pages without urgency at the bottom of funnel see 20–40% of ready-to-buy visitors leave without acting.',
	no_credibility_before_cta:
		'Visitors asked to commit before seeing credentials convert at roughly half the rate of those who see trust signals first.',
	pricing_before_features:
		"Presenting price before value increases price sensitivity — visitors anchor to cost before they understand what they're getting.",
	social_proof_misplaced:
		'Trust signals placed after the CTA arrive too late. Social proof before the ask increases conversion by 15–32% in most tests.',
	weak_cta_copy:
		'Generic CTAs like "Submit" or "Sign up" convert 25–40% lower than specific, benefit-led alternatives.',
	no_above_fold_cta:
		"Visitors ready to act on arrival have no path to conversion. You lose them before they've scrolled.",
	bias_conflict:
		'Conflicting persuasion signals create subconscious resistance. Visitors feel pushed and pulled simultaneously — and often choose neither.',
	objection_unaddressed:
		'The most common reason visitors leave is an unanswered objection. Addressing it directly before the CTA recovers 10–25% of lost conversions.',
	cognitive_overload:
		"Pages with too many competing signals above the fold see 30–50% lower engagement — visitors leave before they've read enough to decide.",
	no_problem_identification:
		"Visitors won't care about your solution until they recognise their problem. Without this, your value prop lands in a vacuum.",
	no_pricing:
		"Visitors who can't find pricing leave to find it elsewhere — and often don't come back.",
	pricing_no_framing:
		'Unframed pricing feels expensive. A daily cost equivalent or anchor price makes the same number feel like a bargain.',
	no_social_proof:
		'Without evidence that others have succeeded, visitors are asked to be the first to take the risk.',
	trust_after_cta:
		'Visitors asked to commit before seeing credentials convert at roughly half the rate of those who see trust signals first.',
	cta_below_fold:
		"Visitors ready to act on arrival have no path to conversion. You lose them before they've scrolled."
};

// Per-item impact for SEO page checklist items
const SEO_ITEM_IMPACT: Record<string, string> = {
	handoff: 'Without this link, the SEO equity this page builds is flowing to the wrong place.',
	ctaFit: 'A CTA that mismatches funnel stage pushes visitors away instead of moving them forward.',
	funnelMismatch: 'Content that fights its keyword intent confuses both visitors and Google.',
	emotionalHook:
		"Visitors who aren't engaged in the first screen rarely scroll far enough to convert.",
	ctaPresent: 'Without a clear next step, warmed-up visitors have nowhere to go.'
};

// On-page SEO check labels (universal — from /api/seo-checks/run)
const SEO_CHECK_LABELS: Record<string, string> = {
	keyword_in_title: 'Keyword in title',
	keyword_in_h1: 'Keyword in H1',
	keyword_in_url: 'Keyword in URL',
	meta_description: 'Meta description',
	schema: 'Structured data',
	fetch_error: 'Page fetch',
	keyword_check: 'Keyword'
};
const JOURNEY_PHASES = {
	emotional: [1, 2, 3, 4, 5],
	logical: [6, 7, 8], // 6=features, 7=pricing(6b), 8=social proof
	close: [9, 10, 11]
};

// Plain-English explanations + implementation guidance for each cognitive bias
const BIAS_DETAIL: Record<
	string,
	{ what: string; why: string; howToAdd: string; example: string }
> = {
	anchoring: {
		what: 'People rely heavily on the first number they see. If your original price is visible before the discounted price, the discount feels much larger.',
		why: "Without an anchor, your price has no reference point. Visitors have no way to judge whether it's a good deal.",
		howToAdd:
			'Show a crossed-out original price or competitor price before your actual price. Even showing a higher tier plan first makes the lower tier feel cheaper.',
		example: '"~~$149/month~~ — $39/month during beta"'
	},
	scarcity: {
		what: 'When something appears limited, people want it more. Scarcity triggers loss aversion — the fear of missing out is stronger than the desire to gain.',
		why: 'Without scarcity, visitors feel they can always come back later. Most never do.',
		howToAdd:
			'Add limited stock counts, limited-time pricing, or a cap on onboarding slots. Must be genuine — fake scarcity destroys trust.',
		example: '"Only 12 onboarding slots available this month"'
	},
	social_proof: {
		what: 'People follow the behaviour of others, especially in uncertain situations. Reviews, customer counts, and testimonials reduce perceived risk.',
		why: 'An unknown brand asking for money feels risky. Social proof signals that others have already taken the leap and it worked out.',
		howToAdd:
			'Add a customer count ("2,400+ stores"), star rating, or 2-3 specific testimonials with names and results above your primary CTA.',
		example: '"Trusted by 2,400+ Shopify merchants — 4.9 stars from 180 reviews"'
	},
	loss_aversion: {
		what: "People feel losses roughly twice as strongly as equivalent gains. Framing your offer around what they'll lose by not acting is more powerful than framing around what they gain.",
		why: "Feature lists tell people what they get. Loss framing tells them what it's costing them to wait.",
		howToAdd:
			'Add a money-back guarantee, free trial, or "what you\'re losing right now" framing near the CTA.',
		example: '"Every month without this, you\'re leaving search traffic on the table"'
	},
	decoy: {
		what: 'Adding a third option that makes one of the other options look more attractive by comparison. The "decoy" is never meant to be chosen.',
		why: 'Two options create a binary choice. Three options let you guide the decision toward your preferred outcome.',
		howToAdd:
			'If you have pricing tiers, make the middle tier the obvious winner by making the top tier only slightly more expensive and the bottom tier feel limited.',
		example: 'Starter $29 | Growth $39 ★ Most popular | Scale $99'
	},
	endowment: {
		what: 'People value things more once they feel ownership. The moment someone feels something is "theirs", they\'re more reluctant to give it up.',
		why: 'Getting someone to invest any time or effort before committing dramatically increases conversion.',
		howToAdd:
			'Offer a free trial, let users set up their account before paying, or let them customise something before checkout.',
		example: '"Your SEO plan is ready — activate it free for 14 days"'
	},
	bandwagon: {
		what: 'People do things because others are doing them. Showing real-time activity or total adoption signals that this is the safe, mainstream choice.',
		why: 'Visitors asking "should I sign up?" are looking for permission. Knowing others are actively using the product gives them that permission.',
		howToAdd:
			'Show a live counter, recent signups, or "X people signed up this week" near your CTA. Even showing logos of known companies using the product works.',
		example: '"47 stores signed up this week"'
	},
	framing: {
		what: 'The way information is presented changes how it\'s perceived. "$1.30/day" feels very different from "$39/month" even though they\'re identical.',
		why: 'Your price framed as a daily cost makes it feel trivial. Framed as a monthly bill it feels like a commitment.',
		howToAdd:
			'Frame price as a daily equivalent, or frame the ROI ("one extra sale per month pays for a year"). Always frame relative to something familiar.',
		example: '"Less than your morning coffee — $1.29/day"'
	},
	hyperbolic_discounting: {
		what: 'People prefer smaller immediate rewards over larger future rewards. "Get it now" beats "save more later".',
		why: 'A future benefit feels abstract. An immediate benefit feels real. The closer a reward is in time, the more attractive it becomes.',
		howToAdd:
			'Offer an instant win for signing up — immediate access, an instant bonus, or something that activates the moment they click.',
		example: '"Start your first audit in 60 seconds"'
	},
	recency: {
		what: 'People remember and weight the last thing they saw most heavily. What visitors read right before your CTA determines whether they click.',
		why: "If the last thing before your CTA is a feature list, they're deciding with their analytical brain. Put an emotional hook last.",
		howToAdd:
			'Place your strongest testimonial, your boldest result, or a risk-reversal statement immediately above your CTA button.',
		example: '"\'We ranked on page 1 in 6 weeks\' — Sarah, Shopify merchant"'
	},
	default_bias: {
		what: 'People tend to go with pre-selected options rather than making an active choice. Defaults win.',
		why: 'Every decision point is an opportunity to lose the visitor. Pre-selecting the right option removes friction.',
		howToAdd:
			'Pre-select your recommended plan, pre-tick your most popular option, or set the default trial length to the one that converts best.',
		example: 'Growth plan pre-selected on pricing. Annual billing pre-selected on checkout.'
	}
};

// Backend uses _effect suffix; add aliases so lookup always works
(
	BIAS_DETAIL as Record<string, { what: string; why: string; howToAdd: string; example: string }>
).decoy_effect = BIAS_DETAIL.decoy;
(
	BIAS_DETAIL as Record<string, { what: string; why: string; howToAdd: string; example: string }>
).endowment_effect = BIAS_DETAIL.endowment;
(
	BIAS_DETAIL as Record<string, { what: string; why: string; howToAdd: string; example: string }>
).bandwagon_effect = BIAS_DETAIL.bandwagon;
(
	BIAS_DETAIL as Record<string, { what: string; why: string; howToAdd: string; example: string }>
).framing_effect = BIAS_DETAIL.framing;
(
	BIAS_DETAIL as Record<string, { what: string; why: string; howToAdd: string; example: string }>
).recency_effect = BIAS_DETAIL.recency;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SEOChecklistItem {
	status: 'pass' | 'fail' | 'partial' | 'na';
	evidence: string;
}

interface FixOption {
	copy: string;
	placement: string;
	/** For bias fixes: psychological mechanism (cro-studio.md Build Order #19) */
	mechanism?: string;
}

interface ArchitectureViolation {
	type: string;
	message: string;
	suggestion: string;
	evidence?: string;
}

interface JourneyStepResult {
	step: number;
	stepDisplay?: string;
	name: string;
	type: string;
	status: 'pass' | 'partial' | 'fail';
	evidence: string;
}

interface CognitiveBiasResult {
	bias_id: string;
	label: string;
	present: boolean;
	evidence?: string;
}

interface BiasCoherenceResult {
	score: 'strong' | 'mixed' | 'conflicting';
	active_count: number;
	conflicts: Array<{ pair: [string, string]; reason?: string }>;
	synergies: Array<{ pair: [string, string]; reason?: string }>;
	recommendations: string[];
	overoptimised: boolean;
}

interface ClusterJourneyNode {
	role: 'supporting' | 'focus' | 'destination';
	label: string;
	url: string | null;
	aida: string;
	map: string;
	mindset: string;
	audit_id: string | null;
	cro_score: number | null;
	page_type: string;
}

interface ClusterJourneyData {
	nodes: [ClusterJourneyNode, ClusterJourneyNode, ClusterJourneyNode];
}

interface AboveFoldResult {
	headline_value_prop: 'pass' | 'fail';
	trust_signal: 'pass' | 'fail';
	cta_present: 'pass' | 'fail';
	visual_relevant: 'pass' | 'fail';
	score: number;
}

interface ObjectionItem {
	id: string;
	label: string;
	visitor_voice: string;
	status: 'addressed' | 'partial' | 'missing';
	evidence?: string;
}

interface ObjectionCoverage {
	objections: ObjectionItem[];
	addressed: number;
	total: number;
}

interface CognitiveLoad {
	level: 'normal' | 'high';
	cta_count_above_fold: number;
	competing_headlines: number;
	choice_count: number;
}

interface CROAudit {
	id: string;
	page_url: string;
	page_type: 'seo_page' | 'destination_page';
	page_label: string | null;
	destination_url: string | null;
	cro_score: number;
	max_score: number;
	audited_at: string | null;
	headline_insight: string | null;
	checklist: Record<string, SEOChecklistItem> | { journey_checklist?: JourneyStepResult[] };
	architecture_violations: ArchitectureViolation[] | null;
	above_fold: AboveFoldResult | null;
	objection_coverage: ObjectionCoverage | null;
	cognitive_load: CognitiveLoad | null;
	bias_inventory: CognitiveBiasResult[] | null;
	bias_coherence: BiasCoherenceResult | null;
	page_subtype: string | null;
	cluster_name: string | null;
	cluster_journey: ClusterJourneyData | null;
	audit_error: boolean;
	audit_error_message: string | null;
	cognitive_load_explanation?: string | null;
	emotional_arc_result?: string | null;
	faq_result?: Array<{ q: string; a: string }> | null;
	testimonial_result?: { subject: string; body: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeUrlPath(url: string): string {
	try {
		return new URL(url).pathname || url;
	} catch {
		return url;
	}
}

function formatAuditedAt(iso: string | null): string {
	if (!iso) return 'Never';
	const d = new Date(iso);
	const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Yesterday';
	if (diffDays < 7) return `${diffDays} days ago`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
	return `${Math.floor(diffDays / 30)} months ago`;
}

function needsReaudit(iso: string | null): boolean {
	if (!iso) return true;
	return (Date.now() - new Date(iso).getTime()) / 86400000 > REAUDIT_DAYS;
}

function getAuditAgeDays(iso: string | null): number {
	if (!iso) return 0;
	return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** On-page SEO checks display (from /api/seo-checks/run) */
function SeoChecksDisplay({ seoChecks }: { seoChecks: unknown }) {
	const data = seoChecks as {
		checks?: Record<string, { status: string; message: string }>;
		fetch_error?: boolean;
	};
	const checks = data?.checks ?? {};
	const fetchError = data?.fetch_error ?? false;

	if (fetchError && checks.fetch_error) {
		return (
			<div className="mt-3 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-900/20">
				<XCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
				<span className="text-amber-800 dark:text-amber-200">{checks.fetch_error.message}</span>
			</div>
		);
	}

	const keys = [
		'keyword_in_title',
		'keyword_in_h1',
		'keyword_in_url',
		'meta_description',
		'schema',
		'keyword_check'
	];
	return (
		<div className="mt-3 space-y-2">
			{keys.map((key) => {
				const c = checks[key];
				if (!c) return null;
				const Icon =
					c.status === 'pass' ? CheckCircle2 : c.status === 'warning' ? AlertTriangle : XCircle;
				const iconColor =
					c.status === 'pass'
						? 'text-green-600 dark:text-green-500'
						: c.status === 'warning'
							? 'text-amber-600 dark:text-amber-500'
							: 'text-red-600 dark:text-red-500';
				return (
					<div
						key={key}
						className="flex items-start gap-2 rounded border border-gray-200 p-2 dark:border-gray-700"
					>
						<Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} />
						<div className="min-w-0 flex-1">
							<p className="text-xs font-medium">{SEO_CHECK_LABELS[key] ?? key}</p>
							<p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{c.message}</p>
						</div>
					</div>
				);
			})}
		</div>
	);
}

/** Phase dot strip — shows pass/fail per step grouped by phase */
function JourneyPhaseStrip({ journey }: { journey: JourneyStepResult[] }) {
	const stepStatus = (n: number) => journey.find((s) => s.step === n)?.status ?? 'pass';

	const phases = [
		{ key: 'emotional', label: 'Emotional', steps: JOURNEY_PHASES.emotional, color: 'teal' },
		{ key: 'logical', label: 'Logical', steps: JOURNEY_PHASES.logical, color: 'blue' },
		{ key: 'close', label: 'Emotional close', steps: JOURNEY_PHASES.close, color: 'amber' }
	] as const;

	return (
		<div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
			{phases.map((phase, pi) => (
				<div
					key={phase.key}
					className={`flex flex-1 flex-col gap-2 px-4 py-3 ${
						pi < phases.length - 1 ? 'border-r border-gray-200 dark:border-gray-700' : ''
					} ${
						phase.color === 'teal'
							? 'bg-teal-50 dark:bg-teal-900/10'
							: phase.color === 'blue'
								? 'bg-blue-50 dark:bg-blue-900/10'
								: 'bg-amber-50 dark:bg-amber-900/10'
					}`}
				>
					<span
						className={`text-[10px] font-semibold tracking-widest uppercase ${
							phase.color === 'teal'
								? 'text-teal-700 dark:text-teal-400'
								: phase.color === 'blue'
									? 'text-blue-700 dark:text-blue-400'
									: 'text-amber-700 dark:text-amber-400'
						}`}
					>
						{phase.label}
					</span>
					<div className="flex gap-1.5">
						{phase.steps.map((n) => (
							<div
								key={n}
								title={`Step ${n}`}
								className={`size-2.5 rounded-full ${
									stepStatus(n) === 'pass'
										? 'bg-green-500'
										: stepStatus(n) === 'partial'
											? 'bg-amber-500'
											: 'bg-red-500'
								}`}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

/** Cluster Journey Panel — three-node horizontal flow (cro-studio.md Build Order #15) */
function ClusterJourneyPanel({ journey }: { journey: ClusterJourneyData }) {
	return (
		<section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			<div className="border-b border-gray-200 px-5 py-3 dark:border-gray-700">
				<h2 className="text-sm font-semibold text-gray-900 dark:text-white">
					Cluster journey — where this page sits in the funnel
				</h2>
				<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
					Visitor mindset at each stage. Your destination page&apos;s job: Prompt only.
				</p>
			</div>
			<div className="flex flex-col items-stretch gap-4 p-5 sm:flex-row sm:items-center sm:gap-2">
				{journey.nodes.map((node, i) => (
					<React.Fragment key={node.role}>
						{i > 0 && (
							<ChevronRight className="hidden shrink-0 text-gray-300 sm:block dark:text-gray-600" />
						)}
						<div
							className={`flex flex-1 flex-col rounded-lg border p-4 ${
								node.role === 'destination'
									? 'border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20'
									: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
							}`}
						>
							<span className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
								{node.page_type}
							</span>
							<div className="mt-1 flex items-center justify-between gap-2">
								{node.url ? (
									<a
										href={node.url}
										target="_blank"
										rel="noopener noreferrer"
										className="hover:text-brand-600 dark:hover:text-brand-400 font-medium text-gray-900 dark:text-white"
									>
										{node.label}
									</a>
								) : (
									<span className="font-medium text-gray-500 dark:text-gray-400">{node.label}</span>
								)}
								{node.audit_id ? (
									<Link
										to={`/cro-studio/audits/${node.audit_id}`}
										className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300"
									>
										{node.cro_score ?? 0}%
									</Link>
								) : (
									<Link
										to="/cro-studio"
										className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
									>
										Audit this page
									</Link>
								)}
							</div>
							<p className="mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
								AIDA: {node.aida} · MAP: {node.map}
							</p>
							<p className="mt-0.5 text-xs text-gray-600 italic dark:text-gray-300">
								&quot;{node.mindset}&quot;
							</p>
						</div>
					</React.Fragment>
				))}
			</div>
		</section>
	);
}

/** Above-the-fold score panel (cro-studio.md Tier 1) */
function AboveFoldPanel({ data }: { data: AboveFoldResult }) {
	const checks = [
		{
			key: 'headline_value_prop' as const,
			label: 'Headline communicates a specific benefit',
			passNote: 'Clear value prop detected above fold',
			failNote:
				"Headline names the product but doesn't communicate a specific benefit to the visitor"
		},
		{
			key: 'trust_signal' as const,
			label: 'At least one trust signal visible without scrolling',
			passNote: 'Trust signal detected above fold',
			failNote:
				'No credibility signal visible before the visitor scrolls — reviews, logos, or customer count needed'
		},
		{
			key: 'cta_present' as const,
			label: 'CTA visible without scrolling',
			passNote: 'CTA present above fold',
			failNote: 'Visitors ready to act on arrival have nowhere to go without scrolling'
		},
		{
			key: 'visual_relevant' as const,
			label: 'Visual supports the product claim',
			passNote: 'Relevant visual detected',
			failNote:
				'Hero visual appears generic — product screenshot or outcome-focused image would build more confidence'
		}
	];

	const scoreColor =
		data.score >= 3
			? 'text-green-600 dark:text-green-400'
			: data.score >= 2
				? 'text-amber-600 dark:text-amber-400'
				: 'text-red-600 dark:text-red-400';

	return (
		<section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
				<div className="flex items-center gap-2">
					<Eye className="text-brand-500 size-4" />
					<div>
						<h2 className="text-base font-semibold text-gray-900 dark:text-white">
							Above-the-fold
						</h2>
						<p className="text-xs text-gray-500 dark:text-gray-400">
							First screen only — does it work as a standalone conversion unit?
						</p>
					</div>
				</div>
				<span className={`text-2xl font-semibold ${scoreColor}`}>{data.score}/4</span>
			</div>
			<ul className="divide-y divide-gray-100 dark:divide-gray-800">
				{checks.map(({ key, label, passNote, failNote }) => {
					const status = data[key];
					return (
						<li
							key={key}
							className={`flex items-start gap-3 px-5 py-3.5 ${
								status === 'fail' ? 'bg-red-50/40 dark:bg-red-900/5' : ''
							}`}
						>
							<div
								className={`mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full ${
									status === 'pass'
										? 'bg-green-100 dark:bg-green-900/30'
										: 'bg-red-100 dark:bg-red-900/30'
								}`}
							>
								{status === 'pass' ? (
									<Check className="size-3 text-green-600 dark:text-green-400" />
								) : (
									<XCircle className="size-3 text-red-600 dark:text-red-400" />
								)}
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
								<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
									{status === 'pass' ? passNote : failNote}
								</p>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

/** Unanswered questions — objection coverage (cro-studio.md Tier 1) */
function UnansweredQuestionsPanel({
	data,
	fixesByItem,
	fixGenerating,
	onGenerate
}: {
	data: ObjectionCoverage;
	fixesByItem: Record<string, FixOption[]>;
	fixGenerating: string | null;
	onGenerate: (key: string) => void;
}) {
	if (data.objections.length === 0) return null;

	// Show all objections — unaddressed first, then addressed (full picture for the user)
	const sorted = [...data.objections].sort(
		(a, b) => Number(a.status === 'addressed') - Number(b.status === 'addressed')
	);

	return (
		<section className="overflow-hidden rounded-xl border border-amber-200 bg-white dark:border-amber-900/40 dark:bg-gray-900">
			<div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 dark:border-amber-900/40 dark:bg-amber-900/10">
				<HelpCircle className="size-4 text-amber-700 dark:text-amber-400" />
				<div>
					<h2 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
						Unanswered questions — visitors are leaving with these
					</h2>
					<p className="text-xs text-amber-700 dark:text-amber-400">
						{data.addressed}/{data.total} objections addressed
					</p>
				</div>
			</div>
			<ul className="divide-y divide-gray-100 dark:divide-gray-800">
				{sorted.map((obj) => {
					const itemKey = `objection_${obj.id}`;
					const isAddressed = obj.status === 'addressed';
					const displayText = (obj as { visitor_voice?: string }).visitor_voice ?? obj.label;

					return (
						<li
							key={obj.id}
							className={`px-5 py-4 ${isAddressed ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}
						>
							<div className="flex items-start gap-3">
								{isAddressed ? (
									<Check className="mt-0.5 size-5 flex-shrink-0 text-green-600 dark:text-green-400" />
								) : (
									<HelpCircle className="mt-0.5 size-5 flex-shrink-0 text-amber-500" />
								)}
								<div className="min-w-0 flex-1">
									<p className="font-medium text-gray-900 italic dark:text-white">
										"{displayText}"
									</p>
									<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
										{obj.label} —{' '}
										{isAddressed
											? 'addressed on this page'
											: obj.status === 'partial'
												? 'partially addressed but not clearly enough'
												: 'not addressed anywhere on this page'}
									</p>
									{!isAddressed && (
										<>
											<p className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
												{IMPACT_STATEMENTS.objection_unaddressed}
											</p>
											<FixPanelInline
												itemKey={itemKey}
												fixesByItem={fixesByItem}
												fixGenerating={fixGenerating}
												onGenerate={onGenerate}
											/>
										</>
									)}
								</div>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

/** Renders fix options with generate button, copy buttons */
function FixPanel({
	itemKey,
	options,
	generating,
	onGenerate,
	creditCost
}: {
	itemKey: string;
	options: FixOption[];
	generating: boolean;
	onGenerate: (key: string) => void;
	creditCost: number;
}) {
	const [copied, setCopied] = useState<number | null>(null);

	const handleCopy = (text: string, idx: number) => {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(idx);
			setTimeout(() => setCopied(null), 1500);
		});
	};

	if (options.length === 0) {
		return (
			<div className="mt-3 flex items-center gap-2">
				<Button
					size="sm"
					variant="outline"
					onClick={() => onGenerate(itemKey)}
					disabled={generating}
					className="h-7 gap-1.5 text-xs"
				>
					<Wand2 className={`size-3 ${generating ? 'animate-pulse' : ''}`} />
					{generating ? 'Generating…' : 'Generate fix'}
				</Button>
				<span className="text-xs text-gray-400">
					<CreditCost amount={creditCost} />
				</span>
			</div>
		);
	}

	return (
		<div className="mt-3 space-y-2">
			{options.map((opt, i) => (
				<div
					key={i}
					className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
				>
					<p className="text-sm text-gray-900 italic dark:text-white">"{opt.copy}"</p>
					<p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">📍 {opt.placement}</p>
					{opt.mechanism && (
						<p className="mt-2 border-t border-gray-200 pt-2 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400">
							<span className="font-medium">Why it works:</span> {opt.mechanism}
						</p>
					)}
					<button
						type="button"
						onClick={() => handleCopy(opt.copy, i)}
						className="text-brand-600 hover:text-brand-700 dark:text-brand-400 mt-2 inline-flex items-center gap-1 text-xs"
					>
						<Copy className="size-3" />
						{copied === i ? 'Copied!' : 'Copy'}
					</button>
				</div>
			))}
		</div>
	);
}

/** Helper to render FixPanel inline — avoids prop drilling the full FixPanel signature repeatedly */
function FixPanelInline({
	itemKey,
	fixesByItem,
	fixGenerating,
	onGenerate
}: {
	itemKey: string;
	fixesByItem: Record<string, FixOption[]>;
	fixGenerating: string | null;
	onGenerate: (key: string) => void;
}) {
	return (
		<FixPanel
			itemKey={itemKey}
			options={fixesByItem[itemKey] ?? []}
			generating={fixGenerating === itemKey}
			onGenerate={onGenerate}
			creditCost={CREDIT_COSTS.CRO_STUDIO_SINGLE_FIX}
		/>
	);
}

/** Backend returns _effect suffix; BIAS_DETAIL uses short keys */
const BIAS_ID_TO_DETAIL: Record<string, string> = {
	decoy_effect: 'decoy',
	endowment_effect: 'endowment',
	bandwagon_effect: 'bandwagon',
	framing_effect: 'framing',
	recency_effect: 'recency'
};

/** Expandable bias card — explains the bias, why it matters, how to add it */
function BiasCard({
	bias,
	onGenerate,
	fixes,
	generating
}: {
	bias: CognitiveBiasResult;
	onGenerate: (key: string) => void;
	fixes: FixOption[];
	generating: boolean;
}) {
	const [expanded, setExpanded] = useState(false);
	const detailKey = BIAS_ID_TO_DETAIL[bias.bias_id] ?? bias.bias_id;
	const detail =
		BIAS_DETAIL[detailKey] ?? BIAS_DETAIL[bias.bias_id.replace(/_effect$/, '')] ?? null;

	return (
		<div
			className={`overflow-hidden rounded-lg border transition-colors ${
				bias.present
					? 'border-green-200 bg-white dark:border-green-900/30 dark:bg-gray-900'
					: 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
			}`}
		>
			<button
				type="button"
				onClick={() => setExpanded((v) => !v)}
				className="flex w-full items-center justify-between px-4 py-3 text-left"
			>
				<div className="flex items-center gap-3">
					<div
						className={`flex size-5 flex-shrink-0 items-center justify-center rounded-full ${
							bias.present ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'
						}`}
					>
						{bias.present ? (
							<Check className="size-3 text-green-600 dark:text-green-400" />
						) : (
							<div className="size-2 rounded-full bg-gray-400" />
						)}
					</div>
					<span className="text-sm font-medium text-gray-900 dark:text-white">{bias.label}</span>
					{!bias.present && (
						<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
							Missing
						</span>
					)}
				</div>
				{detail &&
					(expanded ? (
						<ChevronUp className="size-4 flex-shrink-0 text-gray-400" />
					) : (
						<ChevronDown className="size-4 flex-shrink-0 text-gray-400" />
					))}
			</button>

			{expanded && detail && (
				<div className="space-y-3 border-t border-gray-100 px-4 pt-3 pb-4 dark:border-gray-800">
					<div>
						<p className="mb-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
							What it is
						</p>
						<p className="text-sm text-gray-700 dark:text-gray-300">{detail.what}</p>
					</div>
					{!bias.present && (
						<>
							<div>
								<p className="mb-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
									Why it matters here
								</p>
								<p className="text-sm text-gray-700 dark:text-gray-300">{detail.why}</p>
							</div>
							<div>
								<p className="mb-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
									How to add it
								</p>
								<p className="text-sm text-gray-700 dark:text-gray-300">{detail.howToAdd}</p>
							</div>
							<div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
								<p className="mb-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
									Example
								</p>
								<p className="text-sm text-gray-800 italic dark:text-gray-200">{detail.example}</p>
							</div>
							<FixPanel
								itemKey={`bias_${bias.bias_id}`}
								options={fixes}
								generating={generating}
								onGenerate={onGenerate}
								creditCost={CREDIT_COSTS.CRO_STUDIO_SINGLE_FIX}
							/>
						</>
					)}
					{bias.present && bias.evidence && (
						<p className="text-xs text-gray-500 dark:text-gray-400">{bias.evidence}</p>
					)}
				</div>
			)}
		</div>
	);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function CROAuditDetail() {
	const { id } = useParams<{ id: string }>();
	const { session } = useAuth();
	const { organization } = useOrganization();
	const canAccess = canAccessCROStudio(organization);

	const [audit, setAudit] = useState<CROAudit | null>(null);
	const [loading, setLoading] = useState(true);
	const [reauditing, setReauditing] = useState(false);
	const [fixGenerating, setFixGenerating] = useState<string | null>(null);
	const [fixesByItem, setFixesByItem] = useState<Record<string, FixOption[]>>({});
	const [faqResult, setFaqResult] = useState<Array<{ q: string; a: string }> | null>(null);
	const [faqLoading, setFaqLoading] = useState(false);
	const [testimonialResult, setTestimonialResult] = useState<{
		subject: string;
		body: string;
	} | null>(null);
	const [testimonialLoading, setTestimonialLoading] = useState(false);
	const [cogLoadExpanding, setCogLoadExpanding] = useState(false);
	const [cogLoadExplanation, setCogLoadExplanation] = useState<string | null>(null);
	const [deepAnalysisGenerating, setDeepAnalysisGenerating] = useState(false);
	const [deepAnalysisResult, setDeepAnalysisResult] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState('start');
	// #5: track items user has marked done (local — resets on page reload)
	const [doneItems, setDoneItems] = useState<Set<string>>(new Set());
	const toggleDone = (key: string) =>
		setDoneItems((prev) => {
			const n = new Set(prev);
			if (n.has(key)) n.delete(key);
			else n.add(key);
			return n;
		});
	const [seoChecks, setSeoChecks] = useState<{
		checks?: Record<string, { status: string; message: string }>;
		fetch_error?: boolean;
	} | null>(null);
	const [seoChecking, setSeoChecking] = useState(false);
	const [seoKeyword, setSeoKeyword] = useState('');

	const fetchAudit = useCallback(async () => {
		if (!id || !session?.access_token) return;
		setLoading(true);
		try {
			const res = await api.get(`/api/cro-studio/audits/${id}`);
			if (!res.ok) {
				setAudit(null);
				return;
			}
			setAudit(await res.json());
		} catch {
			setAudit(null);
		} finally {
			setLoading(false);
		}
	}, [id, session?.access_token]);

	useEffect(() => {
		if (canAccess && id) fetchAudit();
	}, [canAccess, id, fetchAudit]);

	useEffect(() => {
		if (audit) {
			setCogLoadExplanation(audit.cognitive_load_explanation ?? null);
			setDeepAnalysisResult(audit.emotional_arc_result ?? null);
			setFaqResult(
				Array.isArray(audit.faq_result) && audit.faq_result.length > 0 ? audit.faq_result : null
			);
			setTestimonialResult(
				audit.testimonial_result?.subject || audit.testimonial_result?.body
					? {
							subject: audit.testimonial_result.subject ?? '',
							body: audit.testimonial_result.body ?? ''
						}
					: null
			);
		} else {
			setCogLoadExplanation(null);
			setDeepAnalysisResult(null);
			setFaqResult(null);
			setTestimonialResult(null);
		}
	}, [audit]);

	const handleReaudit = async () => {
		if (!id || !session?.access_token) return;
		setReauditing(true);
		try {
			const res = await api.post(`/api/cro-studio/audits/${id}/reaudit`);
			const data = await res.json();
			if (res.ok && data.success) {
				toast.success('Re-audit complete');
				fetchAudit();
				setFixesByItem({});
			} else if (res.status === 402) {
				toast.error(
					`Insufficient credits. Need ${data.required ?? CREDIT_COSTS.CRO_STUDIO_AUDIT}.`
				);
			} else {
				toast.error(data.error ?? 'Re-audit failed');
			}
		} catch {
			toast.error('Re-audit failed');
		} finally {
			setReauditing(false);
		}
	};

	const handleGenerateFix = async (failingItemKey: string) => {
		if (!id || !session?.access_token) return;
		setFixGenerating(failingItemKey);
		try {
			const res = await api.post('/api/cro-studio/fixes', {
				audit_id: id,
				mode: 'single',
				failing_item_key: failingItemKey
			});
			const data = await res.json();
			if (res.ok && data.success && data.data?.options) {
				setFixesByItem((prev) => ({ ...prev, [failingItemKey]: data.data.options }));
			} else if (res.status === 402) {
				toast.error(
					`Insufficient credits. Need ${data.required ?? CREDIT_COSTS.CRO_STUDIO_SINGLE_FIX}.`
				);
			} else {
				toast.error(data.error ?? 'Failed to generate fix');
			}
		} catch {
			toast.error('Failed to generate fix');
		} finally {
			setFixGenerating(null);
		}
	};

	const handleGenerateAllFixes = async (failing: string[]) => {
		if (!id || !session?.access_token || failing.length === 0) return;
		setFixGenerating('all');
		try {
			const res = await api.post('/api/cro-studio/fixes', { audit_id: id, mode: 'all' });
			const data = await res.json();
			if (res.ok && data.success && data.data?.options) {
				const opts = data.data.options as FixOption[];
				const perCount = Math.ceil(opts.length / Math.max(1, failing.length));
				const perItem: Record<string, FixOption[]> = {};
				failing.forEach((key, i) => {
					perItem[key] = opts.slice(i * perCount, (i + 1) * perCount);
				});
				setFixesByItem((prev) => ({ ...prev, ...perItem }));
			} else if (res.status === 402) {
				toast.error(`Insufficient credits.`);
			} else {
				toast.error(data.error ?? 'Failed to generate fixes');
			}
		} catch {
			toast.error('Failed to generate fixes');
		} finally {
			setFixGenerating(null);
		}
	};

	const handleGenerateFAQ = async () => {
		if (!id || !session?.access_token) return;
		setFaqLoading(true);
		try {
			const res = await api.post(`/api/cro-studio/audits/${id}/faq`);
			const data = await res.json();
			if (res.ok && data.success && data.data?.questions) {
				setFaqResult(data.data.questions);
				toast.success('FAQ generated');
			} else if (res.status === 402) {
				toast.error(`Insufficient credits. Need ${data.required ?? CREDIT_COSTS.CRO_STUDIO_FAQ}.`);
			} else {
				toast.error(data.error ?? 'Failed to generate FAQ');
			}
		} catch {
			toast.error('Failed to generate FAQ');
		} finally {
			setFaqLoading(false);
		}
	};

	const handleGenerateTestimonial = async () => {
		if (!id || !session?.access_token) return;
		setTestimonialLoading(true);
		try {
			const res = await api.post(`/api/cro-studio/audits/${id}/testimonial-email`);
			const data = await res.json();
			if (res.ok && data.success && data.data) {
				setTestimonialResult({ subject: data.data.subject, body: data.data.body });
				toast.success('Testimonial email generated');
			} else if (res.status === 402) {
				toast.error(
					`Insufficient credits. Need ${data.required ?? CREDIT_COSTS.CRO_STUDIO_TESTIMONIAL_EMAIL}.`
				);
			} else {
				toast.error(data.error ?? 'Failed to generate testimonial email');
			}
		} catch {
			toast.error('Failed to generate testimonial email');
		} finally {
			setTestimonialLoading(false);
		}
	};

	const copyToClipboard = (text: string, label: string) => {
		navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
	};

	const handleCognitiveLoadExpand = async () => {
		if (!id || !session?.access_token) return;
		const wasExisting = Boolean(cogLoadExplanation?.trim());
		setCogLoadExpanding(true);
		try {
			const res = await api.post(`/api/cro-studio/audits/${id}/cognitive-load`);
			const data = await res.json();
			if (res.ok && data.success) {
				toast.success(
					wasExisting
						? 'Cognitive load explanation regenerated'
						: 'Cognitive load analysis complete'
				);
				setCogLoadExplanation(data.explanation ?? '');
				setActiveTab('ai');
			} else if (res.status === 402) {
				toast.error(
					`Insufficient credits. Need ${data.required ?? CREDIT_COSTS.CRO_STUDIO_SINGLE_FIX}.`
				);
			} else {
				toast.error(data.error ?? 'Analysis failed');
			}
		} catch {
			toast.error('Analysis failed');
		} finally {
			setCogLoadExpanding(false);
		}
	};

	const handleDeepAnalysis = async () => {
		if (!id || !session?.access_token) return;
		const wasExisting = Boolean(deepAnalysisResult?.trim());
		setDeepAnalysisGenerating(true);
		try {
			const res = await api.post(`/api/cro-studio/audits/${id}/emotional-arc`);
			const data = await res.json();
			if (res.ok && data.success && data.analysis) {
				setDeepAnalysisResult(data.analysis);
				toast.success(
					wasExisting ? 'Emotional arc analysis regenerated' : 'Emotional arc analysis complete'
				);
			} else if (res.status === 402) {
				toast.error(
					`Insufficient credits. Need ${data.required ?? CREDIT_COSTS.CRO_STUDIO_EMOTIONAL_ARC}.`
				);
			} else {
				toast.error(data.error ?? 'Analysis failed');
			}
		} catch {
			toast.error('Analysis failed');
		} finally {
			setDeepAnalysisGenerating(false);
		}
	};

	const handleRunSeoChecks = async () => {
		if (!session?.access_token || !audit?.page_url) return;
		setSeoChecking(true);
		try {
			const res = await api.post('/api/seo-checks/run', {
				url: audit.page_url,
				keyword: seoKeyword?.trim() || undefined
			});
			const data = await res.json();
			if (res.ok && data.success && data.seo_checks) {
				setSeoChecks(data.seo_checks);
				toast.success('SEO checks complete');
			} else {
				toast.error(data.error ?? 'SEO checks failed');
			}
		} catch {
			toast.error('SEO checks failed');
		} finally {
			setSeoChecking(false);
		}
	};

	// ── Loading / not found states ─────────────────────────────────────────────

	if (loading) {
		return (
			<CROStudioGate variant="audit">
				<div className="flex justify-center py-16">
					<div className="border-brand-500 size-10 animate-spin rounded-full border-2 border-t-transparent" />
				</div>
			</CROStudioGate>
		);
	}

	if (!audit) {
		return (
			<CROStudioGate variant="audit">
				<div className="py-8">
					<Link
						to="/cro-studio"
						className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
					>
						<ArrowLeft className="size-4" /> Back to CRO Studio
					</Link>
					<div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
						<AlertCircle className="mx-auto mb-4 size-12 text-amber-500" />
						<h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
							Audit not found
						</h2>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							The audit may have been deleted or you don't have access.
						</p>
					</div>
				</div>
			</CROStudioGate>
		);
	}

	// ── DESTINATION PAGE AUDIT VIEW ────────────────────────────────────────────

	if (audit.page_type === 'destination_page') {
		const destChecklist = audit.checklist as { journey_checklist?: JourneyStepResult[] };
		const journey = destChecklist?.journey_checklist ?? [];
		const archViolations = audit.architecture_violations ?? [];
		const biasInventory = audit.bias_inventory ?? [];
		const biasCoherence = audit.bias_coherence ?? null;
		const aboveFold = audit.above_fold ?? null;
		const objectionCoverage = audit.objection_coverage ?? null;
		const cogLoad = audit.cognitive_load ?? null;

		const failingSteps = journey.filter((s) => s.status === 'fail');
		const passingSteps = journey.filter((s) => s.status === 'pass');
		const missingBiases = biasInventory.filter((b) => !b.present);
		const hasAnyFailing = archViolations.length > 0 || failingSteps.length > 0;
		const scorePct =
			audit.max_score > 0 ? Math.round((audit.cro_score / audit.max_score) * 100) : 0;

		// Priority list: arch violations first, then failing steps
		const priorityItems = [
			...archViolations.map((v, i) => ({ key: `arch_${i}`, text: v.message, isArch: true })),
			...failingSteps.slice(0, 3 - archViolations.length).map((s) => ({
				key: String(s.step),
				text: s.name,
				isArch: false
			}))
		].slice(0, 3);

		const allFailingKeys = [
			...archViolations.map((_, i) => `arch_${i}`),
			...failingSteps.map((s) => String(s.step))
		];

		return (
			<CROStudioGate variant="audit">
				<PageMeta title={`${audit.page_label || 'Destination'} · CRO Studio`} noIndex />
				<div className="space-y-6">
					{/* Header */}
					<PageHeader
						breadcrumb={
							<Link
								to="/cro-studio"
								className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
							>
								<ArrowLeft className="size-3.5" /> Back to CRO Studio
							</Link>
						}
						title={audit.page_label || safeUrlPath(audit.page_url) || audit.page_url}
						subtitle={
							<span className="flex flex-wrap items-center gap-2">
								<a
									href={audit.page_url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 hover:underline"
								>
									{audit.page_url}
									<ExternalLink className="size-3" />
								</a>
								{audit.cluster_name && (
									<span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
										{audit.cluster_name}
									</span>
								)}
							</span>
						}
						rightContent={
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={handleReaudit}
									disabled={reauditing}
									className="gap-2"
								>
									<RefreshCw className={`size-4 ${reauditing ? 'animate-spin' : ''}`} />
									Re-audit — <CreditCost amount={CREDIT_COSTS.CRO_STUDIO_AUDIT} />
								</Button>
								{hasAnyFailing && (
									<Button
										size="sm"
										onClick={() => handleGenerateAllFixes(allFailingKeys)}
										disabled={fixGenerating === 'all'}
										className="bg-brand-500 hover:bg-brand-600 gap-2 text-white"
									>
										<Wand2 className={`size-4 ${fixGenerating === 'all' ? 'animate-pulse' : ''}`} />
										Generate all fixes —{' '}
										<CreditCost amount={CREDIT_COSTS.CRO_STUDIO_ALL_FIXES_DEST} />
									</Button>
								)}
							</div>
						}
					/>

					{needsReaudit(audit.audited_at) && (
						<AIInsightBlock
							variant="warning"
							label="RE-AUDIT RECOMMENDED"
							message={
								<>
									This audit is {getAuditAgeDays(audit.audited_at)} days old. Re-audit for fresh
									insights.
									<Button
										variant="outline"
										size="sm"
										onClick={handleReaudit}
										disabled={reauditing}
										className="ml-3 gap-1"
									>
										<RefreshCw className={`size-3.5 ${reauditing ? 'animate-spin' : ''}`} />
										Re-audit now
									</Button>
								</>
							}
						/>
					)}

					{audit.audit_error && audit.audit_error_message && (
						<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
							{audit.audit_error_message}
						</div>
					)}

					{/* Headline insight — single sentence, always first (cro-studio.md Tier 3 Rule 1) */}
					{audit.headline_insight && (
						<div className="border-brand-200 bg-brand-50 dark:border-brand-900/40 dark:bg-brand-900/10 rounded-xl border px-5 py-4">
							<div className="flex items-start gap-3">
								<Zap className="text-brand-600 dark:text-brand-400 mt-0.5 size-5 flex-shrink-0" />
								<p className="text-brand-900 dark:text-brand-200 text-sm leading-relaxed font-medium">
									{audit.headline_insight}
								</p>
							</div>
						</div>
					)}

					{audit.cluster_journey && <ClusterJourneyPanel journey={audit.cluster_journey} />}

					{/* Score strip — all cards are clickable and navigate to the relevant tab+section */}
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
						{/* CRO Score → Journey tab */}
						<button
							type="button"
							className="group hover:border-brand-300 hover:bg-brand-50/40 dark:hover:border-brand-700 dark:hover:bg-brand-900/10 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors dark:border-gray-700 dark:bg-gray-900"
							onClick={() => {
								setActiveTab('journey');
								setTimeout(
									() =>
										document
											.getElementById('journey-section')
											?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
									50
								);
							}}
						>
							<p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
								<Target className="text-brand-500 dark:text-brand-400 size-3.5" />
								CRO Score
							</p>
							<p className="text-xl font-semibold text-gray-900 dark:text-white">{scorePct}%</p>
							<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
								{audit.cro_score} / {audit.max_score} steps passing
							</p>
							<p className="text-brand-500 dark:text-brand-400 mt-1.5 text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
								→ Journey tab
							</p>
						</button>

						{/* Above-fold → Journey tab, above-fold section */}
						<button
							type="button"
							className="group hover:border-brand-300 hover:bg-brand-50/40 dark:hover:border-brand-700 dark:hover:bg-brand-900/10 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors dark:border-gray-700 dark:bg-gray-900"
							onClick={() => {
								setActiveTab('journey');
								setTimeout(
									() =>
										document
											.getElementById('above-fold-section')
											?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
									50
								);
							}}
						>
							<p className="mb-1 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
								Above-fold
							</p>
							<p
								className={`text-xl font-semibold ${aboveFold && aboveFold.score < 3 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}
							>
								{aboveFold ? `${aboveFold.score}/4` : '—'}
							</p>
							<p
								className={`mt-1 text-xs ${aboveFold && aboveFold.score < 3 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}
							>
								{aboveFold && aboveFold.score < 3
									? 'First screen needs work'
									: 'First screen strong'}
							</p>
							<p className="text-brand-500 dark:text-brand-400 mt-1.5 text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
								→ Journey tab
							</p>
						</button>

						{/* Objections → Structure tab, objections section */}
						<button
							type="button"
							className={`group rounded-xl border p-4 text-left transition-colors dark:bg-gray-900 ${
								objectionCoverage && objectionCoverage.addressed < objectionCoverage.total
									? 'border-amber-200 bg-amber-50/60 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10 dark:hover:bg-amber-900/20'
									: 'hover:border-brand-300 hover:bg-brand-50/40 dark:hover:border-brand-700 dark:hover:bg-brand-900/10 border-gray-200 bg-white dark:border-gray-700'
							}`}
							onClick={() => {
								setActiveTab('structure');
								setTimeout(() => scrollIntoView('#objections-section', 100), 50);
							}}
						>
							<p className="mb-1 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
								Objections
							</p>
							<p
								className={`text-xl font-semibold ${objectionCoverage && objectionCoverage.addressed < objectionCoverage.total ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}
							>
								{objectionCoverage
									? `${objectionCoverage.addressed}/${objectionCoverage.total}`
									: '—'}
							</p>
							<p
								className={`mt-1 text-xs font-medium ${objectionCoverage && objectionCoverage.addressed < objectionCoverage.total ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}
							>
								{objectionCoverage && objectionCoverage.addressed < objectionCoverage.total
									? `${objectionCoverage.total - objectionCoverage.addressed} unanswered`
									: 'All addressed'}
							</p>
							<p className="text-brand-500 dark:text-brand-400 mt-1.5 text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
								→ Structure tab
							</p>
						</button>

						{/* Structure violations → Structure tab, arch violations section */}
						<button
							type="button"
							className={`group rounded-xl border p-4 text-left transition-colors dark:bg-gray-900 ${
								archViolations.length > 0
									? 'border-red-200 bg-red-50/60 hover:border-red-300 hover:bg-red-50 dark:border-red-900/40 dark:bg-red-900/10 dark:hover:bg-red-900/20'
									: 'hover:border-brand-300 hover:bg-brand-50/40 dark:hover:border-brand-700 dark:hover:bg-brand-900/10 border-gray-200 bg-white dark:border-gray-700'
							}`}
							onClick={() => {
								setActiveTab('structure');
								setTimeout(
									() =>
										document
											.getElementById('arch-violations-section')
											?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
									50
								);
							}}
						>
							<p className="mb-1 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
								Structure violations
							</p>
							<p
								className={`text-xl font-semibold ${archViolations.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}
							>
								{archViolations.length}
							</p>
							<p
								className={`mt-1 text-xs ${archViolations.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}
							>
								{archViolations.length > 0 ? 'Fix before journey steps' : 'None detected'}
							</p>
							<p className="text-brand-500 dark:text-brand-400 mt-1.5 text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
								→ Structure tab
							</p>
						</button>

						{/* Persuasion signals → Persuasion tab */}
						<button
							type="button"
							className="group hover:border-brand-300 hover:bg-brand-50/40 dark:hover:border-brand-700 dark:hover:bg-brand-900/10 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors dark:border-gray-700 dark:bg-gray-900"
							onClick={() => {
								setActiveTab('persuasion');
								setTimeout(
									() =>
										document
											.getElementById('persuasion-section')
											?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
									50
								);
							}}
						>
							<p className="mb-1 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
								Persuasion signals
							</p>
							<p className="text-xl font-semibold text-gray-900 dark:text-white">
								{biasInventory.filter((b) => b.present).length} / {biasInventory.length}
							</p>
							<p
								className={`mt-1 text-xs ${missingBiases.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}
							>
								{missingBiases.length > 0
									? `${missingBiases.length} signals missing`
									: 'All active'}
							</p>
							<p className="text-brand-500 dark:text-brand-400 mt-1.5 text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
								→ Persuasion tab
							</p>
						</button>

						{/* Cognitive load — navigates to AI tab, cognitive load section */}
						<button
							type="button"
							className={`group rounded-xl border p-4 text-left transition-colors ${
								cogLoad?.level === 'high'
									? 'cursor-pointer border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/10 dark:hover:bg-amber-900/20'
									: 'hover:border-brand-300 hover:bg-brand-50/40 dark:hover:border-brand-700 dark:hover:bg-brand-900/10 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
							}`}
							onClick={() => {
								setActiveTab('ai');
								setTimeout(() => scrollIntoView('#cognitive-load-section', 100), 50);
							}}
						>
							<p className="mb-1 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
								Cognitive load
							</p>
							<p
								className={`text-xl font-semibold ${cogLoad?.level === 'high' ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}
							>
								{cogLoad ? (cogLoad.level === 'high' ? 'High' : 'Normal') : '—'}
							</p>
							<p className="text-brand-500 dark:text-brand-400 mt-1.5 text-[10px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
								→ Deep Analysis tab
							</p>
						</button>
					</div>

					{/* Two-column studio layout */}
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
						{/* LEFT: Tabbed content */}
						<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
							<TabsList className="grid w-full grid-cols-5">
								<TabsTrigger value="start" className="relative">
									Start Here
									{allFailingKeys.length > 0 && (
										<span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
											{Math.min(allFailingKeys.length, 3)}
										</span>
									)}
								</TabsTrigger>
								<TabsTrigger value="journey">Journey</TabsTrigger>
								<TabsTrigger value="structure">Structure</TabsTrigger>
								<TabsTrigger value="persuasion">Signals</TabsTrigger>
								<TabsTrigger value="ai" className={hasAnyFailing ? 'opacity-60' : ''}>
									Deep Analysis
								</TabsTrigger>
							</TabsList>

							<TabsContent value="start" className="mt-0 space-y-4">
								{/* #1: Start Here — 3 highest-impact problems only */}
								{allFailingKeys.length === 0 && missingBiases.length === 0 ? (
									<div className="rounded-xl border border-green-200 bg-green-50 px-6 py-10 text-center dark:border-green-900/40 dark:bg-green-900/10">
										<CheckCircle2 className="mx-auto mb-3 size-10 text-green-500" />
										<h2 className="text-base font-semibold text-green-900 dark:text-green-200">
											All critical checks passing
										</h2>
										<p className="mt-1.5 text-sm text-green-700 dark:text-green-400">
											Use the Journey, Signals, and Deep Analysis tabs to find further optimisation
											opportunities.
										</p>
									</div>
								) : (
									<>
										<div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-800/50">
											<p className="text-xs text-gray-600 dark:text-gray-400">
												<strong className="text-gray-900 dark:text-white">
													Fix these first — in order.
												</strong>{' '}
												Each fix is worth more than any persuasion tweak. Once these are resolved,
												use the other tabs to go deeper.
											</p>
										</div>
										{[
											...archViolations.map((v, i) => ({
												key: `arch_${i}`,
												title: v.message,
												subtitle: `→ ${v.suggestion}`,
												impact: IMPACT_STATEMENTS[v.type],
												tab: 'structure' as const,
												anchor: 'arch-violations-section'
											})),
											...failingSteps.slice(0, Math.max(0, 3 - archViolations.length)).map((s) => ({
												key: String(s.step),
												title: s.name,
												subtitle: s.evidence,
												impact: IMPACT_STATEMENTS[s.type],
												tab: 'journey' as const,
												anchor: 'journey-section'
											})),
											...(allFailingKeys.length < 3 &&
											objectionCoverage &&
											objectionCoverage.addressed < objectionCoverage.total
												? [
														{
															key: 'objections',
															title: `${objectionCoverage.total - objectionCoverage.addressed} unanswered visitor objections`,
															subtitle: "Visitors are leaving with questions you haven't answered",
															impact: IMPACT_STATEMENTS.objection_unaddressed,
															tab: 'structure' as const,
															anchor: 'objections-section'
														}
													]
												: [])
										]
											.slice(0, 3)
											.map((item, i) => (
												<div
													key={item.key}
													className={`overflow-hidden rounded-xl border bg-white transition-all dark:bg-gray-900 ${doneItems.has(item.key) ? 'border-green-200 opacity-60 dark:border-green-900/40' : 'border-red-200 dark:border-red-900/50'}`}
												>
													<div
														className={`flex items-center gap-3 px-5 py-3 ${doneItems.has(item.key) ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}
													>
														<div
															className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${doneItems.has(item.key) ? 'bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}
														>
															{doneItems.has(item.key) ? '✓' : i + 1}
														</div>
														<p className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">
															{item.title}
														</p>
														<div className="flex items-center gap-2">
															<button
																type="button"
																onClick={() => {
																	setActiveTab(item.tab);
																	setTimeout(
																		() =>
																			document
																				.getElementById(item.anchor)
																				?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
																		50
																	);
																}}
																className="text-brand-600 dark:text-brand-400 text-xs hover:underline"
															>
																See detail →
															</button>
															{/* #5: Mark as done */}
															<button
																type="button"
																onClick={() => toggleDone(item.key)}
																className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${doneItems.has(item.key) ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-white text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700'}`}
															>
																{doneItems.has(item.key) ? (
																	<>
																		<Check className="size-3" /> Done
																	</>
																) : (
																	'Mark done'
																)}
															</button>
														</div>
													</div>
													{!doneItems.has(item.key) && (
														<div className="space-y-3 px-5 py-4">
															<p className="text-sm text-gray-600 dark:text-gray-400">
																{item.subtitle}
															</p>
															{item.impact && (
																<p className="text-xs font-medium text-red-700 dark:text-red-400">
																	{item.impact}
																</p>
															)}
															<FixPanelInline
																itemKey={item.key}
																fixesByItem={fixesByItem}
																fixGenerating={fixGenerating}
																onGenerate={handleGenerateFix}
															/>
														</div>
													)}
												</div>
											))}
										{allFailingKeys.length === 0 && missingBiases.length > 0 && (
											<div className="rounded-xl border border-amber-200 bg-amber-50/60 px-5 py-4 dark:border-amber-900/40 dark:bg-amber-900/10">
												<p className="text-sm font-medium text-amber-900 dark:text-amber-200">
													Structure and journey checks passing ✓
												</p>
												<p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
													Your next focus is persuasion signals — {missingBiases.length} missing.
													Open the Signals tab to add them.
												</p>
												<button
													type="button"
													onClick={() => setActiveTab('persuasion')}
													className="text-brand-600 dark:text-brand-400 mt-2 text-xs hover:underline"
												>
													Go to Signals →
												</button>
											</div>
										)}
									</>
								)}
							</TabsContent>

							<TabsContent value="structure" className="mt-0 space-y-6">
								{/* Architecture violations — always shown (success state when none) */}
								<section
									id="arch-violations-section"
									className={`overflow-hidden rounded-xl border bg-white dark:bg-gray-900 ${
										archViolations.length > 0
											? 'border-red-200 dark:border-red-900/50'
											: 'border-green-200 dark:border-green-900/40'
									}`}
								>
									<div
										className={`flex items-center gap-2 border-b px-5 py-3 ${
											archViolations.length > 0
												? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10'
												: 'border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10'
										}`}
									>
										{archViolations.length > 0 ? (
											<XCircle className="size-4 text-red-600 dark:text-red-400" />
										) : (
											<Check className="size-4 text-green-600 dark:text-green-400" />
										)}
										<h2
											className={`text-sm font-semibold ${
												archViolations.length > 0
													? 'text-red-800 dark:text-red-300'
													: 'text-green-800 dark:text-green-300'
											}`}
										>
											Page structure — trust before CTA, CTA above fold
										</h2>
									</div>
									{archViolations.length > 0 ? (
										<ul className="divide-y divide-gray-100 dark:divide-gray-800">
											{archViolations.map((v, i) => (
												<li key={i} className="px-5 py-4">
													<p className="font-medium text-gray-900 dark:text-white">{v.message}</p>
													<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
														→ {v.suggestion}
													</p>
													{IMPACT_STATEMENTS[v.type] && (
														<p className="mt-1.5 text-xs font-medium text-red-700 dark:text-red-400">
															{IMPACT_STATEMENTS[v.type]}
														</p>
													)}
													<FixPanel
														itemKey={`arch_${i}`}
														options={fixesByItem[`arch_${i}`] ?? []}
														generating={fixGenerating === `arch_${i}`}
														onGenerate={handleGenerateFix}
														creditCost={CREDIT_COSTS.CRO_STUDIO_SINGLE_FIX}
													/>
												</li>
											))}
										</ul>
									) : (
										<div className="px-5 py-4">
											<p className="text-sm text-gray-600 dark:text-gray-400">
												No structure violations found — credibility signals appear before your CTA,
												and your first CTA is positioned early enough.
											</p>
										</div>
									)}
								</section>

								{/* Unanswered questions — objection coverage */}
								{objectionCoverage && (
									<div id="objections-section">
										<UnansweredQuestionsPanel
											data={objectionCoverage}
											fixesByItem={fixesByItem}
											fixGenerating={fixGenerating}
											onGenerate={handleGenerateFix}
										/>
									</div>
								)}
							</TabsContent>

							<TabsContent value="journey" className="mt-0 space-y-6">
								{/* Journey map */}
								<section
									id="journey-section"
									className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
								>
									<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
										<div>
											<h2 className="text-base font-semibold text-gray-900 dark:text-white">
												Optimal selling journey
											</h2>
											<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
												Emotional hook → logical justification → emotional close
											</p>
										</div>
										<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
											{passingSteps.length} / 11 passing
										</span>
										{failingSteps.length > 0 && (
											<p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
												Fix in step order — earlier steps matter more
											</p>
										)}
									</div>

									{/* Phase strip */}
									<div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
										<JourneyPhaseStrip journey={journey} />
									</div>

									{/* Step rows — phase dividers (#2) + mark done (#5) */}
									<ul className="divide-y divide-gray-100 dark:divide-gray-800">
										{journey.map((step, stepIdx) => {
											const isFailing = step.status === 'fail';
											const isDone = doneItems.has(String(step.step));
											// Insert phase label row before step 1, 6, 9
											const phaseLabel =
												step.step === 1
													? {
															label: 'Emotional hook',
															color:
																'bg-teal-50 text-teal-700 dark:bg-teal-900/10 dark:text-teal-300'
														}
													: step.step === 6
														? {
																label: 'Logical justification',
																color:
																	'bg-blue-50 text-blue-700 dark:bg-blue-900/10 dark:text-blue-300'
															}
														: step.step === 9
															? {
																	label: 'Emotional close',
																	color:
																		'bg-teal-50 text-teal-700 dark:bg-teal-900/10 dark:text-teal-300'
																}
															: null;
											return (
												<React.Fragment key={step.step}>
													{phaseLabel && (
														<li
															className={`border-b border-gray-100 px-5 py-1.5 text-[10px] font-semibold tracking-widest uppercase dark:border-gray-800 ${phaseLabel.color}`}
														>
															{phaseLabel.label}
														</li>
													)}
													<li
														className={`px-5 py-4 transition-opacity ${
															isDone
																? 'opacity-50'
																: isFailing
																	? 'bg-red-50/60 dark:bg-red-900/10'
																	: step.status === 'partial'
																		? 'bg-amber-50/50 dark:bg-amber-900/5'
																		: ''
														}`}
													>
														<div className="flex items-start gap-3">
															<div
																className={`flex size-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
																	isDone
																		? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
																		: step.status === 'fail'
																			? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
																			: step.status === 'partial'
																				? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
																				: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
																}`}
															>
																{isDone ? (
																	<Check className="size-3" />
																) : (
																	(step.stepDisplay ?? step.step)
																)}
															</div>
															<div className="min-w-0 flex-1">
																<div className="flex flex-wrap items-center gap-2">
																	<p
																		className={`font-medium ${isFailing && !isDone ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}
																	>
																		{step.name}
																	</p>
																	<span
																		className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${step.type === 'logical' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'}`}
																	>
																		{step.type}
																	</span>
																</div>
																<p
																	className={`mt-1 text-sm ${isFailing && !isDone ? 'text-red-700 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'}`}
																>
																	{step.evidence}
																</p>
																{(isFailing || step.status === 'partial') &&
																	!isDone &&
																	IMPACT_STATEMENTS[step.type] && (
																		<p className="mt-1.5 text-xs font-medium text-red-700 dark:text-red-400">
																			{IMPACT_STATEMENTS[step.type]}
																		</p>
																	)}
																{(isFailing || step.status === 'partial') && !isDone && (
																	<FixPanel
																		itemKey={String(step.step)}
																		options={fixesByItem[String(step.step)] ?? []}
																		generating={fixGenerating === String(step.step)}
																		onGenerate={handleGenerateFix}
																		creditCost={CREDIT_COSTS.CRO_STUDIO_SINGLE_FIX}
																	/>
																)}
																{/* #5 Mark as done */}
																{(isFailing || step.status === 'partial') && (
																	<button
																		type="button"
																		onClick={() => toggleDone(String(step.step))}
																		className={`mt-2 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${isDone ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-white text-gray-500 ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700'}`}
																	>
																		{isDone ? (
																			<>
																				<Check className="size-3" />
																				&#32;Marked done — undo
																			</>
																		) : (
																			'Mark as done'
																		)}
																	</button>
																)}
															</div>
														</div>
													</li>
												</React.Fragment>
											);
										})}
									</ul>
								</section>

								{aboveFold && (
									<div id="above-fold-section">
										<AboveFoldPanel data={aboveFold} />
									</div>
								)}
							</TabsContent>

							<TabsContent value="persuasion" className="mt-0 space-y-6">
								{/* Persuasion profile — full list, expandable */}
								<section
									id="persuasion-section"
									className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
								>
									<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
										<div className="flex items-center gap-2">
											<Brain className="text-brand-500 size-4" />
											<h2 className="text-base font-semibold text-gray-900 dark:text-white">
												Persuasion profile
											</h2>
										</div>
										<span className="text-sm text-gray-500 dark:text-gray-400">
											{biasInventory.filter((b) => b.present).length} / {biasInventory.length}{' '}
											active
										</span>
									</div>
									{biasCoherence && biasCoherence.conflicts.length > 0 && (
										<div className="border-b border-red-200 bg-red-50 px-5 py-3 dark:border-red-900/50 dark:bg-red-900/10">
											<p className="mb-2 text-xs font-semibold text-red-800 dark:text-red-300">
												Conflict pairs — these biases work against each other
											</p>
											<ul className="space-y-1.5 text-xs text-red-700 dark:text-red-400">
												{biasCoherence.conflicts.map((c, i) => (
													<li key={i}>
														<strong>{c.pair[0]}</strong> + <strong>{c.pair[1]}</strong>
														{c.reason && (
															<span className="block text-red-600 dark:text-red-500">
																→ {c.reason}
															</span>
														)}
													</li>
												))}
											</ul>
										</div>
									)}
									{biasCoherence && biasCoherence.overoptimised && (
										<div className="border-b border-amber-200 bg-amber-50 px-5 py-3 dark:border-amber-900/30 dark:bg-amber-900/10">
											<p className="text-xs text-amber-800 dark:text-amber-300">
												<strong>Overoptimisation:</strong> {biasCoherence.active_count} persuasion
												signals active. More signals can create noise. Focus on your strongest 4–5.
											</p>
										</div>
									)}
									{biasCoherence && biasCoherence.synergies.length > 0 && (
										<div className="border-b border-green-100 bg-green-50 px-5 py-3 dark:border-green-900/20 dark:bg-green-900/10">
											<p className="mb-2 text-xs font-semibold text-green-800 dark:text-green-300">
												Synergy pairs — these amplify each other
											</p>
											<ul className="space-y-1 text-xs text-green-700 dark:text-green-400">
												{biasCoherence.synergies.map((s, i) => (
													<li key={i}>
														<strong>{s.pair[0]}</strong> + <strong>{s.pair[1]}</strong>
														{s.reason && (
															<span className="block text-green-600 dark:text-green-500">
																→ {s.reason}
															</span>
														)}
													</li>
												))}
											</ul>
										</div>
									)}
									{biasCoherence && biasCoherence.recommendations.length > 0 && (
										<div className="border-b border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-800/50">
											<p className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
												Recommended for this page type
											</p>
											<p className="text-xs text-gray-600 dark:text-gray-400">
												{biasCoherence.recommendations.join(', ')}
											</p>
										</div>
									)}
									{missingBiases.length > 0 && (
										<div className="border-b border-amber-100 bg-amber-50 px-5 py-3 dark:border-amber-900/30 dark:bg-amber-900/10">
											<p className="text-xs text-amber-800 dark:text-amber-300">
												<strong>
													{missingBiases.length} persuasion signal
													{missingBiases.length !== 1 ? 's' : ''} missing
												</strong>{' '}
												— expand each one to understand what it is, why it matters, and how to add
												it to your page.
											</p>
										</div>
									)}
									{/* Add these — missing signals */}
									{missingBiases.length > 0 && (
										<div className="space-y-2 p-4">
											<p className="px-1 pb-1 text-[10px] font-semibold tracking-widest text-amber-700 uppercase dark:text-amber-400">
												Add these — {missingBiases.length} missing
											</p>
											{missingBiases.map((bias) => (
												<BiasCard
													key={bias.bias_id}
													bias={bias}
													onGenerate={handleGenerateFix}
													fixes={fixesByItem[`bias_${bias.bias_id}`] ?? []}
													generating={fixGenerating === `bias_${bias.bias_id}`}
												/>
											))}
										</div>
									)}
									{/* Already working */}
									{biasInventory.filter((b) => b.present).length > 0 && (
										<div
											className={`space-y-2 p-4 ${missingBiases.length > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}
										>
											<p className="px-1 pb-1 text-[10px] font-semibold tracking-widest text-green-700 uppercase dark:text-green-400">
												Already working — keep these
											</p>
											{biasInventory
												.filter((b) => b.present)
												.map((bias) => (
													<BiasCard
														key={bias.bias_id}
														bias={bias}
														onGenerate={handleGenerateFix}
														fixes={fixesByItem[`bias_${bias.bias_id}`] ?? []}
														generating={fixGenerating === `bias_${bias.bias_id}`}
													/>
												))}
										</div>
									)}
								</section>
							</TabsContent>

							<TabsContent value="ai" id="ai-section" className="mt-0 space-y-6">
								{/* #6 Advisory banner when critical issues remain */}
								{hasAnyFailing && (
									<div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/10">
										<AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
										<div>
											<p className="text-sm font-medium text-amber-900 dark:text-amber-200">
												Recommended: fix structure and journey issues first
											</p>
											<p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
												Deep analysis is most useful after critical issues are resolved — otherwise
												you're optimizing the wrong layer.{' '}
												<button
													type="button"
													onClick={() => setActiveTab('start')}
													className="font-medium underline"
												>
													Go to Start Here →
												</button>
											</p>
										</div>
									</div>
								)}
								{/* Cognitive load — plain-English explanation (always shown so users can run it) */}
								<section
									id="cognitive-load-section"
									className={`overflow-hidden rounded-xl border bg-white dark:bg-gray-900 ${
										cogLoad?.level === 'high'
											? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-900/10'
											: 'border-gray-200 dark:border-gray-700'
									}`}
								>
									<div
										className={`flex items-center justify-between border-b px-5 py-3 ${
											cogLoad?.level === 'high'
												? 'border-amber-200 bg-amber-100/50 dark:border-amber-900/50 dark:bg-amber-900/20'
												: 'border-gray-200 dark:border-gray-700'
										}`}
									>
										<div className="flex items-center gap-2">
											<Brain
												className={`size-4 ${cogLoad?.level === 'high' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}
											/>
											<h2
												className={`text-sm font-semibold ${
													cogLoad?.level === 'high'
														? 'text-amber-800 dark:text-amber-200'
														: 'text-gray-900 dark:text-white'
												}`}
											>
												Cognitive load — plain-English explanation
											</h2>
										</div>
										<Button
											size="sm"
											variant="outline"
											onClick={handleCognitiveLoadExpand}
											disabled={cogLoadExpanding}
											className={`flex-shrink-0 gap-2 ${
												cogLoad?.level === 'high'
													? 'border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/30'
													: ''
											}`}
										>
											{cogLoadExpanding ? (
												<RefreshCw className="size-4 animate-spin" />
											) : cogLoadExplanation?.trim() ? (
												<RefreshCw className="size-4" />
											) : (
												<Brain className="size-4" />
											)}
											{cogLoadExpanding ? (
												'Analyzing…'
											) : cogLoadExplanation?.trim() ? (
												<>
													Regenerate explanation —{' '}
													<CreditCost amount={CREDIT_COSTS.CRO_STUDIO_SINGLE_FIX} />
												</>
											) : (
												<>
													Get explanation —{' '}
													<CreditCost amount={CREDIT_COSTS.CRO_STUDIO_SINGLE_FIX} />
												</>
											)}
										</Button>
									</div>
									<div className="p-5">
										{cogLoadExplanation ? (
											<p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
												{cogLoadExplanation}
											</p>
										) : (
											<p className="text-sm text-gray-500 dark:text-gray-400">
												{cogLoad?.level === 'high'
													? 'Click the button above to generate a plain-English explanation of why this page has high cognitive load and what to fix.'
													: "Click the button above to generate a plain-English explanation of this page's cognitive load metrics and how to keep them in a healthy range."}
											</p>
										)}
									</div>
								</section>

								{/* Deep Analysis — Emotional Arc (cro-studio.md Tier 2, 3 credits) */}
								<section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
									<div className="flex items-center justify-between px-5 py-4">
										<div className="flex items-center gap-2">
											<Sparkles className="text-brand-500 size-4" />
											<div>
												<h2 className="text-base font-semibold text-gray-900 dark:text-white">
													Emotional arc — deep analysis
												</h2>
												<p className="text-xs text-gray-500 dark:text-gray-400">
													Does your page’s emotional tone progress correctly from hook to close?
												</p>
											</div>
										</div>
										<Button
											size="sm"
											variant="outline"
											onClick={handleDeepAnalysis}
											disabled={deepAnalysisGenerating}
											className="flex-shrink-0 gap-2"
										>
											{deepAnalysisGenerating ? (
												<RefreshCw className="size-4 animate-spin" />
											) : deepAnalysisResult?.trim() ? (
												<RefreshCw className="size-4" />
											) : (
												<Sparkles className="size-4" />
											)}
											{deepAnalysisGenerating ? (
												'Analyzing…'
											) : deepAnalysisResult?.trim() ? (
												<>
													Regenerate analysis —{' '}
													<CreditCost amount={CREDIT_COSTS.CRO_STUDIO_EMOTIONAL_ARC} />
												</>
											) : (
												<>
													Run analysis —{' '}
													<CreditCost amount={CREDIT_COSTS.CRO_STUDIO_EMOTIONAL_ARC} />
												</>
											)}
										</Button>
									</div>
									{deepAnalysisResult ? (
										<div className="border-t border-gray-200 px-5 py-4 dark:border-gray-700">
											<p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
												{deepAnalysisResult}
											</p>
										</div>
									) : (
										<div className="border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/30">
											<p className="text-xs text-gray-500 dark:text-gray-400">
												This analysis reads your page’s emotional tone section by section —
												identifying where momentum drops, where jargon kills engagement, and where
												your close loses the energy you built in the hook.
											</p>
										</div>
									)}
								</section>
							</TabsContent>
						</Tabs>

						{/* RIGHT: Fix priority + SEO basics (sticky) */}
						<div className="top-[calc(var(--header-height)+1rem)] space-y-4 lg:sticky">
							{/* Fix priority — always shown; success state when no issues */}
							<div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
								<div
									className={`border-b border-gray-200 px-4 py-3 dark:border-gray-700 ${
										priorityItems.length === 0 ? 'bg-green-50 dark:bg-green-900/10' : ''
									}`}
								>
									<div className="flex items-center gap-2">
										{priorityItems.length === 0 && (
											<Check className="size-4 flex-shrink-0 text-green-600 dark:text-green-400" />
										)}
										<div>
											<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
												Fix priority
											</h3>
											<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
												{priorityItems.length === 0
													? 'No critical issues — all checks passing'
													: 'Highest impact first'}
											</p>
										</div>
									</div>
								</div>
								{priorityItems.length > 0 ? (
									<ul className="divide-y divide-gray-100 dark:divide-gray-800">
										{priorityItems.map((item, i) => (
											<li key={item.key}>
												<button
													type="button"
													className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
													onClick={() => {
														const tab = item.isArch ? 'structure' : 'journey';
														const anchor = item.isArch
															? 'arch-violations-section'
															: 'journey-section';
														setActiveTab(tab);
														setTimeout(
															() =>
																document
																	.getElementById(anchor)
																	?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
															50
														);
													}}
												>
													<div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
														{i + 1}
													</div>
													<div className="min-w-0 flex-1">
														<p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
															{item.text}
														</p>
														<p className="text-brand-500 dark:text-brand-400 mt-0.5 text-[10px]">
															{item.isArch ? 'Structure tab →' : 'Journey tab →'}
														</p>
													</div>
												</button>
											</li>
										))}
									</ul>
								) : (
									<div className="px-4 py-4">
										<p className="text-xs text-gray-500 dark:text-gray-400">
											Structure and journey checks passed. Focus on persuasion signals and AI
											analysis if you want to optimise further.
										</p>
									</div>
								)}
							</div>

							{/* SEO basics — run on-demand against live page */}
							<div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
								<div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
									<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
										SEO basics
									</h3>
									<p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
										On-page SEO checks (title, H1, meta description, schema)
									</p>
								</div>
								<div className="space-y-2 px-4 py-3">
									<Input
										type="text"
										placeholder="Keyword (for title, H1, URL checks)"
										value={seoKeyword}
										onChange={(e) => setSeoKeyword(e.target.value)}
										className="h-9 text-sm"
									/>
									<Button
										variant="outline"
										size="sm"
										onClick={handleRunSeoChecks}
										disabled={seoChecking || !audit?.page_url || !seoKeyword?.trim()}
										className="w-full gap-2"
									>
										{seoChecking ? (
											<RefreshCw className="size-4 animate-spin" />
										) : seoChecks ? (
											<RefreshCw className="size-4" />
										) : (
											<Search className="size-4" />
										)}
										{seoChecking
											? 'Running…'
											: seoChecks
												? 'Run SEO checks again'
												: 'Run SEO checks'}
									</Button>
									{seoChecks && <SeoChecksDisplay seoChecks={seoChecks} />}
								</div>
							</div>

							{/* Generate more — FAQ + testimonial (destination page only) */}
							<div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
								<div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
									<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
										Generate more
									</h3>
									<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
										FAQ & testimonial request for this page
									</p>
								</div>
								<div className="space-y-4 p-4">
									<div>
										<Button
											variant="outline"
											size="sm"
											onClick={handleGenerateFAQ}
											disabled={faqLoading}
											className="w-full gap-2"
										>
											{faqLoading ? (
												<Wand2 className="size-4 animate-pulse" />
											) : faqResult && faqResult.length > 0 ? (
												<RefreshCw className="size-4" />
											) : (
												<Wand2 className="size-4" />
											)}
											{faqResult && faqResult.length > 0
												? 'Regenerate FAQ (5 Q&A)'
												: 'Generate FAQ (5 Q&A)'}{' '}
											— <CreditCost amount={CREDIT_COSTS.CRO_STUDIO_FAQ} />
										</Button>
										{faqResult && faqResult.length > 0 && (
											<div className="mt-3 space-y-2">
												{faqResult.map((item, i) => (
													<div
														key={i}
														className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800/50"
													>
														<p className="text-xs font-medium text-gray-900 dark:text-white">
															{item.q}
														</p>
														<p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
															{item.a}
														</p>
														<button
															type="button"
															onClick={() => copyToClipboard(`${item.q}\n\n${item.a}`, 'Q&A')}
															className="text-brand-600 dark:text-brand-400 mt-1.5 inline-flex items-center gap-1 text-[11px] hover:underline"
														>
															<Copy className="size-3" /> Copy
														</button>
													</div>
												))}
											</div>
										)}
									</div>
									<div>
										<Button
											variant="outline"
											size="sm"
											onClick={handleGenerateTestimonial}
											disabled={testimonialLoading}
											className="w-full gap-2"
										>
											{testimonialLoading ? (
												<Wand2 className="size-4 animate-pulse" />
											) : testimonialResult ? (
												<RefreshCw className="size-4" />
											) : (
												<Wand2 className="size-4" />
											)}
											{testimonialResult ? 'Regenerate testimonial email' : 'Testimonial email'} —{' '}
											<CreditCost amount={CREDIT_COSTS.CRO_STUDIO_TESTIMONIAL_EMAIL} />
										</Button>
										{testimonialResult && (
											<div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800/50">
												<p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
													Subject
												</p>
												<p className="text-xs text-gray-900 dark:text-white">
													{testimonialResult.subject}
												</p>
												<p className="mt-2 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
													Body
												</p>
												<p className="mt-0.5 text-xs whitespace-pre-wrap text-gray-600 dark:text-gray-400">
													{testimonialResult.body}
												</p>
												<div className="mt-2 flex gap-2">
													<button
														type="button"
														onClick={() => copyToClipboard(testimonialResult!.subject, 'Subject')}
														className="text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 text-[11px] hover:underline"
													>
														<Copy className="size-3" /> Copy subject
													</button>
													<button
														type="button"
														onClick={() => copyToClipboard(testimonialResult!.body, 'Body')}
														className="text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 text-[11px] hover:underline"
													>
														<Copy className="size-3" /> Copy body
													</button>
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</CROStudioGate>
		);
	}

	// ── SEO PAGE AUDIT VIEW ────────────────────────────────────────────────────

	// Backend returns attentionHook; UI uses emotionalHook — normalize for display
	const rawChecklist = (audit.checklist ?? {}) as Record<string, SEOChecklistItem>;
	const checklist: Record<string, SEOChecklistItem> = { ...rawChecklist };
	if (rawChecklist.attentionHook && !rawChecklist.emotionalHook) {
		checklist.emotionalHook = rawChecklist.attentionHook;
	}

	const criticalItems = SEO_ITEM_ORDER.filter((k) => checklist[k]?.status === 'fail');
	const partialItems = SEO_ITEM_ORDER.filter((k) => checklist[k]?.status === 'partial');
	const strongItems = SEO_ITEM_ORDER.filter((k) => checklist[k]?.status === 'pass');
	const naItems = SEO_ITEM_ORDER.filter((k) => checklist[k]?.status === 'na');
	const croScorePct =
		audit.max_score > 0 ? Math.round((audit.cro_score / audit.max_score) * 100) : 0;

	// The most important check — is the destination handoff in place?
	const handoffStatus = checklist['handoff']?.status ?? 'na';
	const handoffPass = handoffStatus === 'pass';
	const allFailingKeys = [...criticalItems, ...partialItems];

	return (
		<CROStudioGate variant="audit">
			<PageMeta title={audit.page_label || safeUrlPath(audit.page_url) || 'CRO Audit'} noIndex />
			<div className="space-y-6">
				{/* Header */}
				<PageHeader
					breadcrumb={
						<Link
							to="/cro-studio"
							className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
						>
							<ArrowLeft className="size-3.5" /> Back to CRO Studio
						</Link>
					}
					title={audit.page_label || safeUrlPath(audit.page_url) || audit.page_url}
					subtitle={
						<span className="flex flex-wrap items-center gap-2">
							<a
								href={audit.page_url}
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-brand-600 inline-flex items-center gap-1 text-gray-500 dark:text-gray-400"
							>
								{audit.page_url}
								<ExternalLink className="size-3.5" />
							</a>
							<span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
								SEO Page
							</span>
							{audit.cluster_name && (
								<span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
									{audit.cluster_name}
								</span>
							)}
						</span>
					}
					rightContent={
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handleReaudit}
								disabled={reauditing}
								className="gap-2"
							>
								<RefreshCw className={`size-4 ${reauditing ? 'animate-spin' : ''}`} />
								Re-audit — <CreditCost amount={CREDIT_COSTS.CRO_STUDIO_AUDIT} />
							</Button>
							{allFailingKeys.length > 0 && (
								<Button
									size="sm"
									onClick={() => handleGenerateAllFixes(allFailingKeys as unknown as string[])}
									disabled={fixGenerating === 'all'}
									className="bg-brand-500 hover:bg-brand-600 gap-2 text-white"
								>
									<Wand2 className={`size-4 ${fixGenerating === 'all' ? 'animate-pulse' : ''}`} />
									Get fixes — <CreditCost amount={CREDIT_COSTS.CRO_STUDIO_ALL_FIXES_SEO} />
								</Button>
							)}
						</div>
					}
				/>

				{needsReaudit(audit.audited_at) && (
					<AIInsightBlock
						variant="warning"
						label="RE-AUDIT RECOMMENDED"
						message={
							<>
								This audit is {getAuditAgeDays(audit.audited_at)} days old.
								<Button
									variant="outline"
									size="sm"
									onClick={handleReaudit}
									disabled={reauditing}
									className="ml-3 gap-1"
								>
									<RefreshCw className={`size-3.5 ${reauditing ? 'animate-spin' : ''}`} />
									Re-audit now
								</Button>
							</>
						}
					/>
				)}

				{audit.audit_error && audit.audit_error_message && (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
						{audit.audit_error_message}
					</div>
				)}

				{/* Headline insight */}
				{audit.headline_insight && (
					<div className="border-brand-200 bg-brand-50 dark:border-brand-900/40 dark:bg-brand-900/10 rounded-xl border px-5 py-4">
						<div className="flex items-start gap-3">
							<Zap className="text-brand-600 dark:text-brand-400 mt-0.5 size-5 flex-shrink-0" />
							<p className="text-brand-900 dark:text-brand-200 text-sm leading-relaxed font-medium">
								{audit.headline_insight}
							</p>
						</div>
					</div>
				)}

				{/* Cluster journey panel */}
				{audit.cluster_journey && <ClusterJourneyPanel journey={audit.cluster_journey} />}

				{/* Handoff status — the most critical single signal for an SEO page */}
				<div
					className={`overflow-hidden rounded-xl border ${
						handoffPass
							? 'border-green-200 bg-green-50/40 dark:border-green-900/30 dark:bg-green-900/5'
							: 'border-red-200 bg-red-50/40 dark:border-red-900/30 dark:bg-red-900/5'
					}`}
				>
					<div className={`flex items-start gap-4 px-5 py-5`}>
						{/* Big status indicator */}
						<div
							className={`flex size-12 flex-shrink-0 items-center justify-center rounded-xl ${
								handoffPass ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
							}`}
						>
							{handoffPass ? (
								<Check className="size-6 text-green-600 dark:text-green-400" />
							) : (
								<XCircle className="size-6 text-red-600 dark:text-red-400" />
							)}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<h2
									className={`text-base font-semibold ${handoffPass ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}
								>
									{handoffPass ? 'Destination handoff is working' : 'Destination handoff is broken'}
								</h2>
								{audit.destination_url && (
									<a
										href={audit.destination_url}
										target="_blank"
										rel="noopener noreferrer"
										className="hover:text-brand-600 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
									>
										{audit.destination_url}
										<ExternalLink className="size-3" />
									</a>
								)}
							</div>
							<p
								className={`mt-1 text-sm ${handoffPass ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}
							>
								{checklist['handoff']?.evidence ??
									(handoffPass
										? 'The first in-body link correctly points to your destination page. Link equity is flowing where it needs to go.'
										: 'Your first in-body link does not point to your destination page. The SEO equity this page builds is not flowing to your product.')}
							</p>
							{!handoffPass && (
								<>
									<p className="mt-2 text-xs font-medium text-red-700 dark:text-red-400">
										{SEO_ITEM_IMPACT['handoff']}
									</p>
									<FixPanel
										itemKey="handoff"
										options={fixesByItem['handoff'] ?? []}
										generating={fixGenerating === 'handoff'}
										onGenerate={handleGenerateFix}
										creditCost={CREDIT_COSTS.CRO_STUDIO_SINGLE_FIX}
									/>
								</>
							)}
							{handoffPass && (
								<div className="mt-3 rounded-lg bg-green-100/60 px-3 py-2 dark:bg-green-900/20">
									<p className="text-xs text-green-800 dark:text-green-300">
										<strong>What this means:</strong> Every visitor who lands on this page and reads
										the intro has a natural path to your destination page. The link equity from this
										page's rankings is flowing directly to your product. This is the reverse silo
										working correctly.
									</p>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Stats */}
				<div className="grid grid-cols-3 gap-4">
					<StatCard
						label="Conversion readiness"
						value={`${croScorePct}%`}
						delta={`${audit.cro_score} / ${audit.max_score} checks · ${formatAuditedAt(audit.audited_at)}`}
						deltaDirection="neutral"
					/>
					<StatCard
						label="Stopping conversions"
						value={criticalItems.length + partialItems.length}
						delta={
							criticalItems.length + partialItems.length > 0
								? 'Generate fixes to resolve'
								: 'Nothing critical'
						}
						deltaDirection={criticalItems.length + partialItems.length > 0 ? 'down' : 'neutral'}
					/>
					<StatCard
						label="Working well"
						value={strongItems.length}
						delta={`${strongItems.length} of ${audit.max_score} checks passing`}
						deltaDirection="neutral"
					/>
				</div>

				{/* Two-column layout */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
					{/* LEFT — checklist items */}
					<div className="space-y-4">
						{/* Remaining checklist items (handoff shown above separately) */}
						{SEO_ITEM_ORDER.filter((k) => k !== 'handoff').map((key) => {
							const status = checklist[key]?.status ?? 'na';
							const isFailing = status === 'fail';
							const isPartial = status === 'partial';
							const isNa = status === 'na';
							const isPassing = status === 'pass';
							return (
								<div
									key={key}
									className={`overflow-hidden rounded-xl border ${
										isFailing
											? 'border-red-200 bg-white dark:border-red-900/40 dark:bg-gray-900'
											: isPartial
												? 'border-amber-200 bg-white dark:border-amber-900/40 dark:bg-gray-900'
												: isNa
													? 'border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50'
													: 'border-green-200 bg-white dark:border-green-900/30 dark:bg-gray-900'
									}`}
								>
									<div className="flex items-start gap-4 px-5 py-4">
										{/* Status icon */}
										<div
											className={`mt-0.5 flex size-8 flex-shrink-0 items-center justify-center rounded-lg ${
												isFailing
													? 'bg-red-100 dark:bg-red-900/30'
													: isPartial
														? 'bg-amber-100 dark:bg-amber-900/30'
														: isNa
															? 'bg-gray-100 dark:bg-gray-800'
															: 'bg-green-100 dark:bg-green-900/30'
											}`}
										>
											{isFailing && <XCircle className="size-4 text-red-600 dark:text-red-400" />}
											{isPartial && (
												<AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
											)}
											{isPassing && <Check className="size-4 text-green-600 dark:text-green-400" />}
											{isNa && <span className="text-xs font-medium text-gray-400">—</span>}
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<p
													className={`font-medium ${isNa ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}
												>
													{SEO_ITEM_LABELS[key] ?? key}
												</p>
												{isNa && (
													<span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
														Not applicable
													</span>
												)}
											</div>
											<p
												className={`mt-1 text-sm ${
													isFailing
														? 'text-red-700 dark:text-red-300'
														: isPartial
															? 'text-amber-700 dark:text-amber-300'
															: isNa
																? 'text-gray-400 dark:text-gray-500'
																: 'text-gray-500 dark:text-gray-400'
												}`}
											>
												{checklist[key]?.evidence ?? ''}
											</p>
											{(isFailing || isPartial) && SEO_ITEM_IMPACT[key] && (
												<p
													className={`mt-1.5 text-xs font-medium ${isFailing ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}
												>
													{SEO_ITEM_IMPACT[key]}
												</p>
											)}
											{isPassing && (
												<div className="mt-2 flex items-center gap-1.5">
													<Check className="size-3 text-green-500" />
													<span className="text-xs text-green-700 dark:text-green-400">
														Working well — keep this
													</span>
												</div>
											)}
											{(isFailing || isPartial) && (
												<FixPanel
													itemKey={key}
													options={fixesByItem[key] ?? []}
													generating={fixGenerating === key}
													onGenerate={handleGenerateFix}
													creditCost={CREDIT_COSTS.CRO_STUDIO_SINGLE_FIX}
												/>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>

					{/* RIGHT — sticky sidebar */}
					<div className="space-y-4 lg:sticky lg:top-6">
						{/* What this page's job is */}
						<div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
							<div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
								<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
									This page's job
								</h3>
								<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
									In the reverse silo funnel
								</p>
							</div>
							<div className="space-y-3 p-4">
								<div className="flex items-start gap-3">
									<div className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
										1
									</div>
									<p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
										<strong>Rank high</strong> on Google for its target keyword — heavy SEO is
										handled in the Workspace
									</p>
								</div>
								<div className="flex items-start gap-3">
									<div className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
										2
									</div>
									<p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
										<strong>Warm the visitor</strong> — move them from curious reader to someone
										interested enough to click through
									</p>
								</div>
								<div className="flex items-start gap-3">
									<div className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
										3
									</div>
									<p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
										<strong>Hand off via the first in-body link</strong> — send warmed visitors
										directly to the destination page so they convert
									</p>
								</div>
								<div
									className={`mt-1 rounded-lg px-3 py-2 ${handoffPass ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}
								>
									<p
										className={`text-xs font-medium ${handoffPass ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
									>
										{handoffPass
											? 'Step 3 is working. The reverse silo is intact.'
											: 'Step 3 is broken. Fix the destination handoff before anything else.'}
									</p>
								</div>
							</div>
						</div>

						{/* Fix priority */}
						{allFailingKeys.length > 0 && (
							<div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
								<div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
									<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
										Fix priority
									</h3>
									<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
										Highest revenue impact first
									</p>
								</div>
								<ul className="divide-y divide-gray-100 dark:divide-gray-800">
									{allFailingKeys.slice(0, 3).map((key, i) => (
										<li key={key} className="flex items-start gap-3 px-4 py-3">
											<div className="flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
												{i + 1}
											</div>
											<p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
												{SEO_ITEM_LABELS[key] ?? key}
											</p>
										</li>
									))}
								</ul>
							</div>
						)}

						{/* SEO note */}
						{/* TODO: Connect to Workspace */}
						{/* <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
							<div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
								<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
									SEO scoring
								</h3>
								<p className="mt-0.5 text-xs text-gray-400">Managed in the Workspace</p>
							</div>
							<div className="px-4 py-3">
								<p className="text-xs text-gray-500 dark:text-gray-400">
									This page's UPSA score, keyword density, entity coverage, and content depth are
									managed in the Workspace. CRO Studio only audits the conversion layer — CTAs,
									handoff, and funnel alignment.
								</p>
								<Link
									to={`/workspace/${audit.id}`}
									className="text-brand-600 dark:text-brand-400 mt-2 inline-flex items-center gap-1 text-xs hover:underline"
								>
									<ExternalLink className="size-3" />
									Open in Workspace
								</Link>
							</div>
						</div> */}
					</div>
				</div>
			</div>
		</CROStudioGate>
	);
}

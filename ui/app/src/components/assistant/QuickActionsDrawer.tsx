import { useState } from 'react';
import {
	X,
	FileText,
	Target,
	Globe,
	Search,
	Zap,
	Lightbulb,
	Server,
	RefreshCw,
	TrendingUp,
	BarChart3
} from 'lucide-react';
import { cn } from '../../utils/common';
import { CreditCost } from '../shared/CreditBadge';

interface QuickAction {
	id: string;
	name: string;
	description: string;
	credits: number;
	icon: typeof Globe;
	iconColor: string;
	iconBg: string;
	requires?: string;
	prompt: string;
}

interface ActionCategory {
	name: string;
	color: string;
	actions: QuickAction[];
}

const ACTION_CATEGORIES: ActionCategory[] = [
	{
		name: 'PRIORITIES',
		color: 'text-indigo-600',
		actions: [
			{
				id: 'what_to_focus',
				name: 'What should I focus on?',
				description: 'Get top recommended actions from your priority stack',
				credits: 0,
				icon: Lightbulb,
				iconColor: 'text-indigo-600',
				iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
				prompt: 'What should I focus on? Give me the top priorities for my SEO.'
			},
			{
				id: 'suggest_actions',
				name: 'Suggest next actions',
				description: 'Analyze my sites and suggest what to do next',
				credits: 0,
				icon: Target,
				iconColor: 'text-cyan-600',
				iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
				prompt: 'Suggest next actions for my SEO based on my current data.'
			},
			{
				id: 'low_score_pages',
				name: 'Which pages need work?',
				description: 'Find pages with low SEO scores to improve',
				credits: 0,
				icon: BarChart3,
				iconColor: 'text-amber-600',
				iconBg: 'bg-amber-100 dark:bg-amber-900/30',
				prompt: 'Which of my pages need the most work? Show me the lowest SEO scores.'
			}
		]
	},
	{
		name: 'SITE HEALTH',
		color: 'text-green-600',
		actions: [
			{
				id: 'how_is_site',
				name: "How's my site doing?",
				description: 'Get a technical audit summary for your site',
				credits: 0,
				icon: Search,
				iconColor: 'text-green-600',
				iconBg: 'bg-green-100 dark:bg-green-900/30',
				prompt:
					"How's my site doing? Give me a summary of my technical audit and any critical issues."
			},
			{
				id: 'list_sites',
				name: 'List my sites',
				description: 'See all your sites and their key metrics',
				credits: 0,
				icon: Globe,
				iconColor: 'text-blue-600',
				iconBg: 'bg-blue-100 dark:bg-blue-900/30',
				prompt: 'List my sites and give me a quick overview of each.'
			},
			{
				id: 'refresh_queue',
				name: 'What needs a refresh?',
				description: 'Find stale pages with declining rankings',
				credits: 0,
				icon: RefreshCw,
				iconColor: 'text-orange-600',
				iconBg: 'bg-orange-100 dark:bg-orange-900/30',
				prompt: 'Which of my pages need a content refresh? Show me the refresh queue.'
			}
		]
	},
	{
		name: 'ACTIONS',
		color: 'text-purple-600',
		actions: [
			{
				id: 'run_audit',
				name: 'Run technical audit',
				description: 'Crawl site, check health, fix issues (Scale+)',
				credits: 10,
				icon: Server,
				iconColor: 'text-purple-600',
				iconBg: 'bg-purple-100 dark:bg-purple-900/30',
				requires: 'Scale or Pro plan',
				prompt:
					'Run a full technical SEO audit for my site. Start with my first site if I have one.'
			},
			{
				id: 'clusters_overview',
				name: 'Overview of my clusters',
				description: 'See all content clusters and their status',
				credits: 0,
				icon: TrendingUp,
				iconColor: 'text-teal-600',
				iconBg: 'bg-teal-100 dark:bg-teal-900/30',
				prompt:
					'Give me an overview of my content clusters. Which are healthy and which need attention?'
			},
			{
				id: 'what_can_you_do',
				name: 'What can you help with?',
				description: 'Learn what Fin can do',
				credits: 0,
				icon: Zap,
				iconColor: 'text-indigo-600',
				iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
				prompt: 'What can you help me with? Give me a quick overview of your capabilities.'
			}
		]
	}
];

interface QuickActionsDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	onSelectAction: (prompt: string) => void;
	creditsAvailable?: number;
	creditsIncluded?: number;
}

export function QuickActionsDrawer({
	isOpen,
	onClose,
	onSelectAction,
	creditsAvailable = 0,
	creditsIncluded = 0
}: QuickActionsDrawerProps) {
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

	if (!isOpen) return null;

	const handleActionClick = (action: QuickAction) => {
		onSelectAction(action.prompt);
		onClose();
	};

	return (
		<>
			{/* Backdrop */}
			<div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40" onClick={onClose} />

			{/* Drawer */}
			<div
				className={cn(
					'fixed top-0 right-0 z-50 h-full w-[400px] max-w-[90vw]',
					'bg-white shadow-2xl dark:bg-gray-900',
					'transform transition-transform duration-300 ease-out',
					'flex flex-col',
					isOpen ? 'translate-x-0' : 'translate-x-full'
				)}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
					<div className="flex items-center gap-3">
						<div className="to-brand-600 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500">
							<Zap className="h-5 w-5 text-white" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
								Fin Quick Actions
							</h2>
							<p className="text-xs text-gray-500 dark:text-gray-400">Run SEO actions instantly</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
					>
						<X className="h-5 w-5 text-gray-500" />
					</button>
				</div>

				{/* Actions List */}
				<div className="flex-1 overflow-y-auto p-4">
					{ACTION_CATEGORIES.map((category) => (
						<div key={category.name} className="mb-6">
							<h3 className={cn('mb-3 text-xs font-bold tracking-wider', category.color)}>
								{category.name}
							</h3>
							<div className="space-y-2">
								{category.actions.map((action) => (
									<button
										key={action.id}
										onClick={() => handleActionClick(action)}
										className={cn(
											'w-full rounded-xl border p-4 text-left transition-all',
											'bg-white dark:bg-gray-800',
											'border-gray-200 dark:border-gray-700',
											'hover:border-indigo-300 dark:hover:border-indigo-600',
											'hover:scale-[1.01] hover:shadow-md',
											'group'
										)}
									>
										<div className="flex items-start gap-3">
											<div
												className={cn(
													'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
													action.iconBg
												)}
											>
												<action.icon className={cn('h-5 w-5', action.iconColor)} />
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex items-center justify-between">
													<h4 className="font-medium text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
														{action.name}
													</h4>
													<span
														className={cn(
															'text-sm font-medium',
															action.credits === 0
																? 'text-green-600 dark:text-green-400'
																: 'text-amber-600 dark:text-amber-400'
														)}
													>
														{action.credits === 0 ? 'Free' : <CreditCost amount={action.credits} />}
													</span>
												</div>
												<p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
													{action.description}
												</p>
												{action.requires && (
													<p className="mt-1 text-xs text-orange-500 dark:text-orange-400">
														Requires {action.requires}
													</p>
												)}
											</div>
										</div>
									</button>
								))}
							</div>
						</div>
					))}
				</div>

				{/* Footer - Credits Display */}
				<div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
					<div className="mb-2 flex items-center justify-between">
						<span className="text-sm text-gray-600 dark:text-gray-400">AI Credits</span>
						<span className="text-lg font-semibold text-green-600 dark:text-green-400">
							{creditsAvailable} available
						</span>
					</div>
					<div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
						<div
							className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
							style={{
								width: `${Math.min(100, (creditsAvailable / Math.max(creditsIncluded, 1)) * 100)}%`
							}}
						/>
					</div>
					<div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
						<span>{creditsIncluded} included</span>
						<span>{Math.max(0, creditsAvailable - creditsIncluded)} purchased</span>
					</div>
				</div>
			</div>
		</>
	);
}

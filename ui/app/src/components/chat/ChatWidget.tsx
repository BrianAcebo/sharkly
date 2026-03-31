import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat, ChatMessage, ToolExecution } from '../../contexts/ChatContext';
import { useOrganization } from '../../hooks/useOrganization';
import { canAccessPerformance } from '../../utils/featureGating';
import { ChatMarkdown } from './ChatMarkdown';
import {
	MessageCircle,
	X,
	Send,
	Loader2,
	Bot,
	User,
	Trash2,
	Minimize2,
	Maximize2,
	Sparkles,
	Search,
	FileText,
	CheckCircle2,
	AlertCircle,
	ExternalLink,
	Globe,
	ShieldCheck,
	Server
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../utils/common';

// Sharkly SEO tools only
const TOOL_CONFIG: Record<
	string,
	{ icon: typeof Search; label: string; color: string; resultPath?: (result: any) => string | null }
> = {
	get_sites_summary: { icon: Globe, label: 'Listing Sites', color: 'text-indigo-500' },
	get_site_details: {
		icon: FileText,
		label: 'Getting Site Details',
		color: 'text-blue-500',
		resultPath: (r) => (r?.id ? `/sites` : null)
	},
	get_clusters_summary: { icon: Search, label: 'Loading Clusters', color: 'text-purple-500' },
	get_cluster_details: {
		icon: FileText,
		label: 'Getting Cluster Details',
		color: 'text-purple-500',
		resultPath: (r) => (r?.id ? `/clusters/${r.id}` : null)
	},
	get_page_summary: {
		icon: FileText,
		label: 'Getting Page',
		color: 'text-amber-500',
		resultPath: (r) => (r?.id ? `/workspace/${r.id}` : null)
	},
	get_audit_summary: { icon: ShieldCheck, label: 'Getting Audit', color: 'text-green-500' },
	get_weekly_priority_stack: {
		icon: Sparkles,
		label: 'Loading Priorities',
		color: 'text-cyan-500'
	},
	get_refresh_queue: { icon: FileText, label: 'Loading Refresh Queue', color: 'text-orange-500' },
	suggest_next_actions: { icon: Sparkles, label: 'Suggesting Actions', color: 'text-cyan-500' },
	trigger_technical_audit: {
		icon: Server,
		label: 'Starting Technical Audit',
		color: 'text-red-500'
	}
};

function MessageBubble({ message }: { message: ChatMessage }) {
	const isUser = message.role === 'user';

	return (
		<div className={cn('flex gap-3 p-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
			{/* Avatar */}
			<div
				className={cn(
					'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
					isUser
						? 'bg-blue-500 text-white'
						: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
				)}
			>
				{isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
			</div>

			{/* Message Content */}
			<div
				className={cn(
					'max-w-[80%] rounded-2xl px-4 py-2',
					isUser
						? 'bg-blue-500 text-white'
						: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
				)}
			>
				{message.isLoading && !message.content ? (
					<div className="flex items-center gap-2">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span className="text-sm">Thinking...</span>
					</div>
				) : isUser ? (
					// User messages: plain text
					<div className="text-sm break-words whitespace-pre-wrap">{message.content}</div>
				) : (
					// Assistant messages: markdown
					<div className="text-sm">
						<ChatMarkdown content={message.content} />
						{message.isLoading && (
							<span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-current" />
						)}
					</div>
				)}
			</div>
		</div>
	);
}

function ToolExecutionPanel({ tool }: { tool: ToolExecution }) {
	const navigate = useNavigate();
	const config = TOOL_CONFIG[tool.name] || {
		icon: Sparkles,
		label: tool.name,
		color: 'text-gray-500'
	};
	const Icon = config.icon;

	// Get result path if available
	const resultPath = config.resultPath && tool.result ? config.resultPath(tool.result) : null;

	const isRunning = tool.status === 'running';
	const isCompleted = tool.status === 'completed';
	const isError = tool.status === 'error';

	return (
		<div
			className={cn(
				'mx-4 my-2 min-w-0 max-w-full overflow-hidden rounded-xl border',
				isRunning && 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30',
				isCompleted && 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30',
				isError && 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30'
			)}
		>
			{/* Header */}
			<div
				className={cn(
					'flex min-w-0 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
					isRunning && 'bg-indigo-100/50 dark:bg-indigo-900/30',
					isCompleted && 'bg-green-100/50 dark:bg-green-900/30',
					isError && 'bg-red-100/50 dark:bg-red-900/30'
				)}
			>
				<div className="flex min-w-0 flex-1 items-start gap-3">
					{isRunning ? (
						<div className="relative shrink-0">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-200 dark:bg-indigo-800">
								<Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
							</div>
							<span className="absolute -top-1 -right-1 h-3 w-3 animate-ping rounded-full bg-indigo-500" />
						</div>
					) : isCompleted ? (
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-200 dark:bg-green-800">
							<CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
						</div>
					) : (
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-200 dark:bg-red-800">
							<AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
						</div>
					)}
					<div className="min-w-0 flex-1">
						<div className="flex min-w-0 items-center gap-2">
							<Icon className={cn('h-4 w-4 shrink-0', config.color)} />
							<span className="wrap-break-word text-sm font-medium text-gray-900 dark:text-white">
								{config.label}
							</span>
						</div>
						<p className="wrap-break-word text-xs text-gray-500 dark:text-gray-400">
							{isRunning && (tool.result?.message || 'Running... This may take a minute.')}
							{isCompleted && (tool.result?.message || 'Completed successfully')}
							{isError && (tool.result?.error || 'Action failed')}
						</p>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-2 sm:ml-auto">
					{isCompleted && resultPath && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => navigate(resultPath)}
							className="h-8 gap-1.5 border-green-300 text-xs text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/30"
						>
							<ExternalLink className="h-3.5 w-3.5" />
							View
						</Button>
					)}
				</div>
			</div>

			{/* Progress bar for running state */}
			{isRunning && (
				<div className="h-1 overflow-hidden bg-indigo-200 dark:bg-indigo-800">
					<div className="animate-progress-indeterminate h-full bg-indigo-500" />
				</div>
			)}
		</div>
	);
}

// Keep the small badge version for inline display
function ToolExecutionBadge({ tool }: { tool: ToolExecution }) {
	const config = TOOL_CONFIG[tool.name] || {
		icon: Sparkles,
		label: tool.name,
		color: 'text-gray-500'
	};
	const Icon = config.icon;

	return (
		<div
			className={cn(
				'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium',
				'border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800'
			)}
		>
			{tool.status === 'running' ? (
				<Loader2 className={cn('h-3.5 w-3.5 animate-spin', config.color)} />
			) : tool.status === 'completed' ? (
				<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
			) : (
				<AlertCircle className="h-3.5 w-3.5 text-red-500" />
			)}
			<Icon className={cn('h-3.5 w-3.5', config.color)} />
			<span className="text-gray-700 dark:text-gray-300">{config.label}</span>
		</div>
	);
}

export default function ChatWidget() {
	const { organization } = useOrganization();
	const {
		messages,
		isOpen,
		isLoading,
		currentTools,
		conversationId,
		sendMessage,
		clearChat,
		openChat,
		closeChat
	} = useChat();
	const navigate = useNavigate();

	// All hooks must run unconditionally (before any early return) to satisfy Rules of Hooks
	const [input, setInput] = useState('');
	const [isExpanded, setIsExpanded] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, currentTools]);

	useEffect(() => {
		if (isOpen) {
			setTimeout(() => inputRef.current?.focus(), 100);
		}
	}, [isOpen]);

	// Fin (AI Assistant) requires Growth tier (roadmap). Gate by plan tier, not hasFinAccess.
	if (!organization || !canAccessPerformance(organization)) {
		return null;
	}

	const handleSubmit = () => {
		if (input.trim() && !isLoading) {
			sendMessage(input);
			setInput('');
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	// Floating button when closed
	if (!isOpen) {
		return (
			<button
				onClick={openChat}
				className={cn(
					'fixed right-6 bottom-6 z-40',
					'h-14 w-14 rounded-full shadow-lg',
					'to-brand-600 bg-gradient-to-br from-blue-500 text-white',
					'flex items-center justify-center',
					'transition-transform duration-200 hover:scale-105',
					'ring-4 ring-white/20 dark:ring-gray-900/20'
				)}
				aria-label="Open Fin"
			>
				<MessageCircle className="h-6 w-6" />
				<span className="absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-400 dark:border-gray-900" />
			</button>
		);
	}

	return (
		<div
			className={cn(
				'fixed z-50 flex flex-col rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900',
				'transition-all duration-300 ease-out',
				isExpanded
					? 'top-20 right-4 bottom-4 left-4 md:left-auto md:h-[80vh] md:w-[600px]'
					: 'right-6 bottom-6 h-[550px] w-[380px]'
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 dark:border-gray-700">
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
						<Bot className="h-5 w-5 text-white" />
					</div>
					<div>
						<h3 className="font-semibold text-white">AI Assistant</h3>
						<p className="text-xs text-white/70">Your SEO strategist</p>
					</div>
				</div>
				<div className="flex items-center gap-1">
					{conversationId && messages.length > 0 && (
						<button
							onClick={() => {
								// Navigate to assistant page with this chat, using replace to avoid history pollution
								navigate(`/assistant/${conversationId}`, { replace: true });
								closeChat();
							}}
							className="mr-2 flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs text-white transition-colors hover:bg-white/30"
							title="Open in full view"
						>
							<ExternalLink className="h-3 w-3" />
						</button>
					)}
					<button
						onClick={clearChat}
						className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
						title="Clear chat"
					>
						<Trash2 className="h-4 w-4" />
					</button>
					<button
						onClick={() => setIsExpanded(!isExpanded)}
						className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
						title={isExpanded ? 'Minimize' : 'Expand'}
					>
						{isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
					</button>
					<button
						onClick={closeChat}
						className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
						title="Close"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>

			{/* Messages */}
			<div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
				{messages.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center p-6 text-center">
						<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20">
							<Sparkles className="h-8 w-8 text-indigo-500" />
						</div>
						<h4 className="mb-2 font-semibold text-gray-900 dark:text-white">Hi, I'm Fin</h4>
						<p className="mb-4 max-w-xs text-sm text-gray-500 dark:text-gray-400">
							Your SEO assistant. I can read your sites and clusters, explain audit findings, and
							suggest next actions.
						</p>
						<div className="flex flex-wrap justify-center gap-2">
							{[
								'What should I focus on?',
								"How's my site doing?",
								'What can you help me with?',
								'Suggest next actions'
							].map((suggestion) => (
								<button
									key={suggestion}
									onClick={() => setInput(suggestion)}
									className="rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
								>
									{suggestion}
								</button>
							))}
						</div>
					</div>
				) : (
					<div className="py-2">
						{/* Filter out tool messages - they contain raw JSON and shouldn't display as bubbles */}
						{messages
							.filter((msg) => msg.role !== 'tool')
							.map((msg) => (
								<MessageBubble key={msg.id} message={msg} />
							))}

						{/* Tool executions - show panels for major actions */}
						{currentTools.length > 0 &&
							currentTools.map((tool, i) => {
								const majorActions = [
									'get_sites_summary',
									'get_site_details',
									'get_clusters_summary',
									'get_cluster_details',
									'get_audit_summary',
									'get_weekly_priority_stack',
									'get_refresh_queue',
									'trigger_technical_audit',
									'suggest_next_actions'
								];
								if (majorActions.includes(tool.name)) {
									return <ToolExecutionPanel key={`${tool.name}-${i}`} tool={tool} />;
								}
								return null;
							})}

						{/* Minor tool executions as badges */}
						{currentTools.length > 0 && (
							<div className="flex flex-wrap gap-2 px-4 py-2">
								{currentTools
									.filter(
										(tool) =>
											![
												'get_sites_summary',
												'get_site_details',
												'get_clusters_summary',
												'get_cluster_details',
												'get_audit_summary',
												'get_weekly_priority_stack',
												'get_refresh_queue',
												'trigger_technical_audit',
												'suggest_next_actions'
											].includes(tool.name)
									)
									.map((tool, i) => (
										<ToolExecutionBadge key={`${tool.name}-${i}`} tool={tool} />
									))}
							</div>
						)}

						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			{/* Input */}
			<div className="border-t border-gray-200 p-3 dark:border-gray-700">
				<div className="flex items-end gap-2">
					<div className="relative flex-1">
						<textarea
							ref={inputRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Ask me anything..."
							rows={1}
							className={cn(
								'w-full px-4 py-2.5 pr-12',
								'bg-gray-100 dark:bg-gray-800',
								'border border-gray-200 dark:border-gray-700',
								'resize-none rounded-xl',
								'text-sm text-gray-900 dark:text-white',
								'placeholder:text-gray-500 dark:placeholder:text-gray-400',
								'focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none',
								'max-h-32'
							)}
							style={{ minHeight: '44px' }}
						/>
					</div>
					<Button
						onClick={handleSubmit}
						disabled={!input.trim() || isLoading}
						className={cn(
							'h-11 w-11 rounded-xl p-0',
							'bg-gradient-to-r from-indigo-500 to-purple-600',
							'hover:from-indigo-600 hover:to-purple-700',
							'disabled:cursor-not-allowed disabled:opacity-50'
						)}
					>
						{isLoading ? (
							<Loader2 className="h-5 w-5 animate-spin text-white" />
						) : (
							<Send className="h-5 w-5 text-white" />
						)}
					</Button>
				</div>
				<p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
					Shift+Enter for new line • Some actions cost credits
				</p>
			</div>
		</div>
	);
}

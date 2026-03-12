import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useChat, ChatMessage, ToolExecution } from '../../contexts/ChatContext';
import { useOrganization } from '../../hooks/useOrganization';
import { ChatHistorySidebar } from '../chat/ChatHistorySidebar';
import { ChatMarkdown } from '../chat/ChatMarkdown';
import { QuickActionsDrawer } from './QuickActionsDrawer';
import {
	Bot,
	Send,
	Loader2,
	User,
	Trash2,
	Sparkles,
	Search,
	FileText,
	CheckCircle2,
	AlertCircle,
	Lightbulb,
	Target,
	Users,
	Zap,
	Paperclip,
	X,
	File,
	Image,
	FileSpreadsheet,
	ExternalLink,
	Globe,
	ShieldCheck,
	Server,
	Menu
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../utils/common';

// Tool icons, labels, and result paths — Sharkly SEO tools only
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
	suggest_next_actions: { icon: Lightbulb, label: 'Suggesting Actions', color: 'text-cyan-500' },
	trigger_technical_audit: {
		icon: Server,
		label: 'Starting Technical Audit',
		color: 'text-red-500'
	}
};

// File type icons
function getFileIcon(mimeType: string) {
	if (mimeType.startsWith('image/')) return Image;
	if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) return FileSpreadsheet;
	if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
	return File;
}

interface AttachedFile {
	file: File;
	preview?: string;
}

function MessageBubble({ message }: { message: ChatMessage }) {
	const isUser = message.role === 'user';

	return (
		<div className={cn('flex gap-4 py-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
			{/* Avatar */}
			<div
				className={cn(
					'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
					isUser
						? 'bg-blue-500 text-white'
						: 'to-brand-600 bg-gradient-to-br from-blue-500 text-white'
				)}
			>
				{isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
			</div>

			{/* Message Content */}
			<div className={cn('max-w-[75%]')}>
				{/* Attached Files */}
				{message.files && message.files.length > 0 && (
					<div className="mb-2 flex flex-wrap gap-2">
						{message.files.map((file) => {
							const isImage = file.mime_type.startsWith('image/');
							return (
								<a
									key={file.id}
									href={file.url}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
								>
									{isImage ? (
										<img
											src={file.url}
											alt={file.original_filename}
											className="h-8 w-8 rounded object-cover"
										/>
									) : (
										<File className="h-5 w-5 text-gray-400" />
									)}
									<span className="max-w-[150px] truncate text-xs text-gray-700 dark:text-gray-300">
										{file.original_filename}
									</span>
								</a>
							);
						})}
					</div>
				)}

				{/* Message Text */}
				<div
					className={cn(
						'rounded-2xl px-5 py-3',
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
						<div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
							{/* Hide the [Attached files:...] prefix from display since we show files above */}
							{message.content.replace(/^\[Attached files:[\s\S]*?\]\n\n/, '')}
						</div>
					) : (
						// Assistant messages: markdown
						<div className="text-sm leading-relaxed">
							<ChatMarkdown
								content={message.content.replace(/^\[Attached files:[\s\S]*?\]\n\n/, '')}
							/>
							{message.isLoading && (
								<span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-current" />
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// Full panel for major actions
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
				'my-3 mr-4 ml-14 overflow-hidden rounded-xl border shadow-sm',
				isRunning && 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30',
				isCompleted && 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30',
				isError && 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30'
			)}
		>
			{/* Header */}
			<div
				className={cn(
					'flex items-center justify-between px-4 py-3',
					isRunning && 'bg-indigo-100/50 dark:bg-indigo-900/30',
					isCompleted && 'bg-green-100/50 dark:bg-green-900/30',
					isError && 'bg-red-100/50 dark:bg-red-900/30'
				)}
			>
				<div className="flex items-center gap-3">
					{isRunning ? (
						<div className="relative">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-200 dark:bg-indigo-800">
								<Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
							</div>
							<span className="absolute -top-1 -right-1 h-3 w-3 animate-ping rounded-full bg-indigo-500" />
						</div>
					) : isCompleted ? (
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-200 dark:bg-green-800">
							<CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
						</div>
					) : (
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-200 dark:bg-red-800">
							<AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
						</div>
					)}
					<div>
						<div className="flex items-center gap-2">
							<Icon className={cn('h-5 w-5', config.color)} />
							<span className="font-semibold text-gray-900 dark:text-white">{config.label}</span>
						</div>
						<p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
							{isRunning && (tool.result?.message || 'Running... This may take a moment.')}
							{isCompleted && (tool.result?.message || 'Completed successfully')}
							{isError && (tool.result?.error || 'Action failed')}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					{isCompleted && resultPath && (
						<Button
							onClick={() => navigate(resultPath)}
							className="gap-2 bg-green-600 text-white hover:bg-green-700"
						>
							<ExternalLink className="h-4 w-4" />
							View Full Details
						</Button>
					)}
				</div>
			</div>

			{/* Progress bar for running state */}
			{isRunning && (
				<div className="h-1.5 overflow-hidden bg-indigo-200 dark:bg-indigo-800">
					<div className="animate-progress-indeterminate h-full bg-indigo-500" />
				</div>
			)}
		</div>
	);
}

// Small badge for minor tools
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
				'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
				'border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800'
			)}
		>
			{tool.status === 'running' ? (
				<Loader2 className={cn('h-4 w-4 animate-spin', config.color)} />
			) : tool.status === 'completed' ? (
				<CheckCircle2 className="h-4 w-4 text-green-500" />
			) : (
				<AlertCircle className="h-4 w-4 text-red-500" />
			)}
			<Icon className={cn('h-4 w-4', config.color)} />
			<span className="font-medium text-gray-700 dark:text-gray-300">{config.label}</span>
		</div>
	);
}

function FilePreview({ file, onRemove }: { file: AttachedFile; onRemove: () => void }) {
	const FileIcon = getFileIcon(file.file.type);
	const isImage = file.file.type.startsWith('image/');

	return (
		<div className="group relative flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
			{isImage && file.preview ? (
				<img src={file.preview} alt={file.file.name} className="h-8 w-8 rounded object-cover" />
			) : (
				<FileIcon className="h-5 w-5 text-gray-400" />
			)}
			<div className="min-w-0 flex-1">
				<p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
					{file.file.name}
				</p>
				<p className="text-xs text-gray-400">{(file.file.size / 1024).toFixed(1)} KB</p>
			</div>
			<button
				onClick={onRemove}
				className="rounded-full p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
			>
				<X className="h-4 w-4 text-gray-400 hover:text-red-500" />
			</button>
		</div>
	);
}

const QUICK_PROMPTS = [
	{ icon: Lightbulb, text: 'What should I focus on?', category: 'suggest' },
	{ icon: Search, text: "How's my site doing?", category: 'audit' },
	{ icon: FileText, text: 'Which pages need the most work?', category: 'audit' },
	{ icon: Target, text: 'What can you help me with?', category: 'explain' },
	{ icon: Zap, text: 'Run a technical audit for my site', category: 'audit' },
	{ icon: Users, text: 'Suggest next actions for my SEO', category: 'suggest' }
];

const ALLOWED_FILE_TYPES = [
	'image/*',
	'application/pdf',
	'text/plain',
	'text/csv',
	'application/json',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
].join(',');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const AIAssistant: React.FC = () => {
	const {
		messages,
		isLoading,
		isUploading,
		currentTools,
		conversationId,
		sessionRefreshKey,
		sendMessage,
		clearChat,
		loadConversation
	} = useChat();

	const { organization } = useOrganization();
	const { chatId: urlChatId } = useParams<{ chatId?: string }>();
	const navigate = useNavigate();

	// Sync chat state with URL - load conversation or clear when URL changes
	useEffect(() => {
		if (urlChatId && urlChatId !== conversationId && loadConversation) {
			// URL has a chat ID that differs from current - load it
			loadConversation(urlChatId);
		} else if (!urlChatId && conversationId) {
			// URL has no chat ID but we have one loaded - clear the chat
			clearChat();
		}
	}, [urlChatId, conversationId, loadConversation, clearChat]);

	const [input, setInput] = useState('');
	const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [actionsDrawerOpen, setActionsDrawerOpen] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, currentTools]);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleSubmit = async () => {
		if ((!input.trim() && attachedFiles.length === 0) || isLoading || isUploading) return;

		// Extract File objects from attachedFiles
		const files = attachedFiles.map((f) => f.file);

		// Send message with files
		await sendMessage(input, files.length > 0 ? files : undefined);
		setInput('');

		// Clean up file previews
		attachedFiles.forEach((f) => {
			if (f.preview) URL.revokeObjectURL(f.preview);
		});
		setAttachedFiles([]);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	const handleQuickPrompt = (text: string) => {
		setInput(text);
		inputRef.current?.focus();
	};

	const handleActionSelect = (prompt: string) => {
		setInput(prompt);
		inputRef.current?.focus();
	};

	const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);

		const validFiles: AttachedFile[] = files
			.filter((file) => file.size <= MAX_FILE_SIZE)
			.map((file) => {
				const attached: AttachedFile = { file };
				if (file.type.startsWith('image/')) {
					attached.preview = URL.createObjectURL(file);
				}
				return attached;
			});

		setAttachedFiles((prev) => [...prev, ...validFiles].slice(0, 5)); // Max 5 files

		// Reset input
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const removeFile = (index: number) => {
		setAttachedFiles((prev) => {
			const newFiles = [...prev];
			if (newFiles[index].preview) {
				URL.revokeObjectURL(newFiles[index].preview!);
			}
			newFiles.splice(index, 1);
			return newFiles;
		});
	};

	const handleSelectSession = (sessionId: string) => {
		// Update URL without pushing to history stack
		navigate(`/assistant/${sessionId}`, { replace: true });
		if (loadConversation) {
			loadConversation(sessionId);
		}
	};

	const handleNewChat = () => {
		// Reset URL to base assistant path - useEffect will handle clearing the chat
		navigate('/assistant', { replace: true });
	};

	return (
		<div className="flex overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
			{/* Chat History Sidebar */}
			<ChatHistorySidebar
				currentSessionId={conversationId}
				onSelectSession={handleSelectSession}
				onNewChat={handleNewChat}
				isCollapsed={sidebarCollapsed}
				onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
				refreshKey={sessionRefreshKey}
			/>

			{/* Main Content */}
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
				{/* Header */}
				<div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="to-brand-600 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500">
								<Bot className="h-7 w-7 text-white" />
							</div>
							<div>
								<h1 className="text-xl font-bold text-gray-900 dark:text-white">Fin</h1>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Your SEO assistant — read data, explain findings, suggest actions
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Button
								onClick={() => setActionsDrawerOpen(true)}
								className="to-brand-600 hover:to-brand-700 bg-gradient-to-r from-blue-500 text-white hover:from-blue-600"
							>
								<Menu className="mr-2 h-4 w-4" />
								Actions
							</Button>
							<Button variant="outline" size="sm" onClick={handleNewChat}>
								<Trash2 className="mr-2 h-4 w-4" />
								Clear Chat
							</Button>
						</div>
					</div>
				</div>

				{/* Chat Area */}
				<div className="min-h-0 flex-1 overflow-y-auto px-6">
					{messages.length === 0 ? (
						<div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-12 text-center">
							<div className="to-brand-600 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20">
								<Sparkles className="h-10 w-10 text-indigo-500" />
							</div>
							<h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
								How can I help?
							</h2>
							<p className="mb-8 max-w-md text-gray-500 dark:text-gray-400">
								I'm Fin, your SEO assistant. I can read your sites and clusters, explain audit
								findings, suggest next actions, and help prioritize what to fix. Ask me "what should
								I do?" or "how's my site doing?"
							</p>

							{/* Quick Prompts Grid */}
							<div className="grid w-full max-w-2xl grid-cols-2 gap-3 md:grid-cols-3">
								{QUICK_PROMPTS.map((prompt, i) => (
									<button
										key={i}
										onClick={() => handleQuickPrompt(prompt.text)}
										className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-600 dark:hover:bg-indigo-900/20"
									>
										<prompt.icon className="h-5 w-5 text-gray-400 transition-colors group-hover:text-indigo-500" />
										<span className="text-sm text-gray-700 group-hover:text-indigo-700 dark:text-gray-300 dark:group-hover:text-indigo-300">
											{prompt.text}
										</span>
									</button>
								))}
							</div>

							{/* Capabilities */}
							<div className="mt-10 w-full max-w-2xl border-t border-gray-200 pt-8 dark:border-gray-700">
								<h3 className="mb-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
									CAPABILITIES
								</h3>
								<div className="grid grid-cols-3 gap-4 text-sm">
									<div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
										<Search className="h-4 w-4 text-indigo-500" />
										<span>Read sites & clusters</span>
									</div>
									<div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
										<FileText className="h-4 w-4 text-indigo-500" />
										<span>Explain audit findings</span>
									</div>
									<div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
										<Lightbulb className="h-4 w-4 text-indigo-500" />
										<span>Suggest priorities</span>
									</div>
									<div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
										<Zap className="h-4 w-4 text-indigo-500" />
										<span>Trigger audits (Scale+)</span>
									</div>
								</div>
							</div>
						</div>
					) : (
						<div className="mx-auto max-w-4xl py-4">
							{/* Filter out tool messages - they contain raw JSON and shouldn't display as bubbles */}
							{messages
								.filter((msg) => msg.role !== 'tool')
								.map((msg) => (
									<MessageBubble key={msg.id} message={msg} />
								))}

							{/* Major tool executions as panels */}
							{currentTools.length > 0 &&
								(() => {
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
									return (
										<>
											{currentTools.map((tool, i) =>
												majorActions.includes(tool.name) ? (
													<ToolExecutionPanel key={`${tool.name}-${i}`} tool={tool} />
												) : null
											)}
											{currentTools.filter((t) => !majorActions.includes(t.name)).length > 0 && (
												<div className="flex flex-wrap gap-2 py-4 pl-14">
													{currentTools
														.filter((t) => !majorActions.includes(t.name))
														.map((tool, i) => (
															<ToolExecutionBadge key={`${tool.name}-${i}`} tool={tool} />
														))}
												</div>
											)}
										</>
									);
								})()}

							<div ref={messagesEndRef} />
						</div>
					)}
				</div>

				{/* Quick Actions Drawer */}
				<QuickActionsDrawer
					isOpen={actionsDrawerOpen}
					onClose={() => setActionsDrawerOpen(false)}
					onSelectAction={handleActionSelect}
					creditsAvailable={
						organization?.included_credits_remaining ?? organization?.included_credits ?? 0
					}
					creditsIncluded={
						organization?.included_credits_monthly ?? organization?.included_credits ?? 0
					}
				/>

				{/* Input Area */}
				<div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
					<div className="mx-auto max-w-4xl">
						{/* Attached Files Preview */}
						{attachedFiles.length > 0 && (
							<div className="mb-3 flex flex-wrap gap-2">
								{attachedFiles.map((file, i) => (
									<FilePreview key={i} file={file} onRemove={() => removeFile(i)} />
								))}
							</div>
						)}

						<div className="flex items-start gap-3">
							{/* File Upload Button */}
							<input
								ref={fileInputRef}
								type="file"
								accept={ALLOWED_FILE_TYPES}
								multiple
								onChange={handleFileSelect}
								className="hidden"
							/>
							<Button
								variant="outline"
								size="icon"
								className="h-[52px] w-[52px] flex-shrink-0 rounded-xl"
								onClick={() => fileInputRef.current?.click()}
								title="Attach file"
							>
								<Paperclip className="h-5 w-5" />
							</Button>

							{/* Text Input */}
							<div className="relative flex-1">
								<textarea
									ref={inputRef}
									value={input}
									onChange={(e) => setInput(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder="Ask me anything about your case..."
									rows={1}
									className={cn(
										'w-full px-4 py-3',
										'bg-gray-50 dark:bg-gray-800',
										'border border-gray-200 dark:border-gray-700',
										'resize-none rounded-xl',
										'text-gray-900 dark:text-white',
										'placeholder:text-gray-500 dark:placeholder:text-gray-400',
										'focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none',
										'max-h-40'
									)}
									style={{ minHeight: '52px' }}
								/>
							</div>

							{/* Send Button */}
							<Button
								onClick={handleSubmit}
								disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || isUploading}
								className={cn(
									'h-[52px] rounded-xl px-6',
									'bg-gradient-to-r from-indigo-500 to-purple-600',
									'hover:from-indigo-600 hover:to-purple-700',
									'disabled:cursor-not-allowed disabled:opacity-50'
								)}
							>
								{isUploading ? (
									<>
										<Loader2 className="mr-2 h-5 w-5 animate-spin" />
										Uploading...
									</>
								) : isLoading ? (
									<Loader2 className="h-5 w-5 animate-spin" />
								) : (
									<>
										<Send className="mr-2 h-5 w-5" />
										Send
									</>
								)}
							</Button>
						</div>
						<p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
							Press Enter to send • Shift+Enter for new line • Max 5 files, 10MB each
						</p>
					</div>
				</div>
			</div>

			{/* Quick Actions Drawer */}
		</div>
	);
};

export default AIAssistant;

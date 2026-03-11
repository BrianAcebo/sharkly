import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat, ChatMessage, ToolExecution } from '../../contexts/ChatContext';
import { useOrganization } from '../../hooks/useOrganization';
import { hasFinAccess } from '../../utils/featureGating';
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
  Server,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../utils/common';

// Sharkly SEO tools only
const TOOL_CONFIG: Record<string, { icon: typeof Search; label: string; color: string; resultPath?: (result: any) => string | null }> = {
  get_sites_summary: { icon: Globe, label: 'Listing Sites', color: 'text-indigo-500' },
  get_site_details: { icon: FileText, label: 'Getting Site Details', color: 'text-blue-500', resultPath: (r) => r?.id ? `/sites` : null },
  get_clusters_summary: { icon: Search, label: 'Loading Clusters', color: 'text-purple-500' },
  get_cluster_details: { icon: FileText, label: 'Getting Cluster Details', color: 'text-purple-500', resultPath: (r) => r?.id ? `/clusters/${r.id}` : null },
  get_page_summary: { icon: FileText, label: 'Getting Page', color: 'text-amber-500', resultPath: (r) => r?.id ? `/workspace/${r.id}` : null },
  get_audit_summary: { icon: ShieldCheck, label: 'Getting Audit', color: 'text-green-500' },
  get_weekly_priority_stack: { icon: Sparkles, label: 'Loading Priorities', color: 'text-cyan-500' },
  get_refresh_queue: { icon: FileText, label: 'Loading Refresh Queue', color: 'text-orange-500' },
  suggest_next_actions: { icon: Sparkles, label: 'Suggesting Actions', color: 'text-cyan-500' },
  trigger_technical_audit: { icon: Server, label: 'Starting Technical Audit', color: 'text-red-500' },
};

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      'flex gap-3 p-3',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser 
          ? 'bg-blue-500 text-white' 
          : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      
      {/* Message Content */}
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-2',
        isUser 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
      )}>
        {message.isLoading && !message.content ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        ) : isUser ? (
          // User messages: plain text
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>
        ) : (
          // Assistant messages: markdown
          <div className="text-sm">
            <ChatMarkdown content={message.content} />
            {message.isLoading && (
              <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolExecutionPanel({ tool }: { tool: ToolExecution }) {
  const navigate = useNavigate();
  const config = TOOL_CONFIG[tool.name] || { icon: Sparkles, label: tool.name, color: 'text-gray-500' };
  const Icon = config.icon;
  
  // Get result path if available
  const resultPath = config.resultPath && tool.result ? config.resultPath(tool.result) : null;
  
  const isRunning = tool.status === 'running';
  const isCompleted = tool.status === 'completed';
  const isError = tool.status === 'error';

  return (
    <div className={cn(
      'mx-4 my-2 rounded-xl border overflow-hidden',
      isRunning && 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30',
      isCompleted && 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30',
      isError && 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3',
        isRunning && 'bg-indigo-100/50 dark:bg-indigo-900/30',
        isCompleted && 'bg-green-100/50 dark:bg-green-900/30',
        isError && 'bg-red-100/50 dark:bg-red-900/30'
      )}>
        <div className="flex items-center gap-3">
          {isRunning ? (
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-ping" />
            </div>
          ) : isCompleted ? (
            <div className="w-8 h-8 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Icon className={cn('w-4 h-4', config.color)} />
              <span className="font-medium text-gray-900 dark:text-white text-sm">{config.label}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isRunning && (tool.result?.message || 'Running... This may take a minute.')}
              {isCompleted && (tool.result?.message || 'Completed successfully')}
              {isError && (tool.result?.error || 'Action failed')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isCompleted && resultPath && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(resultPath)}
              className="h-8 text-xs gap-1.5 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View
            </Button>
          )}
        </div>
      </div>
      
      {/* Progress bar for running state */}
      {isRunning && (
        <div className="h-1 bg-indigo-200 dark:bg-indigo-800 overflow-hidden">
          <div className="h-full bg-indigo-500 animate-progress-indeterminate" />
        </div>
      )}
    </div>
  );
}

// Keep the small badge version for inline display
function ToolExecutionBadge({ tool }: { tool: ToolExecution }) {
  const config = TOOL_CONFIG[tool.name] || { icon: Sparkles, label: tool.name, color: 'text-gray-500' };
  const Icon = config.icon;
  
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
      'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
    )}>
      {tool.status === 'running' ? (
        <Loader2 className={cn('w-3.5 h-3.5 animate-spin', config.color)} />
      ) : tool.status === 'completed' ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
      )}
      <Icon className={cn('w-3.5 h-3.5', config.color)} />
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
    closeChat,
  } = useChat();
  
  const navigate = useNavigate();

  // Fin requires Growth+ and Fin add-on (or Scale/Pro)
  if (!organization || !hasFinAccess(organization)) {
    return null;
  }
  
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTools]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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
          'fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full shadow-lg',
          'bg-gradient-to-br from-indigo-500 to-purple-600 text-white',
          'flex items-center justify-center',
          'hover:scale-105 transition-transform duration-200',
          'ring-4 ring-white/20 dark:ring-gray-900/20'
        )}
        aria-label="Open Fin"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-900" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700',
        'transition-all duration-300 ease-out',
        isExpanded 
          ? 'bottom-4 right-4 left-4 top-20 md:left-auto md:w-[600px] md:h-[80vh]' 
          : 'bottom-6 right-6 w-[380px] h-[550px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Assistant</h3>
            <p className="text-xs text-white/70">Your SEO assistant</p>
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
              className="flex items-center gap-1 px-2 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs text-white transition-colors mr-2"
              title="Open in full view"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={clearChat}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={closeChat}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-indigo-500" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Hi, I'm Fin
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs">
              Your SEO assistant. I can read your sites and clusters, explain audit findings, and suggest next actions.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'What should I focus on?',
                'How\'s my site doing?',
                'What can you help me with?',
                'Suggest next actions',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-2">
            {/* Filter out tool messages - they contain raw JSON and shouldn't display as bubbles */}
            {messages.filter(msg => msg.role !== 'tool').map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            
            {/* Tool executions - show panels for major actions */}
            {currentTools.length > 0 && currentTools.map((tool, i) => {
              const majorActions = [
                'get_sites_summary', 'get_site_details', 'get_clusters_summary', 'get_cluster_details',
                'get_audit_summary', 'get_weekly_priority_stack', 'get_refresh_queue', 'trigger_technical_audit',
                'suggest_next_actions',
              ];
              if (majorActions.includes(tool.name)) {
                return <ToolExecutionPanel key={`${tool.name}-${i}`} tool={tool} />;
              }
              return null;
            })}
            
            {/* Minor tool executions as badges */}
            {currentTools.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 py-2">
                {currentTools.filter(tool => ![
                  'get_sites_summary', 'get_site_details', 'get_clusters_summary', 'get_cluster_details',
                  'get_audit_summary', 'get_weekly_priority_stack', 'get_refresh_queue', 'trigger_technical_audit',
                  'suggest_next_actions',
                ].includes(tool.name)).map((tool, i) => (
                  <ToolExecutionBadge key={`${tool.name}-${i}`} tool={tool} />
                ))}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
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
                'rounded-xl resize-none',
                'text-sm text-gray-900 dark:text-white',
                'placeholder:text-gray-500 dark:placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                'max-h-32'
              )}
              style={{ minHeight: '44px' }}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={cn(
              'h-11 w-11 p-0 rounded-xl',
              'bg-gradient-to-r from-indigo-500 to-purple-600',
              'hover:from-indigo-600 hover:to-purple-700',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
          Shift+Enter for new line • Some actions cost credits
        </p>
      </div>
    </div>
  );
}


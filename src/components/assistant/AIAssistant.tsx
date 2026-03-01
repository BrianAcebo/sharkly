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
  Phone,
  Mail,
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
  Building2,
  UserSearch,
  Globe,
  Heart,
  ShieldCheck,
  ShieldAlert,
  UserCircle,
  Server,
  Shield,
  MapPin,
  Menu,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../utils/common';

// Tool icons, labels, and result paths
// All major actions should have resultPath for View button
const TOOL_CONFIG: Record<string, { icon: typeof Search; label: string; color: string; resultPath?: (result: any) => string | null }> = {
  // Core investigation tools
  run_public_presence: { 
    icon: Globe, 
    label: 'Public Presence Scan', 
    color: 'text-indigo-500',
    resultPath: (result) => result?.run_id ? `/runs/${result.run_id}` : null,
  },
  find_subject_for_action: { icon: UserSearch, label: 'Finding Subject', color: 'text-cyan-500' },
  create_subject: { 
    icon: Sparkles, 
    label: 'Creating Subject', 
    color: 'text-green-500',
    resultPath: (result) => {
      if (result?.person_id) return `/people/${result.person_id}`;
      if (result?.business_id) return `/businesses/${result.business_id}`;
      return null;
    },
  },
  lookup_phone: { 
    icon: Phone, 
    label: 'Phone Lookup', 
    color: 'text-green-500',
    resultPath: (result) => result?.phone_id ? `/phones/${result.phone_id}` : null,
  },
  lookup_email: { 
    icon: Mail, 
    label: 'Email Lookup', 
    color: 'text-blue-500',
    resultPath: (result) => result?.email_id ? `/emails/${result.email_id}` : null,
  },
  search_case_entities: { icon: Search, label: 'Searching Records', color: 'text-gray-500' },
  search_business_emails: { 
    icon: Building2, 
    label: 'Finding Business Emails', 
    color: 'text-orange-500',
    resultPath: (result) => {
      if (result?.domain_id) return `/domains/${result.domain_id}`;
      if (result?.business_id) return `/businesses/${result.business_id}`;
      return null;
    },
  },
  get_person_summary: { 
    icon: FileText, 
    label: 'Getting Summary', 
    color: 'text-purple-500',
    resultPath: (result) => result?.person_id ? `/people/${result.person_id}` : null,
  },
  get_business_summary: { 
    icon: Building2, 
    label: 'Getting Business Summary', 
    color: 'text-purple-500',
    resultPath: (result) => result?.business_id ? `/businesses/${result.business_id}` : null,
  },
  add_case_note: { icon: FileText, label: 'Adding Note', color: 'text-yellow-500' },
  draft_report_section: { icon: FileText, label: 'Drafting Report', color: 'text-orange-500' },
  create_entity: { 
    icon: Sparkles, 
    label: 'Creating Record', 
    color: 'text-pink-500',
    resultPath: (result) => {
      if (result?.email_id) return `/emails/${result.email_id}`;
      if (result?.phone_id) return `/phones/${result.phone_id}`;
      if (result?.person_id) return `/people/${result.person_id}`;
      return null;
    },
  },
  suggest_next_steps: { icon: Sparkles, label: 'Analyzing Case', color: 'text-cyan-500' },
  explain_capability: { icon: Sparkles, label: 'Explaining', color: 'text-gray-500' },
  
  // Site Registration Scan (email account discovery)
  holehe_check_email: {
    icon: Heart,
    label: 'Site Registration Scan',
    color: 'text-pink-500',
    resultPath: (result) => result?.view_url || (result?.email_id ? `/emails/${result.email_id}?action=site_scan` : null),
  },
  // Username Search (account discovery)
  search_username_accounts: {
    icon: UserSearch,
    label: 'Username Search',
    color: 'text-orange-500',
    resultPath: (result) => result?.view_url || (result?.username_id ? `/usernames/${result.username_id}?action=username_search` : null),
  },
  // Breach Check (Have I Been Pwned)
  check_email_breaches: {
    icon: ShieldAlert,
    label: 'Breach Check',
    color: 'text-red-500',
    resultPath: (result) => result?.view_url || (result?.email_id ? `/emails/${result.email_id}?action=breach_check` : null),
  },
  // Deep Breach Search
  deep_breach_search: {
    icon: ShieldAlert,
    label: 'Deep Breach Search',
    color: 'text-red-600',
    resultPath: (result) => result?.view_url || (result?.email_id ? `/emails/${result.email_id}?action=deep_breach` : null),
  },
  // Court Records
  search_court_records: {
    icon: FileText,
    label: 'Court Records Search',
    color: 'text-amber-600',
    resultPath: (result) => result?.view_url || null,
  },
  search_party_records: {
    icon: FileText,
    label: 'Party Records Search',
    color: 'text-amber-500',
    resultPath: (result) => result?.view_url || null,
  },
  search_bankruptcy_records: {
    icon: AlertCircle,
    label: 'Bankruptcy Search',
    color: 'text-red-500',
    resultPath: (result) => result?.view_url || null,
  },
  search_judge_records: {
    icon: FileText,
    label: 'Judge Lookup',
    color: 'text-purple-500',
    resultPath: (result) => result?.view_url || null,
  },
  search_financial_disclosures: {
    icon: FileText,
    label: 'Financial Disclosures',
    color: 'text-green-600',
    resultPath: (result) => result?.view_url || null,
  },

  // Phone lookup
  phone_carrier_lookup: {
    icon: Phone,
    label: 'Phone Carrier Lookup',
    color: 'text-emerald-600',
    resultPath: (result) => result?.view_url || null,
  },
  
  // Domain intelligence
  dns_lookup: {
    icon: Server,
    label: 'DNS Lookup',
    color: 'text-cyan-600',
    resultPath: (result) => result?.view_url || null,
  },
  whois_lookup: {
    icon: Shield,
    label: 'WHOIS Lookup',
    color: 'text-indigo-600',
    resultPath: (result) => result?.view_url || null,
  },

  // IP intelligence
  ip_geolocation: {
    icon: MapPin,
    label: 'IP Geolocation',
    color: 'text-orange-600',
    resultPath: (result) => result?.view_url || null,
  },
  reverse_dns: {
    icon: Globe,
    label: 'Reverse DNS',
    color: 'text-teal-600',
    resultPath: (result) => result?.view_url || null,
  },
  
  // Email intelligence tools
  hunter_domain_search: {
    icon: Mail,
    label: 'Email Discovery',
    color: 'text-blue-500',
    resultPath: (result) => result?.domain_id ? `/domains/${result.domain_id}` : null,
  },
  hunter_email_finder: {
    icon: UserSearch,
    label: 'Email Finder',
    color: 'text-cyan-500',
    resultPath: (result) => result?.email_id ? `/emails/${result.email_id}` : null,
  },
  hunter_email_verify: {
    icon: ShieldCheck,
    label: 'Email Verification',
    color: 'text-green-500',
    resultPath: (result) => result?.email_id ? `/emails/${result.email_id}` : null,
  },
  hunter_enrich_person: {
    icon: UserCircle,
    label: 'Person Enrichment',
    color: 'text-purple-500',
    resultPath: (result) => result?.email_id ? `/emails/${result.email_id}` : null,
  },
  hunter_enrich_company: {
    icon: Building2,
    label: 'Company Enrichment',
    color: 'text-orange-500',
    resultPath: (result) => result?.domain_id ? `/domains/${result.domain_id}` : null,
  },
  hunter_full_enrichment: {
    icon: Sparkles,
    label: 'Full Enrichment',
    color: 'text-indigo-500',
    resultPath: (result) => result?.email_id ? `/emails/${result.email_id}` : null,
  },
  hunter_email_count: { icon: Mail, label: 'Email Count', color: 'text-gray-500' },
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
    <div className={cn(
      'flex gap-4 py-4',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
        isUser 
          ? 'bg-blue-500 text-white' 
          : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
      )}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>
      
      {/* Message Content */}
      <div className={cn(
        'max-w-[75%]',
      )}>
        {/* Attached Files */}
        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.files.map(file => {
              const isImage = file.mime_type.startsWith('image/');
              return (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {isImage ? (
                    <img src={file.url} alt={file.original_filename} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <File className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-xs text-gray-700 dark:text-gray-300 max-w-[150px] truncate">
                    {file.original_filename}
                  </span>
                </a>
              );
            })}
          </div>
        )}
        
        {/* Message Text */}
        <div className={cn(
          'rounded-2xl px-5 py-3',
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
            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {/* Hide the [Attached files:...] prefix from display since we show files above */}
              {message.content.replace(/^\[Attached files:[\s\S]*?\]\n\n/, '')}
            </div>
          ) : (
            // Assistant messages: markdown
            <div className="text-sm leading-relaxed">
              <ChatMarkdown content={message.content.replace(/^\[Attached files:[\s\S]*?\]\n\n/, '')} />
              {message.isLoading && (
                <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse" />
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
  const config = TOOL_CONFIG[tool.name] || { icon: Sparkles, label: tool.name, color: 'text-gray-500' };
  const Icon = config.icon;
  
  // Get result path if available
  const resultPath = config.resultPath && tool.result ? config.resultPath(tool.result) : null;
  
  const isRunning = tool.status === 'running';
  const isCompleted = tool.status === 'completed';
  const isError = tool.status === 'error';

  return (
    <div className={cn(
      'ml-14 mr-4 my-3 rounded-xl border overflow-hidden shadow-sm',
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
              <div className="w-10 h-10 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-ping" />
            </div>
          ) : isCompleted ? (
            <div className="w-10 h-10 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Icon className={cn('w-5 h-5', config.color)} />
              <span className="font-semibold text-gray-900 dark:text-white">{config.label}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
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
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <ExternalLink className="w-4 h-4" />
              View Full Details
            </Button>
          )}
        </div>
      </div>
      
      {/* Progress bar for running state */}
      {isRunning && (
        <div className="h-1.5 bg-indigo-200 dark:bg-indigo-800 overflow-hidden">
          <div className="h-full bg-indigo-500 animate-progress-indeterminate" />
        </div>
      )}
    </div>
  );
}

// Small badge for minor tools
function ToolExecutionBadge({ tool }: { tool: ToolExecution }) {
  const config = TOOL_CONFIG[tool.name] || { icon: Sparkles, label: tool.name, color: 'text-gray-500' };
  const Icon = config.icon;
  
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
      'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm'
    )}>
      {tool.status === 'running' ? (
        <Loader2 className={cn('w-4 h-4 animate-spin', config.color)} />
      ) : tool.status === 'completed' ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-500" />
      )}
      <Icon className={cn('w-4 h-4', config.color)} />
      <span className="text-gray-700 dark:text-gray-300 font-medium">{config.label}</span>
    </div>
  );
}

function FilePreview({ file, onRemove }: { file: AttachedFile; onRemove: () => void }) {
  const FileIcon = getFileIcon(file.file.type);
  const isImage = file.file.type.startsWith('image/');
  
  return (
    <div className="relative group flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {isImage && file.preview ? (
        <img src={file.preview} alt={file.file.name} className="w-8 h-8 rounded object-cover" />
      ) : (
        <FileIcon className="w-5 h-5 text-gray-400" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
          {file.file.name}
        </p>
        <p className="text-xs text-gray-400">
          {(file.file.size / 1024).toFixed(1)} KB
        </p>
      </div>
      <button
        onClick={onRemove}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
      >
        <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
      </button>
    </div>
  );
}

const QUICK_PROMPTS = [
  { icon: Search, text: 'Run a public presence scan for John Doe', category: 'search' },
  { icon: Mail, text: 'Find emails for Acme Corporation', category: 'search' },
  { icon: Lightbulb, text: 'What can you help me with?', category: 'explain' },
  { icon: Target, text: 'How do I find someone\'s work email?', category: 'explain' },
  { icon: FileText, text: 'Draft an executive summary', category: 'report' },
  { icon: Users, text: 'Suggest next investigative steps', category: 'suggest' },
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
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
    loadConversation,
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
    const files = attachedFiles.map(f => f.file);
    
    // Send message with files
    await sendMessage(input, files.length > 0 ? files : undefined);
    setInput('');
    
    // Clean up file previews
    attachedFiles.forEach(f => {
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
      .filter(file => file.size <= MAX_FILE_SIZE)
      .map(file => {
        const attached: AttachedFile = { file };
        if (file.type.startsWith('image/')) {
          attached.preview = URL.createObjectURL(file);
        }
        return attached;
      });
    
    setAttachedFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => {
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
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Vera</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your investigator assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setActionsDrawerOpen(true)}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
              >
                <Menu className="w-4 h-4 mr-2" />
                Actions
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNewChat}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Chat
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Hi, I'm Vera
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                Your investigator assistant. I can search for people, look up contact info, analyze your findings, suggest next steps, and help draft reports.
              </p>
              
              {/* Quick Prompts Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickPrompt(prompt.text)}
                    className="flex items-center gap-3 p-4 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                  >
                    <prompt.icon className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                      {prompt.text}
                    </span>
                  </button>
                ))}
              </div>

              {/* Capabilities */}
              <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700 w-full max-w-2xl">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">CAPABILITIES</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    <span>Run OSINT scans</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Search className="w-4 h-4 text-indigo-500" />
                    <span>Search your data</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span>Draft reports</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Phone className="w-4 h-4 text-indigo-500" />
                    <span>Look up phones</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Mail className="w-4 h-4 text-indigo-500" />
                    <span>Verify emails</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Lightbulb className="w-4 h-4 text-indigo-500" />
                    <span>Suggest next steps</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 max-w-4xl mx-auto">
              {/* Filter out tool messages - they contain raw JSON and shouldn't display as bubbles */}
              {messages.filter(msg => msg.role !== 'tool').map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              
              {/* Major tool executions as panels */}
              {currentTools.length > 0 && currentTools.map((tool, i) => {
                const majorActions = [
                  'run_public_presence', 
                  'search_business_emails', 
                  'create_subject',
                  'holehe_check_email',
                  'search_username_accounts',
                  'check_email_breaches',
                  'deep_breach_search',
                  'search_court_records',
                  'search_party_records',
                  'search_bankruptcy_records',
                  'search_judge_records',
                  'search_financial_disclosures',
                  'phone_carrier_lookup',
                  'dns_lookup',
                  'whois_lookup',
                  'ip_geolocation',
                  'reverse_dns',
                  'hunter_domain_search',
                  'hunter_email_finder',
                  'hunter_email_verify',
                  'hunter_enrich_person',
                  'hunter_enrich_company',
                  'hunter_full_enrichment',
                ];
                if (majorActions.includes(tool.name)) {
                  return <ToolExecutionPanel key={`${tool.name}-${i}`} tool={tool} />;
                }
                return null;
              })}
              
              {/* Minor tool executions as badges */}
              {currentTools.filter(tool => ![
                'run_public_presence', 
                'search_business_emails', 
                'create_subject',
                'holehe_check_email',
                'search_username_accounts',
                'check_email_breaches',
                'deep_breach_search',
                'search_court_records',
                'search_party_records',
                'search_bankruptcy_records',
                'search_judge_records',
                'search_financial_disclosures',
                'phone_carrier_lookup',
                'dns_lookup',
                'whois_lookup',
                'ip_geolocation',
                'reverse_dns',
                'hunter_domain_search',
                'hunter_email_finder',
                'hunter_email_verify',
                'hunter_enrich_person',
                'hunter_enrich_company',
                'hunter_full_enrichment',
              ].includes(tool.name)).length > 0 && (
                <div className="flex flex-wrap gap-2 py-4 pl-14">
                  {currentTools.filter(tool => ![
                    'run_public_presence', 
                    'search_business_emails', 
                    'create_subject',
                    'holehe_check_email',
                    'search_username_accounts',
                    'check_email_breaches',
                    'deep_breach_search',
                    'search_court_records',
                    'search_party_records',
                    'search_bankruptcy_records',
                    'search_judge_records',
                    'search_financial_disclosures',
                    'phone_carrier_lookup',
                    'dns_lookup',
                    'whois_lookup',
                    'ip_geolocation',
                    'reverse_dns',
                    'hunter_domain_search',
                    'hunter_email_finder',
                    'hunter_email_verify',
                    'hunter_enrich_person',
                    'hunter_enrich_company',
                    'hunter_full_enrichment',
                  ].includes(tool.name)).map((tool, i) => (
                    <ToolExecutionBadge key={`${tool.name}-${i}`} tool={tool} />
                  ))}
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto">
            {/* Attached Files Preview */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
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
                className="h-[52px] w-[52px] rounded-xl flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </Button>

              {/* Text Input */}
              <div className="flex-1 relative">
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
                    'rounded-xl resize-none',
                    'text-gray-900 dark:text-white',
                    'placeholder:text-gray-500 dark:placeholder:text-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
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
                  'h-[52px] px-6 rounded-xl',
                  'bg-gradient-to-r from-indigo-500 to-purple-600',
                  'hover:from-indigo-600 hover:to-purple-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
              Press Enter to send • Shift+Enter for new line • Max 5 files, 10MB each
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions Drawer */}
      <QuickActionsDrawer
        isOpen={actionsDrawerOpen}
        onClose={() => setActionsDrawerOpen(false)}
        onSelectAction={handleActionSelect}
        creditsAvailable={organization?.included_credits_remaining || 0}
        creditsIncluded={organization?.included_credits_monthly || 0}
      />
    </div>
  );
};

export default AIAssistant;

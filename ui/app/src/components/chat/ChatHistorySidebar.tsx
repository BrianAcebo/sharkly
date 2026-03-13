import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '../../hooks/useOrganization';
import { supabase } from '../../utils/supabaseClient';
import {
  MessageSquare,
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Edit2,
  MoreVertical,
  Paperclip,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../../utils/common';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../../utils/api';

interface ChatSession {
  id: string;
  title: string | null;
  summary: string | null;
  status: string;
  pinned: boolean;
  message_count: number;
  file_count: number;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
}

interface ChatHistorySidebarProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  refreshKey?: number; // Increment to trigger refresh
}

export function ChatHistorySidebar({
  currentSessionId,
  onSelectSession,
  onNewChat,
  isCollapsed = false,
  onToggleCollapse,
  refreshKey = 0,
}: ChatHistorySidebarProps) {
  const { organization: orgData } = useOrganization();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    if (!orgData?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const response = await api.get('/api/ai/sessions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'x-organization-id': orgData.id,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        console.error('[ChatHistory] Failed to fetch sessions:', response.status);
      }
    } catch (error) {
      console.error('[ChatHistory] Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [orgData?.id]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, refreshKey]);

  // Filter sessions by search
  // Filter and sort sessions (newest first)
  const filteredSessions = sessions
    .filter((session) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        session.title?.toLowerCase().includes(query) ||
        session.last_message?.toLowerCase().includes(query) ||
        session.summary?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      // Sort by last_message_at or created_at, newest first
      const dateA = new Date(a.last_message_at || a.created_at).getTime();
      const dateB = new Date(b.last_message_at || b.created_at).getTime();
      return dateB - dateA;
    });

  // Group sessions by date (already sorted newest first)
  const groupedSessions = filteredSessions.reduce(
    (groups, session) => {
      const date = session.last_message_at || session.created_at;
      const dayKey = new Date(date).toDateString();
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      let groupName: string;
      if (dayKey === today) {
        groupName = 'Today';
      } else if (dayKey === yesterday) {
        groupName = 'Yesterday';
      } else {
        groupName = 'Older';
      }

      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(session);
      return groups;
    },
    {} as Record<string, ChatSession[]>
  );

  // Helper to get auth headers
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'x-organization-id': orgData?.id || '',
    };
  };

  // Pin/unpin session
  const togglePin = async (sessionId: string, currentPinned: boolean) => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      
      await api.request(`/api/ai/session/${sessionId}`, {
        method: 'PATCH',
        headers,
        data: { pinned: !currentPinned },
      });
      fetchSessions();
    } catch (error) {
      console.error('[ChatHistory] Error toggling pin:', error);
    }
  };

  // Rename session
  const saveRename = async (sessionId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const headers = await getAuthHeaders();
      if (!headers) return;

      await api.request(`/api/ai/session/${sessionId}`, {
        method: 'PATCH',
        headers,
        data: { title: editTitle.trim() },
      });
      fetchSessions();
    } catch (error) {
      console.error('[ChatHistory] Error renaming:', error);
    } finally {
      setEditingId(null);
    }
  };

  // Delete session
  const deleteSession = async (sessionId: string) => {
    if (!confirm('Delete this conversation?')) return;

    try {
      const headers = await getAuthHeaders();
      if (!headers) return;

      await api.delete(`/api/ai/conversation/${sessionId}`, {
        headers: {
          'Authorization': headers.Authorization,
          'x-organization-id': orgData?.id || '',
        },
      });
      fetchSessions();
      if (sessionId === currentSessionId) {
        onNewChat();
      }
    } catch (error) {
      console.error('[ChatHistory] Error deleting:', error);
    }
  };

  // Collapsed view
  if (isCollapsed) {
    return (
      <div className="pr-6 h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleCollapse}
          className="mb-2"
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onNewChat}
          title="New chat"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <div className="flex-1 overflow-y-auto flex flex-col gap-1">
          {sessions.slice(0, 10).map((session) => (
            <Button
              key={session.id}
              variant={session.id === currentSessionId ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => onSelectSession(session.id)}
              title={session.title || 'Untitled chat'}
              className="relative"
            >
              <MessageSquare className="h-4 w-4" />
              {session.pinned && (
                <Pin className="absolute -top-1 -right-1 h-2.5 w-2.5 text-blue-500" />
              )}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pr-6 h-full max-h-screen bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-5 mb-3">
        <Button
            variant="outline"
            size="sm"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold text-gray-900 dark:text-white">Chat History</h2>
        </div>
        <Button
          onClick={onNewChat}
          className="w-full"
        >
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-300px)]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Start a new chat to begin
            </p>
          </div>
        ) : (
          <div className="py-2">
            {['Today', 'Yesterday', 'Older'].map((groupName) => {
              const groupSessions = groupedSessions[groupName];
              if (!groupSessions?.length) return null;

              return (
                <div key={groupName} className="mb-2">
                  <div className="px-4 py-1.5">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {groupName}
                    </span>
                  </div>
                  {groupSessions.map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        'group relative mx-2 rounded-lg transition-colors mb-2',
                        session.id === currentSessionId
                          ? 'bg-indigo-100 dark:bg-indigo-900/30'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-800'
                      )}
                    >
                      <button
                        onClick={() => onSelectSession(session.id)}
                        className="w-full text-left p-3 pr-8"
                      >
                        <div className="flex items-start gap-2">
                          {session.pinned && (
                            <Pin className="h-3 w-3 text-blue-500 mt-1 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            {editingId === session.id ? (
                              <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => saveRename(session.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveRename(session.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                autoFocus
                                className="h-6 text-sm py-0"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-30">
                                {session.title || 'New conversation'}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 max-w-30">
                              {session.last_message || 'No messages yet'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(
                                  new Date(session.last_message_at || session.created_at),
                                  { addSuffix: true }
                                )}
                              </span>
                              {session.file_count > 0 && (
                                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                  <Paperclip className="h-3 w-3" />
                                  {session.file_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={cn(
                              'absolute right-2 top-3 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                              'hover:bg-gray-200 dark:hover:bg-gray-700'
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingId(session.id);
                              setEditTitle(session.title || '');
                            }}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePin(session.id, session.pinned)}>
                            {session.pinned ? (
                              <>
                                <PinOff className="h-4 w-4 mr-2" />
                                Unpin
                              </>
                            ) : (
                              <>
                                <Pin className="h-4 w-4 mr-2" />
                                Pin
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteSession(session.id)}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


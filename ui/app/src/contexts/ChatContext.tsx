/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useOrganization } from '../hooks/useOrganization';
import { supabase } from '../utils/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';

export interface UploadedFile {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolResult?: any;
  isLoading?: boolean;
  files?: UploadedFile[];
}

export interface ToolExecution {
  name: string;
  status: 'running' | 'completed' | 'error';
  result?: any;
  credits?: number;
  runId?: string; // For tracking async operations like public presence scans
}

export interface UsageInfo {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  llm_cost_usd: number;
  message_number: number;
  monthly_limit: number;
  free_remaining: number;
  is_free: boolean;
}

interface PersonContext {
  person_id: string;
  person_name: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  isUploading: boolean;
  conversationId: string | null;
  personContext: PersonContext | null;
  currentTools: ToolExecution[];
  totalCreditsUsed: number;
  usageInfo: UsageInfo | null;
  sessionRefreshKey: number; // Increments when sidebar should refresh
  
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  uploadFiles: (files: File[]) => Promise<UploadedFile[]>;
  clearChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setPersonContext: (ctx: PersonContext | null) => void;
  loadConversation: (conversationId: string) => Promise<void>;
  refreshSessions: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { organization: orgData } = useOrganization();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [personContext, setPersonContext] = useState<PersonContext | null>(null);
  const [currentTools, setCurrentTools] = useState<ToolExecution[]>([]);
  const [totalCreditsUsed, setTotalCreditsUsed] = useState(0);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingIntervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();

  const refreshSessions = useCallback(() => {
    setSessionRefreshKey(prev => prev + 1);
  }, []);

  // Upload files to the server
  const uploadFiles = useCallback(async (files: File[]): Promise<UploadedFile[]> => {
    if (!orgData?.id || files.length === 0) return [];

    setIsUploading(true);
    try {
      // Get auth session for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      if (conversationId) {
        formData.append('session_id', conversationId);
      }

      const response = await api.request('/api/ai/files/upload-multiple', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'x-organization-id': orgData.id,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('[Chat] File upload error:', error);
      return [];
    } finally {
      setIsUploading(false);
    }
  }, [orgData?.id, conversationId]);

  const sendMessage = useCallback(async (content: string, files?: File[]) => {
    if ((!content.trim() && (!files || files.length === 0)) || isLoading) return;
    
    // Ensure we have org data before making request
    if (!orgData?.id) {
      console.error('[Chat] Cannot send message: Organization data not loaded');
      return;
    }
    
    console.log('[Chat] Sending message with orgId:', orgData.id);

    // Upload files first if provided
    let uploadedFiles: UploadedFile[] = [];
    if (files && files.length > 0) {
      setIsUploading(true);
      try {
        // Get auth session for file upload
        const { data: { session: uploadSession } } = await supabase.auth.getSession();
        if (!uploadSession) {
          throw new Error('Not authenticated');
        }

        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        if (conversationId) {
          formData.append('session_id', conversationId);
        }

        const uploadResponse = await api.request('/api/ai/files/upload-multiple', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${uploadSession.access_token}`,
            'x-organization-id': orgData?.id || '',
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          const data = await uploadResponse.json();
          uploadedFiles = data.files || [];
        }
      } catch (error) {
        console.error('[Chat] File upload error:', error);
      } finally {
        setIsUploading(false);
      }
    }

    // Build message content with file context
    let messageContent = content;
    if (uploadedFiles.length > 0) {
      const fileDescriptions = uploadedFiles.map(f => 
        `- ${f.original_filename} (${f.mime_type}, ${(f.file_size / 1024).toFixed(1)}KB)`
      ).join('\n');
      messageContent = `[Attached files:\n${fileDescriptions}]\n\n${content}`;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Add placeholder for assistant response
    const assistantId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    }]);
    
    setIsLoading(true);
    setCurrentTools([]);

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Get auth session for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await api.post('/api/ai/stream', {
        message: messageContent,
        conversation_id: conversationId,
        person_context: personContext,
        file_ids: uploadedFiles.map(f => f.id),
      }, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'x-organization-id': orgData?.id || '',
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'content':
                  assistantContent += data.content;
                  setMessages(prev => prev.map(m => 
                    m.id === assistantId 
                      ? { ...m, content: assistantContent, isLoading: true }
                      : m
                  ));
                  break;

                case 'tool_start':
                  setCurrentTools(prev => [...prev, {
                    name: data.tool,
                    status: 'running',
                  }]);
                  break;

                case 'tool_result':
                  setCurrentTools(prev => prev.map(t => 
                    t.name === data.tool && t.status === 'running'
                      ? { 
                          ...t, 
                          status: data.success ? 'completed' : 'error',
                          result: data.error ? { ...data.result, error: data.error } : data.result, 
                          credits: data.credits,
                        }
                      : t
                  ));
                  setTotalCreditsUsed(prev => prev + (data.credits || 0));
                  break;

                case 'done': {
                  const wasNewConversation = !conversationId;
                  const newConvId = data.conversation_id as string | undefined;
                  if (newConvId) {
                    // Commit id before navigate so URL sync effect never sees /assistant/:id with null id
                    flushSync(() => {
                      if (wasNewConversation) {
                        setSessionRefreshKey((prev) => prev + 1);
                      }
                      setConversationId(newConvId);
                    });
                    const p = location.pathname;
                    if (wasNewConversation && (p === '/assistant' || p === '/assistant/')) {
                      navigate(`/assistant/${newConvId}`, { replace: true });
                    }
                  }
                  if (data.usage) {
                    setUsageInfo(data.usage);
                    // Add chat credit cost to total if charged
                    if (data.chat_credit_cost) {
                      setTotalCreditsUsed(prev => prev + data.chat_credit_cost);
                    }
                  }
                  break;
                }

                case 'error':
                  // Even on error, update conversation ID and refresh if session was created
                  if (data.conversation_id) {
                    const wasNewConversation = !conversationId;
                    flushSync(() => {
                      if (wasNewConversation) {
                        setSessionRefreshKey((prev) => prev + 1);
                      }
                      setConversationId(data.conversation_id);
                    });
                    const p = location.pathname;
                    if (wasNewConversation && (p === '/assistant' || p === '/assistant/')) {
                      navigate(`/assistant/${data.conversation_id}`, { replace: true });
                    }
                  }
                  throw new Error(data.error);
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
              if (!(e instanceof SyntaxError)) throw e;
            }
          }
        }
      }

      // Mark assistant message as complete
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, isLoading: false }
          : m
      ));

    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown error';
      
      // Ignore abort errors and terminated connections (user navigated away or network issue)
      if ((error as Error).name === 'AbortError' || errorMessage.includes('terminated') || errorMessage.includes('aborted')) {
        console.log('[Chat] Request aborted or terminated');
        // Don't show error for aborted requests - just mark as complete and clear tools
        setMessages(prev => prev.map(m => 
          m.id === assistantId && m.isLoading
            ? { ...m, isLoading: false }
            : m
        ));
        // Clear any running tool panels and stop polling
        setCurrentTools([]);
        pollingIntervalsRef.current.forEach((interval: ReturnType<typeof setInterval>) => clearInterval(interval));
        pollingIntervalsRef.current.clear();
        return;
      }
      
      console.error('[Chat] Error:', error);
      setCurrentTools([]);
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: `Error: ${errorMessage}`, isLoading: false }
          : m
      ));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [conversationId, isLoading, orgData?.id, personContext, navigate, location.pathname]);

  const clearChat = useCallback(() => {
    // Abort any in-progress request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setConversationId(null);
    setCurrentTools([]);
    setTotalCreditsUsed(0);
    // Don't reset usageInfo - keep showing monthly usage
  }, []);

  const loadConversation = useCallback(async (targetConversationId: string) => {
    if (!orgData?.id) return;

    try {
      // Match URL intent immediately so UI never flashes the /assistant home state while fetching
      setConversationId(targetConversationId);
      setIsLoading(true);
      setMessages([]);
      setCurrentTools([]);
      setTotalCreditsUsed(0);

      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await api.get(`/api/ai/conversation/${targetConversationId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'x-organization-id': orgData.id,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Convert loaded messages to our format, filtering out tool messages
      // (tool messages contain raw JSON results that shouldn't be displayed as chat bubbles)
      // and assistant rows with empty content (DB stores tool-call / thinking placeholders that aren't real replies)
      const loadedMessages: ChatMessage[] = (data.messages || [])
        .filter(
          (m: any) =>
            m.role !== 'tool' &&
            !(m.role === 'assistant' && !(String(m.content ?? '').trim()))
        )
        .map((m: any, i: number) => ({
          id: `loaded-${i}-${Date.now()}`,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(),
          isLoading: false,
        }));

      setMessages(loadedMessages);
      setConversationId(targetConversationId);
    } catch (error) {
      console.error('[Chat] Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  }, [orgData?.id]);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <ChatContext.Provider value={{
      messages,
      isOpen,
      isLoading,
      isUploading,
      conversationId,
      personContext,
      currentTools,
      totalCreditsUsed,
      usageInfo,
      sessionRefreshKey,
      sendMessage,
      uploadFiles,
      clearChat,
      openChat,
      closeChat,
      toggleChat,
      setPersonContext,
      loadConversation,
      refreshSessions,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}


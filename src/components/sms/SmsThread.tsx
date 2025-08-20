import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

interface SmsMessage {
  id: string;
  agent_id: string;
  phone_number: string;
  to_number: string;
  from_number: string;
  direction: 'inbound' | 'outbound';
  body: string;
  status: 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed';
  twilio_sid?: string;
  created_at: string;
}

interface SmsThreadProps {
  agentPhone: string;
  leadPhone: string;
}

const SmsThread: React.FC<SmsThreadProps> = ({ agentPhone, leadPhone }) => {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [subscription, setSubscription] = useState<any>(null);

  // Fetch initial messages
  useEffect(() => {
    fetchMessages();
  }, [agentPhone, leadPhone]);

  // Set up real-time subscription
  useEffect(() => {
    if (!agentPhone || !leadPhone) return;

    const channel = supabase
      .channel('sms-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sms_messages',
          filter: `phone_number=eq.${agentPhone}`
        },
        (payload) => {
          console.log('SMS message change:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as SmsMessage;
            // Only add if it's part of this conversation
            if (
              (newMessage.from_number === leadPhone && newMessage.direction === 'inbound') ||
              (newMessage.to_number === leadPhone && newMessage.direction === 'outbound')
            ) {
              setMessages(prev => [...prev, newMessage]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as SmsMessage;
            setMessages(prev => 
              prev.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            );
          }
        }
      )
      .subscribe();

    setSubscription(channel);

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [agentPhone, leadPhone]);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('phone_number', agentPhone)
        .or(`and(direction.eq.inbound,from_number.eq.${leadPhone}),and(direction.eq.outbound,to_number.eq.${leadPhone})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching SMS messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusIcon = (status: string, direction: string) => {
    if (direction === 'inbound') return null;
    
    switch (status) {
      case 'queued':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'sent':
        return <Check className="h-3 w-3 text-blue-500" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'queued': return 'Queued';
      case 'sent': return 'Sent';
      case 'delivered': return 'Delivered';
      case 'failed': return 'Failed';
      case 'undelivered': return 'Undelivered';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading messages...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchMessages}
            className="mt-3 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-brand-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            SMS Conversation
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {leadPhone} • {messages.length} message{messages.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              No messages yet. Start the conversation by sending an SMS!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                  message.direction === 'outbound'
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                
                <div className={`flex items-center justify-between mt-2 text-xs ${
                  message.direction === 'outbound' 
                    ? 'text-brand-100' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  <span>{formatTime(message.created_at)}</span>
                  
                  {message.direction === 'outbound' && (
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(message.status, message.direction)}
                      <span>{getStatusText(message.status)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default SmsThread;

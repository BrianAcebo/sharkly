import React, { useState } from 'react';
import { Send, Loader2, Phone } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { apiPost } from '../../utils/api';

interface SmsComposerProps {
  leadPhone: string;
  onSent?: () => void;
  disabled?: boolean;
}

const SmsComposer: React.FC<SmsComposerProps> = ({ leadPhone, onSent, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If disabled, show provisioning message
  if (disabled) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Number Provisioning in Progress
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your business phone number is being automatically provisioned. This usually takes a few minutes.
          </p>
          <div className="inline-flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Please wait...</span>
          </div>
        </div>
      </div>
    );
  }

  const maxLength = 160;
  const currentLength = message.length;
  const segments = Math.ceil(currentLength / maxLength);
  const isOverLimit = currentLength > maxLength * 10; // Allow up to 10 segments

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isOverLimit || disabled) {
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const payload = {
        to: leadPhone,
        body: message.trim()
      };

      await apiPost('/api/sms/send', payload);
      
      // Clear the message on success
      setMessage('');
      
      // Notify parent component
      if (onSent) {
        onSent();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send SMS');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Send SMS to {leadPhone}
          </label>
          
          <div className="relative">
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              disabled={disabled || isSending}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white resize-none ${
                isOverLimit 
                  ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              rows={4}
              maxLength={maxLength * 10} // Allow up to 10 segments
            />
            
            {/* Character counter */}
            <div className="absolute bottom-2 right-2 flex items-center space-x-2 text-xs">
              {segments > 1 && (
                <span className="text-gray-500 dark:text-gray-400">
                  {segments} segments
                </span>
              )}
              <span className={`${
                isOverLimit 
                  ? 'text-red-500' 
                  : currentLength > maxLength * 0.8 
                    ? 'text-yellow-500' 
                    : 'text-gray-500 dark:text-gray-400'
              }`}>
                {currentLength}/{maxLength}
              </span>
            </div>
          </div>
          
          {/* Segment estimate */}
          {segments > 1 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This message will be sent as {segments} SMS segment{segments > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="submit"
              disabled={!message.trim() || isOverLimit || disabled || isSending}
              className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isSending ? 'Sending...' : 'Send SMS'}
            </button>
            
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Cmd/Ctrl + Enter to send
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {isOverLimit && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Message is too long. Please shorten it to send.
            </p>
          </div>
        )}
      </form>
    </div>
  );
};

export default SmsComposer;

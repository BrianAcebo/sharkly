import React, { useState } from 'react';
import { useLeads } from '../../hooks/useLeads';
import { X, Send, Phone, Mail, MessageSquare, Clock } from 'lucide-react';
import { Button } from '../ui/button';

interface CommunicationComposerProps {
  leadId: string;
  type: 'email' | 'text' | 'call';
  onClose: () => void;
}

const CommunicationComposer: React.FC<CommunicationComposerProps> = ({ leadId, type, onClose }) => {
  const { leads } = useLeads();
  const lead = leads.find(l => l.id === leadId);
  const [sending, setSending] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    duration: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Note: addCommunication is not implemented in the new API yet
    // This would need to be implemented in the LeadsAPI
    console.log('Communication would be added:', {
      leadId,
      type,
      direction: 'outbound',
      subject: type === 'email' ? formData.subject : undefined,
      content: formData.content,
      timestamp: new Date().toISOString(),
      duration: type === 'call' && formData.duration ? parseInt(formData.duration) * 60 : undefined,
      status: 'sent'
    });

    setSending(false);
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const getIcon = () => {
    switch (type) {
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'text':
        return <MessageSquare className="h-5 w-5" />;
      case 'call':
        return <Phone className="h-5 w-5" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'email':
        return 'Compose Email';
      case 'text':
        return 'Send Text Message';
      case 'call':
        return 'Log Phone Call';
    }
  };

  const getButtonText = () => {
    switch (type) {
      case 'email':
        return sending ? 'Sending...' : 'Send Email';
      case 'text':
        return sending ? 'Sending...' : 'Send Message';
      case 'call':
        return sending ? 'Saving...' : 'Log Call';
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case 'email':
        return 'Type your email message here...';
      case 'text':
        return 'Type your text message here...';
      case 'call':
        return 'Enter call notes and discussion points...';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              {getIcon()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{getTitle()}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lead?.name} • {lead?.email}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {type === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter subject..."
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {type === 'email' ? 'Message' : type === 'text' ? 'Message' : 'Call Notes'}
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder={getPlaceholder()}
              required
            />
          </div>

          {type === 'call' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration (minutes)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {getButtonText()}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {getButtonText()}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommunicationComposer;
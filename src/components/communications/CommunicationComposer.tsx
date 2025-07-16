import React, { useState } from 'react';
import { useData } from '../../hooks/useData';
import { X, Send, Phone, Mail, MessageSquare, Clock } from 'lucide-react';
import Button from '../form/button/Button';

interface CommunicationComposerProps {
  leadId: string;
  type: 'email' | 'text' | 'call';
  onClose: () => void;
}

const CommunicationComposer: React.FC<CommunicationComposerProps> = ({ leadId, type, onClose }) => {
  const { addCommunication, getLeadById } = useData();
  const lead = getLeadById(leadId);
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

    addCommunication(leadId, {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
              {getIcon()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{getTitle()}</h2>
              <p className="text-gray-600">{lead?.name} - {lead?.company}</p>
            </div>
          </div>
          <Button variant="icon" startIcon={<X className="h-6 w-6" />} onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">To:</span>
              <span className="ml-2 font-medium">
                {type === 'email' ? lead?.email : lead?.phone}
              </span>
            </div>
            <div>
              <span className="text-gray-500">From:</span>
              <span className="ml-2 font-medium">
                {type === 'email' ? 'you@company.com' : '+1 (555) 123-4567'}
              </span>
            </div>
          </div>

          {type === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email subject"
                required
              />
            </div>
          )}

          {type === 'call' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call Duration (minutes)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter call duration"
                  min="1"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {type === 'call' ? 'Call Notes' : 'Message'}
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              rows={type === 'email' ? 12 : 6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={getPlaceholder()}
              required
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={sending}
              startIcon={<Send className="h-4 w-4" />}
              fullWidth
            >
              {getButtonText()}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommunicationComposer;
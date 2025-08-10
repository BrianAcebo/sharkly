import React, { useState } from 'react';
import { Lead, Communication } from '../../types/leads';
import { Mail, Phone, MessageSquare, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface CommunicationHistoryProps {
  lead: Lead;
}

const CommunicationHistory: React.FC<CommunicationHistoryProps> = ({ lead }) => {
  const [filter, setFilter] = useState<'all' | 'email' | 'text' | 'call'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredCommunications = lead.communications.filter((comm: Communication) => 
    filter === 'all' || comm.type === filter
  );

  const sortedCommunications = [...filteredCommunications].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'text':
        return <MessageSquare className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'bg-blue-100 text-blue-800';
      case 'text':
        return 'bg-green-100 text-green-800';
      case 'call':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'inbound' ? 'text-green-600' : 'text-blue-600';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Communication History</h2>
          <div className="flex space-x-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'email', label: 'Email' },
              { value: 'text', label: 'Text' },
              { value: 'call', label: 'Call' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as 'all' | 'email' | 'text' | 'call')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                  filter === option.value
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {sortedCommunications.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No communications found</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {sortedCommunications.map((comm) => {
          const { date, time } = formatTimestamp(comm.timestamp);
          const isExpanded = expandedItems.has(comm.id);
          
          return (
            <div key={comm.id} className="bg-white rounded-lg shadow-sm border">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${getTypeColor(comm.type)}`}>
                      {getIcon(comm.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 capitalize">
                          {comm.type}
                        </span>
                        <span className={`text-sm font-medium ${getDirectionColor(comm.direction)}`}>
                          {comm.direction === 'inbound' ? '← Inbound' : '→ Outbound'}
                        </span>
                        {comm.type === 'call' && comm.duration && (
                          <span className="text-sm text-gray-500">
                            ({formatDuration(comm.duration)})
                          </span>
                        )}
                      </div>
                      
                      {comm.subject && (
                        <h4 className="font-medium text-gray-900 mb-1">{comm.subject}</h4>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{date}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleExpanded(comm.id)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap">{comm.content}</p>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        comm.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        comm.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        comm.status === 'read' ? 'bg-purple-100 text-purple-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {comm.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommunicationHistory;
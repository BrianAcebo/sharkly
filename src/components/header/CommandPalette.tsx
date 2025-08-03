import React, { useState, useEffect, useRef } from 'react';
import { useLeads } from '../../hooks/useLeads';
import { Search, User, Mail, MessageSquare, LayoutDashboard } from 'lucide-react';
import { Lead } from '../../types/leads';

interface CommandPaletteProps {
  onClose: () => void;
  ref: React.RefObject<HTMLDivElement>;
}

interface SearchResult {
  id: string;
  type: 'page' | 'lead' | 'action';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  path: string;
  action: () => void;
}

const CommandPalette = React.forwardRef<HTMLDivElement, CommandPaletteProps>(({ onClose }, ref) => {
  const { leads } = useLeads();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const pages: SearchResult[] = [
    {
      id: 'pipeline',
      type: 'page',
      title: 'Pipeline',
      subtitle: 'View lead pipeline',
      icon: <LayoutDashboard className="h-4 w-4" />,
      path: '/pipeline',
      action: () => {
        // Navigate to pipeline
        onClose();
      }
    },
    {
      id: 'inbox',
      type: 'page',
      title: 'Inbox',
      subtitle: 'Email inbox',
      icon: <Mail className="h-4 w-4" />,
      path: '/inbox',
      action: () => {
        // Navigate to inbox
        onClose();
      }
    },
    {
      id: 'chat',
      type: 'page',
      title: 'Chat',
      subtitle: 'Team chat',
      icon: <MessageSquare className="h-4 w-4" />,
      path: '/chat',
      action: () => {
        // Navigate to chat
        onClose();
      }
    }
  ];

  const leadResults: SearchResult[] = leads
    .filter((lead: Lead) => 
      lead.name.toLowerCase().includes(query.toLowerCase()) ||
      lead.company?.toLowerCase().includes(query.toLowerCase()) ||
      lead.email.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 5)
    .map((lead: Lead) => ({
      id: lead.id,
      type: 'lead',
      title: lead.name,
      subtitle: `${lead.company} • ${lead.email}`,
      icon: <User className="h-4 w-4" />,
      path: `/leads/${lead.id}`,
      action: () => {
        // Navigate to lead profile
        onClose();
      }
    }));

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(query.toLowerCase()) ||
    (page.subtitle && page.subtitle.toLowerCase().includes(query.toLowerCase()))
  );

  const allResults = [...filteredPages, ...leadResults];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allResults.length) % allResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        allResults[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      ref={ref}
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[70vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search leads, pages, or actions..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {allResults.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No results found
            </div>
          ) : (
            <div className="py-2">
              {allResults.map((result, index) => (
                <div
                  key={result.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={result.action}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 text-gray-400">
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center justify-between">
            <span>Use ↑↓ to navigate, Enter to select, Esc to close</span>
            <span>{allResults.length} results</span>
          </div>
        </div>
      </div>
    </div>
  );
});

CommandPalette.displayName = 'CommandPalette';

export default CommandPalette;
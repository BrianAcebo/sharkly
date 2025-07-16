import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../hooks/useData';
import { Search, User, Mail, MessageSquare, LayoutDashboard } from 'lucide-react';
import { Lead } from '../../contexts/DataContext';
import { Link } from 'react-router';

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
  const { leads } = useData();
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
      lead.company.toLowerCase().includes(query.toLowerCase()) ||
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
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        allResults[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[10vh] z-50">
      <div ref={ref} className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <Search className="h-5 w-5 text-gray-400 mr-3" />
                      <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or type command..."
            className="flex-1 bg-transparent text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none"
          />
          <kbd className="ml-3 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">ESC</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {allResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No results found
            </div>
          ) : (
            <div className="py-2">
              {query && filteredPages.length > 0 && (
                <div className="px-4 py-2">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pages</h3>
                </div>
              )}
              
              {filteredPages.map((result, index) => (
                <Link to={result.path} key={result.id}>
                  <button
                    onClick={result.action}
                    className={`w-full flex items-center px-4 py-3 hover:bg-brand-50 dark:hover:bg-brand-900/20 ${
                      selectedIndex === index ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-brand-100 dark:bg-brand-900 rounded mr-3">
                      {result.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-black dark:text-white">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{result.subtitle}</div>
                      )}
                    </div>
                  </button>
                </Link>
              ))}

              {query && leadResults.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Leads</h3>
                </div>
              )}

              {leadResults.map((result, index) => (
                <button
                  key={result.id}
                  onClick={result.action}
                  className={`w-full flex items-center px-4 py-3 hover:bg-brand-50 dark:hover:bg-brand-900/20 ${
                    selectedIndex === filteredPages.length + index ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-brand-100 dark:bg-brand-900 rounded mr-3">
                    {result.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-black dark:text-white">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{result.subtitle}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default CommandPalette;
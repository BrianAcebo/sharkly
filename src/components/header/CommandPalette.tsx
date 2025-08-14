import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLeads } from '../../hooks/useLeads';
import { Search, User, Mail, MessageSquare, LayoutDashboard, Command, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Lead } from '../../types/leads';
import { useNavigate } from 'react-router';
import useDebounce from '../../hooks/useDebounce';

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
  score: number; // For ranking results
}

// Pre-defined pages with static data
const STATIC_PAGES: Omit<SearchResult, 'score'>[] = [
  {
    id: 'pipeline',
    type: 'page',
    title: 'Pipeline',
    subtitle: 'View lead pipeline',
    icon: <LayoutDashboard className="h-4 w-4" />,
    path: '/pipeline',
    action: () => {}
  },
  {
    id: 'leads',
    type: 'page',
    title: 'All Leads',
    subtitle: 'Manage all leads',
    icon: <User className="h-4 w-4" />,
    path: '/leads',
    action: () => {}
  },
  {
    id: 'inbox',
    type: 'page',
    title: 'Inbox',
    subtitle: 'Email inbox',
    icon: <Mail className="h-4 w-4" />,
    path: '/inbox',
    action: () => {}
  },
  {
    id: 'chat',
    type: 'page',
    title: 'Chat',
    subtitle: 'Team chat',
    icon: <MessageSquare className="h-4 w-4" />,
    path: '/chat',
    action: () => {}
  },
  {
    id: 'notifications',
    type: 'page',
    title: 'Notifications',
    subtitle: 'View notifications',
    icon: <MessageSquare className="h-4 w-4" />,
    path: '/notifications',
    action: () => {}
  },
  {
    id: 'settings',
    type: 'page',
    title: 'Settings',
    subtitle: 'Account settings',
    icon: <LayoutDashboard className="h-4 w-4" />,
    path: '/settings',
    action: () => {}
  }
];

// Fuzzy search algorithm for better matching
function fuzzySearch(query: string, text: string): number {
  if (!query) return 0;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower === queryLower) return 100;
  
  // Starts with query gets high score
  if (textLower.startsWith(queryLower)) return 90;
  
  // Contains query gets medium score
  if (textLower.includes(queryLower)) return 70;
  
  // Check for word boundaries
  const words = textLower.split(/\s+/);
  let maxWordScore = 0;
  
  for (const word of words) {
    if (word.startsWith(queryLower)) {
      maxWordScore = Math.max(maxWordScore, 80);
    } else if (word.includes(queryLower)) {
      maxWordScore = Math.max(maxWordScore, 60);
    }
  }
  
  if (maxWordScore > 0) return maxWordScore;
  
  // Check for character sequence (fuzzy matching)
  let queryIndex = 0;
  let textIndex = 0;
  let score = 0;
  
  while (queryIndex < queryLower.length && textIndex < textLower.length) {
    if (queryLower[queryIndex] === textLower[textIndex]) {
      score += 10;
      queryIndex++;
    }
    textIndex++;
  }
  
  if (queryIndex === queryLower.length) {
    return Math.max(score, 30); // Minimum score for fuzzy match
  }
  
  return 0; // No match
}

// Memoized search function with result caching
const useSearchResults = (query: string, leads: Lead[]) => {
  return useMemo(() => {
         if (!query.trim()) {
       return {
         pages: STATIC_PAGES.slice(0, 6).map(page => ({ ...page, score: 0 })),
         leads: [],
         allResults: STATIC_PAGES.slice(0, 6).map(page => ({ ...page, score: 0 }))
       };
     }

    const queryLower = query.toLowerCase();
    
    // Search pages with scoring
    const pageResults = STATIC_PAGES
      .map(page => ({
        ...page,
        score: Math.max(
          fuzzySearch(queryLower, page.title),
          fuzzySearch(queryLower, page.subtitle || '')
        )
      }))
      .filter(page => page.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Search leads with scoring
    const leadResults = leads
      .map(lead => ({
        id: lead.id,
        type: 'lead' as const,
        title: lead.name,
        subtitle: `${lead.company || 'No Company'} • ${lead.email}`,
        icon: <User className="h-4 w-4" />,
        path: `/leads/${lead.id}`,
        action: () => {},
        score: Math.max(
          fuzzySearch(queryLower, lead.name),
          fuzzySearch(queryLower, lead.company || ''),
          fuzzySearch(queryLower, lead.email)
        )
      }))
      .filter(lead => lead.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const allResults = [...pageResults, ...leadResults];
    
    return { pages: pageResults, leads: leadResults, allResults };
  }, [query, leads]);
};

const CommandPalette = React.forwardRef<HTMLDivElement, CommandPaletteProps>(({ onClose }, ref) => {
  const { leads } = useLeads();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Debounce search to avoid excessive filtering
  const debouncedQuery = useDebounce(query, 150);
  
  // Get memoized search results
  const { allResults } = useSearchResults(debouncedQuery, leads);
  
  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [allResults.length]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle result selection
  const handleResultSelect = useCallback((result: SearchResult) => {
    navigate(result.path);
    onClose();
  }, [navigate, onClose]);

  // Keyboard navigation with proper bounds checking
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (allResults.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % allResults.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + allResults.length) % allResults.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (allResults[selectedIndex]) {
          handleResultSelect(allResults[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [allResults, selectedIndex, handleResultSelect, onClose]);

  // Memoized result rendering to prevent unnecessary re-renders
  const renderResults = useMemo(() => {
    if (allResults.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">No results found</p>
          <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
        </div>
      );
    }

    return (
      <div className="py-2">
        {allResults.map((result, index) => (
          <div
            key={`${result.type}-${result.id}`}
            className={`px-4 py-3 cursor-pointer transition-colors duration-150 ${
              index === selectedIndex 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => handleResultSelect(result)}
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
              <div className="flex-shrink-0">
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {result.type}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }, [allResults, selectedIndex, handleResultSelect]);

  return (
    <div
      ref={ref}
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[70vh] overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Command className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Command Palette</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search leads, pages, or actions..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          {renderResults}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                <span>Navigate</span>
              </span>
              <span>Enter to select</span>
              <span>Esc to close</span>
            </div>
            <span className="font-medium">{allResults.length} result{allResults.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

CommandPalette.displayName = 'CommandPalette';

export default CommandPalette;
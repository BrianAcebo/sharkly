import React, { useState } from 'react';
import { 
  Search, 
  Archive, 
  Trash2, 
  MoreHorizontal, 
  Star, 
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit
} from 'lucide-react';
import { Button } from '../ui/button';

interface Email {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  timestamp: string;
  read: boolean;
  starred: boolean;
  important: boolean;
  label?: 'Important' | 'Social' | 'Promotional';
}

const mockEmails: Email[] = [
  {
    id: '1',
    sender: 'Material UI',
    subject: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi ne...',
    preview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    timestamp: '12:16 pm',
    read: false,
    starred: false,
    important: true,
    label: 'Important'
  },
  {
    id: '2',
    sender: 'Wise',
    subject: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    preview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    timestamp: '12:16 pm',
    read: false,
    starred: false,
    important: false
  },
  {
    id: '3',
    sender: 'Search Console',
    subject: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciu...',
    preview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    timestamp: 'Apr, 24',
    read: true,
    starred: false,
    important: false,
    label: 'Social'
  },
  {
    id: '4',
    sender: 'PayPal',
    subject: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    preview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    timestamp: 'Apr, 20',
    read: true,
    starred: false,
    important: false
  },
  {
    id: '5',
    sender: 'Google Meet',
    subject: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    preview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    timestamp: 'Apr, 16',
    read: true,
    starred: false,
    important: false
  },
  {
    id: '6',
    sender: 'Loom',
    subject: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    preview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    timestamp: 'Mar, 10',
    read: true,
    starred: false,
    important: false
  },
  {
    id: '7',
    sender: 'Airbnb',
    subject: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    preview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    timestamp: 'Mar, 05',
    read: true,
    starred: false,
    important: false
  },
  {
    id: '8',
    sender: 'Facebook',
    subject: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    preview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    timestamp: 'Feb, 25',
    read: true,
    starred: false,
    important: false
  },
  {
    id: '9',
    sender: 'Instagram',
    subject: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi...',
    preview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    timestamp: 'Feb, 20',
    read: true,
    starred: false,
    important: false,
    label: 'Promotional'
  },
  {
    id: '10',
    sender: 'Google',
    subject: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    preview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Assumenda dolor dolore esse modi nesciunt, nobis...',
    timestamp: 'Feb, 02',
    read: true,
    starred: false,
    important: false
  }
];

const EmailInbox: React.FC = () => {
  const [emails] = useState<Email[]>(mockEmails);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const sidebarItems = [
    { id: 'inbox', label: 'Inbox', count: 3, active: true },
    { id: 'sent', label: 'Sent', count: 0, active: false },
    { id: 'drafts', label: 'Drafts', count: 0, active: false },
    { id: 'spam', label: 'Spam', count: 2, active: false },
    { id: 'trash', label: 'Trash', count: 0, active: false },
    { id: 'archive', label: 'Archive', count: 0, active: false }
  ];

  const filterItems = [
    { id: 'starred', label: 'Starred', active: false },
    { id: 'important', label: 'Important', active: false }
  ];

  const labelItems = [
    { id: 'personal', label: 'Personal', color: 'bg-success-500', active: false },
    { id: 'work', label: 'Work', color: 'bg-brand-500', active: false }
  ];

  const toggleEmailSelection = (emailId: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map(e => e.id)));
    }
  };

  const getLabelColor = (label: string) => {
    switch (label) {
      case 'Important':
        return 'text-brand-600 bg-brand-50 dark:text-brand-400 dark:bg-brand-900/20';
      case 'Social':
        return 'text-success-600 bg-success-50 dark:text-success-400 dark:bg-success-900/20';
      case 'Promotional':
        return 'text-blue-light-600 bg-blue-light-50 dark:text-blue-light-400 dark:bg-blue-light-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-900 flex flex-col">
        <div className="p-4">
          <Button variant="primary" fullWidth startIcon={<Edit className="h-4 w-4" />}>
            Compose
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pb-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Mailbox
            </h3>
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                    item.active
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.count > 0 && (
                    <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="px-4 pb-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Filter
            </h3>
            <nav className="space-y-1">
              {filterItems.map((item) => (
                <button
                  key={item.id}
                  className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors duration-200"
                >
                  <Star className="h-4 w-4 mr-2" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="px-4 pb-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Label
            </h3>
            <nav className="space-y-1">
              {labelItems.map((item) => (
                <button
                  key={item.id}
                  className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors duration-200"
                >
                  <div className={`w-3 h-3 rounded-full mr-2 ${item.color}`}></div>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                checked={selectedEmails.size === emails.length}
                onChange={toggleSelectAll}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <button className="p-1 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400">
                <ChevronDown className="h-4 w-4" />
              </button>
              <button className="p-1 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400">
                <RefreshCw className="h-4 w-4" />
              </button>
              <button className="p-1 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400">
                <Trash2 className="h-4 w-4" />
              </button>
              <button className="p-1 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400">
                <Archive className="h-4 w-4" />
              </button>
              <button className="p-1 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {emails.map((email) => (
            <div
              key={email.id}
              className={`flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-900 hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer ${
                !email.read ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-900/50'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedEmails.has(email.id)}
                onChange={() => toggleEmailSelection(email.id)}
                className="mr-3 rounded border-gray-300 dark:border-gray-600"
              />
              <button className="mr-3 text-gray-400 hover:text-yellow-500">
                <Star className={`h-4 w-4 ${email.starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <span className={`font-medium text-sm ${!email.read ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                      {email.sender}
                    </span>
                    <span className={`text-sm truncate ${!email.read ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                      {email.subject}
                    </span>
                    {email.label && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getLabelColor(email.label)}`}>
                        {email.label}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-4 flex-shrink-0">
                    {email.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing 1 of 159
            </span>
            <div className="flex items-center space-x-2">
              <button className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailInbox;
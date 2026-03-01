import { useState } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Target,
  FileText,
  Users,
  Star,
  TrendingUp,
  Globe,
  Mail,
  Heart,
  UserSearch,
  ShieldAlert,
  Scale,
  Building2,
  Sparkles,
  Server,
  Shield,
  MapPin,
  Search,
  Zap,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../utils/common';

interface QuickAction {
  id: string;
  name: string;
  description: string;
  credits: number;
  icon: typeof Globe;
  iconColor: string;
  iconBg: string;
  requires?: string;
  prompt: string;
}

interface ActionCategory {
  name: string;
  color: string;
  actions: QuickAction[];
}

const ACTION_CATEGORIES: ActionCategory[] = [
  {
    name: 'IDENTITY',
    color: 'text-blue-600',
    actions: [
      {
        id: 'public_presence',
        name: 'Public Presence Scan',
        description: 'Find social profiles, emails, and web mentions',
        credits: 15,
        icon: Globe,
        iconColor: 'text-indigo-600',
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
        requires: 'person or business',
        prompt: 'Run a public presence scan for ',
      },
      {
        id: 'site_registration',
        name: 'Site Registration Scan',
        description: 'Find dating apps, social accounts, adult sites',
        credits: 3,
        icon: Heart,
        iconColor: 'text-pink-600',
        iconBg: 'bg-pink-100 dark:bg-pink-900/30',
        requires: 'email',
        prompt: 'Check what sites this email is registered on: ',
      },
      {
        id: 'username_search',
        name: 'Username Search',
        description: 'Search 400+ sites for accounts',
        credits: 5,
        icon: UserSearch,
        iconColor: 'text-orange-600',
        iconBg: 'bg-orange-100 dark:bg-orange-900/30',
        requires: 'username',
        prompt: 'Search for accounts using this username: ',
      },
    ],
  },
  {
    name: 'EMAIL INTEL',
    color: 'text-cyan-600',
    actions: [
      {
        id: 'verify_email',
        name: 'Verify Email',
        description: 'Check if email is valid and deliverable',
        credits: 1,
        icon: Mail,
        iconColor: 'text-green-600',
        iconBg: 'bg-green-100 dark:bg-green-900/30',
        requires: 'email',
        prompt: 'Verify this email address: ',
      },
      {
        id: 'enrich_person',
        name: 'Enrich Person',
        description: 'Get name, job title, company, socials from email',
        credits: 5,
        icon: Sparkles,
        iconColor: 'text-purple-600',
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
        requires: 'email',
        prompt: 'Enrich this person from their email: ',
      },
      {
        id: 'domain_search',
        name: 'Find Company Emails',
        description: 'Discover all emails at a company domain',
        credits: 5,
        icon: Building2,
        iconColor: 'text-orange-600',
        iconBg: 'bg-orange-100 dark:bg-orange-900/30',
        requires: 'domain',
        prompt: 'Find emails for this company: ',
      },
    ],
  },
  {
    name: 'SECURITY',
    color: 'text-red-600',
    actions: [
      {
        id: 'breach_check',
        name: 'Quick Breach Check',
        description: 'Check if email appeared in data breaches',
        credits: 2,
        icon: ShieldAlert,
        iconColor: 'text-red-600',
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        requires: 'email',
        prompt: 'Check if this email has been breached: ',
      },
      {
        id: 'deep_breach',
        name: 'Deep Breach Search',
        description: 'Get actual leaked passwords and data',
        credits: 5,
        icon: Shield,
        iconColor: 'text-red-700',
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        requires: 'email',
        prompt: 'Run a deep breach search for: ',
      },
    ],
  },
  {
    name: 'LEGAL',
    color: 'text-amber-600',
    actions: [
      {
        id: 'court_records',
        name: 'Court Records',
        description: 'Search federal criminal, civil, bankruptcy cases',
        credits: 3,
        icon: Scale,
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        requires: 'name',
        prompt: 'Search court records for: ',
      },
      {
        id: 'bankruptcy',
        name: 'Bankruptcy Search',
        description: 'Find bankruptcy filings and history',
        credits: 3,
        icon: FileText,
        iconColor: 'text-amber-700',
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        requires: 'name',
        prompt: 'Search bankruptcy records for: ',
      },
    ],
  },
  {
    name: 'TECHNICAL',
    color: 'text-teal-600',
    actions: [
      {
        id: 'dns_lookup',
        name: 'DNS Lookup',
        description: 'Get DNS records, mail server info',
        credits: 1,
        icon: Server,
        iconColor: 'text-cyan-600',
        iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
        requires: 'domain',
        prompt: 'Look up DNS records for: ',
      },
      {
        id: 'whois_lookup',
        name: 'WHOIS Lookup',
        description: 'Get domain registration and ownership info',
        credits: 1,
        icon: Search,
        iconColor: 'text-indigo-600',
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
        requires: 'domain',
        prompt: 'Look up WHOIS info for: ',
      },
      {
        id: 'ip_geolocation',
        name: 'IP Geolocation',
        description: 'Locate IP address, detect VPN/proxy',
        credits: 1,
        icon: MapPin,
        iconColor: 'text-orange-600',
        iconBg: 'bg-orange-100 dark:bg-orange-900/30',
        requires: 'IP address',
        prompt: 'Geolocate this IP address: ',
      },
    ],
  },
  {
    name: 'ANALYSIS',
    color: 'text-purple-600',
    actions: [
      {
        id: 'person_summary',
        name: 'Person Summary',
        description: 'Get all known info about a person',
        credits: 0,
        icon: Users,
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        requires: 'person',
        prompt: 'Give me a summary of ',
      },
      {
        id: 'suggest_steps',
        name: 'Suggest Next Steps',
        description: 'Get AI recommendations for investigation',
        credits: 0,
        icon: Target,
        iconColor: 'text-cyan-600',
        iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
        requires: 'person',
        prompt: 'Suggest next investigation steps for ',
      },
      {
        id: 'draft_report',
        name: 'Draft Report Section',
        description: 'Generate professional report content',
        credits: 3,
        icon: FileText,
        iconColor: 'text-orange-600',
        iconBg: 'bg-orange-100 dark:bg-orange-900/30',
        requires: 'person',
        prompt: 'Draft an executive summary report for ',
      },
    ],
  },
];

interface QuickActionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (prompt: string) => void;
  creditsAvailable?: number;
  creditsIncluded?: number;
}

export function QuickActionsDrawer({
  isOpen,
  onClose,
  onSelectAction,
  creditsAvailable = 0,
  creditsIncluded = 0,
}: QuickActionsDrawerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleActionClick = (action: QuickAction) => {
    onSelectAction(action.prompt);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={cn(
        'fixed right-0 top-0 h-full w-[400px] max-w-[90vw] z-50',
        'bg-white dark:bg-gray-900 shadow-2xl',
        'transform transition-transform duration-300 ease-out',
        'flex flex-col',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Run OSINT tools instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Actions List */}
        <div className="flex-1 overflow-y-auto p-4">
          {ACTION_CATEGORIES.map((category) => (
            <div key={category.name} className="mb-6">
              <h3 className={cn('text-xs font-bold tracking-wider mb-3', category.color)}>
                {category.name}
              </h3>
              <div className="space-y-2">
                {category.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    className={cn(
                      'w-full p-4 rounded-xl border transition-all text-left',
                      'bg-white dark:bg-gray-800',
                      'border-gray-200 dark:border-gray-700',
                      'hover:border-indigo-300 dark:hover:border-indigo-600',
                      'hover:shadow-md hover:scale-[1.01]',
                      'group'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        action.iconBg
                      )}>
                        <action.icon className={cn('w-5 h-5', action.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {action.name}
                          </h4>
                          <span className={cn(
                            'text-sm font-medium',
                            action.credits === 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-amber-600 dark:text-amber-400'
                          )}>
                            {action.credits === 0 ? 'Free' : `${action.credits}c`}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {action.description}
                        </p>
                        {action.requires && (
                          <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                            Requires {action.requires}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer - Credits Display */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">AI Credits</span>
            <span className="text-lg font-semibold text-green-600 dark:text-green-400">
              {creditsAvailable} available
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (creditsAvailable / Math.max(creditsIncluded, 1)) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{creditsIncluded} included</span>
            <span>{Math.max(0, creditsAvailable - creditsIncluded)} purchased</span>
          </div>
        </div>
      </div>
    </>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { 
  Search, 
  Bell, 
  Moon, 
  Sun, 
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import CommandPalette from './CommandPalette';
import NotificationPanel from './NotificationPanel';
import { useSidebar } from '../../hooks/useSidebar';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';

const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const { toggleSidebar } = useSidebar();
  const { breadcrumbs, title } = useBreadcrumbs();
  const commandPaletteRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };

    // Set CSS variable of header's height
		const el = headerRef.current;
		if (!el) {
			return;
		}

		const updateHeight = () => {
			const height = el.offsetHeight;
			document.documentElement.style.setProperty('--header-height', `${height}px`);
		};

		updateHeight();

		const observer = new ResizeObserver(updateHeight);
		observer.observe(el);

    document.addEventListener('keydown', handleKeyDown);
		window.addEventListener('load', updateHeight);
    document.addEventListener('click', (e) => {
      if (e.target instanceof HTMLElement && !searchRef.current?.contains(e.target) && !commandPaletteRef.current?.contains(e.target)) {
        e.preventDefault();
        setShowCommandPalette(false);
      }
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('load', updateHeight);
      observer.disconnect();
    };
  }, []);

  const handleSearchClick = () => {
    setShowCommandPalette(true);
  };

  return (
    <>
      <header ref={headerRef} className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Home</span>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <span>›</span>
                  <span>{crumb}</span>
                </React.Fragment>
              ))}
              <span>›</span>
              <span className="text-black dark:text-white font-medium">{title}</span>
            </div>
          </div>

          <div ref={searchRef} className="relative w-full max-w-[600px]">
            <button
              onClick={handleSearchClick}
              className="text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors duration-200 w-full justify-start"
            >
              <Search className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">Search or type command...</span>
              <div className="ml-auto flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">⌘</kbd>
                <kbd className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">K</kbd>
              </div>
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors duration-200"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors duration-200 relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <NotificationPanel onClose={() => setShowNotifications(false)} />
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors duration-200"
              >
                <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                </div>
                <span className="text-sm font-medium text-black dark:text-white">{user?.email}</span>
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-900 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-900">
                    <p className="text-sm font-medium text-black dark:text-white">{user?.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                  <button 
                    onClick={signOut}
                    className="w-full text-left px-4 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showCommandPalette && (
        <CommandPalette ref={commandPaletteRef} onClose={() => setShowCommandPalette(false)} />
      )}
    </>
  );
};

export default Header;
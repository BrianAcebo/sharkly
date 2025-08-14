import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  LayoutDashboard, 
  Users, 
  Mail,
  MessageSquare,
  Bot,
  Building2, 
  Settings, 
  LogOut,
  User,
  Bell,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router';

const Sidebar: React.FC = () => {
  const { user, signOut } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Pipeline', path: '/pipeline' },
    { icon: Mail, label: 'Inbox', path: '/inbox' },
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
    { icon: Bot, label: 'AI Assistant', path: '/assistant' },
    { icon: Users, label: 'All Leads', path: '/leads' },
    { icon: Building2, label: 'Organization', path: '/organization' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Calendar, label: 'Tasks', path: '/tasks' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col border-r border-gray-200 dark:border-gray-600">
      <div className="p-6 border-b border-gray-200 dark:border-gray-600 flex items-center justify-center">
        <Link to="/">
					<img
						className="block dark:hidden"
						src="/images/logos/logo.svg"
						alt="Logo"
            width={100}
						height="auto"
					/>
					<img
						className="hidden dark:block"
						src="/images/logos/logo-dark.svg"
						alt="Logo"
						width={100}
						height="auto"
					/>
				</Link>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item, index) => (
            <li key={item.path + index}>
              <Link to={item.path}>
                <button
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                    item.path === window.location.pathname
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border-l-4 border-brand-600'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-900">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-brand-100 dark:bg-brand-900 rounded-full">
            <User className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="font-medium text-black dark:text-white">{user?.first_name} {user?.last_name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>
        
        <button
          onClick={signOut}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors duration-200"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
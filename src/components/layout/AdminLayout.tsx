import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LucideIcon, BarChart, Database, Cpu, NetworkIcon, Users, Settings, FormInput, LineChart } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  current: boolean;
}

/**
 * Admin Layout Component
 * Provides consistent layout and navigation for admin pages
 */
const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const router = useRouter();
  
  // Define admin navigation items
  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: BarChart,
      current: router.pathname === '/admin/dashboard'
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      current: router.pathname === '/admin/users'
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      current: router.pathname === '/admin/settings'
    }
  ];
  
  // Define monitoring navigation items
  const monitoringNavigation: NavigationItem[] = [
    {
      name: 'API Performance',
      href: '/admin/monitoring/api-performance',
      icon: NetworkIcon,
      current: router.pathname === '/admin/monitoring/api-performance'
    },
    {
      name: 'Frontend Performance',
      href: '/admin/monitoring/frontend-performance',
      icon: Cpu,
      current: router.pathname === '/admin/monitoring/frontend-performance'
    },
    {
      name: 'Database Performance',
      href: '/admin/monitoring/database-performance',
      icon: Database,
      current: router.pathname === '/admin/monitoring/database-performance'
    },
    {
      name: 'Form Analytics',
      href: '/admin/analytics/form-analytics',
      icon: FormInput,
      current: router.pathname === '/admin/analytics/form-analytics'
    }
  ];
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex">
        {/* Sidebar navigation */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          <div className="flex flex-col flex-grow pt-5 bg-white dark:bg-gray-800 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-bold">Admin Portal</h1>
            </div>
            <div className="mt-5 flex-grow flex flex-col">
              <nav className="flex-1 px-2 pb-4 space-y-1">
                {/* Main admin navigation */}
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      item.current
                        ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 flex-shrink-0 h-6 w-6 ${
                        item.current
                          ? 'text-gray-500 dark:text-gray-300'
                          : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300'
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                ))}
                
                {/* Monitoring section divider */}
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Monitoring & Analytics
                  </h3>
                  
                  {/* Monitoring navigation */}
                  <div className="mt-2 space-y-1">
                    {monitoringNavigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                          item.current
                            ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                        }`}
                      >
                        <item.icon
                          className={`mr-3 flex-shrink-0 h-6 w-6 ${
                            item.current
                              ? 'text-gray-500 dark:text-gray-300'
                              : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </nav>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="md:pl-64 flex flex-col flex-1">
          <main className="flex-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout; 
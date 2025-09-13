import React, { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { CheckSquare, Home, ListChecks, BarChart3, History, Settings, LogOut, User, Menu, X } from 'lucide-react';

const SidebarLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const linkBase = 'flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors';
  const linkActive = 'bg-blue-600 text-white';
  const linkIdle = 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </div>
        )}

        {/* Sidebar */}
        <aside className={`w-72 ${sidebarOpen ? 'fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0' : 'hidden md:flex'} md:flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-screen sticky top-0 transform transition-transform duration-300 ease-in-out md:transform-none`}>
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
            <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
              <CheckSquare className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold">TaskFlow</span>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* User */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {user?.name?.[0]?.toUpperCase() || 'U'} 
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
            </div>
          </div>

          <nav className="p-4 flex-1 space-y-1">
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Home className="h-4 w-4" /> Dashboard
            </NavLink>
            <NavLink 
              to="/analytics" 
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
              onClick={() => setSidebarOpen(false)}
            >
              <BarChart3 className="h-4 w-4" /> Analytics
            </NavLink>
            <NavLink 
              to="/history" 
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
              onClick={() => setSidebarOpen(false)}
            >
              <History className="h-4 w-4" /> History
            </NavLink>
          </nav>

          <div className="mt-auto p-4 space-y-2 border-t border-gray-200 dark:border-gray-800">
            <button 
              onClick={() => {
                navigate('/settings');
                setSidebarOpen(false);
              }} 
              className={`${linkBase} w-full ${linkIdle}`}
            >
              <Settings className="h-4 w-4" /> Settings
            </button>
            <button 
              onClick={() => {
                logout();
                setSidebarOpen(false);
              }} 
              className={`${linkBase} w-full ${linkIdle}`}
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Topbar (mobile) */}
          <div className="md:hidden sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 flex items-center h-16 px-4">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              <Link to="/dashboard" className="flex items-center gap-2">
                <CheckSquare className="h-6 w-6 text-blue-600" />
                <span className="font-semibold">TaskFlow</span>
              </Link>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>

          {/* Bottom nav (mobile) */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
            <div className="grid grid-cols-4 py-2 max-w-3xl mx-auto">
              <NavLink to="/dashboard" className={({ isActive }) => `flex flex-col items-center gap-1 py-1 ${isActive ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
                <Home className="h-5 w-5" />
                <span className="text-xs">Dashboard</span>
              </NavLink>
              <NavLink to="/analytics" className={({ isActive }) => `flex flex-col items-center gap-1 py-1 ${isActive ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs">Analytics</span>
              </NavLink>
              <NavLink to="/history" className={({ isActive }) => `flex flex-col items-center gap-1 py-1 ${isActive ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
                <History className="h-5 w-5" />
                <span className="text-xs">History</span>
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => `flex flex-col items-center gap-1 py-1 ${isActive ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
                <Settings className="h-5 w-5" />
                <span className="text-xs">Settings</span>
              </NavLink>
            </div>
          </nav>
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;


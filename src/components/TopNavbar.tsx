import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  ShieldCheck, 
  Crown,
  ChevronRight,
  Activity
} from 'lucide-react';
import { ServiceDiagnosticsModal } from './common/ServiceDiagnostics';
import { RoleDemoSwitcher } from './common/RoleDemoSwitcher';

export const TopNavbar: React.FC = () => {
  const { user, role } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const userEmail = (user?.email || '').toLowerCase().trim();
  const isSuperAdmin = userEmail === 'renzarvy.rv@gmail.com' || userEmail === 'admin@stalexiuscollege.edu.ph';
  const activeRole: UserRole = (isSuperAdmin || role === 'admin') ? 'admin' : (role || 'student');

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'student', 'teacher'] },
    { name: 'Teachers', path: '/teachers', icon: Users, roles: ['admin'] },
    { name: 'Reports', path: '/reports', icon: FileText, roles: ['admin'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(activeRole || 'student'));

  // Get current active tab name
  const currentNavItem = navItems.find(item => item.path === location.pathname) || { name: 'Overview' };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Section Breadcrumb & Active Page Badge */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center text-xs font-semibold text-slate-500">
            <span className="text-slate-900 font-bold">Portal</span>
            <ChevronRight className="w-3.5 h-3.5 mx-1 text-slate-400" />
            <span className="text-blue-700 font-extrabold capitalize">{currentNavItem.name}</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

          <div className="hidden sm:flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="capitalize">{activeRole} Workspace</span>
          </div>
        </div>

        {/* Center / Right: Navigation Tabs Bar */}
        <div className="flex items-center overflow-x-auto py-1 scrollbar-none gap-1 sm:gap-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-900 to-slate-900 text-white shadow-sm ring-1 ring-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 mr-1.5 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{item.name}</span>
                {isActive && (
                  <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right: Demo Switcher, Diagnostics & User Quick Badge */}
        <div className="flex items-center space-x-2">
          {/* Quick 1-Click Role Switcher */}
          <RoleDemoSwitcher compact={true} />

          <ServiceDiagnosticsModal
            triggerButtonClassName="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer"
          />

          <div className="hidden lg:flex items-center space-x-2 pl-2.5 border-l border-slate-200">
            <img
              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'Admin')}&background=0F172A&color=fff`}
              alt="User Avatar"
              className="w-7 h-7 rounded-full border border-slate-300 object-cover flex-shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="text-left text-[11px] leading-tight">
              <div className="flex items-center space-x-1">
                <span className="font-bold text-slate-900 truncate max-w-[130px]">
                  {user.displayName || user.email?.split('@')[0] || 'Admin User'}
                </span>
                {isSuperAdmin && (
                  <span title="Super Administrator">
                    <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px] block">
                {user.email}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

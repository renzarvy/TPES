import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { seedDemoDataToStorage, isDemoDataSeeded } from '../lib/demoReportsData';
import { 
  LogOut, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  X, 
  Shield, 
  ShieldCheck,
  Award,
  ChevronLeft,
  ChevronRight,
  Globe,
  History
} from 'lucide-react';

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isCollapsed,
  setIsCollapsed
}) => {
  const { user, role, actualRole, logOut, setRole, signInWithEmergencySession } = useAuth();
  const location = useLocation();

  const userEmail = (user?.email || '').toLowerCase().trim();
  const isSuperAdmin = userEmail === 'renzarvy.rv@gmail.com' || userEmail === 'admin@stalexiuscollege.edu.ph';
  const activeRole: UserRole = (isSuperAdmin || role === 'admin') ? 'admin' : (role || 'student');

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'student', 'teacher'] },
    { name: 'Verifications', path: '/verifications', icon: ShieldCheck, roles: ['admin'] },
    { name: 'Teachers', path: '/teachers', icon: Users, roles: ['admin'] },
    { name: 'Reports', path: '/reports', icon: FileText, roles: ['admin'] },
    { name: 'Activity Log', path: '/activity-log', icon: History, roles: ['admin'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] },
    { name: 'Public Homepage', path: '/home', icon: Globe, roles: ['admin', 'student', 'teacher'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(activeRole || 'student'));
  const currentYear = new Date().getFullYear();

  if (!user) return null;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-[#0f2042] via-[#1e3a8a] to-[#0a152e] text-white flex flex-col shadow-2xl transition-all duration-300 ease-in-out md:relative border-r border-slate-700/50 ${
          isMobileMenuOpen ? 'translate-x-0 w-68' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-68'}`}
      >
        {/* Top Header & Desktop Collapse Toggle */}
        <div className="p-4 border-b border-blue-800/60 relative flex flex-col items-center justify-between min-h-[90px]">
          {/* Desktop Collapse Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex absolute right-3 top-3 p-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-200 hover:text-white rounded-lg border border-blue-700/50 transition-colors shadow-sm z-10"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden absolute right-3 top-3 p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Brand Logo - WITHOUT Gold Outline */}
          <div className="flex flex-col items-center text-center w-full pt-1">
            <div className={`bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden transition-all duration-300 ${
              isCollapsed ? 'w-10 h-10 mb-1 border border-white/20' : 'w-16 h-16 mb-2 border border-white/20'
            }`}>
              <img src="/logo.png" alt="St. Alexius College Logo" className="w-full h-full object-cover" />
            </div>

            {!isCollapsed && (
              <div className="animate-fade-in w-full px-2">
                <h1 className="text-xs font-black tracking-widest text-amber-300 uppercase drop-shadow-sm truncate">
                  ST. ALEXIUS COLLEGE
                </h1>
                <p className="text-[10px] text-blue-200 mt-0.5 font-medium tracking-wide truncate">
                  Faculty Evaluation Portal
                </p>
                <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/10 text-blue-100 border border-white/15">
                  <Shield className="w-2.5 h-2.5 mr-1 text-amber-300" /> Official Portal
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-blue-300/80">
              Navigation
            </div>
          )}
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group ${
                  isCollapsed ? 'justify-center' : ''
                } ${
                  isActive 
                    ? 'bg-gradient-to-r from-amber-500/20 to-blue-800/80 text-white shadow-md border border-amber-400/30' 
                    : 'text-blue-100/80 hover:bg-blue-800/40 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  isCollapsed ? '' : 'mr-3'
                } ${isActive ? 'text-amber-300' : 'text-blue-300'}`} />
                
                {!isCollapsed && <span>{item.name}</span>}

                {isActive && (
                  <span className={`rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] ${
                    isCollapsed ? 'absolute right-1 top-1 w-2 h-2' : 'absolute right-3 w-1.5 h-1.5'
                  }`} />
                )}
              </Link>
            );
          })}

          {/* Quick Demo Switcher in Sidebar */}
          {!isCollapsed && (
            <div className="pt-3 mt-3 border-t border-blue-800/40">
              <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-amber-300/90 flex items-center justify-between">
                <span>Role Switcher</span>
                <span className="text-[9px] font-normal text-blue-300/70">Demo</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 px-1">
                <button
                  type="button"
                  onClick={async () => {
                    if (!isDemoDataSeeded()) seedDemoDataToStorage();
                    await signInWithEmergencySession('admin@stalexiuscollege.edu.ph', 'admin', 'Dr. Alexius Admin', { department: 'Institutional Administration' });
                  }}
                  className="px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-[10px] font-bold text-center transition cursor-pointer"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!isDemoDataSeeded()) seedDemoDataToStorage();
                    await signInWithEmergencySession('dean.nursing@stalexiuscollege.edu.ph', 'admin', 'Dean Arthur Reyes, RN, PhD', { department: 'College of Nursing' });
                  }}
                  className="px-2 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-[10px] font-bold text-center transition cursor-pointer"
                >
                  Dean
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!isDemoDataSeeded()) seedDemoDataToStorage();
                    await signInWithEmergencySession('maria.santos@stalexiuscollege.edu.ph', 'teacher', 'Prof. Maria Santos', { department: 'College of Nursing', employeeId: 'EMP-7012' });
                  }}
                  className="px-2 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 text-[10px] font-bold text-center transition cursor-pointer"
                >
                  Faculty
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!isDemoDataSeeded()) seedDemoDataToStorage();
                    await signInWithEmergencySession('student@stalexiuscollege.edu.ph', 'student', 'Juan A. Dela Cruz', { department: 'College of Computer Studies', studentId: '2024-10294' });
                  }}
                  className="px-2 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold text-center transition cursor-pointer"
                >
                  Student
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Footer Account Section */}
        <div className="p-3 border-t border-blue-800/60 bg-slate-950/40 space-y-3">
          {/* User Profile Info */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-1 py-1'}`}>
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=1e3a8a&color=ffffff`} 
              alt="Profile" 
              className="w-9 h-9 rounded-full border border-white/20 shadow-md object-cover flex-shrink-0"
              referrerPolicy="no-referrer"
            />
            {!isCollapsed && (
              <div className="ml-2.5 overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user.displayName || 'Faculty User'}</p>
                <p className="text-[10px] text-amber-300/90 font-medium capitalize flex items-center">
                  <Award className="w-3 h-3 mr-0.5 text-amber-300" /> {((user?.email || '').toLowerCase().trim() === 'renzarvy.rv@gmail.com' || (user?.email || '').toLowerCase().trim() === 'admin@stalexiuscollege.edu.ph' || role === 'admin') ? 'admin' : (role || 'student')} Account
                </p>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={logOut}
            title={isCollapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center justify-center py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isCollapsed ? 'px-0' : 'px-3'
            }`}
          >
            <LogOut className={`w-3.5 h-3.5 ${isCollapsed ? '' : 'mr-2'}`} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>

          {/* Sidebar Footer Copyright */}
          {!isCollapsed && (
            <div className="pt-1.5 border-t border-white/5 text-[9px] text-blue-300/60 text-center font-medium">
              © {currentYear} St. Alexius College
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { ShieldAlert, ArrowLeft, LogOut, Home as HomeIcon, HelpCircle, Lock } from 'lucide-react';

interface AccessDeniedProps {
  allowedRoles?: UserRole[] | string[];
  customTitle?: string;
  customMessage?: string;
  showDetails?: boolean;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  allowedRoles,
  customTitle,
  customMessage,
  showDetails = true,
}) => {
  const { user, role, logOut } = useAuth();
  const navigate = useNavigate();

  const getAuthorizedPath = () => {
    if (role === 'admin') return '/admin';
    if (role === 'teacher') return '/teacher';
    if (role === 'student') return '/student';
    return '/home';
  };

  const getRoleBadge = (r: string | null | undefined) => {
    if (!r) return 'Unassigned';
    switch (r.toLowerCase()) {
      case 'admin':
        return 'Administrator';
      case 'teacher':
        return 'Faculty / Teacher';
      case 'student':
        return 'Student';
      default:
        return r;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-[#c59b27] selection:text-slate-900">
      <div className="max-w-md w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-md">
        
        {/* Subtle decorative background glow */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#c59b27]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Shield Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[#c59b27] flex items-center justify-center shadow-inner relative">
          <ShieldAlert className="w-8 h-8 text-[#c59b27]" />
        </div>

        {/* Header and Explanation */}
        <div className="space-y-2">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#c59b27] uppercase tracking-[0.2em] block">
            RESTRICTED CLEARANCE &middot; ST. ALEXIUS COLLEGE
          </span>
          <h1 className="text-2xl font-serif-display font-bold text-white tracking-tight">
            {customTitle || 'Access Denied'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
            {customMessage ||
              'You do not have the required institutional authorization to access this page or administrative module.'}
          </p>
        </div>

        {/* Account Details Panel */}
        {showDetails && (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span>Account:</span>
              <span className="text-slate-200 font-medium truncate max-w-[200px]" title={user?.email || 'Guest'}>
                {user?.email || 'Not Signed In'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Your Role:</span>
              <span className="text-[#e5ca7c] font-bold uppercase tracking-wider bg-[#c59b27]/15 px-2 py-0.5 rounded border border-[#c59b27]/30 text-[11px]">
                {getRoleBadge(role)}
              </span>
            </div>
            {allowedRoles && allowedRoles.length > 0 && (
              <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-slate-800">
                <span>Required Clearance:</span>
                <span className="text-blue-300 font-semibold uppercase text-[11px]">
                  {allowedRoles.join(' / ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {user && role ? (
            <Link
              to={getAuthorizedPath()}
              className="w-full bg-[#c59b27] hover:bg-[#b0881e] text-[#0c1a36] font-bold text-xs sm:text-sm tracking-wider uppercase py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-amber-500/10 transform hover:scale-[1.01]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to My Authorized Dashboard</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="w-full bg-[#c59b27] hover:bg-[#b0881e] text-[#0c1a36] font-bold text-xs sm:text-sm tracking-wider uppercase py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-amber-500/10"
            >
              <Lock className="w-4 h-4" />
              <span>Log in with Permitted Account</span>
            </Link>
          )}

          <div className="flex items-center gap-2">
            <Link
              to="/home"
              className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <HomeIcon className="w-3.5 h-3.5 text-[#c59b27]" />
              <span>Homepage</span>
            </Link>

            {user && (
              <button
                onClick={() => logOut().then(() => navigate('/home'))}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Support Information */}
        <div className="pt-3 text-[11px] text-slate-400 border-t border-slate-800/80 flex items-center justify-center gap-1.5 leading-tight">
          <HelpCircle className="w-3.5 h-3.5 text-[#c59b27] flex-shrink-0" />
          <span>Need role reassignment? Contact MIS at <strong>admin@stalexiuscollege.edu.ph</strong></span>
        </div>

      </div>
    </div>
  );
};

export default AccessDenied;

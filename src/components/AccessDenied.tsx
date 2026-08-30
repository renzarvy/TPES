import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { 
  ShieldAlert, 
  ArrowLeft, 
  LogOut, 
  Home as HomeIcon, 
  HelpCircle, 
  Lock, 
  LayoutDashboard,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

interface AccessDeniedProps {
  allowedRoles?: UserRole[] | string[];
  customTitle?: string;
  customMessage?: string;
  showDetails?: boolean;
  redirectPath?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  allowedRoles,
  customTitle,
  customMessage,
  showDetails = true,
  redirectPath,
}) => {
  const { user, role, logOut } = useAuth();
  const navigate = useNavigate();

  const userEmail = (user?.email || '').toLowerCase().trim();
  const isSuperAdmin = userEmail === 'renzarvy.rv@gmail.com' || userEmail === 'admin@stalexiuscollege.edu.ph';

  // Intelligent resolution of dashboard destination and metadata based on assigned role
  const getDashboardConfig = () => {
    if (redirectPath) {
      return {
        path: redirectPath,
        title: 'Return to Dashboard',
        subtitle: 'Assigned Workspace',
        icon: LayoutDashboard,
        roleName: 'Custom Route',
        colorClass: 'text-amber-400'
      };
    }

    if (isSuperAdmin || role === 'admin') {
      return {
        path: '/admin',
        title: 'Return to Dashboard',
        subtitle: 'Administrator Command Center',
        icon: ShieldCheck,
        roleName: 'Administrator',
        colorClass: 'text-amber-400'
      };
    }

    if (role === 'teacher') {
      return {
        path: '/teacher',
        title: 'Return to Dashboard',
        subtitle: 'Faculty Evaluation & Subject Portal',
        icon: Briefcase,
        roleName: 'Faculty / Teacher',
        colorClass: 'text-blue-400'
      };
    }

    if (role === 'student') {
      return {
        path: '/student',
        title: 'Return to Dashboard',
        subtitle: 'Student Evaluation Portal',
        icon: GraduationCap,
        roleName: 'Student',
        colorClass: 'text-emerald-400'
      };
    }

    // Default fallback for authenticated users without recognized role or unauthenticated
    return {
      path: user ? '/home' : '/login',
      title: user ? 'Return to Home' : 'Log In to Continue',
      subtitle: user ? 'Institutional Home Portal' : 'Authentication Required',
      icon: user ? HomeIcon : Lock,
      roleName: 'Unassigned Account',
      colorClass: 'text-slate-300'
    };
  };

  const dashboardConfig = getDashboardConfig();
  const DashboardIcon = dashboardConfig.icon;

  const getRoleBadge = (r: string | null | undefined) => {
    if (isSuperAdmin) return 'Super Administrator';
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

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(dashboardConfig.path);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 sm:p-6 font-sans selection:bg-[#c59b27] selection:text-slate-900">
      <div className="max-w-lg w-full bg-slate-950/95 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
        
        {/* Decorative background ambient glows */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-[#c59b27]/15 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

        {/* Shield Alert Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[#c59b27] flex items-center justify-center shadow-inner relative group">
          <ShieldAlert className="w-8 h-8 text-[#c59b27] transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
        </div>

        {/* Header and Explanation */}
        <div className="space-y-2">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#c59b27] uppercase tracking-[0.2em] block">
            Institutional Clearance Notice &middot; St. Alexius College
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {customTitle || 'Access Restricted'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal max-w-md mx-auto">
            {customMessage ||
              'You do not have the required institutional authorization to access this page or module. Please return to your assigned dashboard.'}
          </p>
        </div>

        {/* Account Details & Routing Target Panel */}
        {showDetails && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 text-left text-xs space-y-2.5 shadow-inner">
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-medium">Signed-in Account:</span>
              <span className="text-slate-200 font-semibold truncate max-w-[210px]" title={user?.email || 'Guest'}>
                {user?.email || 'Not Signed In'}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-medium">Your Active Role:</span>
              <span className="text-[#e5ca7c] font-bold uppercase tracking-wider bg-[#c59b27]/15 px-2.5 py-0.5 rounded-md border border-[#c59b27]/30 text-[11px]">
                {getRoleBadge(role)}
              </span>
            </div>

            {allowedRoles && allowedRoles.length > 0 && (
              <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-slate-800">
                <span className="font-medium">Required Clearance:</span>
                <span className="text-blue-300 font-semibold uppercase text-[11px] bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                  {allowedRoles.join(' / ')}
                </span>
              </div>
            )}

            {user && (
              <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-slate-800">
                <span className="font-medium">Authorized Destination:</span>
                <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                  {dashboardConfig.subtitle}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Primary and Secondary Action Buttons */}
        <div className="space-y-3 pt-1">
          {/* Prominent Intelligent 'Return to Dashboard' Button */}
          {user ? (
            <Link
              to={dashboardConfig.path}
              id="return-to-dashboard-btn"
              aria-label={`Return to ${dashboardConfig.subtitle}`}
              className="w-full group bg-gradient-to-r from-[#c59b27] via-[#d4af37] to-[#c59b27] hover:from-[#b0881e] hover:to-[#a17a15] text-[#0c1a36] font-extrabold text-xs sm:text-sm tracking-wider uppercase py-3.5 px-5 rounded-2xl flex items-center justify-between transition-all duration-200 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 transform hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <DashboardIcon className="w-5 h-5 text-[#0c1a36]" aria-hidden="true" />
                <div className="text-left">
                  <span className="block font-black text-xs sm:text-sm">Return to Dashboard</span>
                  <span className="block text-[10px] font-semibold text-[#0c1a36]/80 capitalize tracking-normal">
                    {dashboardConfig.subtitle}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#0c1a36] transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          ) : (
            <Link
              to="/login"
              id="login-redirect-btn"
              aria-label="Log in to institutional account"
              className="w-full bg-[#c59b27] hover:bg-[#b0881e] text-[#0c1a36] font-extrabold text-xs sm:text-sm tracking-wider uppercase py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-amber-500/10 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-[#0c1a36]" aria-hidden="true" />
              <span>Log in with Permitted Account</span>
            </Link>
          )}

          {/* Secondary Quick Navigation Row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleGoBack}
              aria-label="Go back to previous page"
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span className="truncate">Go Back</span>
            </button>

            <Link
              to="/home"
              aria-label="Go to institution homepage"
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <HomeIcon className="w-3.5 h-3.5 text-[#c59b27]" aria-hidden="true" />
              <span className="truncate">Homepage</span>
            </Link>

            {user ? (
              <button
                type="button"
                onClick={() => logOut().then(() => navigate('/home'))}
                aria-label="Sign out of current account"
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 hover:text-red-200 text-xs font-semibold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="truncate">Sign Out</span>
              </button>
            ) : (
              <Link
                to="/login"
                aria-label="Sign in"
                className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 hover:text-blue-200 text-xs font-semibold py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="truncate">Sign In</span>
              </Link>
            )}
          </div>
        </div>

        {/* Footer Support Information */}
        <div className="pt-3 text-[11px] text-slate-400 border-t border-slate-800/80 flex items-center justify-center gap-1.5 leading-tight">
          <HelpCircle className="w-3.5 h-3.5 text-[#c59b27] flex-shrink-0" aria-hidden="true" />
          <span>Need role reassignment? Contact MIS at <strong className="text-slate-300">admin@stalexiuscollege.edu.ph</strong></span>
        </div>

      </div>
    </div>
  );
};

export default AccessDenied;


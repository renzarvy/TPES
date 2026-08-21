import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { ShieldAlert, ArrowLeft, Lock, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  requireVerification?: boolean;
  fallbackPath?: string;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  requireVerification = false,
  fallbackPath,
  children
}) => {
  const { user, role, loading, isVerified, validateUserRole, userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isValidating, setIsValidating] = useState(true);
  const [isRoleAuthentic, setIsRoleAuthentic] = useState<boolean | null>(null);
  const [dbRole, setDbRole] = useState<UserRole | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const runRoleCheck = async () => {
      if (!user) {
        if (isMounted) {
          setIsValidating(false);
          setIsRoleAuthentic(false);
        }
        return;
      }

      try {
        setIsValidating(true);
        // Force-validate with Firestore document
        const result = await validateUserRole(role);
        if (isMounted) {
          setIsRoleAuthentic(result.valid);
          setDbRole(result.assignedRole);
          if (!result.valid) {
            setValidationMessage(result.reason || 'Database role mismatch detected.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn("Role validation check encountered an issue:", err);
          // Allow existing valid state if error is transient
          setIsRoleAuthentic(true);
        }
      } finally {
        if (isMounted) {
          setIsValidating(false);
        }
      }
    };

    if (!loading) {
      runRoleCheck();
    }

    return () => {
      isMounted = false;
    };
  }, [user, role, loading, location.pathname]);

  // 1. Initial loading state
  if (loading || isValidating) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-blue-900 border-t-[#c59b27] rounded-full animate-spin mb-4" />
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
          Verifying Security Clearance...
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Confirming account authentication and database permissions for this administrative module.
        </p>
      </div>
    );
  }

  // 2. Unauthenticated -> Redirect to Login with history state
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userEmail = (user.email || '').toLowerCase().trim();
  const isSuperAdmin = userEmail === 'renzarvy.rv@gmail.com' || userEmail === 'admin@stalexiuscollege.edu.ph';
  
  // Effective role to test against allowedRoles
  const effectiveRole = isSuperAdmin ? 'admin' : (dbRole || role);
  const isAllowed = isSuperAdmin || (effectiveRole && allowedRoles.includes(effectiveRole));

  // 3. Document Role Mismatch Security Breach Protection
  if (isRoleAuthentic === false && !isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-red-200 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3 text-red-600 mb-4 pb-4 border-b border-red-100">
          <ShieldAlert className="w-8 h-8 flex-shrink-0 text-red-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Security Clearance Mismatch</h2>
            <p className="text-xs text-red-600 font-medium tracking-wide">
              Document Field Security Verification Denied (Code: SEC_ROLE_MISMATCH)
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Your current session requested access with role <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono font-bold">[{role}]</code>, but your verified Firestore document credentials specify <code className="bg-red-50 px-1.5 py-0.5 rounded text-red-700 font-mono font-bold">[{dbRole || 'unassigned'}]</code>.
          </p>
          <p className="p-3 bg-red-50/70 border border-red-200 rounded-lg text-red-800">
            {validationMessage || 'All administrative read and write operations have been locked to protect institutional data integrity.'}
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-synchronize Credentials</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 4. Unauthorized Role Access -> Render Institutional Access Denied Page
  if (!isAllowed) {
    if (fallbackPath) {
      return <Navigate to={fallbackPath} replace />;
    }

    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-xl text-center">
        <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-5 text-[#c59b27]">
          <Lock className="w-8 h-8 text-[#c59b27]" />
        </div>

        <span className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-[#c59b27] bg-[#c59b27]/10 px-3 py-1 rounded-full border border-[#c59b27]/20">
          RESTRICTED ACCESS
        </span>

        <h2 className="text-xl font-serif-display font-bold text-slate-900 mt-4 mb-2">
          Administrator Clearance Required
        </h2>

        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          You are currently signed in as a <span className="font-semibold text-blue-900 uppercase">[{role || 'Student'}]</span> account. 
          This route requires elevated <span className="font-semibold text-slate-900">[{allowedRoles.join(' / ').toUpperCase()}]</span> permissions.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs space-y-2 mb-6">
          <div className="flex justify-between items-center text-slate-500 border-b border-slate-200 pb-2">
            <span>Requested Resource:</span>
            <code className="text-slate-800 font-mono font-medium">{location.pathname}</code>
          </div>
          <div className="flex justify-between items-center text-slate-500 border-b border-slate-200 pb-2">
            <span>Authenticated User:</span>
            <span className="text-slate-800 font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500">
            <span>Required Role(s):</span>
            <span className="text-amber-700 font-bold">{allowedRoles.join(', ')}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-[#0c1a36] hover:bg-[#162a56] text-white rounded-xl text-xs font-bold transition-all"
          >
            Return to Main Portal
          </button>
        </div>
      </div>
    );
  }

  // 5. Verification Check (if requireVerification is specified)
  if (requireVerification && !isVerified && role === 'student' && !isSuperAdmin) {
    return <Navigate to="/verification-status" replace />;
  }

  return <>{children}</>;
};

import { useMemo } from 'react';
import { useAuth, UserRole } from '../contexts/AuthContext';

export interface UseRoleAuthOptions {
  allowedRoles?: (UserRole | string)[];
}

export interface UseRoleAuthResult {
  user: ReturnType<typeof useAuth>['user'];
  role: UserRole;
  userProfile: ReturnType<typeof useAuth>['userProfile'];
  loading: boolean;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  isSuperAdmin: boolean;
  targetDashboardPath: string;
  canAccess: (roles?: (UserRole | string)[]) => boolean;
  hasRole: (checkRole: UserRole | string) => boolean;
}

/**
 * Custom hook to consolidate role validation, superadmin checks, and dashboard route resolution
 * across all route guards and role routers in St. Alexius College TPES.
 */
export function useRoleAuth(options?: UseRoleAuthOptions): UseRoleAuthResult {
  const { user, role, userProfile, loading } = useAuth();

  const userEmail = (user?.email || '').toLowerCase().trim();
  const isSuperAdmin = userEmail === 'renzarvy.rv@gmail.com' || userEmail === 'admin@stalexiuscollege.edu.ph';

  const targetDashboardPath = useMemo(() => {
    if (!user) return '/login';
    if (isSuperAdmin || role === 'admin') return '/admin';
    if (role === 'teacher') return '/teacher';
    if (role === 'student') return '/student';
    return '/home';
  }, [user, role, isSuperAdmin]);

  const canAccess = useMemo(() => {
    return (rolesToCheck?: (UserRole | string)[]): boolean => {
      if (!user) return false;
      if (isSuperAdmin) return true;
      if (!rolesToCheck || rolesToCheck.length === 0) return true;
      if (!role) return false;
      return rolesToCheck.some((r) => r && r.toLowerCase() === role.toLowerCase());
    };
  }, [user, role, isSuperAdmin]);

  const hasRole = (checkRole: UserRole | string): boolean => {
    if (!user) return false;
    if (isSuperAdmin && checkRole === 'admin') return true;
    return Boolean(role && role.toLowerCase() === String(checkRole).toLowerCase());
  };

  const isAuthorized = useMemo(() => {
    if (!options?.allowedRoles || options.allowedRoles.length === 0) {
      // If no specific roles required, having any valid authenticated role is sufficient
      return Boolean(user && (isSuperAdmin || role === 'admin' || role === 'teacher' || role === 'student'));
    }
    return canAccess(options.allowedRoles);
  }, [user, role, isSuperAdmin, options?.allowedRoles, canAccess]);

  return {
    user,
    role,
    userProfile,
    loading,
    isAuthenticated: Boolean(user),
    isAuthorized,
    isSuperAdmin,
    targetDashboardPath,
    canAccess,
    hasRole,
  };
}

export default useRoleAuth;

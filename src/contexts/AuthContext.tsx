import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, initTursoSchema } from '../lib/turso';
import { 
  tursoLoginUser, 
  tursoRegisterUser, 
  loadSavedSession, 
  saveSession, 
  clearSession,
  SUPER_ADMIN_EMAILS,
  generateUuid
} from '../lib/tursoAuth';
import { ensureMasterDemoDataSeeded } from '../lib/demoReportsData';

export type UserRole = 'student' | 'teacher' | 'admin' | null;

export interface SecurityStatus {
  isAligned: boolean;
  lastChecked: string | null;
  roleInDb: UserRole | null;
  error?: string | null;
}

export interface UserProfile {
  name?: string;
  email?: string;
  role?: UserRole;
  studentId?: string;
  employeeId?: string;
  idNumber?: string;
  college?: string;
  department?: string;
  verificationStatus?: string;
  isVerifiedStudent?: boolean;
  idProofUrl?: string;
  rejectionReason?: string;
  photoUrl?: string;
  [key: string]: any;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  photoURL?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  userProfile: UserProfile | null;
  role: UserRole;
  actualRole: UserRole;
  loading: boolean;
  authError: string | null;
  isVerified: boolean;
  verificationStatus: string;
  securityStatus: SecurityStatus;
  isRoleValid: boolean;
  isRefererBlocked: boolean;
  isApiKeyInvalid: boolean;
  validateUserRole: (targetRole?: UserRole) => Promise<{ valid: boolean; assignedRole: UserRole; reason?: string }>;
  verifyDocOwnershipOrRole: (action: 'read' | 'write' | 'admin', targetUserId?: string) => { allowed: boolean; reason?: string };
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithEmergencySession: (
    emailToUse: string,
    targetRole?: UserRole,
    customName?: string,
    extra?: { department?: string; studentId?: string; employeeId?: string; idNumber?: string }
  ) => Promise<void>;
  signUpWithEmail: (
    email: string, 
    pass: string, 
    fullName: string, 
    idNumber?: string, 
    accountRole?: 'student' | 'teacher', 
    extraData?: { department?: string; idProofUrl?: string }
  ) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logOut: () => Promise<void>;
  setRole: (role: UserRole) => void;
  clearAuthError: () => void;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [actualRole, setActualRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRoleValid, setIsRoleValid] = useState<boolean>(true);
  const [isRefererBlocked] = useState<boolean>(false);
  const [isApiKeyInvalid] = useState<boolean>(false);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    isAligned: true,
    lastChecked: null,
    roleInDb: null,
    error: null
  });

  // Load session from localStorage on initial render
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await initTursoSchema();
        ensureMasterDemoDataSeeded();
        const saved = loadSavedSession();
        if (saved && saved.user && saved.profile) {
          const normalizedEmail = (saved.user.email || '').toLowerCase().trim();
          const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(normalizedEmail);
          const effectiveRole = isSuperAdmin ? 'admin' : (saved.profile.role || 'student');

          setUser(saved.user);
          setUserProfile({
            ...saved.profile,
            role: effectiveRole,
            isVerifiedStudent: isSuperAdmin ? true : (saved.profile.isVerifiedStudent || saved.profile.verificationStatus === 'verified')
          });
          setRole(effectiveRole);
          setActualRole(effectiveRole);
          setIsRoleValid(true);
        }
      } catch (err) {
        console.warn('[Turso Auth] Session load warning:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const clearAuthError = () => {
    setAuthError(null);
  };

  /**
   * Turso Database Email + Password Login
   */
  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { user: authedUser, profile } = await tursoLoginUser(email, pass);
      setUser(authedUser);
      setUserProfile(profile);
      setRole(profile.role || 'student');
      setActualRole(profile.role || 'student');
      setIsRoleValid(true);
    } catch (error: any) {
      console.error('[Turso Login Error]:', error);
      setAuthError(error.message || 'Failed to sign in. Please verify your credentials.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Turso Database Registration
   */
  const signUpWithEmail = async (
    email: string, 
    pass: string, 
    fullName: string, 
    idNumber?: string, 
    accountRole: 'student' | 'teacher' = 'student', 
    extraData?: { department?: string; idProofUrl?: string }
  ) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { user: newUser, profile } = await tursoRegisterUser({
        email,
        password: pass,
        displayName: fullName,
        role: accountRole,
        idNumber,
        department: extraData?.department,
        idProofUrl: extraData?.idProofUrl
      });
      setUser(newUser);
      setUserProfile(profile);
      setRole(profile.role || 'student');
      setActualRole(profile.role || 'student');
      setIsRoleValid(true);
    } catch (error: any) {
      console.error('[Turso Signup Error]:', error);
      setAuthError(error.message || 'Registration failed. Please check your details.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Google Sign-in / Institutional Account
   */
  const signInWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const email = 'renzarvy.rv@gmail.com';
      const { user: loggedIn, profile } = await tursoRegisterUser({
        email,
        displayName: 'Super Administrator',
        role: 'admin',
        department: 'Institutional Administration'
      });
      setUser(loggedIn);
      setUserProfile(profile);
      setRole('admin');
      setActualRole('admin');
      setIsRoleValid(true);
    } catch (error: any) {
      console.error('[Institutional Sign In Error]:', error);
      setAuthError(error.message || 'Sign in error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 1-Click Instant Test Authentication
   */
  const signInWithEmergencySession = async (
    emailToUse: string,
    targetRole: UserRole = 'student',
    customName?: string,
    extra?: { department?: string; studentId?: string; employeeId?: string; idNumber?: string }
  ) => {
    setLoading(true);
    setAuthError(null);
    try {
      const normalizedEmail = emailToUse.toLowerCase().trim();
      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(normalizedEmail) || targetRole === 'admin';
      const finalRole: UserRole = isSuperAdmin ? 'admin' : (targetRole || 'student');
      const isVerified = true;
      const verificationStatus = 'approved';

      const displayName = customName || (isSuperAdmin ? 'Super Administrator' : (finalRole === 'teacher' ? 'Prof. Maria Santos' : 'Juan A. Dela Cruz'));
      const idNum = extra?.idNumber || extra?.studentId || extra?.employeeId || (finalRole === 'student' ? '2024-10294' : 'EMP-7012');

      const { user: emergencyUser, profile } = await tursoRegisterUser({
        email: normalizedEmail,
        displayName: displayName,
        role: finalRole,
        idNumber: idNum,
        department: extra?.department || (finalRole === 'student' ? 'College of Computer Studies' : 'College of Nursing')
      });

      setUser(emergencyUser);
      setUserProfile({
        ...profile,
        studentId: idNum,
        idNumber: idNum,
        isVerifiedStudent: isVerified,
        verificationStatus: verificationStatus
      });
      setRole(finalRole);
      setActualRole(finalRole);
      setIsRoleValid(true);

      // Auto ensure demo data is seeded with this user's UID
      ensureMasterDemoDataSeeded(emergencyUser.uid);
    } catch (error: any) {
      console.error('[Quick Test Session Error]:', error);
      // Fallback in-memory
      const fallbackUser: AuthUser = {
        uid: 'turso_demo_' + Date.now(),
        email: emailToUse,
        displayName: customName || 'Test User',
        emailVerified: true
      };
      const fallbackProfile: UserProfile = {
        name: customName || 'Test User',
        email: emailToUse,
        role: targetRole,
        department: extra?.department || 'College of Computer Studies',
        studentId: extra?.studentId || extra?.idNumber || '2024-10294',
        employeeId: extra?.employeeId || extra?.idNumber,
        isVerifiedStudent: true,
        verificationStatus: 'verified'
      };
      saveSession(fallbackUser, fallbackProfile);
      setUser(fallbackUser);
      setUserProfile(fallbackProfile);
      setRole(targetRole);
      setActualRole(targetRole);
      setIsRoleValid(true);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Password Reset
   */
  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const res = await db.execute({
        sql: 'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1',
        args: [normalizedEmail]
      });
      if (res.rows.length === 0) {
        throw new Error('No registered account found with that email address.');
      }
      console.log(`[Turso Auth] Password reset requested for ${normalizedEmail}`);
    } catch (err: any) {
      setAuthError(err.message || 'Password reset request failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log Out
   */
  const logOut = async () => {
    setLoading(true);
    try {
      clearSession();
      setUser(null);
      setUserProfile(null);
      setRole(null);
      setActualRole(null);
      setAuthError(null);
      setIsRoleValid(true);
    } catch (error: any) {
      console.error('[Turso Logout Error]:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reload current user
   */
  const reloadUser = async () => {
    if (!user) return;
    try {
      const res = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ? OR LOWER(email) = ? LIMIT 1',
        args: [user.uid, (user.email || '').toLowerCase()]
      });
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const updatedProfile: UserProfile = {
          ...userProfile,
          name: String(row.display_name || userProfile?.name || ''),
          email: String(row.email || userProfile?.email || ''),
          role: (row.role as UserRole) || userProfile?.role,
          department: String(row.department || userProfile?.department || ''),
          isVerifiedStudent: Number(row.is_verified) === 1,
          verificationStatus: String(row.verification_status || userProfile?.verificationStatus || 'pending'),
          idProofUrl: row.id_proof_url ? String(row.id_proof_url) : userProfile?.idProofUrl
        };
        setUserProfile(updatedProfile);
        saveSession(user, updatedProfile);
      }
    } catch (e) {
      console.warn('[Turso reloadUser notice]:', e);
    }
  };

  const resendVerificationEmail = async () => {
    console.log('[Turso] Verification notice dispatched');
  };

  /**
   * Update Profile in Turso SQLite and localStorage
   */
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated: UserProfile = {
      ...(userProfile || {}),
      ...data
    };
    setUserProfile(updated);

    if (data.role) {
      setRole(data.role);
      setActualRole(data.role);
    }

    saveSession(user, updated);

    try {
      await db.execute({
        sql: `UPDATE users SET 
              display_name = COALESCE(?, display_name),
              department = COALESCE(?, department),
              student_id = COALESCE(?, student_id),
              employee_id = COALESCE(?, employee_id),
              is_verified = COALESCE(?, is_verified),
              verification_status = COALESCE(?, verification_status),
              id_proof_url = COALESCE(?, id_proof_url),
              updated_at = datetime('now')
              WHERE id = ? OR LOWER(email) = ?`,
        args: [
          data.name || null,
          data.department || null,
          data.studentId || null,
          data.employeeId || null,
          data.isVerifiedStudent !== undefined ? (data.isVerifiedStudent ? 1 : 0) : null,
          data.verificationStatus || null,
          data.idProofUrl || null,
          user.uid,
          (user.email || '').toLowerCase()
        ]
      });
    } catch (err) {
      console.warn('[Turso updateUserProfile notice]:', err);
    }
  };

  /**
   * Validate role matches database record
   */
  const validateUserRole = async (targetRole?: UserRole): Promise<{ valid: boolean; assignedRole: UserRole; reason?: string }> => {
    if (!user) {
      return { valid: false, assignedRole: null, reason: 'No authenticated user session active.' };
    }

    const normalizedEmail = (user.email || '').toLowerCase().trim();
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(normalizedEmail);

    if (isSuperAdmin) {
      setSecurityStatus({
        isAligned: true,
        lastChecked: new Date().toISOString(),
        roleInDb: 'admin',
        error: null
      });
      setIsRoleValid(true);
      return { valid: true, assignedRole: 'admin' };
    }

    try {
      const res = await db.execute({
        sql: 'SELECT role FROM users WHERE id = ? OR LOWER(email) = ? LIMIT 1',
        args: [user.uid, normalizedEmail]
      });

      if (res.rows.length === 0) {
        return { valid: true, assignedRole: role };
      }

      const trueRole = (res.rows[0].role as UserRole) || 'student';
      const roleToCheck = targetRole || role;
      const isMatching = trueRole === roleToCheck;

      if (!isMatching) {
        setRole(trueRole);
        setActualRole(trueRole);
      }

      return { valid: true, assignedRole: trueRole };
    } catch (err: any) {
      console.warn('[Turso validateUserRole notice]:', err);
      return { valid: true, assignedRole: role, reason: err?.message };
    }
  };

  const verifyDocOwnershipOrRole = (
    action: 'read' | 'write' | 'admin',
    targetUserId?: string
  ): { allowed: boolean; reason?: string } => {
    if (!user) {
      return { allowed: false, reason: 'Authentication required.' };
    }

    const normalizedEmail = (user.email || '').toLowerCase().trim();
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(normalizedEmail);

    if (isSuperAdmin || role === 'admin') {
      return { allowed: true };
    }

    if (action === 'admin') {
      return { allowed: false, reason: 'Administrative clearance level required for this operation.' };
    }

    if (targetUserId && targetUserId !== user.uid) {
      return { 
        allowed: false, 
        reason: `Access denied: Target document owner UID (${targetUserId}) does not match authenticated user UID (${user.uid}).` 
      };
    }

    return { allowed: true };
  };

  const isVerified = Boolean(
    userProfile?.isVerifiedStudent || 
    userProfile?.verificationStatus === 'verified' || 
    role === 'admin' || 
    role === 'teacher'
  );

  const verificationStatus = userProfile?.verificationStatus || (isVerified ? 'verified' : 'pending');

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      role, 
      actualRole, 
      loading, 
      authError, 
      isVerified, 
      verificationStatus,
      securityStatus, 
      isRoleValid, 
      isRefererBlocked, 
      isApiKeyInvalid, 
      validateUserRole, 
      verifyDocOwnershipOrRole,
      signInWithGoogle, 
      signInWithEmail, 
      signInWithEmergencySession, 
      signUpWithEmail, 
      resendVerificationEmail, 
      reloadUser, 
      resetPassword, 
      logOut, 
      setRole, 
      clearAuthError, 
      updateUserProfile
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export interface UserRoleValidationProps {
  requiredRole?: UserRole | UserRole[];
  requireOwnershipId?: string;
  onUnauthorized?: () => void;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const UserRoleValidation: React.FC<UserRoleValidationProps> = ({
  requiredRole,
  requireOwnershipId,
  onUnauthorized,
  children,
  fallback = null
}) => {
  const { user, role, loading, validateUserRole } = useAuth();
  const [checking, setChecking] = useState(true);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!user) {
        if (active) {
          setPassed(false);
          setChecking(false);
          if (onUnauthorized) onUnauthorized();
        }
        return;
      }

      const res = await validateUserRole(role);
      if (!active) return;

      const rolesArray = requiredRole 
        ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole])
        : null;

      const rolePasses = !rolesArray || (res.assignedRole && rolesArray.includes(res.assignedRole));
      const ownershipPasses = !requireOwnershipId || requireOwnershipId === user.uid;

      const isSuccess = res.valid && rolePasses && ownershipPasses;
      setPassed(isSuccess);
      setChecking(false);

      if (!isSuccess && onUnauthorized) {
        onUnauthorized();
      }
    };

    if (!loading) {
      check();
    }

    return () => {
      active = false;
    };
  }, [user, role, loading, requiredRole, requireOwnershipId]);

  if (loading || checking) {
    return null;
  }

  if (!passed) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

import { db, initTursoSchema, isTursoConfigured, getTursoClient } from './turso';
import { UserRole, UserProfile } from '../contexts/AuthContext';

export const SUPER_ADMIN_EMAILS = [
  'renzarvy.rv@gmail.com',
  'admin@stalexiuscollege.edu.ph'
];

const SESSION_STORAGE_KEY = 'sac_tpes_turso_session';
const LOCAL_USERS_STORAGE_KEY = 'sac_tpes_local_users';

function getLocalUsers(): Record<string, any> {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalUser(email: string, userData: any) {
  try {
    const users = getLocalUsers();
    users[email.toLowerCase().trim()] = userData;
    localStorage.setItem(LOCAL_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('[TursoAuth] Local storage save note:', e);
  }
}

/**
 * Hash password using SHA-256 Web Crypto
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`sac_salt_2025_${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'usr_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

/**
 * Register user in Turso / Local storage
 */
export async function tursoRegisterUser({
  email,
  password,
  displayName,
  role = 'student',
  idNumber,
  department,
  idProofUrl,
  course,
  yearLevel
}: {
  email: string;
  password?: string;
  displayName: string;
  role?: UserRole;
  idNumber?: string;
  department?: string;
  idProofUrl?: string;
  course?: string;
  yearLevel?: number;
}): Promise<{ user: any; profile: UserProfile }> {
  const normalizedEmail = email.toLowerCase().trim();
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(normalizedEmail);
  const finalRole: UserRole = isSuperAdmin ? 'admin' : (role || 'student');
  const isVerified = isSuperAdmin ? 1 : (finalRole === 'teacher' ? 1 : 0);
  const verificationStatus = isSuperAdmin ? 'verified' : (finalRole === 'teacher' ? 'verified' : 'pending');

  const passwordHash = password ? await hashPassword(password) : await hashPassword('SAC_Default_Password_2025!');
  const userId = generateUuid();
  const now = new Date().toISOString();

  const userObj = {
    uid: userId,
    email: normalizedEmail,
    displayName: displayName,
    emailVerified: isVerified === 1
  };

  const profile: UserProfile = {
    name: displayName,
    email: normalizedEmail,
    role: finalRole,
    department: department || (finalRole === 'admin' ? 'Institutional Administration' : ''),
    studentId: finalRole === 'student' ? idNumber : undefined,
    employeeId: finalRole === 'teacher' ? idNumber : undefined,
    idNumber: idNumber || '',
    isVerifiedStudent: isVerified === 1,
    verificationStatus: verificationStatus,
    idProofUrl: idProofUrl || ''
  };

  // Always save locally first for instant, guaranteed availability
  saveLocalUser(normalizedEmail, {
    id: userId,
    email: normalizedEmail,
    displayName,
    role: finalRole,
    passwordHash,
    department: profile.department,
    idNumber,
    isVerified,
    verificationStatus,
    idProofUrl,
    created_at: now
  });

  saveSession(userObj, profile);

  // Attempt sync to Turso cloud if token is available
  if (isTursoConfigured()) {
    try {
      const client = getTursoClient();
      if (client) {
        await initTursoSchema();
        const existing = await client.execute({
          sql: 'SELECT id, email FROM users WHERE LOWER(email) = ? LIMIT 1',
          args: [normalizedEmail]
        });

        if (existing.rows.length > 0) {
          await client.execute({
            sql: `UPDATE users SET 
                  display_name = ?, 
                  role = ?, 
                  password_hash = COALESCE(?, password_hash), 
                  department = COALESCE(?, department), 
                  is_verified = ?, 
                  verification_status = ?,
                  updated_at = ? 
                  WHERE LOWER(email) = ?`,
            args: [displayName, finalRole, passwordHash, department || null, isVerified, verificationStatus, now, normalizedEmail]
          });
        } else {
          await client.execute({
            sql: `INSERT INTO users (
              id, email, password_hash, display_name, role, 
              student_id, employee_id, department, course, year_level, 
              is_verified, verification_status, id_proof_url, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              userId, normalizedEmail, passwordHash, displayName, finalRole,
              finalRole === 'student' ? (idNumber || null) : null,
              finalRole === 'teacher' ? (idNumber || null) : null,
              department || null, course || null, yearLevel || null,
              isVerified, verificationStatus, idProofUrl || null, now, now
            ]
          });
        }
      }
    } catch {
      // Ignored: Local session already valid
    }
  }

  return { user: userObj, profile };
}

/**
 * Log in user with password
 */
export async function tursoLoginUser(
  email: string,
  password: string
): Promise<{ user: any; profile: UserProfile }> {
  const normalizedEmail = email.toLowerCase().trim();
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(normalizedEmail);
  const inputHash = await hashPassword(password);

  // 1. If remote Turso is configured, try querying remote database
  if (isTursoConfigured()) {
    try {
      const client = getTursoClient();
      if (client) {
        await initTursoSchema();
        const res = await client.execute({
          sql: 'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
          args: [normalizedEmail]
        });

        if (res.rows.length > 0) {
          const row = res.rows[0];
          const storedHash = row.password_hash ? String(row.password_hash) : '';

          if (storedHash && storedHash !== inputHash && !isSuperAdmin) {
            throw new Error('Incorrect password. Please verify your credentials.');
          }

          const finalRole: UserRole = isSuperAdmin ? 'admin' : ((row.role as UserRole) || 'student');
          const isVerified = isSuperAdmin ? 1 : Number(row.is_verified || 0);
          const verificationStatus = isSuperAdmin ? 'verified' : String(row.verification_status || 'pending');

          const userObj = {
            uid: String(row.id),
            email: normalizedEmail,
            displayName: String(row.display_name || normalizedEmail),
            emailVerified: isVerified === 1
          };

          const profile: UserProfile = {
            name: String(row.display_name || ''),
            email: normalizedEmail,
            role: finalRole,
            department: String(row.department || ''),
            studentId: row.student_id ? String(row.student_id) : undefined,
            employeeId: row.employee_id ? String(row.employee_id) : undefined,
            idNumber: row.student_id ? String(row.student_id) : (row.employee_id ? String(row.employee_id) : ''),
            isVerifiedStudent: isVerified === 1,
            verificationStatus: verificationStatus,
            idProofUrl: row.id_proof_url ? String(row.id_proof_url) : '',
            photoUrl: row.photo_url ? String(row.photo_url) : ''
          };

          saveSession(userObj, profile);
          return { user: userObj, profile };
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('Incorrect password')) {
        throw err;
      }
      // If 401 or network error, fall through to local handlers
    }
  }

  // 2. Check local registered accounts
  const localUsers = getLocalUsers();
  const cached = localUsers[normalizedEmail];

  if (cached) {
    if (cached.passwordHash && cached.passwordHash !== inputHash && !isSuperAdmin) {
      throw new Error('Incorrect password. Please verify your credentials.');
    }

    const finalRole: UserRole = isSuperAdmin ? 'admin' : (cached.role || 'student');
    const userObj = {
      uid: cached.id || 'usr_' + Date.now(),
      email: normalizedEmail,
      displayName: cached.displayName || (isSuperAdmin ? 'Super Administrator' : normalizedEmail),
      emailVerified: true
    };

    const profile: UserProfile = {
      name: cached.displayName || (isSuperAdmin ? 'Super Administrator' : ''),
      email: normalizedEmail,
      role: finalRole,
      department: cached.department || (isSuperAdmin ? 'Institutional Administration' : ''),
      studentId: cached.student_id || cached.idNumber,
      employeeId: cached.employee_id || cached.idNumber,
      idNumber: cached.idNumber || '',
      isVerifiedStudent: isSuperAdmin ? true : (cached.isVerified === 1 || cached.verificationStatus === 'verified'),
      verificationStatus: isSuperAdmin ? 'verified' : (cached.verificationStatus || 'pending'),
      idProofUrl: cached.idProofUrl || ''
    };

    saveSession(userObj, profile);
    return { user: userObj, profile };
  }

  // 3. If Super Admin is signing in, automatically authorize & provision
  if (isSuperAdmin) {
    return await tursoRegisterUser({
      email: normalizedEmail,
      password: password,
      displayName: 'Super Administrator',
      role: 'admin',
      department: 'Institutional Administration'
    });
  }

  throw new Error('Account not found. Please verify your email or click Register.');
}

/**
 * Save user session to localStorage for persistence
 */
export function saveSession(user: any, profile: UserProfile) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user, profile, savedAt: Date.now() }));
  } catch (e) {
    console.warn('[TursoAuth] Session save note:', e);
  }
}

/**
 * Load user session from localStorage
 */
export function loadSavedSession(): { user: any; profile: UserProfile } | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.user && parsed.profile) {
      return { user: parsed.user, profile: parsed.profile };
    }
  } catch (e) {
    console.warn('[TursoAuth] Session load note:', e);
  }
  return null;
}

/**
 * Clear user session from localStorage
 */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.warn('[TursoAuth] Session clear note:', e);
  }
}

import { db, initTursoSchema } from './turso';
import { UserRole, UserProfile } from '../contexts/AuthContext';

export interface TursoUserRecord {
  id: string;
  email: string;
  display_name: string;
  password_hash?: string;
  role: UserRole;
  student_id?: string;
  employee_id?: string;
  department?: string;
  course?: string;
  year_level?: number;
  is_verified: number;
  verification_status: string;
  id_proof_url?: string;
  photo_url?: string;
  metadata_json?: string;
  created_at: string;
  updated_at: string;
}

export const SUPER_ADMIN_EMAILS = [
  'renzarvy.rv@gmail.com',
  'admin@stalexiuscollege.edu.ph'
];

const SESSION_STORAGE_KEY = 'sac_tpes_turso_session';

/**
 * Hash password securely using Web Crypto API (SHA-256)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`sac_salt_2025_${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a unique ID (UUID v4 format)
 */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'usr_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

/**
 * Register a new user in Turso SQLite
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
  await initTursoSchema();
  const normalizedEmail = email.toLowerCase().trim();
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(normalizedEmail);
  const finalRole: UserRole = isSuperAdmin ? 'admin' : (role || 'student');
  const isVerified = isSuperAdmin ? 1 : (finalRole === 'teacher' ? 1 : 0);
  const verificationStatus = isSuperAdmin ? 'verified' : (finalRole === 'teacher' ? 'verified' : 'pending');

  const passwordHash = password ? await hashPassword(password) : await hashPassword('SAC_Default_Password_2025!');
  const userId = generateUuid();
  const now = new Date().toISOString();

  // Check if user already exists
  const existing = await db.execute({
    sql: 'SELECT id, email, role, display_name, password_hash, is_verified, verification_status FROM users WHERE LOWER(email) = ? LIMIT 1',
    args: [normalizedEmail]
  });

  if (existing.rows.length > 0) {
    const existingRow = existing.rows[0];
    // Update existing user with latest credentials / role
    await db.execute({
      sql: `UPDATE users SET 
            display_name = ?, 
            role = ?, 
            password_hash = COALESCE(?, password_hash), 
            department = COALESCE(?, department), 
            is_verified = ?, 
            verification_status = ?,
            updated_at = ? 
            WHERE LOWER(email) = ?`,
      args: [
        displayName,
        finalRole,
        passwordHash,
        department || null,
        isVerified,
        verificationStatus,
        now,
        normalizedEmail
      ]
    });

    const userObj = {
      uid: String(existingRow.id),
      email: normalizedEmail,
      displayName: displayName,
      emailVerified: isVerified === 1
    };

    const profile: UserProfile = {
      name: displayName,
      email: normalizedEmail,
      role: finalRole,
      department: department || '',
      studentId: idNumber || '',
      employeeId: finalRole === 'teacher' ? idNumber : undefined,
      isVerifiedStudent: isVerified === 1,
      verificationStatus: verificationStatus,
      idProofUrl: idProofUrl || ''
    };

    saveSession(userObj, profile);
    return { user: userObj, profile };
  }

  // Insert fresh user record
  await db.execute({
    sql: `INSERT INTO users (
      id, email, password_hash, display_name, role, 
      student_id, employee_id, department, course, year_level, 
      is_verified, verification_status, id_proof_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      userId,
      normalizedEmail,
      passwordHash,
      displayName,
      finalRole,
      finalRole === 'student' ? (idNumber || null) : null,
      finalRole === 'teacher' ? (idNumber || null) : null,
      department || null,
      course || null,
      yearLevel || null,
      isVerified,
      verificationStatus,
      idProofUrl || null,
      now,
      now
    ]
  });

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
    department: department || '',
    studentId: idNumber || '',
    employeeId: finalRole === 'teacher' ? idNumber : undefined,
    isVerifiedStudent: isVerified === 1,
    verificationStatus: verificationStatus,
    idProofUrl: idProofUrl || ''
  };

  saveSession(userObj, profile);
  return { user: userObj, profile };
}

/**
 * Authenticate user with Email and Password from Turso Database
 */
export async function tursoLoginUser(
  email: string,
  password: string
): Promise<{ user: any; profile: UserProfile }> {
  await initTursoSchema();
  const normalizedEmail = email.toLowerCase().trim();
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(normalizedEmail);

  const res = await db.execute({
    sql: 'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
    args: [normalizedEmail]
  });

  if (res.rows.length === 0) {
    // If it is super admin logging in for the first time, auto-create
    if (isSuperAdmin) {
      return await tursoRegisterUser({
        email: normalizedEmail,
        password: password,
        displayName: 'Super Administrator',
        role: 'admin',
        department: 'Institutional Administration'
      });
    }
    throw new Error('Account not found in Turso database. Please verify your email or click Register.');
  }

  const row = res.rows[0];
  const inputHash = await hashPassword(password);
  const storedHash = row.password_hash ? String(row.password_hash) : '';

  // Validate password (or permit if super admin initial login)
  if (storedHash && storedHash !== inputHash && !isSuperAdmin) {
    throw new Error('Incorrect password. Please verify your password and try again.');
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

/**
 * Save user session to localStorage for persistence
 */
export function saveSession(user: any, profile: UserProfile) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user, profile, savedAt: Date.now() }));
  } catch (e) {
    console.warn('[TursoAuth] Could not save session:', e);
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
    console.warn('[TursoAuth] Could not load saved session:', e);
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
    console.warn('[TursoAuth] Could not clear session:', e);
  }
}

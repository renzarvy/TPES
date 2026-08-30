import { createClient, Client } from '@libsql/client/web';

const databaseUrl = (import.meta.env.VITE_TURSO_DATABASE_URL || '').trim();
const authToken = (import.meta.env.VITE_TURSO_AUTH_TOKEN || '').trim();

export const isTursoConfigured = (): boolean => {
  return Boolean(databaseUrl && authToken && authToken.length > 20);
};

let clientInstance: Client | null = null;

export const getTursoClient = (): Client | null => {
  if (!isTursoConfigured()) {
    return null;
  }
  if (!clientInstance) {
    try {
      clientInstance = createClient({
        url: databaseUrl,
        authToken: authToken,
      });
    } catch {
      clientInstance = null;
    }
  }
  return clientInstance;
};

export const db = {
  execute: async (stmt: any) => {
    const client = getTursoClient();
    if (!client) {
      // Fallback empty result when not connected to remote token
      return { rows: [], columns: [] };
    }
    return await client.execute(stmt);
  }
};

let isInitialized = false;

/**
 * Ensures all required tables and indexes exist in Turso SQLite database when token is present.
 */
export async function initTursoSchema(): Promise<void> {
  if (isInitialized || !isTursoConfigured()) return;

  const client = getTursoClient();
  if (!client) return;

  try {
    // 1. Users Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
        student_id TEXT,
        employee_id TEXT,
        department TEXT,
        course TEXT,
        year_level INTEGER,
        is_verified INTEGER NOT NULL DEFAULT 0,
        verification_status TEXT DEFAULT 'pending',
        id_proof_url TEXT,
        photo_url TEXT,
        metadata_json TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // 2. Teachers Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        department TEXT NOT NULL,
        academic_rank TEXT DEFAULT 'Instructor I',
        employment_status TEXT DEFAULT 'Full-Time',
        avatar TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        subjects_taught_json TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // 3. Questionnaires Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS questionnaires (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        academic_year TEXT NOT NULL,
        semester TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        criteria_categories_json TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // 4. Evaluations Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        teacher_id TEXT NOT NULL,
        questionnaire_id TEXT,
        subject_code TEXT NOT NULL,
        subject_title TEXT,
        academic_year TEXT NOT NULL,
        semester TEXT NOT NULL,
        overall_score REAL NOT NULL,
        category_scores_json TEXT NOT NULL,
        ratings_detail_json TEXT NOT NULL,
        qualitative_feedback TEXT,
        sentiment_label TEXT,
        is_anonymous INTEGER NOT NULL DEFAULT 1,
        is_synced INTEGER NOT NULL DEFAULT 1,
        submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // 5. System Settings Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        description TEXT,
        updated_by TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // 6. Audit Logs Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        user_email TEXT,
        user_role TEXT,
        action TEXT NOT NULL,
        category TEXT NOT NULL,
        details TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    isInitialized = true;
  } catch (error: any) {
    // Suppress 401 unhandled rejections
    if (!error?.message?.includes('401') && error?.status !== 401) {
      console.warn('[Turso Init Notice]:', error?.message || error);
    }
  }
}

initTursoSchema().catch(() => {});

export default db;

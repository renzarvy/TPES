-- ============================================================================
-- St. Alexius College - Teacher's Performance Evaluation System (TPES)
-- Database: Turso (libSQL / SQLite)
-- Schema Definition: schema.sql
-- ============================================================================

-- 1. Users Table (Students, Faculty, and System Administrators)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    student_id TEXT,
    employee_id TEXT,
    department TEXT,
    course TEXT,
    year_level INTEGER,
    is_verified INTEGER NOT NULL DEFAULT 0,
    photo_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- 2. Teachers / Faculty Table
CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_teachers_department ON teachers(department);
CREATE INDEX IF NOT EXISTS idx_teachers_is_active ON teachers(is_active);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);

-- 3. Questionnaires & Evaluation Criteria Rubrics Table
CREATE TABLE IF NOT EXISTS questionnaires (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    academic_year TEXT NOT NULL,
    semester TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    criteria_categories_json TEXT NOT NULL,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_questionnaires_active ON questionnaires(is_active);
CREATE INDEX IF NOT EXISTS idx_questionnaires_term ON questionnaires(academic_year, semester);

-- 4. Completed Evaluations Table
CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    questionnaire_id TEXT REFERENCES questionnaires(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_evaluations_teacher ON evaluations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_student ON evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_term ON evaluations(academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_evaluations_subject ON evaluations(subject_code);

-- 5. System Configuration & Academic Term Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    description TEXT,
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Centralized Security & Activity Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('auth', 'evaluation', 'management', 'system', 'security', 'database')),
    details TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

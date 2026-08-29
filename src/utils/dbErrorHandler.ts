import { db } from '../lib/turso';
import { logActivity } from '../lib/activityLogger';

export interface DbErrorContext {
  operation?: string;
  table?: string;
  query?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

export interface DbErrorInfo {
  id: string;
  message: string;
  userFriendlyMessage: string;
  code?: string;
  operation: string;
  table?: string;
  timestamp: string;
  rawError: unknown;
}

/**
 * Parses raw database/libSQL error and returns a human-readable message and error code.
 */
function parseDbError(error: unknown): { message: string; userMessage: string; code?: string } {
  let message = 'An unexpected database error occurred.';
  let userMessage = 'Unable to complete database operation. Please try again or contact support.';
  let code: string | undefined = undefined;

  if (error instanceof Error) {
    message = error.message;

    // Check for common SQLite / libSQL error patterns
    if (message.includes('UNIQUE constraint failed')) {
      code = 'SQLITE_CONSTRAINT_UNIQUE';
      userMessage = 'A record with this information already exists in the system.';
    } else if (message.includes('FOREIGN KEY constraint failed')) {
      code = 'SQLITE_CONSTRAINT_FOREIGNKEY';
      userMessage = 'Referenced academic record or user does not exist.';
    } else if (message.includes('NOT NULL constraint failed')) {
      code = 'SQLITE_CONSTRAINT_NOTNULL';
      userMessage = 'Required field is missing or empty.';
    } else if (message.includes('no such table')) {
      code = 'SQLITE_ERROR_NOSUCHTABLE';
      userMessage = 'Database table is temporarily unavailable. Please run schema setup.';
    } else if (message.includes('timeout') || message.includes('network') || message.includes('Failed to fetch')) {
      code = 'LIBSQL_NETWORK_TIMEOUT';
      userMessage = 'Connection to the database timed out. Please check your network connectivity.';
    } else if (message.includes('syntax error')) {
      code = 'SQLITE_SYNTAX_ERROR';
      userMessage = 'Database query format is invalid.';
    } else {
      userMessage = message;
    }
  } else if (typeof error === 'string') {
    message = error;
    userMessage = error;
  }

  return { message, userMessage, code };
}

/**
 * Records database errors into the AuditLogs / audit_logs table and activity stream.
 */
export async function logErrorToAuditLogs(errorInfo: DbErrorInfo, context?: DbErrorContext): Promise<void> {
  try {
    const logId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    // 1. Try to record into Turso libSQL audit_logs / AuditLogs table
    try {
      if (db && typeof db.execute === 'function') {
        await db.execute({
          sql: `INSERT INTO audit_logs (id, user_id, user_email, user_role, action, category, details, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            logId,
            context?.userId || 'SYSTEM',
            context?.userEmail || 'system@stalexiuscollege.edu.ph',
            context?.userRole || 'admin',
            `DB_ERROR_${errorInfo.operation.toUpperCase()}`,
            'database',
            JSON.stringify({
              code: errorInfo.code,
              message: errorInfo.message,
              table: errorInfo.table || context?.table,
              query: context?.query ? context.query.substring(0, 200) : undefined,
            }),
            nowIso,
          ],
        });
      }
    } catch (tursoErr) {
      console.warn('Unable to write error log to Turso audit_logs table:', tursoErr);
    }

    // 2. Also log to centralized activity logger for UI visibility in Admin Audit Logs
    await logActivity({
      action: 'SETTINGS_UPDATE',
      entity: 'SETTINGS',
      details: `[Database Warning] ${errorInfo.operation}: ${errorInfo.message}`,
      performedBy: context?.userEmail || 'System Watchdog',
      performedByEmail: context?.userEmail || 'system@stalexiuscollege.edu.ph',
      targetId: errorInfo.id,
      targetName: errorInfo.table || 'Database Engine',
    });
  } catch (loggingError) {
    // Fail-safe: error handler must never throw unhandled exceptions
    console.error('Failed to log database error to audit table:', loggingError);
  }
}

/**
 * Centralized Database Error Handler for libSQL / Turso queries across the application.
 */
export function handleDbError(error: unknown, context?: DbErrorContext): DbErrorInfo {
  const { message, userMessage, code } = parseDbError(error);
  const errorId = `dberr_${Date.now()}`;
  const operation = context?.operation || 'EXECUTE_QUERY';

  const errorInfo: DbErrorInfo = {
    id: errorId,
    message,
    userFriendlyMessage: userMessage,
    code,
    operation,
    table: context?.table,
    timestamp: new Date().toISOString(),
    rawError: error,
  };

  console.error(`[Database Error] [${operation}] ${message}`, {
    context,
    code,
    error,
  });

  // Asynchronously log to audit logs without blocking the UI flow
  logErrorToAuditLogs(errorInfo, context).catch((e) =>
    console.warn('Background audit error log failed:', e)
  );

  return errorInfo;
}

/**
 * Helper to safely wrap database calls with automatic error logging and formatting.
 */
export async function withDbErrorHandling<T>(
  fn: () => Promise<T>,
  fallbackValue?: T,
  context?: DbErrorContext
): Promise<{ data: T | null; error: DbErrorInfo | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    const errorInfo = handleDbError(err, context);
    return {
      data: fallbackValue !== undefined ? fallbackValue : null,
      error: errorInfo,
    };
  }
}

import { db, getTursoClient } from './turso';
import { logActivity } from './activityLogger';

export interface DbErrorState {
  hasError: boolean;
  title: string;
  userMessage: string;
  technicalMessage: string;
  isConnectivityIssue: boolean;
  isPermissionIssue: boolean;
  timestamp: string;
}

export interface ErrorContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  actionContext?: string;
}

/**
 * Handles and categorizes libSQL / Turso database errors, logs them to the
 * Turso/Firestore audit_logs table, and returns a clean, user-friendly state.
 */
export async function handleDbError(
  error: unknown,
  context: string = 'Database Operation',
  userContext?: ErrorContext
): Promise<DbErrorState> {
  const errorObj = error as any;
  const rawMsg = errorObj?.message || errorObj?.code || String(error);
  const lower = rawMsg.toLowerCase();

  const isConnectivity =
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('econnrefused') ||
    lower.includes('connection') ||
    lower.includes('timeout') ||
    lower.includes('offline') ||
    lower.includes('503') ||
    lower.includes('504');

  const isPermission =
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('permission') ||
    lower.includes('auth') ||
    lower.includes('401') ||
    lower.includes('403');

  let title = 'Database Notice';
  let userMessage = `An unexpected issue occurred while executing: ${context}.`;

  if (isConnectivity) {
    title = 'Cloud Database Connection Alert';
    userMessage =
      'Unable to establish a real-time connection with the Turso database. Data is locally safeguarded while connectivity recovers.';
  } else if (isPermission) {
    title = 'Access Verification Required';
    userMessage = `Your current security clearance does not allow this operation (${context}).`;
  } else if (lower.includes('unique constraint') || lower.includes('already exists')) {
    title = 'Duplicate Record Warning';
    userMessage = 'A record with these unique details already exists in the institutional database.';
  }

  const errorState: DbErrorState = {
    hasError: true,
    title,
    userMessage,
    technicalMessage: rawMsg,
    isConnectivityIssue: isConnectivity,
    isPermissionIssue: isPermission,
    timestamp: new Date().toISOString(),
  };

  // Log error event to Turso audit_logs table
  try {
    const client = getTursoClient();
    const logId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const action = isConnectivity
      ? 'TURSO_CONNECTIVITY_ERROR'
      : isPermission
      ? 'TURSO_AUTH_PERMISSION_ERROR'
      : 'TURSO_QUERY_ERROR';

    const details = `[Context: ${context}] ${rawMsg.slice(0, 350)}`;

    await client.execute({
      sql: `INSERT INTO audit_logs (id, user_id, user_email, user_role, action, category, details, timestamp)
            VALUES (?, ?, ?, ?, ?, 'database', ?, datetime('now'))`,
      args: [
        logId,
        userContext?.userId || 'system',
        userContext?.userEmail || 'system@stalexiuscollege.edu.ph',
        userContext?.userRole || 'system',
        action,
        details,
      ],
    });
  } catch (tursoLogErr) {
    console.warn('[dbErrorHandler] Turso direct audit logging failed, falling back to secondary logger:', tursoLogErr);
    // Fallback to secondary logger (Firestore + localStorage)
    try {
      await logActivity({
        action: 'UPDATE' as any,
        entity: 'System' as any,
        details: `[Turso Error Fallback] [Context: ${context}] ${rawMsg.slice(0, 300)}`,
        performedBy: userContext?.userId || 'System',
        performedByEmail: userContext?.userEmail || 'system@stalexiuscollege.edu.ph',
      });
    } catch {}
  }

  console.error(`[dbErrorHandler] ${context} failure:`, error);
  return errorState;
}

/**
 * Higher-order utility to wrap Turso / libSQL query operations with automatic error handling.
 */
export async function executeWithDbErrorHandling<T>(
  queryFn: () => Promise<T>,
  context: string,
  userContext?: ErrorContext,
  fallbackValue?: T
): Promise<{ data: T | null; error: DbErrorState | null }> {
  try {
    const data = await queryFn();
    return { data, error: null };
  } catch (err) {
    const errorState = await handleDbError(err, context, userContext);
    return {
      data: fallbackValue !== undefined ? fallbackValue : null,
      error: errorState,
    };
  }
}

export default handleDbError;

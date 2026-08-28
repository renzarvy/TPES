import { createClient, Client } from '@libsql/client/web';

// Resolve Turso Database URL and Auth Token from environment variables
const TURSO_URL =
  import.meta.env.VITE_TURSO_DATABASE_URL ||
  'libsql://stalexius-tpes-sade.aws-ap-northeast-1.turso.io';

const TURSO_AUTH_TOKEN =
  import.meta.env.VITE_TURSO_AUTH_TOKEN || '';

/**
 * Singleton database connection instance for Turso (libSQL).
 */
let tursoInstance: Client | null = null;

/**
 * Returns the singleton libSQL Client instance, initializing it if not already created.
 */
export function getTursoClient(): Client {
  if (!tursoInstance) {
    tursoInstance = createClient({
      url: TURSO_URL,
      authToken: TURSO_AUTH_TOKEN || undefined,
    });
  }
  return tursoInstance;
}

/**
 * Ready-to-use singleton database connection exported for direct querying.
 * Usage:
 *   import { db } from '../lib/turso';
 *   const result = await db.execute('SELECT * FROM users');
 */
export const db: Client = new Proxy({} as Client, {
  get(_target, prop) {
    const client = getTursoClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export default db;

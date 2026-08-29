import { createClient, Client } from '@libsql/client/web';

const databaseUrl = import.meta.env.VITE_TURSO_DATABASE_URL || 'libsql://stalexius-tpes-sade.aws-ap-northeast-1.turso.io';
const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN || '';

/**
 * Singleton database connection instance for Turso (libSQL).
 */
export const db: Client = createClient({
  url: databaseUrl,
  authToken: authToken || undefined,
});

export const getTursoClient = (): Client => db;

export default db;


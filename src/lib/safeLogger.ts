/**
 * Safe Logger Utility for Development & Production
 * Sanitizes and masks sensitive credentials, tokens, passwords, and API keys
 * before logging to the console to prevent accidental credential leakage during debugging.
 */

// Key names that should be automatically redacted / masked
const SENSITIVE_KEY_REGEX = /^(?:api_?key|auth(?:_?token)?|access_?token|refresh_?token|secret|password|passwd|private_?key|credentials?|database_?url|service_?account|session_?token|bearer|jwt|pin|cvv|authorization)$/i;

// Substrings within keys that suggest sensitive content
const SENSITIVE_KEY_PARTIAL = /(?:api[_-]?key|secret|token|password|credential|private[_-]?key|auth)/i;

// Regex patterns to detect raw secrets embedded inside arbitrary strings
const INLINE_SECRET_PATTERNS = [
  // Google / Firebase API Keys
  {
    regex: /AIzaSy[A-Za-z0-9_-]{33}/g,
    replace: (match: string) => `${match.slice(0, 6)}***${match.slice(-4)}`
  },
  // JWT tokens
  {
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    replace: (match: string) => `${match.slice(0, 8)}...[MASKED_JWT]...${match.slice(-6)}`
  },
  // Bearer Token headers
  {
    regex: /Bearer\s+([A-Za-z0-9._~+/-]+=*)/gi,
    replace: (_match: string, token: string) => `Bearer ${token.length > 8 ? `${token.slice(0, 3)}***${token.slice(-3)}` : '***'}`
  },
  // Turso / libSQL DB URLs with credentials
  {
    regex: /libsql:\/\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9.-]+\.turso\.io/g,
    replace: (_match: string) => `libsql://[PROTECTED_TURSO_HOST].turso.io`
  },
  // Generic database URLs with user:password
  {
    regex: /((?:postgres|mysql|mongodb(?:\+srv)?):\/\/[^:\s]+:)([^@\s]+)(@[^\s]+)/gi,
    replace: (_match: string, prefix: string, _pass: string, suffix: string) => `${prefix}***MASKED_PWD***${suffix}`
  }
];

/**
 * Masks a secret string keeping the first and last few characters for diagnostic context.
 */
export function maskSensitiveValue(val: unknown): string {
  if (val === null || val === undefined) return String(val);
  const str = typeof val === 'string' ? val : JSON.stringify(val);
  if (str.length <= 6) return '******';
  if (str.length <= 12) return `${str.slice(0, 2)}***${str.slice(-2)}`;
  return `${str.slice(0, 4)}***${str.slice(-4)}`;
}

/**
 * Sanitizes a string by replacing known inline secret patterns.
 */
export function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') return str;
  let sanitized = str;
  for (const { regex, replace } of INLINE_SECRET_PATTERNS) {
    sanitized = sanitized.replace(regex, replace);
  }
  return sanitized;
}

/**
 * Recursively deep-sanitizes objects, arrays, and primitives.
 * Handles circular references safely.
 */
export function sanitizeData(data: any, seen: WeakSet<object> = new WeakSet()): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Strings
  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  // Handle Primitives
  if (typeof data !== 'object') {
    return data;
  }

  // Handle Errors
  if (data instanceof Error) {
    const sanitizedError = new Error(sanitizeString(data.message));
    sanitizedError.name = data.name;
    if (data.stack) {
      sanitizedError.stack = sanitizeString(data.stack);
    }
    return sanitizedError;
  }

  // Handle Circular References
  if (seen.has(data)) {
    return '[Circular Reference]';
  }
  seen.add(data);

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, seen));
  }

  // Handle Objects
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    // Check if key is sensitive
    if (SENSITIVE_KEY_REGEX.test(key) || SENSITIVE_KEY_PARTIAL.test(key)) {
      if (typeof value === 'string' || typeof value === 'number') {
        result[key] = maskSensitiveValue(value);
      } else if (value && typeof value === 'object') {
        result[key] = '[MASKED_SENSITIVE_OBJECT]';
      } else {
        result[key] = '***';
      }
    } else {
      result[key] = sanitizeData(value, seen);
    }
  }

  return result;
}

/**
 * Safe Logger instance that wraps standard console logging with automatic data sanitization.
 */
class SafeLogger {
  private isDevelopment = import.meta.env?.DEV ?? true;

  private sanitizeArgs(args: any[]): any[] {
    return args.map(arg => sanitizeData(arg));
  }

  /**
   * Log standard debug/info messages safely
   */
  log(...args: any[]): void {
    console.log(...this.sanitizeArgs(args));
  }

  /**
   * Log informational messages safely
   */
  info(...args: any[]): void {
    console.info(...this.sanitizeArgs(args));
  }

  /**
   * Log warning messages safely
   */
  warn(...args: any[]): void {
    console.warn(...this.sanitizeArgs(args));
  }

  /**
   * Log error messages safely with sanitized stack traces and details
   */
  error(...args: any[]): void {
    console.error(...this.sanitizeArgs(args));
  }

  /**
   * Log verbose debug details safely (active in development)
   */
  debug(...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(...this.sanitizeArgs(args));
    }
  }

  /**
   * Safe table output for tabular data
   */
  table(data: any, properties?: string[]): void {
    if (console.table) {
      console.table(sanitizeData(data), properties);
    } else {
      this.log(data);
    }
  }

  /**
   * Helper to manually sanitize any payload before serialization or external transmission
   */
  sanitize<T>(data: T): T {
    return sanitizeData(data);
  }

  /**
   * Activates global console sanitization interceptor in development
   * ensuring any third-party or legacy console.* calls are automatically masked.
   */
  installGlobalConsoleInterceptor(): void {
    if (typeof window === 'undefined') return;

    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalDebug = console.debug;

    console.log = (...args: any[]) => originalLog.apply(console, this.sanitizeArgs(args));
    console.info = (...args: any[]) => originalInfo.apply(console, this.sanitizeArgs(args));
    console.warn = (...args: any[]) => originalWarn.apply(console, this.sanitizeArgs(args));
    console.error = (...args: any[]) => originalError.apply(console, this.sanitizeArgs(args));
    console.debug = (...args: any[]) => originalDebug.apply(console, this.sanitizeArgs(args));

    this.debug('🔒 [SafeLogger] Global console secret sanitization active.');
  }
}

export const safeLogger = new SafeLogger();
export default safeLogger;

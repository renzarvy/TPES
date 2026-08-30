import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Regex patterns to detect hardcoded API keys, secrets, and database connection strings
const SECRET_DETECTION_RULES = [
  {
    id: 'FIREBASE_GOOGLE_API_KEY',
    name: 'Google / Firebase API Key',
    regex: /AIzaSy[A-Za-z0-9_-]{33}/g,
    description: 'Embedded Google/Firebase client or service API key.',
    hint: 'Use `import.meta.env.VITE_FIREBASE_API_KEY` and define it in your `.env.local` file.'
  },
  {
    id: 'TURSO_DATABASE_URL',
    name: 'Turso / libSQL Database Endpoint',
    regex: /libsql:\/\/[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*\.turso\.io/g,
    description: 'Embedded remote Turso or libSQL database instance URL.',
    hint: 'Use `import.meta.env.VITE_TURSO_DATABASE_URL` and define it in your `.env.local` file.'
  },
  {
    id: 'JWT_AUTH_TOKEN',
    name: 'JSON Web Token (JWT)',
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    description: 'Raw authentication JWT token or Turso auth token.',
    hint: 'Use `import.meta.env.VITE_TURSO_AUTH_TOKEN` and define it in your `.env.local` file.'
  },
  {
    id: 'AWS_ACCESS_KEY',
    name: 'AWS Access Key ID',
    regex: /AKIA[0-9A-Z]{16}/g,
    description: 'Embedded AWS Access Key ID.',
    hint: 'Move credentials to environment variables managed via cloud provider secrets.'
  },
  {
    id: 'STRIPE_SECRET_KEY',
    name: 'Stripe Secret Key',
    regex: /sk_(?:live|test)_[0-9a-zA-Z]{24,}/g,
    description: 'Embedded Stripe secret API key.',
    hint: 'Keep secret keys in server-side environment variables (`process.env.STRIPE_SECRET_KEY`).'
  },
  {
    id: 'OPENAI_API_KEY',
    name: 'OpenAI Secret Key',
    regex: /sk-[A-Za-z0-9]{32,}/g,
    description: 'Embedded OpenAI API secret key.',
    hint: 'Keep API keys in server-side environment variables.'
  },
  {
    id: 'GITHUB_PAT',
    name: 'GitHub Personal Access Token',
    regex: /ghp_[A-Za-z0-9]{36}/g,
    description: 'Embedded GitHub personal access token.',
    hint: 'Store access tokens in server secrets or deployment environment variables.'
  },
  {
    id: 'PRIVATE_KEY_BLOCK',
    name: 'Cryptographic Private Key',
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    description: 'Embedded private cryptographic key block.',
    hint: 'Store private keys in environment variables or a dedicated secrets manager.'
  },
  {
    id: 'DATABASE_URI_WITH_PASSWORD',
    name: 'Database URI with Password',
    regex: /(?:postgres|postgresql|mysql|mongodb(?:\+srv)?):\/\/[^:\s]+:[^@\s]+@[^\s]+/g,
    description: 'Database connection URI containing hardcoded username and password.',
    hint: 'Store database URIs in environment variables.'
  }
];

// File and directory ignore list
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.firebase',
  'coverage',
  '.vercel',
  '.netlify'
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'bun.lock',
  'yarn.lock',
  'pnpm-lock.yaml',
  'tsconfig.tsbuildinfo',
  'scripts/check-secrets.js',
  'scripts/scan-secrets.js',
  'src/lib/safeLogger.ts'
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp',
  '.svg', '.woff', '.woff2', '.ttf', '.eot', '.pdf',
  '.zip', '.tar', '.gz'
]);

// Mask a secret string for safe console logging
function maskSecret(val) {
  if (!val || typeof val !== 'string') return '[REDACTED]';
  if (val.length <= 8) return '****';
  const start = val.slice(0, 4);
  const end = val.slice(-4);
  return `${start}${'*'.repeat(Math.min(val.length - 8, 12))}${end}`;
}

// Recursively find all non-environment source files to scan
function collectSourceFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      files.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile()) {
      // Ignore environment files (.env, .env.local, etc.) - they are protected by .gitignore
      if (entry.name.startsWith('.env')) {
        continue;
      }

      if (IGNORED_FILES.has(relativePath) || IGNORED_FILES.has(entry.name)) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) {
        continue;
      }

      files.push(fullPath);
    }
  }

  return files;
}

function scanFileForSecrets(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Skip empty lines or pure code comments without secret markers
    if (!trimmed) return;

    for (const rule of SECRET_DETECTION_RULES) {
      rule.regex.lastIndex = 0;
      const match = rule.regex.exec(line);
      if (match) {
        violations.push({
          file: relativePath,
          line: lineNum,
          ruleId: rule.id,
          ruleName: rule.name,
          description: rule.description,
          hint: rule.hint,
          matchedText: maskSecret(match[0]),
          codeLine: line.trim()
        });
      }
    }
  });

  return violations;
}

export function checkSecrets() {
  console.log('\x1b[36m%s\x1b[0m', '🔍 [Secrets Check] Scanning codebase for hardcoded API keys & credentials in source files...');

  const files = collectSourceFiles(ROOT_DIR);
  const allViolations = [];

  for (const file of files) {
    const violations = scanFileForSecrets(file);
    if (violations.length > 0) {
      allViolations.push(...violations);
    }
  }

  if (allViolations.length > 0) {
    console.error('\n\x1b[41m\x1b[37m\x1b[1m 🚨 HARDCODED SECRETS DETECTED IN SOURCE CODE! BUILD ABORTED 🚨 \x1b[0m\n');
    console.error('\x1b[31mThe security scanner detected hardcoded credentials in non-environment files:\x1b[0m\n');

    allViolations.forEach((v, index) => {
      console.error(`\x1b[1m[${index + 1}] ${v.file}:${v.line}\x1b[0m`);
      console.error(`    \x1b[33mPattern:\x1b[0m     ${v.ruleName} (${v.ruleId})`);
      console.error(`    \x1b[33mDetected:\x1b[0m    \x1b[31m${v.matchedText}\x1b[0m`);
      console.error(`    \x1b[33mDetails:\x1b[0m     ${v.description}`);
      console.error(`    \x1b[32mFix:\x1b[0m         ${v.hint}\n`);
    });

    console.error('\x1b[31m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
    console.error('\x1b[1m\x1b[31mAction Required:\x1b[0m');
    console.error(' 1. Remove all hardcoded secret values and API keys from the files above.');
    console.error(' 2. Reference values using `import.meta.env.VITE_*` (client) or `process.env.*` (server).');
    console.error(' 3. Place actual secrets in your `.env.local` (local dev) or Netlify/Hosting Environment Settings.');
    console.error(' 4. Ensure `.env.example` contains only empty string placeholders.');
    console.error('\x1b[31m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');

    // Abort the build process
    process.exit(1);
  }

  console.log('\x1b[32m%s\x1b[0m', `✅ [Secrets Check] Clean: Scanned ${files.length} source files. No hardcoded secrets detected.\n`);
  return true;
}

// Execute when run directly via CLI / build hook
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkSecrets();
}

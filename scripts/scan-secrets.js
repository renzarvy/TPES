import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Secret signature patterns for detection
const SECRET_PATTERNS = [
  {
    name: 'Google / Firebase API Key',
    regex: /AIzaSy[A-Za-z0-9_-]{33}/g,
    description: 'Directly embedded Google/Firebase API Key'
  },
  {
    name: 'Turso / libSQL Database Instance URL',
    regex: /libsql:\/\/[a-zA-Z0-9_-]+\.aws-[a-z0-9-]+\.turso\.io/g,
    description: 'Hardcoded remote Turso database instance URL'
  },
  {
    name: 'Generic libSQL Host URL',
    regex: /libsql:\/\/[a-zA-Z0-9_-]{3,}\.turso\.io/g,
    description: 'Hardcoded Turso connection endpoint'
  },
  {
    name: 'JSON Web Token (JWT)',
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    description: 'Raw JWT Auth Token'
  },
  {
    name: 'Private Key Block',
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    description: 'Embedded cryptographic private key'
  },
  {
    name: 'Stripe Live Secret Key',
    regex: /sk_live_[0-9a-zA-Z]{24,}/g,
    description: 'Production Stripe secret key'
  },
  {
    name: 'OpenAI API Key',
    regex: /sk-[A-Za-z0-9]{32,}/g,
    description: 'OpenAI service secret key'
  },
  {
    name: 'GitHub Personal Access Token',
    regex: /ghp_[A-Za-z0-9]{36}/g,
    description: 'GitHub personal access token'
  },
  {
    name: 'Database URI with Password',
    regex: /(?:postgres|postgresql|mysql|mongodb(?:\+srv)?):\/\/[^:\s]+:[^@\s]+@[^\s]+/g,
    description: 'Database connection string containing embedded password credentials'
  }
];

// Mask a secret string for safe console logging
function maskSecret(val) {
  if (!val || typeof val !== 'string') return '[MASKED]';
  if (val.length <= 8) return '****';
  const start = val.slice(0, 4);
  const end = val.slice(-4);
  return `${start}${'*'.repeat(Math.min(val.length - 8, 12))}${end}`;
}

// Find all env and config files to check
function getTargetFiles(dir) {
  const targets = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', '.firebase', 'build'].includes(entry.name)) {
        continue;
      }
      targets.push(...getTargetFiles(fullPath));
    } else if (entry.isFile()) {
      // Check .env files and template env files
      if (
        entry.name.startsWith('.env') ||
        entry.name === 'firebase-applet-config.json'
      ) {
        targets.push(fullPath);
      }
    }
  }

  return targets;
}

function scanFile(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Skip empty lines or pure comments (unless comment contains a live credential)
    if (!trimmed || (trimmed.startsWith('#') && !trimmed.includes('AIzaSy'))) {
      return;
    }

    // Check against patterns
    for (const pattern of SECRET_PATTERNS) {
      pattern.regex.lastIndex = 0; // reset regex state
      const match = pattern.regex.exec(line);
      if (match) {
        // In .env.example, empty assignments like KEY="" are fine
        if (trimmed.endsWith('=""') || trimmed.endsWith("=''") || trimmed.endsWith('=')) {
          continue;
        }

        issues.push({
          file: relativePath,
          line: lineNum,
          rule: pattern.name,
          description: pattern.description,
          matchedSnippet: maskSecret(match[0])
        });
      }
    }

    // Check for non-empty assignments in .env.example
    if (relativePath === '.env.example') {
      const matchEnv = line.match(/^([A-Z0-9_]+)\s*=\s*(.+)$/);
      if (matchEnv) {
        const key = matchEnv[1];
        const rawVal = matchEnv[2].trim().replace(/^["']|["']$/g, '');
        // If it's a sensitive key with an actual value in .env.example
        const isSensitiveKey = /(?:KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL|AUTH|CREDENTIAL)/i.test(key);
        if (isSensitiveKey && rawVal && rawVal.length > 0) {
          issues.push({
            file: relativePath,
            line: lineNum,
            rule: 'Hardcoded Secret in .env.example template',
            description: `Variable '${key}' has hardcoded value in template. Template files must use empty string values.`,
            matchedSnippet: `${key}="${maskSecret(rawVal)}"`
          });
        }
      }
    }
  });

  return issues;
}

export function runSecretScan() {
  console.log('\x1b[36m%s\x1b[0m', '🔍 [Pre-Build Security Scan] Scanning environment files for exposed secrets...');
  
  const files = getTargetFiles(ROOT_DIR);
  let totalIssues = 0;

  for (const file of files) {
    const issues = scanFile(file);
    if (issues.length > 0) {
      totalIssues += issues.length;
      console.log(`\n\x1b[33m⚠️  [WARNING] Potential secret detected in ${path.relative(ROOT_DIR, file)}:\x1b[0m`);
      issues.forEach(issue => {
        console.log(`   - Line ${issue.line}: \x1b[1m${issue.rule}\x1b[0m`);
        console.log(`     Details: ${issue.description}`);
        console.log(`     Sample:  \x1b[31m${issue.matchedSnippet}\x1b[0m`);
      });
    }
  }

  if (totalIssues > 0) {
    console.log('\n\x1b[33m%s\x1b[0m', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\x1b[33m%s\x1b[0m', `⚠️  Found ${totalIssues} potential exposed secret(s) in project environment/template files.`);
    console.log('\x1b[33m%s\x1b[0m', '👉 Please ensure all real credentials are provided via the Settings / Secrets');
    console.log('\x1b[33m%s\x1b[0m', '   manager or loaded dynamically at runtime rather than committed to templates.');
    console.log('\x1b[33m%s\x1b[0m', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } else {
    console.log('\x1b[32m%s\x1b[0m', '✅ [Pre-Build Security Scan] Clean: No hardcoded secrets found in environment templates.\n');
  }

  return totalIssues;
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSecretScan();
}

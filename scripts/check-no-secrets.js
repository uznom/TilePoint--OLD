import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Burned secret literals that must NEVER appear anywhere in the codebase
const BURNED_LITERALS = [
  'TilePointEnterpriseSecPass2026!',
  'TilePointSecretKey'
];

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.gemini',
  '.agents'
]);

const IGNORE_FILES = new Set([
  'check-no-secrets.js'
]);

const violations = [];

function scanDirectory(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      if (IGNORE_FILES.has(entry.name)) continue;
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          for (const burned of BURNED_LITERALS) {
            if (line.includes(burned)) {
              violations.push({
                file: path.relative(rootDir, fullPath),
                line: index + 1,
                burned,
                snippet: line.trim()
              });
            }
          }
        });
      } catch (_) {
        // Ignore unreadable or binary files
      }
    }
  }
}

console.log('[Security Audit] Scanning codebase for burned secret literals...');
scanDirectory(rootDir);

if (violations.length > 0) {
  console.error('\n=============================================================');
  console.error(' [FATAL SECURITY ERROR] Burned secret literals detected in source:');
  console.error('=============================================================');
  violations.forEach(v => {
    console.error(`  --> ${v.file}:${v.line}`);
    console.error(`      Burned Literal: "${v.burned}"`);
    console.error(`      Snippet: ${v.snippet}\n`);
  });
  console.error('Build/Test failed. Refusing to allow burned secrets in the codebase.');
  console.error('=============================================================\n');
  process.exit(1);
} else {
  console.log('[Security Audit] PASSED: No burned secret literals found.');
  process.exit(0);
}

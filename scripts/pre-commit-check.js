import { execSync } from 'child_process';

console.log('[Pre-Commit Security Gate] Validating staged files against prohibited patterns (*.db*, *.zip)...');

try {
  const staged = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
    .split(/\r?\n/)
    .map(f => f.trim())
    .filter(Boolean);

  const prohibitedPatterns = [
    /\.db($|\.|\-|_)/i,
    /\.zip$/i
  ];

  const violations = staged.filter(file => prohibitedPatterns.some(pattern => pattern.test(file)));

  if (violations.length > 0) {
    console.error('\n======================================================================');
    console.error(' [SECURITY VIOLATION] PRE-COMMIT HOOK REJECTED COMMIT');
    console.error(' Prohibited database binary (*.db*) or archive (*.zip) files detected:');
    violations.forEach(v => console.error(`   - ${v}`));
    console.error('\n Database binary files (*.db*) and zip archives (*.zip) must NEVER be committed to Git.');
    console.error(' Run "git reset HEAD <file>" to unstage these files before committing.');
    console.error('======================================================================\n');
    process.exit(1);
  }

  console.log('[Pre-Commit Security Gate] PASSED: No prohibited files staged for commit.\n');
} catch (err) {
  if (err.status) process.exit(err.status);
  console.error('[Pre-Commit Check Error]', err.message);
  process.exit(1);
}

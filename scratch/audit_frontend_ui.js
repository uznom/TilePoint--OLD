import fs from 'fs';
import path from 'path';

function walk(dir) {
  let files = [];
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      files = files.concat(walk(p));
    } else if (f.endsWith('.tsx')) {
      files.push(p);
    }
  });
  return files;
}

const files = walk('src/components');
const byFile = {};

files.forEach(file => {
  const rel = file.replace(process.cwd() + path.sep, '');
  if (rel.includes('common/ui/')) return;

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    if (line.includes('createPortal(')) {
      byFile[rel] = (byFile[rel] || 0) + 1;
      console.log(`${rel}:${idx + 1} -> ${line.trim()}`);
    }
  });
});

console.log('\nRemaining files with createPortal call:', byFile);

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const branchPath = path.join(__dirname, '..', 'src', 'components', 'BranchModule.tsx');
let lines = fs.readFileSync(branchPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

// 1. Fix line 2060
const m1CloseIdx = lines.findIndex(l => l.includes('{/* CUSTOM HEROUI ALERT DIALOG'));
if (m1CloseIdx >= 0) {
  lines[m1CloseIdx - 3] = '    </form>';
  lines[m1CloseIdx - 2] = '  </HeroModal>';
  lines.splice(m1CloseIdx - 1, 1);
}

// 2. Remove stray >
const strayIdx = lines.findIndex(l => l.trim() === '>');
if (strayIdx >= 0) {
  lines.splice(strayIdx, 1);
}

fs.writeFileSync(branchPath, lines.join('\n'), 'utf8');
console.log('Fixed BranchModule lines cleanly!');

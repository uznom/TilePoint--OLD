import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transPath = path.join(__dirname, '..', 'src', 'components', 'TransmittalModule.tsx');
let lines = fs.readFileSync(transPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

// 1. Fix Modal 1 close (line 1468)
const m1CloseIdx = lines.findIndex(l => l.includes('{/* MODAL 2: Inspect Payload contents details'));
if (m1CloseIdx >= 0) {
  // Line before m1CloseIdx is </HeroModal>, and line before that is </div>,
  if (lines[m1CloseIdx - 3].trim() === '</div>,') {
    lines.splice(m1CloseIdx - 3, 1);
    console.log('Removed </div>, from Modal 1');
  }
}

// 2. Fix Modal 2 close (before EXCLUSIVELY FOR PHYSICAL PRINT)
const printStartIdx = lines.findIndex(l => l.includes('{/* EXCLUSIVELY FOR PHYSICAL PRINT'));
if (printStartIdx >= 0) {
  // Lines printStartIdx - 5 to printStartIdx - 2 are </div>\n</div>\n</div>,\ndocument.body\n)}
  lines[printStartIdx - 5] = '    </HeroModal>';
  lines[printStartIdx - 4] = '  )}';
  lines.splice(printStartIdx - 3, 3);
  console.log('Fixed Modal 2 closing tags');
}

// 3. Fix Modal 3 close (before Success toast alert bar)
const toastIdx = lines.findIndex(l => l.includes('{/* Success toast alert bar */}'));
if (toastIdx >= 0) {
  if (lines[toastIdx - 3].trim() === '</div>') {
    lines.splice(toastIdx - 3, 1);
    console.log('Removed extra </div> from Modal 3');
  }
}

fs.writeFileSync(transPath, lines.join('\n'), 'utf8');
console.log('TransmittalModule.tsx cleaned!');

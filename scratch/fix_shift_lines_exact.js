import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const shiftPath = path.join(__dirname, '..', 'src', 'components', 'ShiftModule.tsx');
let lines = fs.readFileSync(shiftPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

// Find lines containing </HeroModal>
const modalCloseIndices = [];
lines.forEach((l, idx) => {
  if (l.includes('</HeroModal>')) {
    modalCloseIndices.push(idx);
  }
});

console.log('HeroModal close indices:', modalCloseIndices);

// Remove the line right before each </HeroModal> if it is </div>
for (let i = modalCloseIndices.length - 1; i >= 0; i--) {
  const closeIdx = modalCloseIndices[i];
  if (lines[closeIdx - 1].trim() === '</div>') {
    lines.splice(closeIdx - 1, 1);
    console.log('Removed extra </div> before </HeroModal> at index', closeIdx);
  }
}

fs.writeFileSync(shiftPath, lines.join('\n'), 'utf8');
console.log('ShiftModule.tsx cleaned!');

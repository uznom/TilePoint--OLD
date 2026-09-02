import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transPath = path.join(__dirname, '..', 'src', 'components', 'TransmittalModule.tsx');
let lines = fs.readFileSync(transPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

const modal2Close = lines.findIndex((l, idx) => idx > 1750 && l.includes('</HeroModal>'));
console.log('Modal 2 close index:', modal2Close);
if (modal2Close >= 0 && lines[modal2Close - 1].trim() === '</div>') {
  lines.splice(modal2Close - 1, 1);
  console.log('Removed extra </div> before Modal 2 close');
}

fs.writeFileSync(transPath, lines.join('\n'), 'utf8');
console.log('TransmittalModule.tsx fixed!');

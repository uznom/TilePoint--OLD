import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const privPath = path.join(__dirname, '..', 'src', 'components', 'PrivacyAccessibilityHub.tsx');
let lines = fs.readFileSync(privPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

const lastModalCloseIdx = lines.findIndex((l, idx) => idx > 3300 && l.includes('</HeroModal>'));
console.log('Last modal close index:', lastModalCloseIdx);

lines.splice(lastModalCloseIdx, 0, '  </div>');

fs.writeFileSync(privPath, lines.join('\n'), 'utf8');
console.log('Inserted div before last </HeroModal> in PrivacyAccessibilityHub.tsx!');

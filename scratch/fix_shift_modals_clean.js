import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const shiftPath = path.join(__dirname, '..', 'src', 'components', 'ShiftModule.tsx');
let lines = fs.readFileSync(shiftPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

// 1. Modal 1: X Report
const xStart = lines.findIndex(l => l.includes('{/* X Report dialog OVERLAY */}'));
const zStart = lines.findIndex(l => l.includes('{/* Z Report dialog OVERLAY */}'));
const toastStart = lines.findIndex(l => l.includes('{/* Success notification popup */}'));

console.log('X start:', xStart, 'Z start:', zStart, 'Toast start:', toastStart);

// Extract inner X report from line xStart + 5 to zStart - 5
const xInner = lines.slice(xStart + 5, zStart - 4).join('\n');

const xModal = `  {/* X Report dialog OVERLAY */}
  {showXReport && activeShift && shiftStats && (
    <HeroModal
      isOpen={showXReport}
      onClose={() => setShowXReport(false)}
      size="sm"
      className={\`p-6 border border-divider/30 space-y-4 text-xs select-none bg-content1 text-foreground bir-receipt-container \${receiptFontClass}\`}
    >
${xInner}
    </HeroModal>
  )}`;

// Extract inner Z report from line zStart + 5 to toastStart - 5
const zInner = lines.slice(zStart + 5, toastStart - 4).join('\n');

const zModal = `  {/* Z Report dialog OVERLAY */}
  {showZReport && activeShift && shiftStats && (
    <HeroModal
      isOpen={showZReport}
      onClose={() => setShowZReport(false)}
      size="sm"
      className={\`p-6 border border-divider/30 space-y-4 text-xs font-mono select-none bg-content1 text-foreground bir-receipt-container \${receiptFontClass}\`}
    >
${zInner}
    </HeroModal>
  )}`;

const newCode = `${xModal}\n\n${zModal}\n\n`;
lines.splice(xStart, toastStart - xStart, newCode);

fs.writeFileSync(shiftPath, lines.join('\n'), 'utf8');
console.log('Migrated ShiftModule X and Z reports to HeroModal cleanly!');

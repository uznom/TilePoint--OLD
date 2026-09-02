import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const privPath = path.join(__dirname, '..', 'src', 'components', 'PrivacyAccessibilityHub.tsx');
let lines = fs.readFileSync(privPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

// 1. Imports
lines = lines.filter(l => !l.includes("import { createPortal } from 'react-dom';"));
if (!lines.some(l => l.includes("import { HeroModal }"))) {
  lines.unshift("import { HeroModal } from './common/ui/HeroModal';");
}

// 4. Modal 4: Handbook (around line 2984 to 3335)
const m4StartIdx = lines.findIndex(l => l.includes('{isShowingHandbook && typeof document !== \'undefined\' && createPortal('));
const m4HeaderIdx = lines.findIndex((l, idx) => idx > m4StartIdx && l.includes('TilePoint Systems Guided Handbook'));
const m4CloseIdx = lines.findIndex((l, idx) => idx > m4HeaderIdx && l.includes('document.body'));

console.log('M4 start:', m4StartIdx + 1, 'M4 header:', m4HeaderIdx + 1, 'M4 close:', m4CloseIdx + 1);

lines.splice(m4CloseIdx - 3, 5, '  </HeroModal>');
lines.splice(m4StartIdx, (m4HeaderIdx - 6) - m4StartIdx,
  '  <HeroModal',
  '    isOpen={isShowingHandbook}',
  '    onClose={() => { setIsShowingHandbook(false); setIsOpen(true); }}',
  '    size="4xl"',
  '    zIndex={200}',
  '    className="p-6 border border-divider/30 space-y-5 max-h-[90vh] overflow-hidden flex flex-col text-left"',
  '  >'
);

// 1b. Modal 1 Close (around line 2981 - now right before Modal 4)
const m1CloseIdx = lines.findIndex((l, idx) => idx > 2950 && l.includes('document.body') && idx < m4StartIdx);
console.log('M1 close:', m1CloseIdx + 1);
lines.splice(m1CloseIdx - 2, 4, '  </HeroModal>');

// 3. Modal 3: Batch Cleanup (around line 2888 to 2971)
const m3StartIdx = lines.findIndex(l => l.includes('{isBatchCleanupConfirmOpen && typeof document !== \'undefined\' && createPortal('));
const m3HeaderIdx = lines.findIndex((l, idx) => idx > m3StartIdx && l.includes('Automated Retention Policy Cleanup'));
const m3CloseIdx = lines.findIndex((l, idx) => idx > m3HeaderIdx && l.includes('document.body') && idx < m1CloseIdx);

console.log('M3 start:', m3StartIdx + 1, 'M3 header:', m3HeaderIdx + 1, 'M3 close:', m3CloseIdx + 1);

lines.splice(m3CloseIdx - 2, 4, '  </HeroModal>');
lines.splice(m3StartIdx, (m3HeaderIdx - 3) - m3StartIdx,
  '  <HeroModal',
  '    isOpen={isBatchCleanupConfirmOpen}',
  '    onClose={() => setIsBatchCleanupConfirmOpen(false)}',
  '    size="md"',
  '    zIndex={300}',
  '    className="bg-content1 border border-primary/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl"',
  '  >'
);

// 2. Modal 2: Archive Confirm (around line 2807 to 2884)
const m2StartIdx = lines.findIndex(l => l.includes('{isArchiveConfirmOpen && typeof document !== \'undefined\' && createPortal('));
const m2HeaderIdx = lines.findIndex((l, idx) => idx > m2StartIdx && l.includes('Confirm Category Archival & Purge'));
const m2CloseIdx = lines.findIndex((l, idx) => idx > m2HeaderIdx && l.includes('document.body') && idx < m3StartIdx);

console.log('M2 start:', m2StartIdx + 1, 'M2 header:', m2HeaderIdx + 1, 'M2 close:', m2CloseIdx + 1);

lines.splice(m2CloseIdx - 2, 4, '  </HeroModal>');
lines.splice(m2StartIdx, (m2HeaderIdx - 3) - m2StartIdx,
  '  <HeroModal',
  '    isOpen={isArchiveConfirmOpen}',
  '    onClose={() => setIsArchiveConfirmOpen(false)}',
  '    size="sm"',
  '    zIndex={300}',
  '    className="bg-content1 border border-amber-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl"',
  '  >'
);

// 1a. Modal 1: Main Hub Open
const m1StartIdx = lines.findIndex(l => l.includes('{isOpen && typeof document !== \'undefined\' && createPortal('));
const m1HeaderIdx = lines.findIndex((l, idx) => idx > m1StartIdx && l.includes('Header banner'));
console.log('M1 start:', m1StartIdx + 1, 'M1 header:', m1HeaderIdx + 1);

lines.splice(m1StartIdx, (m1HeaderIdx - 1) - m1StartIdx,
  '  <HeroModal',
  '    isOpen={isOpen}',
  '    onClose={() => setIsOpen(false)}',
  '    size="5xl"',
  '    zIndex={110}',
  '    className="w-full max-w-[95vw] md:max-w-7xl h-[90vh] md:h-[740px] md:max-h-[85vh] flex flex-col bg-content1 border border-divider/40 rounded-2xl p-0 overflow-hidden shadow-2xl text-foreground"',
  '  >'
);

fs.writeFileSync(privPath, lines.join('\n'), 'utf8');
console.log('Cleaned and migrated all PrivacyAccessibilityHub modals!');

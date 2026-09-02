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

// 4. Modal 4: Handbook
const m4CloseIdx = lines.findIndex((l, idx) => idx > 3300 && l.includes('document.body'));
console.log('M4 close line:', m4CloseIdx + 1);
// Replace lines from m4CloseIdx - 3 to m4CloseIdx + 1 (which are </div>\n</motion.div>\n</div>,\ndocument.body\n)})
lines.splice(m4CloseIdx - 3, 5, '  </HeroModal>');

const m4StartIdx = lines.findIndex(l => l.includes('{isShowingHandbook && typeof document !== \'undefined\' && createPortal('));
const m4HeaderIdx = lines.findIndex((l, idx) => idx > m4StartIdx && l.includes('TilePoint Systems Guided Handbook'));
console.log('M4 start line:', m4StartIdx + 1, 'M4 header line:', m4HeaderIdx + 1);
lines.splice(m4StartIdx, (m4HeaderIdx - 6) - m4StartIdx,
  '  <HeroModal',
  '    isOpen={isShowingHandbook}',
  '    onClose={() => { setIsShowingHandbook(false); setIsOpen(true); }}',
  '    size="4xl"',
  '    zIndex={200}',
  '    className="p-6 border border-divider/30 space-y-5 max-h-[90vh] overflow-hidden flex flex-col text-left"',
  '  >'
);

// 3. Modal 1 closing (which was right before Modal 4)
const m1CloseIdx = lines.findIndex((l, idx) => idx > 2950 && l.includes('document.body') && idx < m4StartIdx);
console.log('M1 close line:', m1CloseIdx + 1);
// Replace lines m1CloseIdx - 2 to m1CloseIdx + 1 (which are </div>\n</div>,\ndocument.body\n)})
lines.splice(m1CloseIdx - 2, 4, '  </HeroModal>');

// 2. Modal 3: Batch cleanup
const m3CloseIdx = lines.findIndex((l, idx) => idx > 2900 && l.includes('document.body') && idx < m1CloseIdx);
console.log('M3 close line:', m3CloseIdx + 1);
lines.splice(m3CloseIdx - 2, 4, '  </HeroModal>');

const m3StartIdx = lines.findIndex(l => l.includes('{isBatchCleanupConfirmOpen && typeof document !== \'undefined\' && createPortal('));
const m3HeaderIdx = lines.findIndex((l, idx) => idx > m3StartIdx && l.includes('Automated Retention Policy Cleanup'));
console.log('M3 start line:', m3StartIdx + 1, 'M3 header line:', m3HeaderIdx + 1);
lines.splice(m3StartIdx, (m3HeaderIdx - 3) - m3StartIdx,
  '  <HeroModal',
  '    isOpen={isBatchCleanupConfirmOpen}',
  '    onClose={() => setIsBatchCleanupConfirmOpen(false)}',
  '    size="md"',
  '    zIndex={300}',
  '    className="bg-content1 border border-primary/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl"',
  '  >'
);

// 1. Modal 2: Archive confirm
const m2CloseIdx = lines.findIndex((l, idx) => idx > 2800 && l.includes('document.body') && idx < m3StartIdx);
console.log('M2 close line:', m2CloseIdx + 1);
lines.splice(m2CloseIdx - 2, 4, '  </HeroModal>');

const m2StartIdx = lines.findIndex(l => l.includes('{isArchiveConfirmOpen && typeof document !== \'undefined\' && createPortal('));
const m2HeaderIdx = lines.findIndex((l, idx) => idx > m2StartIdx && l.includes('Confirm Category Archival & Purge'));
console.log('M2 start line:', m2StartIdx + 1, 'M2 header line:', m2HeaderIdx + 1);
lines.splice(m2StartIdx, (m2HeaderIdx - 3) - m2StartIdx,
  '  <HeroModal',
  '    isOpen={isArchiveConfirmOpen}',
  '    onClose={() => setIsArchiveConfirmOpen(false)}',
  '    size="sm"',
  '    zIndex={300}',
  '    className="bg-content1 border border-amber-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl"',
  '  >'
);

// 0. Modal 1: Main hub open
const m1StartIdx = lines.findIndex(l => l.includes('{isOpen && typeof document !== \'undefined\' && createPortal('));
const m1HeaderIdx = lines.findIndex((l, idx) => idx > m1StartIdx && l.includes('Header banner'));
console.log('M1 start line:', m1StartIdx + 1, 'M1 header line:', m1HeaderIdx + 1);
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
console.log('Successfully migrated PrivacyAccessibilityHub modals to HeroModal!');

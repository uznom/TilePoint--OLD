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

// 4. Modal 4: Handbook Modal (bottom-up)
const m4Start = lines.findIndex(l => l.includes('{isShowingHandbook && typeof document !== \'undefined\' && createPortal('));
const m4Header = lines.findIndex((l, idx) => idx > m4Start && l.includes('TilePoint Systems Guided Handbook'));
const m4Close = lines.findIndex((l, idx) => idx > m4Header && l.includes('document.body'));

console.log('M4 start:', m4Start, 'M4 header:', m4Header, 'M4 close:', m4Close);

// Replace M4 close (lines m4Close - 2 to m4Close + 1)
lines.splice(m4Close - 2, 4, '    </div>', '  </HeroModal>');
// Replace M4 open (lines m4Start to m4Header - 4)
lines.splice(m4Start, (m4Header - 3) - m4Start,
  '  <HeroModal',
  '    isOpen={isShowingHandbook}',
  '    onClose={() => { setIsShowingHandbook(false); setIsOpen(true); }}',
  '    size="4xl"',
  '    zIndex={200}',
  '    className="p-6 border border-divider/30 space-y-5 max-h-[90vh] overflow-hidden flex flex-col text-left"',
  '  >'
);

// 3. Modal 3: Batch Cleanup
const m3Start = lines.findIndex(l => l.includes('{isBatchCleanupConfirmOpen && typeof document !== \'undefined\' && createPortal('));
const m3Header = lines.findIndex((l, idx) => idx > m3Start && l.includes('Automated Retention Policy Cleanup'));
const m3Close = lines.findIndex((l, idx) => idx > m3Header && l.includes('document.body'));

console.log('M3 start:', m3Start, 'M3 header:', m3Header, 'M3 close:', m3Close);

lines.splice(m3Close - 2, 4, '    </div>', '  </HeroModal>');
lines.splice(m3Start, (m3Header - 3) - m3Start,
  '  <HeroModal',
  '    isOpen={isBatchCleanupConfirmOpen}',
  '    onClose={() => setIsBatchCleanupConfirmOpen(false)}',
  '    size="md"',
  '    zIndex={300}',
  '    className="bg-content1 border border-primary/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl"',
  '  >'
);

// 2. Modal 2: Archive Confirm
const m2Start = lines.findIndex(l => l.includes('{isArchiveConfirmOpen && typeof document !== \'undefined\' && createPortal('));
const m2Header = lines.findIndex((l, idx) => idx > m2Start && l.includes('Confirm Category Archival & Purge'));
const m2Close = lines.findIndex((l, idx) => idx > m2Header && l.includes('document.body'));

console.log('M2 start:', m2Start, 'M2 header:', m2Header, 'M2 close:', m2Close);

lines.splice(m2Close - 2, 4, '    </div>', '  </HeroModal>');
lines.splice(m2Start, (m2Header - 3) - m2Start,
  '  <HeroModal',
  '    isOpen={isArchiveConfirmOpen}',
  '    onClose={() => setIsArchiveConfirmOpen(false)}',
  '    size="sm"',
  '    zIndex={300}',
  '    className="bg-content1 border border-amber-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl"',
  '  >'
);

// 1. Modal 1: Main Hub
const m1Start = lines.findIndex(l => l.includes('{isOpen && typeof document !== \'undefined\' && createPortal('));
const m1Header = lines.findIndex((l, idx) => idx > m1Start && l.includes('Header banner'));
const m4StartNew = lines.findIndex(l => l.includes('isOpen={isShowingHandbook}'));
const m1Close = lines.findIndex((l, idx) => idx > 2800 && l.includes('document.body') && idx < m4StartNew);

console.log('M1 start:', m1Start, 'M1 header:', m1Header, 'M1 close:', m1Close);

lines.splice(m1Close - 2, 4, '  </HeroModal>');
lines.splice(m1Start, (m1Header - 1) - m1Start,
  '  <HeroModal',
  '    isOpen={isOpen}',
  '    onClose={() => setIsOpen(false)}',
  '    size="5xl"',
  '    zIndex={110}',
  '    className="w-full max-w-[95vw] md:max-w-7xl h-[90vh] md:h-[740px] md:max-h-[85vh] flex flex-col bg-content1 border border-divider/40 rounded-2xl p-0 overflow-hidden shadow-2xl text-foreground"',
  '  >'
);

fs.writeFileSync(privPath, lines.join('\n'), 'utf8');
console.log('Migrated PrivacyAccessibilityHub modals to HeroModal!');

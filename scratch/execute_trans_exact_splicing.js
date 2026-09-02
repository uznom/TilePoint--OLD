import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transPath = path.join(__dirname, '..', 'src', 'components', 'TransmittalModule.tsx');
let lines = fs.readFileSync(transPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

// 1. Imports
lines = lines.filter(l => !l.includes("import { createPortal } from 'react-dom';"));
if (!lines.some(l => l.includes("import { HeroModal }"))) {
  lines.unshift("import { HeroModal } from './common/ui/HeroModal';");
}

// 2. Modal 3 bottom-up:
// Original lines (0-indexed in array now shifted by +1 for import):
// Let's find by exact string anchor:
const m3StartIdx = lines.findIndex(l => l.includes('{showImportModal && typeof document !== \'undefined\' && createPortal('));
const m3CardOpenIdx = lines.findIndex((l, idx) => idx > m3StartIdx && l.includes('className="relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground text-left space-y-4"'));
const m3CloseIdx = lines.findIndex((l, idx) => idx > m3CardOpenIdx && l.includes('document.body'));

console.log('M3 start:', m3StartIdx, 'CardOpen:', m3CardOpenIdx, 'Close:', m3CloseIdx);

// Replace M3 close: from line m3CloseIdx - 2 to m3CloseIdx + 1 (which are </div>\n</div>,\ndocument.body\n)})
lines.splice(m3CloseIdx - 2, 4, '  </HeroModal>');
// Replace M3 open: from line m3StartIdx to m3CardOpenIdx
lines.splice(m3StartIdx, (m3CardOpenIdx - m3StartIdx) + 1, '  <HeroModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} size="sm" className="p-6 border border-divider/30 text-left space-y-4">');

// 3. Modal 2:
const m2StartIdx = lines.findIndex(l => l.includes('{activeTrans && typeof document !== \'undefined\' && createPortal('));
const m2CardOpenIdx = lines.findIndex((l, idx) => idx > m2StartIdx && l.includes('className="relative w-full max-w-md rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left flex flex-col max-h-[90vh]"'));
const m2CloseIdx = lines.findIndex((l, idx) => idx > m2CardOpenIdx && l.includes('document.body'));

console.log('M2 start:', m2StartIdx, 'CardOpen:', m2CardOpenIdx, 'Close:', m2CloseIdx);

lines.splice(m2CloseIdx - 2, 4, '  </HeroModal>', '  )}');
lines.splice(m2StartIdx, (m2CardOpenIdx - m2StartIdx) + 1,
  '  {activeTrans && (',
  '    <HeroModal isOpen={Boolean(activeTrans)} onClose={() => setActiveTrans(null)} size="md" className="p-6 border border-divider/30 space-y-4 text-left flex flex-col max-h-[90vh]">'
);

// 4. Modal 1:
const m1StartIdx = lines.findIndex(l => l.includes('{showModal && typeof document !== \'undefined\' && createPortal('));
const m1FormOpenIdx = lines.findIndex((l, idx) => idx > m1StartIdx && l.includes('className="relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left"'));
const m1CloseIdx = lines.findIndex((l, idx) => idx > m1FormOpenIdx && l.includes('document.body'));

console.log('M1 start:', m1StartIdx, 'FormOpen:', m1FormOpenIdx + 1, 'Close:', m1CloseIdx);

// In Modal 1, m1CloseIdx is document.body, line m1CloseIdx - 2 is </form>, line m1CloseIdx - 1 is </div>,
lines.splice(m1CloseIdx - 2, 4, '    </form>', '  </HeroModal>');
lines.splice(m1StartIdx, (m1FormOpenIdx + 1 - m1StartIdx) + 1,
  '  <HeroModal isOpen={showModal} onClose={() => setShowModal(false)} size="sm" className="p-6 border border-divider/30 space-y-4 text-left">',
  '    <form onSubmit={handleCreateTrans} className="space-y-4 text-left">'
);

fs.writeFileSync(transPath, lines.join('\n'), 'utf8');
console.log('Spliced TransmittalModule successfully!');

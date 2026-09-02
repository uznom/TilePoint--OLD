import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transPath = path.join(__dirname, '..', 'src', 'components', 'TransmittalModule.tsx');
let lines = fs.readFileSync(transPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

// 1. Modal 1
const m1Start = lines.findIndex(l => l.includes('{/* MODAL 1: Create dispatch document form */}'));
const m1Header = lines.findIndex(l => l.includes('<span>Dispatch Form Package</span>'));
const m1Close = lines.findIndex(l => l.includes('{/* MODAL 2: Inspect Payload contents details'));

console.log('M1 start:', m1Start, 'M1 header:', m1Header, 'M1 close:', m1Close);

// Replace lines from m1Start + 1 to m1Header - 1 (the portal/backdrop opening)
lines.splice(m1Start + 1, (m1Header - 1) - (m1Start + 1),
  '  <HeroModal isOpen={showModal} onClose={() => setShowModal(false)} size="sm" className="p-6 border border-divider/30 space-y-4 text-left">',
  '    <form onSubmit={handleCreateTrans} className="space-y-4 text-left">'
);

// Fix M1 close (just before M1 close index)
const m1CloseNewIdx = lines.findIndex(l => l.includes('{/* MODAL 2: Inspect Payload contents details'));
lines.splice(m1CloseNewIdx - 4, 4,
  '    </form>',
  '  </HeroModal>'
);

// 2. Modal 2
const m2Start = lines.findIndex(l => l.includes('{/* MODAL 2: Inspect Payload contents details'));
const m2Header = lines.findIndex(l => l.includes('Transmittal Slip Details'));
const m2Print = lines.findIndex(l => l.includes('{/* EXCLUSIVELY FOR PHYSICAL PRINT'));

console.log('M2 start:', m2Start, 'M2 header:', m2Header, 'M2 print:', m2Print);

lines.splice(m2Start + 1, (m2Header - 1) - (m2Start + 1),
  '  {activeTrans && (',
  '    <HeroModal isOpen={Boolean(activeTrans)} onClose={() => setActiveTrans(null)} size="md" className="p-6 border border-divider/30 space-y-4 text-left flex flex-col max-h-[90vh]">'
);

const m2PrintNewIdx = lines.findIndex(l => l.includes('{/* EXCLUSIVELY FOR PHYSICAL PRINT'));
lines.splice(m2PrintNewIdx - 5, 5,
  '    </HeroModal>',
  '  )}'
);

// 3. Modal 3
const m3Start = lines.findIndex(l => l.includes('{/* MODAL 3: Visual JSON import form'));
const m3Header = lines.findIndex(l => l.includes('Import JSON Slip'));
const toastIdx = lines.findIndex(l => l.includes('{/* Success toast alert bar */}'));

console.log('M3 start:', m3Start, 'M3 header:', m3Header, 'Toast idx:', toastIdx);

lines.splice(m3Start + 1, (m3Header - 1) - (m3Start + 1),
  '  <HeroModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} size="sm" className="p-6 border border-divider/30 text-left space-y-4">'
);

const toastNewIdx = lines.findIndex(l => l.includes('{/* Success toast alert bar */}'));
lines.splice(toastNewIdx - 4, 4,
  '  </HeroModal>'
);

fs.writeFileSync(transPath, lines.join('\n'), 'utf8');
console.log('Cleaned and replaced all TransmittalModule modals successfully!');

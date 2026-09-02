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

// 2. Modal 1: Dispatch Form Package
const m1Start = lines.findIndex(l => l.includes('{/* MODAL 1: Create dispatch document form */}'));
const m2Start = lines.findIndex(l => l.includes('{/* MODAL 2: Inspect Payload contents details'));
const m3Start = lines.findIndex(l => l.includes('{/* MODAL 3: Visual JSON import form'));
const toastStart = lines.findIndex(l => l.includes('{/* Success toast alert bar */}'));

console.log('M1 start:', m1Start, 'M2 start:', m2Start, 'M3 start:', m3Start, 'Toast start:', toastStart);

// M1: lines m1Start + 7 to m2Start - 4
const m1Inner = lines.slice(m1Start + 7, m2Start - 3).join('\n');
const m1Modal = `  {/* MODAL 1: Create dispatch document form */}
  <HeroModal
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    size="sm"
    className="p-6 border border-divider/30 space-y-4"
  >
    <form
      onSubmit={handleCreateTrans}
      className="space-y-4 text-left"
    >
${m1Inner}
  </HeroModal>`;

// M2: lines m2Start + 7 to m3Start - 10 (style tag is before m3)
const styleStart = lines.findIndex(l => l.includes('<style'));
const m2Inner = lines.slice(m2Start + 7, styleStart - 4).join('\n');
const m2Modal = `  {/* MODAL 2: Inspect Payload contents details & Printable interactive slip */}
  {activeTrans && (
    <HeroModal
      isOpen={Boolean(activeTrans)}
      onClose={() => setActiveTrans(null)}
      size="md"
      className="p-6 border border-divider/30 space-y-4 text-left flex flex-col max-h-[90vh]"
    >
${m2Inner}
    </HeroModal>
  )}`;

// M3: lines m3Start + 7 to toastStart - 4
const m3Inner = lines.slice(m3Start + 7, toastStart - 4).join('\n');
const m3Modal = `  {/* MODAL 3: Visual JSON import form (replacing prompt window popup) */}
  <HeroModal
    isOpen={showImportModal}
    onClose={() => setShowImportModal(false)}
    size="sm"
    className="p-6 border border-divider/30 text-left space-y-4"
  >
${m3Inner}
  </HeroModal>`;

// Reconstruct
const styleSection = lines.slice(styleStart, m3Start).join('\n');
const newBlock = `${m1Modal}\n\n${m2Modal}\n\n${styleSection}\n${m3Modal}\n\n`;

lines.splice(m1Start, toastStart - m1Start, newBlock);

fs.writeFileSync(transPath, lines.join('\n'), 'utf8');
console.log('Migrated TransmittalModule modals to HeroModal!');

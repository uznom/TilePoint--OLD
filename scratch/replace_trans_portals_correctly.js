import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transPath = path.join(__dirname, '..', 'src', 'components', 'TransmittalModule.tsx');
let content = fs.readFileSync(transPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Imports
content = content.replace("import { createPortal } from 'react-dom';\n", "");
if (!content.includes("import { HeroModal }")) {
  content = "import { HeroModal } from './common/ui/HeroModal';\n" + content;
}

let lines = content.split('\n');

// 3. Bottom-up: Modal 3 first
let m3Start = lines.findIndex(l => l.includes('{showImportModal && typeof document !== \'undefined\' && createPortal('));
let m3End = lines.findIndex((l, idx) => idx > m3Start && l.includes('document.body'));
console.log('M3 start line:', m3Start + 1, 'M3 end line:', m3End + 1);

let m3Header = lines.findIndex(l => l.includes('Import JSON Slip'));
let m3Inner = lines.slice(m3Header - 1, m3End - 1).join('\n');
let m3Modal = `  {/* MODAL 3: Visual JSON import form (replacing prompt window popup) */}
  <HeroModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} size="sm" className="p-6 border border-divider/30 text-left space-y-4">
${m3Inner}
  </HeroModal>`;

lines.splice(m3Start - 1, (m3End + 2) - (m3Start - 1), m3Modal);

// 2. Modal 2 next
let m2Start = lines.findIndex(l => l.includes('{activeTrans && typeof document !== \'undefined\' && createPortal('));
let m2End = lines.findIndex((l, idx) => idx > m2Start && l.includes('document.body'));
console.log('M2 start line:', m2Start + 1, 'M2 end line:', m2End + 1);

let m2Header = lines.findIndex(l => l.includes('Transmittal Slip Details'));
let m2Inner = lines.slice(m2Header - 1, m2End - 1).join('\n');
let m2Modal = `  {/* MODAL 2: Inspect Payload contents details & Printable interactive slip */}
  {activeTrans && (
    <HeroModal isOpen={Boolean(activeTrans)} onClose={() => setActiveTrans(null)} size="md" className="p-6 border border-divider/30 space-y-4 text-left flex flex-col max-h-[90vh]">
${m2Inner}
    </HeroModal>
  )}`;

lines.splice(m2Start - 1, (m2End + 2) - (m2Start - 1), m2Modal);

// 1. Modal 1 last
let m1Start = lines.findIndex(l => l.includes('{showModal && typeof document !== \'undefined\' && createPortal('));
let m1End = lines.findIndex((l, idx) => idx > m1Start && l.includes('document.body'));
console.log('M1 start line:', m1Start + 1, 'M1 end line:', m1End + 1);

let m1Header = lines.findIndex(l => l.includes('Dispatch Form Package'));
let m1FormClose = lines.findIndex((l, idx) => idx > m1Header && l.includes('</form>'));
let m1Inner = lines.slice(m1Header - 1, m1FormClose).join('\n');
let m1Modal = `  {/* MODAL 1: Create dispatch document form */}
  <HeroModal isOpen={showModal} onClose={() => setShowModal(false)} size="sm" className="p-6 border border-divider/30 space-y-4 text-left">
    <form onSubmit={handleCreateTrans} className="space-y-4 text-left">
${m1Inner}
    </div>
    </form>
  </HeroModal>`;

lines.splice(m1Start - 1, (m1End + 2) - (m1Start - 1), m1Modal);

fs.writeFileSync(transPath, lines.join('\n'), 'utf8');
console.log('Successfully replaced all 3 TransmittalModule modals bottom-up!');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transPath = path.join(__dirname, '..', 'src', 'components', 'TransmittalModule.tsx');
let lines = fs.readFileSync(transPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

// 1. Modal 1: lines where createPortal starts at line ~1349 to document.body )
let m1Start = lines.findIndex(l => l.includes('{showModal && typeof document !== \'undefined\' && createPortal('));
let m1End = lines.findIndex((l, idx) => idx > m1Start && l.includes('document.body'));

console.log('M1 start:', m1Start, 'M1 end:', m1End);

// Inner form content is between the header div (<div className="flex justify-between items-center border-b...) and </form>
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

// Replace M1
lines.splice(m1Start - 1, (m1End + 2) - (m1Start - 1), m1Modal);

// 2. Modal 2:
let m2Start = lines.findIndex(l => l.includes('{activeTrans && typeof document !== \'undefined\' && createPortal('));
let m2End = lines.findIndex((l, idx) => idx > m2Start && l.includes('document.body'));

console.log('M2 start:', m2Start, 'M2 end:', m2End);

let m2Header = lines.findIndex(l => l.includes('Transmittal Slip Details'));
// Modal 2 inner content is between m2Header - 1 and m2End - 3 (which is the Close button div)
let m2Inner = lines.slice(m2Header - 1, m2End - 2).join('\n');
let m2Modal = `  {/* MODAL 2: Inspect Payload contents details & Printable interactive slip */}
  {activeTrans && (
    <HeroModal isOpen={Boolean(activeTrans)} onClose={() => setActiveTrans(null)} size="md" className="p-6 border border-divider/30 space-y-4 text-left flex flex-col max-h-[90vh]">
${m2Inner}
    </HeroModal>
  )}`;

// Replace M2
lines.splice(m2Start - 1, (m2End + 2) - (m2Start - 1), m2Modal);

// 3. Modal 3:
let m3Start = lines.findIndex(l => l.includes('{showImportModal && typeof document !== \'undefined\' && createPortal('));
let m3End = lines.findIndex((l, idx) => idx > m3Start && l.includes('document.body'));

console.log('M3 start:', m3Start, 'M3 end:', m3End);

let m3Header = lines.findIndex(l => l.includes('Import JSON Slip'));
let m3Inner = lines.slice(m3Header - 1, m3End - 2).join('\n');
let m3Modal = `  {/* MODAL 3: Visual JSON import form (replacing prompt window popup) */}
  <HeroModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} size="sm" className="p-6 border border-divider/30 text-left space-y-4">
${m3Inner}
  </HeroModal>`;

// Replace M3
lines.splice(m3Start - 1, (m3End + 2) - (m3Start - 1), m3Modal);

fs.writeFileSync(transPath, lines.join('\n'), 'utf8');
console.log('Successfully replaced all 3 TransmittalModule modals with HeroModal!');

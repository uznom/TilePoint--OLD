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

// 2. Modal 1 opening
const m1OpenOld = `  {/* MODAL 1: Create dispatch document form */}
  {showModal && typeof document !== 'undefined' && createPortal(
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
  <div
  className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
  onClick={() => setShowModal(false)}
  />
  <form
  onSubmit={handleCreateTrans}
  className="relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left"
  >`;

const m1OpenNew = `  {/* MODAL 1: Create dispatch document form */}
  <HeroModal isOpen={showModal} onClose={() => setShowModal(false)} size="sm" className="p-6 border border-divider/30 space-y-4 text-left">
    <form onSubmit={handleCreateTrans} className="space-y-4 text-left">`;

console.log('M1 Open match:', content.includes(m1OpenOld));
content = content.replace(m1OpenOld, m1OpenNew);

// 3. Modal 1 closing
const m1CloseOld = `  </div>
  </form>
  </div>,
  document.body
  )}`;

const m1CloseNew = `  </div>
  </form>
  </HeroModal>`;

console.log('M1 Close match:', content.includes(m1CloseOld));
content = content.replace(m1CloseOld, m1CloseNew);

// 4. Modal 2 opening
const m2OpenOld = `  {/* MODAL 2: Inspect Payload contents details & Printable interactive slip */}
  {activeTrans && typeof document !== 'undefined' && createPortal(
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in no-print font-sans">
  <div
  className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
  onClick={() => setActiveTrans(null)}
  />
  <div className="relative w-full max-w-md rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left flex flex-col max-h-[90vh]">`;

const m2OpenNew = `  {/* MODAL 2: Inspect Payload contents details & Printable interactive slip */}
  {activeTrans && (
    <HeroModal isOpen={Boolean(activeTrans)} onClose={() => setActiveTrans(null)} size="md" className="p-6 border border-divider/30 space-y-4 text-left flex flex-col max-h-[90vh]">`;

console.log('M2 Open match:', content.includes(m2OpenOld));
content = content.replace(m2OpenOld, m2OpenNew);

// 5. Modal 2 closing
const m2CloseOld = `  </div>
  </div>
  </div>,
  document.body
  )}`;

const m2CloseNew = `  </div>
    </HeroModal>
  )}`;

console.log('M2 Close match:', content.includes(m2CloseOld));
content = content.replace(m2CloseOld, m2CloseNew);

// 6. Modal 3 opening
const m3OpenOld = `  {/* MODAL 3: Visual JSON import form (replacing prompt window popup) */}
  {showImportModal && typeof document !== 'undefined' && createPortal(
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
  <div
  className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
  onClick={() => setShowImportModal(false)}
  />
  <div className="relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground text-left space-y-4">`;

const m3OpenNew = `  {/* MODAL 3: Visual JSON import form (replacing prompt window popup) */}
  <HeroModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} size="sm" className="p-6 border border-divider/30 text-left space-y-4">`;

console.log('M3 Open match:', content.includes(m3OpenOld));
content = content.replace(m3OpenOld, m3OpenNew);

// 7. Modal 3 closing
const m3CloseOld = `  </div>
  </div>
  </div>,
  document.body
  )}`;

const m3CloseNew = `  </div>
  </HeroModal>`;

console.log('M3 Close match:', content.includes(m3CloseOld));
content = content.replace(m3CloseOld, m3CloseNew);

fs.writeFileSync(transPath, content, 'utf8');
console.log('Done!');

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

// 2. Modal 1
const m1Start = `  {/* MODAL 1: Create dispatch document form */}
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

const m1StartNew = `  {/* MODAL 1: Create dispatch document form */}
  <HeroModal isOpen={showModal} onClose={() => setShowModal(false)} size="sm" className="p-6 border border-divider/30 space-y-4 text-left">
    <form onSubmit={handleCreateTrans} className="space-y-4 text-left">`;

content = content.replace(m1Start, m1StartNew);

const m1End = `  </div>
  </form>
  </div>,
  document.body
  )}`;

const m1EndNew = `  </div>
  </form>
  </HeroModal>`;

content = content.replace(m1End, m1EndNew);

// 3. Modal 2
const m2Start = `  {/* MODAL 2: Inspect Payload contents details & Printable interactive slip */}
  {activeTrans && typeof document !== 'undefined' && createPortal(
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in no-print font-sans">
  <div
  className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
  onClick={() => setActiveTrans(null)}
  />
  <div className="relative w-full max-w-md rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left flex flex-col max-h-[90vh]">`;

const m2StartNew = `  {/* MODAL 2: Inspect Payload contents details & Printable interactive slip */}
  {activeTrans && (
    <HeroModal isOpen={Boolean(activeTrans)} onClose={() => setActiveTrans(null)} size="md" className="p-6 border border-divider/30 space-y-4 text-left flex flex-col max-h-[90vh]">`;

content = content.replace(m2Start, m2StartNew);

const m2End = `  </div>
  </div>
  </div>,
  document.body
  )}`;

const m2EndNew = `  </div>
    </HeroModal>
  )}`;

content = content.replace(m2End, m2EndNew);

// 4. Modal 3
const m3Start = `  {/* MODAL 3: Visual JSON import form (replacing prompt window popup) */}
  {showImportModal && typeof document !== 'undefined' && createPortal(
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
  <div
  className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
  onClick={() => setShowImportModal(false)}
  />
  <div className="relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground text-left space-y-4">`;

const m3StartNew = `  {/* MODAL 3: Visual JSON import form (replacing prompt window popup) */}
  <HeroModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} size="sm" className="p-6 border border-divider/30 text-left space-y-4">`;

content = content.replace(m3Start, m3StartNew);

const m3End = `  </div>
  </div>
  </div>,
  document.body
  )}`;

const m3EndNew = `  </div>
  </HeroModal>`;

content = content.replace(m3End, m3EndNew);

fs.writeFileSync(transPath, content, 'utf8');
console.log('Successfully applied HeroModal to TransmittalModule.tsx!');

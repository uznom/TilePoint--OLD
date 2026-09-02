import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transPath = path.join(__dirname, '..', 'src', 'components', 'TransmittalModule.tsx');
let content = fs.readFileSync(transPath, 'utf8').replace(/\r\n/g, '\n');

// Add HeroModal import
content = content.replace("import { createPortal } from 'react-dom';\n", "");
if (!content.includes("import { HeroModal }")) {
  content = "import { HeroModal } from './common/ui/HeroModal';\n" + content;
}

// 1. Modal 1
const m1Old = `  {/* MODAL 1: Create dispatch document form */}
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

const m1New = `  {/* MODAL 1: Create dispatch document form */}
  <HeroModal isOpen={showModal} onClose={() => setShowModal(false)} size="sm" className="p-6 border border-divider/30 space-y-4 text-left">
    <form onSubmit={handleCreateTrans} className="space-y-4 text-left">`;

content = content.replace(m1Old, m1New);

const m1CloseOld = `  </div>
  </form>
  </div>,
  document.body
  )}`;

const m1CloseNew = `  </div>
  </form>
  </HeroModal>`;

content = content.replace(m1CloseOld, m1CloseNew);

// 2. Modal 2
const m2Old = `  {/* MODAL 2: Inspect Payload contents details & Printable interactive slip */}
  {activeTrans && typeof document !== 'undefined' && createPortal(
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in no-print font-sans">
  <div
  className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
  onClick={() => setActiveTrans(null)}
  />
  <div className="relative w-full max-w-md rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left flex flex-col max-h-[90vh]">`;

const m2New = `  {/* MODAL 2: Inspect Payload contents details & Printable interactive slip */}
  {activeTrans && (
    <HeroModal isOpen={Boolean(activeTrans)} onClose={() => setActiveTrans(null)} size="md" className="p-6 border border-divider/30 space-y-4 text-left flex flex-col max-h-[90vh]">`;

content = content.replace(m2Old, m2New);

const m2CloseOld = `  </div>
  </div>
  </div>,
  document.body
  )}`;

const m2CloseNew = `  </div>
  </HeroModal>
  )}`;

content = content.replace(m2CloseOld, m2CloseNew);

// 3. Modal 3
const m3Old = `  {/* MODAL 3: Visual JSON import form (replacing prompt window popup) */}
  {showImportModal && typeof document !== 'undefined' && createPortal(
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
  <div
  className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
  onClick={() => setShowImportModal(false)}
  />
  <div className="relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground text-left space-y-4">`;

const m3New = `  {/* MODAL 3: Visual JSON import form (replacing prompt window popup) */}
  <HeroModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} size="sm" className="p-6 border border-divider/30 text-left space-y-4">`;

content = content.replace(m3Old, m3New);

const m3CloseOld = `  </div>
  </div>
  </div>,
  document.body
  )}`;

const m3CloseNew = `  </div>
  </HeroModal>`;

content = content.replace(m3CloseOld, m3CloseNew);

fs.writeFileSync(transPath, content, 'utf8');
console.log('Migrated TransmittalModule modals cleanly!');

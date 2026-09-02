import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const branchPath = path.join(__dirname, '..', 'src', 'components', 'BranchModule.tsx');
let content = fs.readFileSync(branchPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add HeroModal import
if (!content.includes("import { HeroModal }")) {
  content = content.replace(
    "import { HeroTable } from './common/ui/HeroTable';",
    "import { HeroModal } from './common/ui/HeroModal';\nimport { HeroTable } from './common/ui/HeroTable';"
  );
}
content = content.replace("import { createPortal } from 'react-dom';\n", "");

// 2. Modal 1: Edit / Add Corporate Branch
const m1Target = `  {/* MODAL: Edit / Add Corporate Branch dialog */}
  {showModal && typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" onClick={() => setShowModal(false)} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl space-y-4 bg-content1 text-foreground"
      >`;

const m1Replacement = `  {/* MODAL: Edit / Add Corporate Branch dialog */}
  <HeroModal
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    size="lg"
    className="p-6 border border-divider/30 max-h-[90vh] overflow-y-auto"
  >
    <form
      onSubmit={handleSubmit}
      className="space-y-4 text-foreground text-left"
    >`;

content = content.replace(m1Target, m1Replacement);
content = content.replace(
  `        </form>
    </div>
  </div>,
  document.body
  )}`,
  `    </form>
  </HeroModal>`
);

// 3. Modal 2: Confirm Delete Dialog
const m2Target = `  {/* CUSTOM HEROUI ALERT DIALOG: Confirmation before delete to avoid blocking browser popups */}
  {confirmDeleteId && typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" onClick={() => setConfirmDeleteId(null)} />
      <div className="relative w-full max-w-xs max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-sm font-black text-primary">Archive Store Location?</h4>
          <p className="text-xs text-default-500/80 mt-2 leading-relaxed">
            Are you sure you want to soft-delete <span className="font-extrabold text-foreground">{confirmDeleteName}</span>? This item can be restored by DB administrators later.
          </p>
        </div>
        <div className="flex gap-2 justify-center pt-2">
          <button
            onClick={() => setConfirmDeleteId(null)}
            className="px-4 py-2 text-xs font-bold bg-default-100 text-default-500 rounded-full hover:bg-default-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={proceedWithDelete}
            className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-sm"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  )}`;

const m2Replacement = `  {/* CUSTOM HEROUI ALERT DIALOG: Confirmation before delete to avoid blocking browser popups */}
  <HeroModal
    isOpen={Boolean(confirmDeleteId)}
    onClose={() => setConfirmDeleteId(null)}
    size="xs"
    className="p-6 text-center space-y-4 border border-divider/30"
  >
    <div className="mx-auto h-12 w-12 rounded-full bg-primary-50 text-primary flex items-center justify-center">
      <AlertTriangle className="h-6 w-6" />
    </div>
    <div>
      <h4 className="text-sm font-black text-primary">Archive Store Location?</h4>
      <p className="text-xs text-default-500/80 mt-2 leading-relaxed">
        Are you sure you want to soft-delete <span className="font-extrabold text-foreground">{confirmDeleteName}</span>? This item can be restored by DB administrators later.
      </p>
    </div>
    <div className="flex gap-2 justify-center pt-2">
      <button
        onClick={() => setConfirmDeleteId(null)}
        className="px-4 py-2 text-xs font-bold bg-default-100 text-default-500 rounded-full hover:bg-default-200 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={proceedWithDelete}
        className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-sm"
      >
        Confirm Delete
      </button>
    </div>
  </HeroModal>`;

content = content.replace(m2Target, m2Replacement);

// 4. Modal 3: Enlist Employee Dialog
const m3Target = `   {/* MODAL: DIRECT ENLIST EMPLOYEE */}
   {showEnlistModal && typeof document !== 'undefined' && createPortal(
     <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in font-sans">
       <div className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" onClick={() => setShowEnlistModal(false)} />
       <form
         onSubmit={handleEnlistEmployeeSubmit}
         className="relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl space-y-4 bg-content1 text-foreground"
       >`;

const m3Replacement = `   {/* MODAL: DIRECT ENLIST EMPLOYEE */}
   <HeroModal
     isOpen={showEnlistModal}
     onClose={() => setShowEnlistModal(false)}
     size="sm"
     className="p-6 border border-divider/30 space-y-4"
   >
     <form
       onSubmit={handleEnlistEmployeeSubmit}
       className="space-y-4 text-foreground text-left"
     >`;

content = content.replace(m3Target, m3Replacement);

// Find closing for m3
const lastPortalClose = `       </form>
     </div>
   </div>,
   document.body
   )}`;

content = content.replace(lastPortalClose, `     </form>\n   </HeroModal>`);

fs.writeFileSync(branchPath, content, 'utf8');
console.log('Migrated BranchModule modals to HeroModal!');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const branchPath = path.join(__dirname, '..', 'src', 'components', 'BranchModule.tsx');
let lines = fs.readFileSync(branchPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

// Find Modal 2 start and Modal 3 start
const m2Start = lines.findIndex(l => l.includes('{/* CUSTOM HEROUI ALERT DIALOG'));
const m3Start = lines.findIndex(l => l.includes('{/* MODAL: DIRECT ENLIST EMPLOYEE */}'));
const toastStart = lines.findIndex(l => l.includes('{/* Success toast alert bar */}'));

console.log('M2 start:', m2Start, 'M3 start:', m3Start, 'Toast start:', toastStart);

// Build new Modal 2 & Modal 3
const m2Replacement = `  {/* CUSTOM HEROUI ALERT DIALOG: Confirmation before delete to avoid blocking browser popups */}
  <HeroModal
    isOpen={Boolean(confirmDeleteId)}
    onClose={() => setConfirmDeleteId(null)}
    size="xs"
    className="p-6 text-center space-y-4 border border-divider/30"
  >
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
        type="button"
        onClick={() => setConfirmDeleteId(null)}
        className="px-4 py-2 text-xs font-bold bg-default-100 text-default-500 rounded-full hover:bg-default-200 transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={proceedWithDelete}
        className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-sm"
      >
        Confirm Delete
      </button>
    </div>
  </HeroModal>`;

// For Modal 3, extract form body from lines m3Start + 6 up to toastStart - 4
const m3FormInner = lines.slice(m3Start + 6, toastStart - 4).join('\n');

const m3Replacement = `  {/* MODAL: DIRECT ENLIST EMPLOYEE */}
  <HeroModal
    isOpen={showEnlistModal}
    onClose={() => setShowEnlistModal(false)}
    size="sm"
    className="p-6 border border-divider/30 space-y-4"
  >
    <form
      onSubmit={handleEnlistEmployeeSubmit}
      className="space-y-4 bg-content1 text-foreground text-left"
    >
${m3FormInner}
    </form>
  </HeroModal>`;

// Splice everything between m2Start and toastStart
const newModals = `${m2Replacement}\n\n${m3Replacement}\n\n`;
lines.splice(m2Start, toastStart - m2Start, newModals);

fs.writeFileSync(branchPath, lines.join('\n'), 'utf8');
console.log('Successfully converted BranchModule M2 and M3 to HeroModal!');

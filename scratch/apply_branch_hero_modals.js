import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const branchPath = path.join(__dirname, '..', 'src', 'components', 'BranchModule.tsx');
let lines = fs.readFileSync(branchPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

// 1. First modal
const m1Start = lines.findIndex(l => l.includes('{/* MODAL: Edit / Add Corporate Branch dialog */}'));
const m1End = lines.findIndex(l => l.includes('{/* CUSTOM HEROUI ALERT DIALOG: Confirmation before delete'));

console.log('M1 range:', m1Start, 'to', m1End);

// Replace lines from m1Start to m1Start + 7
lines[m1Start + 1] = '  <HeroModal isOpen={showModal} onClose={() => setShowModal(false)} size="xl" className="p-6 border border-divider/30 max-h-[90vh] overflow-y-auto">';
lines[m1Start + 2] = '    <form onSubmit={handleSubmit} className="space-y-4 bg-content1 text-foreground text-left">';
lines.splice(m1Start + 3, 4); // remove old portal and wrapper divs

// Fix m1 close (which is just before m1End)
const m1CloseIdx = lines.findIndex(l => l.includes('{/* CUSTOM HEROUI ALERT DIALOG: Confirmation before delete'));
lines[m1CloseIdx - 4] = '    </form>';
lines[m1CloseIdx - 3] = '  </HeroModal>';
lines.splice(m1CloseIdx - 2, 2);

// 2. Alert dialog
const m2Start = lines.findIndex(l => l.includes('{/* CUSTOM HEROUI ALERT DIALOG: Confirmation before delete'));
const m2End = lines.findIndex(l => l.includes('{/* MODAL: DIRECT ENLIST EMPLOYEE */}'));

const m2Code = `  {/* CUSTOM HEROUI ALERT DIALOG: Confirmation before delete to avoid blocking browser popups */}
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

lines.splice(m2Start, m2End - m2Start, m2Code);

// 3. Enlist Modal
const m3Start = lines.findIndex(l => l.includes('{/* MODAL: DIRECT ENLIST EMPLOYEE */}'));
const m3End = lines.findIndex(l => l.includes('{/* Success toast alert bar */}'));

console.log('M3 range:', m3Start, 'to', m3End);
lines[m3Start + 1] = '  <HeroModal isOpen={showEnlistModal} onClose={() => setShowEnlistModal(false)} size="sm" className="p-6 border border-divider/30 space-y-4">';
lines[m3Start + 2] = '    <form onSubmit={handleEnlistEmployeeSubmit} className="space-y-4 bg-content1 text-foreground text-left">';
lines.splice(m3Start + 3, 4);

const m3CloseIdx = lines.findIndex(l => l.includes('{/* Success toast alert bar */}'));
lines[m3CloseIdx - 4] = '    </form>';
lines[m3CloseIdx - 3] = '  </HeroModal>';
lines.splice(m3CloseIdx - 2, 2);

fs.writeFileSync(branchPath, lines.join('\n'), 'utf8');
console.log('BranchModule modals applied successfully!');

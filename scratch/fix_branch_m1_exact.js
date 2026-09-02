import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const branchPath = path.join(__dirname, '..', 'src', 'components', 'BranchModule.tsx');
let lines = fs.readFileSync(branchPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

const m1Start = lines.findIndex(l => l.includes('{/* MODAL: Edit / Add Corporate Branch dialog */}'));
const headerStart = lines.findIndex(l => l.includes('{isEditMode ? \'Modify Branch Records\' : \'Launch New Store Location\'}'));

console.log('M1 start:', m1Start, 'Header text line:', headerStart);

// Lines from m1Start to headerStart - 2 are the opening divs
lines.splice(m1Start + 1, (headerStart - 2) - (m1Start + 1),
  '  <HeroModal isOpen={showModal} onClose={() => setShowModal(false)} size="xl" className="p-6 border border-divider/30 max-h-[90vh] overflow-y-auto">',
  '    <form onSubmit={handleSubmit} className="space-y-4 bg-content1 text-foreground text-left">'
);

fs.writeFileSync(branchPath, lines.join('\n'), 'utf8');
console.log('Fixed BranchModule M1 start cleanly!');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const branchPath = path.join(__dirname, '..', 'src', 'components', 'BranchModule.tsx');
let content = fs.readFileSync(branchPath, 'utf8').replace(/\r\n/g, '\n');

// Fix M1 top
content = content.replace(
  `  <HeroModal isOpen={showModal} onClose={() => setShowModal(false)} size="xl" className="p-6 border border-divider/30 max-h-[90vh] overflow-y-auto">
    <form onSubmit={handleSubmit} className="space-y-4 bg-content1 text-foreground text-left">
 >`,
  `  <HeroModal isOpen={showModal} onClose={() => setShowModal(false)} size="xl" className="p-6 border border-divider/30 max-h-[90vh] overflow-y-auto">
    <form onSubmit={handleSubmit} className="space-y-4 bg-content1 text-foreground text-left">`
);

// Fix M1 bottom
content = content.replace(
  `  </form>
    </form>
  </HeroModal>`,
  `    </form>
  </HeroModal>`
);

// Fix M3 top
content = content.replace(
  `  <HeroModal isOpen={showEnlistModal} onClose={() => setShowEnlistModal(false)} size="sm" className="p-6 border border-divider/30 space-y-4">
    <form onSubmit={handleEnlistEmployeeSubmit} className="space-y-4 bg-content1 text-foreground text-left">
 >`,
  `  <HeroModal isOpen={showEnlistModal} onClose={() => setShowEnlistModal(false)} size="sm" className="p-6 border border-divider/30 space-y-4">
    <form onSubmit={handleEnlistEmployeeSubmit} className="space-y-4 bg-content1 text-foreground text-left">`
);

// Fix M3 bottom
content = content.replace(
  `      </form>
    </div>,
    </form>
  </HeroModal>`,
  `    </form>
  </HeroModal>`
);

fs.writeFileSync(branchPath, content, 'utf8');
console.log('Fixed BranchModule syntax!');

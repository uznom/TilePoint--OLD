import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const archPath = path.join(__dirname, '..', 'src', 'components', 'ArchivesModule.tsx');
let content = fs.readFileSync(archPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add HeroModal import
content = content.replace("import { createPortal } from 'react-dom';\n", "");
content = content.replace(
  "import { HeroTable } from './common/ui/HeroTable';",
  "import { HeroModal } from './common/ui/HeroModal';\nimport { HeroTable } from './common/ui/HeroTable';"
);

// 2. Modal 1: Single Purge
const m1Old = `      {/* MODAL: SINGLE PURGE CONFIRMATION */}
      {itemToPurge && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
          {/* Full-Screen Uniform Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
            onClick={() => setItemToPurge(null)} 
          />
          <div className="relative bg-content1 rounded-2xl p-6 max-w-md w-full border border-divider/30 shadow-2xl space-y-4 z-10">`;

const m1New = `      {/* MODAL: SINGLE PURGE CONFIRMATION */}
      <HeroModal
        isOpen={Boolean(itemToPurge)}
        onClose={() => setItemToPurge(null)}
        size="sm"
        className="p-6 border border-divider/30 space-y-4"
      >`;

content = content.replace(m1Old, m1New);
content = content.replace(
  `          </div>
        </div>,
        document.body
      )}

      {/* MODAL: BULK RESTORE CONFIRMATION */}`,
  `      </HeroModal>

      {/* MODAL: BULK RESTORE CONFIRMATION */}`
);

// 3. Modal 2: Bulk Restore
const m2Old = `      {/* MODAL: BULK RESTORE CONFIRMATION */}
      {showBulkRestoreModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
          {/* Full-Screen Uniform Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
            onClick={() => setShowBulkRestoreModal(false)} 
          />
          <div className="relative bg-content1 rounded-2xl p-6 max-w-md w-full border border-divider/30 shadow-2xl space-y-4 z-10">`;

const m2New = `      {/* MODAL: BULK RESTORE CONFIRMATION */}
      <HeroModal
        isOpen={showBulkRestoreModal}
        onClose={() => setShowBulkRestoreModal(false)}
        size="sm"
        className="p-6 border border-divider/30 space-y-4"
      >`;

content = content.replace(m2Old, m2New);
content = content.replace(
  `          </div>
        </div>,
        document.body
      )}

      {/* MODAL: BULK PURGE CONFIRMATION */}`,
  `      </HeroModal>

      {/* MODAL: BULK PURGE CONFIRMATION */}`
);

// 4. Modal 3: Bulk Purge
const m3Old = `      {/* MODAL: BULK PURGE CONFIRMATION */}
      {showBulkPurgeModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
          {/* Full-Screen Uniform Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
            onClick={() => setShowBulkPurgeModal(false)} 
          />
          <div className="relative bg-content1 rounded-2xl p-6 max-w-md w-full border border-divider/30 shadow-2xl space-y-4 z-10">`;

const m3New = `      {/* MODAL: BULK PURGE CONFIRMATION */}
      <HeroModal
        isOpen={showBulkPurgeModal}
        onClose={() => setShowBulkPurgeModal(false)}
        size="sm"
        className="p-6 border border-divider/30 space-y-4"
      >`;

content = content.replace(m3Old, m3New);
content = content.replace(
  `          </div>
        </div>,
        document.body
      )}
    </div>
  );
};`,
  `      </HeroModal>
    </div>
  );
};`
);

fs.writeFileSync(archPath, content, 'utf8');
console.log('Migrated ArchivesModule modals to HeroModal!');

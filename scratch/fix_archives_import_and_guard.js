import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const archPath = path.join(__dirname, '..', 'src', 'components', 'ArchivesModule.tsx');
let content = fs.readFileSync(archPath, 'utf8').replace(/\r\n/g, '\n');

// Add HeroModal import
if (!content.includes("import { HeroModal }")) {
  content = "import { HeroModal } from './common/ui/HeroModal';\n" + content;
}

// Wrap single purge with check
content = content.replace(
  `      {/* MODAL: SINGLE PURGE CONFIRMATION */}
      <HeroModal
        isOpen={Boolean(itemToPurge)}
        onClose={() => setItemToPurge(null)}
        size="sm"
        className="p-6 border border-divider/30 space-y-4"
      >`,
  `      {/* MODAL: SINGLE PURGE CONFIRMATION */}
      {itemToPurge && (
        <HeroModal
          isOpen={Boolean(itemToPurge)}
          onClose={() => setItemToPurge(null)}
          size="sm"
          className="p-6 border border-divider/30 space-y-4"
        >`
);

content = content.replace(
  `            </div>
          </div>
      </HeroModal>

      {/* MODAL: BULK RESTORE CONFIRMATION */}`,
  `            </div>
          </div>
        </HeroModal>
      )}

      {/* MODAL: BULK RESTORE CONFIRMATION */}`
);

fs.writeFileSync(archPath, content, 'utf8');
console.log('Fixed ArchivesModule imports and itemToPurge null guard!');

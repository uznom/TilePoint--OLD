import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modalsDir = path.join(__dirname, '..', 'src', 'components', 'procurement', 'modals');

const modalConfigs = {
  'BrandModal.tsx': { size: 'md' },
  'SupplierModal.tsx': { size: 'md' },
  'QuickProductModal.tsx': { size: 'lg' },
  'ConsolidationSourcingModal.tsx': { size: 'lg' },
  'PoDetailsModal.tsx': { size: '2xl' },
  'SupplierProfileModal.tsx': { size: '3xl' },
  'ReceivePoModal.tsx': { size: '3xl' },
  'CreateEditPoModal.tsx': { size: '4xl' }
};

Object.entries(modalConfigs).forEach(([filename, cfg]) => {
  const filePath = path.join(modalsDir, filename);
  let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

  // Replace import
  content = content.replace('import { createPortal } from "react-dom";', 'import { HeroModal } from "../../common/ui/HeroModal";');
  if (!content.includes('import { HeroModal }')) {
    content = 'import { HeroModal } from "../../common/ui/HeroModal";\n' + content;
  }

  // Remove return createPortal(...
  // Find return createPortal or return ( ...
  const lines = content.split('\n');
  const returnIdx = lines.findIndex(l => l.includes('return createPortal(') || l.includes('return ('));
  const headerStartIdx = lines.findIndex(l => l.includes('<div className="flex items-center justify-between border-b'));

  if (returnIdx >= 0 && headerStartIdx > returnIdx) {
    const beforeReturn = lines.slice(0, returnIdx).join('\n');
    // Find the end before `export` or EOF
    let innerLines = lines.slice(headerStartIdx);
    
    // Clean trailing portal wrappers at bottom
    let innerContent = innerLines.join('\n');
    innerContent = innerContent.replace(/\s*<\/div>\s*<\/div>,\s*document\.body\s*\);\s*};?\s*$/, '');
    innerContent = innerContent.replace(/\s*<\/div>\s*<\/div>,\s*document\.body,\s*\);\s*};?\s*$/, '');
    innerContent = innerContent.replace(/\s*<\/HeroModal>\s*\);\s*};?\s*$/, '');
    innerContent = innerContent.replace(/\s*<\/div>\s*<\/HeroModal>\s*\);\s*};?\s*$/, '');

    // Now reconstruct
    const newModalCode = `${beforeReturn}
  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="${cfg.size}" className="p-6 sm:p-7 space-y-6 border border-divider/40">
      ${innerContent.trim()}
    </HeroModal>
  );
};
`;
    fs.writeFileSync(filePath, newModalCode, 'utf8');
    console.log(`Cleanly converted ${filename} to HeroModal with size ${cfg.size}`);
  }
});

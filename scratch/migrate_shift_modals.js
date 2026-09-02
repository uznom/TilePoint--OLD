import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const shiftPath = path.join(__dirname, '..', 'src', 'components', 'ShiftModule.tsx');
let content = fs.readFileSync(shiftPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Imports
content = content.replace("import { createPortal } from 'react-dom';\n", "");
if (!content.includes("import { HeroModal }")) {
  content = "import { HeroModal } from './common/ui/HeroModal';\n" + content;
}

// 2. X Report
const xOld = `  {/* X Report dialog OVERLAY */}
  {showXReport && activeShift && shiftStats && typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" onClick={() => setShowXReport(false)} />
      <div className={\`relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl space-y-4 text-xs select-none bg-content1 text-foreground bir-receipt-container \${receiptFontClass}\`}>`;

const xNew = `  {/* X Report dialog OVERLAY */}
  {showXReport && activeShift && shiftStats && (
    <HeroModal
      isOpen={showXReport}
      onClose={() => setShowXReport(false)}
      size="sm"
      className={\`p-6 border border-divider/30 space-y-4 text-xs select-none bg-content1 text-foreground bir-receipt-container \${receiptFontClass}\`}
    >`;

content = content.replace(xOld, xNew);
content = content.replace(
  `      </div>
    </div>,
    document.body
  )}

  {/* Z Report dialog OVERLAY */}`,
  `    </HeroModal>
  )}

  {/* Z Report dialog OVERLAY */}`
);

// 3. Z Report
const zOld = `  {/* Z Report dialog OVERLAY */}
  {showZReport && activeShift && shiftStats && typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" onClick={() => setShowZReport(false)} />
      <div className={\`relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl space-y-4 text-xs font-mono select-none bg-content1 text-foreground bir-receipt-container \${receiptFontClass}\`}>`;

const zNew = `  {/* Z Report dialog OVERLAY */}
  {showZReport && activeShift && shiftStats && (
    <HeroModal
      isOpen={showZReport}
      onClose={() => setShowZReport(false)}
      size="sm"
      className={\`p-6 border border-divider/30 space-y-4 text-xs font-mono select-none bg-content1 text-foreground bir-receipt-container \${receiptFontClass}\`}
    >`;

content = content.replace(zOld, zNew);
content = content.replace(
  `      </div>
    </div>,
    document.body
  )}
</div>
  );
};`,
  `    </HeroModal>
  )}
</div>
  );
};`
);

fs.writeFileSync(shiftPath, content, 'utf8');
console.log('Migrated ShiftModule report modals to HeroModal!');

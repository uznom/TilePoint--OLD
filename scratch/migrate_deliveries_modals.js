import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const delPath = path.join(__dirname, '..', 'src', 'components', 'DeliveriesModule.tsx');
let lines = fs.readFileSync(delPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

// 1. Add HeroModal import and remove createPortal
lines = lines.filter(l => !l.includes("import { createPortal } from 'react-dom';"));
if (!lines.some(l => l.includes("import { HeroModal }"))) {
  lines.unshift("import { HeroModal } from './common/ui/HeroModal';");
}

// 2. Modal 1: Delivery Receipt Modal
const m1Start = lines.findIndex(l => l.includes('{/* DELIVERY RECEIPT PRINT MODAL */}'));
const m2Start = lines.findIndex(l => l.includes('{/* SCHEDULE POS DELIVERY MODAL */}'));
const endDiv = lines.length - 3;

console.log('M1 start:', m1Start, 'M2 start:', m2Start, 'End div:', endDiv);

// Extract inner M1
const m1Inner = lines.slice(m1Start + 7, m2Start - 4).join('\n');
const m1Modal = `  {/* DELIVERY RECEIPT PRINT MODAL */}
  {showDeliveryReceiptModal && activeDelivery && (
    <HeroModal
      isOpen={showDeliveryReceiptModal}
      onClose={() => setShowDeliveryReceiptModal(false)}
      size="lg"
      className="p-6 border border-divider/30 max-h-[90vh] overflow-y-auto flex flex-col justify-between"
    >
${m1Inner}
    </HeroModal>
  )}`;

// Extract inner M2
const m2Inner = lines.slice(m2Start + 7, endDiv - 3).join('\n');
const m2Modal = `  {/* SCHEDULE POS DELIVERY MODAL */}
  <HeroModal
    isOpen={showSchedulePosModal}
    onClose={() => setShowSchedulePosModal(false)}
    size="lg"
    className="p-6 border border-divider/30 text-left space-y-4 max-h-[90vh] overflow-y-auto"
  >
${m2Inner}
  </HeroModal>`;

const newCode = `${m1Modal}\n\n${m2Modal}\n\n`;
lines.splice(m1Start, (endDiv - 1) - m1Start, newCode);

fs.writeFileSync(delPath, lines.join('\n'), 'utf8');
console.log('Migrated DeliveriesModule modals to HeroModal!');

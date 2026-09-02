import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const delPath = path.join(__dirname, '..', 'src', 'components', 'DeliveriesModule.tsx');
let content = fs.readFileSync(delPath, 'utf8').replace(/\r\n/g, '\n');

content = content.replace(
  `  <HeroModal\n    isOpen={showSchedulePosModal}\n    onClose={() => setShowSchedulePosModal(false)}\n    size="lg"\n    className="p-6 border border-divider/30 text-left space-y-4 max-h-[90vh] overflow-y-auto"\n  >\n      <div className="relative w-full max-w-lg rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground text-left space-y-4 max-h-[90vh] overflow-y-auto">`,
  `  <HeroModal\n    isOpen={showSchedulePosModal}\n    onClose={() => setShowSchedulePosModal(false)}\n    size="lg"\n    className="p-6 border border-divider/30 text-left space-y-4 max-h-[90vh] overflow-y-auto"\n  >`
);

fs.writeFileSync(delPath, content, 'utf8');
console.log('Removed leftover div in DeliveriesModule.tsx!');

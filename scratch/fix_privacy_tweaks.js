import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const privPath = path.join(__dirname, '..', 'src', 'components', 'PrivacyAccessibilityHub.tsx');
let content = fs.readFileSync(privPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Remove duplicate div in Modal 1
content = content.replace(
  `    className="w-full max-w-[95vw] md:max-w-7xl h-[90vh] md:h-[740px] md:max-h-[85vh] flex flex-col bg-content1 border border-divider/40 rounded-2xl p-0 overflow-hidden shadow-2xl text-foreground"\n  >\n  <div className="relative w-full max-w-[95vw] md:max-w-7xl h-[90vh] md:h-[740px] md:max-h-[85vh] flex flex-col bg-content1 border border-divider rounded-large shadow-small text-foreground rounded-2xl p-0 overflow-hidden border-divider/40 shadow-2xl animate-scale-up z-10">`,
  `    className="w-full max-w-[95vw] md:max-w-7xl h-[90vh] md:h-[740px] md:max-h-[85vh] flex flex-col bg-content1 border border-divider/40 rounded-2xl p-0 overflow-hidden shadow-2xl text-foreground"\n  >`
);

// 2. Add header div in Modal 4
content = content.replace(
  `    className="p-6 border border-divider/30 space-y-5 max-h-[90vh] overflow-hidden flex flex-col text-left"\n  >\n <div className="flex items-center gap-2.5">`,
  `    className="p-6 border border-divider/30 space-y-5 max-h-[90vh] overflow-hidden flex flex-col text-left"\n  >\n    <div className="flex justify-between items-center border-b border-divider/15 pb-4 shrink-0">\n <div className="flex items-center gap-2.5">`
);

fs.writeFileSync(privPath, content, 'utf8');
console.log('Fixed PrivacyAccessibilityHub tweaks!');

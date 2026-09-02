import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const branchPath = path.join(__dirname, '..', 'src', 'components', 'BranchModule.tsx');
let content = fs.readFileSync(branchPath, 'utf8').replace(/\r\n/g, '\n');

content = content.replace(
  `  <HeroModal isOpen={showModal} onClose={() => setShowModal(false)} size="xl" className="p-6 border border-divider/30 max-h-[90vh] overflow-y-auto">
    <form onSubmit={handleSubmit} className="space-y-4 bg-content1 text-foreground text-left">
 <h3 className="text-base font-bold text-primary flex items-center gap-2">`,
  `  <HeroModal isOpen={showModal} onClose={() => setShowModal(false)} size="xl" className="p-6 border border-divider/30 max-h-[90vh] overflow-y-auto">
    <form onSubmit={handleSubmit} className="space-y-4 bg-content1 text-foreground text-left">
      <div className="flex justify-between items-center border-b border-divider/20 pb-2.5 flex-shrink-0">
        <h3 className="text-base font-bold text-primary flex items-center gap-2">`
);

fs.writeFileSync(branchPath, content, 'utf8');
console.log('Inserted header div in BranchModule.tsx!');

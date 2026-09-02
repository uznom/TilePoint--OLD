import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const onbPath = path.join(__dirname, '..', 'src', 'components', 'OnboardingSetupWizard.tsx');
let content = fs.readFileSync(onbPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Imports
content = content.replace("import { createPortal } from 'react-dom';\n", "");
content = content.replace(
  "import { HeroButton } from './common/ui';",
  "import { HeroButton, HeroModal } from './common/ui';"
);

// 2. Open HeroModal
const openOld = `  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans select-none text-left animate-fade-in">
      {/* Full-Screen Uniform Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-2xl bg-content1 border border-divider/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-foreground max-h-[90vh] overflow-y-auto z-10">`;

const openNew = `  return (
    <HeroModal
      isOpen={true}
      onClose={onClose || (() => {})}
      size="2xl"
      zIndex={9999}
      className="p-6 sm:p-8 border border-divider/30 max-h-[90vh] overflow-y-auto text-left select-none"
    >`;

content = content.replace(openOld, openNew);

// 3. Close HeroModal
const closeOld = `      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};`;

const closeNew = `    </HeroModal>
  );
};`;

content = content.replace(closeOld, closeNew);

fs.writeFileSync(onbPath, content, 'utf8');
console.log('Migrated OnboardingSetupWizard to HeroModal!');

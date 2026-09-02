import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const privPath = path.join(__dirname, '..', 'src', 'components', 'PrivacyAccessibilityHub.tsx');
let content = fs.readFileSync(privPath, 'utf8').replace(/\r\n/g, '\n');

content = content.replace(
  `  <span>Print Reference Manual</span>\n  </button>\n  </div>\n   </HeroModal>`,
  `  <span>Print Reference Manual</span>\n  </button>\n  </div>\n  </div>\n  </HeroModal>`
);

fs.writeFileSync(privPath, content, 'utf8');
console.log('Inserted footer closing div in PrivacyAccessibilityHub.tsx!');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const archPath = path.join(__dirname, '..', 'src', 'components', 'ArchivesModule.tsx');
let content = fs.readFileSync(archPath, 'utf8').replace(/\r\n/g, '\n');

content = content.replace(
  `            </div>\n      </HeroModal>\n\n      {/* MODAL: BULK RESTORE CONFIRMATION */}`,
  `            </div>\n      </HeroModal>\n      )}\n\n      {/* MODAL: BULK RESTORE CONFIRMATION */}`
);

fs.writeFileSync(archPath, content, 'utf8');
console.log('Fixed itemToPurge closing bracket in ArchivesModule.tsx!');

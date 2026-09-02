import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transPath = path.join(__dirname, '..', 'src', 'components', 'TransmittalModule.tsx');
let content = fs.readFileSync(transPath, 'utf8').replace(/\r\n/g, '\n');

content = content.replace(
  `  </div>\n  </div>\n    </HeroModal>`,
  `  </div>\n    </HeroModal>`
);

fs.writeFileSync(transPath, content, 'utf8');
console.log('Removed extra closing div in TransmittalModule.tsx!');

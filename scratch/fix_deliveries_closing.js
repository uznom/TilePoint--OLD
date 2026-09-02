import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const delPath = path.join(__dirname, '..', 'src', 'components', 'DeliveriesModule.tsx');
let content = fs.readFileSync(delPath, 'utf8').replace(/\r\n/g, '\n');

content = content.replace(
  `        </form>\n      </div>\n    </div>,\n    document.body\n  </HeroModal>`,
  `        </form>\n  </HeroModal>`
);

fs.writeFileSync(delPath, content, 'utf8');
console.log('Fixed DeliveriesModule closing tags!');

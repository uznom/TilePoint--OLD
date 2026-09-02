import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const shiftPath = path.join(__dirname, '..', 'src', 'components', 'ShiftModule.tsx');
let content = fs.readFileSync(shiftPath, 'utf8').replace(/\r\n/g, '\n');

content = content.replace(
  `  </div>\n  </div>\n    </HeroModal>`,
  `  </div>\n    </HeroModal>`
);
content = content.replace(
  `  </div>\n  </div>\n    </HeroModal>`,
  `  </div>\n    </HeroModal>`
);

fs.writeFileSync(shiftPath, content, 'utf8');
console.log('Fixed extra closing divs in ShiftModule.tsx!');

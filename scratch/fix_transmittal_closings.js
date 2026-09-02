import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transPath = path.join(__dirname, '..', 'src', 'components', 'TransmittalModule.tsx');
let content = fs.readFileSync(transPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Fix Modal 1
content = content.replace(
  `  </div>\n  </form>\n  </div>,\n   </HeroModal>`,
  `  </div>\n  </form>\n  </HeroModal>`
);

// 2. Fix Modal 2
content = content.replace(
  `  </div>\n  </div>\n  </div>,\n  document.body\n  )}`,
  `  </div>\n    </HeroModal>\n  )}`
);

// 3. Fix Modal 3
content = content.replace(
  `  </div>\n  </div>\n   </HeroModal>`,
  `  </div>\n  </HeroModal>`
);

fs.writeFileSync(transPath, content, 'utf8');
console.log('Fixed TransmittalModule closing tags!');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modalsDir = path.join(__dirname, '..', 'src', 'components', 'procurement', 'modals');

fs.readdirSync(modalsDir).forEach(file => {
  if (!file.endsWith('.tsx')) return;
  const p = path.join(modalsDir, file);
  let content = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

  content = content.replace(
    /      <\/div>\n    <\/div>,\n    document\.body\n  \);/,
    '    </HeroModal>\n  );'
  );
  content = content.replace(
    /      <\/div>\n    <\/div>,\n    document\.body,\n  \);/,
    '    </HeroModal>\n  );'
  );

  fs.writeFileSync(p, content, 'utf8');
  console.log('Fixed closing tags in', file);
});

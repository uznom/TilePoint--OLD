import fs from 'fs';

const content = fs.readFileSync('src/components/PrivacyAccessibilityHub.tsx', 'utf8').replace(/\r\n/g, '\n');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('createPortal(') || l.includes('document.body')) {
    console.log(`${idx + 1}: ${l}`);
  }
});

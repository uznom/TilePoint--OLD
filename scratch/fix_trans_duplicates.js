import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transPath = path.join(__dirname, '..', 'src', 'components', 'TransmittalModule.tsx');
let content = fs.readFileSync(transPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Remove duplicate form in Modal 1
content = content.replace(
  `    <form\n      onSubmit={handleCreateTrans}\n      className="space-y-4 text-left"\n    >\n <form`,
  ' <form'
);

// 2. Remove duplicate wrapper div in Modal 2
content = content.replace(
  `      className="p-6 border border-divider/30 space-y-4 text-left flex flex-col max-h-[90vh]"\n    >\n <div className="relative w-full max-w-md rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl bg-content1 text-foreground space-y-4 text-left flex flex-col max-h-[90vh]">`,
  `      className="p-6 border border-divider/30 space-y-4 text-left flex flex-col max-h-[90vh]"\n    >`
);

fs.writeFileSync(transPath, content, 'utf8');
console.log('Fixed duplicate elements in TransmittalModule.tsx!');

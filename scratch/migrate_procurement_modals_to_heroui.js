import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modalsDir = path.join(__dirname, '..', 'src', 'components', 'procurement', 'modals');

// 1. SupplierModal.tsx
const supPath = path.join(modalsDir, 'SupplierModal.tsx');
let sup = fs.readFileSync(supPath, 'utf8').replace(/\r\n/g, '\n');
sup = sup.replace('import { createPortal } from "react-dom";', 'import { HeroModal } from "../../common/ui/HeroModal";');
sup = sup.replace(
  /  if \(!isOpen \|\| typeof document === "undefined"\) return null;\n\n  return createPortal\(\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">\n      <div\n        className="fixed inset-0 bg-black\/60 dark:bg-black\/75 backdrop-blur-md transition-opacity"\n        onClick={onClose}\n      \/>\n      <div className="relative bg-content1 border border-divider\/40 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl z-10 text-left space-y-6">/,
  `  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="md" className="p-6 sm:p-7 space-y-6 border border-divider/40">`
);
sup = sup.replace(
  /      <\/div>\n    <\/div>,\n    document\.body,\n  \);/,
  `    </HeroModal>`
);
fs.writeFileSync(supPath, sup, 'utf8');

// 2. BrandModal.tsx
const brandPath = path.join(modalsDir, 'BrandModal.tsx');
let brand = fs.readFileSync(brandPath, 'utf8').replace(/\r\n/g, '\n');
brand = brand.replace('import { createPortal } from "react-dom";', 'import { HeroModal } from "../../common/ui/HeroModal";');
brand = brand.replace(
  /  if \(!isOpen \|\| typeof document === "undefined"\) return null;\n\n  return createPortal\(\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">\n      <div\n        className="fixed inset-0 bg-black\/60 dark:bg-black\/75 backdrop-blur-md transition-opacity"\n        onClick={onClose}\n      \/>\n      <div className="relative bg-content1 border border-divider\/40 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl z-10 text-left space-y-6">/,
  `  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="md" className="p-6 sm:p-7 space-y-6 border border-divider/40">`
);
brand = brand.replace(
  /      <\/div>\n    <\/div>,\n    document\.body,\n  \);/,
  `    </HeroModal>`
);
fs.writeFileSync(brandPath, brand, 'utf8');

// 3. QuickProductModal.tsx
const quickPath = path.join(modalsDir, 'QuickProductModal.tsx');
let quick = fs.readFileSync(quickPath, 'utf8').replace(/\r\n/g, '\n');
quick = quick.replace('import { createPortal } from "react-dom";', 'import { HeroModal } from "../../common/ui/HeroModal";');
quick = quick.replace(
  /  if \(!isOpen \|\| typeof document === "undefined"\) return null;\n\n  return createPortal\(\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">\n      <div\n        className="fixed inset-0 bg-black\/60 dark:bg-black\/75 backdrop-blur-md transition-opacity"\n        onClick={onClose}\n      \/>\n      <div className="relative bg-content1 border border-divider\/40 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl z-10 text-left space-y-6">/,
  `  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="lg" className="p-6 sm:p-7 space-y-6 border border-divider/40">`
);
quick = quick.replace(
  /      <\/div>\n    <\/div>,\n    document\.body,\n  \);/,
  `    </HeroModal>`
);
fs.writeFileSync(quickPath, quick, 'utf8');

// 4. ConsolidationSourcingModal.tsx
const conPath = path.join(modalsDir, 'ConsolidationSourcingModal.tsx');
let con = fs.readFileSync(conPath, 'utf8').replace(/\r\n/g, '\n');
con = con.replace('import { createPortal } from "react-dom";', 'import { HeroModal } from "../../common/ui/HeroModal";');
con = con.replace(
  /  if \(!isOpen \|\| typeof document === "undefined"\) return null;\n\n  return createPortal\(\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">\n      <div\n        className="fixed inset-0 bg-black\/60 dark:bg-black\/75 backdrop-blur-md transition-opacity"\n        onClick={onClose}\n      \/>\n      <div className="relative bg-content1 border border-divider\/40 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl z-10 text-left space-y-6">/,
  `  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="lg" className="p-6 sm:p-7 space-y-6 border border-divider/40">`
);
con = con.replace(
  /      <\/div>\n    <\/div>,\n    document\.body,\n  \);/,
  `    </HeroModal>`
);
fs.writeFileSync(conPath, con, 'utf8');

// 5. PoDetailsModal.tsx
const podPath = path.join(modalsDir, 'PoDetailsModal.tsx');
let pod = fs.readFileSync(podPath, 'utf8').replace(/\r\n/g, '\n');
pod = pod.replace('import { createPortal } from "react-dom";', 'import { HeroModal } from "../../common/ui/HeroModal";');
pod = pod.replace(
  /  if \(!isOpen \|\| !po \|\| typeof document === "undefined"\) return null;\n\n  return createPortal\(\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">\n      <div\n        className="fixed inset-0 bg-black\/60 dark:bg-black\/75 backdrop-blur-md transition-opacity"\n        onClick={onClose}\n      \/>\n      <div className="relative bg-content1 border border-divider\/40 rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl z-10 text-left space-y-6 max-h-\[90vh\] flex flex-col">/,
  `  if (!po) return null;

  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="2xl" className="p-6 sm:p-7 space-y-6 border border-divider/40 max-h-[90vh] flex flex-col">`
);
pod = pod.replace(
  /      <\/div>\n    <\/div>,\n    document\.body,\n  \);/,
  `    </HeroModal>`
);
fs.writeFileSync(podPath, pod, 'utf8');

// 6. SupplierProfileModal.tsx
const profPath = path.join(modalsDir, 'SupplierProfileModal.tsx');
let prof = fs.readFileSync(profPath, 'utf8').replace(/\r\n/g, '\n');
prof = prof.replace('import { createPortal } from "react-dom";', 'import { HeroModal } from "../../common/ui/HeroModal";');
prof = prof.replace(
  /  if \(!isOpen \|\| !supplier \|\| typeof document === "undefined"\) return null;\n\n  return createPortal\(\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">\n      <div\n        className="fixed inset-0 bg-black\/60 dark:bg-black\/75 backdrop-blur-md transition-opacity"\n        onClick={onClose}\n      \/>\n      <div className="relative bg-content1 border border-divider\/40 rounded-3xl p-6 sm:p-7 max-w-3xl w-full shadow-2xl z-10 text-left space-y-6 max-h-\[90vh\] flex flex-col">/,
  `  if (!supplier) return null;

  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="3xl" className="p-6 sm:p-7 space-y-6 border border-divider/40 max-h-[90vh] flex flex-col">`
);
prof = prof.replace(
  /      <\/div>\n    <\/div>,\n    document\.body,\n  \);/,
  `    </HeroModal>`
);
fs.writeFileSync(profPath, prof, 'utf8');

// 7. ReceivePoModal.tsx
const recPath = path.join(modalsDir, 'ReceivePoModal.tsx');
let rec = fs.readFileSync(recPath, 'utf8').replace(/\r\n/g, '\n');
rec = rec.replace('import { createPortal } from "react-dom";', 'import { HeroModal } from "../../common/ui/HeroModal";');
rec = rec.replace(
  /  if \(!isOpen \|\| !po \|\| typeof document === "undefined"\) return null;\n\n  return createPortal\(\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">\n      <div\n        className="fixed inset-0 bg-black\/60 dark:bg-black\/75 backdrop-blur-md transition-opacity"\n        onClick={onClose}\n      \/>\n      <div className="relative bg-content1 border border-divider\/40 rounded-3xl p-6 sm:p-7 max-w-4xl w-full shadow-2xl z-10 text-left space-y-6 max-h-\[90vh\] flex flex-col">/,
  `  if (!po) return null;

  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="3xl" className="p-6 sm:p-7 space-y-6 border border-divider/40 max-h-[90vh] flex flex-col">`
);
rec = rec.replace(
  /      <\/div>\n    <\/div>,\n    document\.body,\n  \);/,
  `    </HeroModal>`
);
fs.writeFileSync(recPath, rec, 'utf8');

// 8. CreateEditPoModal.tsx
const crPath = path.join(modalsDir, 'CreateEditPoModal.tsx');
let cr = fs.readFileSync(crPath, 'utf8').replace(/\r\n/g, '\n');
cr = cr.replace('import { createPortal } from "react-dom";', 'import { HeroModal } from "../../common/ui/HeroModal";');
cr = cr.replace(
  /  if \(!isOpen \|\| typeof document === "undefined"\) return null;\n\n  return createPortal\(\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">\n      <div\n        className="fixed inset-0 bg-black\/60 dark:bg-black\/75 backdrop-blur-md transition-opacity"\n        onClick={onClose}\n      \/>\n      <div className="relative bg-content1 border border-divider\/40 rounded-3xl p-6 sm:p-7 max-w-4xl w-full shadow-2xl z-10 text-left space-y-6 max-h-\[92vh\] flex flex-col">/,
  `  return (
    <HeroModal isOpen={isOpen} onClose={onClose} size="4xl" className="p-6 sm:p-7 space-y-6 border border-divider/40 max-h-[92vh] flex flex-col">`
);
cr = cr.replace(
  /      <\/div>\n    <\/div>,\n    document\.body,\n  \);/,
  `    </HeroModal>`
);
fs.writeFileSync(crPath, cr, 'utf8');

console.log('Migrated all 8 procurement modals to HeroModal!');

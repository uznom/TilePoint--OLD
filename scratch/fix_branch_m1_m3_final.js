import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const branchPath = path.join(__dirname, '..', 'src', 'components', 'BranchModule.tsx');
let content = fs.readFileSync(branchPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Fix Modal 1 start
const m1Old = `  {/* MODAL: Edit / Add Corporate Branch dialog */}
  {showModal && typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity" onClick={() => setShowModal(false)} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl space-y-4 bg-content1 text-foreground"
      >`;

const m1New = `  {/* MODAL: Edit / Add Corporate Branch dialog */}
  <HeroModal
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    size="xl"
    className="p-6 border border-divider/30 max-h-[90vh] overflow-y-auto"
  >
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-content1 text-foreground text-left"
    >`;

content = content.replace(m1Old, m1New);

// 2. Fix Modal 3 leftover lines
const m3Leftover = `    <form
      onSubmit={handleEnlistEmployeeSubmit}
      className="space-y-4 bg-content1 text-foreground text-left"
    >
        className="relative w-full max-w-sm rounded-2xl border border-divider/30 p-6 z-20 shadow-2xl space-y-4 bg-content1 text-foreground"
      >`;

const m3Clean = `    <form
      onSubmit={handleEnlistEmployeeSubmit}
      className="space-y-4 bg-content1 text-foreground text-left"
    >`;

content = content.replace(m3Leftover, m3Clean);

fs.writeFileSync(branchPath, content, 'utf8');
console.log('Fixed BranchModule M1 and M3 perfectly!');

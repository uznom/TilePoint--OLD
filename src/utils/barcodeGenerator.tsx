import React from 'react';

// Code 128 Pattern Widths table (indices 0 to 106)
// Each array represents alternating bar and space widths in modules
const CODE128_PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], // 0
  [2, 2, 2, 1, 2, 2], // 1
  [2, 2, 2, 2, 2, 1], // 2
  [1, 2, 1, 2, 2, 3], // 3
  [1, 2, 1, 3, 2, 2], // 4
  [1, 3, 1, 2, 2, 2], // 5
  [1, 2, 2, 2, 1, 3], // 6
  [1, 2, 2, 3, 1, 2], // 7
  [1, 3, 2, 2, 1, 2], // 8
  [2, 2, 1, 2, 1, 3], // 9
  [2, 2, 1, 3, 1, 2], // 10
  [2, 3, 1, 2, 1, 2], // 11
  [1, 1, 2, 2, 3, 2], // 12
  [1, 2, 2, 1, 3, 2], // 13
  [1, 2, 2, 2, 3, 1], // 14
  [1, 1, 3, 2, 2, 2], // 15
  [1, 2, 3, 1, 2, 2], // 16
  [1, 2, 3, 2, 2, 1], // 17
  [2, 2, 3, 2, 1, 1], // 18
  [2, 2, 1, 1, 3, 2], // 19
  [2, 2, 1, 2, 3, 1], // 20
  [2, 1, 3, 2, 1, 2], // 21
  [2, 2, 3, 1, 1, 2], // 22
  [3, 1, 2, 1, 3, 1], // 23
  [3, 1, 1, 2, 2, 2], // 24
  [3, 2, 1, 1, 2, 2], // 25
  [3, 2, 1, 2, 2, 1], // 26
  [3, 1, 2, 2, 1, 2], // 27
  [3, 2, 2, 1, 1, 2], // 28
  [3, 2, 2, 2, 1, 1], // 29
  [2, 1, 2, 1, 2, 3], // 30
  [2, 1, 2, 3, 2, 1], // 31
  [2, 3, 2, 1, 2, 1], // 32
  [1, 1, 1, 3, 2, 3], // 33
  [1, 3, 1, 1, 2, 3], // 34
  [1, 3, 1, 3, 2, 1], // 35
  [1, 1, 2, 3, 1, 3], // 36
  [1, 3, 2, 1, 1, 3], // 37
  [1, 3, 2, 3, 1, 1], // 38
  [2, 1, 1, 3, 1, 3], // 39
  [2, 3, 1, 1, 1, 3], // 40
  [2, 3, 1, 3, 1, 1], // 41
  [1, 1, 2, 1, 3, 3], // 42
  [1, 1, 2, 3, 3, 1], // 43
  [1, 3, 2, 1, 3, 1], // 44
  [1, 1, 3, 1, 2, 3], // 45
  [1, 1, 3, 3, 2, 1], // 46
  [1, 3, 3, 1, 2, 1], // 47
  [3, 1, 3, 1, 2, 1], // 48
  [2, 1, 1, 3, 3, 1], // 49
  [2, 3, 1, 1, 3, 1], // 50
  [2, 1, 3, 1, 1, 3], // 51
  [2, 1, 3, 3, 1, 1], // 52
  [2, 1, 3, 1, 3, 1], // 53
  [3, 1, 1, 1, 2, 3], // 54
  [3, 1, 1, 3, 2, 1], // 55
  [3, 3, 1, 1, 2, 1], // 56
  [3, 1, 2, 1, 1, 3], // 57
  [3, 1, 2, 3, 1, 1], // 58
  [3, 3, 2, 1, 1, 1], // 59
  [3, 1, 4, 1, 1, 1], // 60
  [2, 2, 1, 4, 1, 1], // 61
  [4, 3, 1, 1, 1, 1], // 62
  [1, 1, 1, 2, 2, 4], // 63
  [1, 1, 1, 4, 2, 2], // 64
  [1, 2, 1, 1, 2, 4], // 65
  [1, 2, 1, 4, 2, 1], // 66
  [1, 4, 1, 1, 2, 2], // 67
  [1, 4, 1, 2, 2, 1], // 68
  [1, 1, 2, 2, 1, 4], // 69
  [1, 1, 2, 4, 1, 2], // 70
  [1, 2, 2, 1, 1, 4], // 71
  [1, 2, 2, 4, 1, 1], // 72
  [1, 4, 2, 1, 1, 2], // 73
  [1, 4, 2, 2, 1, 1], // 74
  [2, 4, 1, 2, 1, 1], // 75
  [2, 2, 1, 1, 1, 4], // 76
  [4, 1, 3, 1, 1, 1], // 77
  [2, 4, 1, 1, 1, 2], // 78
  [1, 3, 4, 1, 1, 1], // 79
  [1, 1, 1, 2, 4, 2], // 80
  [1, 2, 1, 1, 4, 2], // 81
  [1, 2, 1, 2, 4, 1], // 82
  [1, 1, 4, 2, 1, 2], // 83
  [1, 2, 4, 1, 1, 2], // 84
  [1, 2, 4, 2, 1, 1], // 85
  [4, 1, 1, 2, 1, 2], // 86
  [4, 2, 1, 1, 1, 2], // 87
  [4, 2, 1, 2, 1, 1], // 88
  [2, 1, 2, 1, 4, 1], // 89
  [2, 1, 4, 1, 2, 1], // 90
  [4, 1, 2, 1, 2, 1], // 91
  [1, 1, 1, 1, 4, 3], // 92
  [1, 1, 1, 3, 4, 1], // 93
  [1, 3, 1, 1, 4, 1], // 94
  [1, 1, 4, 1, 1, 3], // 95
  [1, 1, 4, 3, 1, 1], // 96
  [4, 1, 1, 1, 1, 3], // 97
  [4, 1, 1, 3, 1, 1], // 98
  [1, 1, 3, 1, 4, 1], // 99
  [1, 1, 4, 1, 3, 1], // 100
  [3, 1, 1, 1, 4, 1], // 101
  [4, 1, 1, 1, 3, 1], // 102
  [2, 1, 1, 4, 1, 2], // 103 (Start A)
  [2, 1, 1, 2, 1, 4], // 104 (Start B)
  [2, 1, 1, 2, 3, 2], // 105 (Start C)
  [2, 3, 3, 1, 1, 1, 2], // 106 (Stop)
];

/**
 * Generates a standard Philippines EAN-13 Barcode string (480 + 9 random digits + 1 checksum digit)
 */
export function generateEan13Barcode(): string {
  let result = "480";
  for (let i = 0; i < 9; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(result.charAt(i), 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return result + checksum;
}

/**
 * Encodes any string into Code 128 module pattern array (true = bar, false = space)
 */
export function getCode128Modules(rawCode: string | undefined | null): boolean[] {
  const code = (rawCode || "").trim() || generateEan13Barcode();
  const patternIndices: number[] = [];
  
  // Start B (104)
  patternIndices.push(104);
  let checksum = 104;

  for (let i = 0; i < code.length; i++) {
    let charCode = code.charCodeAt(i);
    // Limit to printable ASCII 32 to 126
    if (charCode < 32 || charCode > 126) {
      charCode = 32; // Fallback space
    }
    const symbolIndex = charCode - 32;
    patternIndices.push(symbolIndex);
    checksum += (i + 1) * symbolIndex;
  }

  const checksumIndex = checksum % 103;
  patternIndices.push(checksumIndex);
  patternIndices.push(106); // Stop (106)

  const modules: boolean[] = [];
  // Quiet zone at start (10 modules space)
  for (let q = 0; q < 10; q++) modules.push(false);

  patternIndices.forEach((patIdx) => {
    const widths = CODE128_PATTERNS[patIdx] || CODE128_PATTERNS[0];
    let isBar = true;
    widths.forEach((w) => {
      for (let k = 0; k < w; k++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    });
  });

  // Quiet zone at end (10 modules space)
  for (let q = 0; q < 10; q++) modules.push(false);

  return modules;
}

/**
 * Generates clean SVG markup for Code 128 barcode suitable for print templates
 */
export function generateCode128SvgHtml(rawCode: string | undefined | null, height: number = 36): string {
  const code = (rawCode || "").trim() || "4801000000000";
  const modules = getCode128Modules(code);
  const totalWidth = modules.length;

  let rects = "";
  let currentX = 0;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i]) {
      let barWidth = 1;
      while (i + 1 < modules.length && modules[i + 1]) {
        barWidth++;
        i++;
      }
      rects += `<rect x="${currentX}" y="0" width="${barWidth}" height="${height}" fill="#000000" />`;
      currentX += barWidth;
    } else {
      currentX += 1;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" preserveAspectRatio="none" style="width:100%;height:${height}px;display:block;">${rects}</svg>`;
}

interface StyledBarcodeProps {
  code: string | undefined | null;
  height?: number;
  showText?: boolean;
}

/**
 * High-contrast React Barcode renderer component using SVG Code 128 modules
 */
export const StyledBarcode: React.FC<StyledBarcodeProps> = ({ code, height = 44, showText = true }) => {
  const displayCode = (code || "").trim() || "N/A";
  const modules = getCode128Modules(displayCode);
  const totalWidth = modules.length;

  const rects: React.ReactNode[] = [];
  let currentX = 0;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i]) {
      let barWidth = 1;
      while (i + 1 < modules.length && modules[i + 1]) {
        barWidth++;
        i++;
      }
      rects.push(
        <rect
          key={currentX}
          x={currentX}
          y={0}
          width={barWidth}
          height={height}
          fill="currentColor"
        />
      );
      currentX += barWidth;
    } else {
      currentX += 1;
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
      <div className="w-full max-w-[220px] text-zinc-950 dark:text-zinc-50 flex items-center justify-center overflow-hidden">
        <svg
          viewBox={`0 0 ${totalWidth} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-11"
        >
          {rects}
        </svg>
      </div>
      {showText && (
        <span className="font-mono text-[10px] tracking-widest text-zinc-600 dark:text-zinc-300 font-black uppercase select-all">
          {displayCode}
        </span>
      )}
    </div>
  );
};

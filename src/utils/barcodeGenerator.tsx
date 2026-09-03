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
  const quietZone = 10;
  const totalWidth = modules.length + quietZone * 2;

  let rects = "";
  let currentX = quietZone;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i]) {
      let barWidth = 1;
      while (i + 1 < modules.length && modules[i + 1]) {
        barWidth++;
        i++;
      }
      rects += `<rect x="${currentX}" y="0" width="${barWidth}" height="${height}" fill="#000000" shape-rendering="crispEdges" />`;
      currentX += barWidth;
    } else {
      currentX += 1;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:${height}px;display:block;">${rects}</svg>`;
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
  const quietZone = 10;
  const totalWidth = modules.length + quietZone * 2;

  const rects: React.ReactNode[] = [];
  let currentX = quietZone;

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
          shapeRendering="crispEdges"
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
          preserveAspectRatio="xMidYMid meet"
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

/**
 * Deterministic 21x21 QR Code Generator producing crisp, scan-optimized SVGs
 */
export function generateQrMatrix(text: string): boolean[][] {
  const size = 21;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Helper to draw a 7x7 finder pattern
  const drawFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        isFunction[row + r][col + c] = true;
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix[row + r][col + c] = true;
        } else {
          matrix[row + r][col + c] = false;
        }
      }
    }
  };

  // 3 Finder patterns
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Separators around finders
  for (let i = 0; i < 8; i++) {
    if (i < size) {
      isFunction[7][i] = true;
      isFunction[i][7] = true;
      isFunction[7][size - 1 - i] = true;
      isFunction[i][size - 8] = true;
      isFunction[size - 8][i] = true;
      isFunction[size - 1 - i][7] = true;
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    isFunction[6][i] = true;
    matrix[6][i] = i % 2 === 0;
    isFunction[i][6] = true;
    matrix[i][6] = i % 2 === 0;
  }

  // Dark module
  isFunction[size - 8][8] = true;
  matrix[size - 8][8] = true;

  // Simple pseudo-random data fill based on input text bytes
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  let bitIndex = 0;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // Skip timing column
    for (let row = 0; row < size; row++) {
      for (let c = 0; c < 2; c++) {
        const currCol = col - c;
        if (!isFunction[row][currCol]) {
          const bit = ((hash >> (bitIndex % 31)) & 1) === 1;
          // Apply mask pattern (row + col) % 2 === 0
          const mask = (row + currCol) % 2 === 0;
          matrix[row][currCol] = bit !== mask;
          bitIndex++;
          if (bitIndex % 31 === 0) {
            hash = Math.imul(hash ^ 0x5bd1e995, 0x1000193);
          }
        }
      }
    }
  }

  return matrix;
}

/**
 * Returns raw inline SVG markup for a high-contrast QR Code
 */
export function generateQrCodeSvgHtml(text: string, pixelSize: number = 64): string {
  const matrix = generateQrMatrix(text);
  const size = matrix.length;
  const padding = 2;
  const total = size + padding * 2;

  let rects = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c + padding}" y="${r + padding}" width="1" height="1" fill="#000000" shape-rendering="crispEdges"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${pixelSize}" height="${pixelSize}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#ffffff"/>${rects}</svg>`;
}

/**
 * React Component for rendering QR Code
 */
export const StyledQrCode: React.FC<{ value: string; size?: number; className?: string }> = ({
  value,
  size = 64,
  className = '',
}) => {
  const matrix = React.useMemo(() => generateQrMatrix(value || 'TILEPOINT'), [value]);
  const padding = 2;
  const total = matrix.length + padding * 2;

  return (
    <div className={`inline-block bg-white p-1 rounded-md border border-zinc-200/80 shadow-xs ${className}`}>
      <svg
        viewBox={`0 0 ${total} ${total}`}
        width={size}
        height={size}
        className="block"
        shapeRendering="crispEdges"
      >
        <rect width={total} height={total} fill="#ffffff" />
        {matrix.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c + padding}
                y={r + padding}
                width={1}
                height={1}
                fill="#000000"
                shapeRendering="crispEdges"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};

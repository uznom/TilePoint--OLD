import React, { useState, useEffect } from "react";
import { Type, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export interface ReceiptFontSizeControlProps {
  mode?: "compact" | "full" | "toolbar";
  className?: string;
}

export function useReceiptFontSize() {
  const [fontSize, setFontSizeState] = useState<string>(() => {
    return localStorage.getItem("tilepoint-receipt-font-size") || "100";
  });

  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem("tilepoint-receipt-font-size") || "100";
      setFontSizeState(saved);
    };
    window.addEventListener("tilepoint-receipt-font-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("tilepoint-receipt-font-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const setFontSize = (size: string) => {
    localStorage.setItem("tilepoint-receipt-font-size", size);
    setFontSizeState(size);
    window.dispatchEvent(new Event("tilepoint-receipt-font-updated"));
  };

  const numVal = parseInt(fontSize, 10) || 100;
  const fontScale = numVal / 100;
  const fontClass = `receipt-font-${fontSize}`;

  return { fontSize, numVal, fontScale, fontClass, setFontSize };
}

export const ReceiptFontSizeControl: React.FC<ReceiptFontSizeControlProps> = ({
  mode = "compact",
  className = "",
}) => {
  const { fontSize, numVal, setFontSize } = useReceiptFontSize();

  const presets = [
    { id: "80", label: "80%", name: "Compact" },
    { id: "90", label: "90%", name: "Small" },
    { id: "100", label: "100%", name: "Standard" },
    { id: "110", label: "110%", name: "Large" },
    { id: "120", label: "120%", name: "X-Large" },
    { id: "130", label: "130%", name: "Max" },
  ];

  const handleStep = (delta: number) => {
    const current = parseInt(fontSize, 10) || 100;
    const next = Math.max(70, Math.min(140, current + delta));
    setFontSize(String(next));
  };

  if (mode === "toolbar" || mode === "compact") {
    return (
      <div
        className={`flex items-center gap-1.5 bg-content2/80 backdrop-blur-xs p-1.5 rounded-xl border border-divider/30 text-xs bir-report-no-print ${className}`}
      >
        <span className="text-[10px] font-black uppercase text-primary flex items-center gap-1 pl-1 pr-0.5">
          <Type className="h-3 w-3" />
          <span className="hidden sm:inline">Receipt Font:</span>
        </span>

        <button
          type="button"
          onClick={() => handleStep(-5)}
          disabled={numVal <= 70}
          title="Decrease Receipt Font Size"
          className="p-1 rounded-lg bg-background hover:bg-primary/10 text-foreground disabled:opacity-30 cursor-pointer transition-all active:scale-95 border border-divider/20"
        >
          <ZoomOut className="h-3 w-3" />
        </button>

        <span className="px-1.5 font-extrabold text-[11px] text-primary min-w-[38px] text-center">
          {numVal}%
        </span>

        <button
          type="button"
          onClick={() => handleStep(5)}
          disabled={numVal >= 140}
          title="Increase Receipt Font Size"
          className="p-1 rounded-lg bg-background hover:bg-primary/10 text-foreground disabled:opacity-30 cursor-pointer transition-all active:scale-95 border border-divider/20"
        >
          <ZoomIn className="h-3 w-3" />
        </button>

        <div className="h-3.5 w-px bg-default-100 mx-0.5" />

        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setFontSize(p.id)}
              className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-black transition-all cursor-pointer ${
                fontSize === p.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-background hover:bg-content3 text-default-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {numVal !== 100 && (
          <button
            type="button"
            onClick={() => setFontSize("100")}
            title="Reset to 100%"
            className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer transition-colors ml-0.5"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  // Full Settings Panel Mode
  return (
    <div className={`space-y-3 bg-content1 border border-divider/15 p-4 rounded-2xl ${className}`}>
      <div className="flex justify-between items-center">
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-primary block">
            Thermal Receipt Font Scale Adjuster
          </label>
          <p className="text-[10.5px] text-default-500 font-sans mt-0.5">
            Independent print and preview font multiplier for Cash Register Receipts. Unaffected by System UI text scaling.
          </p>
        </div>
        <span className="text-xs font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
          {numVal}% ({numVal < 100 ? "Compact" : numVal === 100 ? "Standard" : "Enlarged"})
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setFontSize(p.id)}
            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              fontSize === p.id
                ? "bg-primary/10 border-primary text-primary font-black shadow-xs"
                : "bg-background border-divider/20 hover:bg-primary/5 text-default-500"
            }`}
          >
            <span className="text-xs font-black">{p.label}</span>
            <span className="text-[9px] opacity-75 font-sans uppercase font-bold">{p.name}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <span className="text-[10px] text-default-500 font-bold">70%</span>
        <input
          type="range"
          min="70"
          max="140"
          step="5"
          value={numVal}
          onChange={(e) => setFontSize(e.target.value)}
          className="flex-1 accent-primary h-1.5 bg-default-100 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-[10px] text-default-500 font-bold">140%</span>
      </div>
    </div>
  );
};

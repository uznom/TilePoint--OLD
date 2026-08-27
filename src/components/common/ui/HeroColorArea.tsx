import React, { useState } from 'react';
import { Pipette } from 'lucide-react';

export interface HeroColorAreaProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (color: string) => void;
  presetColors?: string[];
  isDisabled?: boolean;
  className?: string;
  id?: string;
}

export const HeroColorArea: React.FC<HeroColorAreaProps> = ({
  label,
  value,
  defaultValue = '#005AC1',
  onChange,
  presetColors = [
    '#005AC1', // Primary Blue
    '#0D9488', // Teal
    '#16A34A', // Emerald
    '#EAB308', // Amber
    '#EA580C', // Orange
    '#E11D48', // Rose
    '#9333EA', // Purple
    '#475569', // Slate
    '#18181B', // Zinc Dark
  ],
  isDisabled = false,
  className = '',
  id,
}) => {
  const [currentColor, setCurrentColor] = useState(value || defaultValue);

  const handleColorChange = (newColor: string) => {
    setCurrentColor(newColor);
    onChange?.(newColor);
  };

  return (
    <div id={id} className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <span className="text-[11px] font-bold uppercase tracking-wider text-default-500 flex items-center gap-1.5">
          <Pipette className="w-3.5 h-3.5 text-primary" />
          {label}
        </span>
      )}

      <div className="flex items-center gap-3">
        {/* Native / Custom Color Square Thumb */}
        <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-divider/40 shadow-sm shrink-0 group">
          <input
            type="color"
            value={value || currentColor}
            disabled={isDisabled}
            onChange={(e) => handleColorChange(e.target.value)}
            className="absolute -inset-2 w-14 h-14 cursor-pointer opacity-0"
          />
          <div
            className="w-full h-full rounded-lg transition-transform group-hover:scale-110"
            style={{ backgroundColor: value || currentColor }}
          />
        </div>

        {/* Color Hex String */}
        <span className="text-xs font-mono font-bold uppercase text-foreground bg-content2 px-2.5 py-1.5 rounded-lg border border-divider/30">
          {value || currentColor}
        </span>

        {/* Preset Palette Swatches */}
        {presetColors && presetColors.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 ml-auto">
            {presetColors.map((hex) => {
              const isSelected = (value || currentColor).toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleColorChange(hex)}
                  className={`w-6 h-6 rounded-lg transition-all cursor-pointer border ${
                    isSelected
                      ? 'scale-110 border-white ring-2 ring-primary shadow-md'
                      : 'border-black/10 dark:border-white/10 hover:scale-105'
                  }`}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

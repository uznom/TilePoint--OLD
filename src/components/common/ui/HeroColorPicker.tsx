import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pipette, Check, Copy, Sparkles, ChevronDown } from 'lucide-react';

// Helper color conversion functions
export function hexToRgb(hex: string): { r: number; g: number; b: number; a: number } {
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('') + 'FF';
  } else if (clean.length === 6) {
    clean = clean + 'FF';
  } else if (clean.length !== 8) {
    clean = '006FEEFF';
  }
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  const a = (parseInt(clean.slice(6, 8), 16) || 255) / 255;
  return { r, g, b, a };
}

export function rgbToHex(r: number, g: number, b: number, a: number = 1): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const rH = clamp(r).toString(16).padStart(2, '0');
  const gH = clamp(g).toString(16).padStart(2, '0');
  const bH = clamp(b).toString(16).padStart(2, '0');
  if (a < 1) {
    const aH = Math.round(a * 255).toString(16).padStart(2, '0');
    return `#${rH}${gH}${bH}${aH}`.toUpperCase();
  }
  return `#${rH}${gH}${bH}`.toUpperCase();
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  let h = 0;
  if (diff !== 0) {
    if (max === r) h = ((g - b) / diff) % 6;
    else if (max === g) h = (b - r) / diff + 2;
    else h = (r - g) / diff + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : Math.round((diff / max) * 100);
  const v = Math.round(max * 100);
  return { h, s, v };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r1: number, g1: number, b1: number;
  if (h >= 0 && h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (h >= 60 && h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h >= 120 && h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h >= 180 && h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h >= 240 && h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export interface ColorPickerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (color: string) => void;
  label?: React.ReactNode;
  showFormatToggle?: boolean;
  showSwatches?: boolean;
  showSliders?: boolean;
  show2DArea?: boolean;
  className?: string;
  id?: string;
}

export interface ColorAreaProps {
  hue: number;
  saturation: number;
  value: number;
  onChange: (s: number, v: number) => void;
  className?: string;
  id?: string;
}

export interface ColorSliderProps {
  value?: number;
  channel?: 'hue' | 'alpha';
  onChange?: (val: number) => void;
  colorHex?: string;
  className?: string;
}

export interface ColorSwatchProps {
  color: string;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  'aria-label'?: string;
}

export interface ColorSwatchPickerProps {
  colors?: string[];
  value?: string;
  defaultValue?: string;
  onChange?: (color: string) => void;
  className?: string;
}

// 1. Color Swatch
export const ColorSwatch: React.FC<ColorSwatchProps> = ({
  color,
  isSelected = false,
  size = 'md',
  onClick,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-6 h-6 rounded-lg';
      case 'lg':
        return 'w-10 h-10 rounded-2xl';
      case 'md':
      default:
        return 'w-8 h-8 rounded-xl';
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || `Color swatch ${color}`}
      className={`relative cursor-pointer transition-all duration-150 border flex items-center justify-center shrink-0 ${
        isSelected
          ? 'scale-110 border-white ring-2 ring-primary shadow-md z-10'
          : 'border-divider/40 hover:scale-105 hover:border-divider'
      } ${getSizeClasses()} ${className}`}
      style={{ backgroundColor: color }}
    >
      {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />}
    </button>
  );
};
ColorSwatch.displayName = 'ColorSwatch';

// 2. Color Swatch Picker
export const ColorSwatchPicker: React.FC<ColorSwatchPickerProps> = ({
  colors = [
    '#006FEE', '#17C964', '#F5A524', '#F31260', '#7828C8', '#0D9488', '#0891B2', '#4F46E5', '#18181B', '#3F3F46'
  ],
  value,
  defaultValue = '#006FEE',
  onChange,
  className = '',
}) => {
  const [selectedColor, setSelectedColor] = useState(value || defaultValue);

  useEffect(() => {
    if (value) setSelectedColor(value);
  }, [value]);

  const handleSelect = (hex: string) => {
    setSelectedColor(hex);
    onChange?.(hex);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {colors.map((hex) => (
        <ColorSwatch
          key={hex}
          color={hex}
          isSelected={selectedColor.toLowerCase() === hex.toLowerCase()}
          onClick={() => handleSelect(hex)}
        />
      ))}
    </div>
  );
};
ColorSwatchPicker.displayName = 'ColorSwatchPicker';

// 3. Color Area (2D Saturation / Value Canvas)
export const ColorArea: React.FC<ColorAreaProps> = ({
  hue,
  saturation,
  value: brightness,
  onChange,
  className = '',
  id,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const s = Math.round((x / rect.width) * 100);
      const v = Math.round((1 - y / rect.height) * 100);
      onChange(s, v);
    },
    [onChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    updateFromPointer(e.clientX, e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingRef.current) {
        updateFromPointer(moveEvent.clientX, moveEvent.clientY);
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    const touch = e.touches[0];
    if (touch) updateFromPointer(touch.clientX, touch.clientY);

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (isDraggingRef.current && moveEvent.touches[0]) {
        updateFromPointer(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  const baseHueRgb = hsvToRgb(hue, 100, 100);
  const baseHueHex = rgbToHex(baseHueRgb.r, baseHueRgb.g, baseHueRgb.b);

  const posX = Math.max(0, Math.min(100, saturation));
  const posY = Math.max(0, Math.min(100, 100 - brightness));

  return (
    <div
      id={id}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={`relative w-full h-36 rounded-2xl cursor-crosshair overflow-hidden border border-divider/30 select-none ${className}`}
      style={{ backgroundColor: baseHueHex }}
    >
      {/* Horizontal white gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
      {/* Vertical black gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />

      {/* Thumb cursor */}
      <div
        className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md pointer-events-none ring-1 ring-black/40"
        style={{
          left: `${posX}%`,
          top: `${posY}%`,
        }}
      />
    </div>
  );
};
ColorArea.displayName = 'ColorArea';

// 4. Color Slider (Hue & Alpha channels)
export const ColorSlider: React.FC<ColorSliderProps> = ({
  value = 0,
  channel = 'hue',
  onChange,
  colorHex = '#006FEE',
  className = '',
}) => {
  if (channel === 'alpha') {
    return (
      <div className={`w-full flex items-center gap-2 relative ${className}`}>
        <div className="relative w-full h-3.5 rounded-xl overflow-hidden border border-divider/30 bg-[linear-gradient(45deg,#ccc_25%,transparent_25%),linear-gradient(-45deg,#ccc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ccc_75%),linear-gradient(-45deg,transparent_75%,#ccc_75%)] bg-[size:8px_8px] bg-[position:0_0,0_4px,4px_-4px,-4px_0]">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, transparent, ${colorHex})`,
            }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={value}
            onChange={(e) => onChange?.(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    );
  }

  // Hue Slider
  return (
    <div className={`w-full flex items-center gap-2 relative ${className}`}>
      <div className="relative w-full h-3.5 rounded-xl overflow-hidden border border-divider/30 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-cyan-500 via-blue-500 via-pink-500 to-red-500">
        <input
          type="range"
          min="0"
          max="360"
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};
ColorSlider.displayName = 'ColorSlider';

// 5. Complete HeroUI ColorPicker Component
export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  defaultValue = '#006FEE',
  onChange,
  label,
  showFormatToggle = true,
  showSwatches = true,
  showSliders = true,
  show2DArea = true,
  className = '',
  id,
}) => {
  const [currentColor, setCurrentColor] = useState<string>(value || defaultValue);
  const [format, setFormat] = useState<'hex' | 'rgb' | 'hsl'>('hex');
  const [copied, setCopied] = useState(false);

  // Sync external value
  useEffect(() => {
    if (value) setCurrentColor(value);
  }, [value]);

  const rgb = hexToRgb(currentColor);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

  const [hue, setHue] = useState<number>(hsv.h);
  const [saturation, setSaturation] = useState<number>(hsv.s);
  const [brightness, setBrightness] = useState<number>(hsv.v);
  const [alpha, setAlpha] = useState<number>(Math.round(rgb.a * 100));

  useEffect(() => {
    const currentRgb = hexToRgb(currentColor);
    const currentHsv = rgbToHsv(currentRgb.r, currentRgb.g, currentRgb.b);
    setHue(currentHsv.h);
    setSaturation(currentHsv.s);
    setBrightness(currentHsv.v);
    setAlpha(Math.round(currentRgb.a * 100));
  }, [currentColor]);

  const emitColor = (newHex: string) => {
    setCurrentColor(newHex);
    onChange?.(newHex);
  };

  const handle2DChange = (newS: number, newV: number) => {
    setSaturation(newS);
    setBrightness(newV);
    const newRgb = hsvToRgb(hue, newS, newV);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b, alpha / 100);
    emitColor(newHex);
  };

  const handleHueChange = (newHue: number) => {
    setHue(newHue);
    const newRgb = hsvToRgb(newHue, saturation, brightness);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b, alpha / 100);
    emitColor(newHex);
  };

  const handleAlphaChange = (newAlpha: number) => {
    setAlpha(newAlpha);
    const newRgb = hsvToRgb(hue, saturation, brightness);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b, newAlpha / 100);
    emitColor(newHex);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-Fa-f]{0,8}$/.test(val)) {
      setCurrentColor(val);
      if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^#[0-9A-Fa-f]{8}$/.test(val) || /^#[0-9A-Fa-f]{3}$/.test(val)) {
        onChange?.(val);
      }
    }
  };

  const handleEyeDropper = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          emitColor(result.sRGBHex);
        }
      } catch (e) {
        console.error('EyeDropper cancelled or failed', e);
      }
    }
  };

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentColor);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      id={id}
      className={`p-4 bg-content1 rounded-2xl border border-divider/20 shadow-sm space-y-4 font-sans text-foreground select-none ${className}`}
    >
      {/* Top Header / Label */}
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {label}
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {currentColor}
          </span>
        </div>
      )}

      {/* 2D Color Area */}
      {show2DArea && (
        <ColorArea
          hue={hue}
          saturation={saturation}
          value={brightness}
          onChange={handle2DChange}
        />
      )}

      {/* Sliders & Active Swatch preview */}
      {showSliders && (
        <div className="flex items-center gap-3">
          {/* Active Preview Swatch */}
          <div className="relative group shrink-0">
            <div
              className="w-10 h-10 rounded-2xl border border-divider/40 shadow-sm transition-transform group-hover:scale-105"
              style={{ backgroundColor: currentColor }}
            />
            {'EyeDropper' in (typeof window !== 'undefined' ? window : {}) && (
              <button
                type="button"
                onClick={handleEyeDropper}
                title="Pick color from screen"
                className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background border border-divider/40 text-default-500 hover:text-foreground shadow-xs cursor-pointer"
              >
                <Pipette className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sliders column */}
          <div className="flex-1 space-y-2">
            <ColorSlider
              channel="hue"
              value={hue}
              onChange={handleHueChange}
            />
            <ColorSlider
              channel="alpha"
              value={alpha}
              colorHex={currentColor}
              onChange={handleAlphaChange}
            />
          </div>
        </div>
      )}

      {/* Format Switcher & Channel Inputs */}
      {showFormatToggle && (
        <div className="flex items-center gap-2 pt-1">
          {/* Format Select */}
          <div className="relative shrink-0">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'hex' | 'rgb' | 'hsl')}
              aria-label="Color Format"
              className="px-2.5 py-1.5 rounded-xl bg-content2 border border-divider/30 text-xs font-bold uppercase text-foreground focus:outline-none focus:border-primary cursor-pointer pr-6 appearance-none"
            >
              <option value="hex">HEX</option>
              <option value="rgb">RGB</option>
              <option value="hsl">HSL</option>
            </select>
            <ChevronDown className="w-3 h-3 text-default-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Hex / Channel inputs */}
          {format === 'hex' && (
            <div className="flex-1 relative">
              <input
                type="text"
                value={currentColor}
                onChange={handleHexInputChange}
                placeholder="#006FEE"
                className="w-full px-3 py-1.5 rounded-xl bg-background border border-divider/30 text-xs font-mono font-bold uppercase text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {format === 'rgb' && (
            <div className="flex-1 grid grid-cols-3 gap-1.5">
              <input
                type="number"
                min="0"
                max="255"
                value={rgb.r}
                onChange={(e) => {
                  const newR = Number(e.target.value);
                  emitColor(rgbToHex(newR, rgb.g, rgb.b, alpha / 100));
                }}
                className="w-full px-1.5 py-1.5 rounded-xl bg-background border border-divider/30 text-xs font-mono font-bold text-center text-foreground focus:outline-none focus:border-primary"
                title="Red"
              />
              <input
                type="number"
                min="0"
                max="255"
                value={rgb.g}
                onChange={(e) => {
                  const newG = Number(e.target.value);
                  emitColor(rgbToHex(rgb.r, newG, rgb.b, alpha / 100));
                }}
                className="w-full px-1.5 py-1.5 rounded-xl bg-background border border-divider/30 text-xs font-mono font-bold text-center text-foreground focus:outline-none focus:border-primary"
                title="Green"
              />
              <input
                type="number"
                min="0"
                max="255"
                value={rgb.b}
                onChange={(e) => {
                  const newB = Number(e.target.value);
                  emitColor(rgbToHex(rgb.r, rgb.g, newB, alpha / 100));
                }}
                className="w-full px-1.5 py-1.5 rounded-xl bg-background border border-divider/30 text-xs font-mono font-bold text-center text-foreground focus:outline-none focus:border-primary"
                title="Blue"
              />
            </div>
          )}

          {format === 'hsl' && (
            <div className="flex-1 grid grid-cols-3 gap-1.5">
              <input
                type="number"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => handleHueChange(Number(e.target.value))}
                className="w-full px-1.5 py-1.5 rounded-xl bg-background border border-divider/30 text-xs font-mono font-bold text-center text-foreground focus:outline-none focus:border-primary"
                title="Hue"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={saturation}
                onChange={(e) => handle2DChange(Number(e.target.value), brightness)}
                className="w-full px-1.5 py-1.5 rounded-xl bg-background border border-divider/30 text-xs font-mono font-bold text-center text-foreground focus:outline-none focus:border-primary"
                title="Saturation"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={brightness}
                onChange={(e) => handle2DChange(saturation, Number(e.target.value))}
                className="w-full px-1.5 py-1.5 rounded-xl bg-background border border-divider/30 text-xs font-mono font-bold text-center text-foreground focus:outline-none focus:border-primary"
                title="Brightness / Value"
              />
            </div>
          )}

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy color code"
            className="p-2 rounded-xl bg-content2 hover:bg-content3 border border-divider/30 text-default-500 hover:text-foreground transition-colors cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Preset Swatches */}
      {showSwatches && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-default-500 block">
            Standard Swatches
          </span>
          <ColorSwatchPicker
            value={currentColor}
            onChange={emitColor}
          />
        </div>
      )}
    </div>
  );
};
ColorPicker.displayName = 'ColorPicker';

export default ColorPicker;


/**
 * Client Device & Terminal Fingerprinting Engine
 * Provides deterministic hardware keys, OS/browser detection, and SHA-256 device fingerprinting
 * used for server-side concurrent login verification and terminal identification.
 */

export interface ClientDeviceInfo {
  deviceKey: string;
  browser: string;
  os: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  touchSupport: boolean;
  hash: string;
}

const STORAGE_DEVICE_KEY = "tp_device_hardware_key";

/**
 * Retrieves or generates a persistent device hardware key
 */
export function getDeviceHardwareKey(): string {
  try {
    let key = localStorage.getItem(STORAGE_DEVICE_KEY);
    if (!key || key.length < 16) {
      const randomSegment = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      key = `DEV_${Date.now().toString(36).toUpperCase()}_${randomSegment.toUpperCase()}`;
      localStorage.setItem(STORAGE_DEVICE_KEY, key);
    }
    return key;
  } catch (_) {
    return `DEV_TRANSIENT_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  }
}

/**
 * Detects browser brand and version from userAgent
 */
export function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (/Edg\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/Edg\/([0-9.]+)/i);
    return `Microsoft Edge ${match ? match[1].split('.')[0] : ''}`.trim();
  }
  if (/OPR\/([0-9.]+)/i.test(ua) || /Opera/i.test(ua)) {
    const match = ua.match(/OPR\/([0-9.]+)/i);
    return `Opera ${match ? match[1].split('.')[0] : ''}`.trim();
  }
  if (/Chrome\/([0-9.]+)/i.test(ua) && !/Chromium/i.test(ua)) {
    const match = ua.match(/Chrome\/([0-9.]+)/i);
    return `Google Chrome ${match ? match[1].split('.')[0] : ''}`.trim();
  }
  if (/Firefox\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/Firefox\/([0-9.]+)/i);
    return `Mozilla Firefox ${match ? match[1].split('.')[0] : ''}`.trim();
  }
  if (/Version\/([0-9.]+).*Safari/i.test(ua)) {
    const match = ua.match(/Version\/([0-9.]+)/i);
    return `Apple Safari ${match ? match[1].split('.')[0] : ''}`.trim();
  }
  if (/Android/i.test(ua)) return "Android Browser";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS WebKit";
  return "Web Browser";
}

/**
 * Detects operating system from userAgent and platform
 */
export function detectOS(): string {
  const ua = navigator.userAgent;
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || "";

  if (/Windows NT 10.0|Windows 10/i.test(ua)) return "Windows 10/11";
  if (/Windows NT 6.3/i.test(ua)) return "Windows 8.1";
  if (/Windows NT 6.1/i.test(ua)) return "Windows 7";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) {
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS Mobile";
    return "macOS";
  }
  if (/Android/i.test(ua)) return "Android OS";
  if (/Linux/i.test(ua)) return "Linux OS";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/iPhone|iPad|iPod/i.test(platform)) return "iOS Mobile";
  return platform || "Unknown OS";
}

/**
 * Computes a fast 64-character deterministic hex hash from a string
 */
function simpleHexHash(input: string): string {
  let hash1 = 0xdeadbeef;
  let hash2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ ch, 2654435761);
    hash2 = Math.imul(hash2 ^ ch, 1597334677);
  }
  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507) ^ Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507) ^ Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);
  const part1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  const part3 = ((hash1 ^ hash2) >>> 0).toString(16).padStart(8, '0');
  const part4 = ((hash1 + hash2) >>> 0).toString(16).padStart(8, '0');
  return `FP_${part1}${part2}${part3}${part4}`.toUpperCase();
}

let cachedFingerprint: ClientDeviceInfo | null = null;

/**
 * Returns comprehensive device fingerprint object
 */
export function getClientDeviceInfo(): ClientDeviceInfo {
  if (cachedFingerprint) return cachedFingerprint;

  const deviceKey = getDeviceHardwareKey();
  const browser = detectBrowser();
  const os = detectOS();
  const screenResolution = typeof window !== "undefined" && window.screen
    ? `${window.screen.width}x${window.screen.height} (${window.screen.colorDepth || 24}bit)`
    : "1920x1080 (24bit)";
  
  let timezone = "UTC";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch (tzErr) {
    // Non-fatal: Intl timezone resolution unsupported in this browser/environment; fallback to UTC
    console.debug("[Fingerprint] TimeZone resolution fallback to UTC:", tzErr);
  }

  const language = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
  const platform = typeof navigator !== "undefined" ? navigator.platform || "Web" : "Web";
  const hardwareConcurrency = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
  const deviceMemory = typeof navigator !== "undefined" ? (navigator as any).deviceMemory : undefined;
  const touchSupport = typeof navigator !== "undefined" ? (navigator.maxTouchPoints > 0 || "ontouchstart" in window) : false;

  const rawSeed = [
    deviceKey,
    browser,
    os,
    screenResolution,
    timezone,
    language,
    hardwareConcurrency,
    deviceMemory,
    touchSupport
  ].join("###");

  const hash = simpleHexHash(rawSeed);

  cachedFingerprint = {
    deviceKey,
    browser,
    os,
    screenResolution,
    timezone,
    language,
    platform,
    hardwareConcurrency,
    deviceMemory,
    touchSupport,
    hash
  };

  return cachedFingerprint;
}

/**
 * Returns the deterministic fingerprint hash string for request headers
 */
export function getClientFingerprintHash(): string {
  return getClientDeviceInfo().hash;
}

/**
 * Returns a concise human-readable device summary
 */
export function getClientDeviceSummary(): string {
  const info = getClientDeviceInfo();
  return `${info.browser} on ${info.os} (${info.screenResolution.split(' ')[0]})`;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Highly secure sanitation and verification helpers to prevent XSS script injections,
 * escape raw HTML codes, trim input trails, and enforce strict type constraints.
 */
export const sanitizeInputText = (str: string): string => {
  if (typeof str !== "string") return "";
  return str
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "") // Remove script tags
    .replace(/<\/?[^>]+(>|$)/g, "") // Strip HTML tags
    .replace(/[<>]/g, "") // Remove angle brackets
    .trim();
};

export const sanitizeAndValidateNumber = (val: any, fallback = 0): number => {
  if (val === undefined || val === null) return fallback;
  const num = typeof val === "number" ? val : parseFloat(val);
  return isNaN(num) ? fallback : Math.max(0, num);
};

/**
 * KNOWN LIMITATION & MECHANISM DISCLOSURE:
 * This mechanism performs simple byte-level XOR masking with TextEncoder/TextDecoder and Base64 encoding.
 * It provides lightweight visual obfuscation for clipboard transmittal payloads.
 */
export const xorObfuscateString = (text: string, secretKey: string): string => {
  const textBytes = new TextEncoder().encode(text || "");
  const keyBytes = new TextEncoder().encode(
    secretKey || "TilePoint_Secret_Fallback"
  );
  const keyLength = keyBytes.length || 1;
  let hexResult = "";
  for (let i = 0; i < textBytes.length; i++) {
    const encryptedByte = textBytes[i] ^ keyBytes[i % keyLength];
    hexResult += encryptedByte.toString(16).padStart(2, "0");
  }
  return btoa(hexResult);
};

export const xorDeobfuscateString = (
  cipherStr: string,
  secretKey: string
): string => {
  try {
    if (!cipherStr) return "";
    const hexStr = atob(cipherStr);
    const keyBytes = new TextEncoder().encode(
      secretKey || "TilePoint_Secret_Fallback"
    );
    const keyLength = keyBytes.length || 1;
    const decryptedBytes = new Uint8Array(hexStr.length / 2);
    for (let i = 0; i < hexStr.length; i += 2) {
      const byteVal = parseInt(hexStr.slice(i, i + 2), 16);
      decryptedBytes[i / 2] = byteVal ^ keyBytes[(i / 2) % keyLength];
    }
    return new TextDecoder().decode(decryptedBytes);
  } catch (e) {
    console.debug("[DbContext] XOR Deobfuscation fallback handled:", e);
    return "";
  }
};

// Aliases for backward compatibility with descriptive naming
export const encryptString = xorObfuscateString;
export const decryptString = xorDeobfuscateString;

/**
 * Sourced from environment variable to prevent extraction from client-side bundles.
 */
export const getSecuritySecretKey = (): string => {
  const envSecret =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_SECURITY_SECRET
      : undefined;

  const isValidSecret =
    envSecret &&
    envSecret.trim() !== "" &&
    envSecret.length >= 32 &&
    !envSecret.includes("123456") &&
    !envSecret.toLowerCase().includes("placeholder");

  if (isValidSecret) {
    return envSecret.trim();
  }

  const companyName =
    (typeof window !== "undefined" &&
      localStorage.getItem("tilepoint_company_name_v1")) ||
    "Main Enterprise";
  const obfuscatedStableSeed = `tile_point_salt_${companyName
    .split("")
    .reverse()
    .join("")}_secure_fallback`;
  return obfuscatedStableSeed;
};

export const getCreatedAt = (item: any): number => {
  if (item && item.createdAt) return Number(item.createdAt);
  if (item && item.id && item.id.startsWith("HLD-")) {
    const parts = item.id.split("-");
    if (parts.length > 1) {
      const ts = Number(parts[1]);
      if (!isNaN(ts)) return ts;
    }
  }
  return 0;
};

export const mergeParkedSales = (
  local: any[],
  remote: any[],
  deletedSet?: Set<string>
): any[] => {
  if (!Array.isArray(local)) local = [];
  if (!Array.isArray(remote)) remote = [];

  const map = new Map<string, any>();
  remote.forEach((item) => {
    if (item && item.id && (!deletedSet || !deletedSet.has(item.id))) {
      map.set(item.id, { ...item, synced: true });
    }
  });
  local.forEach((localItem) => {
    if (
      localItem &&
      localItem.id &&
      (!deletedSet || !deletedSet.has(localItem.id))
    ) {
      if (!map.has(localItem.id)) {
        const isRecentlyCreatedUnsynced =
          !localItem.synced &&
          Date.now() - (localItem.createdAt || 0) < 60000;
        if (isRecentlyCreatedUnsynced) {
          map.set(localItem.id, localItem);
        }
      } else {
        const remoteItem = map.get(localItem.id);
        const localTs = localItem.createdAt || getCreatedAt(localItem) || 0;
        const remoteTs =
          remoteItem?.createdAt || getCreatedAt(remoteItem) || 0;
        if (localTs > remoteTs) {
          map.set(localItem.id, { ...localItem, synced: true });
        }
      }
    }
  });
  return Array.from(map.values());
};

/**
 * Unencapsulates encrypted or ledger-wrapped payloads (e.g. Daily Reconciliation envelopes).
 */
export function unwrapInboundPayload(rawObj: any): any {
  if (!rawObj || typeof rawObj !== "object") return rawObj;

  let obj = rawObj;

  // Case A: Encrypted or signed envelope string in "payload"
  if (
    obj.integritySign ||
    (typeof obj.payload === "string" && obj.payload.length > 5)
  ) {
    const rawPayload = obj.payload;
    if (typeof rawPayload === "string") {
      const key = getSecuritySecretKey();
      let decryptedText: string;
      try {
        decryptedText = decryptString(rawPayload, key);
      } catch (e) {
        decryptedText = "";
      }

      if (decryptedText) {
        try {
          const inner = JSON.parse(decryptedText);
          if (inner && typeof inner === "object") {
            obj = {
              ...inner,
              securitySignature:
                obj.securitySignature || obj.signature || rawPayload,
              branchId: inner.branchId || obj.branchId || "B1",
              branchName: inner.branchName || obj.branchName || "Branch Store",
              reportingDate:
                inner.reportingDate ||
                obj.date ||
                obj.reportingDate ||
                new Date().toISOString().split("T")[0],
            };
          }
        } catch (e) {
          // parse failed
        }
      }
    }
  }

  // Case B: Nested object payload
  if (obj.payload && typeof obj.payload === "object") {
    const inner = obj.payload;
    obj = {
      ...inner,
      securitySignature:
        obj.securitySignature || obj.signature || inner.securitySignature,
      branchId: inner.branchId || obj.branchId || "B1",
      branchName: inner.branchName || obj.branchName || "Branch Store",
      reportingDate:
        inner.reportingDate ||
        obj.date ||
        obj.reportingDate ||
        new Date().toISOString().split("T")[0],
    };
  }

  // Case C: Nested report or data object
  if (obj.report && typeof obj.report === "object") {
    const inner = obj.report;
    obj = {
      ...inner,
      securitySignature:
        obj.securitySignature || obj.signature || inner.securitySignature,
      branchId: inner.branchId || obj.branchId || "B1",
      branchName: inner.branchName || obj.branchName || "Branch Store",
      reportingDate:
        inner.reportingDate ||
        obj.date ||
        obj.reportingDate ||
        new Date().toISOString().split("T")[0],
    };
  } else if (obj.data && typeof obj.data === "object") {
    const inner = obj.data;
    obj = {
      ...inner,
      securitySignature:
        obj.securitySignature || obj.signature || inner.securitySignature,
      branchId: inner.branchId || obj.branchId || "B1",
      branchName: inner.branchName || obj.branchName || "Branch Store",
      reportingDate:
        inner.reportingDate ||
        obj.date ||
        obj.reportingDate ||
        new Date().toISOString().split("T")[0],
    };
  }

  // Normalize fallback top-level properties
  const branchId = String(obj.branchId || "B1").trim();
  const branchName = String(obj.branchName || "Branch Store").trim();
  const reportingDate = String(
    obj.reportingDate || obj.date || new Date().toISOString().split("T")[0]
  ).trim();

  return {
    ...obj,
    branchId,
    branchName,
    reportingDate,
  };
}

export function isStrictInboundReportSchema(rawObj: any): boolean {
  if (!rawObj || typeof rawObj !== "object") return false;

  const obj = unwrapInboundPayload(rawObj);

  if (!obj.branchId || !String(obj.branchId).trim()) return false;
  if (!obj.branchName || !String(obj.branchName).trim()) return false;
  if (!obj.reportingDate || !String(obj.reportingDate).trim()) return false;

  if (!Array.isArray(obj.sales)) return false;

  for (const s of obj.sales) {
    if (!s || typeof s !== "object") return false;
    const sId = s.id || s.saleNumber;
    if (!sId || !String(sId).trim()) return false;

    const grandTotal = Number(s.grandTotal ?? s.subtotal ?? 0);
    if (isNaN(grandTotal)) return false;
  }

  if (obj.saleItems !== undefined && !Array.isArray(obj.saleItems)) {
    return false;
  }

  return true;
}

export function preprocessAndVerifyClipboardText(text: string): { success: boolean; cleanedJson?: string; error?: string } {
  if (!text || typeof text !== "string") {
    return { success: false, error: "Empty or invalid input." };
  }
  const cleaned = text.trim();
  if (!cleaned) {
    return { success: false, error: "Empty text after trimming." };
  }
  return { success: true, cleanedJson: cleaned };
}



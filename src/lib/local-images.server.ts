import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { tenantImageFile } from "./tenant-scope.server";

export function putImage(rel: string, type: string, bytes: Uint8Array) {
  if (bytes.byteLength > 1_500_000) throw new Error("Rasm juda katta");
  const file = tenantImageFile(rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, bytes);
  writeFileSync(`${file}.type`, type);
}

export function getImage(rel: string) {
  try {
    const file = tenantImageFile(rel);
    const bytes = readFileSync(file);
    const type = readFileSync(`${file}.type`, "utf8").trim() || "image/jpeg";
    return { type, bytes: new Uint8Array(bytes) };
  } catch {
    return null;
  }
}

export function parseDataUrl(value: string) {
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/.exec(value.trim());
  if (!match) return null;
  const type = match[1];
  if (!type) return null;
  const bytes = new Uint8Array(Buffer.from(match[2] ?? "", "base64"));
  if (bytes.byteLength < 32 || bytes.byteLength > 1_500_000) return null;
  return { type, bytes };
}

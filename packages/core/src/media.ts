/**
 * Host-agnostic helpers for image src classification/naming. Hosts (desktop,
 * VS Code) own actual file I/O and asset-protocol conversion; these are the
 * pure pieces worth sharing and unit-testing.
 */

export function isRemoteOrDataUrl(src: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(src);
}

/**
 * A local image src as written in markdown (e.g. `./design/logos/App%20Icon.svg`,
 * percent-encoded per the CommonMark/GFM link-destination grammar) doesn't
 * necessarily match the on-disk filename (`App Icon.svg`, a literal space).
 * Returns candidates to try against the filesystem, raw src first (so an
 * already-decoded src, or a filename that legitimately contains "%20", still
 * resolves first try) followed by the percent-decoded form when it differs.
 */
export function decodeSrcVariants(src: string): string[] {
  try {
    const decoded = decodeURIComponent(src);
    return decoded === src ? [src] : [src, decoded];
  } catch {
    return [src];
  }
}

export function sanitizeAssetFileName(originalName: string): string {
  const trimmed = originalName.trim();
  if (!trimmed) return "image";
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

import { exists, mkdir, readTextFile, writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { FontPreference, FontSlot } from "@amarantha/core";

const WEIGHT = "400";
const STYLE = "normal";
const SUBSET = "latin";

interface FontsourceVariantUrls {
  woff2: string;
}

interface FontsourceMeta {
  id: string;
  family: string;
  variants: Record<string, Record<string, Record<string, { url: FontsourceVariantUrls }>>>;
}

const BUNDLED_FAMILY: Record<FontSlot, string> = {
  sans: "Geist Variable",
  mono: "Geist Mono Variable",
};

const SYSTEM_FALLBACK: Record<FontSlot, string> = {
  sans: "ui-sans-serif, system-ui, -apple-system, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

// Tracks which Fontsource ids already have an injected <style data-amarantha-font>
// so re-selecting a font already loaded this session doesn't duplicate the tag.
const injectedFontIds = new Set<string>();

async function fontCacheDir(fontsourceId: string): Promise<string> {
  return join(await appDataDir(), "fonts", fontsourceId);
}

async function fetchFontsourceMeta(fontsourceId: string): Promise<FontsourceMeta> {
  const response = await fetch(`https://api.fontsource.org/v1/fonts/${fontsourceId}`);
  if (!response.ok) {
    throw new Error(`Fontsource: unknown font id "${fontsourceId}" (${response.status})`);
  }
  return (await response.json()) as FontsourceMeta;
}

/**
 * Ensures `fontsourceId` is cached under $APPDATA/fonts/<id>/ (metadata +
 * one woff2 file — 400/normal/latin, since the app only ever needs one
 * representative face per slot, not the full weight/style/subset matrix),
 * fetching it from the Fontsource CDN on first use only. Injects a
 * @font-face rule pointing at the local cached file (via the asset://
 * protocol, the same mechanism packages/desktop/src/lib/imageHost.ts uses
 * for local images) and returns the resolved CSS family name.
 */
export async function loadFontsourceFont(fontsourceId: string): Promise<{ family: string }> {
  const cacheDir = await fontCacheDir(fontsourceId);
  const metaPath = await join(cacheDir, "meta.json");
  const fontPath = await join(cacheDir, "regular.woff2");

  let family: string;
  if ((await exists(metaPath)) && (await exists(fontPath))) {
    family = (JSON.parse(await readTextFile(metaPath)) as { family: string }).family;
  } else {
    const meta = await fetchFontsourceMeta(fontsourceId);
    const variantUrl = meta.variants?.[WEIGHT]?.[STYLE]?.[SUBSET]?.url?.woff2;
    if (!variantUrl) {
      throw new Error(`Fontsource: no ${WEIGHT}/${STYLE}/${SUBSET} woff2 variant for "${fontsourceId}"`);
    }
    const bytes = new Uint8Array(await (await fetch(variantUrl)).arrayBuffer());
    await mkdir(cacheDir, { recursive: true });
    await writeFile(fontPath, bytes);
    await writeTextFile(metaPath, JSON.stringify({ family: meta.family }));
    family = meta.family;
  }

  if (!injectedFontIds.has(fontsourceId)) {
    injectedFontIds.add(fontsourceId);
    const assetUrl = convertFileSrc(fontPath);
    const styleTag = document.createElement("style");
    styleTag.dataset.amaranthaFont = fontsourceId;
    styleTag.textContent = `@font-face { font-family: "${family}"; src: url("${assetUrl}") format("woff2"); font-display: swap; }`;
    document.head.appendChild(styleTag);
  }

  return { family };
}

/** Resolves a FontPreference to a CSS font-family value (with a generic fallback stack). */
export async function resolveFontFamily(preference: FontPreference, slot: FontSlot): Promise<string> {
  if (preference.kind === "system" && preference.systemFamily) {
    return `"${preference.systemFamily}", ${SYSTEM_FALLBACK[slot]}`;
  }
  if (preference.kind === "fontsource" && preference.fontsourceId) {
    const { family } = await loadFontsourceFont(preference.fontsourceId);
    return `"${family}", ${SYSTEM_FALLBACK[slot]}`;
  }
  return `"${BUNDLED_FAMILY[slot]}", ${SYSTEM_FALLBACK[slot]}`;
}

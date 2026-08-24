import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";

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

async function fetchFontsourceMeta(fontsourceId: string): Promise<FontsourceMeta> {
  const response = await fetch(`https://api.fontsource.org/v1/fonts/${fontsourceId}`);
  if (!response.ok) {
    throw new Error(`Fontsource: unknown font id "${fontsourceId}" (${response.status})`);
  }
  return (await response.json()) as FontsourceMeta;
}

/**
 * Ensures `fontsourceId` is cached under <globalStorage>/fonts/<id>/ (one
 * 400/normal/latin woff2, matching desktop's fontHost.ts scope), fetching
 * from the Fontsource CDN only on first use. Only "fontsource"-kind
 * preferences ever reach this — "bundled"/"system" resolve entirely
 * client-side in the webview (see webview/fontClient.ts), no extension round
 * trip or network access needed for those.
 */
export async function resolveFontsourceFont(
  globalStorageFsPath: string,
  fontsourceId: string,
  webview: vscode.Webview
): Promise<{ family: string; fontFaceCss: string }> {
  const cacheDir = path.join(globalStorageFsPath, "fonts", fontsourceId);
  const metaPath = path.join(cacheDir, "meta.json");
  const fontPath = path.join(cacheDir, "regular.woff2");

  let family: string;
  const cached = await fs.readFile(metaPath, "utf8").catch(() => undefined);
  if (cached && (await fs.stat(fontPath).catch(() => undefined))) {
    family = (JSON.parse(cached) as { family: string }).family;
  } else {
    const meta = await fetchFontsourceMeta(fontsourceId);
    const variantUrl = meta.variants?.[WEIGHT]?.[STYLE]?.[SUBSET]?.url?.woff2;
    if (!variantUrl) {
      throw new Error(`Fontsource: no ${WEIGHT}/${STYLE}/${SUBSET} woff2 variant for "${fontsourceId}"`);
    }
    const bytes = Buffer.from(await (await fetch(variantUrl)).arrayBuffer());
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(fontPath, bytes);
    await fs.writeFile(metaPath, JSON.stringify({ family: meta.family }));
    family = meta.family;
  }

  const assetUrl = webview.asWebviewUri(vscode.Uri.file(fontPath));
  const fontFaceCss = `@font-face { font-family: "${family}"; src: url("${assetUrl.toString()}") format("woff2"); font-display: swap; }`;
  return { family, fontFaceCss };
}

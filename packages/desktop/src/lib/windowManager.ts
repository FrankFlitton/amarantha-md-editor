import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const WINDOW_LABEL_PREFIX = "doc-";

/**
 * Opens `uri` in a brand-new window rather than the current one — used when
 * the current window already has a document open or an unsaved draft, so
 * Open… doesn't clobber it. The new window's App instance reads the `open`
 * query param on mount and loads the document itself.
 */
export async function openDocumentInNewWindow(uri: string): Promise<void> {
  const label = `${WINDOW_LABEL_PREFIX}${crypto.randomUUID()}`;
  const webview = new WebviewWindow(label, {
    url: `index.html?open=${encodeURIComponent(uri)}`,
    title: "amarantha",
    width: 800,
    height: 600,
    titleBarStyle: "overlay",
    hiddenTitle: true,
  });
  await new Promise<void>((resolve, reject) => {
    void webview.once("tauri://created", () => resolve());
    void webview.once("tauri://error", (event) => reject(event.payload));
  });
}

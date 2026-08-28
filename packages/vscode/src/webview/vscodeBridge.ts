import type { FontPreference, FontSlot, ProseSize } from "@amarantha/core";
import type { EditorMode, HostMessage, WebviewMessage } from "../protocol";

interface VsCodeApi {
  postMessage(message: WebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

type HostMessageListener = (message: HostMessage) => void;

type RequestReply = Extract<HostMessage, { requestId: number }>;

/**
 * Typed wrapper around VS Code's raw postMessage bridge. Request/response
 * messages (image upload/preview, font resolution) carry an incrementing
 * requestId so the webview can `await` them like normal async calls, even
 * though the underlying channel is just window.postMessage — this is what
 * lets imageUploadHandler/imagePreviewHandler keep the exact function
 * signatures AmaranthaEditor already expects (see packages/desktop/src/lib/imageHost.ts).
 */
class VscodeBridge {
  private readonly vscode = acquireVsCodeApi();
  private nextRequestId = 1;
  private readonly pending = new Map<number, { resolve: (m: RequestReply) => void; reject: (e: Error) => void }>();
  private readonly listeners = new Set<HostMessageListener>();

  constructor() {
    window.addEventListener("message", (event: MessageEvent<HostMessage>) => {
      const message = event.data;
      if ("requestId" in message) {
        const waiting = this.pending.get(message.requestId);
        if (!waiting) return;
        this.pending.delete(message.requestId);
        if (message.type === "requestFailed") waiting.reject(new Error(message.error));
        else waiting.resolve(message);
        return;
      }
      for (const listener of this.listeners) listener(message);
    });
  }

  onMessage(listener: HostMessageListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  ready(): void {
    this.vscode.postMessage({ type: "ready" });
  }

  edit(text: string): void {
    this.vscode.postMessage({ type: "edit", text });
  }

  reportState(state: {
    mode: EditorMode;
    frontmatterHidden: boolean;
    proseSize: ProseSize;
    sansFont: FontPreference;
    headingFont: FontPreference;
    monoFont: FontPreference;
  }): void {
    this.vscode.postMessage({ type: "stateChanged", ...state });
  }

  private request<T extends RequestReply>(message: WebviewMessage & { requestId: number }): Promise<T> {
    return new Promise((resolve, reject) => {
      this.pending.set(message.requestId, { resolve: resolve as (m: RequestReply) => void, reject });
      this.vscode.postMessage(message);
    });
  }

  async requestImageUpload(name: string, mimeType: string, dataBase64: string): Promise<string> {
    const requestId = this.nextRequestId++;
    const reply = await this.request<Extract<HostMessage, { type: "imageUploadResolved" }>>({
      type: "requestImageUpload",
      requestId,
      name,
      mimeType,
      dataBase64,
    });
    return reply.src;
  }

  async requestImagePreview(src: string): Promise<string> {
    const requestId = this.nextRequestId++;
    const reply = await this.request<Extract<HostMessage, { type: "imagePreviewResolved" }>>({
      type: "requestImagePreview",
      requestId,
      src,
    });
    return reply.src;
  }

  requestFont(
    slot: FontSlot,
    preference: FontPreference
  ): Promise<Extract<HostMessage, { type: "fontResolved" }>> {
    const requestId = this.nextRequestId++;
    return this.request<Extract<HostMessage, { type: "fontResolved" }>>({ type: "requestFont", requestId, slot, preference });
  }
}

export const bridge = new VscodeBridge();

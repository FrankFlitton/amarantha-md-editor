import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AmaranthaEditor, type EditorMode } from "@amarantha/editor";
import {
  arrayBufferToBase64,
  DEFAULT_FONT_PREFERENCE,
  type ComponentDefinition,
  type FontPreference,
  type FrontmatterFieldDefinition,
  type ProseSize,
} from "@amarantha/core";
import { createRegistry } from "@amarantha/mdx";
import { bridge } from "./vscodeBridge";
import { useFontVariable } from "./useFontVariable";
import "./WebviewApp.css";

const EDIT_DEBOUNCE_MS = 250;

export function WebviewApp() {
  const [uri, setUri] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<EditorMode>("rich");
  const [proseSize, setProseSize] = useState<ProseSize>("base");
  const [componentDefinitions, setComponentDefinitions] = useState<ComponentDefinition[]>([]);
  const [frontmatterFields, setFrontmatterFields] = useState<Record<string, FrontmatterFieldDefinition>>({});
  const [frontmatterHidden, setFrontmatterHidden] = useState(false);
  // Bumped on "init"/"externalUpdate" and folded into AmaranthaEditor's key:
  // MDXEditor's `markdown` prop only seeds initial content (same caveat
  // desktop's App.tsx documents), so a genuinely external change needs a
  // remount to actually show up. The webview's own edits never bump this —
  // the extension suppresses the echo of those (see AmaranthaEditorProvider's
  // lastKnownWebviewText) — so typing never loses cursor position.
  const [remountToken, setRemountToken] = useState(0);

  const [sansFont, setSansFont] = useState<FontPreference>(DEFAULT_FONT_PREFERENCE);
  const [headingFont, setHeadingFont] = useState<FontPreference>(DEFAULT_FONT_PREFERENCE);
  const [monoFont, setMonoFont] = useState<FontPreference>(DEFAULT_FONT_PREFERENCE);

  useEffect(() => {
    // A constant, not one of desktop's 10 theme ids — only needed so
    // mdxeditor-adapter.css's `html[data-theme] .mdxeditor-popup-container`
    // selector matches; vscode-theme-adapter.css supplies the real colors.
    document.documentElement.dataset.theme = "vscode";
  }, []);

  useEffect(() => {
    const unsubscribe = bridge.onMessage((message) => {
      if (message.type === "init") {
        setUri(message.uri);
        setText(message.text);
        setComponentDefinitions(message.componentDefinitions);
        setFrontmatterFields(message.frontmatterFields);
        setRemountToken((t) => t + 1);
      } else if (message.type === "externalUpdate") {
        setText(message.text);
        setRemountToken((t) => t + 1);
      } else if (message.type === "applyMode") {
        setMode(message.mode);
      } else if (message.type === "applyFrontmatterHidden") {
        setFrontmatterHidden(message.hidden);
      } else if (message.type === "applyProseSize") {
        setProseSize(message.size);
      } else if (message.type === "applyFont") {
        if (message.slot === "sans") setSansFont(message.preference);
        else if (message.slot === "heading") setHeadingFont(message.preference);
        else setMonoFont(message.preference);
      }
    });
    bridge.ready();
    return unsubscribe;
  }, []);

  // Reports the webview's current typography/mode state to the extension
  // host so it can keep the editor/title icons' context keys (and the
  // typography Quick Pick's "current value" display) in sync — this state
  // otherwise only lives as React state here. Gated on `uri` since that's
  // only set once "init" arrives.
  useEffect(() => {
    if (!uri) return;
    bridge.reportState({ mode, frontmatterHidden, proseSize, sansFont, headingFont, monoFont });
  }, [uri, mode, frontmatterHidden, proseSize, sansFont, headingFont, monoFont]);

  const componentRegistry = useMemo(() => createRegistry(componentDefinitions), [componentDefinitions]);

  const editTimer = useRef<number | undefined>(undefined);
  const handleChange = useCallback((next: string) => {
    setText(next);
    window.clearTimeout(editTimer.current);
    editTimer.current = window.setTimeout(() => bridge.edit(next), EDIT_DEBOUNCE_MS);
  }, []);

  const imageUploadHandler = useCallback(async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    return bridge.requestImageUpload(file.name, file.type, arrayBufferToBase64(buffer));
  }, []);

  const imagePreviewHandler = useCallback((src: string) => bridge.requestImagePreview(src), []);

  const sansFontError = useFontVariable(sansFont, "sans", "--am-font-sans");
  const headingFontError = useFontVariable(headingFont, "heading", "--am-font-heading");
  const monoFontError = useFontVariable(monoFont, "mono", "--am-font-mono");

  if (!uri) {
    return <div className="vscode-loading">Loading Amarantha…</div>;
  }

  return (
    <div className="amarantha-app vscode-shell">
      <main className="vscode-editor-surface">
        <AmaranthaEditor
          key={`${uri}:${mode}:${remountToken}:${proseSize}`}
          value={text}
          onChange={handleChange}
          mode={mode}
          proseSize={proseSize}
          componentRegistry={componentRegistry}
          frontmatterFields={frontmatterFields}
          frontmatterHidden={frontmatterHidden}
          imageUploadHandler={imageUploadHandler}
          imagePreviewHandler={imagePreviewHandler}
        />
      </main>
      {(sansFontError || headingFontError || monoFontError) && (
        <div className="vscode-font-error" data-testid="font-error-banner">
          {sansFontError && <span>Body font: {sansFontError}</span>}
          {headingFontError && <span>Heading font: {headingFontError}</span>}
          {monoFontError && <span>Code font: {monoFontError}</span>}
        </div>
      )}
    </div>
  );
}

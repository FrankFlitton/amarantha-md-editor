import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AmaranthaEditor, type EditorMode } from "@amarantha/editor";
import {
  arrayBufferToBase64,
  DEFAULT_FONT_PREFERENCE,
  type ComponentDefinition,
  type FontPreference,
  type FontSlot,
  type FrontmatterFieldDefinition,
  type ProseSize,
} from "@amarantha/core";
import { createRegistry } from "@amarantha/mdx";
import { PROSE_SIZES, CURATED_FONTS } from "@amarantha/theme";
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
      }
    });
    bridge.ready();
    return unsubscribe;
  }, []);

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
      <div className="vscode-toolbar">
        <div className="vscode-toolbar-group" role="group" aria-label="Editor mode">
          <button type="button" aria-pressed={mode === "rich"} onClick={() => setMode("rich")}>
            Rich
          </button>
          <button type="button" aria-pressed={mode === "source"} onClick={() => setMode("source")}>
            Source
          </button>
        </div>
        <button type="button" aria-pressed={!frontmatterHidden} onClick={() => setFrontmatterHidden((h) => !h)}>
          Frontmatter
        </button>
        <select value={proseSize} onChange={(event) => setProseSize(event.target.value as ProseSize)} aria-label="Text size">
          {PROSE_SIZES.map(({ size, label }) => (
            <option key={size} value={size}>
              {label}
            </option>
          ))}
        </select>
        <span className="vscode-toolbar-spacer" />
        <FontPicker slot="sans" label="Body" value={sansFont} onChange={setSansFont} />
        <FontPicker slot="heading" label="Heading" value={headingFont} onChange={setHeadingFont} />
        <FontPicker slot="mono" label="Code" value={monoFont} onChange={setMonoFont} />
      </div>
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

interface FontPickerProps {
  slot: FontSlot;
  label: string;
  value: FontPreference;
  onChange: (preference: FontPreference) => void;
}

function FontPicker({ slot, label, value, onChange }: FontPickerProps) {
  const options = CURATED_FONTS.filter((font) => font.slot === slot);
  const [customOpen, setCustomOpen] = useState(false);
  const selectValue = customOpen
    ? "__custom__"
    : value.kind === "fontsource"
      ? (value.fontsourceId ?? "__custom__")
      : value.kind === "system"
        ? "__system__"
        : "__bundled__";

  return (
    <div className="vscode-font-picker">
      <select
        aria-label={`${label} font`}
        value={selectValue}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "__bundled__") {
            setCustomOpen(false);
            onChange({ kind: "bundled" });
          } else if (next === "__system__") {
            setCustomOpen(false);
            onChange({ kind: "system", systemFamily: value.kind === "system" ? value.systemFamily : "" });
          } else if (next === "__custom__") {
            setCustomOpen(true);
          } else {
            setCustomOpen(false);
            onChange({ kind: "fontsource", fontsourceId: next });
          }
        }}
      >
        <option value="__bundled__">{label}: Default</option>
        {options.map((font) => (
          <option key={font.id} value={font.id}>
            {font.label}
          </option>
        ))}
        <option value="__system__">System font…</option>
        <option value="__custom__">Custom Fontsource ID…</option>
      </select>
      {(customOpen || value.kind === "system") && (
        <input
          type="text"
          className="vscode-font-picker-input"
          placeholder={value.kind === "system" ? "System font family" : "Fontsource ID"}
          defaultValue={value.kind === "system" ? (value.systemFamily ?? "") : value.kind === "fontsource" ? (value.fontsourceId ?? "") : ""}
          onBlur={(event) => {
            const raw = event.target.value.trim();
            if (!raw) return;
            onChange(value.kind === "system" ? { kind: "system", systemFamily: raw } : { kind: "fontsource", fontsourceId: raw });
          }}
        />
      )}
    </div>
  );
}

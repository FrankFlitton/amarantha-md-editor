import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AmaranthaEditor, type EditorMode } from "@amarantha/editor";
import { themeId } from "@amarantha/theme";
import type { ExtensionSettings } from "../lib/settings";
import { downloadMarkdown } from "./download";

export interface ContentAppProps {
  markdown: string;
  filename: string;
  settings: ExtensionSettings;
  sourceUrl: string;
  prefersDark: boolean;
}

export function ContentApp({ markdown, filename, settings, sourceUrl, prefersDark }: ContentAppProps) {
  // MDXEditor portals its floating toolbar, code-block language <Select>, and
  // dialogs to `overlayContainer` (default: document.body, per its own
  // EditorRootElement) — the real page's DOM, entirely outside this shadow
  // root, where none of the <style> injected in main.tsx can ever reach it.
  // Pointing it at this shell div instead keeps those portals inside the
  // shadow tree and inheriting the --am-* tokens `data-theme` below sets.
  const [overlayContainer, setOverlayContainer] = useState<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<EditorMode>("rich");
  // Lifted out of AmaranthaEditor rather than left as page-owned state:
  // `value` only seeds the editor once per mount (see SourceView's own
  // docstring), and Rich/Source toggling remounts it, so edits have to live
  // here to survive a mode switch.
  const [content, setContent] = useState(markdown);
  const [savedContent, setSavedContent] = useState(markdown);
  const [editing, setEditing] = useState(false);
  const dirty = content !== savedContent;

  const dark = settings.themeMode === "system" ? prefersDark : settings.themeMode === "dark";
  const currentThemeId = useMemo(() => themeId(settings.themeFamily, dark ? "dark" : "light"), [settings.themeFamily, dark]);

  const handleSave = useCallback(() => {
    downloadMarkdown(content, filename);
    setSavedContent(content);
  }, [content, filename]);

  // No filesystem access here (that's the native app's job) — saving is a
  // browser download of the edited text under the original filename.
  // Guard against losing in-progress edits both to an accidental tab close
  // and to Chrome's own Cmd/Ctrl+S "Save Page As" dialog, which would save
  // the extension's injected HTML shell rather than the markdown.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("keydown", keydown, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("keydown", keydown, true);
    };
  }, [handleSave]);

  return (
    <div
      ref={setOverlayContainer}
      className={`am-ext-shell amarantha-app ${dark ? "dark" : "light-theme"}`}
      data-theme={currentThemeId}
    >
      <div className="am-ext-bar">
        <span className="am-ext-brand">Amarantha</span>
        <span className="am-ext-source" title={sourceUrl}>
          {sourceUrl}
        </span>
        {dirty && (
          <span className="am-ext-dirty" title="Unsaved changes">
            ●
          </span>
        )}
        <span className="am-ext-spacer" />
        <div className="am-ext-mode-group" role="group" aria-label="View mode">
          <button type="button" aria-pressed={mode === "rich"} onClick={() => setMode("rich")}>
            Rich
          </button>
          <button type="button" aria-pressed={mode === "source"} onClick={() => setMode("source")}>
            Source
          </button>
        </div>
        <button type="button" aria-pressed={editing} onClick={() => setEditing((prev) => !prev)}>
          {editing ? "Editing" : "Edit"}
        </button>
        <button type="button" onClick={handleSave} disabled={!dirty} title={`Save as ${filename}`}>
          Save
        </button>
      </div>
      <main className="am-ext-surface">
        <AmaranthaEditor
          // Both `value` (SourceView) and `readOnly` (corePlugin init config,
          // MDXEditor) are seed-once inputs, not reactively-synced props —
          // same "remount via key" contract every other host in this repo
          // relies on for mode/file switches, extended here to cover the
          // Edit/Lock toggle too so flipping it actually takes effect.
          key={`${mode}:${editing}`}
          value={content}
          onChange={setContent}
          mode={mode}
          proseSize={settings.proseSize}
          readOnly={!editing}
          overlayContainer={overlayContainer}
        />
      </main>
    </div>
  );
}

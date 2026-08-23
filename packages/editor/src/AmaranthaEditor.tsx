import "@mdxeditor/editor/style.css";
import {
  MDXEditor,
  type MDXEditorMethods,
  type ImageUploadHandler,
  type ImagePreviewHandler,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  imagePlugin,
  jsxPlugin,
  markdownShortcutPlugin,
} from "@mdxeditor/editor";
import type { Ref } from "react";
import type { ComponentRegistry, FrontmatterFieldDefinition, ProseSize } from "@amarantha/core";
import { SourceView } from "./SourceView";
import { createJsxComponentDescriptors } from "./jsx/descriptors";
import { toolbarPlugin } from "./toolbar";
import { AmaranthaToolbarContents } from "./toolbar/AmaranthaToolbarContents";
import { amaranthaFrontmatterPlugin } from "./frontmatter/plugin";

export type EditorMode = "rich" | "source";

// Static literal lookup, not a template literal: Tailwind's content scanner
// finds literal class-name strings in source, and a dynamically-built
// `prose-${size}` string would go undetected, silently dropping the
// generated CSS for whichever sizes aren't otherwise referenced.
const PROSE_SIZE_CLASS: Record<ProseSize, string> = {
  sm: "prose-sm",
  base: "prose-base",
  lg: "prose-lg",
  xl: "prose-xl",
  "2xl": "prose-2xl",
};

export interface AmaranthaEditorProps {
  value: string;
  onChange: (next: string) => void;
  mode: EditorMode;
  editorRef?: Ref<MDXEditorMethods>;
  /** Host-supplied: persist a pasted/dropped image, return the src to embed. */
  imageUploadHandler?: ImageUploadHandler;
  /** Host-supplied: resolve a markdown image src into a renderable URL (e.g. local path -> asset:// URL). */
  imagePreviewHandler?: ImagePreviewHandler;
  /** Host-supplied: declares which custom MDX/JSX components get rich props editors. */
  componentRegistry?: ComponentRegistry;
  /** Base prose stylesheet class(es) — the seam for swapping in a different base
   *  stylesheet or design system later without touching this component. */
  proseClassName?: string;
  /** Tailwind Typography size modifier applied on top of proseClassName. */
  proseSize?: ProseSize;
  /** Host-supplied: repo-declared frontmatter field schema (RFC: not mandatory per document). */
  frontmatterFields?: Record<string, FrontmatterFieldDefinition>;
  /** Host-supplied: session-only visibility toggle for the frontmatter strip, driven by DocumentHeader's glyph. */
  frontmatterHidden?: boolean;
}

const CODE_BLOCK_LANGUAGES = {
  "": "Text",
  js: "JavaScript",
  ts: "TypeScript",
  tsx: "TSX",
  bash: "Bash",
  json: "JSON",
  md: "Markdown",
  html: "HTML",
  css: "CSS",
};

export function AmaranthaEditor({
  value,
  onChange,
  mode,
  editorRef,
  imageUploadHandler,
  imagePreviewHandler,
  componentRegistry,
  proseClassName = "amarantha-prose prose",
  proseSize = "base",
  frontmatterFields,
  frontmatterHidden,
}: AmaranthaEditorProps) {
  if (mode === "source") {
    return <SourceView value={value} onChange={onChange} />;
  }

  const jsxComponentDescriptors = componentRegistry ? createJsxComponentDescriptors(componentRegistry) : undefined;

  return (
    <div data-testid="amarantha-rich-editor">
      <MDXEditor
        ref={editorRef}
        markdown={value}
        onChange={onChange}
        contentEditableClassName={`${proseClassName} ${PROSE_SIZE_CLASS[proseSize]}`}
        // Vendored, selection-triggered toolbar (see ./toolbar) instead of upstream's
        // always-visible toolbarPlugin: it stays hidden until text is selected, which
        // is what keeps the minimalist canvas while still surfacing formatting controls.
        plugins={[
          toolbarPlugin({ toolbarContents: () => <AmaranthaToolbarContents /> }),
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          tablePlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
          codeMirrorPlugin({ codeBlockLanguages: CODE_BLOCK_LANGUAGES }),
          imagePlugin({
            imageUploadHandler: imageUploadHandler ?? null,
            imagePreviewHandler: imagePreviewHandler ?? null,
          }),
          amaranthaFrontmatterPlugin({ fields: frontmatterFields, hidden: frontmatterHidden }),
          ...(jsxComponentDescriptors ? [jsxPlugin({ jsxComponentDescriptors })] : []),
          markdownShortcutPlugin(),
        ]}
      />
    </div>
  );
}

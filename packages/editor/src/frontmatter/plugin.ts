import {
  addExportVisitor$,
  addImportVisitor$,
  addLexicalNode$,
  addMdastExtension$,
  addSyntaxExtension$,
  addToMarkdownExtension$,
  createRootEditorSubscription$,
  realmPlugin,
  rootEditor$,
} from "@mdxeditor/editor";
import { Action, Cell, withLatestFrom } from "@mdxeditor/gurx";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_CRITICAL,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { frontmatterFromMarkdown, frontmatterToMarkdown } from "mdast-util-frontmatter";
import { frontmatter } from "micromark-extension-frontmatter";
import type { FrontmatterFieldDefinition } from "@amarantha/core";
import {
  $createAmaranthaFrontmatterNode,
  $isAmaranthaFrontmatterNode,
  AmaranthaFrontmatterNode,
} from "./AmaranthaFrontmatterNode";
import { AmaranthaLexicalFrontmatterVisitor, AmaranthaMdastFrontmatterVisitor } from "./visitors";

/** The repo-declared field schema for the currently open document (empty when none configured). */
export const frontmatterFields$ = Cell<Record<string, FrontmatterFieldDefinition>>({});
/** Session-only visibility toggle, driven by DocumentHeader's glyph. */
export const frontmatterHidden$ = Cell(false);

export const insertAmaranthaFrontmatter$ = Action((r) => {
  r.sub(r.pipe(insertAmaranthaFrontmatter$, withLatestFrom(rootEditor$)), ([, rootEditor]) => {
    rootEditor?.update(() => {
      const firstItem = $getRoot().getFirstChild();
      if (!$isAmaranthaFrontmatterNode(firstItem)) {
        const fmNode = $createAmaranthaFrontmatterNode('"": ""');
        if (firstItem) firstItem.insertBefore(fmNode);
        else $getRoot().append(fmNode);
      }
    });
    r.pub(frontmatterHidden$, false);
  });
});

export const removeAmaranthaFrontmatter$ = Action((r) => {
  r.sub(r.pipe(removeAmaranthaFrontmatter$, withLatestFrom(rootEditor$)), ([, rootEditor]) => {
    rootEditor?.update(() => {
      const firstItem = $getRoot().getFirstChild();
      if ($isAmaranthaFrontmatterNode(firstItem)) firstItem.remove();
    });
  });
});

export const hasAmaranthaFrontmatter$ = Cell(false, (r) => {
  r.pub(createRootEditorSubscription$, (rootEditor) => {
    return rootEditor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        r.pub(hasAmaranthaFrontmatter$, $isAmaranthaFrontmatterNode($getRoot().getFirstChild()));
      });
    });
  });
});

export interface AmaranthaFrontmatterPluginParams {
  /** Repo-declared frontmatter field schema (RFC: not mandatory for every document). */
  fields?: Record<string, FrontmatterFieldDefinition>;
  /** Session-only visibility toggle, driven by the header glyph. */
  hidden?: boolean;
}

/**
 * Built from public MDXEditor primitives (realmPlugin, addMdastExtension$,
 * DecoratorNode, useMdastNodeUpdater, ...) rather than a fork of the stock
 * frontmatter/*.js files — every primitive the stock plugin itself is built
 * from is public. See docs/decisions.md for when this codebase forks
 * (toolbar/) vs. composes from public exports (this, and jsx/).
 */
export const amaranthaFrontmatterPlugin = realmPlugin<AmaranthaFrontmatterPluginParams>({
  init(realm, params) {
    realm.pubIn({
      [addMdastExtension$]: frontmatterFromMarkdown("yaml"),
      [addSyntaxExtension$]: frontmatter(),
      [addLexicalNode$]: AmaranthaFrontmatterNode,
      [addImportVisitor$]: AmaranthaMdastFrontmatterVisitor,
      [addExportVisitor$]: AmaranthaLexicalFrontmatterVisitor,
      [addToMarkdownExtension$]: frontmatterToMarkdown("yaml"),
      // Guards against an accidental Backspace-at-document-start deleting the
      // frontmatter block, and rehydrates it if a transform ever moves
      // selection's first node back to a bare yaml node. Ported from the
      // stock frontmatterPlugin's identical KEY_DOWN_COMMAND handler.
      [createRootEditorSubscription$]: (editor: LexicalEditor) => {
        return editor.registerCommand(
          KEY_DOWN_COMMAND,
          (event: KeyboardEvent) => {
            let shouldPrevent = false;
            editor.read(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                if (
                  selection.isCollapsed() &&
                  selection.anchor.offset === 0 &&
                  selection.focus.offset === 0 &&
                  event.key === "Backspace"
                ) {
                  let node: LexicalNode | null = selection.getNodes()[0] ?? null;
                  if ($isTextNode(node)) {
                    node = node.getParent();
                  }
                  const prevSibling = node?.getPreviousSibling();
                  if ($isAmaranthaFrontmatterNode(prevSibling)) {
                    shouldPrevent = true;
                    event.preventDefault();
                  }
                } else {
                  const firstNode = selection.getNodes()[0];
                  if ($isAmaranthaFrontmatterNode(firstNode)) {
                    const yaml = firstNode.getYaml();
                    setTimeout(() => {
                      editor.update(
                        () => {
                          const firstItem = $getRoot().getFirstChild();
                          if (!$isAmaranthaFrontmatterNode(firstItem)) {
                            $getRoot().splice(0, 0, [$createAmaranthaFrontmatterNode(yaml)]);
                          }
                        },
                        { discrete: true }
                      );
                    });
                  }
                }
              }
            });
            return shouldPrevent;
          },
          COMMAND_PRIORITY_CRITICAL
        );
      },
    });
    realm.pub(frontmatterFields$, params?.fields ?? {});
    realm.pub(frontmatterHidden$, params?.hidden ?? false);
  },
  update(realm, params) {
    realm.pub(frontmatterFields$, params?.fields ?? {});
    realm.pub(frontmatterHidden$, params?.hidden ?? false);
  },
});

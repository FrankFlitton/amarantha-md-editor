import { DecoratorNode, type EditorConfig, type LexicalEditor, type LexicalNode, type SerializedLexicalNode, type Spread } from "lexical";
import { NestedEditorsContext, voidEmitter, type VoidEmitter } from "@mdxeditor/editor";
import type { ReactElement } from "react";
import { AmaranthaFrontmatterEditor } from "./AmaranthaFrontmatterEditor";

export type SerializedAmaranthaFrontmatterNode = Spread<
  { yaml: string; type: "amarantha-frontmatter"; version: 1 },
  SerializedLexicalNode
>;

/**
 * Built from public MDXEditor primitives (DecoratorNode, NestedEditorsContext,
 * useMdastNodeUpdater), not a fork of the stock frontmatter/*.js files — see
 * docs/decisions.md. Registered under its own Lexical type ("amarantha-frontmatter",
 * not "frontmatter") so it can never collide with the stock FrontmatterNode.
 */
export class AmaranthaFrontmatterNode extends DecoratorNode<ReactElement> {
  __yaml: string;
  __focusEmitter: VoidEmitter = voidEmitter();

  constructor(yaml: string, key?: string) {
    super(key);
    this.__yaml = yaml;
  }

  static getType(): string {
    return "amarantha-frontmatter";
  }

  static clone(node: AmaranthaFrontmatterNode): AmaranthaFrontmatterNode {
    return new AmaranthaFrontmatterNode(node.__yaml, node.__key);
  }

  static importJSON(serializedNode: SerializedAmaranthaFrontmatterNode): AmaranthaFrontmatterNode {
    return $createAmaranthaFrontmatterNode(serializedNode.yaml);
  }

  exportJSON(): SerializedAmaranthaFrontmatterNode {
    return { yaml: this.getYaml(), type: "amarantha-frontmatter", version: 1 };
  }

  createDOM(): HTMLElement {
    return document.createElement("div");
  }

  updateDOM(): boolean {
    return false;
  }

  getYaml(): string {
    return this.getLatest().__yaml;
  }

  setYaml(yaml: string): void {
    if (yaml !== this.__yaml) this.getWritable().__yaml = yaml;
  }

  /** Called by useMdastNodeUpdater()'s generic {...mdastNode, ...partial} merge. */
  setMdastNode(mdastNode: { value: string }): void {
    this.setYaml(mdastNode.value);
  }

  decorate(parentEditor: LexicalEditor, config: EditorConfig): ReactElement {
    // Assigned to an unannotated const first (not passed as an inline
    // literal) so structural assignability, not TS's excess-property-check
    // on object literals, governs matching NestedEditorsContextValue's base
    // unist `Node` type for mdastNode.
    const mdastNode = { type: "yaml" as const, value: this.getYaml() };
    return (
      <NestedEditorsContext.Provider
        value={{
          parentEditor,
          config,
          mdastNode,
          lexicalNode: this,
          focusEmitter: this.__focusEmitter,
        }}
      >
        <AmaranthaFrontmatterEditor />
      </NestedEditorsContext.Provider>
    );
  }

  isKeyboardSelectable(): boolean {
    return false;
  }

  isInline(): boolean {
    return false;
  }
}

export function $createAmaranthaFrontmatterNode(yaml: string): AmaranthaFrontmatterNode {
  return new AmaranthaFrontmatterNode(yaml);
}

export function $isAmaranthaFrontmatterNode(node: LexicalNode | null | undefined): node is AmaranthaFrontmatterNode {
  return node instanceof AmaranthaFrontmatterNode;
}

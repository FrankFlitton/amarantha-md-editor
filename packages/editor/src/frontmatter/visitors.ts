import type { LexicalExportVisitor, MdastImportVisitor } from "@mdxeditor/editor";
import type { Yaml } from "mdast";
import { $createAmaranthaFrontmatterNode, $isAmaranthaFrontmatterNode, AmaranthaFrontmatterNode } from "./AmaranthaFrontmatterNode";

/** Structural copy of MdastFrontmatterVisitor, retargeted at AmaranthaFrontmatterNode. */
export const AmaranthaMdastFrontmatterVisitor: MdastImportVisitor<Yaml> = {
  testNode: "yaml",
  visitNode({ mdastNode, actions }) {
    actions.addAndStepInto($createAmaranthaFrontmatterNode(mdastNode.value));
  },
};

/** Structural copy of LexicalFrontmatterVisitor, retargeted at AmaranthaFrontmatterNode. */
export const AmaranthaLexicalFrontmatterVisitor: LexicalExportVisitor<AmaranthaFrontmatterNode, Yaml> = {
  testLexicalNode: $isAmaranthaFrontmatterNode,
  visitLexicalNode({ actions, lexicalNode }) {
    actions.addAndStepInto("yaml", { value: lexicalNode.getYaml() });
  },
};

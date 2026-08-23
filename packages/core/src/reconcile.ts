import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { frontmatter } from "micromark-extension-frontmatter";
import type { Root, RootContent } from "mdast";

/**
 * CommonMark + GFM (tables, strikethrough, task lists, autolinks — all
 * supported via AmaranthaEditor's tablePlugin/listsPlugin) + YAML frontmatter.
 * Deliberately NOT MDX-aware: matching MDXEditor's own JSX/expression syntax
 * exactly would need its exact micromark-extension-mdxjs configuration, and a
 * mismatch there risks worse harm (misparsed structure) than the benefit is
 * worth. A JSX/component block instead falls through CommonMark's native raw
 * HTML block rule as an opaque node — since reconciliation only ever slices
 * whole-node source substrings (never re-serializes a node itself), an
 * unchanged JSX block still round-trips byte-identically; only a genuinely
 * edited one loses this reconciler's benefit and falls back to MDXEditor's
 * own output for that block, which is exactly today's pre-reconciliation
 * behavior — never a regression, just an unclaimed improvement (RFC Milestone
 * 1 follow-up: real MDX-aware parsing here, once justified by a measured gap
 * the same way the list-marker case justified this session's work).
 */
const PARSE_OPTIONS = {
  extensions: [gfm(), frontmatter(["yaml"])],
  mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown(["yaml"])],
};

function parse(text: string): Root | undefined {
  try {
    return fromMarkdown(text, PARSE_OPTIONS);
  } catch {
    return undefined;
  }
}

/**
 * Deep-equal two mdast (sub)trees, ignoring `position` (source-location
 * metadata, not content). mdast itself never records the stylistic choices
 * that make two written forms of "the same thing" differ byte-for-byte — a
 * list's bullet character, an emphasis run's `_` vs `*`, a fence's backtick
 * count — so two nodes with identical content are already indistinguishable
 * here regardless of how differently the source once spelled them. That's
 * exactly the source of the gap this module exists to close: a naive
 * reserialize has no memory of the original spelling either, so it invents
 * its own (mdast-util-to-markdown's hardcoded defaults) — this function is
 * what lets the reconciler notice "unchanged" and keep the original bytes
 * instead of ever calling a serializer at all.
 */
function contentEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => contentEqual(item, b[i]));
  }
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const aRec = a as Record<string, unknown>;
  const bRec = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(aRec), ...Object.keys(bRec)]);
  keys.delete("position");
  for (const key of keys) {
    if (!contentEqual(aRec[key], bRec[key])) return false;
  }
  return true;
}

function offsetsOf(node: RootContent): { start: number; end: number } | undefined {
  const pos = node.position;
  if (!pos || pos.start.offset === undefined || pos.end.offset === undefined) return undefined;
  return { start: pos.start.offset, end: pos.end.offset };
}

interface AlignedPair {
  original?: RootContent;
  edited?: RootContent;
}

/**
 * Standard LCS alignment of two node sequences (the classic "diff" algorithm,
 * applied to top-level block nodes instead of text lines), using
 * `contentEqual` in place of line-string equality. Matched pairs are content
 * that survived the edit unchanged, in order; an `original`-only entry was
 * deleted, an `edited`-only entry is new or was changed enough that no
 * matching original node exists.
 */
function alignChildren(a: readonly RootContent[], b: readonly RootContent[]): AlignedPair[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = contentEqual(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const result: AlignedPair[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (contentEqual(a[i], b[j])) {
      result.push({ original: a[i], edited: b[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ original: a[i] });
      i++;
    } else {
      result.push({ edited: b[j] });
      j++;
    }
  }
  while (i < n) result.push({ original: a[i++] });
  while (j < m) result.push({ edited: b[j++] });
  return result;
}

/**
 * Reconciles MDXEditor's freshly serialized `edited` text against the
 * `original` text it was loaded from: every top-level block that's actually
 * unchanged keeps its exact original bytes (whitespace, comments, list/
 * emphasis/fence marker style, everything); only genuinely new or changed
 * blocks take MDXEditor's new text. This is what makes "load then save an
 * unedited document" byte-identical and "a local edit" touch only the edited
 * region — the RFC's Milestone 1 acceptance criteria — without needing a
 * replacement parser/serializer for the rich-editing surface itself.
 *
 * Falls back to returning `edited` unchanged whenever reconciliation can't
 * proceed safely (a parse failure, or missing source-position data) — this
 * is a strictly best-effort improvement layered over the pre-existing
 * behavior, never a regression from it.
 */
export function reconcileMarkdown(original: string, edited: string): string {
  const originalTree = parse(original);
  const editedTree = parse(edited);
  if (!originalTree || !editedTree) return edited;

  const pairs = alignChildren(originalTree.children, editedTree.children);
  if (pairs.length === 0 || !pairs.some((pair) => pair.original && pair.edited)) return edited;

  const parts: string[] = [];
  let prevOriginalEnd: number | undefined;
  let prevEditedEnd: number | undefined;

  for (const pair of pairs) {
    if (pair.original && pair.edited) {
      const offs = offsetsOf(pair.original);
      const editedOffs = offsetsOf(pair.edited);
      if (!offs || !editedOffs) return edited;
      parts.push(prevOriginalEnd === undefined ? "" : original.slice(prevOriginalEnd, offs.start));
      parts.push(original.slice(offs.start, offs.end));
      prevOriginalEnd = offs.end;
      prevEditedEnd = editedOffs.end;
    } else if (pair.edited) {
      const offs = offsetsOf(pair.edited);
      if (!offs) return edited;
      parts.push(prevEditedEnd === undefined ? "" : edited.slice(prevEditedEnd, offs.start));
      parts.push(edited.slice(offs.start, offs.end));
      prevEditedEnd = offs.end;
    } else if (pair.original) {
      const offs = offsetsOf(pair.original);
      if (offs) prevOriginalEnd = offs.end;
    }
  }

  // A matched pair carries both `original` and `edited`, so `original`'s
  // presence (not `edited`'s) is what distinguishes "the last kept node came
  // from the source" (matched or deleted — either way, use the *original*
  // text's tail, e.g. its exact trailing EOF newline) from "the last node is
  // purely new" (use the edited text's tail instead).
  const lastPair = pairs[pairs.length - 1];
  if (lastPair.original) {
    if (prevOriginalEnd !== undefined) parts.push(original.slice(prevOriginalEnd));
  } else if (lastPair.edited && prevEditedEnd !== undefined) {
    parts.push(edited.slice(prevEditedEnd));
  }

  return parts.join("");
}

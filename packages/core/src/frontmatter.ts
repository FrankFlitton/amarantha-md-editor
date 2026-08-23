import { isScalar, isSeq, parse as parseYamlValue, parseDocument, type Scalar } from "yaml";

/**
 * Source-preserving frontmatter parse/mutate helpers, built on `yaml`'s
 * `Document` API (not `js-yaml`'s lossy `load`/`dump`, which MDXEditor's
 * stock frontmatter plugin uses internally): `doc.set(key, value)` mutates
 * one key while leaving every other key's order, comments, quoting, and form
 * untouched. Per the RFC ("do not silently coerce dates/booleans/nulls/
 * arrays/custom YAML"), only the key being edited is ever touched — and its
 * new value is whatever the user's own typed text resolves to as YAML (so
 * typing `true`/`42`/`["a","b"]` naturally produces a boolean/number/array,
 * the same way it would if they'd hand-edited the YAML source).
 */

interface YamlPairLike {
  key: unknown;
}

function keyString(pair: YamlPairLike): string {
  const key = pair.key;
  if (key && typeof key === "object" && "value" in key) {
    return String((key as { value: unknown }).value);
  }
  return String(key);
}

function parse(yamlText: string) {
  const doc = parseDocument(yamlText);
  const contents = doc.contents;
  const items: YamlPairLike[] =
    contents && typeof contents === "object" && "items" in contents
      ? (contents as { items: YamlPairLike[] }).items
      : [];
  return { doc, items };
}

/**
 * The plain-text form a value is shown/edited as: strings render bare (no
 * quotes), everything else renders as its YAML/JSON flow form — which is
 * also what `setFrontmatterValue` parses back, so a collection stays
 * editable as a single line (e.g. `["a", "b"]`) without a dedicated widget.
 */
function valueText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  return JSON.stringify(value);
}

/** Lists every top-level frontmatter key, in document order. */
export function listFrontmatterKeys(yamlText: string): string[] {
  return parse(yamlText).items.map(keyString);
}

export type FrontmatterEntry =
  | { key: string; kind: "scalar"; value: string }
  | { key: string; kind: "array"; items: string[] };

/**
 * Every top-level key/value pair, in document order. An array-valued key
 * reports each item separately (kind: "array") so the UI can render one
 * editable field per item instead of one field for the whole array; every
 * other value reports as a single plain-text edit form (kind: "scalar" —
 * still true for object/map values, edited as their JSON flow form).
 */
export function readFrontmatterEntries(yamlText: string): FrontmatterEntry[] {
  const { doc, items } = parse(yamlText);
  return items.map((pair) => {
    const key = keyString(pair);
    const raw = doc.get(key, false);
    if (isSeq(raw)) {
      const seqItems: string[] = [];
      for (let i = 0; i < raw.items.length; i++) seqItems.push(valueText(doc.getIn([key, i], false)));
      return { key, kind: "array", items: seqItems };
    }
    return { key, kind: "scalar", value: valueText(raw) };
  });
}

/**
 * Sets one key's value from its edited plain text, leaving every other
 * key's order, comments, quoting, and form untouched. The text is parsed as
 * YAML so `true`/`42`/`null`/`["a","b"]` resolve to their real types rather
 * than always becoming strings. An empty value removes the key (mirrors the
 * JSX prop editor's buildAttribute "empty means omit" convention).
 */
export function setFrontmatterValue(yamlText: string, key: string, text: string): string {
  const doc = parseDocument(yamlText || "{}\n");
  if (text === "") {
    doc.delete(key);
  } else {
    doc.set(key, parseValueText(text));
  }
  return doc.toString().replace(/\n+$/, "\n");
}

/** Adds a new key (appended at the end, like the rest of the map) with its initial value text. */
export function appendFrontmatterEntry(yamlText: string, key: string, text = ""): string {
  const doc = parseDocument(yamlText || "{}\n");
  doc.set(key, text === "" ? "" : parseValueText(text));
  return doc.toString().replace(/\n+$/, "\n");
}

/**
 * Sets one array item's value from its edited plain text (parsed the same
 * way as a scalar value, so `true`/`42` resolve to real types), leaving
 * every other item and key untouched. An empty text removes that item
 * entirely (splices it out), rather than leaving a blank element behind.
 */
export function setFrontmatterArrayItem(yamlText: string, key: string, index: number, text: string): string {
  const doc = parseDocument(yamlText || "{}\n");
  if (text === "") {
    doc.deleteIn([key, index]);
  } else {
    doc.setIn([key, index], parseValueText(text));
  }
  return doc.toString().replace(/\n+$/, "\n");
}

/** Appends a new item to the end of an array-valued key. */
export function appendFrontmatterArrayItem(yamlText: string, key: string, text = ""): string {
  const doc = parseDocument(yamlText || "{}\n");
  const seq = doc.get(key, false);
  const length = isSeq(seq) ? seq.items.length : 0;
  doc.setIn([key, length], text === "" ? "" : parseValueText(text));
  return doc.toString().replace(/\n+$/, "\n");
}

/**
 * Renames a key in place — mutates the existing Pair's key text rather than
 * deleting and re-adding, so the value, any attached comment, and the key's
 * position in the document are all preserved.
 */
export function renameFrontmatterKey(yamlText: string, oldKey: string, newKey: string): string {
  if (!newKey || newKey === oldKey) return yamlText;
  const doc = parseDocument(yamlText);
  const contents = doc.contents;
  const items: YamlPairLike[] =
    contents && typeof contents === "object" && "items" in contents
      ? (contents as { items: YamlPairLike[] }).items
      : [];
  const pair = items.find((p) => keyString(p) === oldKey) as { key: unknown } | undefined;
  if (!pair) return yamlText;
  if (isScalar(pair.key)) {
    (pair.key as Scalar).value = newKey;
  } else {
    pair.key = newKey;
  }
  return doc.toString().replace(/\n+$/, "\n");
}

function parseValueText(text: string): unknown {
  try {
    return parseYamlValue(text);
  } catch {
    return text;
  }
}

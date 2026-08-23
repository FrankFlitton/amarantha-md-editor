import { describe, expect, it } from "vitest";
import {
  appendFrontmatterArrayItem,
  appendFrontmatterEntry,
  listFrontmatterKeys,
  readFrontmatterEntries,
  renameFrontmatterKey,
  setFrontmatterArrayItem,
  setFrontmatterValue,
} from "./frontmatter";

describe("listFrontmatterKeys", () => {
  it("lists top-level keys in document order", () => {
    expect(listFrontmatterKeys('title: Draft\nstatus: review\ntags: ["a", "b"]')).toEqual([
      "title",
      "status",
      "tags",
    ]);
  });

  it("returns an empty array for an empty block", () => {
    expect(listFrontmatterKeys("")).toEqual([]);
  });
});

describe("readFrontmatterEntries", () => {
  it("reads string values bare (no quotes)", () => {
    expect(readFrontmatterEntries('title: "Draft"\n')).toEqual([{ key: "title", kind: "scalar", value: "Draft" }]);
  });

  it("reads scalar booleans/numbers as their plain-text form", () => {
    expect(readFrontmatterEntries("published: true\ncount: 3\n")).toEqual([
      { key: "published", kind: "scalar", value: "true" },
      { key: "count", kind: "scalar", value: "3" },
    ]);
  });

  it("reads an array-valued key as its individual items, not one flow string", () => {
    expect(readFrontmatterEntries('tags: ["a", "b"]\n')).toEqual([
      { key: "tags", kind: "array", items: ["a", "b"] },
    ]);
  });

  it("reads a block-style list the same way as a flow list", () => {
    expect(readFrontmatterEntries("tags:\n  - a\n  - b\n")).toEqual([
      { key: "tags", kind: "array", items: ["a", "b"] },
    ]);
  });

  it("reads a map value as its editable JSON flow text (still a scalar row)", () => {
    expect(readFrontmatterEntries("meta:\n  a: 1\n")).toEqual([{ key: "meta", kind: "scalar", value: '{"a":1}' }]);
  });
});

describe("setFrontmatterValue", () => {
  it("edits one key while preserving comments, order, and quoting of every other key", () => {
    const source = ['title: "Draft" # working title', "status: review", "count: 3", ""].join("\n");
    const result = setFrontmatterValue(source, "status", "published");
    expect(result).toContain('title: "Draft" # working title');
    expect(result).toContain("count: 3");
    expect(result).toContain("status: published");
  });

  it("removes a key when set to an empty string", () => {
    const result = setFrontmatterValue("title: Draft\nstatus: review\n", "status", "");
    expect(listFrontmatterKeys(result)).toEqual(["title"]);
  });

  it("resolves typed text (true/number) to real YAML types, not strings", () => {
    let result = setFrontmatterValue("title: Draft\n", "published", "true");
    expect(result).toMatch(/published: true/);
    expect(result).not.toMatch(/published: "true"/);

    result = setFrontmatterValue("title: Draft\n", "count", "3");
    expect(result).toMatch(/count: 3/);
    expect(result).not.toMatch(/count: "3"/);
  });

  it("keeps an explicitly-quoted numeric-looking string as a string", () => {
    const result = setFrontmatterValue("title: Draft\n", "version", '"1.10"');
    expect(readFrontmatterEntries(result)).toContainEqual({ key: "version", kind: "scalar", value: "1.10" });
    expect(result).toMatch(/version: "1\.10"/);
  });
});

describe("appendFrontmatterEntry", () => {
  it("adds a new key at the end with the given value", () => {
    const result = appendFrontmatterEntry("title: Draft\n", "status", "review");
    expect(listFrontmatterKeys(result)).toEqual(["title", "status"]);
    expect(readFrontmatterEntries(result)).toContainEqual({ key: "status", kind: "scalar", value: "review" });
  });

  it("defaults to an empty string value", () => {
    const result = appendFrontmatterEntry("title: Draft\n", "status");
    expect(readFrontmatterEntries(result)).toContainEqual({ key: "status", kind: "scalar", value: "" });
  });
});

describe("setFrontmatterArrayItem", () => {
  it("edits one item while leaving the others and the rest of the document untouched", () => {
    const source = 'title: Draft\ntags: ["a", "b", "c"]\n';
    const result = setFrontmatterArrayItem(source, "tags", 1, "bee");
    expect(readFrontmatterEntries(result)).toContainEqual({ key: "tags", kind: "array", items: ["a", "bee", "c"] });
    expect(result).toContain("title: Draft");
  });

  it("resolves typed item text to a real YAML type", () => {
    const source = 'flags: ["a", "b"]\n';
    const result = setFrontmatterArrayItem(source, "flags", 1, "true");
    expect(readFrontmatterEntries(result)).toContainEqual({ key: "flags", kind: "array", items: ["a", "true"] });
  });

  it("removes the item (splices it out) when set to an empty string", () => {
    const source = 'tags: ["a", "b", "c"]\n';
    const result = setFrontmatterArrayItem(source, "tags", 1, "");
    expect(readFrontmatterEntries(result)).toContainEqual({ key: "tags", kind: "array", items: ["a", "c"] });
  });
});

describe("appendFrontmatterArrayItem", () => {
  it("appends a new item to the end of an existing array", () => {
    const source = 'tags: ["a", "b"]\n';
    const result = appendFrontmatterArrayItem(source, "tags", "c");
    expect(readFrontmatterEntries(result)).toContainEqual({ key: "tags", kind: "array", items: ["a", "b", "c"] });
  });

  it("defaults to an empty string item", () => {
    const source = 'tags: ["a"]\n';
    const result = appendFrontmatterArrayItem(source, "tags");
    expect(readFrontmatterEntries(result)).toContainEqual({ key: "tags", kind: "array", items: ["a", ""] });
  });
});

describe("renameFrontmatterKey", () => {
  it("renames a key in place, preserving its value, comment, and position", () => {
    const source = ["title: Draft # working title", "status: review", ""].join("\n");
    const result = renameFrontmatterKey(source, "title", "name");
    expect(result).toContain("name: Draft # working title");
    expect(listFrontmatterKeys(result)).toEqual(["name", "status"]);
  });

  it("is a no-op when the new name is empty or unchanged", () => {
    const source = "title: Draft\n";
    expect(renameFrontmatterKey(source, "title", "")).toBe(source);
    expect(renameFrontmatterKey(source, "title", "title")).toBe(source);
  });

  it("is a no-op when the key doesn't exist", () => {
    const source = "title: Draft\n";
    expect(renameFrontmatterKey(source, "missing", "name")).toBe(source);
  });
});

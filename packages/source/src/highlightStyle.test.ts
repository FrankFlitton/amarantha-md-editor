import { describe, expect, it } from "vitest";
import { syntaxHighlighting, highlightingFor } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { tags as t } from "@lezer/highlight";
import { amaranthaHighlightStyle } from "./highlightStyle";
import { amaranthaSourceLanguage } from "./language";

/**
 * A markdown image (![alt](url)) previously rendered as one flat color: the
 * ![ ] ( ) marks (t.processingInstruction), the destination (t.url), and
 * the alt text itself (no node of its own — inherits the outer node's
 * t.link) were all styled identically. This asserts the three now resolve
 * to visibly different CSS classes, so a regression back to "one shared
 * color" would fail loudly here instead of only being caught by eyeballing
 * a screenshot again.
 */
describe("amaranthaHighlightStyle", () => {
  const state = EditorState.create({
    extensions: [amaranthaSourceLanguage(), syntaxHighlighting(amaranthaHighlightStyle)],
  });

  it("styles link/image marks, the URL, and the alt/link text as three distinct classes", () => {
    const markClass = highlightingFor(state, [t.processingInstruction]);
    const urlClass = highlightingFor(state, [t.url]);
    const linkTextClass = highlightingFor(state, [t.link]);

    expect(markClass).toBeTruthy();
    expect(urlClass).toBeTruthy();
    expect(linkTextClass).toBeTruthy();
    expect(new Set([markClass, urlClass, linkTextClass]).size).toBe(3);
  });
});

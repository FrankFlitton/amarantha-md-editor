import { useState } from "react";
import { useCellValues } from "@mdxeditor/gurx";
import { useMdastNodeUpdater, useNestedEditorContext } from "@mdxeditor/editor";
import type { Yaml } from "mdast";
import {
  appendFrontmatterArrayItem,
  appendFrontmatterEntry,
  readFrontmatterEntries,
  renameFrontmatterKey,
  setFrontmatterArrayItem,
  setFrontmatterValue,
} from "@amarantha/core";
import { InlineEditableText } from "../InlineEditableText";
import { frontmatterFields$, frontmatterHidden$ } from "./plugin";
import "./frontmatter.css";

/**
 * The frontmatter editor: hidden (nothing renders — toggled from the header
 * glyph) or visible, showing every key/value pair as a click-to-edit row in
 * a tab-aligned grid, plus "+" to append a new one and a raw-YAML fallback
 * for anything a plain-text row can't cleanly represent — comments, unusual
 * formatting. An array-valued key renders as a stack of per-item text
 * fields with its own "+", rather than one field holding the whole array's
 * flow text.
 */
export function AmaranthaFrontmatterEditor() {
  const [fields, hidden] = useCellValues(frontmatterFields$, frontmatterHidden$);
  const { mdastNode } = useNestedEditorContext<Yaml>();
  const updateMdastNode = useMdastNodeUpdater<Yaml>();
  const [rawMode, setRawMode] = useState(false);
  const [addingRow, setAddingRow] = useState(false);

  if (hidden) return null;

  const yaml = mdastNode.value;
  const entries = readFrontmatterEntries(yaml);

  return (
    <div className="amarantha-frontmatter-block" data-testid="frontmatter-card" contentEditable={false}>
      {entries.map((entry) => (
        <div className="amarantha-frontmatter-row" key={entry.key}>
          <InlineEditableText
            className="amarantha-frontmatter-key"
            testId={`frontmatter-key-${entry.key}`}
            ariaLabel={`Property name: ${entry.key}`}
            value={entry.key}
            title={fields[entry.key]?.description}
            onCommit={(next) => updateMdastNode({ value: renameFrontmatterKey(yaml, entry.key, next.trim()) })}
          />
          <span className="amarantha-frontmatter-colon">:</span>
          {entry.kind === "array" ? (
            <div className="amarantha-frontmatter-array" data-testid={`frontmatter-array-${entry.key}`}>
              {entry.items.map((item, index) => (
                <InlineEditableText
                  key={index}
                  className="amarantha-frontmatter-value amarantha-frontmatter-array-item"
                  testId={`frontmatter-value-${entry.key}-${index}`}
                  ariaLabel={`Item ${index + 1} of ${entry.key}`}
                  value={item}
                  onCommit={(next) =>
                    updateMdastNode({ value: setFrontmatterArrayItem(yaml, entry.key, index, next) })
                  }
                />
              ))}
              <button
                type="button"
                className="amarantha-frontmatter-array-add"
                data-testid={`frontmatter-array-add-${entry.key}`}
                aria-label={`Add item to ${entry.key}`}
                onClick={() => updateMdastNode({ value: appendFrontmatterArrayItem(yaml, entry.key) })}
              >
                +
              </button>
            </div>
          ) : (
            <InlineEditableText
              className="amarantha-frontmatter-value"
              testId={`frontmatter-value-${entry.key}`}
              ariaLabel={`Value for ${entry.key}`}
              value={entry.value}
              placeholder="empty"
              onCommit={(next) => updateMdastNode({ value: setFrontmatterValue(yaml, entry.key, next) })}
            />
          )}
        </div>
      ))}
      {addingRow ? (
        <div className="amarantha-frontmatter-row">
          <InlineEditableText
            className="amarantha-frontmatter-key"
            testId="frontmatter-new-key"
            ariaLabel="New property name"
            value=""
            placeholder="key"
            autoFocus
            onCommit={(next) => {
              const key = next.trim();
              if (key) updateMdastNode({ value: appendFrontmatterEntry(yaml, key) });
            }}
            onBlur={() => setAddingRow(false)}
          />
          <span className="amarantha-frontmatter-colon">:</span>
          <span className="amarantha-frontmatter-value amarantha-frontmatter-placeholder">value</span>
        </div>
      ) : (
        <button
          type="button"
          className="amarantha-frontmatter-add"
          data-testid="frontmatter-add"
          aria-label="Add property"
          onClick={() => setAddingRow(true)}
        >
          +
        </button>
      )}
      <button
        type="button"
        className="amarantha-frontmatter-raw-toggle"
        data-testid="frontmatter-raw-toggle"
        onClick={() => setRawMode((r) => !r)}
      >
        {rawMode ? "Done" : "Edit as YAML"}
      </button>
      {rawMode && (
        <textarea
          className="amarantha-frontmatter-raw"
          data-testid="frontmatter-raw"
          value={yaml}
          spellCheck={false}
          onChange={(event) => updateMdastNode({ value: event.target.value })}
        />
      )}
    </div>
  );
}

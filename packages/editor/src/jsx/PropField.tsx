import type { ComponentPropDefinition } from "@amarantha/core";
import { InlineEditableText } from "../InlineEditableText";

export interface PropFieldProps {
  name: string;
  prop: ComponentPropDefinition;
  value: string;
  onCommit: (next: string) => void;
}

/**
 * One Notion-style property row: a plain-text label plus a single
 * `contentEditable` value field for every type except boolean/enum — the
 * same click-to-edit primitive (InlineEditableText) used everywhere else in
 * the app (frontmatter, the document filename), not a bordered/boxed
 * `<input>`/`<textarea>`. AmaranthaJsxEditor renders each field's two
 * returned elements as one row of its own CSS grid.
 */
export function PropField({ name, prop, value, onCommit }: PropFieldProps) {
  const testId = `jsx-prop-${name}`;
  const plainLabel = (
    <span className="amarantha-jsx-prop-label" title={prop.description}>
      {name}
      {prop.required && <span className="amarantha-jsx-prop-required">*</span>}
    </span>
  );

  if (prop.type === "boolean") {
    return (
      <div className="amarantha-jsx-prop">
        <label className="amarantha-jsx-prop-label" htmlFor={testId} title={prop.description}>
          {name}
          {prop.required && <span className="amarantha-jsx-prop-required">*</span>}
        </label>
        <input
          id={testId}
          data-testid={testId}
          type="checkbox"
          className="amarantha-jsx-prop-checkbox"
          checked={value === "true"}
          onChange={(event) => onCommit(event.target.checked ? "true" : "")}
        />
      </div>
    );
  }

  if (prop.type === "enum" && prop.values) {
    return (
      <div className="amarantha-jsx-prop">
        <label className="amarantha-jsx-prop-label" htmlFor={testId} title={prop.description}>
          {name}
          {prop.required && <span className="amarantha-jsx-prop-required">*</span>}
        </label>
        <select
          id={testId}
          data-testid={testId}
          className="amarantha-jsx-prop-select"
          value={value}
          onChange={(event) => onCommit(event.target.value)}
        >
          <option value="" />
          {prop.values.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (prop.type === "expression") {
    return (
      <div className="amarantha-jsx-prop">
        {plainLabel}
        <InlineEditableText
          className="amarantha-jsx-prop-value amarantha-jsx-prop-expression"
          testId={testId}
          ariaLabel={`${name} (${prop.description ?? "expression"})`}
          value={value}
          placeholder="empty"
          multiline
          onCommit={onCommit}
        />
      </div>
    );
  }

  return (
    <div className="amarantha-jsx-prop">
      {plainLabel}
      <InlineEditableText
        className="amarantha-jsx-prop-value"
        testId={testId}
        ariaLabel={name}
        value={value}
        placeholder="empty"
        onCommit={onCommit}
      />
    </div>
  );
}

import type { ComponentPropDefinition } from "@amarantha/core";

export interface PropFieldProps {
  name: string;
  prop: ComponentPropDefinition;
  value: string;
  onCommit: (next: string) => void;
}

/** One Notion-style property row, auto-choosing an input for the prop's declared type. */
export function PropField({ name, prop, value, onCommit }: PropFieldProps) {
  const testId = `jsx-prop-${name}`;
  const label = (
    <label className="amarantha-jsx-prop-label" htmlFor={testId}>
      {name}
      {prop.required && <span className="amarantha-jsx-prop-required">*</span>}
    </label>
  );

  if (prop.type === "boolean") {
    return (
      <div className="amarantha-jsx-prop">
        {label}
        <input
          id={testId}
          data-testid={testId}
          type="checkbox"
          checked={value === "true"}
          onChange={(event) => onCommit(event.target.checked ? "true" : "")}
        />
      </div>
    );
  }

  if (prop.type === "enum" && prop.values) {
    return (
      <div className="amarantha-jsx-prop">
        {label}
        <select id={testId} data-testid={testId} value={value} onChange={(event) => onCommit(event.target.value)}>
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

  if (prop.type === "number") {
    return (
      <div className="amarantha-jsx-prop">
        {label}
        <input
          id={testId}
          data-testid={testId}
          type="number"
          value={value}
          onChange={(event) => onCommit(event.target.value)}
        />
      </div>
    );
  }

  if (prop.type === "expression") {
    return (
      <div className="amarantha-jsx-prop">
        {label}
        <textarea
          id={testId}
          data-testid={testId}
          className="amarantha-jsx-prop-expression"
          value={value}
          onChange={(event) => onCommit(event.target.value)}
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="amarantha-jsx-prop">
      {label}
      <input
        id={testId}
        data-testid={testId}
        type="text"
        value={value}
        onChange={(event) => onCommit(event.target.value)}
      />
    </div>
  );
}

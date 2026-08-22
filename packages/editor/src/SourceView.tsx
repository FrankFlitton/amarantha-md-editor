export interface SourceViewProps {
  value: string;
  onChange: (next: string) => void;
}

export function SourceView({ value, onChange }: SourceViewProps) {
  return (
    <textarea
      className="source-view"
      data-testid="amarantha-source-view"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
    />
  );
}

import type { FontPreference, FontSlot } from "@amarantha/core";
import { CURATED_FONTS } from "@amarantha/theme";

export interface FontPickerProps {
  slot: FontSlot;
  value: FontPreference;
  onChange: (next: FontPreference) => void;
  error?: string;
}

const CUSTOM_VALUE = "custom";
const SYSTEM_VALUE = "system";
const BUNDLED_VALUE = "bundled";

function selectValueFor(value: FontPreference): string {
  if (value.kind === "bundled") return BUNDLED_VALUE;
  if (value.kind === "system") return SYSTEM_VALUE;
  const isCurated = CURATED_FONTS.some((f) => f.id === value.fontsourceId);
  return isCurated ? `curated:${value.fontsourceId}` : CUSTOM_VALUE;
}

/** One font slot's picker (sans body font, or mono code font): the app default
 *  (Geist), a short curated Fontsource shortlist, a free-text custom Fontsource
 *  id, or a free-text system font name. */
export function FontPicker({ slot, value, onChange, error }: FontPickerProps) {
  const curated = CURATED_FONTS.filter((f) => f.slot === slot);
  const selectValue = selectValueFor(value);

  return (
    <span className="font-picker" data-testid={`font-picker-${slot}`}>
      <select
        data-testid={`font-picker-${slot}-select`}
        value={selectValue}
        onChange={(event) => {
          const next = event.target.value;
          if (next === BUNDLED_VALUE) onChange({ kind: "bundled" });
          else if (next === SYSTEM_VALUE) onChange({ kind: "system", systemFamily: "" });
          else if (next === CUSTOM_VALUE) onChange({ kind: "fontsource", fontsourceId: "" });
          else onChange({ kind: "fontsource", fontsourceId: next.slice("curated:".length) });
        }}
      >
        <option value={BUNDLED_VALUE}>Geist (default)</option>
        {curated.map((f) => (
          <option key={f.id} value={`curated:${f.id}`}>
            {f.label}
          </option>
        ))}
        <option value={CUSTOM_VALUE}>Custom Fontsource ID…</option>
        <option value={SYSTEM_VALUE}>System font…</option>
      </select>
      {value.kind === "fontsource" && selectValue === CUSTOM_VALUE && (
        <input
          data-testid={`font-picker-${slot}-custom-input`}
          type="text"
          placeholder="fontsource id, e.g. jetbrains-mono"
          value={value.fontsourceId ?? ""}
          onChange={(event) => onChange({ kind: "fontsource", fontsourceId: event.target.value })}
        />
      )}
      {value.kind === "system" && (
        <input
          data-testid={`font-picker-${slot}-system-input`}
          type="text"
          placeholder="system font family"
          value={value.systemFamily ?? ""}
          onChange={(event) => onChange({ kind: "system", systemFamily: event.target.value })}
        />
      )}
      {error && (
        <span className="font-picker-error" data-testid={`font-picker-${slot}-error`}>
          {error}
        </span>
      )}
    </span>
  );
}

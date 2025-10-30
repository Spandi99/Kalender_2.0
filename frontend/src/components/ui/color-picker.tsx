
import { COLOR_PRESETS, getReadableTextColor } from "../../utils/colorUtils";

interface ColorPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  colors?: string[];
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, colors = COLOR_PRESETS, disabled }: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => {
          const isSelected = value?.toLowerCase() === color.toLowerCase();
          const textColor = getReadableTextColor(color, { fallbackColor: "#0f172a" });
          return (
            <button
              key={color}
              type="button"
              disabled={disabled}
              onClick={() => onChange(color)}
              className={`h-8 w-8 rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                isSelected ? "border-white ring-2 ring-offset-2 ring-blue-400" : "border-slate-600"
              }`}
              style={{ backgroundColor: color, color: textColor }}
              aria-label={`Select color ${color}`}
            >
              {isSelected ? "✓" : ""}
            </button>
          );
        })}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className="h-8 rounded-full border border-slate-600 px-3 text-xs text-slate-200 transition hover:border-slate-400"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

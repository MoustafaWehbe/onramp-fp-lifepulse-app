import { Check, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

// Single-select pill group — for ageRange, educationLevel, energyPattern, etc.
export function PillSelect<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => {
        const on = value === opt.value;
        return (
          <button
            type="button"
            key={opt.value}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${
              on
                ? "bg-foreground text-background ring-foreground"
                : "bg-surface ring-border hover:bg-accent"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// Free-text tag input — for lifestyleTypes, stressSources, topValues,
// identityStatements, badHabits (all plain string[] JSONB columns).
export function TagInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  maxTags = 10,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  ariaLabel: string;
  maxTags?: number;
}) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const trimmed = draft.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div aria-label={ariaLabel}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-surface px-3 py-2 ring-1 ring-border focus-within:ring-foreground">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-xs font-medium text-background"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`Remove ${tag}`}
              className="hover:opacity-70"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={addTag}
          placeholder={value.length < maxTags ? placeholder : ""}
          disabled={value.length >= maxTags}
          className="min-w-[80px] flex-1 bg-transparent text-sm outline-hidden"
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Press Enter to add {maxTags ? `(up to ${maxTags})` : ""}
      </p>
    </div>
  );
}

export function Check_() {
  return <Check className="size-3" aria-hidden="true" />;
}
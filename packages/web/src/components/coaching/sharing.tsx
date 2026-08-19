import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Everything a client can grant a coach. One shape used by the invite modal
 * and the sharing editor, so the two can never offer different permissions.
 */
export interface Grant {
  shareHabits: boolean;
  shareProfile: boolean;
  editHabits: boolean;
}

export type GrantKey = keyof Grant;

export const SHARE_OPTIONS: {
  key: GrantKey;
  label: string;
  desc: string;
  /** Set when this permission is meaningless without another one. */
  requires?: GrantKey;
}[] = [
  {
    key: "shareHabits",
    label: "Habits & progress",
    desc: "Your habits, grouped by life area, and how consistently you've kept them",
  },
  {
    key: "editHabits",
    label: "Let them adjust your habits",
    desc: "Rename a habit, or change how often and how long it runs. Every change is written into your notes.",
    requires: "shareHabits",
  },
  {
    key: "shareProfile",
    label: "Profile & goals",
    desc: "Your goals, lifestyle, and motivation details",
  },
];

/**
 * Editing a habit you can't see is incoherent, so withdrawing visibility
 * withdraws editing with it. The API enforces the same rule — this just keeps
 * the UI from offering a state the server would reject.
 */
export function applyGrantRules(grant: Grant): Grant {
  return { ...grant, editHabits: grant.editHabits && grant.shareHabits };
}

export function sharingSummary(grant: Grant): string {
  const parts = [
    grant.shareHabits && (grant.editHabits ? "habits (editable)" : "habits"),
    grant.shareProfile && "profile",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "nothing";
}

export function ShareToggle({
  label,
  desc,
  value,
  disabled = false,
  indented = false,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  disabled?: boolean;
  indented?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cn(
        "w-full flex items-start gap-3 rounded-xl p-4 text-left ring-1 transition-colors",
        // Nested under the permission it depends on, so the relationship is
        // visible rather than only enforced on submit.
        indented && "ml-4 w-[calc(100%-1rem)]",
        disabled && "cursor-not-allowed opacity-50",
        value
          ? "bg-foreground text-background ring-foreground"
          : cn("bg-surface ring-border", !disabled && "hover:bg-accent"),
      )}
    >
      <div
        className={cn(
          "mt-0.5 size-4 rounded ring-1 shrink-0 grid place-items-center",
          value ? "bg-background ring-background" : "bg-surface ring-border",
        )}
      >
        {value && <CheckCircle2 className="size-3 text-foreground" aria-hidden="true" />}
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p
          className={cn(
            "text-xs mt-0.5",
            value ? "text-background/60" : "text-muted-foreground",
          )}
        >
          {desc}
        </p>
      </div>
    </button>
  );
}

/** The three toggles, wired to the dependency rule. */
export function GrantEditor({
  grant,
  onChange,
}: {
  grant: Grant;
  onChange: (next: Grant) => void;
}) {
  return (
    <div className="space-y-3">
      {SHARE_OPTIONS.map((option) => {
        const blocked = option.requires ? !grant[option.requires] : false;

        return (
          <ShareToggle
            key={option.key}
            label={option.label}
            desc={option.desc}
            value={grant[option.key]}
            disabled={blocked}
            indented={Boolean(option.requires)}
            onChange={(next) =>
              onChange(applyGrantRules({ ...grant, [option.key]: next }))
            }
          />
        );
      })}
    </div>
  );
}

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateHabit, type Habit } from "@/hooks/useHabits";
import { tokensFor, type AreaColor } from "@/lib/area-colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// 0=Sun..6=Sat, matching the API's daysOfWeek convention (JS Date#getDay()).
const WEEKDAYS = [
  { value: 0, label: "S" },
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
];

/** "07:30:00" comes back from the API; <input type="time"> wants "07:30". */
function toTimeInput(value: string | null): string {
  return value ? value.slice(0, 5) : "08:00";
}

/**
 * Inline editor for an existing habit's reminder. Creation has its own fields
 * in the add-habit form; this covers everything after that, which previously
 * had no UI at all despite the API supporting it.
 */
export function HabitReminderEditor({
  habit,
  color,
  onClose,
}: {
  habit: Habit;
  color: AreaColor;
  onClose: () => void;
}) {
  const updateHabit = useUpdateHabit();
  const t = tokensFor(color);

  const [enabled, setEnabled] = useState(habit.reminderEnabled);
  const [time, setTime] = useState(() => toTimeInput(habit.reminderTime));
  const [days, setDays] = useState<number[]>(habit.daysOfWeek ?? []);

  const needsDayPicker =
    habit.frequency === "3x" || habit.frequency === "5x" || habit.frequency === "weekly";

  const toggleDay = (day: number) =>
    setDays((cur) =>
      cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day].sort(),
    );

  const save = () => {
    if (enabled && !time) {
      toast.error("Pick a time for the reminder.");
      return;
    }

    updateHabit.mutate(
      {
        id: habit.id,
        reminderEnabled: enabled,
        // Sent even when disabling so the stored time survives a later re-enable.
        reminderTime: enabled ? time : habit.reminderTime,
        // The backend needs a timezone to schedule against; reuse whatever the
        // habit already had so an existing reminder doesn't silently move when
        // it's edited from a different device.
        timezone: enabled
          ? (habit.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
          : habit.timezone,
        ...(needsDayPicker && { daysOfWeek: days.length > 0 ? days : null }),
      },
      {
        onSuccess: () => {
          toast.success(enabled ? "Reminder updated" : "Reminder turned off");
          onClose();
        },
        onError: () => toast.error("Couldn't update the reminder. Please try again."),
      },
    );
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg bg-surface p-3 ring-1 ring-border">
      <div className="flex items-center justify-between">
        <Label
          htmlFor={`reminder-toggle-${habit.id}`}
          className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
        >
          Reminder
        </Label>
        <button
          id={`reminder-toggle-${habit.id}`}
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`Reminder for ${habit.name}`}
          onClick={() => setEnabled((v) => !v)}
          className={cn(
            "relative h-5 w-9 rounded-full transition-colors",
            enabled ? t.bg : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-4 rounded-full bg-background shadow transition-transform",
              enabled ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {enabled && (
        <>
          <Input
            type="time"
            aria-label={`Reminder time for ${habit.name}`}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full"
          />

          {needsDayPicker && (
            <fieldset>
              <legend className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Which days?
              </legend>
              <div className="flex flex-wrap gap-1.5" role="group">
                {WEEKDAYS.map((d, i) => (
                  <button
                    type="button"
                    key={`${d.value}-${i}`}
                    onClick={() => toggleDay(d.value)}
                    aria-pressed={days.includes(d.value)}
                    aria-label={
                      ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
                        d.value
                      ]
                    }
                    className={cn(
                      "size-8 rounded-md text-xs font-medium ring-1 transition-colors",
                      days.includes(d.value)
                        ? cn(t.bgSoft, t.ringSolid, t.text)
                        : "bg-card ring-border hover:bg-accent",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Leave empty to be reminded every day until you check in.
              </p>
            </fieldset>
          )}
        </>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button type="button" size="sm" onClick={save} disabled={updateHabit.isPending}>
          {updateHabit.isPending && (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          )}
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

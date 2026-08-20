import { useState, type FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Frequency, HabitDifficulty } from "@/hooks/useHabits";
import type { ClientHabit, CoachUpdateHabitInput } from "@/hooks/useCoachFeedback";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "5x", label: "5× / week" },
  { value: "3x", label: "3× / week" },
  { value: "weekly", label: "Weekly" },
];

const DIFFICULTIES: { value: HabitDifficulty | ""; label: string }[] = [
  { value: "", label: "Unset" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Specific days are only meaningful for the quota frequencies: "daily" and
 * "weekdays" already say which days they mean, and the API rejects the
 * combination rather than silently ignoring it.
 */
function allowsDayPicking(frequency: Frequency): boolean {
  return frequency === "3x" || frequency === "5x" || frequency === "weekly";
}

export function HabitEditDialog({
  habit,
  clientName,
  isSaving,
  onSave,
  onClose,
}: {
  habit: ClientHabit;
  clientName: string;
  isSaving: boolean;
  onSave: (input: CoachUpdateHabitInput) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(habit.name);
  const [frequency, setFrequency] = useState<Frequency>(habit.frequency);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(habit.daysOfWeek ?? []);
  const [durationMinutes, setDurationMinutes] = useState(
    habit.durationMinutes?.toString() ?? "",
  );
  const [difficulty, setDifficulty] = useState<HabitDifficulty | "">(
    habit.difficulty ?? "",
  );
  const [notes, setNotes] = useState(habit.notes ?? "");

  const showDays = allowsDayPicking(frequency);
  const durationError =
    durationMinutes.trim() && !/^\d{1,4}$/.test(durationMinutes.trim())
      ? "Enter a whole number of minutes."
      : "";
  const nameError = name.trim() ? "" : "A name is required.";

  const toggleDay = (day: number) =>
    setDaysOfWeek((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort(),
    );

  /**
   * Only what actually changed is sent. The API records each edit in the
   * client's thread, so a payload padded with unchanged fields would be noise
   * in someone else's history — and an empty diff means there's nothing to
   * save at all.
   */
  const buildPatch = (): CoachUpdateHabitInput => {
    const patch: CoachUpdateHabitInput = {};
    const trimmedName = name.trim();
    const nextDuration = durationMinutes.trim()
      ? Number(durationMinutes.trim())
      : null;
    const nextDifficulty = difficulty === "" ? null : difficulty;
    const nextNotes = notes.trim() ? notes.trim() : null;
    const nextDays = showDays && daysOfWeek.length > 0 ? [...daysOfWeek].sort() : null;

    if (trimmedName !== habit.name) patch.name = trimmedName;
    if (frequency !== habit.frequency) patch.frequency = frequency;
    if (JSON.stringify(nextDays) !== JSON.stringify(habit.daysOfWeek ?? null)) {
      patch.daysOfWeek = nextDays;
    }
    if (nextDuration !== habit.durationMinutes) patch.durationMinutes = nextDuration;
    if (nextDifficulty !== habit.difficulty) patch.difficulty = nextDifficulty;
    if (nextNotes !== habit.notes) patch.notes = nextNotes;

    return patch;
  };

  const patch = buildPatch();
  const hasChanges = Object.keys(patch).length > 0;
  const canSave = hasChanges && !nameError && !durationError && !isSaving;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave(patch);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${habit.name}`}
    >
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 pt-6">
          <div>
            <h2 className="text-lg font-bold">Adjust this habit</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {clientName} will see exactly what you changed in their notes.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="habit-name">Name</Label>
              <Input
                id="habit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {nameError && (
                <p className="mt-1.5 text-xs text-destructive">{nameError}</p>
              )}
            </div>

            <div>
              <Label>Frequency</Label>
              <div className="flex flex-wrap gap-1.5">
                {FREQUENCIES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={frequency === option.value}
                    onClick={() => setFrequency(option.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
                      frequency === option.value
                        ? "bg-foreground text-background ring-foreground"
                        : "bg-surface ring-border hover:bg-accent",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {showDays && (
              <div>
                <Label>Days</Label>
                <div className="flex gap-1.5">
                  {WEEKDAYS.map((letter, day) => (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={daysOfWeek.includes(day)}
                      aria-label={WEEKDAY_NAMES[day]}
                      onClick={() => toggleDay(day)}
                      className={cn(
                        "grid size-8 place-items-center rounded-lg text-xs font-medium ring-1 transition-colors",
                        daysOfWeek.includes(day)
                          ? "bg-foreground text-background ring-foreground"
                          : "bg-surface ring-border hover:bg-accent",
                      )}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Leave empty to let them pick their own days.
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="habit-duration">Minutes</Label>
                <Input
                  id="habit-duration"
                  inputMode="numeric"
                  placeholder="20"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
                {durationError && (
                  <p className="mt-1.5 text-xs text-destructive">{durationError}</p>
                )}
              </div>

              <div>
                <Label htmlFor="habit-difficulty">Difficulty</Label>
                <select
                  id="habit-difficulty"
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value as HabitDifficulty | "")
                  }
                  className="w-full rounded-lg bg-surface px-4 py-2.5 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
                >
                  {DIFFICULTIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="habit-notes">Notes</Label>
              <textarea
                id="habit-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything they should keep in mind while doing it."
                className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Reminders stay with {clientName} — a coach can shape the plan, not
              decide when their phone buzzes.
            </p>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={!canSave}>
                {isSaving ? "Saving…" : hasChanges ? "Save changes" : "No changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { Link, useNavigate, useParams } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { Plus, Trash2, ArrowLeft, Check, Loader2, Bell, Clock } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { AreaProgress } from "@/components/area/area-progress";
import { AreaPct } from "@/components/area/area-badge";
import { useAreas, useDeleteArea } from "@/hooks/useAreas";
import {
  useHabits,
  useCreateHabit,
  useDeleteHabit,
  type Frequency,
} from "@/hooks/useHabits";
import {
  useTodayCheckIns,
  useToggleCheckIn,
  isChecked,
} from "@/hooks/useCheckIns";
import { areaStyle, areaTokens } from "@/lib/area-colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";

const FREQ: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "5x", label: "5× / week" },
  { value: "3x", label: "3× / week" },
  { value: "weekly", label: "Weekly" },
];

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

export function AreaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: habits = [] } = useHabits();
  const { data: checkins = [] } = useTodayCheckIns();
  const createHabit = useCreateHabit();
  const deleteHabit = useDeleteHabit();
  const toggleCheckIn = useToggleCheckIn();
  const { data: areas = [], isLoading: areasLoading } = useAreas();
  const deleteArea = useDeleteArea();
  const area = areas.find((a) => a.id === id);
  const [name, setName] = useState("");
  const [freq, setFreq] = useState<Frequency>("daily");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  // How long the habit itself takes to do (e.g. "15" minutes) — shown on the
  // habit card, unrelated to when/whether a reminder fires.
  const [durationMinutes, setDurationMinutes] = useState("");
  // Reminder is its own opt-in notification time — kept for live-testing the
  // worker/BullMQ pipeline, not the habit's duration.
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("08:00");

  if (areasLoading) {
    return (
      <AppShell>
        <div
          className="flex items-center justify-center gap-3 py-20 text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span className="mono text-xs uppercase tracking-widest">
            Loading area…
          </span>
        </div>
      </AppShell>
    );
  }

  if (!area) {
    return (
      <AppShell>
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            This area no longer exists.
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-block text-sm font-medium underline"
          >
            Back to dashboard
          </Link>
        </Card>
      </AppShell>
    );
  }

  const areaHabits = habits.filter((h) => h.areaId === id);
  const done = areaHabits.filter((h) =>
    isChecked(checkins, h.id),
  ).length;
  const pct = areaHabits.length
    ? Math.round((done / areaHabits.length) * 100)
    : 0;

  const t = areaTokens[area.color];

  const nameError = touched && !name.trim() ? "Habit name is required." : "";
  const needsDayPicker = freq === "3x" || freq === "5x" || freq === "weekly";
  const toggleDay = (day: number) =>
    setDaysOfWeek((cur) =>
      cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day].sort(),
    );

  const reminderError =
    touched && reminderEnabled && !reminderTime
      ? "Pick a time for the reminder."
      : "";

  const create = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim()) return;
    if (reminderEnabled && !reminderTime) return;

    createHabit.mutate(
      {
        areaId: id!,
        name: name.trim(),
        frequency: freq,
        notes: notes.trim() || undefined,
        daysOfWeek:
          needsDayPicker && daysOfWeek.length > 0 ? daysOfWeek : undefined,
        durationMinutes: durationMinutes
          ? Number(durationMinutes)
          : undefined,
        reminderEnabled,
        // Auto-detected from the browser — the same value the API also
        // falls back to for "today" boundaries, so reminder time and
        // check-in day boundary always agree for this habit.
        ...(reminderEnabled && {
          reminderTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      },
      {
        onSuccess: () => {
          setName("");
          setNotes("");
          setDaysOfWeek([]);
          setDurationMinutes("");
          setReminderEnabled(false);
          setReminderTime("08:00");
          setTouched(false);
          toast.success("Habit added");
        },
        onError: () => {
          toast.error("Couldn't add the habit. Please try again.");
        },
      },
    );
  };

  const handleDeleteArea = () => {
    deleteArea.mutate(id!, {
      onSuccess: () => {
        toast(`"${area.name}" deleted`);
        navigate("/dashboard");
      },
      onError: () => {
        toast.error("Couldn't delete the area. Please try again.");
      },
    });
  };

  return (
    <AppShell>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="size-3" aria-hidden="true" /> All areas
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow={`Life area • ${areaHabits.length} habit${areaHabits.length === 1 ? "" : "s"}`}
        title={area.name}
        titleClassName={t.text}
        action={
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Today
              </div>
              <AreaPct value={pct} color={area.color} className="text-3xl font-extrabold tracking-tight" />
            </div>
            <ConfirmDialog
              title={`Delete "${area.name}"?`}
              description="This permanently removes the area and all its habits and check-ins. This action cannot be undone."
              confirmLabel="Delete area"
              destructive
              onConfirm={handleDeleteArea}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={deleteArea.isPending}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" /> Delete
                  area
                </Button>
              }
            />
          </div>
        }
      />

      <AreaProgress
        value={pct}
        color={area.color}
        className="mb-10 h-1"
        aria-label={`${area.name} completion today`}
      />

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Habit list */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Habits
          </h2>
          {areaHabits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No habits yet. Add one on the right →
            </div>
          ) : (
            <ul className="space-y-2" role="list">
              {areaHabits.map((h) => {
                const isDone = isChecked(checkins, h.id);
                return (
                  <li key={h.id}>
                    <Card className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isDone}
                          aria-label={`Toggle ${h.name}`}
                          disabled={toggleCheckIn.isPending}
                          onClick={() =>
                            toggleCheckIn.mutate(
                              { habitId: h.id },
                              {
                                onError: () =>
                                  toast.error(
                                    "Couldn't update check-in. Please try again.",
                                  ),
                              },
                            )
                          }
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-md transition-colors",
                            isDone
                              ? cn(t.bg, "text-background")
                              : "ring-2 ring-border hover:ring-foreground/40",
                          )}
                        >
                          {isDone && (
                            <Check
                              className="size-3.5"
                              strokeWidth={3}
                              aria-hidden="true"
                            />
                          )}
                        </button>
                        <div>
                          <p
                            className={`text-sm font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}
                          >
                            {h.name}
                          </p>
                          {h.notes && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {h.notes}
                            </p>
                          )}
                          {(h.durationMinutes || h.reminderEnabled) && (
                            <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                              {h.durationMinutes && (
                                <span className="flex items-center gap-1">
                                  <Clock
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                  {h.durationMinutes} min
                                </span>
                              )}
                              {h.reminderEnabled && h.reminderTime && (
                                <span className="flex items-center gap-1">
                                  <Bell
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                  {h.reminderTime}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {h.frequency}
                        </span>
                        <ConfirmDialog
                          title={`Delete "${h.name}"?`}
                          description="This removes the habit and its check-in history."
                          confirmLabel="Delete habit"
                          destructive
                          onConfirm={() => {
                            deleteHabit.mutate(h.id, {
                              onSuccess: () => toast("Habit removed"),
                              onError: () =>
                                toast.error(
                                  "Couldn't delete the habit. Please try again.",
                                ),
                            });
                          }}
                          trigger={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${h.name}`}
                              disabled={deleteHabit.isPending}
                              className="size-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            </Button>
                          }
                        />
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Add habit form */}
        <div>
          <h2 className="mb-4 mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Add a habit
          </h2>
          <Card className="p-5">
            <form onSubmit={create} noValidate>
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="habit-name"
                    className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
                  >
                    Name{" "}
                    <span className="text-destructive" aria-hidden="true">
                      *
                    </span>
                  </Label>
                  <Input
                    id="habit-name"
                    name="habitName"
                    required
                    aria-invalid={!!nameError}
                    aria-describedby={nameError ? "habit-name-err" : undefined}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Morning walk"
                  />
                  {nameError && (
                    <p
                      id="habit-name-err"
                      className="mt-1 text-xs text-destructive"
                      role="alert"
                    >
                      {nameError}
                    </p>
                  )}
                </div>

                <fieldset>
                  <legend className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Frequency
                  </legend>
                  <div className="grid grid-cols-2 gap-1.5" role="group">
                    {FREQ.map((f) => (
                      <button
                        type="button"
                        key={f.value}
                        onClick={() => setFreq(f.value)}
                        aria-pressed={freq === f.value}
                        className={cn(
                          "rounded-md px-3 py-2 text-xs font-medium ring-1 transition-colors",
                          freq === f.value
                            ? cn(t.bgSoft, t.ringSolid, t.text)
                            : "bg-surface ring-border hover:bg-accent",
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {needsDayPicker && (
                  <fieldset>
                    <legend className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                      Which days?{" "}
                      <span className="font-normal text-muted-foreground/70">
                        (optional — reminders only fire on these)
                      </span>
                    </legend>
                    <div className="flex flex-wrap gap-1.5" role="group">
                      {WEEKDAYS.map((d) => (
                        <button
                          type="button"
                          key={d.value}
                          onClick={() => toggleDay(d.value)}
                          aria-pressed={daysOfWeek.includes(d.value)}
                          className={cn(
                            "size-9 rounded-md text-xs font-medium ring-1 transition-colors",
                            daysOfWeek.includes(d.value)
                              ? cn(t.bgSoft, t.ringSolid, t.text)
                              : "bg-surface ring-border hover:bg-accent",
                          )}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}

                <div>
                  <Label
                    htmlFor="habit-duration"
                    className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
                  >
                    Duration (optional)
                  </Label>
                  <div className="relative">
                    <Input
                      id="habit-duration"
                      name="durationMinutes"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={1440}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      placeholder="15"
                      className="w-full pr-12"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                      min
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    How long this habit takes to finish.
                  </p>
                </div>

                <fieldset>
                  <div className="flex items-center justify-between">
                    <legend className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                      Reminder
                    </legend>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={reminderEnabled}
                      aria-label="Enable reminder"
                      onClick={() => setReminderEnabled((v) => !v)}
                      className={cn(
                        "relative h-5 w-9 rounded-full transition-colors",
                        reminderEnabled ? t.bg : "bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 size-4 rounded-full bg-background shadow transition-transform",
                          reminderEnabled ? "translate-x-4" : "translate-x-0.5",
                        )}
                      />
                    </button>
                  </div>
                  {reminderEnabled && (
                    <>
                      <Input
                        id="habit-reminder-time"
                        name="reminderTime"
                        type="time"
                        aria-invalid={!!reminderError}
                        aria-describedby={
                          reminderError ? "habit-reminder-time-err" : undefined
                        }
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="w-full"
                      />
                      {reminderError ? (
                        <p
                          id="habit-reminder-time-err"
                          className="mt-1 text-xs text-destructive"
                          role="alert"
                        >
                          {reminderError}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          We'll notify you at this time
                          {needsDayPicker && daysOfWeek.length > 0
                            ? " on the selected days"
                            : " every day"}
                          , unless you've already checked in. (For
                          live-testing the reminder pipeline.)
                        </p>
                      )}
                    </>
                  )}
                </fieldset>

                <div>
                  <Label
                    htmlFor="habit-notes"
                    className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
                  >
                    Notes (optional)
                  </Label>
                  <textarea
                    id="habit-notes"
                    name="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Anything that helps you stick with this"
                    className="w-full resize-none rounded-lg bg-surface px-3 py-2.5 text-sm outline-hidden ring-1 ring-border placeholder:text-muted-foreground focus:ring-foreground"
                  />
                </div>

                <button
                  type="submit"
                  disabled={createHabit.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={areaStyle(area.color)}
                >
                  {createHabit.isPending ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Plus className="size-4" aria-hidden="true" />
                  )}
                  {createHabit.isPending ? "Adding…" : "Add habit"}
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

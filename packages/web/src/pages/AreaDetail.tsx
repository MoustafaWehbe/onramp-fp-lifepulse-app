import { Link, useNavigate, useParams } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useApp, todayStr, type Frequency } from "@/lib/store";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

const FREQ: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "5x", label: "5× / week" },
  { value: "3x", label: "3× / week" },
  { value: "weekly", label: "Weekly" },
];

export function AreaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { areas, habits, checkins, addHabit, removeHabit, removeArea, toggleCheckin } =
    useApp();
  const area = areas.find((a) => a.id === id);
  const [name, setName] = useState("");
  const [freq, setFreq] = useState<Frequency>("daily");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);
  const today = todayStr();

  if (!area) {
    return (
      <AppShell>
        <div className="rounded-2xl bg-card p-10 text-center ring-1 ring-black/5">
          <p className="text-sm text-muted-foreground">
            This area no longer exists.
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-block text-sm font-medium underline"
          >
            Back to dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  const areaHabits = habits.filter((h) => h.areaId === id);
  const done = areaHabits.filter((h) =>
    checkins.some((c) => c.habitId === h.id && c.date === today),
  ).length;
  const pct = areaHabits.length
    ? Math.round((done / areaHabits.length) * 100)
    : 0;

  const nameError = touched && !name.trim() ? "Habit name is required." : "";

  const create = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim()) return;
    addHabit({
      areaId: id!,
      name: name.trim(),
      frequency: freq,
      notes: notes.trim() || undefined,
    });
    setName("");
    setNotes("");
    setTouched(false);
    toast.success("Habit added");
  };

  const deleteArea = () => {
    removeArea(id!);
    toast(`"${area.name}" deleted`);
    navigate("/dashboard");
  };

  return (
    <AppShell>
      <div className="mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" aria-hidden="true" /> All areas
        </Link>
      </div>

      <PageHeader
        eyebrow={`Life area • ${areaHabits.length} habit${areaHabits.length === 1 ? "" : "s"}`}
        title={area.name}
        action={
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Today
              </div>
              <div className="text-3xl font-extrabold tracking-tight">{pct}%</div>
            </div>
            <ConfirmDialog
              title={`Delete "${area.name}"?`}
              description="This permanently removes the area and all its habits and check-ins. This action cannot be undone."
              confirmLabel="Delete area"
              destructive
              onConfirm={deleteArea}
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" /> Delete area
                </button>
              }
            />
          </div>
        }
      />

      <div
        className="mb-10 h-1 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${area.name} completion today`}
      >
        <div
          className={`h-full bg-area-${area.color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
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
                const isDone = checkins.some(
                  (c) => c.habitId === h.id && c.date === today,
                );
                return (
                  <li
                    key={h.id}
                    className="flex items-center justify-between rounded-xl bg-card p-4 ring-1 ring-black/5"
                  >
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isDone}
                        aria-label={`Toggle ${h.name}`}
                        onClick={() => toggleCheckin(h.id, today)}
                        className={`grid size-6 shrink-0 place-items-center rounded-md transition-colors ${isDone ? `bg-area-${area.color} text-background` : "ring-2 ring-border"}`}
                      >
                        {isDone && (
                          <span className="text-xs" aria-hidden="true">
                            ✓
                          </span>
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
                          removeHabit(h.id);
                          toast("Habit removed");
                        }}
                        trigger={
                          <button
                            type="button"
                            aria-label={`Delete ${h.name}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </button>
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <h2 className="mb-4 mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Add a habit
          </h2>
          <form
            onSubmit={create}
            noValidate
            className="rounded-2xl bg-card p-5 ring-1 ring-black/5"
          >
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="habit-name"
                  className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
                >
                  Name <span className="text-destructive" aria-hidden="true">*</span>
                </label>
                <input
                  id="habit-name"
                  name="habitName"
                  required
                  aria-invalid={!!nameError}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Morning walk"
                  className="w-full rounded-lg bg-surface px-3 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-foreground"
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
                      className={`rounded-md px-3 py-2 text-xs font-medium ring-1 ${freq === f.value ? `bg-area-${area.color}/10 ring-area-${area.color} text-area-${area.color}` : "bg-surface ring-border hover:bg-accent"}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div>
                <label
                  htmlFor="habit-notes"
                  className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="habit-notes"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Anything that helps you stick with this"
                  className="w-full resize-none rounded-lg bg-surface px-3 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-foreground"
                />
              </div>
              <button
                type="submit"
                className={`flex w-full items-center justify-center gap-2 rounded-md bg-area-${area.color} px-4 py-2.5 text-sm font-medium text-background hover:opacity-90`}
              >
                <Plus className="size-4" aria-hidden="true" /> Add habit
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

import { Link, useNavigate } from "react-router-dom";
import { Plus, Flame, TrendingUp, ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AppShell, PageHeader, AiPanel } from "@/components/app-shell";
import { useApp, todayStr, type AreaColor } from "@/lib/store";
import { toast } from "sonner";

const COLORS: AreaColor[] = [
  "health",
  "career",
  "spirit",
  "social",
  "learning",
  "creative",
];

export function Dashboard() {
  const { areas, habits, checkins, addArea } = useApp();
  const today = todayStr();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<AreaColor>("health");

  const dayName = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (checkins.some((c) => c.date === ds)) streak++;
    else if (i > 0) break;
  }

  const totalToday = habits.length;
  const doneToday = habits.filter((h) =>
    checkins.some((c) => c.habitId === h.id && c.date === today),
  ).length;
  const overallPct = totalToday
    ? Math.round((doneToday / totalToday) * 100)
    : 0;

  const create = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addArea({ name: newName.trim(), color: newColor });
    const created = newName.trim();
    setNewName("");
    setShowNew(false);
    toast.success(`Area "${created}" created`);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow={dayName}
        title="Your garden today."
        action={
          <div className="flex items-center gap-6">
            <Stat
              label="Streak"
              value={`${streak}d`}
              icon={<Flame className="size-3.5" aria-hidden="true" />}
            />
            <Stat
              label="Today"
              value={`${overallPct}%`}
              icon={<TrendingUp className="size-3.5" aria-hidden="true" />}
            />
            <Link
              to="/today"
              className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
            >
              Daily check-in <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        }
      />

      <section className="mb-12" aria-labelledby="areas-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="areas-heading"
            className="mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
          >
            Life areas
          </h2>
          <button
            type="button"
            onClick={() => setShowNew((s) => !s)}
            aria-expanded={showNew}
            aria-controls="new-area-form"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <Plus className="size-3" aria-hidden="true" /> New area
          </button>
        </div>

        {showNew && (
          <form
            id="new-area-form"
            onSubmit={create}
            className="mb-4 rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <label
                  htmlFor="new-area-name"
                  className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
                >
                  Name
                </label>
                <input
                  id="new-area-name"
                  name="areaName"
                  required
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Fitness"
                  className="w-full rounded-lg bg-surface px-3 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-foreground"
                />
              </div>
              <fieldset>
                <legend className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Colour
                </legend>
                <div
                  className="flex gap-1.5"
                  role="radiogroup"
                  aria-label="Area colour"
                >
                  {COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setNewColor(c)}
                      role="radio"
                      aria-checked={newColor === c}
                      aria-label={c}
                      className={`size-7 rounded-full bg-area-${c} ring-2 ring-offset-2 ring-offset-card ${newColor === c ? "ring-foreground" : "ring-transparent"}`}
                    />
                  ))}
                </div>
              </fieldset>
              <button
                type="submit"
                className="rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
                disabled={!newName.trim()}
              >
                Create
              </button>
            </div>
          </form>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {areas.map((area) => {
            const areaHabits = habits.filter((h) => h.areaId === area.id);
            const areaDone = areaHabits.filter((h) =>
              checkins.some((c) => c.habitId === h.id && c.date === today),
            ).length;
            const pct = areaHabits.length
              ? Math.round((areaDone / areaHabits.length) * 100)
              : 0;
            return (
              <Link
                key={area.id}
                to={`/areas/${area.id}`}
                className={`group block rounded-2xl bg-card p-6 ring-1 ring-black/5 transition-all hover:ring-area-${area.color}/40`}
              >
                <div className="mb-8 flex items-center justify-between">
                  <span
                    className={`mono rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wider bg-area-${area.color}/10 text-area-${area.color}`}
                  >
                    {area.name}
                  </span>
                  <span className="mono text-xs text-muted-foreground">
                    {pct}%
                  </span>
                </div>
                <h3 className="text-lg font-bold">
                  {areaHabits.length} habit
                  {areaHabits.length === 1 ? "" : "s"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {areaDone} of {areaHabits.length} done today
                </p>
                <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full bg-area-${area.color} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            );
          })}
          {areas.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No life areas yet. Create one to start cultivating.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Today&apos;s intentions
          </h2>
          <div className="space-y-6">
            {areas.map((area) => {
              const areaHabits = habits.filter((h) => h.areaId === area.id);
              if (areaHabits.length === 0) return null;
              return (
                <div key={area.id}>
                  <div className="mb-2.5 flex items-center gap-2">
                    <span
                      className={`size-1.5 rounded-full bg-area-${area.color}`}
                    />
                    <span className="text-xs font-semibold">{area.name}</span>
                  </div>
                  <div className="space-y-1">
                    {areaHabits.slice(0, 3).map((h) => {
                      const done = checkins.some(
                        (c) => c.habitId === h.id && c.date === today,
                      );
                      return (
                        <div
                          key={h.id}
                          className="flex items-center justify-between rounded-lg bg-card p-3 ring-1 ring-black/5"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`grid size-5 place-items-center rounded border-2 ${done ? `border-area-${area.color} bg-area-${area.color}` : "border-border"}`}
                            >
                              {done && (
                                <div className="size-1.5 rounded-full bg-background" />
                              )}
                            </div>
                            <span
                              className={`text-sm ${done ? "text-muted-foreground line-through" : ""}`}
                            >
                              {h.name}
                            </span>
                          </div>
                          <span className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {h.frequency}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-4 mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Cultivation logic
          </h2>
          <AiPanel />
        </div>
      </section>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="text-right">
      <div className="mono flex items-center justify-end gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

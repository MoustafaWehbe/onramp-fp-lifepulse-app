import { Link, useNavigate } from "react-router-dom";
import { Plus, Flame, TrendingUp, ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AppShell, PageHeader, AiPanel } from "@/components/app-shell";
import { AreaBadge, AreaPct } from "@/components/area/area-badge";
import { AreaDot } from "@/components/area/area-dot";
import { AreaProgress } from "@/components/area/area-progress";
import { useApp, todayStr } from "@/lib/store";
import { AREA_COLORS, areaTokens, type AreaColor } from "@/lib/area-colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

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
            <Button asChild>
              <Link to="/today">
                Daily check-in{" "}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
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
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setShowNew((s) => !s)}
            aria-expanded={showNew}
            aria-controls="new-area-form"
          >
            <Plus className="size-3" aria-hidden="true" /> New area
          </Button>
        </div>

        {showNew && (
          <Card id="new-area-form" className="mb-4 p-5">
            <form onSubmit={create}>
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1">
                  <label
                    htmlFor="new-area-name"
                    className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
                  >
                    Name
                  </label>
                  <Input
                    id="new-area-name"
                    name="areaName"
                    required
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Fitness"
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
                    {AREA_COLORS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setNewColor(c)}
                        role="radio"
                        aria-checked={newColor === c}
                        aria-label={c}
                        className={cn(
                          "size-7 rounded-full ring-2 ring-offset-2 ring-offset-card",
                          areaTokens[c].bg,
                          newColor === c
                            ? "ring-foreground"
                            : "ring-transparent",
                        )}
                      />
                    ))}
                  </div>
                </fieldset>
                <Button type="submit" disabled={!newName.trim()}>
                  Create
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {areas.map((area) => {
            const t = areaTokens[area.color];
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
                className={cn(
                  "block rounded-2xl bg-card p-6 ring-1 ring-black/5 transition-all duration-200",
                  t.hoverCardRing,
                  t.hoverCardBg,
                )}
              >
                <div className="mb-8 flex items-center justify-between">
                  <AreaBadge color={area.color}>{area.name}</AreaBadge>
                  <AreaPct value={pct} color={area.color} />
                </div>
                <h3 className="text-lg font-bold">
                  {areaHabits.length} habit
                  {areaHabits.length === 1 ? "" : "s"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {areaDone} of {areaHabits.length} done today
                </p>
                <AreaProgress
                  value={pct}
                  color={area.color}
                  className="mt-6 h-1"
                  aria-label={`${area.name} today progress`}
                />
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
              const t = areaTokens[area.color];
              const areaHabits = habits.filter((h) => h.areaId === area.id);
              if (areaHabits.length === 0) return null;
              return (
                <div key={area.id}>
                  <div className="mb-2.5 flex items-center gap-2">
                    <AreaDot color={area.color} className="size-1.5" />
                    <span className="text-xs font-semibold">{area.name}</span>
                  </div>
                  <div className="space-y-1">
                    {areaHabits.slice(0, 3).map((h) => {
                      const done = checkins.some(
                        (c) => c.habitId === h.id && c.date === today,
                      );
                      return (
                        <Card
                          key={h.id}
                          className="flex items-center justify-between p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "grid size-5 place-items-center rounded border-2",
                                done
                                  ? cn(t.border, t.bg)
                                  : "border-border",
                              )}
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
                        </Card>
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

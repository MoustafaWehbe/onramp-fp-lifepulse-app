import { useMemo } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useApp, todayStr } from "@/lib/store";
import { Separator } from "@/components/ui/separator";
import { Check } from "lucide-react";

export function TodayPage() {
  const { areas, habits, checkins, toggleCheckin } = useApp();
  const today = todayStr();

  const grouped = useMemo(
    () =>
      areas.map((a) => ({
        area: a,
        items: habits.filter((h) => h.areaId === a.id),
      })),
    [areas, habits],
  );

  const total = habits.length;
  const done = habits.filter((h) =>
    checkins.some((c) => c.habitId === h.id && c.date === today),
  ).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        title="Today's check-in"
        action={
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Completion
              </div>
              <div
                className="text-3xl font-extrabold tracking-tight"
                aria-live="polite"
              >
                {pct}%
              </div>
            </div>
            <RingProgress pct={pct} />
          </div>
        }
      />

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm font-medium">Nothing to check in yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add habits to a life area to start tracking your day.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {grouped.map(({ area, items }) => {
            if (items.length === 0) return null;
            const areaDone = items.filter((h) =>
              checkins.some((c) => c.habitId === h.id && c.date === today),
            ).length;
            return (
              <section key={area.id} aria-labelledby={`area-${area.id}-heading`}>
                <div className="mb-5 flex items-center gap-3">
                  <Separator className="flex-1" />
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 rounded-full bg-area-${area.color}`}
                      aria-hidden="true"
                    />
                    <h2
                      id={`area-${area.id}-heading`}
                      className="text-xs font-semibold"
                    >
                      {area.name}
                    </h2>
                    <span
                      className="mono text-[10px] text-muted-foreground"
                      aria-label={`${areaDone} of ${items.length} done`}
                    >
                      {areaDone}/{items.length}
                    </span>
                  </div>
                  <Separator className="flex-1" />
                </div>

                <ul className="space-y-2" role="list">
                  {items.map((h) => {
                    const isDone = checkins.some(
                      (c) => c.habitId === h.id && c.date === today,
                    );
                    return (
                      <li key={h.id}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isDone}
                          aria-label={`${h.name}, ${h.frequency}, ${isDone ? "completed" : "not completed"}`}
                          onClick={() => toggleCheckin(h.id, today)}
                          className={`group flex w-full items-center justify-between rounded-xl p-4 text-left ring-1 transition-all ${
                            isDone
                              ? `bg-area-${area.color}/5 ring-area-${area.color}/30`
                              : "bg-card ring-black/5 hover:ring-foreground/30"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              aria-hidden="true"
                              className={`grid size-6 shrink-0 place-items-center rounded-md transition-colors ${
                                isDone
                                  ? `bg-area-${area.color} text-background`
                                  : `ring-2 ring-border group-hover:ring-area-${area.color}/40`
                              }`}
                            >
                              {isDone && (
                                <Check className="size-3.5" strokeWidth={3} />
                              )}
                            </div>
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
                          <span className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {h.frequency}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function RingProgress({ pct }: { pct: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="var(--muted)"
        strokeWidth="4"
      />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        className="transition-all duration-500"
      />
    </svg>
  );
}

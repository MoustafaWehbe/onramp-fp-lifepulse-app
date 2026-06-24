import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { AreaPct } from "@/components/area/area-badge";
import { cn } from "@/lib/utils";
import { AreaDot } from "@/components/area/area-dot";
import { useApp } from "@/lib/store";
import { areaMix, areaTokens } from "@/lib/area-colors";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Flame, Calendar, Target } from "lucide-react";

export function ProgressPage() {
  const { areas, habits, checkins } = useApp();
  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(14);

  const days = useMemo(() => {
    const arr: { date: string; label: string }[] = [];
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      });
    }
    return arr;
  }, [windowDays]);

  const chartData = useMemo(() => {
    return days.map((d) => {
      const row: Record<string, number | string> = { day: d.label };
      areas.forEach((a) => {
        const areaHabits = habits.filter((h) => h.areaId === a.id);
        if (areaHabits.length === 0) {
          row[a.name] = 0;
          return;
        }
        const done = areaHabits.filter((h) =>
          checkins.some((c) => c.habitId === h.id && c.date === d.date),
        ).length;
        row[a.name] = Math.round((done / areaHabits.length) * 100);
      });
      return row;
    });
  }, [days, areas, habits, checkins]);

  const totalHabits = habits.length;
  const totalSlots = totalHabits * windowDays;
  const totalDone = checkins.filter(
    (c) =>
      days.some((d) => d.date === c.date) &&
      habits.some((h) => h.id === c.habitId),
  ).length;
  const completion = totalSlots
    ? Math.round((totalDone / totalSlots) * 100)
    : 0;

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (checkins.some((c) => c.date === ds)) streak++;
    else if (i > 0) break;
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Insights"
        title="Progress."
        action={
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-background p-1">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setWindowDays(d)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${windowDays === d ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                {d}d
              </button>
            ))}
          </div>
        }
      />

      {/* Stat cards */}
      <section className="mb-10 grid gap-4 md:grid-cols-3">
        <BigStat
          icon={<Flame className="size-4" />}
          label="Current streak"
          value={`${streak}`}
          unit="days"
        />
        <BigStat
          icon={<Target className="size-4" />}
          label={`Last ${windowDays} days`}
          value={`${completion}%`}
          unit="completion"
        />
        <BigStat
          icon={<Calendar className="size-4" />}
          label="Tracking"
          value={`${habits.length}`}
          unit={`habits • ${areas.length} areas`}
        />
      </section>

      {/* Per-area line chart */}
      <Card className="mb-10 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Per-area completion</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              % of habits completed each day, by area
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {areas.map((a) => (
              <div key={a.id} className="flex items-center gap-1.5">
                <AreaDot color={a.color} className="size-2" />
                <span className="text-xs text-muted-foreground">{a.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => `${v}%`}
              />
              {areas.map((a) => (
                <Line
                  key={a.id}
                  type="monotone"
                  dataKey={a.name}
                  stroke={areaTokens[a.color].cssVar}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Area breakdown heatmaps */}
      <section>
        <h2 className="mb-4 mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Area breakdown
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {areas.map((a) => {
            const areaHabits = habits.filter((h) => h.areaId === a.id);
            const slots = areaHabits.length * windowDays;
            const done = checkins.filter(
              (c) =>
                days.some((d) => d.date === c.date) &&
                areaHabits.some((h) => h.id === c.habitId),
            ).length;
            const pct = slots ? Math.round((done / slots) * 100) : 0;
            return (
              <Card key={a.id} className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AreaDot color={a.color} className="size-2" />
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        areaTokens[a.color].text,
                      )}
                    >
                      {a.name}
                    </span>
                  </div>
                  <AreaPct value={pct} color={a.color} className="text-[10px]" />
                </div>
                <div className="mb-4 grid grid-cols-7 gap-1 md:grid-cols-14">
                  {days.map((d) => {
                    const slot = areaHabits.length;
                    if (slot === 0)
                      return (
                        <div
                          key={d.date}
                          className="h-6 rounded-sm bg-muted"
                        />
                      );
                    const dn = areaHabits.filter((h) =>
                      checkins.some(
                        (c) => c.habitId === h.id && c.date === d.date,
                      ),
                    ).length;
                    const intensity = dn / slot;
                    return (
                      <div
                        key={d.date}
                        title={`${d.label} • ${Math.round(intensity * 100)}%`}
                        className="h-6 rounded-sm transition-all"
                        style={{
                          background:
                            intensity === 0
                              ? "var(--muted)"
                              : areaMix(a.color, 15 + intensity * 85),
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{areaHabits.length} habits</span>
                  <span className="mono">
                    {done} / {slots} completions
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}

function BigStat({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <Card className="p-6">
      <div className="mono mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-extrabold tracking-tight">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </Card>
  );
}

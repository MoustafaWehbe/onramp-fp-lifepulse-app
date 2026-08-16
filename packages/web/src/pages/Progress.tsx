import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { AreaPct } from "@/components/area/area-badge";
import { cn } from "@/lib/utils";
import { AreaDot } from "@/components/area/area-dot";
import { daysAgoStr, todayStr } from "@/lib/store";
import { useAreas } from "@/hooks/useAreas";
import { useHabits, type Frequency, type Habit } from "@/hooks/useHabits";
import { useCheckInActivity, useCheckIns, isChecked } from "@/hooks/useCheckIns";
import { areaMix, tokensFor } from "@/lib/area-colors";
import { habitCompletion, habitsCompletion } from "@/lib/habit-schedule";
import { Card } from "@/components/ui/card";
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

const FREQUENCY_LABEL: Record<Frequency, string> = {
  daily: "daily",
  weekdays: "weekdays",
  "5x": "5×/wk",
  "3x": "3×/wk",
  weekly: "weekly",
};

interface WindowDay {
  date: string;
  label: string;
}

function buildWindow(count: number, endOffset: number): WindowDay[] {
  const arr: WindowDay[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const offset = endOffset + i;
    const d = new Date();
    d.setDate(d.getDate() - offset);
    arr.push({
      date: daysAgoStr(offset),
      label: d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    });
  }
  return arr;
}

export function ProgressPage() {
  const { data: habits = [] } = useHabits();
  const { data: areas = [] } = useAreas();
  const { data: activity } = useCheckInActivity();
  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(14);

  const checkInRange = useMemo(
    () => ({ from: daysAgoStr(364), to: todayStr() }),
    [],
  );
  const { data: checkins = [] } = useCheckIns(checkInRange);

  const days = useMemo(() => buildWindow(windowDays, 0), [windowDays]);
  const previousDays = useMemo(
    () => buildWindow(windowDays, windowDays),
    [windowDays],
  );
  const dateKeys = useMemo(() => days.map((d) => d.date), [days]);
  const previousDateKeys = useMemo(
    () => previousDays.map((d) => d.date),
    [previousDays],
  );

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
          isChecked(checkins, h.id, d.date),
        ).length;
        row[a.name] = Math.round((done / areaHabits.length) * 100);
      });
      return row;
    });
  }, [days, areas, habits, checkins]);

  const current = useMemo(
    () => habitsCompletion(habits, dateKeys, checkins),
    [habits, dateKeys, checkins],
  );
  const previous = useMemo(
    () => habitsCompletion(habits, previousDateKeys, checkins),
    [habits, previousDateKeys, checkins],
  );
  const vsPrevious = useMemo(() => {
    if (previous.expected <= 0) return null;
    const windowStart = dateKeys[0];
    if (!windowStart) return null;
    const existedBefore = checkins.some(
      (c) => c.date < windowStart && habits.some((h) => h.id === c.habitId),
    );
    if (!existedBefore) return null;
    return current.pct - previous.pct;
  }, [previous, current.pct, dateKeys, checkins, habits]);

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const ds = daysAgoStr(i);
    if (checkins.some((c) => c.date === ds)) streak++;
    else if (i > 0) break;
  }
  const bestStreak = Math.max(streak, activity?.longestStreak ?? 0);

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
          hint={bestStreak > 0 ? `best ${bestStreak}` : undefined}
        />
        <BigStat
          icon={<Target className="size-4" />}
          label={`Last ${windowDays} days`}
          value={`${current.pct}%`}
          unit="completion"
          hint={
            vsPrevious === null ? undefined : (
              <VsPrevious delta={vsPrevious} windowDays={windowDays} />
            )
          }
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
                  stroke={tokensFor(a.color).cssVar}
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
            const stats = habitsCompletion(areaHabits, dateKeys, checkins);
            return (
              <Card key={a.id} className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AreaDot color={a.color} className="size-2" />
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        tokensFor(a.color).text,
                      )}
                    >
                      {a.name}
                    </span>
                  </div>
                  <AreaPct
                    value={stats.pct}
                    color={a.color}
                    className="text-[10px]"
                  />
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
                      isChecked(checkins, h.id, d.date),
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
                {areaHabits.length > 0 && (
                  <ul className="mb-3 space-y-1.5 border-t border-border pt-3">
                    {areaHabits.map((h) => (
                      <HabitRow
                        key={h.id}
                        habit={h}
                        dates={dateKeys}
                        checkins={checkins}
                      />
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {areaHabits.length}{" "}
                    {areaHabits.length === 1 ? "habit" : "habits"}
                  </span>
                  <span className="mono">
                    {stats.done} / {stats.expected} completions
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

function HabitRow({
  habit,
  dates,
  checkins,
}: {
  habit: Habit;
  dates: string[];
  checkins: { habitId: string; date: string }[];
}) {
  const stats = habitCompletion(habit, dates, checkins);
  return (
    <li className="flex items-center justify-between gap-3 text-[11px]">
      <span className="min-w-0 truncate text-foreground">
        {habit.name}
        <span className="ml-1.5 text-muted-foreground">
          {FREQUENCY_LABEL[habit.frequency]}
        </span>
      </span>
      <span className="mono shrink-0 tabular-nums text-muted-foreground">
        {stats.done} / {stats.expected}
      </span>
    </li>
  );
}

function VsPrevious({
  delta,
  windowDays,
}: {
  delta: number;
  windowDays: number;
}) {
  if (delta === 0) return <>same as previous {windowDays}d</>;
  const sign = delta > 0 ? "↑" : "↓";
  return (
    <span className={delta > 0 ? "text-area-health" : "text-destructive"}>
      {sign} {Math.abs(delta)}% vs previous {windowDays}d
    </span>
  );
}

function BigStat({
  icon,
  label,
  value,
  unit,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  hint?: React.ReactNode;
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
      {hint ? (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </Card>
  );
}

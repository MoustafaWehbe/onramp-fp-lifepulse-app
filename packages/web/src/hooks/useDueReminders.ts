import { useCallback, useEffect, useMemo, useState } from "react";
import { useHabits, type Habit } from "@/hooks/useHabits";
import { useTodayCheckIns, isChecked } from "@/hooks/useCheckIns";
import { isDemoPopup } from "@/lib/demo";

/**
 * How often "now" is re-evaluated. A reminder set for 14:30 should surface
 * within half a minute of that time without the user reloading the page.
 */
const TICK_MS = 30_000;

const DISMISSED_KEY = "kultivar:reminders-dismissed";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ZonedNow {
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:mm", 24-hour */
  time: string;
  /** 0=Sun..6=Sat, matching Habit.daysOfWeek */
  weekday: number;
}

function zonedNow(timeZone: string, at: Date): ZonedNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(at);

  const get = (type: string) => parts.find((p) => p.type === type)!.value;

  // en-US with hour12:false uses the h24 cycle, so midnight formats as "24".
  const hour = get("hour") === "24" ? "00" : get("hour");

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}`,
    weekday: WEEKDAY_NAMES.indexOf(get("weekday")),
  };
}

/**
 * Mirrors the cron pattern the API builds for the email reminder in
 * packages/api/src/lib/habit-reminders.ts, so the popup and the email agree on
 * which days a habit is expected.
 */
function fallsOnToday(habit: Habit, weekday: number): boolean {
  if (habit.daysOfWeek && habit.daysOfWeek.length > 0) {
    return habit.daysOfWeek.includes(weekday);
  }
  if (habit.frequency === "weekdays") return weekday >= 1 && weekday <= 5;
  return true;
}

interface DismissedState {
  date: string;
  habitIds: string[];
}

/** Dismissals only last the day, so tomorrow's reminder still gets through. */
function readDismissed(today: string): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DismissedState;
    return parsed.date === today ? parsed.habitIds : [];
  } catch {
    return [];
  }
}

/**
 * The habit whose reminder time has passed today without a check-in, if any.
 *
 * Deliberately computed in the browser rather than fetched: the habit list
 * already carries reminderTime and timezone, so this needs no endpoint and no
 * polling. It only fires while the app is open — the email reminder covers the
 * case where it isn't.
 */
export function useDueReminder() {
  const { data: habits = [] } = useHabits();
  const { data: checkins = [] } = useTodayCheckIns();
  const forced = isDemoPopup("reminder");

  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [now, setNow] = useState(() => new Date());

  // Read during the first render rather than in an effect. Effects run after
  // paint, and every page mounts its own AppShell, so an effect would flash the
  // popup on each navigation for a habit that was already dismissed today.
  const [dismissedIds, setDismissedIds] = useState<string[]>(() =>
    // A stored dismissal is ignored in demo mode so the popup can be shown on
    // demand; dismissing during the demo still closes it, below.
    forced ? [] : readDismissed(zonedNow(browserTimeZone, new Date()).date),
  );

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const today = useMemo(
    () => zonedNow(browserTimeZone, now).date,
    [browserTimeZone, now],
  );

  // Re-read on each new local day so yesterday's dismissals stop applying.
  useEffect(() => {
    if (forced) return;
    setDismissedIds(readDismissed(today));
  }, [forced, today]);

  const dueHabit = useMemo(() => {
    // Show the first habit that isn't checked in yet, whatever the clock says,
    // so the popup can be demonstrated without waiting for a reminder time.
    if (forced) {
      // Dismissals still count here, or "Not now" would appear to do nothing
      // and the dialog could never be closed during a demo.
      const candidates = habits.filter((h) => !dismissedIds.includes(h.id));
      const notYetDone = candidates.filter((h) => !isChecked(checkins, h.id));
      return (
        notYetDone.find((h) => h.reminderEnabled && h.reminderTime) ??
        notYetDone[0] ??
        candidates[0] ??
        null
      );
    }

    return (
      habits.find((habit) => {
        if (!habit.reminderEnabled || !habit.reminderTime || habit.archivedAt) {
          return false;
        }
        if (dismissedIds.includes(habit.id)) return false;
        if (isChecked(checkins, habit.id)) return false;

        const local = zonedNow(habit.timezone ?? browserTimeZone, now);
        if (!fallsOnToday(habit, local.weekday)) return false;

        return local.time >= habit.reminderTime.slice(0, 5);
      }) ?? null
    );
  }, [habits, checkins, dismissedIds, browserTimeZone, now, forced]);

  const dismiss = useCallback(
    (habitId: string) => {
      const habitIds = [...readDismissed(today), habitId];
      localStorage.setItem(DISMISSED_KEY, JSON.stringify({ date: today, habitIds }));
      setDismissedIds(habitIds);
    },
    [today],
  );

  return { dueHabit, dismiss };
}

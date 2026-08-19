import { useState, type FormEvent } from "react";
import {
  Clock,
  Flame,
  Gauge,
  ListChecks,
  Lock,
  Pencil,
  Send,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AreaDot } from "@/components/area/area-dot";
import { tokensFor } from "@/lib/area-colors";
import { habitCompletion, habitsCompletion } from "@/lib/habit-schedule";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { CoachRequest } from "@/hooks/useCoachRequests";
import {
  useClientData,
  useFeedback,
  useAddFeedback,
  useUpdateClientHabit,
  type ClientArea,
  type ClientHabit,
} from "@/hooks/useCoachFeedback";
import type { Frequency } from "@/hooks/useHabits";
import { FeedbackThread } from "./feedback-thread";
import { HabitEditDialog } from "./habit-edit-dialog";
import { sharingSummary } from "./sharing";

const FREQUENCY_LABEL: Record<Frequency, string> = {
  daily: "daily",
  weekdays: "weekdays",
  "5x": "5×/wk",
  "3x": "3×/wk",
  weekly: "weekly",
};

const WEEKDAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

/** Check-in shape the completion helpers expect. */
function checkInsOf(habits: ClientHabit[]) {
  return habits.flatMap((habit) =>
    habit.completionDates.map((date) => ({ habitId: habit.id, date })),
  );
}

function daysSince(iso: string | null): string {
  if (!iso) return "never";
  const diff = Math.round(
    (Date.now() - new Date(`${iso}T00:00:00Z`).getTime()) / 86_400_000,
  );
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff} days ago`;
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-surface p-4 ring-1 ring-border">
      <Icon className="mb-3 size-4 text-muted-foreground" aria-hidden="true" />
      <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A thin bar rather than a number alone — 12/20 reads faster with a shape. */
function ConsistencyBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function HabitRow({
  habit,
  windowDates,
  canEdit,
  onEdit,
}: {
  habit: ClientHabit;
  windowDates: string[];
  canEdit: boolean;
  onEdit: () => void;
}) {
  const stats = habitCompletion(habit, windowDates, checkInsOf([habit]));

  return (
    <li className="flex flex-col gap-3 rounded-xl bg-surface p-4 ring-1 ring-border sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-sm font-medium">{habit.name}</p>
          <span className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {FREQUENCY_LABEL[habit.frequency]}
          </span>
          {habit.durationMinutes && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" aria-hidden="true" />
              {habit.durationMinutes} min
            </span>
          )}
          {habit.difficulty && (
            <span className="text-xs text-muted-foreground">
              {habit.difficulty}
            </span>
          )}
        </div>

        {habit.daysOfWeek && habit.daysOfWeek.length > 0 && (
          <p className="mt-1 flex gap-1" aria-label="Scheduled days">
            {WEEKDAY_LETTER.map((letter, day) => (
              <span
                key={day}
                className={cn(
                  "grid size-4 place-items-center rounded text-[9px] font-medium",
                  habit.daysOfWeek?.includes(day)
                    ? "bg-foreground text-background"
                    : "bg-border/50 text-muted-foreground",
                )}
              >
                {letter}
              </span>
            ))}
          </p>
        )}

        {habit.notes && (
          <p className="mt-1.5 text-xs text-muted-foreground">{habit.notes}</p>
        )}
      </div>

      <div className="flex items-center gap-4 sm:shrink-0">
        <div className="w-28">
          <div className="flex items-baseline justify-between gap-2">
            <span className="mono text-xs font-bold tabular-nums">
              {stats.done}/{stats.expected}
            </span>
            <span className="text-[10px] text-muted-foreground">{stats.pct}%</span>
          </div>
          <div className="mt-1">
            <ConsistencyBar
              pct={stats.pct}
              color={stats.pct >= 70 ? "bg-foreground" : "bg-muted-foreground/50"}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            last {daysSince(habit.lastCompletedOn)}
          </p>
        </div>

        <div className="w-12 text-center">
          <p className="flex items-center justify-center gap-0.5 text-sm font-bold tabular-nums">
            <Flame
              className={cn(
                "size-3.5",
                habit.currentStreak > 0
                  ? "text-foreground"
                  : "text-muted-foreground/40",
              )}
              aria-hidden="true"
            />
            {habit.currentStreak}
          </p>
          <p className="text-[10px] text-muted-foreground">streak</p>
        </div>

        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={onEdit}
            aria-label={`Adjust ${habit.name}`}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </Button>
        )}
      </div>
    </li>
  );
}

function AreaSection({
  area,
  windowDates,
  canEdit,
  onEditHabit,
}: {
  area: ClientArea;
  windowDates: string[];
  canEdit: boolean;
  onEditHabit: (habit: ClientHabit) => void;
}) {
  const tokens = tokensFor(area.color);
  const stats = habitsCompletion(area.habits, windowDates, checkInsOf(area.habits));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <AreaDot color={area.color} className="size-2.5" />
          {area.name}
        </h4>
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {area.habits.length} habit{area.habits.length === 1 ? "" : "s"}
          {area.habits.length > 0 && ` · ${stats.pct}%`}
        </p>
      </div>

      {area.habits.length === 0 ? (
        <p className={cn("rounded-xl p-4 text-xs ring-1", tokens.bgFaint, tokens.ring)}>
          No habits in this area yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {area.habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              windowDates={windowDates}
              canEdit={canEdit}
              onEdit={() => onEditHabit(habit)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ProfileSnapshot({ profile }: { profile: Record<string, unknown> }) {
  const str = (v: unknown): string =>
    Array.isArray(v) ? v.join(", ") : String(v ?? "");

  const rows: { label: string; key: string; suffix?: string }[] = [
    { label: "Goals", key: "goals" },
    { label: "Stress", key: "stressLevel", suffix: "/10" },
    { label: "Sleep", key: "sleepHours", suffix: " hrs" },
    { label: "Motivation", key: "motivationDriver" },
    { label: "Profession", key: "profession" },
    { label: "Energy", key: "energyPattern" },
  ];

  return (
    <>
      {rows
        .filter(({ key }) => profile[key] != null)
        .map(({ label, key, suffix }) => (
          <p key={key}>
            <span className="text-muted-foreground">{label}: </span>
            {str(profile[key])}
            {suffix ?? ""}
          </p>
        ))}
    </>
  );
}

/**
 * The coach's working view of one client: what they've been doing, grouped the
 * way the client themselves organises their life, plus the thread the two of
 * them share.
 */
export function ClientDetail({ request }: { request: CoachRequest }) {
  const { data, isPending } = useClientData(request.id);
  const { data: feedback = [], isPending: feedbackLoading } = useFeedback(request.id);
  const addFeedback = useAddFeedback(request.id);
  const updateHabit = useUpdateClientHabit(request.id);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<ClientHabit | null>(null);

  const clientName = request.requester?.name ?? "This client";
  const firstName = clientName.split(" ")[0] ?? clientName;
  const areas = data?.areas ?? [];
  const windowDates = data?.windowDates ?? [];
  const canEdit = data?.canEditHabits ?? false;

  const allHabits = areas.flatMap((area) => area.habits);
  const overall = habitsCompletion(allHabits, windowDates, checkInsOf(allHabits));
  const bestStreak = allHabits.reduce(
    (best, habit) => Math.max(best, habit.currentStreak),
    0,
  );
  const activeAreas = areas.filter((area) => area.habits.length > 0);

  const submitNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      await addFeedback.mutateAsync(draft.trim());
      setDraft("");
      toast.success("Note added");
    } catch {
      toast.error("Couldn't save your note");
    }
  };

  const saveHabit = async (patch: Parameters<typeof updateHabit.mutateAsync>[0]) => {
    try {
      await updateHabit.mutateAsync(patch);
      setEditing(null);
      toast.success(`Updated — ${firstName} can see the change`);
    } catch {
      // Most likely cause: the client withdrew editing while this was open.
      toast.error("Couldn't save. You may no longer have permission to edit.");
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      {editing && (
        <HabitEditDialog
          habit={editing}
          clientName={firstName}
          isSaving={updateHabit.isPending}
          onSave={(input) => saveHabit({ habitId: editing.id, ...input })}
          onClose={() => setEditing(null)}
        />
      )}

      <div>
        <h3 className="text-base font-semibold">{clientName}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Sharing: {sharingSummary(request)}
        </p>
      </div>

      {request.shareHabits ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {isPending ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))
            ) : (
              <>
                <StatTile
                  icon={ListChecks}
                  label="Habits"
                  value={String(allHabits.length)}
                  hint={`across ${activeAreas.length} area${
                    activeAreas.length === 1 ? "" : "s"
                  }`}
                />
                <StatTile
                  icon={Gauge}
                  label="Consistency"
                  value={`${overall.pct}%`}
                  hint={`${overall.done} of ${overall.expected} in 30 days`}
                />
                <StatTile
                  icon={Flame}
                  label="Best streak"
                  value={String(bestStreak)}
                  hint="consecutive days, running now"
                />
              </>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Habits by life area — last 30 days
              </p>
              {request.shareHabits && !canEdit && (
                <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Lock className="size-3" aria-hidden="true" />
                  View only
                </p>
              )}
            </div>

            {isPending ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : areas.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Sparkles
                    className="mx-auto mb-3 size-8 opacity-30"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground">
                    {firstName} hasn't set up any life areas yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              areas.map((area) => (
                <AreaSection
                  key={area.id}
                  area={area}
                  windowDates={windowDates}
                  canEdit={canEdit}
                  onEditHabit={setEditing}
                />
              ))
            )}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <Lock className="mx-auto mb-3 size-8 opacity-30" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {firstName} hasn't shared their habits with you.
            </p>
          </CardContent>
        </Card>
      )}

      {request.shareProfile && data?.profile && (
        <div>
          <p className="mono mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Profile snapshot
          </p>
          <Card>
            <CardContent className="space-y-2 pt-5 text-sm">
              <ProfileSnapshot profile={data.profile} />
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      <div>
        <p className="mono mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          Notes & changes
        </p>
        <div className="mb-4">
          <FeedbackThread
            entries={feedback}
            isPending={feedbackLoading}
            emptyMessage="Nothing here yet — add your first note below."
          />
        </div>
        <form onSubmit={submitNote} className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={`Leave a note for ${firstName}…`}
            className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
            aria-label="New note"
          />
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={!draft.trim() || addFeedback.isPending}
          >
            <Send className="size-3.5" aria-hidden="true" />
            {addFeedback.isPending ? "Saving…" : "Add note"}
          </Button>
        </form>
      </div>
    </div>
  );
}

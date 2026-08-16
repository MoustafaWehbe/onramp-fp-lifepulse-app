import type { Job } from "bullmq";
import { Op, fn, col } from "sequelize";
import {
  Habit,
  HabitCompletion,
  LifeArea,
  NotificationLog,
  NotificationPreference,
  User,
  emailQueue,
  localTimeInTimeZone,
  longestStreak,
  todayInTimeZone,
} from "@starter-kit/shared";
import type {
  NotificationType,
  ReEngagementSweepJobData,
  ReEngagementSweepJobResult,
} from "@starter-kit/shared";

/**
 * A month of silence is the only point at which we email. Shorter gaps are a
 * busy week, not a lapse, and the app greets those in person on the Today page
 * rather than reaching into someone's inbox over it.
 */
const LAPSE_DAYS = 30;

/** Local hour we aim to send at. The sweep runs hourly and picks matching users. */
const SEND_HOUR = 10;

/** Never send two re-engagement messages closer together than this. */
const MIN_DAYS_BETWEEN_SENDS = 30;

/** How far back to read completions when computing a user's best past streak. */
const STREAK_LOOKBACK_DAYS = 365;

const MS_PER_DAY = 86_400_000;

const LAPSE_NOTIFICATION_TYPE = `reengagement_${LAPSE_DAYS}d` as NotificationType;

/**
 * Overrides for triggering a sweep by hand. The scheduled job never sets
 * these — they exist so an operator can run the sweep for one user without
 * waiting for that user's send hour to come round.
 */
export interface SweepOptions {
  /** Skip the "is it ~10:00 for this user" gate. */
  ignoreSendHour?: boolean;
  /** Restrict the sweep to a single user. */
  onlyUserId?: string;
}

/**
 * Daily sweep that finds users who've stopped checking in and sends one
 * encouraging email. Runs hourly so it can hit ~10:00 in each user's own
 * timezone; users outside that hour are skipped and picked up on a later pass.
 */
export async function processReEngagementSweepJob(
  _job: Job<ReEngagementSweepJobData, ReEngagementSweepJobResult>,
): Promise<ReEngagementSweepJobResult> {
  return runReEngagementSweep();
}

export async function runReEngagementSweep(
  options: SweepOptions = {},
): Promise<ReEngagementSweepJobResult> {
  if (process.env.REENGAGEMENT_ENABLED === "false") {
    return { scanned: 0, notified: 0 };
  }

  const candidates = await findCandidates(options);
  let notified = 0;

  for (const candidate of candidates) {
    try {
      if (await notifyCandidate(candidate)) notified += 1;
    } catch (error) {
      // One bad user shouldn't abort the sweep for everyone else.
      console.error(
        `[reengagement] Failed for user ${candidate.user.id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.info(
    `[reengagement] Scanned ${candidates.length} candidate(s), queued ${notified} email(s)`,
  );

  return { scanned: candidates.length, notified };
}

interface Candidate {
  user: User;
  preference: NotificationPreference;
  /** Wall-clock timezone used for both the send hour and the lapse maths. */
  timezone: string;
}

/**
 * Users who have opted in, still have at least one active habit, and whose
 * local time is currently within the send hour. The lapse itself is checked
 * per-user afterwards, since it needs their completion history.
 */
async function findCandidates(options: SweepOptions): Promise<Candidate[]> {
  const users = await User.findAll({
    ...(options.onlyUserId ? { where: { id: options.onlyUserId } } : {}),
    include: [
      {
        model: NotificationPreference,
        as: "notificationPreference",
        required: true,
        where: { reengagementEnabled: true },
      },
      // `required: true` restricts the sweep to users who still have something
      // to come back to — nobody should be nudged about an empty account.
      {
        model: Habit,
        as: "habits",
        required: true,
        where: { archivedAt: null },
        attributes: ["id", "timezone"],
      },
    ],
  });

  const candidates: Candidate[] = [];

  for (const user of users) {
    const preference = (
      user as User & { notificationPreference?: NotificationPreference }
    ).notificationPreference;
    if (!preference) continue;

    const habits = (user as User & { habits?: Habit[] }).habits ?? [];
    // Prefer an explicit preference timezone, then whatever their habits use.
    const timezone =
      preference.timezone ?? habits.find((h) => h.timezone)?.timezone ?? "UTC";

    if (!options.ignoreSendHour) {
      const localHour = Number(localTimeInTimeZone(timezone).slice(0, 2));
      if (localHour !== SEND_HOUR) continue;
    }

    candidates.push({ user, preference, timezone });
  }

  return candidates;
}

async function notifyCandidate({ user, timezone }: Candidate): Promise<boolean> {
  const today = todayInTimeZone(timezone);

  const lastCompletion = await HabitCompletion.findOne({
    where: { userId: user.id, completed: true },
    order: [["completionDate", "DESC"]],
    attributes: ["completionDate"],
  });

  // Someone who has never checked in isn't lapsed, they're new — onboarding's
  // job, not this one.
  if (!lastCompletion) return false;

  const daysInactive = Math.floor(
    (Date.parse(`${today}T00:00:00Z`) -
      Date.parse(`${lastCompletion.completionDate}T00:00:00Z`)) /
      MS_PER_DAY,
  );

  if (daysInactive < LAPSE_DAYS) return false;

  const lastLog = await NotificationLog.findOne({
    where: { userId: user.id, type: { [Op.like]: "reengagement_%" } },
    order: [["sentAt", "DESC"]],
  });

  // One message per lapse. Without this the sweep would re-send every day for
  // as long as the user stays away, which is the opposite of the intent.
  if (lastLog) {
    const daysSinceLastSend = (Date.now() - lastLog.sentAt.getTime()) / MS_PER_DAY;
    if (daysSinceLastSend < MIN_DAYS_BETWEEN_SENDS) return false;
  }

  const { bestStreak, topHabit, areaName } = await personalization(user.id, today);

  await emailQueue.add("re-engagement", {
    to: user.email,
    // Overridden by the template; kept for the fallback renderer and logs.
    subject: "Your habits are still here",
    template: "re-engagement",
    userId: user.id,
    variables: {
      name: user.name,
      daysInactive: String(daysInactive),
      longestStreak: String(bestStreak),
      ...(topHabit ? { topHabit } : {}),
      ...(areaName ? { areaName } : {}),
    },
  });

  // Logged at enqueue time: a delivery failure shouldn't let the next sweep
  // send the same rung again an hour later.
  await NotificationLog.create({
    userId: user.id,
    type: LAPSE_NOTIFICATION_TYPE,
    channel: "email",
  });

  console.info(
    `[reengagement] Queued nudge for user ${user.id} (${daysInactive} days inactive)`,
  );

  return true;
}

/**
 * Concrete details make the difference between "we miss you" and "your 12-day
 * meditation streak is waiting" — the latter is the whole point of the email.
 */
async function personalization(
  userId: string,
  today: string,
): Promise<{ bestStreak: number; topHabit?: string; areaName?: string }> {
  const since = new Date(Date.parse(`${today}T00:00:00Z`));
  since.setUTCDate(since.getUTCDate() - STREAK_LOOKBACK_DAYS);
  const sinceDate = since.toISOString().slice(0, 10);

  const [completions, mostCompleted] = await Promise.all([
    HabitCompletion.findAll({
      where: {
        userId,
        completed: true,
        completionDate: { [Op.gte]: sinceDate },
      },
      attributes: ["completionDate"],
    }),
    // The habit they stuck with best is the most persuasive one to name.
    HabitCompletion.findAll({
      where: { userId, completed: true },
      attributes: ["habitId", [fn("COUNT", col("habit_id")), "total"]],
      group: ["habitId"],
      order: [[fn("COUNT", col("habit_id")), "DESC"]],
      limit: 1,
      raw: true,
    }) as unknown as Promise<{ habitId: string }[]>,
  ]);

  const bestStreak = longestStreak(completions.map((c) => c.completionDate));

  let topHabit: string | undefined;
  let areaName: string | undefined;

  const topHabitId = mostCompleted[0]?.habitId;
  if (topHabitId) {
    const habit = await Habit.findByPk(topHabitId, {
      include: [{ model: LifeArea, as: "lifeArea", attributes: ["name"] }],
      attributes: ["name", "archivedAt"],
    });
    if (habit && !habit.archivedAt) {
      topHabit = habit.name;
      areaName = (habit as Habit & { lifeArea?: LifeArea }).lifeArea?.name;
    }
  }

  return { bestStreak, topHabit, areaName };
}

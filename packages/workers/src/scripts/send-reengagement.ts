import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

import { Op } from "sequelize";
import {
  Habit,
  HabitCompletion,
  NotificationLog,
  User,
  getOrCreatePreferences,
  todayInTimeZone,
} from "@starter-kit/shared";
import { initializeDatabase } from "../lib/db";
import { runReEngagementSweep } from "../jobs/reengagement.job";

/**
 * Sends the encouragement email to one existing user on demand, so a demo
 * doesn't have to wait for that user's 10:00 send hour.
 *
 * This script never creates, modifies, or deletes habits, areas, or check-ins.
 * The only thing it can remove is this user's re-engagement rows in
 * notification_logs, and only when passed --reset-cap — the sweep refuses to
 * repeat a tier it has already sent, so a second demo needs that history gone.
 *
 *   npm run send:reengagement --workspace=@starter-kit/workers -- you@example.com
 *   npm run send:reengagement --workspace=@starter-kit/workers -- you@example.com --reset-cap
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const resetCap = args.includes("--reset-cap");
  const email = args.find((arg) => !arg.startsWith("--"));

  if (!email) {
    console.error(
      "Usage: send:reengagement <email> [--reset-cap]\n" +
        "The email must belong to an existing account.",
    );
    process.exit(1);
  }

  await initializeDatabase();

  const user = await User.findOne({ where: { email } });
  if (!user) {
    console.error(
      `No account found for ${email}. This script only sends to existing users — ` +
        "sign up in the app first.",
    );
    process.exit(1);
  }

  await reportBlockers(user);

  if (resetCap) {
    const removed = await NotificationLog.destroy({
      where: { userId: user.id, type: { [Op.like]: "reengagement_%" } },
    });
    console.info(`Cleared ${removed} re-engagement log row(s) so the tier can resend.`);
  }

  const result = await runReEngagementSweep({
    ignoreSendHour: true,
    onlyUserId: user.id,
  });

  if (result.notified > 0) {
    console.info(`\nQueued the encouragement email for ${email}.`);
    console.info("The workers process must be running for it to actually send.");
  } else {
    console.info(
      `\nNothing was sent to ${email}. See the checks above for the reason` +
        (resetCap ? "." : ", or retry with --reset-cap."),
    );
  }

  process.exit(0);
}

/** Prints why the sweep would skip this user, since it otherwise fails silently. */
async function reportBlockers(user: User): Promise<void> {
  const preference = await getOrCreatePreferences(user.id);
  const timezone = preference.timezone ?? "UTC";
  const today = todayInTimeZone(timezone);

  const activeHabits = await Habit.count({
    where: { userId: user.id, archivedAt: null },
  });

  const lastCompletion = await HabitCompletion.findOne({
    where: { userId: user.id, completed: true },
    order: [["completionDate", "DESC"]],
    attributes: ["completionDate"],
  });

  const daysInactive = lastCompletion
    ? Math.floor(
        (Date.parse(`${today}T00:00:00Z`) -
          Date.parse(`${lastCompletion.completionDate}T00:00:00Z`)) /
          86_400_000,
      )
    : null;

  const lastLog = await NotificationLog.findOne({
    where: { userId: user.id, type: { [Op.like]: "reengagement_%" } },
    order: [["sentAt", "DESC"]],
  });

  console.info(`\nChecks for ${user.email}:`);
  console.info(`  opted in to nudges: ${preference.reengagementEnabled ? "yes" : "NO"}`);
  console.info(`  active habits: ${activeHabits}${activeHabits === 0 ? " (blocks send)" : ""}`);
  console.info(
    `  days since last check-in: ${daysInactive ?? "never checked in"}` +
      (daysInactive !== null && daysInactive < 3 ? " (needs 3+)" : ""),
  );
  console.info(
    `  last nudge: ${lastLog ? `${lastLog.type} on ${lastLog.sentAt.toISOString().slice(0, 10)}` : "none"}`,
  );
}

main().catch((err) => {
  console.error("Failed to send the encouragement email:", err);
  process.exit(1);
});

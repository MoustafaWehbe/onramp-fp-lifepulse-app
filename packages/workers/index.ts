import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import { reengagementQueue } from "@starter-kit/shared";
import { createWorkers } from "./src/queues";
import { initializeDatabase } from "./src/lib/db";

/**
 * Hourly rather than daily: the sweep sends at ~10:00 in each user's own
 * timezone, so it has to wake up every hour to catch each one. Upserting by a
 * fixed scheduler id is idempotent, so restarts and multiple worker instances
 * converge on a single schedule.
 */
async function scheduleReEngagementSweep(): Promise<void> {
  if (process.env.REENGAGEMENT_ENABLED === "false") {
    await reengagementQueue.removeJobScheduler("reengagement-sweep");
    console.info("Re-engagement sweep is disabled (REENGAGEMENT_ENABLED=false)");
    return;
  }

  await reengagementQueue.upsertJobScheduler(
    "reengagement-sweep",
    { pattern: "0 0 * * * *", tz: "UTC" },
    {
      name: "reengagement-sweep",
      data: {},
      opts: {
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      },
    },
  );
}

async function main(): Promise<void> {
  console.info("Starting workers...");

  await initializeDatabase();
  const workers = createWorkers();
  await scheduleReEngagementSweep();

  console.info(
    `Started ${workers.length} worker(s): ${workers.map((w) => w.name).join(", ")}`,
  );

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.info(`\nReceived ${signal}, shutting down workers...`);
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Workers failed to start:", err);
  process.exit(1);
});

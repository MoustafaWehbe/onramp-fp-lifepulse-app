import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@starter-kit/shared";
import { processEmailJob } from "../jobs/email.job";
import { processEmbeddingsJob } from "../jobs/embeddings.job";
import { processReminderJob } from "../jobs/reminders.job";
import { processReEngagementSweepJob } from "../jobs/reengagement.job";

export function createWorkers(): Worker[] {
  const connection = getRedisConnection();

  const emailWorker = new Worker(QUEUE_NAMES.EMAIL, processEmailJob, {
    connection,
    concurrency: 10,
  });

  const embeddingsWorker = new Worker(
    QUEUE_NAMES.EMBEDDINGS,
    processEmbeddingsJob,
    {
      connection,
      concurrency: 5,
    },
  );

  const remindersWorker = new Worker(QUEUE_NAMES.REMINDERS, processReminderJob, {
    connection,
    concurrency: 5,
  });

  // Single sweep job that fans out per-user emails, so concurrency of 1 is
  // enough and keeps the frequency-cap reads free of races.
  const reengagementWorker = new Worker(
    QUEUE_NAMES.REENGAGEMENT,
    processReEngagementSweepJob,
    { connection, concurrency: 1 },
  );

  const workers = [
    emailWorker,
    embeddingsWorker,
    remindersWorker,
    reengagementWorker,
  ];

  workers.forEach((worker) => {
    worker.on("completed", (job) => {
      console.info(`[${worker.name}] Job ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[${worker.name}] Job ${job?.id} failed:`, err.message);
    });

    worker.on("error", (err) => {
      console.error(`[${worker.name}] Worker error:`, err);
    });
  });

  return workers;
}

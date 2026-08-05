// ─── Queue names ───────────────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  EMAIL: "email",
  EMBEDDINGS: "embeddings",
  REMINDERS: "reminders",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Job data shapes ───────────────────────────────────────────────────────────
export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  variables?: Record<string, string>;
}

export interface EmbeddingsJobData {
  entityId: string;
  entityType: string;
  text: string;
}

/**
 * Produced by a per-habit BullMQ Job Scheduler (see remindersQueue.upsertJobScheduler)
 * that fires at the habit's configured reminderTime/timezone. Intentionally carries
 * only the habitId — the worker re-reads the habit fresh so it always reflects the
 * latest reminder settings and check-in status instead of a stale snapshot.
 */
export interface HabitReminderJobData {
  habitId: string;
}

export type JobData = EmailJobData | EmbeddingsJobData | HabitReminderJobData;

// ─── Job result shapes ─────────────────────────────────────────────────────────
export interface EmailJobResult {
  messageId: string;
}

export interface EmbeddingsJobResult {
  dimensions: number;
}

export interface HabitReminderJobResult {
  notified: boolean;
}

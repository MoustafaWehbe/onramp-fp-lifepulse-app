// ─── Queue names ───────────────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  EMAIL: "email",
  EMBEDDINGS: "embeddings",
  REMINDERS: "reminders",
  REENGAGEMENT: "reengagement",
} as const;

// ─── Job data shapes ───────────────────────────────────────────────────────────
export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  variables?: Record<string, string>;
  /** Recipient, when known — used to append an unsubscribe link and log delivery. */
  userId?: string;
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

/** Payload for the daily sweep that looks for lapsed users. See reengagement.job.ts. */
export interface ReEngagementSweepJobData {
  /** ISO timestamp the sweep was scheduled for; present only for traceability. */
  scheduledFor?: string;
}

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

export interface ReEngagementSweepJobResult {
  scanned: number;
  notified: number;
}

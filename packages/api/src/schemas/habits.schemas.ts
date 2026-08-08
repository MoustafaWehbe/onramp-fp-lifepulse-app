import { z } from "zod";

export const HABIT_FREQUENCIES = ["daily", "weekdays", "3x", "5x", "weekly"] as const;
export const HABIT_DIFFICULTIES = ["easy", "medium", "hard"] as const;

const frequencySchema = z.enum(HABIT_FREQUENCIES, {
  errorMap: () => ({
    message: `Frequency must be one of: ${HABIT_FREQUENCIES.join(", ")}`,
  }),
});

const difficultySchema = z.enum(HABIT_DIFFICULTIES, {
  errorMap: () => ({
    message: `Difficulty must be one of: ${HABIT_DIFFICULTIES.join(", ")}`,
  }),
});

// 24-hour "HH:mm" local time, e.g. "07:30". Seconds are not accepted from clients.
const reminderTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "reminderTime must be in 24-hour HH:mm format");

// Node 20+ exposes the full IANA database via Intl.supportedValuesOf. Guarded
// defensively in case it's ever unavailable in a given runtime.
const VALID_TIMEZONES: Set<string> | null =
  typeof Intl.supportedValuesOf === "function"
    ? new Set(Intl.supportedValuesOf("timeZone"))
    : null;

const timezoneSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((tz) => !VALID_TIMEZONES || VALID_TIMEZONES.has(tz), {
    message: 'Invalid IANA timezone (e.g. "America/New_York", "Europe/Paris")',
  });

// 0=Sun..6=Sat, matching JS Date#getDay() and cron day-of-week. Only
// meaningful for "3x" / "5x" / "weekly" frequencies.
const daysOfWeekSchema = z
  .array(z.number().int().min(0).max(6))
  .min(1)
  .max(7)
  .refine((days) => new Set(days).size === days.length, {
    message: "daysOfWeek must not contain duplicates",
  });

export const createHabitSchema = z
  .object({
    areaId: z.string().uuid("Invalid area id"),
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(100, "Name must be at most 100 characters"),
    frequency: frequencySchema,
    durationMinutes: z.number().int().min(1).max(1440).optional(),
    difficulty: difficultySchema.optional(),
    notes: z
      .string()
      .trim()
      .max(500, "Notes must be at most 500 characters")
      .optional(),
    reminderEnabled: z.boolean().optional().default(false),
    reminderTime: reminderTimeSchema.optional(),
    timezone: timezoneSchema.optional(),
    daysOfWeek: daysOfWeekSchema.optional(),
  })
  .refine((body) => !body.reminderEnabled || (body.reminderTime && body.timezone), {
    message: "reminderTime and timezone are required when reminderEnabled is true",
    path: ["reminderTime"],
  });

export const updateHabitSchema = z
  .object({
    areaId: z.string().uuid("Invalid area id").optional(),
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(100, "Name must be at most 100 characters")
      .optional(),
    frequency: frequencySchema.optional(),
    durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
    difficulty: difficultySchema.nullable().optional(),
    notes: z
      .string()
      .trim()
      .max(500, "Notes must be at most 500 characters")
      .nullable()
      .optional(),
    reminderEnabled: z.boolean().optional(),
    reminderTime: reminderTimeSchema.nullable().optional(),
    timezone: timezoneSchema.nullable().optional(),
    daysOfWeek: daysOfWeekSchema.nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  });

export const habitIdParamSchema = z.object({
  id: z.string().uuid("Invalid habit id"),
});

export const listHabitsQuerySchema = z.object({
  areaId: z.string().uuid("Invalid area id").optional(),
  includeArchived: z.enum(["true", "false"]).optional(),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type ListHabitsQuery = z.infer<typeof listHabitsQuerySchema>;

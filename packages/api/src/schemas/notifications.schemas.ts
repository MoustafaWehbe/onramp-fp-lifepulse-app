import { z } from "zod";

// 24-hour "HH:mm" local time, matching the habit reminder format.
const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in 24-hour HH:mm format");

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

export const updatePreferencesSchema = z
  .object({
    emailRemindersEnabled: z.boolean().optional(),
    reengagementEnabled: z.boolean().optional(),
    quietHoursStart: timeOfDaySchema.nullable().optional(),
    quietHoursEnd: timeOfDaySchema.nullable().optional(),
    timezone: timezoneSchema.nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  })
  // A half-configured window would silently never match, so require both ends.
  .refine(
    (body) =>
      (body.quietHoursStart === undefined) === (body.quietHoursEnd === undefined) ||
      body.quietHoursStart === null ||
      body.quietHoursEnd === null,
    {
      message: "quietHoursStart and quietHoursEnd must be set together",
      path: ["quietHoursStart"],
    },
  );

export const unsubscribeQuerySchema = z.object({
  token: z.string().min(1, "token is required").max(64),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

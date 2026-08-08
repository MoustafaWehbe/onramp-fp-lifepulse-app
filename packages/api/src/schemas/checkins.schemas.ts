import { z } from "zod";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const listCheckInsQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    habitId: z.string().uuid("Invalid habit id").optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "from must be before or equal to to",
    path: ["from"],
  });

export const createCheckInSchema = z.object({
  habitId: z.string().uuid("Invalid habit id"),
  // Optional — defaults server-side to "today" in the habit's own timezone
  // (falling back to the caller's timezone, then UTC). Only pass an explicit
  // date when backfilling a past day; future dates are rejected.
  date: isoDateSchema.optional(),
});

export const checkInIdParamSchema = z.object({
  id: z.string().uuid("Invalid check-in id"),
});

export type ListCheckInsQuery = z.infer<typeof listCheckInsQuerySchema>;
export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;

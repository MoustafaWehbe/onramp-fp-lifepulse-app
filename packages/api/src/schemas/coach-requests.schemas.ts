import { z } from "zod";
import { HABIT_FREQUENCIES, HABIT_DIFFICULTIES } from "./habits.schemas";

/**
 * A coach can't be given permission to change habits they aren't allowed to
 * see. Applied to every path that writes the grant so the two flags can never
 * end up in that state, whichever endpoint set them.
 */
function rejectEditWithoutView(
  data: { shareHabits: boolean; editHabits: boolean },
  ctx: z.RefinementCtx,
) {
  if (data.editHabits && !data.shareHabits) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["editHabits"],
      message: "Sharing habits is required before a coach can edit them",
    });
  }
}

export const createCoachRequestSchema = z
  .object({
    coachId: z.string().uuid(),
    shareHabits: z.boolean().default(false),
    shareProfile: z.boolean().default(false),
    editHabits: z.boolean().default(false),
  })
  .superRefine(rejectEditWithoutView);

export const updateCoachRequestStatusSchema = z.object({
  status: z.enum(["accepted", "declined"]),
});

// Every flag is required rather than optional: a partial update of a
// permission grant is ambiguous, and "what am I sharing right now" should be
// answerable from the payload alone.
export const updateSharingSchema = z
  .object({
    shareHabits: z.boolean(),
    shareProfile: z.boolean(),
    editHabits: z.boolean(),
  })
  .superRefine(rejectEditWithoutView);

/**
 * What a coach may change on a client's habit: the shape of the plan, and
 * nothing else.
 *
 * Reminders (`reminderEnabled`, `reminderTime`, `timezone`) are deliberately
 * absent — those decide when the client's phone interrupts them, which is
 * theirs to set. `areaId` is absent too: moving a habit reorganises the
 * client's own structure rather than adjusting the work.
 */
export const coachUpdateHabitSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    frequency: z.enum(HABIT_FREQUENCIES).optional(),
    daysOfWeek: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .max(7)
      .refine((days) => new Set(days).size === days.length, {
        message: "daysOfWeek must not contain duplicates",
      })
      .nullable()
      .optional(),
    durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
    difficulty: z.enum(HABIT_DIFFICULTIES).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  });

export const clientHabitParamsSchema = z.object({
  id: z.string().uuid("Invalid request id"),
  habitId: z.string().uuid("Invalid habit id"),
});

export type CoachUpdateHabitInput = z.infer<typeof coachUpdateHabitSchema>;

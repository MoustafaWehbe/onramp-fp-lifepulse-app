import { z } from "zod";

export const createCoachRequestSchema = z.object({
  coachId: z.string().uuid(),
  shareHabits: z.boolean().default(false),
  shareProfile: z.boolean().default(false),
});

export const updateCoachRequestStatusSchema = z.object({
  status: z.enum(["accepted", "declined"]),
});
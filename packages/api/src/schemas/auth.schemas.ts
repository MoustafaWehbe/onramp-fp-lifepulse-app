import { z } from "zod";

/**
 * Registration is where the two account types diverge. A coach is asked for
 * the details their directory listing needs up front — an empty listing is
 * worse than no listing, and there is no admin queue to chase them later.
 */
export const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    role: z.enum(["user", "coach"]).default("user"),
    coachingTitle: z.string().trim().min(2).max(255).optional(),
    bio: z.string().trim().max(4000).optional(),
    specialties: z
      .array(z.string().trim().min(1).max(100))
      .max(20)
      .optional(),
    yearsExperience: z.number().int().min(0).max(80).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role !== "coach") return;

    if (!data.coachingTitle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coachingTitle"],
        message: "Coaching title is required for a coach account",
      });
    }
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

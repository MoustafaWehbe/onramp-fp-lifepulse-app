import { z } from "zod";

export const AREA_COLORS = [
  "health",
  "career",
  "spirit",
  "social",
  "learning",
  "creative",
  "finance",
  "family",
  "adventure",
  "rest",
] as const;

export type AreaColor = (typeof AREA_COLORS)[number];

const areaColorSchema = z.enum(AREA_COLORS, {
  errorMap: () => ({
    message: `Color must be one of: ${AREA_COLORS.join(", ")}`,
  }),
});

export const createAreaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(50, "Name must be at most 50 characters"),
  color: areaColorSchema,
  description: z
    .string()
    .trim()
    .max(300, "Description must be at most 300 characters")
    .optional(),
});

export const updateAreaSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(50, "Name must be at most 50 characters")
      .optional(),
    color: areaColorSchema.optional(),
    description: z
      .string()
      .trim()
      .max(300, "Description must be at most 300 characters")
      .nullable()
      .optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  });

export const areaIdParamSchema = z.object({
  id: z.string().uuid("Invalid area id"),
});

export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;

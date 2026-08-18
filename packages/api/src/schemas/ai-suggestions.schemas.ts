import { z } from "zod";

export const suggestionIdParamSchema = z.object({
  id: z.string().uuid("Invalid suggestion id"),
});

export type SuggestionIdParam = z.infer<typeof suggestionIdParamSchema>;

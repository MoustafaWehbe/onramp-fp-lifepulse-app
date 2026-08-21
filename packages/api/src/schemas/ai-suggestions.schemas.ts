import { z } from "zod";

export const suggestionIdParamSchema = z.object({
  id: z.string().uuid("Invalid suggestion id"),
});

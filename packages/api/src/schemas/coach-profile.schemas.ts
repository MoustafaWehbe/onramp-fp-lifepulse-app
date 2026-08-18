import { z } from "zod";

export const updateCoachProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(255).optional(),
  coachingTitle: z.string().trim().min(1).max(255).optional(),
  bio: z.string().trim().min(1).max(4000).optional(),
  specialties: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  yearsExperience: z.number().int().min(0).max(80).optional(),
});

export const createCredentialSchema = z.object({
  name: z.string().trim().min(1).max(255),
  issuer: z.string().trim().min(1).max(255).optional(),
});
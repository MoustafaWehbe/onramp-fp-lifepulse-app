import { z } from "zod";

export const updateUserRoleSchema = z.object({
  role: z.enum(["user", "coach", "admin"]),
});

export const updateCoachVerificationSchema = z.object({
  verificationStatus: z.enum(["pending", "verified", "rejected"]),
});

export const updateCredentialVerificationSchema = z.object({
  verified: z.boolean(),
});
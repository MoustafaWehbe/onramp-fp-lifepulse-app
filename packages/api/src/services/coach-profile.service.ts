import { CoachProfile, CoachCredential } from "../models";
import { createError } from "../middleware/error-handler";

interface UpdateProfileInput {
  coachingTitle?: string;
  bio?: string;
  specialties?: string[];
  yearsExperience?: number;
}

interface CreateCredentialInput {
  name: string;
  issuer?: string;
}

export class CoachProfileService {
  /**
   * Every user promoted to the "coach" role gets a CoachProfile row created
   * for them by the admin promotion flow (see admin.service.ts). This is a
   * defensive fallback only — it should never actually need to create one.
   */
  private async findOwnProfileOrThrow(userId: string) {
    const profile = await CoachProfile.findOne({
      where: { userId },
      include: [{ model: CoachCredential, as: "credentials" }],
    });

    if (!profile) {
      throw createError(
        "Coach profile not found. Contact an admin if you believe this is an error.",
        404,
      );
    }

    return profile;
  }

  async getMyProfile(userId: string) {
    return this.findOwnProfileOrThrow(userId);
  }

  async updateMyProfile(userId: string, input: UpdateProfileInput) {
    const profile = await this.findOwnProfileOrThrow(userId);

    await profile.update(input);

    // Editing profile details doesn't require re-verification — the coach's
    // account-level credibility (verificationStatus) is about their
    // credentials, not their bio copy. Return the fresh profile.
    return this.findOwnProfileOrThrow(userId);
  }

  async addCredential(userId: string, input: CreateCredentialInput) {
    const profile = await this.findOwnProfileOrThrow(userId);

    await CoachCredential.create({
      coachProfileId: profile.id,
      name: input.name,
      issuer: input.issuer,
      // Self-reported credentials start unverified. An admin confirms them
      // independently (see admin.service.ts#updateCredentialVerification).
      verified: false,
    });

    return this.findOwnProfileOrThrow(userId);
  }

  async removeCredential(userId: string, credentialId: string) {
    const profile = await this.findOwnProfileOrThrow(userId);

    const credential = await CoachCredential.findOne({
      where: { id: credentialId, coachProfileId: profile.id },
    });

    if (!credential) {
      throw createError("Credential not found", 404);
    }

    await credential.destroy();

    return this.findOwnProfileOrThrow(userId);
  }
}

export const coachProfileService = new CoachProfileService();
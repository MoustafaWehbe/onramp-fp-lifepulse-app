import { CoachProfile, CoachCredential, User } from "../models";
import { createError } from "../middleware/error-handler";

interface UpdateProfileInput {
  displayName?: string;
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
   * Coach accounts get their profile row at registration (see
   * auth.service.ts#register). Accounts that predate that flow, or that were
   * created before the coach role existed, are healed here rather than left
   * with an unusable profile page — there is no admin to fix them by hand.
   */
  private async findOwnProfileOrThrow(userId: string) {
    const existing = await CoachProfile.findOne({
      where: { userId },
      include: [{ model: CoachCredential, as: "credentials" }],
    });

    if (existing) return existing;

    const user = await User.findByPk(userId);
    if (!user || user.role !== "coach") {
      throw createError("Coach profile not found", 404);
    }

    await CoachProfile.findOrCreate({
      where: { userId },
      defaults: { userId, displayName: user.name, specialties: [] },
    });

    const created = await CoachProfile.findOne({
      where: { userId },
      include: [{ model: CoachCredential, as: "credentials" }],
    });

    if (!created) throw createError("Coach profile not found", 404);
    return created;
  }

  async getMyProfile(userId: string) {
    return this.findOwnProfileOrThrow(userId);
  }

  async updateMyProfile(userId: string, input: UpdateProfileInput) {
    const profile = await this.findOwnProfileOrThrow(userId);

    await profile.update(input);

    return this.findOwnProfileOrThrow(userId);
  }

  async addCredential(userId: string, input: CreateCredentialInput) {
    const profile = await this.findOwnProfileOrThrow(userId);

    // Credentials are self-reported and shown to users as such; nothing here
    // claims they were checked by anyone.
    await CoachCredential.create({
      coachProfileId: profile.id,
      name: input.name,
      issuer: input.issuer,
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

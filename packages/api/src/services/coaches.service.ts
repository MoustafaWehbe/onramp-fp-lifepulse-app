import { CoachProfile, CoachCredential, User } from "../models";
import { createError } from "../middleware/error-handler";

/**
 * `name` is what the coach chose to be known as professionally, falling back
 * to their account name so a card is never blank. `displayName` is returned
 * alongside it because the directory and the profile page both need to know
 * whether the coach actually set one.
 */
function serializeCoach(profile: CoachProfile) {
  const accountName = profile.user?.name ?? "";

  return {
    id: profile.userId,
    name: profile.displayName?.trim() || accountName,
    displayName: profile.displayName ?? null,
    coachingTitle: profile.coachingTitle ?? null,
    bio: profile.bio ?? null,
    specialties: profile.specialties ?? [],
    yearsExperience: profile.yearsExperience ?? null,
    credentials: (profile.credentials ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer ?? null,
    })),
  };
}

const directoryInclude = [
  { model: User, as: "user", attributes: ["id", "name"] },
  { model: CoachCredential, as: "credentials" },
];

export class CoachesService {
  /**
   * Every coach account is listed. Verification used to gate this, but it
   * required an admin to act and there is no admin role any more — the gate
   * would simply have hidden every coach forever.
   */
  async listCoaches() {
    const profiles = await CoachProfile.findAll({
      include: directoryInclude,
      order: [["createdAt", "DESC"]],
    });

    return profiles.map(serializeCoach);
  }

  async getCoach(userId: string) {
    const profile = await CoachProfile.findOne({
      where: { userId },
      include: directoryInclude,
    });

    if (!profile) {
      throw createError("Coach not found", 404);
    }

    return serializeCoach(profile);
  }
}

export const coachesService = new CoachesService();

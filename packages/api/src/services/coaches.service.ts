import { CoachProfile, CoachCredential, User } from "../models";
import { createError } from "../middleware/error-handler";


function serializeCoach(profile: CoachProfile) {
  return {
    id: profile.userId,
    name: profile.displayName ?? "",
    coachingTitle: profile.coachingTitle ?? null,
    bio: profile.bio ?? null,
    specialties: profile.specialties,
    yearsExperience: profile.yearsExperience ?? null,
    credentials: (profile.credentials ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer ?? null,
      verified: c.verified,
    })),
  };
}

export class CoachesService {
  async listCoaches() {
    const profiles = await CoachProfile.findAll({
      where: { verificationStatus: "verified" },
      include: [
        { model: User, as: "user", attributes: ["id", "name"] },
        { model: CoachCredential, as: "credentials" },
      ],
      order: [["createdAt", "DESC"]],
    });

    return profiles.map(serializeCoach);
  }

  async getCoach(userId: string) {
    const profile = await CoachProfile.findOne({
      where: { userId, verificationStatus: "verified" },
      include: [
        { model: User, as: "user", attributes: ["id", "name"] },
        { model: CoachCredential, as: "credentials" },
      ],
    });

    if (!profile) {
      throw createError("Coach not found", 404);
    }

    return serializeCoach(profile);
  }
}

export const coachesService = new CoachesService();
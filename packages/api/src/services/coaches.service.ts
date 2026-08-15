import { User, UserProfile } from "../models";

export class CoachesService {
  async listCoaches() {
    const coaches = await User.findAll({
      where: { role: "coach" },
      attributes: ["id", "name"],
      include: [
        {
          model: UserProfile,
          as: "profile",
          attributes: ["profession", "industry"],
        },
      ],
    });
    return coaches.map((c) => ({
      id: c.id,
      name: c.name,
      profession: c.profile?.profession ?? null,
      industry: c.profile?.industry ?? null,
    }));
  }
}

export const coachesService = new CoachesService();
import { User } from "../models";
import { createError } from "../middleware/error-handler";
import type { UserRole } from "@starter-kit/shared";
import { CoachProfile, CoachCredential } from "../models";
import type { CoachVerificationStatus } from "@starter-kit/shared";

export class AdminService {
  async listUsers() {
    const users = await User.findAll({
      attributes: ["id", "email", "name", "role", "createdAt"],
      order: [["createdAt", "DESC"]],
    });
    return users;
  }

async updateUserRole(userId: string, role: UserRole) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw createError("User not found", 404);
  }

  await user.update({ role });

  if (role === "coach") {
    await CoachProfile.findOrCreate({
      where: { userId: user.id },
      defaults: {
        userId: user.id,
        specialties: [],
        verificationStatus: "pending",
      },
    });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}


async listCoachApplicants(status?: CoachVerificationStatus) {
  return CoachProfile.findAll({
    where: status ? { verificationStatus: status } : {},
    include: [
     
      { model: CoachCredential, as: "credentials" },
    ],
    order: [["createdAt", "ASC"]],
  });
}

async updateCoachVerification(
  userId: string,
  verificationStatus: CoachVerificationStatus,
) {
  const profile = await CoachProfile.findOne({ where: { userId } });

  if (!profile) {
    throw createError("Coach profile not found", 404);
  }

  await profile.update({ verificationStatus });
  return profile;
}

async updateCredentialVerification(credentialId: string, verified: boolean) {
  const credential = await CoachCredential.findByPk(credentialId);

  if (!credential) {
    throw createError("Credential not found", 404);
  }

  await credential.update({ verified });
  return credential;
}
}

export const adminService = new AdminService();
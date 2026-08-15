import { User } from "../models";
import { createError } from "../middleware/error-handler";
import type { UserRole } from "@starter-kit/shared";

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
    if (!user) throw createError("User not found", 404);
    await user.update({ role });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}

export const adminService = new AdminService();
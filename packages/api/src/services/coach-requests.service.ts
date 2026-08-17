import { CoachClientRequest, User } from "../models";
import { createError } from "../middleware/error-handler";

interface CreateInput {
  coachId: string;
  shareHabits: boolean;
  shareProfile: boolean;
}

export class CoachRequestsService {
  async createRequest(requesterId: string, input: CreateInput) {
    const coach = await User.findByPk(input.coachId);
    if (!coach || coach.role !== "coach") {
      throw createError("Coach not found", 404);
    }
    if (input.coachId === requesterId) {
      throw createError("Cannot request coaching from yourself", 422);
    }

    const existing = await CoachClientRequest.findOne({
      where: { requesterId, coachId: input.coachId },
    });
    if (existing) {

      await existing.update({
        status: "pending",
        shareHabits: input.shareHabits,
        shareProfile: input.shareProfile,
      });
      return existing;
    }

    return CoachClientRequest.create({
      requesterId,
      coachId: input.coachId,
      shareHabits: input.shareHabits,
      shareProfile: input.shareProfile,
    });
  }

  async listSent(requesterId: string) {
    return CoachClientRequest.findAll({
      where: { requesterId },
      include: [{ model: User, as: "coach", attributes: ["id", "name"] }],
      order: [["createdAt", "DESC"]],
    });
  }

  async listReceived(coachId: string) {
    return CoachClientRequest.findAll({
      where: { coachId },
      include: [
        { model: User, as: "requester", attributes: ["id", "name", "email"] },
      ],
      order: [["createdAt", "DESC"]],
    });
  }

  async updateStatus(
    requestId: string,
    coachId: string,
    status: "accepted" | "declined",
  ) {
    const request = await CoachClientRequest.findByPk(requestId);
    if (!request) throw createError("Request not found", 404);
   
    if (request.coachId !== coachId) {
      throw createError("Insufficient permissions", 403);
    }
    if (request.status !== "pending") {
      throw createError("Request has already been responded to", 422);
    }
    await request.update({ status });
    return request;
  }
}

export const coachRequestsService = new CoachRequestsService();
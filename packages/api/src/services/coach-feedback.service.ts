import { CoachClientRequest, CoachFeedback, User } from "../models";
import { createError } from "../middleware/error-handler";

export class CoachFeedbackService {
  private async assertParticipant(requestId: string, userId: string) {
    const request = await CoachClientRequest.findByPk(requestId);
    if (!request) throw createError("Request not found", 404);
    if (request.coachId !== userId && request.requesterId !== userId) {
      throw createError("Insufficient permissions", 403);
    }
    return request;
  }

  async addFeedback(requestId: string, coachId: string, body: string) {
    const request = await this.assertParticipant(requestId, coachId);
    if (request.coachId !== coachId) {
      throw createError("Only the assigned coach can leave feedback", 403);
    }
    if (request.status !== "accepted") {
      throw createError("Request has not been accepted", 403);
    }
    return CoachFeedback.create({ coachRequestId: requestId, coachId, body });
  }

  async listFeedback(requestId: string, userId: string) {
    await this.assertParticipant(requestId, userId);
    return CoachFeedback.findAll({
      where: { coachRequestId: requestId },
      include: [{ model: User, as: "coach", attributes: ["id", "name"] }],
      order: [["createdAt", "ASC"]],
    });
  }
}

export const coachFeedbackService = new CoachFeedbackService();
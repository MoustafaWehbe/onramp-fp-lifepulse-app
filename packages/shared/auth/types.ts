/**
 * Two roles only. A "user" cultivates their own life areas and habits; a
 * "coach" is invited by users to see what those users choose to share and to
 * leave feedback. There is deliberately no admin role — nothing in the product
 * needs one, and an unused privileged role is a standing liability.
 */
export type UserRole = "user" | "coach";

export const USER_ROLES = ["user", "coach"] as const;

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

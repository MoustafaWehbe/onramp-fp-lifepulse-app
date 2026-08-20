export type UserRole = "user" | "coach";

/**
 * Coaches get a deliberately small app: their client work and their own
 * profile. Everything else in KULTIVAR — areas, habits, check-ins, progress —
 * belongs to the person being coached, so a coach has no data to put there and
 * no reason to see it.
 */
export const COACH_ROUTES = ["/coaching", "/profile"] as const;

export function isCoach(role: string | undefined): boolean {
  return role === "coach";
}

/** Where a signed-in account lands: their home screen, not a shared one. */
export function homePathFor(role: string | undefined): string {
  return isCoach(role) ? "/coaching" : "/dashboard";
}

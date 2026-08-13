export type AgeRange = "18-24" | "25-34" | "35-44" | "45-54" | "55+";

export type EducationLevel =
  | "high_school"
  | "associate"
  | "bachelor"
  | "master"
  | "doctorate"
  | "other";

export type LivingSituation = "apartment" | "house" | "dormitory" | "other";

export type EnergyPattern = "morning" | "afternoon" | "evening";

export type StressBaseline = "low" | "medium" | "high";

export type WorkloadIntensity = "low" | "medium" | "high";

export type MotivationDriver =
  | "achievement"
  | "health"
  | "family"
  | "financial_freedom"
  | "other";

export type HabitFrequency = "daily" | "weekdays" | "3x" | "5x" | "weekly";

export type HabitDifficulty = "easy" | "medium" | "hard";

export type AiSuggestionStatus = "pending" | "accepted" | "dismissed";

export type NotificationChannel = "push" | "email";

/**
 * Rungs on the re-engagement ladder, keyed by days of inactivity. Stored in
 * notification_logs so a user only ever receives each rung once per lapse.
 */
export type NotificationType =
  | "reengagement_3d"
  | "reengagement_7d"
  | "reengagement_14d"
  | "reengagement_30d";

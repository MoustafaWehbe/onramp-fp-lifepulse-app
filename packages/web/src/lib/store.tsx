export type { AreaColor } from "./area-colors";
export { AREA_COLOR_MAP } from "./area-colors";

export type Frequency = "daily" | "weekdays" | "3x" | "5x" | "weekly";

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


export interface Profile {
  name: string;
  email: string;
  ageRange?: AgeRange;
  profession?: string;
  industry?: string;
  educationLevel?: EducationLevel;
  livingSituation?: LivingSituation;
  lifestyleTypes?: string[];
  stressSources?: string[];
  dailyFreeTime?: number;
  energyPattern?: EnergyPattern;
  stressBaseline?: StressBaseline;
  workloadIntensity?: WorkloadIntensity;
  motivationDriver?: MotivationDriver;
  failureResponse?: string;
  topValues?: string[];
  identityStatements?: string[];
  badHabits?: string[];
  goals: string[];
  stressLevel?: number;
  sleepHours?: number;
  onboarded: boolean;
}

/**
 * Formats a Date as YYYY-MM-DD using the browser's *local* calendar day
 * (not UTC). This matches the API's "today", which is computed from the
 * habit's timezone, falling back to this same browser timezone (sent via
 * the X-Timezone header — see lib/api-client.ts). Using UTC here instead
 * would make a check-in's date briefly disagree with the API's around
 * local midnight for any timezone ahead of UTC.
 */
function localDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Calendar date as YYYY-MM-DD in the browser's local timezone. */
export const todayStr = () => localDateStr(new Date());

/** Inclusive ISO date N local-calendar days before today. */
export function daysAgoStr(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateStr(date);
}

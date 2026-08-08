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

/** Calendar date as YYYY-MM-DD in UTC (matches API check-ins "today"). */
export const todayStr = () => new Date().toISOString().slice(0, 10);

/** Inclusive ISO date N UTC days before today. */
export function daysAgoStr(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

import { z } from "zod";

const ageRangeEnum = z.enum(["18-24", "25-34", "35-44", "45-54", "55+"]);
const educationLevelEnum = z.enum([
  "high_school",
  "associate",
  "bachelor",
  "master",
  "doctorate",
  "other",
]);
const livingSituationEnum = z.enum([
  "apartment",
  "house",
  "dormitory",
  "other",
]);
const energyPatternEnum = z.enum(["morning", "afternoon", "evening"]);
const stressBaselineEnum = z.enum(["low", "medium", "high"]);
const workloadIntensityEnum = z.enum(["low", "medium", "high"]);
const motivationDriverEnum = z.enum([
  "achievement",
  "health",
  "family",
  "financial_freedom",
  "other",
]);

const tagArray = z.array(z.string().min(1).max(100)).max(20);

const profileFieldsSchema = z.object({
  name: z.string().min(1).max(100).nullable().optional(),
  ageRange: ageRangeEnum.nullable().optional(),
  profession: z.string().max(255).nullable().optional(),
  industry: z.string().max(255).nullable().optional(),
  educationLevel: educationLevelEnum.nullable().optional(),
  livingSituation: livingSituationEnum.nullable().optional(),
  lifestyleTypes: tagArray.nullable().optional(),
  stressSources: tagArray.nullable().optional(),
  dailyFreeTime: z.number().int().min(0).max(1440).nullable().optional(),
  energyPattern: energyPatternEnum.nullable().optional(),
  stressBaseline: stressBaselineEnum.nullable().optional(),
  workloadIntensity: workloadIntensityEnum.nullable().optional(),
  motivationDriver: motivationDriverEnum.nullable().optional(),
  failureResponse: z.string().max(1000).nullable().optional(),
  topValues: tagArray.nullable().optional(),
  identityStatements: tagArray.nullable().optional(),
  badHabits: tagArray.nullable().optional(),
  stressLevel: z.number().int().min(1).max(10).nullable().optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  goals: z.array(z.string().min(1).max(200)).max(20).nullable().optional(),
});

export const updateProfileSchema = profileFieldsSchema;

export const onboardingSchema = profileFieldsSchema.extend({
  goals: z.array(z.string().min(1).max(200)).min(1).max(20),
});
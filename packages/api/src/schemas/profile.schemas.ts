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
  name: z.string().min(1).max(100).optional(),
  ageRange: ageRangeEnum.optional(),
  profession: z.string().max(255).optional(),
  industry: z.string().max(255).optional(),
  educationLevel: educationLevelEnum.optional(),
  livingSituation: livingSituationEnum.optional(),
  lifestyleTypes: tagArray.optional(),
  stressSources: tagArray.optional(),
  dailyFreeTime: z.number().int().min(0).max(1440).optional(),
  energyPattern: energyPatternEnum.optional(),
  stressBaseline: stressBaselineEnum.optional(),
  workloadIntensity: workloadIntensityEnum.optional(),
  motivationDriver: motivationDriverEnum.optional(),
  failureResponse: z.string().max(1000).optional(),
  topValues: tagArray.optional(),
  identityStatements: tagArray.optional(),
  badHabits: tagArray.optional(),
  stressLevel: z.number().int().min(1).max(10).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  goals: z.array(z.string().min(1).max(200)).max(20).optional(),
});

export const updateProfileSchema = profileFieldsSchema;

export const onboardingSchema = profileFieldsSchema.extend({
  goals: z.array(z.string().min(1).max(200)).min(1).max(20),
});
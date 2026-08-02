import type {
  AgeRange,
  EducationLevel,
  LivingSituation,
  EnergyPattern,
  StressBaseline,
  WorkloadIntensity,
  MotivationDriver,
} from "@starter-kit/shared";
import { User, UserProfile, Goal } from "../models";
import { createError } from "../middleware/error-handler";

interface ProfileFieldsInput {
  name?: string;
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
  stressLevel?: number;
  sleepHours?: number;
  goals?: string[];
}
// Frontend sends goal *labels* (e.g. "Focus & Clarity"), not slugs — matches
// what Onboarding.tsx/Profile.tsx actually send. Resolve each label to a Goal
// row, and fail loudly if any label doesn't match a seeded goal, since a
// silent skip would let a typo'd goal disappear without the user noticing.
async function resolveGoalsByLabel(labels: string[]) {
  const goals = await Goal.findAll({ where: { label: labels } });
  const found = new Set(goals.map((g) => g.label));
  const missing = labels.filter((l) => !found.has(l));
  if (missing.length > 0) {
    throw createError(`Unknown goal(s): ${missing.join(", ")}`, 422);
  }
  return goals;
}

function serializeProfile(user: User, profile: UserProfile | null, goalLabels: string[]) {
  return {
    name: user.name,
    email: user.email,
    ageRange: profile?.ageRange,
    profession: profile?.profession,
    industry: profile?.industry,
    educationLevel: profile?.educationLevel,
    livingSituation: profile?.livingSituation,
    lifestyleTypes: profile?.lifestyleTypes ?? [],
    stressSources: profile?.stressSources ?? [],
    dailyFreeTime: profile?.dailyFreeTime,
    energyPattern: profile?.energyPattern,
    stressBaseline: profile?.stressBaseline,
    workloadIntensity: profile?.workloadIntensity,
    motivationDriver: profile?.motivationDriver,
    failureResponse: profile?.failureResponse,
    topValues: profile?.topValues ?? [],
    identityStatements: profile?.identityStatements ?? [],
    badHabits: profile?.badHabits ?? [],
    stressLevel: profile?.stressLevel,
    sleepHours: profile?.sleepHours,
    goals: goalLabels,
    onboarded: profile?.onboarded ?? false,
  };
}

export class ProfileService {
  async getProfile(userId: string) {
    const user = await User.findByPk(userId);
    if (!user) throw createError("User not found", 404);

    const profile = await UserProfile.findOne({ where: { userId } });
    const goals = await user.getGoals();

    return serializeProfile(user, profile, goals.map((g) => g.label));
  }

  private async upsertProfileRow(userId: string, data: ProfileFieldsInput, forceOnboarded?: boolean) {
    const {
      name,
      goals: goalLabels,
      ...profileFields
    } = data;

    if (name) {
      await User.update({ name }, { where: { id: userId } });
    }

    const [profile] = await UserProfile.findOrCreate({
      where: { userId },
      defaults: { userId, onboarded: false },
    });

    await profile.update({
      ...profileFields,
      ...(forceOnboarded !== undefined && { onboarded: forceOnboarded }),
    });

    if (goalLabels) {
      const user = await User.findByPk(userId);
      const goalRecords = await resolveGoalsByLabel(goalLabels);
      await user!.setGoals(goalRecords);
    }

    return profile;
  }

  async updateProfile(userId: string, data: ProfileFieldsInput) {
    await this.upsertProfileRow(userId, data);
    return this.getProfile(userId);
  }

  async completeOnboarding(userId: string, data: ProfileFieldsInput) {
    await this.upsertProfileRow(userId, data, true);
    return this.getProfile(userId);
  }
}

export const profileService = new ProfileService();
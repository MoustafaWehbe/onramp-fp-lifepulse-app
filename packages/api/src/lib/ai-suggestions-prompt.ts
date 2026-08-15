import { z } from "zod";
import { HABIT_FREQUENCIES, HABIT_DIFFICULTIES } from "../schemas/habits.schemas";

/**
 * Response shape the model must return. Fields the model has nothing useful
 * to say about (duration, difficulty) are `.nullable()` rather than
 * `.optional()` — OpenAI's Structured Outputs strict mode requires every
 * property to be present, so "not applicable" is expressed as `null`
 * instead of omission.
 */
export const suggestionResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      areaId: z.string().uuid(),
      suggestedName: z.string().min(1).max(100),
      frequency: z.enum(HABIT_FREQUENCIES),
      durationMinutes: z.number().int().min(1).max(1440).nullable(),
      difficulty: z.enum(HABIT_DIFFICULTIES).nullable(),
      rationale: z
        .string()
        .min(1)
        .max(140)
        .describe(
          "One short sentence tying this specific habit back to the user's own profile/goals data.",
        ),
    }),
  ),
});

export type SuggestionResponse = z.infer<typeof suggestionResponseSchema>;

/** Plain chat message shape — structurally compatible with the OpenAI SDK's
 * `ChatCompletionMessageParam` without needing `openai` as a direct
 * dependency of this package (it's only a transitive dep via @starter-kit/shared). */
export interface PromptMessage {
  role: "system" | "user";
  content: string;
}

export interface SuggestionProfileContext {
  ageRange?: string | null;
  energyPattern?: string | null;
  stressBaseline?: string | null;
  stressLevel?: number | null;
  sleepHours?: number | null;
  workloadIntensity?: string | null;
  motivationDriver?: string | null;
  dailyFreeTime?: number | null;
  topValues?: string[] | null;
  badHabits?: string[] | null;
  goals: string[];
}

export interface SuggestionAreaContext {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  existingHabitNames: string[];
  recentlyDismissedNames: string[];
}

export const SUGGESTIONS_PER_AREA = 2;

/** Renders only the profile fields that are actually present. This is what
 * lets the onboarding/profile form shrink later without ever touching the
 * prompt: fields that go away just stop appearing in this list instead of
 * requiring a code change. */
function describeProfile(profile: SuggestionProfileContext): string {
  const lines: string[] = [];
  if (profile.goals.length > 0) lines.push(`- Goals: ${profile.goals.join(", ")}`);
  if (profile.ageRange) lines.push(`- Age range: ${profile.ageRange}`);
  if (profile.energyPattern) lines.push(`- Highest-energy time of day: ${profile.energyPattern}`);
  if (profile.stressBaseline) lines.push(`- Typical stress level: ${profile.stressBaseline}`);
  if (profile.stressLevel != null) lines.push(`- Self-rated stress (1-10): ${profile.stressLevel}`);
  if (profile.sleepHours != null) lines.push(`- Average sleep: ${profile.sleepHours}h/night`);
  if (profile.workloadIntensity) lines.push(`- Workload intensity: ${profile.workloadIntensity}`);
  if (profile.motivationDriver) lines.push(`- Primary motivation: ${profile.motivationDriver}`);
  if (profile.dailyFreeTime != null) lines.push(`- Free time per day: ${profile.dailyFreeTime} minutes`);
  if (profile.topValues && profile.topValues.length > 0)
    lines.push(`- Top values: ${profile.topValues.join(", ")}`);
  if (profile.badHabits && profile.badHabits.length > 0)
    lines.push(`- Habits they're trying to move away from: ${profile.badHabits.join(", ")}`);

  return lines.length > 0
    ? lines.join("\n")
    : "- No profile details provided yet — keep suggestions broadly approachable.";
}

function describeArea(area: SuggestionAreaContext): string {
  const parts = [`Area: "${area.name}" (id: ${area.id}, theme: ${area.color})`];
  if (area.description) parts.push(`  Description: ${area.description}`);
  parts.push(
    area.existingHabitNames.length > 0
      ? `  Already tracking: ${area.existingHabitNames.join(", ")} — do not suggest near-duplicates of these.`
      : "  No habits tracked in this area yet.",
  );
  if (area.recentlyDismissedNames.length > 0) {
    parts.push(
      `  Previously suggested and dismissed by the user, do not repeat: ${area.recentlyDismissedNames.join(", ")}`,
    );
  }
  return parts.join("\n");
}

export function buildSuggestionMessages(
  profile: SuggestionProfileContext,
  areas: SuggestionAreaContext[],
): PromptMessage[] {
  const system: PromptMessage = {
    role: "system",
    content:
      "You are a habit-design assistant inside a life-tracking app called Kultivar. " +
      "Given a user's profile and a set of life areas they've created, propose small, " +
      "concrete, specific daily/weekly habits — never vague advice like \"be healthier\". " +
      "Each suggestion must clearly connect to something in the user's actual data via " +
      "its rationale. Prefer habits that fit the user's stated free time, energy pattern, " +
      "and workload rather than generic best practices.",
  };

  const user: PromptMessage = {
    role: "user",
    content: [
      "User profile:",
      describeProfile(profile),
      "",
      `Suggest exactly ${SUGGESTIONS_PER_AREA} habits for EACH of the following life areas ` +
        `(so ${SUGGESTIONS_PER_AREA * areas.length} suggestions total, ${SUGGESTIONS_PER_AREA} per area):`,
      "",
      areas.map(describeArea).join("\n\n"),
    ].join("\n"),
  };

  return [system, user];
}

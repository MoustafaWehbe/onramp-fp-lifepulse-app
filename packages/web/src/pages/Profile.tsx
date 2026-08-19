import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  type Profile as ProfileType,
  type AgeRange,
  type EducationLevel,
  type LivingSituation,
  type EnergyPattern,
  type StressBaseline,
  type WorkloadIntensity,
  type MotivationDriver,
} from "@/lib/store";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useGoals } from "@/hooks/useGoals";
import { areaTokens } from "@/lib/area-colors";
import { useAuth } from "@/hooks/useAuth";
import { isCoach } from "@/lib/roles";
import { CoachAccount } from "@/pages/CoachAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PillSelect, TagInput } from "@/components/profile-fields";
import { NotificationSettings } from "@/components/notification-settings";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import axios from "axios";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AGE_RANGE_OPTIONS: { value: AgeRange; label: string }[] = [
  { value: "18-24", label: "18–24" },
  { value: "25-34", label: "25–34" },
  { value: "35-44", label: "35–44" },
  { value: "45-54", label: "45–54" },
  { value: "55+", label: "55+" },
];
const EDUCATION_OPTIONS: { value: EducationLevel; label: string }[] = [
  { value: "high_school", label: "High school" },
  { value: "associate", label: "Associate degree" },
  { value: "bachelor", label: "Bachelor's" },
  { value: "master", label: "Master's" },
  { value: "doctorate", label: "Doctorate" },
  { value: "other", label: "Other" },
];
const LIVING_OPTIONS: { value: LivingSituation; label: string }[] = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "dormitory", label: "Dormitory" },
  { value: "other", label: "Other" },
];
const ENERGY_OPTIONS: { value: EnergyPattern; label: string }[] = [
  { value: "morning", label: "Morning person" },
  { value: "afternoon", label: "Afternoon peak" },
  { value: "evening", label: "Night owl" },
];
const STRESS_BASELINE_OPTIONS: { value: StressBaseline; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const WORKLOAD_OPTIONS: { value: WorkloadIntensity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const MOTIVATION_OPTIONS: { value: MotivationDriver; label: string }[] = [
  { value: "achievement", label: "Achievement" },
  { value: "health", label: "Health" },
  { value: "family", label: "Family" },
  { value: "financial_freedom", label: "Financial freedom" },
  { value: "other", label: "Other" },
];

export function ProfilePage() {
  const { user } = useAuth();
  const coach = isCoach(user?.role);
  // A coach's "profile" is their public directory listing, not a life-areas
  // questionnaire — same route, different account.
  const { data: profile, isPending, isError } = useProfile({ enabled: !coach });

  if (coach) return <CoachAccount />;

  if (isPending) {
    return (
      <AppShell>
        <PageHeader eyebrow="Account" title="Your profile." />
        <p className="text-sm text-muted-foreground">Loading your profile…</p>
      </AppShell>
    );
  }

  if (isError || !profile) {
    return (
      <AppShell>
        <PageHeader eyebrow="Account" title="Your profile." />
        <p className="text-sm text-destructive">
          Couldn't load your profile. Try refreshing the page.
        </p>
      </AppShell>
    );
  }

  return <ProfileForm initialProfile={profile} />;
}

function ProfileForm({ initialProfile }: { initialProfile: ProfileType }) {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const { data: goalCatalog } = useGoals();
  const goalLabels = goalCatalog?.map((g) => g.label) ?? [];

  const [form, setForm] = useState<ProfileType>(initialProfile);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setForm({
      ...initialProfile,
      name: user?.name ?? initialProfile.name,
      email: user?.email ?? initialProfile.email,
    });
  }, [initialProfile, user]);

  const toggleGoal = (g: string) =>
    setForm((f) => ({
      ...f,
      goals: f.goals.includes(g)
        ? f.goals.filter((x) => x !== g)
        : [...f.goals, g],
    }));

  const nameError = touched && !form.name.trim() ? "Name is required." : "";
  const emailError =
    touched && form.email && !EMAIL_RE.test(form.email)
      ? "Please enter a valid email."
      : "";

  const valid = !nameError && !emailError;

const save = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!form.name.trim() || (form.email && !EMAIL_RE.test(form.email)))
      return;
    try {
      await updateProfile.mutateAsync(form);
      toast.success("Profile updated — AI suggestions will refresh");
    } catch (err) {
      const message =
        (axios.isAxiosError(err) && err.response?.data?.error) ||
        "Couldn't save changes — please try again";
      toast.error(message);
    }
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Account" title="Your profile." />

      <form onSubmit={save} noValidate className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Avatar + name */}
              <div className="flex items-center gap-4 pb-6 border-b border-border">
                <div
                  className="grid size-16 place-items-center rounded-full bg-foreground text-background mono text-xl font-bold"
                  aria-hidden="true"
                >
                  {(form.name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{form.name || "Friend"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {form.profession || "—"}
                  </p>
                </div>
              </div>

              {/* Basic fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name" htmlFor="p-name" error={nameError} required>
                  <Input
                    id="p-name"
                    name="name"
                    autoComplete="name"
                    required
                    aria-invalid={!!nameError}
                    aria-describedby={nameError ? "p-name-err" : undefined}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="Email" htmlFor="p-email" error={emailError}>
                  <Input
                    id="p-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "p-email-err" : undefined}
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </Field>
              </div>

              <Separator />

              {/* Background */}
              <fieldset className="space-y-5">
                <legend className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Background
                </legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Profession" htmlFor="p-profession">
                    <Input
                      id="p-profession"
                      value={form.profession ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, profession: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Industry" htmlFor="p-industry">
                    <Input
                      id="p-industry"
                      value={form.industry ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, industry: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <Field label="Age range" htmlFor="p-agerange">
                  <PillSelect
                    ariaLabel="Age range"
                    options={AGE_RANGE_OPTIONS}
                    value={form.ageRange}
                    onChange={(v) => setForm({ ...form, ageRange: v })}
                  />
                </Field>
                <Field label="Education level" htmlFor="p-education">
                  <PillSelect
                    ariaLabel="Education level"
                    options={EDUCATION_OPTIONS}
                    value={form.educationLevel}
                    onChange={(v) => setForm({ ...form, educationLevel: v })}
                  />
                </Field>
                <Field label="Living situation" htmlFor="p-living">
                  <PillSelect
                    ariaLabel="Living situation"
                    options={LIVING_OPTIONS}
                    value={form.livingSituation}
                    onChange={(v) => setForm({ ...form, livingSituation: v })}
                  />
                </Field>
              </fieldset>

              <Separator />

              {/* Goals */}
              <fieldset>
                <legend className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Top goals
                </legend>
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label="Top goals"
                >
                  {goalLabels.map((g) => {
                    const on = form.goals.includes(g);
                    return (
                      <button
                        type="button"
                        key={g}
                        onClick={() => toggleGoal(g)}
                        aria-pressed={on}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${on ? "bg-foreground text-background ring-foreground" : "bg-surface ring-border hover:bg-accent"}`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <Separator />

              {/* Lifestyle */}
              <fieldset className="space-y-5">
                <legend className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Lifestyle
                </legend>
                <Field label="Lifestyle tags" htmlFor="p-lifestyle">
                  <TagInput
                    ariaLabel="Lifestyle types"
                    value={form.lifestyleTypes ?? []}
                    onChange={(v) => setForm({ ...form, lifestyleTypes: v })}
                    placeholder="e.g. remote worker, parent, athlete"
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Free time/day (minutes)" htmlFor="p-freetime">
                    <Input
                      id="p-freetime"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={600}
                      value={form.dailyFreeTime ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          dailyFreeTime: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </Field>
                  <Field label="Energy pattern" htmlFor="p-energy">
                    <PillSelect
                      ariaLabel="Energy pattern"
                      options={ENERGY_OPTIONS}
                      value={form.energyPattern}
                      onChange={(v) => setForm({ ...form, energyPattern: v })}
                    />
                  </Field>
                </div>
                <Field label="Workload intensity" htmlFor="p-workload">
                  <PillSelect
                    ariaLabel="Workload intensity"
                    options={WORKLOAD_OPTIONS}
                    value={form.workloadIntensity}
                    onChange={(v) => setForm({ ...form, workloadIntensity: v })}
                  />
                </Field>
              </fieldset>

              <Separator />

              {/* Wellbeing */}
              <fieldset className="space-y-6">
                <legend className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Wellbeing
                </legend>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <Label
                        htmlFor="p-stress"
                        className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
                      >
                        Stress level
                      </Label>
                      <span className="mono text-sm" aria-live="polite">
                        {form.stressLevel ?? 5}/10
                      </span>
                    </div>
                    <input
                      id="p-stress"
                      type="range"
                      min={1}
                      max={10}
                      value={form.stressLevel ?? 5}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          stressLevel: Number(e.target.value),
                        })
                      }
                      className="w-full accent-foreground"
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <Label
                        htmlFor="p-sleep"
                        className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
                      >
                        Sleep hours
                      </Label>
                      <span className="mono text-sm" aria-live="polite">
                        {form.sleepHours ?? 7} hrs
                      </span>
                    </div>
                    <input
                      id="p-sleep"
                      type="range"
                      min={3}
                      max={10}
                      step={0.5}
                      value={form.sleepHours ?? 7}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          sleepHours: Number(e.target.value),
                        })
                      }
                      className="w-full accent-foreground"
                    />
                  </div>
                </div>
                <Field label="Baseline stress" htmlFor="p-stressbaseline">
                  <PillSelect
                    ariaLabel="Stress baseline"
                    options={STRESS_BASELINE_OPTIONS}
                    value={form.stressBaseline}
                    onChange={(v) => setForm({ ...form, stressBaseline: v })}
                  />
                </Field>
                <Field label="What stresses you most?" htmlFor="p-stresssources">
                  <TagInput
                    ariaLabel="Stress sources"
                    value={form.stressSources ?? []}
                    onChange={(v) => setForm({ ...form, stressSources: v })}
                    placeholder="e.g. deadlines, finances, sleep"
                  />
                </Field>
              </fieldset>

              <Separator />

              {/* Motivation & identity */}
              <fieldset className="space-y-5">
                <legend className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Motivation &amp; identity
                </legend>
                <Field label="Primary motivation" htmlFor="p-motivation">
                  <PillSelect
                    ariaLabel="Motivation driver"
                    options={MOTIVATION_OPTIONS}
                    value={form.motivationDriver}
                    onChange={(v) => setForm({ ...form, motivationDriver: v })}
                  />
                </Field>
                <Field label="When you fail at a habit, you usually..." htmlFor="p-failure">
                  <textarea
                    id="p-failure"
                    value={form.failureResponse ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, failureResponse: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
                  />
                </Field>
                <Field label="Top values" htmlFor="p-values">
                  <TagInput
                    ariaLabel="Top values"
                    value={form.topValues ?? []}
                    onChange={(v) => setForm({ ...form, topValues: v })}
                    placeholder="e.g. discipline, family, growth"
                  />
                </Field>
                <Field label="How you see yourself" htmlFor="p-identity">
                  <TagInput
                    ariaLabel="Identity statements"
                    value={form.identityStatements ?? []}
                    onChange={(v) => setForm({ ...form, identityStatements: v })}
                    placeholder="e.g. a runner, a builder"
                  />
                </Field>
                <Field label="Habits you're trying to break" htmlFor="p-badhabits">
                  <TagInput
                    ariaLabel="Bad habits"
                    value={form.badHabits ?? []}
                    onChange={(v) => setForm({ ...form, badHabits: v })}
                    placeholder="e.g. doomscrolling, skipping breakfast"
                  />
                </Field>
              </fieldset>
            </CardContent>

            <CardFooter className="justify-end border-t border-border pt-4">
              <Button type="submit" disabled={!valid}>
                Save changes
              </Button>
            </CardFooter>
          </Card>
        </div>

        <aside className="space-y-8">
          <div>
            <h2 className="mb-4 mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Reminders
            </h2>
            <NotificationSettings />
          </div>

          <div>
            <h2 className="mb-4 mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              AI integration
            </h2>
            <Card className="bg-foreground p-6 text-background">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles
                  className={`size-4 ${areaTokens.spirit.text}`}
                  aria-hidden="true"
                />
                <span className="mono text-[10px] uppercase tracking-widest text-background/60">
                  Coming soon
                </span>
              </div>
              <h3 className="text-base font-bold">
                Personalised recommendations
              </h3>
              <p className="mt-2 text-sm text-background/70">
                When the AI engine is enabled, updating your stress level, sleep,
                or goals will refresh habit suggestions for every life area
                automatically.
              </p>
            </Card>
          </div>
        </aside>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <Label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
      >
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p
          id={`${htmlFor}-err`}
          className="mt-1 text-xs text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
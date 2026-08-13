import { useNavigate } from "react-router-dom";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import {
  type AgeRange,
  type EducationLevel,
  type LivingSituation,
  type EnergyPattern,
  type StressBaseline,
  type WorkloadIntensity,
  type MotivationDriver,
} from "@/lib/store";
import { useGoals } from "@/hooks/useGoals";
import { useCompleteOnboarding } from "@/hooks/useProfile";
import { AREA_PRESETS, areaTokens } from "@/lib/area-colors";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { PillSelect, TagInput } from "@/components/profile-fields";
import { toast } from "sonner";


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

export function Onboarding() {
  const navigate = useNavigate();
  const createArea = useCreateArea();
  const { data: goalCatalog, isLoading: goalsLoading } = useGoals();
  const completeOnboarding = useCompleteOnboarding();
  const goalLabels = goalCatalog?.map((g) => g.label) ?? [];
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  const [name, setName] = useState(user?.name ?? "");

  const [ageRange, setAgeRange] = useState<AgeRange | undefined>();
  const [profession, setProfession] = useState("");
  const [industry, setIndustry] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel | undefined>();
  const [livingSituation, setLivingSituation] = useState<LivingSituation | undefined>();

  const [goals, setGoals] = useState<string[]>([]);

  const [lifestyleTypes, setLifestyleTypes] = useState<string[]>([]);
  const [dailyFreeTime, setDailyFreeTime] = useState<number | "">("");
  const [energyPattern, setEnergyPattern] = useState<EnergyPattern | undefined>();
  const [workloadIntensity, setWorkloadIntensity] = useState<WorkloadIntensity | undefined>();

  const [stress, setStress] = useState(5);
  const [sleep, setSleep] = useState(7);
  const [stressBaseline, setStressBaseline] = useState<StressBaseline | undefined>();
  const [stressSources, setStressSources] = useState<string[]>([]);


  const [motivationDriver, setMotivationDriver] = useState<MotivationDriver | undefined>();
  const [failureResponse, setFailureResponse] = useState("");
  const [topValues, setTopValues] = useState<string[]>([]);
  const [identityStatements, setIdentityStatements] = useState<string[]>([]);
  const [badHabits, setBadHabits] = useState<string[]>([]);

  const [selectedAreas, setSelectedAreas] = useState<string[]>([
    "Health",
    "Career",
    "Mind",
  ]);
  const [touched, setTouched] = useState(false);

  const steps = [
    "You",
    "Background",
    "Goals",
    "Lifestyle",
    "Wellbeing",
    "Motivation",
    "Areas",
  ];
  const total = steps.length;

  const toggleGoal = (g: string) =>
    setGoals((cur) =>
      cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g],
    );
  const toggleArea = (n: string) =>
    setSelectedAreas((cur) =>
      cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n],
    );

  const nameError =
    touched && step === 0 && name.trim().length === 0
      ? "Please enter your name."
      : "";

  const goalsError =
    touched && step === 2 && goals.length === 0
      ? "Pick at least one goal."
      : "";
  const areasError =
    touched && step === 6 && selectedAreas.length === 0
      ? "Choose at least one life area."
      : "";

  const finish = async () => {
   try {
     await completeOnboarding.mutateAsync({
      name: name.trim() || user?.name || "Friend",
      ageRange,
      profession: profession.trim() || undefined,
      industry: industry.trim() || undefined,
      educationLevel,
      livingSituation,
      lifestyleTypes,
      dailyFreeTime: typeof dailyFreeTime === "number" ? dailyFreeTime : undefined,
      energyPattern,
      workloadIntensity,
      stressLevel: stress,
      sleepHours: sleep,
      stressBaseline,
      stressSources,
      motivationDriver,
      failureResponse: failureResponse.trim() || undefined,
      topValues,
      identityStatements,
      badHabits,
      goals,
      
    });
    await Promise.all(
      AREA_PRESETS.filter((a) => selectedAreas.includes(a.name)).map((a) =>
        createArea.mutateAsync({ name: a.name, color: a.color, description: "" }),
      ),
    );
     toast.success("Welcome to your garden");
     navigate("/dashboard");
   } catch {
     toast.error("Couldn't save your profile — please try again");
   }
  };

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 2) return goals.length > 0;
    if (step === 6) return selectedAreas.length > 0;
    return true;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canNext()) return;
    setTouched(false);
    if (step < total - 1) setStep((s) => s + 1);
    else await finish();
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="grid size-7 place-items-center rounded-md bg-foreground text-background"
              aria-hidden="true"
            >
              <span className="mono text-[11px] font-bold">K</span>
            </div>
            <span className="text-base font-extrabold tracking-tight">
              KULTIVAR
            </span>
          </div>
          <span
            className="mono text-[10px] uppercase tracking-widest text-muted-foreground"
            aria-live="polite"
          >
            Step {step + 1} of {total}
          </span>
        </div>

        <div
          className="mb-12 flex gap-1.5"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step + 1}
          aria-label={`Onboarding progress: step ${step + 1} of ${total}`}
        >
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-foreground" : "bg-border"}`}
            />
          ))}
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="rounded-3xl bg-card p-8 ring-1 ring-black/5 lg:p-12"
        >
          {step === 0 && (
            <fieldset className="max-w-lg border-0 p-0">
              <legend className="text-3xl font-extrabold tracking-tight">
                First, the basics.
              </legend>
              <p className="mt-2 text-muted-foreground">
                So we can address you properly and shape recommendations to your
                context.
              </p>
              <div className="mt-8 space-y-5">
                <Field label="Name" htmlFor="ob-name" error={nameError} required>
                  <input
                    id="ob-name"
                    name="name"
                    autoComplete="given-name"
                    required
                    aria-invalid={!!nameError}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Elena Rivers"
                    className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
                  />
                </Field>
                {/* <Field label="Age" htmlFor="ob-age" error={ageError}>
                  <input
                    id="ob-age"
                    name="age"
                    type="number"
                    inputMode="numeric"
                    min={13}
                    max={120}
                    aria-invalid={!!ageError}
                    value={age}
                    onChange={(e) =>
                      setAge(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="31"
                    className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
                  />
                </Field> */}
                {/* <Field label="Job title" htmlFor="ob-job">
                  <input
                    id="ob-job"
                    name="jobTitle"
                    autoComplete="organization-title"
                    value={job}
                    onChange={(e) => setJob(e.target.value)}
                    placeholder="Senior Designer"
                    className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
                  />
                </Field> */}
              </div>
            </fieldset>
          )}

          {step === 1 && (
            <fieldset className="max-w-lg border-0 p-0">
              <legend className="text-3xl font-extrabold tracking-tight">
                A bit more background.
              </legend>
              <p className="mt-2 text-muted-foreground">
                Helps the AI calibrate suggestions to your life stage and
                context. All optional.
              </p>
              <div className="mt-8 space-y-6">
                <Field label="Age range" htmlFor="ob-agerange">
                  <PillSelect
                    ariaLabel="Age range"
                    options={AGE_RANGE_OPTIONS}
                    value={ageRange}
                    onChange={setAgeRange}
                  />
                </Field>
                <Field label="Profession" htmlFor="ob-profession">
                  <input
                    id="ob-profession"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Product Designer"
                    className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
                  />
                </Field>
                <Field label="Industry" htmlFor="ob-industry">
                  <input
                    id="ob-industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Software"
                    className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
                  />
                </Field>
                <Field label="Education level" htmlFor="ob-education">
                  <PillSelect
                    ariaLabel="Education level"
                    options={EDUCATION_OPTIONS}
                    value={educationLevel}
                    onChange={setEducationLevel}
                  />
                </Field>
                <Field label="Living situation" htmlFor="ob-living">
                  <PillSelect
                    ariaLabel="Living situation"
                    options={LIVING_OPTIONS}
                    value={livingSituation}
                    onChange={setLivingSituation}
                  />
                </Field>
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset className="border-0 p-0">
              <legend className="text-3xl font-extrabold tracking-tight">
                What are you working toward?
              </legend>
              <p className="mt-2 text-muted-foreground">
                Pick a few. The AI will use these to suggest habits.
              </p>
             {goalsLoading ? (
              <p className="mt-8 text-sm text-muted-foreground">Loading goals…</p>
             ) : (
              <div
                className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-3"
                role="group"
                aria-label="Goals"
              >
                {goalLabels.map((g) => {
                  const on = goals.includes(g);
                  return (
                    <button
                      type="button"
                      key={g}
                      onClick={() => toggleGoal(g)}
                      aria-pressed={on}
                      className={`flex items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-medium ring-1 transition-colors ${on ? "bg-foreground text-background ring-foreground" : "bg-surface ring-border hover:bg-accent"}`}
                    >
                      <span>{g}</span>
                      {on && <Check className="size-4" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              )}
              {goalsError && (
                <p className="mt-3 text-xs text-destructive" role="alert">
                  {goalsError}
                </p>
              )}
            </fieldset>
          )}

          {step === 3 && (
            <fieldset className="max-w-lg border-0 p-0">
              <legend className="text-3xl font-extrabold tracking-tight">
                Your day-to-day.
              </legend>
              <p className="mt-2 text-muted-foreground">
                Lifestyle shapes which habits are realistic for you.
              </p>
              <div className="mt-8 space-y-6">
                <Field label="Lifestyle" htmlFor="ob-lifestyle">
                  <TagInput
                    ariaLabel="Lifestyle types"
                    value={lifestyleTypes}
                    onChange={setLifestyleTypes}
                    placeholder="e.g. remote worker, parent, athlete"
                  />
                </Field>
                <Field label="Free time per day (minutes)" htmlFor="ob-freetime">
                  <input
                    id="ob-freetime"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={600}
                    value={dailyFreeTime}
                    onChange={(e) =>
                      setDailyFreeTime(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="60"
                    className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
                  />
                </Field>
                <Field label="Energy pattern" htmlFor="ob-energy">
                  <PillSelect
                    ariaLabel="Energy pattern"
                    options={ENERGY_OPTIONS}
                    value={energyPattern}
                    onChange={setEnergyPattern}
                  />
                </Field>
                <Field label="Workload intensity" htmlFor="ob-workload">
                  <PillSelect
                    ariaLabel="Workload intensity"
                    options={WORKLOAD_OPTIONS}
                    value={workloadIntensity}
                    onChange={setWorkloadIntensity}
                  />
                </Field>
              </div>
            </fieldset>
          )}

          {step === 4 && (
            <fieldset className="max-w-lg border-0 p-0">
              <legend className="text-3xl font-extrabold tracking-tight">
                A quick wellbeing check.
              </legend>
              <p className="mt-2 text-muted-foreground">
                Honest answers help the engine recommend the right interventions.
              </p>
              <div className="mt-10 space-y-10">
                <div>
                  <div className="mb-3 flex items-baseline justify-between">
                    <label htmlFor="ob-stress" className="text-sm font-medium">
                      Current stress level
                    </label>
                    <span className="mono text-sm" aria-live="polite">
                      {stress}/10
                    </span>
                  </div>
                  <input
                    id="ob-stress"
                    type="range"
                    min={1}
                    max={10}
                    value={stress}
                    onChange={(e) => setStress(Number(e.target.value))}
                    className="w-full accent-foreground"
                  />
                  <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>Calm</span>
                    <span>Overwhelmed</span>
                  </div>
                </div>
                <div>
                  <div className="mb-3 flex items-baseline justify-between">
                    <label htmlFor="ob-sleep" className="text-sm font-medium">
                      Average hours of sleep
                    </label>
                    <span className="mono text-sm" aria-live="polite">
                      {sleep} hrs
                    </span>
                  </div>
                  <input
                    id="ob-sleep"
                    type="range"
                    min={3}
                    max={10}
                    step={0.5}
                    value={sleep}
                    onChange={(e) => setSleep(Number(e.target.value))}
                    className="w-full accent-foreground"
                  />
                </div>
                <Field label="Baseline stress" htmlFor="ob-stressbaseline">
                  <PillSelect
                    ariaLabel="Stress baseline"
                    options={STRESS_BASELINE_OPTIONS}
                    value={stressBaseline}
                    onChange={setStressBaseline}
                  />
                </Field>
                <Field label="What stresses you most?" htmlFor="ob-stresssources">
                  <TagInput
                    ariaLabel="Stress sources"
                    value={stressSources}
                    onChange={setStressSources}
                    placeholder="e.g. deadlines, finances, sleep"
                  />
                </Field>
              </div>
            </fieldset>
          )}

          {step === 5 && (
            <fieldset className="max-w-lg border-0 p-0">
              <legend className="text-3xl font-extrabold tracking-tight">
                What drives you?
              </legend>
              <p className="mt-2 text-muted-foreground">
                This helps the AI frame suggestions in language that motivates
                you specifically.
              </p>
              <div className="mt-8 space-y-6">
                <Field label="Primary motivation" htmlFor="ob-motivation">
                  <PillSelect
                    ariaLabel="Motivation driver"
                    options={MOTIVATION_OPTIONS}
                    value={motivationDriver}
                    onChange={setMotivationDriver}
                  />
                </Field>
                <Field label="When you fail at a habit, you usually..." htmlFor="ob-failure">
                  <textarea
                    id="ob-failure"
                    value={failureResponse}
                    onChange={(e) => setFailureResponse(e.target.value)}
                    placeholder="e.g. beat myself up, shrug it off, try again the next day"
                    rows={3}
                    className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
                  />
                </Field>
                <Field label="Top values" htmlFor="ob-values">
                  <TagInput
                    ariaLabel="Top values"
                    value={topValues}
                    onChange={setTopValues}
                    placeholder="e.g. discipline, family, growth"
                  />
                </Field>
                <Field label="How you see yourself" htmlFor="ob-identity">
                  <TagInput
                    ariaLabel="Identity statements"
                    value={identityStatements}
                    onChange={setIdentityStatements}
                    placeholder="e.g. a runner, a builder"
                  />
                </Field>
                <Field label="Habits you're trying to break" htmlFor="ob-badhabits">
                  <TagInput
                    ariaLabel="Bad habits"
                    value={badHabits}
                    onChange={setBadHabits}
                    placeholder="e.g. doomscrolling, skipping breakfast"
                  />
                </Field>
              </div>
            </fieldset>
          )}

          {step === 6 && (
            <fieldset className="border-0 p-0">
              <legend className="text-3xl font-extrabold tracking-tight">
                Choose your life areas.
              </legend>
              <p className="mt-2 text-muted-foreground">
                These are the domains your habits will live in. You can add or
                rename them later.
              </p>
              <div
                className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3"
                role="group"
                aria-label="Life areas"
              >
                {AREA_PRESETS.map((a) => {
                  const on = selectedAreas.includes(a.name);
                  const t = areaTokens[a.color];
                  return (
                    <button
                      type="button"
                      key={a.name}
                      onClick={() => toggleArea(a.name)}
                      aria-pressed={on}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl p-4 text-left ring-1 transition-all",
                        on ? t.ringSolid : "ring-border hover:ring-foreground/30",
                      )}
                    >
                      <span
                        className={cn("size-3 rounded-full", t.bg)}
                        aria-hidden="true"
                      />
                      <span className="flex-1 text-sm font-medium">
                        {a.name}
                      </span>
                      {on && (
                        <Check
                          className={cn("size-4", t.text)}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              {areasError && (
                <p className="mt-3 text-xs text-destructive" role="alert">
                  {areasError}
                </p>
              )}

              <div className="mt-10 flex gap-3 rounded-2xl bg-foreground p-5 text-background">
                <Sparkles
                  className={`size-5 shrink-0 ${areaTokens.spirit.text}`}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">
                    After this, AI will suggest 3–5 habits per area.
                  </p>
                  <p className="mt-1 text-xs text-background/60">
                    Tap to accept each one. Dismiss the rest. Refreshes when
                    your profile changes.
                  </p>
                </div>
              </div>
            </fieldset>
          )}

          <div className="mt-12 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setTouched(false);
                setStep((s) => Math.max(0, s - 1));
              }}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ArrowLeft className="size-4" aria-hidden="true" /> Back
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
            >
              {step < total - 1 ? "Continue" : "Enter garden"}{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </div>
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
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
      >
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p
          id={`${htmlFor}-err`}
          className="mt-1.5 text-xs text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
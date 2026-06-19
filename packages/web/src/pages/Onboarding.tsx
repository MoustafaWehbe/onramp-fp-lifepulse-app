import { useNavigate } from "react-router-dom";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useApp, type AreaColor } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const GOALS = [
  "Focus & Clarity",
  "Physical Vitality",
  "Career Growth",
  "Better Sleep",
  "Stress Reduction",
  "Creative Mastery",
  "Stronger Relationships",
  "Learning",
];
const AREA_PRESETS: { name: string; color: AreaColor }[] = [
  { name: "Health", color: "health" },
  { name: "Career", color: "career" },
  { name: "Mind", color: "spirit" },
  { name: "Social", color: "social" },
  { name: "Learning", color: "learning" },
  { name: "Creative", color: "creative" },
];

export function Onboarding() {
  const navigate = useNavigate();
  const { setProfile, addArea } = useApp();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name ?? "");
  const [age, setAge] = useState<number | "">("");
  const [job, setJob] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [stress, setStress] = useState(5);
  const [sleep, setSleep] = useState(7);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([
    "Health",
    "Career",
    "Mind",
  ]);
  const [touched, setTouched] = useState(false);

  const steps = ["You", "Goals", "Wellbeing", "Areas"];
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
  const ageError =
    touched && step === 0 && age !== "" && (age < 13 || age > 120)
      ? "Age must be between 13 and 120."
      : "";
  const goalsError =
    touched && step === 1 && goals.length === 0
      ? "Pick at least one goal."
      : "";
  const areasError =
    touched && step === 3 && selectedAreas.length === 0
      ? "Choose at least one life area."
      : "";

  const finish = () => {
    setProfile({
      name: name.trim() || user?.name || "Friend",
      email: user?.email ?? "you@example.com",
      age: typeof age === "number" ? age : undefined,
      jobTitle: job.trim(),
      goals,
      stressLevel: stress,
      sleepHours: sleep,
      onboarded: true,
    });
    AREA_PRESETS.filter((a) => selectedAreas.includes(a.name)).forEach((a) =>
      addArea({ name: a.name, color: a.color, description: "" }),
    );
    toast.success("Welcome to your garden");
    navigate("/dashboard");
  };

  const canNext = () => {
    if (step === 0) return name.trim().length > 0 && !ageError;
    if (step === 1) return goals.length > 0;
    if (step === 3) return selectedAreas.length > 0;
    return true;
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canNext()) return;
    setTouched(false);
    if (step < total - 1) setStep((s) => s + 1);
    else finish();
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
                    className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-foreground"
                  />
                </Field>
                <Field label="Age" htmlFor="ob-age" error={ageError}>
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
                    className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-foreground"
                  />
                </Field>
                <Field label="Job title" htmlFor="ob-job">
                  <input
                    id="ob-job"
                    name="jobTitle"
                    autoComplete="organization-title"
                    value={job}
                    onChange={(e) => setJob(e.target.value)}
                    placeholder="Senior Designer"
                    className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-foreground"
                  />
                </Field>
              </div>
            </fieldset>
          )}

          {step === 1 && (
            <fieldset className="border-0 p-0">
              <legend className="text-3xl font-extrabold tracking-tight">
                What are you working toward?
              </legend>
              <p className="mt-2 text-muted-foreground">
                Pick a few. The AI will use these to suggest habits.
              </p>
              <div
                className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-3"
                role="group"
                aria-label="Goals"
              >
                {GOALS.map((g) => {
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
              {goalsError && (
                <p className="mt-3 text-xs text-destructive" role="alert">
                  {goalsError}
                </p>
              )}
            </fieldset>
          )}

          {step === 2 && (
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
              </div>
            </fieldset>
          )}

          {step === 3 && (
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
                  return (
                    <button
                      type="button"
                      key={a.name}
                      onClick={() => toggleArea(a.name)}
                      aria-pressed={on}
                      className={`group flex items-center gap-3 rounded-xl p-4 text-left ring-1 transition-all ${on ? `ring-area-${a.color}` : "ring-border hover:ring-foreground/30"}`}
                    >
                      <span
                        className={`size-3 rounded-full bg-area-${a.color}`}
                        aria-hidden="true"
                      />
                      <span className="flex-1 text-sm font-medium">
                        {a.name}
                      </span>
                      {on && (
                        <Check
                          className={`size-4 text-area-${a.color}`}
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
                  className="size-5 shrink-0 text-area-spirit"
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

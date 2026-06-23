import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useApp } from "@/lib/store";
import { areaTokens } from "@/lib/area-colors";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { RotateCcw, Sparkles } from "lucide-react";

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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ProfilePage() {
  const { profile, setProfile, reset } = useApp();
  const { user } = useAuth();
  const [form, setForm] = useState(profile);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setForm({
      ...profile,
      name: user?.name ?? profile.name,
      email: user?.email ?? profile.email,
    });
  }, [profile, user]);

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
  const ageError =
    touched && form.age !== undefined && (form.age < 13 || form.age > 120)
      ? "Age must be 13–120."
      : "";

  const valid = !nameError && !emailError && !ageError;

  const save = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (
      !form.name.trim() ||
      (form.email && !EMAIL_RE.test(form.email)) ||
      (form.age !== undefined && (form.age < 13 || form.age > 120))
    )
      return;
    setProfile(form);
    toast.success("Profile updated — AI suggestions will refresh");
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
                    {form.jobTitle || "—"}
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
                <Field label="Age" htmlFor="p-age" error={ageError}>
                  <Input
                    id="p-age"
                    name="age"
                    type="number"
                    inputMode="numeric"
                    min={13}
                    max={120}
                    aria-invalid={!!ageError}
                    aria-describedby={ageError ? "p-age-err" : undefined}
                    value={form.age ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        age: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </Field>
                <Field label="Job title" htmlFor="p-job">
                  <Input
                    id="p-job"
                    name="jobTitle"
                    autoComplete="organization-title"
                    value={form.jobTitle ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, jobTitle: e.target.value })
                    }
                  />
                </Field>
              </div>

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
                  {GOALS.map((g) => {
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

              {/* Sliders */}
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
            </CardContent>

            <CardFooter className="justify-between border-t border-border pt-4">
              <ConfirmDialog
                title="Reset all data?"
                description="This wipes your profile, areas, habits and check-ins, and restores the demo seed data."
                confirmLabel="Reset everything"
                destructive
                onConfirm={() => {
                  reset();
                  toast("Data reset to demo seed");
                }}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    Reset all data
                  </Button>
                }
              />
              <Button type="submit" disabled={!valid}>
                Save changes
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* AI panel */}
        <aside>
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

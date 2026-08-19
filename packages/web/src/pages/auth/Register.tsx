import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../hooks/useAuth";
import { homePathFor, type UserRole } from "../../lib/roles";
import { ArrowRight, HeartHandshake, Sprout } from "lucide-react";

// Mirrors registerSchema on the API: coachingTitle is what makes a coach's
// directory card readable, so it's the one coach field worth blocking on.
const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    role: z.enum(["user", "coach"]),
    coachingTitle: z.string().max(255).optional(),
    specialties: z.string().max(500).optional(),
    yearsExperience: z.string().optional(),
    bio: z.string().max(4000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role !== "coach") return;

    if (!data.coachingTitle || data.coachingTitle.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coachingTitle"],
        message: "Tell people what you coach — this heads your profile",
      });
    }

    if (data.yearsExperience && !/^\d{1,2}$/.test(data.yearsExperience.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["yearsExperience"],
        message: "Enter a whole number of years",
      });
    }
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const ACCOUNT_TYPES: {
  value: UserRole;
  label: string;
  description: string;
  icon: typeof Sprout;
}[] = [
  {
    value: "user",
    label: "I'm here for myself",
    description: "Track life areas, build habits, and invite a coach if you want one.",
    icon: Sprout,
  },
  {
    value: "coach",
    label: "I'm a coach",
    description: "Get listed, accept clients, and review what they choose to share.",
    icon: HeartHandshake,
  },
];

const FIELD_CLASS =
  "w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground";
const LABEL_CLASS =
  "mb-2 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground";

export function Register() {
  const { register: registerUser, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "user" },
  });

  const role = watch("role");
  const isCoachSignup = role === "coach";

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);

      const specialties = data.specialties
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const years = data.yearsExperience?.trim();

      await registerUser({
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
        ...(data.role === "coach" && {
          coachingTitle: data.coachingTitle?.trim(),
          bio: data.bio?.trim() || undefined,
          specialties: specialties?.length ? specialties : undefined,
          yearsExperience: years ? Number(years) : undefined,
        }),
      });

      // Auto-login right after register so the user lands in the app instead
      // of being bounced to the login page.
      const user = await login(data.email, data.password);

      // A coach has no life areas to set up, so the onboarding questionnaire
      // would be a dead end — send them straight to their dashboard.
      navigate(user.role === "coach" ? homePathFor(user.role) : "/onboarding");
    } catch {
      setError("Registration failed. That email may already be in use.");
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="mb-10 flex items-center justify-center gap-2">
          <div
            className="grid size-8 place-items-center rounded-md bg-foreground text-background"
            aria-hidden="true"
          >
            <span className="mono text-xs font-bold">K</span>
          </div>
          <span className="text-lg font-extrabold tracking-tight">KULTIVAR</span>
        </div>

        <div className="rounded-3xl bg-card p-8 ring-1 ring-black/5">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Create an account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isCoachSignup
              ? "Set up your coaching profile so people can find you."
              : "Start cultivating the life areas that matter to you."}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            {error && (
              <p
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}

            <fieldset>
              <legend className={LABEL_CLASS}>Account type</legend>
              <input type="hidden" {...register("role")} />
              <div className="space-y-2">
                {ACCOUNT_TYPES.map((option) => {
                  const Icon = option.icon;
                  const selected = role === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setValue("role", option.value, { shouldValidate: true })
                      }
                      className={`flex w-full items-start gap-3 rounded-xl p-4 text-left ring-1 transition-colors ${
                        selected
                          ? "bg-foreground text-background ring-foreground"
                          : "bg-surface ring-border hover:bg-accent"
                      }`}
                    >
                      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-medium">
                          {option.label}
                        </span>
                        <span
                          className={`mt-0.5 block text-xs ${
                            selected ? "text-background/70" : "text-muted-foreground"
                          }`}
                        >
                          {option.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="name" className={LABEL_CLASS}>
                Name
              </label>
              <input
                id="name"
                autoComplete="name"
                placeholder="Elena Rivers"
                className={FIELD_CLASS}
                {...register("name")}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className={LABEL_CLASS}>
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={FIELD_CLASS}
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className={LABEL_CLASS}>
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                className={FIELD_CLASS}
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {isCoachSignup && (
              <div className="space-y-5 rounded-2xl bg-surface p-5 ring-1 ring-border">
                <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Your coaching profile
                </p>

                <div>
                  <label htmlFor="coachingTitle" className={LABEL_CLASS}>
                    Coaching title
                  </label>
                  <input
                    id="coachingTitle"
                    placeholder="Habit & Wellbeing Coach"
                    className={FIELD_CLASS}
                    {...register("coachingTitle")}
                  />
                  {errors.coachingTitle && (
                    <p className="mt-1.5 text-xs text-destructive">
                      {errors.coachingTitle.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="specialties" className={LABEL_CLASS}>
                    Specialties
                  </label>
                  <input
                    id="specialties"
                    placeholder="Burnout recovery, Morning routines"
                    className={FIELD_CLASS}
                    {...register("specialties")}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Separate with commas.
                  </p>
                </div>

                <div>
                  <label htmlFor="yearsExperience" className={LABEL_CLASS}>
                    Years of experience
                  </label>
                  <input
                    id="yearsExperience"
                    inputMode="numeric"
                    placeholder="5"
                    className={FIELD_CLASS}
                    {...register("yearsExperience")}
                  />
                  {errors.yearsExperience && (
                    <p className="mt-1.5 text-xs text-destructive">
                      {errors.yearsExperience.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="bio" className={LABEL_CLASS}>
                    Short bio
                  </label>
                  <textarea
                    id="bio"
                    rows={4}
                    placeholder="How you work, who you work with, what people can expect."
                    className={FIELD_CLASS}
                    {...register("bio")}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    You can edit all of this later from your profile.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-5 py-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
            >
              {isSubmitting
                ? "Creating account…"
                : isCoachSignup
                  ? "Create coach account"
                  : "Create account"}
              {!isSubmitting && <ArrowRight className="size-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-foreground hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-8 text-center">
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

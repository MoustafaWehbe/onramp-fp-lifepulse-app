import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../hooks/useAuth";
import { useApp } from "@/lib/store";
import { ArrowRight } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function Login() {
  const { login } = useAuth();
  const { setProfile } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data.email, data.password);
      setProfile({ email: data.email });
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password");
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
          <h1 className="text-2xl font-extrabold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your credentials to access your garden.
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

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-5 py-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
              {!isSubmitting && <ArrowRight className="size-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-foreground hover:underline"
            >
              Create one
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

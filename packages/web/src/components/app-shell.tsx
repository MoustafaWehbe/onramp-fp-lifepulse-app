import { Link, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  CheckCircle2,
  BarChart3,
  User,
  Sparkles,
  Loader2,
  LogOut,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { areaTokens } from "@/lib/area-colors";
import { AreaDot } from "@/components/area/area-dot";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/today", label: "Today", icon: CheckCircle2 },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { areas, profile, hydrated } = useApp();
  const { user, logout } = useAuth();

  const displayName = user?.name ?? profile.name;
  const displayJob = profile.jobTitle;

  if (!hydrated) {
    return (
      <div
        className="grid min-h-screen place-items-center bg-surface"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span className="mono text-xs uppercase tracking-widest">
            Loading your garden…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <aside
        className="fixed left-0 top-0 hidden h-screen w-60 flex-col border-r border-border bg-background px-4 py-6 lg:flex"
        aria-label="Primary navigation"
      >
        <Link
          to="/"
          className="mb-10 flex items-center gap-2 px-2"
          aria-label="Kultivar home"
        >
          <div
            className="grid size-7 place-items-center rounded-md bg-foreground text-background"
            aria-hidden="true"
          >
            <span className="mono text-[11px] font-bold">K</span>
          </div>
          <span className="text-base font-extrabold tracking-tight">
            KULTIVAR
          </span>
        </Link>

        <nav className="space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.to ||
              (item.to !== "/dashboard" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10">
          <h2 className="mb-3 px-3 mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            My Areas
          </h2>
          {areas.length === 0 ? (
            <p className="px-3 text-xs text-muted-foreground">No areas yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {areas.map((a) => {
                const active = pathname === `/areas/${a.id}`;
                const t = areaTokens[a.color];
                return (
                  <li key={a.id}>
                    <Link
                      to={`/areas/${a.id}`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                        active
                          ? t.navItemActive
                          : cn("text-muted-foreground", t.navItemHover),
                      )}
                    >
                      <AreaDot color={a.color} className="size-2" />
                      {a.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-auto space-y-2">
          <div className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center gap-2">
              <div
                className="grid size-8 place-items-center rounded-full bg-foreground text-background mono text-xs font-bold"
                aria-hidden="true"
              >
                {displayName ? displayName[0].toUpperCase() : "?"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">
                  {displayName || "Guest"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {displayJob || user?.email || "—"}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
        <Link to="/" className="flex items-center gap-2" aria-label="Kultivar home">
          <div
            className="grid size-6 place-items-center rounded-md bg-foreground text-background"
            aria-hidden="true"
          >
            <span className="mono text-[10px] font-bold">K</span>
          </div>
          <span className="text-sm font-extrabold tracking-tight">KULTIVAR</span>
        </Link>
        <nav className="flex gap-1" aria-label="Primary">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`grid size-9 place-items-center rounded-md ${active ? "bg-accent" : "text-muted-foreground"}`}
              >
                <Icon className="size-4" aria-hidden="true" />
              </Link>
            );
          })}
        </nav>
      </header>

      <main id="main-content" className="lg:ml-60" tabIndex={-1}>
        <div className="mx-auto max-w-6xl px-6 py-10 lg:py-12">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  titleClassName,
  action,
}: {
  eyebrow?: string;
  title: string;
  titleClassName?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="mono mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            "text-4xl font-extrabold tracking-tight",
            titleClassName,
          )}
        >
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}

export function AiPanel() {
  return (
    <div className="rounded-2xl bg-foreground p-6 text-background">
      <div className="mb-4 flex items-center gap-2">
        <div
          className={`size-1.5 animate-pulse rounded-full ${areaTokens.spirit.bg}`}
          aria-hidden="true"
        />
        <span className="mono text-[10px] font-medium uppercase tracking-widest text-background/60">
          AI Synthesizer
        </span>
      </div>
      <div className="mb-4 flex items-start gap-3">
        <Sparkles
          className={`size-5 shrink-0 ${areaTokens.spirit.text}`}
          aria-hidden="true"
        />
        <div>
          <h4 className="text-base font-bold">Recommendations coming soon</h4>
          <p className="mt-1 text-sm text-background/70">
            Once enabled, Kultivar will suggest 3–5 habits per area based on
            your profile, goals, stress, and the areas you&apos;ve created.
          </p>
        </div>
      </div>
      <div className="space-y-2" aria-label="Preview of upcoming AI suggestions">
        {[
          { area: "Health", text: "20-20-20 eye breaks during deep work" },
          { area: "Career", text: "End-of-day shutdown ritual" },
          { area: "Mind", text: "Two-minute breath reset before meetings" },
        ].map((s, i) => (
          <div
            key={i}
            className="rounded-lg bg-background/5 p-3 ring-1 ring-background/10"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="mono text-[10px] uppercase tracking-wider text-background/60">
                {s.area}
              </span>
              <span className="mono text-[10px] text-background/40">
                preview
              </span>
            </div>
            <p className="text-sm">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Link, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  CheckCircle2,
  BarChart3,
  User,
  LogOut,
  HeartHandshake,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAreas } from "@/hooks/useAreas";
import { tokensFor } from "@/lib/area-colors";
import { AreaDot } from "@/components/area/area-dot";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { homePathFor, isCoach } from "@/lib/roles";
import { useWelcomeBack } from "@/hooks/useWelcomeBack";
import { WelcomeBack } from "@/components/welcome-back";
import { ReminderPopup } from "@/components/reminder-popup";
import type { ReactNode } from "react";

const userNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/today", label: "Today", icon: CheckCircle2 },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/coaching", label: "Coaching", icon: HeartHandshake },
] as const;

// A coach's whole app: their clients, and their own profile. The rest of
// KULTIVAR is about tracking your own habits, which isn't what they're here
// for — see lib/roles.ts.
const coachNav = [
  { to: "/coaching", label: "Coaching", icon: HeartHandshake },
  { to: "/profile", label: "Profile", icon: User },
] as const;

/**
 * The returning-user greeting and habit reminders. Lives in the shell rather
 * than on a single page so the greeting reaches whichever screen the user
 * lands on, and a due reminder interrupts wherever they are.
 *
 * A separate component so coach accounts don't mount it at all: both hooks
 * query check-ins and habits, which a coach has none of.
 */
function TrackingInterruptions() {
  const welcomeBack = useWelcomeBack();

  return (
    <>
      <WelcomeBack state={welcomeBack} />
      {/* Greeting first: stacking both modals on a returning user would bury it. */}
      {welcomeBack.mode !== "popup" && <ReminderPopup />}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const coach = isCoach(user?.role);
  const { data: areas = [] } = useAreas({ enabled: !coach });
  const { data: liveProfile } = useProfile({ enabled: !coach });

  const nav = coach ? coachNav : userNav;
  const home = homePathFor(user?.role);
  const displayName = user?.name ?? liveProfile?.name;
  const displayJob = coach ? "Coach" : liveProfile?.profession;

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
          to={home}
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

        {/* Life areas belong to the person doing the tracking; a coach has
            none of their own, so the section isn't rendered at all rather than
            hidden with a class. */}
        {!coach && (
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
                const t = tokensFor(a.color);
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
        )}

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
        <Link to={home} className="flex items-center gap-2" aria-label="Kultivar home">
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
        <div className="mx-auto max-w-6xl px-6 py-10 lg:py-12">
          {!coach && <TrackingInterruptions />}
          {children}
        </div>
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

import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { AreaBadge, AreaPct } from "@/components/area/area-badge";
import { AreaProgress } from "@/components/area/area-progress";
import { areaTokens, type AreaColor } from "@/lib/area-colors";

const DEMO_AREAS: {
  color: AreaColor;
  title: string;
  description: string;
  pct: number;
}[] = [
  { color: "health", title: "Health", description: "Body, energy, sleep.", pct: 72 },
  { color: "career", title: "Career", description: "Deep work and growth.", pct: 58 },
  { color: "spirit", title: "Mind", description: "Stillness, reflection.", pct: 84 },
  { color: "social", title: "Social", description: "People who matter.", pct: 41 },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-md bg-foreground text-background">
              <span className="mono text-[11px] font-bold">K</span>
            </div>
            <span className="text-base font-extrabold tracking-tight">
              KULTIVAR
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90"
            >
              Get started <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-20 lg:pt-32">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1">
            <Sparkles className={`size-3 ${areaTokens.spirit.text}`} />
            <span className="mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              AI habit recommendations
            </span>
          </div>
          <h1 className="text-balance text-5xl font-extrabold tracking-tight lg:text-7xl">
            Cultivate the life you actually want to live.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
            Most habit apps treat all habits the same — one flat checklist.
            Kultivar organises around the areas that matter to{" "}
            <em className="italic">you</em>, then uses AI to suggest the right
            habits for the life you&apos;re building.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-3 text-sm font-medium text-background hover:opacity-90"
            >
              Start cultivating <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/login"
              className="rounded-md border border-border bg-surface px-5 py-3 text-sm font-medium hover:bg-accent"
            >
              Sign in to your garden
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {DEMO_AREAS.map((a) => (
            <div
              key={a.title}
              className="rounded-2xl bg-card p-6 ring-1 ring-black/5"
            >
              <div className="mb-8 flex items-center justify-between">
                <AreaBadge color={a.color}>{a.title}</AreaBadge>
                <AreaPct value={a.pct} color={a.color} />
              </div>
              <h3 className="text-lg font-bold">{a.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {a.description}
              </p>
              <AreaProgress
                value={a.pct}
                color={a.color}
                className="mt-6 h-1"
                aria-label={`${a.title} sample completion`}
              />
            </div>
          ))}
        </div>

        <section className="mt-32 grid gap-12 lg:grid-cols-3">
          {[
            {
              n: "01",
              t: "Organise around life areas",
              d: "Create the domains that mirror how you actually think about your life. Colour-code them. Make them yours.",
            },
            {
              n: "02",
              t: "Build habits inside each area",
              d: "Each habit belongs to an area, with a target frequency and your own notes. Mark them done from a clean daily view.",
            },
            {
              n: "03",
              t: "See the bird's-eye view",
              d: "Streaks, weekly completion, per-area breakdowns — over rolling windows so you can see whether you're actually improving.",
            },
          ].map((s) => (
            <div key={s.n}>
              <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {s.n}
              </p>
              <h3 className="mt-3 text-xl font-bold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-muted-foreground">
          <span className="mono">© 2026 KULTIVAR</span>
          <span>Tend the garden of your life.</span>
        </div>
      </footer>
    </div>
  );
}

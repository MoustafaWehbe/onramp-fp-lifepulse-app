import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoach } from "@/hooks/useCoaches";

export function CoachProfile() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: coach, isPending, isError } = useCoach(id ?? "");

  if (isPending) {
    return (
      <AppShell>
        <PageHeader
        eyebrow="Coaching"
        title="Coach profile"
        />

        <div className="max-w-3xl space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-center gap-4">
                <Skeleton className="size-20 rounded-full" />

                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>

              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (isError || !coach) {
    return (
      <AppShell>
        <PageHeader
        eyebrow="Coaching"
        title="Coach profile"
        />

        <Card className="max-w-xl">
          <CardContent className="py-12 text-center">
            <HeartHandshake className="mx-auto size-10 mb-4 opacity-30" />

            <h2 className="font-semibold">Coach not found</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              This coach may no longer be available.
            </p>

            <Button
              className="mt-5"
              variant="outline"
              onClick={() => navigate("/coaching")}
            >
              Back to coaches
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const initials = coach.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const title = coach.coachingTitle || "Professional Coach";

  return (
    <AppShell>
        <PageHeader
        eyebrow="Coaching"
        title="Coach profile"
        />

      <div className="max-w-3xl space-y-6">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate("/coaching")}
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to coaches
        </button>

        {/* Profile header */}
        <Card className="overflow-hidden">
          <CardContent className="pt-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid size-20 shrink-0 place-items-center rounded-full bg-foreground text-background text-xl font-bold">
                  {initials || <UserRound className="size-8" />}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold">{coach.name}</h2>
                  </div>

                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {title}
                  </p>

                  {coach.yearsExperience != null && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {coach.yearsExperience} {coach.yearsExperience === 1 ? "year" : "years"} of experience
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={() => navigate("/coaching")}
                className="gap-2"
              >
                <HeartHandshake className="size-4" />
                Invite this coach
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Professional overview */}
        <Card>
          <CardContent className="pt-6">
            <div className="mb-5">
              <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Professional overview
              </p>

              <h3 className="mt-1 text-lg font-semibold">
                Why work with {coach.name.split(" ")[0]}?
              </h3>
            </div>

            {coach.bio ? (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{coach.bio}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                This coach hasn't added a bio yet.
              </p>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-surface p-4 ring-1 ring-border">
                <BriefcaseBusiness className="size-5 mb-3" />

                <p className="text-sm font-medium">Coaching title</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {title}
                </p>
              </div>

              <div className="rounded-xl bg-surface p-4 ring-1 ring-border">
                <Sparkles className="size-5 mb-3" />

                <p className="text-sm font-medium">Specialties</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {coach.specialties.length > 0
                    ? coach.specialties.join(", ")
                    : "Not specified"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trust section */}
        <Card>
          <CardContent className="pt-6">
            <div className="mb-5">
              <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Background
              </p>

              <h3 className="mt-1 text-lg font-semibold">
                What this coach says about their training
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Everything below is written by the coach themselves. KULTIVAR
                doesn't check credentials, so treat them the way you would a CV
                — worth asking about before you share anything.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl bg-surface p-4 ring-1 ring-border">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-border">
                  <ShieldCheck className="size-5" />
                </div>

                <div>
                  <p className="text-sm font-medium">You decide what they see</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    A coach sees nothing until you invite them and pick what to
                    share — and you can change or withdraw that at any time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-surface p-4 ring-1 ring-border">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-border">
                  <Award className="size-5" />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Self-reported credentials
                  </p>
                  {coach.credentials.length === 0 ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      No credentials have been added yet.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {coach.credentials.map((c) => (
                        <li key={c.id} className="text-xs text-foreground">
                          {c.name}
                          {c.issuer ? ` · ${c.issuer}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews placeholder */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-surface ring-1 ring-border">
                <HeartHandshake className="size-5" />
              </div>

              <div>
                <h3 className="font-semibold">Client feedback</h3>

                <p className="text-sm text-muted-foreground">
                  Feedback is private between a coach and their client — send
                  a request to start working together.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA */}
        <div className="rounded-2xl bg-foreground p-6 text-background">
          <h3 className="text-lg font-semibold">
            Ready to work with {coach.name.split(" ")[0]}?
          </h3>

          <p className="mt-1 max-w-xl text-sm text-background/70">
            Send a coaching request and choose what information you'd like to
            share with this coach.
          </p>

          <Button
            variant="secondary"
            className="mt-5 gap-2"
            onClick={() => navigate("/coaching")}
          >
            <HeartHandshake className="size-4" />
            Send coaching request
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
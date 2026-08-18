import { useState, type FormEvent } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useAuth } from "@/hooks/useAuth";
import {
  useCoaches
} from "@/hooks/useCoaches";
import {
  useSentRequests,
  useReceivedRequests,
  useCreateCoachRequest,
  useUpdateCoachRequestStatus,
  type CoachRequest,
} from "@/hooks/useCoachRequests";
import { useClientData, useFeedback, useAddFeedback } from "@/hooks/useCoachFeedback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  HeartHandshake,
  UserCheck,
  Clock,
  XCircle,
  CheckCircle2,
  ChevronRight,
  Send,
} from "lucide-react";



function StatusBadge({ status }: { status: CoachRequest["status"] }) {
  const map = {
    pending: { label: "Pending", icon: Clock, cls: "text-amber-600 bg-amber-50 ring-amber-200" },
    accepted: { label: "Accepted", icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50 ring-emerald-200" },
    declined: { label: "Declined", icon: XCircle, cls: "text-red-500 bg-red-50 ring-red-200" },
  } as const;
  const { label, icon: Icon, cls } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1", cls)}>
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}


function InviteModal({
  coachId,
  coachName,
  onClose,
}: {
  coachId: string;
  coachName: string;
  onClose: () => void;
}) {
  const [shareHabits, setShareHabits] = useState(true);
  const [shareProfile, setShareProfile] = useState(false);
  const createRequest = useCreateCoachRequest();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createRequest.mutateAsync({ coachId, shareHabits, shareProfile });
      toast.success(`Request sent to ${coachName}`);
      onClose();
    } catch {
      toast.error("Couldn't send request — please try again");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold">Invite {coachName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose what you'd like to share with your coach. You can change this later.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-3">
              {(
                [
                  {
                    key: "habits" as const,
                    label: "Habits & progress",
                    desc: "Your habits and recent completion counts",
                    value: shareHabits,
                    set: setShareHabits,
                  },
                  {
                    key: "profile" as const,
                    label: "Profile & goals",
                    desc: "Your goals, lifestyle, and motivation details",
                    value: shareProfile,
                    set: setShareProfile,
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => item.set(!item.value)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-xl p-4 text-left ring-1 transition-colors",
                    item.value
                      ? "bg-foreground text-background ring-foreground"
                      : "bg-surface ring-border hover:bg-accent",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 size-4 rounded ring-1 shrink-0 grid place-items-center",
                      item.value
                        ? "bg-background ring-background"
                        : "bg-surface ring-border",
                    )}
                  >
                    {item.value && (
                      <CheckCircle2 className="size-3 text-foreground" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className={cn("text-xs mt-0.5", item.value ? "text-background/60" : "text-muted-foreground")}>
                      {item.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createRequest.isPending}>
                {createRequest.isPending ? "Sending…" : "Send invite"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function MyFeedbackThread({ request }: { request: CoachRequest }) {
  const { data: feedback = [], isPending } = useFeedback(request.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-1">
          Notes from {request.coach?.name ?? "your coach"}
        </h3>
        <StatusBadge status={request.status} />
      </div>

      <div className="space-y-3">
        {isPending
          ? Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))
          : feedback.length === 0
          ? (
              <p className="text-sm text-muted-foreground">
                No feedback yet — your coach hasn't left any notes.
              </p>
            )
          : feedback.map((entry) => (
              <div key={entry.id} className="rounded-xl bg-surface p-4 ring-1 ring-border">
                <p className="text-sm">{entry.body}</p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {new Date(entry.createdAt).toLocaleDateString(undefined, {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </p>
              </div>
            ))}
      </div>
    </div>
  );
}

function UserCoachingView() {
  const [tab, setTab] = useState<"find" | "requests">("find");
  const [inviting, setInviting] = useState<{
  id: string;
  displayName: string;
} | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CoachRequest | null>(null);

  const { data: coaches = [], isPending: coachesLoading } = useCoaches();
  const { data: sent = [], isPending: sentLoading } = useSentRequests();

  const sentCoachIds = new Set(
    sent
      .filter((r) => r.status !== "declined")
      .map((r) => r.coachId),
  );

  /*
   * If the client selected a request, show the feedback thread.
   * This is what was missing before.
   */
  if (selectedRequest) {
    return (
      <>
        <button
          onClick={() => setSelectedRequest(null)}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronRight
            className="size-4 rotate-180"
            aria-hidden="true"
          />
          Back to requests
        </button>

        <MyFeedbackThread request={selectedRequest} />
      </>
    );
  }

  return (
    <>
      {inviting && (
       <InviteModal
        coachId={inviting.id}
        coachName={inviting.displayName}
        onClose={() => setInviting(null)}
      />
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-8 rounded-lg bg-surface p-1 w-fit ring-1 ring-border">
        {(["find", "requests"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "find"
              ? "Find a coach"
              : `My requests${
                  sent.length > 0 ? ` (${sent.length})` : ""
                }`}
          </button>
        ))}
      </div>

      {/* Find a coach */}
      {tab === "find" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coachesLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-5 space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))
          ) : coaches.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground">
              <HeartHandshake
                className="mx-auto size-10 mb-3 opacity-30"
                aria-hidden="true"
              />
              <p className="text-sm">
                No verified coaches available yet.
              </p>
            </div>
          ) : (
            coaches.map((coach) => {
              const alreadySent = sentCoachIds.has(coach.id);

              return (
                <Card key={coach.id}>
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-full bg-foreground text-background mono text-sm font-bold shrink-0">
                        {coach.displayName?.[0]?.toUpperCase() ?? "C"}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {coach.displayName}
                        </p>

                        {(coach.coachingTitle ||
                          coach.specialties?.length > 0) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {coach.coachingTitle ||
                              coach.specialties?.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    {coach.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {coach.bio}
                      </p>
                    )}

                    <Button
                      className="w-full"
                      disabled={alreadySent}
                      onClick={() =>
                        setInviting({
                          id: coach.id,
                          displayName: coach.name,
                        })
                      }
                    >
                      {alreadySent ? "Request sent" : "Invite coach"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* My requests */}
      {tab === "requests" && (
        <div className="space-y-3 max-w-2xl">
          {sentLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-5 space-y-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))
          ) : sent.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <HeartHandshake
                className="mx-auto size-10 mb-3 opacity-30"
                aria-hidden="true"
              />
              <p className="text-sm">
                You haven't invited a coach yet.
              </p>
            </div>
          ) : (
            sent.map((req) => (
              <Card
                key={req.id}
                className={cn(
                  "ring-1 ring-transparent transition-all",
                  req.status === "accepted" &&
                    "cursor-pointer hover:ring-foreground/30",
                )}
                onClick={() => {
                  /*
                   * Only accepted requests can have coach feedback.
                   */
                  if (req.status === "accepted") {
                    setSelectedRequest(req);
                  }
                }}
              >
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {req.coach?.name ?? "Coach"}
                      </p>

                      <p className="text-xs text-muted-foreground mt-1">
                        {req.status === "accepted"
                          ? "Your coach can now view the data you shared and leave feedback."
                          : req.status === "pending"
                          ? "Waiting for the coach to respond."
                          : "This request was declined."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={req.status} />

                      {req.status === "accepted" && (
                        <ChevronRight
                          className="size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </>
  );
}

function ProfileSnapshot({ profile }: { profile: Record<string, unknown> }) {
  const str = (v: unknown): string =>
    Array.isArray(v) ? v.join(", ") : String(v ?? "");

  const rows: { label: string; key: string; suffix?: string }[] = [
    { label: "Goals", key: "goals" },
    { label: "Stress", key: "stressLevel", suffix: "/10" },
    { label: "Sleep", key: "sleepHours", suffix: " hrs" },
    { label: "Motivation", key: "motivationDriver" },
    { label: "Profession", key: "profession" },
    { label: "Energy", key: "energyPattern" },
  ];

  return (
    <>
      {rows
        .filter(({ key }) => profile[key] != null)
        .map(({ label, key, suffix }) => (
          <p key={key}>
            <span className="text-muted-foreground">{label}: </span>
            {str(profile[key])}{suffix ?? ""}
          </p>
        ))}
    </>
  );
}

function ClientDetail({ request }: { request: CoachRequest }) {
  const { data, isPending } = useClientData(request.id);
  const { data: feedback = [], isPending: fbLoading } = useFeedback(request.id);
  const addFeedback = useAddFeedback(request.id);
  const [draft, setDraft] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      await addFeedback.mutateAsync(draft.trim());
      setDraft("");
      toast.success("Feedback saved");
    } catch {
      toast.error("Couldn't save feedback");
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-base font-semibold mb-1">
          {request.requester?.name ?? "Client"}
        </h3>
        <p className="text-xs text-muted-foreground">
          Sharing: {[request.shareHabits && "habits", request.shareProfile && "profile"].filter(Boolean).join(", ") || "nothing"}
        </p>
      </div>

      {/* Habits */}
      {request.shareHabits && (
        <div>
          <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            Habits — last 30 days
          </p>
          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {(data?.habits ?? []).map((h) => (
                <Card key={h.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{h.name}</p>
                      <p className="text-xs text-muted-foreground">{h.frequency}</p>
                    </div>
                    <span className="mono text-sm font-bold">{h.recentCompletions}×</span>
                  </CardContent>
                </Card>
              ))}
              {(data?.habits ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No habits recorded yet.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Profile */}
      {request.shareProfile && data?.profile && (
        <div>
          <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            Profile snapshot
          </p>
          <Card>
            <CardContent className="pt-5 space-y-2 text-sm">
                <ProfileSnapshot profile={data.profile} />
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      {/* Feedback thread */}
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
          Feedback thread
        </p>
        <div className="space-y-3 mb-4">
          {fbLoading
            ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            : feedback.length === 0
            ? <p className="text-sm text-muted-foreground">No feedback yet — add your first note below.</p>
            : feedback.map((entry) => (
                <div key={entry.id} className="rounded-xl bg-surface p-4 ring-1 ring-border">
                  <p className="text-sm">{entry.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </p>
                </div>
              ))}
        </div>
        <form onSubmit={submit} className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Leave a note for your client…"
            className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
          />
          <Button type="submit" className="w-full gap-2" disabled={!draft.trim() || addFeedback.isPending}>
            <Send className="size-3.5" aria-hidden="true" />
            {addFeedback.isPending ? "Saving…" : "Add note"}
          </Button>
        </form>
      </div>
    </div>
  );
}



function CoachView() {
  const [tab, setTab] = useState<"requests" | "clients">("requests");
  const [selectedClient, setSelectedClient] = useState<CoachRequest | null>(null);
  const { data: received = [], isPending: receivedLoading } = useReceivedRequests();
  const updateStatus = useUpdateCoachRequestStatus();

  const pending = received.filter((r) => r.status === "pending");
  const accepted = received.filter((r) => r.status === "accepted");

  const respond = async (id: string, status: "accepted" | "declined") => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success(status === "accepted" ? "Request accepted" : "Request declined");
    } catch {
      toast.error("Couldn't update request");
    }
  };

  if (selectedClient) {
    return (
      <>
        <button
          onClick={() => setSelectedClient(null)}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="size-4 rotate-180" aria-hidden="true" />
          Back to clients
        </button>
        <ClientDetail request={selectedClient} />
      </>
    );
  }

  return (
    <>
      <div className="flex gap-1 mb-8 rounded-lg bg-surface p-1 w-fit ring-1 ring-border">
        {(["requests", "clients"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "requests"
              ? `Pending${pending.length > 0 ? ` (${pending.length})` : ""}`
              : `My clients${accepted.length > 0 ? ` (${accepted.length})` : ""}`}
          </button>
        ))}
      </div>

      {tab === "requests" && (
        <div className="space-y-3 max-w-2xl">
          {receivedLoading
            ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            : pending.length === 0
            ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Clock className="mx-auto size-10 mb-3 opacity-30" aria-hidden="true" />
                  <p className="text-sm">No pending requests.</p>
                </div>
              )
            : pending.map((req) => (
                <Card key={req.id}>
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{req.requester?.name ?? "User"}</p>
                        <p className="text-xs text-muted-foreground">
                          {req.requester?.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Wants to share: {[req.shareHabits && "habits", req.shareProfile && "profile"].filter(Boolean).join(", ") || "nothing"}
                        </p>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => respond(req.id, "accepted")}
                        disabled={updateStatus.isPending}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => respond(req.id, "declined")}
                        disabled={updateStatus.isPending}
                      >
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      )}

      {tab === "clients" && (
        <div className="space-y-3 max-w-2xl">
          {accepted.length === 0
            ? (
                <div className="py-16 text-center text-muted-foreground">
                  <UserCheck className="mx-auto size-10 mb-3 opacity-30" aria-hidden="true" />
                  <p className="text-sm">No accepted clients yet.</p>
                </div>
              )
            : accepted.map((req) => (
                <Card
                  key={req.id}
                  className="cursor-pointer hover:ring-foreground/30 transition-all ring-1 ring-transparent"
                  onClick={() => setSelectedClient(req)}
                >
                  <CardContent className="pt-5 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{req.requester?.name ?? "Client"}</p>
                      <p className="text-xs text-muted-foreground">
                        Sharing: {[req.shareHabits && "habits", req.shareProfile && "profile"].filter(Boolean).join(", ") || "nothing"}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  </CardContent>
                </Card>
              ))}
        </div>
      )}
    </>
  );
}



export function CoachingPage() {
  const { user } = useAuth();
  const isCoach = user?.role === "coach";

  return (
    <AppShell>
      <PageHeader
        eyebrow="Community"
        title={isCoach ? "Coach dashboard." : "Find a coach."}
      />
      {isCoach ? <CoachView /> : <UserCoachingView />}
    </AppShell>
  );
}
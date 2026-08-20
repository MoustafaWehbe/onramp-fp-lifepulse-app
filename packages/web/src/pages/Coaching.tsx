import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useAuth } from "@/hooks/useAuth";
import { isCoach as isCoachRole } from "@/lib/roles";
import { useCoaches } from "@/hooks/useCoaches";
import {
  useSentRequests,
  useReceivedRequests,
  useCreateCoachRequest,
  useUpdateCoachRequestStatus,
  useUpdateSharing,
  useRevokeCoachRequest,
  type CoachRequest,
} from "@/hooks/useCoachRequests";
import { useFeedback } from "@/hooks/useCoachFeedback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ClientDetail } from "@/components/coaching/client-detail";
import { FeedbackThread } from "@/components/coaching/feedback-thread";
import {
  GrantEditor,
  applyGrantRules,
  sharingSummary,
  type Grant,
} from "@/components/coaching/sharing";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  HeartHandshake,
  UserCheck,
  Clock,
  XCircle,
  CheckCircle2,
  ChevronRight,
  ShieldOff,
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
  // Habits on, editing off: the useful default for a first invite is that the
  // coach can see the work without being able to rewrite it.
  const [grant, setGrant] = useState<Grant>({
    shareHabits: true,
    shareProfile: false,
    editHabits: false,
  });
  const createRequest = useCreateCoachRequest();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createRequest.mutateAsync({ coachId, ...applyGrantRules(grant) });
      toast.success(`Request sent to ${coachName}`);
      onClose();
    } catch {
      toast.error("Couldn't send request — please try again");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`Invite ${coachName}`}
    >
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold">Invite {coachName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose what you'd like to share. You can change or withdraw any of
              this later.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <GrantEditor grant={grant} onChange={setGrant} />
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

/**
 * What the coach can see and do, editable after the fact. Access is checked
 * when the coach acts, so narrowing this takes effect immediately.
 */
function SharingControls({
  request,
  onRevoked,
}: {
  request: CoachRequest;
  onRevoked: () => void;
}) {
  const [grant, setGrant] = useState<Grant>({
    shareHabits: request.shareHabits,
    shareProfile: request.shareProfile,
    editHabits: request.editHabits,
  });
  const updateSharing = useUpdateSharing();
  const revoke = useRevokeCoachRequest();

  const saved: Grant = {
    shareHabits: request.shareHabits,
    shareProfile: request.shareProfile,
    editHabits: request.editHabits,
  };
  const dirty = (Object.keys(saved) as (keyof Grant)[]).some(
    (key) => grant[key] !== saved[key],
  );
  const coachName = request.coach?.name ?? "this coach";

  const save = async () => {
    try {
      await updateSharing.mutateAsync({ id: request.id, ...applyGrantRules(grant) });
      toast.success("Sharing updated");
    } catch {
      toast.error("Couldn't update what you're sharing");
      setGrant(saved);
    }
  };

  const stopSharing = async () => {
    try {
      await revoke.mutateAsync(request.id);
      toast.success(`${coachName} no longer has access`);
      onRevoked();
    } catch {
      toast.error("Couldn't remove this coach");
    }
  };

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div>
          <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            What {coachName} can see
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Changes apply immediately.
          </p>
        </div>

        <GrantEditor grant={grant} onChange={setGrant} />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={save}
            disabled={!dirty || updateSharing.isPending}
          >
            {updateSharing.isPending ? "Saving…" : "Save changes"}
          </Button>

          <ConfirmDialog
            trigger={
              <Button size="sm" variant="ghost" className="gap-2 text-destructive">
                <ShieldOff className="size-3.5" aria-hidden="true" />
                Stop sharing
              </Button>
            }
            title={`Remove ${coachName}?`}
            description="They lose access to your data straight away, and the notes they left you are deleted with the request. You can invite them again later."
            confirmLabel="Remove coach"
            destructive
            onConfirm={stopSharing}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** The client's side of one coaching relationship. */
function MyCoachDetail({
  request,
  onRevoked,
}: {
  request: CoachRequest;
  onRevoked: () => void;
}) {
  const { data: feedback = [], isPending } = useFeedback(request.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-1">
          {request.coach?.name ?? "Your coach"}
        </h3>
        <StatusBadge status={request.status} />
      </div>

      <SharingControls request={request} onRevoked={onRevoked} />

      <div>
        <p className="mono mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          Notes & changes
        </p>
        <FeedbackThread
          entries={feedback}
          isPending={isPending}
          emptyMessage="Nothing yet — your coach hasn't left any notes or made any changes."
        />
      </div>
    </div>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronRight className="size-4 rotate-180" aria-hidden="true" />
      {label}
    </button>
  );
}

function UserCoachingView() {
  const [tab, setTab] = useState<"find" | "requests">("find");
  const [inviting, setInviting] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const { data: coaches = [], isPending: coachesLoading } = useCoaches();
  const { data: sent = [], isPending: sentLoading } = useSentRequests();

  const sentCoachIds = new Set(
    sent.filter((r) => r.status !== "declined").map((r) => r.coachId),
  );

  // Looked up by id rather than held as an object: the detail view edits
  // sharing, so a snapshot taken at click time would go stale the moment it
  // saved — and would survive a request the user just revoked.
  const selectedRequest = sent.find((r) => r.id === selectedRequestId) ?? null;

  if (selectedRequest) {
    return (
      <>
        <BackButton
          label="Back to requests"
          onClick={() => setSelectedRequestId(null)}
        />
        <MyCoachDetail
          request={selectedRequest}
          onRevoked={() => setSelectedRequestId(null)}
        />
      </>
    );
  }

  return (
    <>
      {inviting && (
        <InviteModal
          coachId={inviting.id}
          coachName={inviting.name}
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
              : `My requests${sent.length > 0 ? ` (${sent.length})` : ""}`}
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
              <p className="text-sm">No coaches have signed up yet.</p>
            </div>
          ) : (
            coaches.map((coach) => {
              const alreadySent = sentCoachIds.has(coach.id);

              return (
                <Card key={coach.id}>
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-full bg-foreground text-background mono text-sm font-bold shrink-0">
                        {coach.name?.[0]?.toUpperCase() ?? "C"}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold truncate">{coach.name}</p>

                        {(coach.coachingTitle || coach.specialties?.length > 0) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {coach.coachingTitle || coach.specialties?.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    {coach.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {coach.bio}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" asChild>
                        <Link to={`/coaches/${coach.id}`}>View profile</Link>
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={alreadySent}
                        onClick={() =>
                          setInviting({ id: coach.id, name: coach.name })
                        }
                      >
                        {alreadySent ? "Request sent" : "Invite"}
                      </Button>
                    </div>
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
              <p className="text-sm">You haven't invited a coach yet.</p>
            </div>
          ) : (
            sent.map((req) => (
              <Card
                key={req.id}
                className="ring-1 ring-transparent transition-all cursor-pointer hover:ring-foreground/30"
                // Every row opens: even a pending or declined request is a
                // standing permission grant the user should be able to review
                // and withdraw without waiting on the coach.
                onClick={() => setSelectedRequestId(req.id)}
              >
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {req.coach?.name ?? "Coach"}
                      </p>

                      <p className="text-xs text-muted-foreground mt-1">
                        {req.status === "accepted"
                          ? `Sharing ${sharingSummary(req)} — tap to change or stop.`
                          : req.status === "pending"
                            ? "Waiting for the coach to respond."
                            : "This request was declined."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={req.status} />
                      <ChevronRight
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
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

function CoachView() {
  const [tab, setTab] = useState<"requests" | "clients">("requests");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { data: received = [], isPending: receivedLoading } = useReceivedRequests();
  const updateStatus = useUpdateCoachRequestStatus();

  const pending = received.filter((r) => r.status === "pending");
  const accepted = received.filter((r) => r.status === "accepted");

  // By id, so a client narrowing their sharing mid-session is reflected here
  // rather than leaving the coach looking at a grant that no longer holds.
  const selectedClient = received.find((r) => r.id === selectedClientId) ?? null;

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
        <BackButton
          label="Back to clients"
          onClick={() => setSelectedClientId(null)}
        />
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
          {receivedLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : pending.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Clock className="mx-auto size-10 mb-3 opacity-30" aria-hidden="true" />
              <p className="text-sm">No pending requests.</p>
            </div>
          ) : (
            pending.map((req) => (
              <Card key={req.id}>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{req.requester?.name ?? "User"}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.requester?.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Wants to share: {sharingSummary(req)}
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
            ))
          )}
        </div>
      )}

      {tab === "clients" && (
        <div className="space-y-3 max-w-2xl">
          {accepted.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <UserCheck className="mx-auto size-10 mb-3 opacity-30" aria-hidden="true" />
              <p className="text-sm">No accepted clients yet.</p>
            </div>
          ) : (
            accepted.map((req) => (
              <Card
                key={req.id}
                className="cursor-pointer hover:ring-foreground/30 transition-all ring-1 ring-transparent"
                onClick={() => setSelectedClientId(req.id)}
              >
                <CardContent className="pt-5 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{req.requester?.name ?? "Client"}</p>
                    <p className="text-xs text-muted-foreground">
                      Sharing: {sharingSummary(req)}
                    </p>
                  </div>
                  <ChevronRight
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </>
  );
}

export function CoachingPage() {
  const { user } = useAuth();
  const coach = isCoachRole(user?.role);

  return (
    <AppShell>
      <PageHeader
        eyebrow={coach ? "Clients" : "Community"}
        title={coach ? "Coach dashboard." : "Find a coach."}
      />
      {coach ? <CoachView /> : <UserCoachingView />}
    </AppShell>
  );
}

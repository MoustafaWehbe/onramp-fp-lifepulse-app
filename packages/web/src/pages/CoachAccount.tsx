import { useEffect, useState, type FormEvent } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TagInput } from "@/components/profile-fields";
import { useAuth } from "@/hooks/useAuth";
import {
  useMyCoachProfile,
  useUpdateMyCoachProfile,
  useAddMyCredential,
  useRemoveMyCredential,
} from "@/hooks/useCoaches";
import { toast } from "sonner";
import { Award, Plus, Trash2 } from "lucide-react";

/**
 * The coach's own account screen, shown at /profile for coach accounts. This
 * is also their public directory listing — everything edited here is what a
 * user sees when deciding whether to invite them, which is why the page says
 * so out loud.
 */
export function CoachAccount() {
  const { data: profile, isPending, isError } = useMyCoachProfile();

  if (isPending) {
    return (
      <AppShell>
        <PageHeader eyebrow="Account" title="Your coaching profile." />
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppShell>
    );
  }

  if (isError || !profile) {
    return (
      <AppShell>
        <PageHeader eyebrow="Account" title="Your coaching profile." />
        <p className="text-sm text-destructive">
          Couldn't load your coaching profile. Try refreshing the page.
        </p>
      </AppShell>
    );
  }

  return <CoachAccountForm key={profile.id} profile={profile} />;
}

function CoachAccountForm({
  profile,
}: {
  profile: NonNullable<ReturnType<typeof useMyCoachProfile>["data"]>;
}) {
  const { user, logout } = useAuth();
  const updateProfile = useUpdateMyCoachProfile();
  const addCredential = useAddMyCredential();
  const removeCredential = useRemoveMyCredential();

  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [coachingTitle, setCoachingTitle] = useState(profile.coachingTitle ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [specialties, setSpecialties] = useState<string[]>(profile.specialties);
  const [yearsExperience, setYearsExperience] = useState(
    profile.yearsExperience?.toString() ?? "",
  );

  const [credentialName, setCredentialName] = useState("");
  const [credentialIssuer, setCredentialIssuer] = useState("");

  useEffect(() => {
    setDisplayName(profile.displayName ?? "");
    setCoachingTitle(profile.coachingTitle ?? "");
    setBio(profile.bio ?? "");
    setSpecialties(profile.specialties);
    setYearsExperience(profile.yearsExperience?.toString() ?? "");
  }, [profile]);

  const trimmedName = displayName.trim();
  const trimmedTitle = coachingTitle.trim();
  const yearsError =
    yearsExperience.trim() && !/^\d{1,2}$/.test(yearsExperience.trim())
      ? "Enter a whole number of years."
      : "";
  const nameError = trimmedName ? "" : "A display name is required.";
  const titleError = trimmedTitle ? "" : "A coaching title is required.";

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (nameError || titleError || yearsError) return;

    try {
      await updateProfile.mutateAsync({
        displayName: trimmedName,
        coachingTitle: trimmedTitle,
        // The API treats an omitted field as "leave it alone", so an empty bio
        // is sent as a single space-free fallback rather than dropped.
        ...(bio.trim() ? { bio: bio.trim() } : {}),
        specialties,
        ...(yearsExperience.trim()
          ? { yearsExperience: Number(yearsExperience.trim()) }
          : {}),
      });
      toast.success("Profile updated — this is what clients see");
    } catch {
      toast.error("Couldn't save your profile");
    }
  };

  const submitCredential = async (e: FormEvent) => {
    e.preventDefault();
    if (!credentialName.trim()) return;

    try {
      await addCredential.mutateAsync({
        name: credentialName.trim(),
        issuer: credentialIssuer.trim() || undefined,
      });
      setCredentialName("");
      setCredentialIssuer("");
      toast.success("Credential added");
    } catch {
      toast.error("Couldn't add that credential");
    }
  };

  const deleteCredential = async (id: string) => {
    try {
      await removeCredential.mutateAsync(id);
      toast.success("Credential removed");
    } catch {
      toast.error("Couldn't remove that credential");
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Account"
        title="Your coaching profile."
        action={
          <Button variant="outline" onClick={() => logout()}>
            Sign out
          </Button>
        }
      />

      <div className="max-w-2xl space-y-6">
        <p className="text-sm text-muted-foreground">
          Everything here is public: it's the card people see in the coach
          directory and the profile they read before inviting you.
        </p>

        <form onSubmit={save}>
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div>
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={user?.name ?? "Elena Rivers"}
                />
                {nameError && (
                  <p className="mt-1.5 text-xs text-destructive">{nameError}</p>
                )}
              </div>

              <div>
                <Label htmlFor="coachingTitle">Coaching title</Label>
                <Input
                  id="coachingTitle"
                  value={coachingTitle}
                  onChange={(e) => setCoachingTitle(e.target.value)}
                  placeholder="Habit & Wellbeing Coach"
                />
                {titleError && (
                  <p className="mt-1.5 text-xs text-destructive">{titleError}</p>
                )}
              </div>

              <div>
                <Label htmlFor="yearsExperience">Years of experience</Label>
                <Input
                  id="yearsExperience"
                  inputMode="numeric"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  placeholder="5"
                />
                {yearsError && (
                  <p className="mt-1.5 text-xs text-destructive">{yearsError}</p>
                )}
              </div>

              <div>
                <Label>Specialties</Label>
                <TagInput
                  value={specialties}
                  onChange={setSpecialties}
                  placeholder="Burnout recovery"
                  ariaLabel="Specialties"
                  maxTags={20}
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  rows={5}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="How you work, who you work with, what people can expect."
                  className="w-full rounded-lg bg-surface px-4 py-3 text-sm outline-hidden ring-1 ring-border focus:ring-foreground"
                />
              </div>
            </CardContent>

            <CardFooter className="justify-end gap-3">
              <Button
                type="submit"
                disabled={
                  updateProfile.isPending ||
                  Boolean(nameError || titleError || yearsError)
                }
              >
                {updateProfile.isPending ? "Saving…" : "Save profile"}
              </Button>
            </CardFooter>
          </Card>
        </form>

        <Separator />

        <Card>
          <CardContent className="space-y-5 pt-6">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Award className="size-4" aria-hidden="true" />
                Credentials
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Listed on your public profile as self-reported — KULTIVAR
                doesn't check them, and tells people so.
              </p>
            </div>

            {profile.credentials.length > 0 && (
              <ul className="space-y-2">
                {profile.credentials.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3 ring-1 ring-border"
                  >
                    <span className="min-w-0 text-sm">
                      <span className="font-medium">{c.name}</span>
                      {c.issuer && (
                        <span className="text-muted-foreground"> · {c.issuer}</span>
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${c.name}`}
                      disabled={removeCredential.isPending}
                      onClick={() => deleteCredential(c.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={submitCredential} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="credentialName">Credential</Label>
                  <Input
                    id="credentialName"
                    value={credentialName}
                    onChange={(e) => setCredentialName(e.target.value)}
                    placeholder="ICF Associate Certified Coach"
                  />
                </div>
                <div>
                  <Label htmlFor="credentialIssuer">Issuer (optional)</Label>
                  <Input
                    id="credentialIssuer"
                    value={credentialIssuer}
                    onChange={(e) => setCredentialIssuer(e.target.value)}
                    placeholder="International Coaching Federation"
                  />
                </div>
              </div>
              <Button
                type="submit"
                variant="outline"
                className="gap-2"
                disabled={!credentialName.trim() || addCredential.isPending}
              >
                <Plus className="size-4" aria-hidden="true" />
                {addCredential.isPending ? "Adding…" : "Add credential"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1 pt-6 text-sm">
            <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Sign-in
            </p>
            <p className="text-muted-foreground">{user?.email}</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

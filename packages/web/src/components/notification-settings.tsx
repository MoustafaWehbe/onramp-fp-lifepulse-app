import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import {
  useNotificationPreferences,
  useSendDemoEncouragement,
  useUpdateNotificationPreferences,
  type NotificationPreferences,
} from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.error) {
    return err.response.data.error as string;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function NotificationSettings() {
  const { data: preferences } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const sendDemo = useSendDemoEncouragement();

  const setPreference = (patch: Partial<NotificationPreferences>) => {
    updatePreferences.mutate(patch, {
      onError: (err) => toast.error(errorMessage(err, "Couldn't save that preference")),
    });
  };

  const sendEncouragement = () => {
    sendDemo.mutate(undefined, {
      onSuccess: ({ to }) => toast.success(`Encouragement email sent to ${to}`),
      onError: (err) => toast.error(errorMessage(err, "Couldn't send that email")),
    });
  };

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div>
          <h3 className="text-base font-bold">Notifications</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Reminders appear in the app while it&apos;s open, and arrive by email when
            it isn&apos;t.
          </p>
        </div>

        <div className="space-y-3">
          <ToggleRow
            label="Email reminders"
            description="A message at each habit's reminder time, unless you've already checked in."
            checked={preferences?.emailRemindersEnabled ?? true}
            disabled={!preferences || updatePreferences.isPending}
            onChange={(emailRemindersEnabled) => setPreference({ emailRemindersEnabled })}
          />
          <ToggleRow
            label="Check-in nudges"
            description="An occasional encouraging note if you've been away for a few days."
            checked={preferences?.reengagementEnabled ?? true}
            disabled={!preferences || updatePreferences.isPending}
            onChange={(reengagementEnabled) => setPreference({ reengagementEnabled })}
          />
        </div>

        {import.meta.env.DEV && (
          <>
            <Separator />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Send me the encouragement email</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Local only. Sends it now instead of waiting for 30 days away.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={sendEncouragement}
                disabled={sendDemo.isPending}
              >
                {sendDemo.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="size-3.5" aria-hidden="true" />
                )}
                Send now
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-foreground" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-background transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

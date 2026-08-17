import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useDueReminder } from "@/hooks/useDueReminders";
import { useToggleCheckIn } from "@/hooks/useCheckIns";
import { useAreas } from "@/hooks/useAreas";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Popup shown when a habit's reminder time has passed and it hasn't been
 * checked in yet. One habit at a time — stacking modals for a busy morning
 * would be unusable, and dismissing one immediately surfaces the next.
 */
export function ReminderPopup() {
  const { dueHabit, dismiss } = useDueReminder();
  const { data: areas = [] } = useAreas();
  const toggleCheckIn = useToggleCheckIn();

  if (!dueHabit) return null;

  const areaName = areas.find((a) => a.id === dueHabit.areaId)?.name;

  const checkIn = () => {
    toggleCheckIn.mutate(
      { habitId: dueHabit.id },
      {
        onSuccess: () => toast.success(`${dueHabit.name} checked in`),
        onError: () => toast.error("Couldn't check in. Please try again."),
      },
    );
    dismiss(dueHabit.id);
  };

  return (
    <AlertDialog open>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-surface ring-1 ring-border">
            <Bell className="size-4" aria-hidden="true" />
          </div>
          <AlertDialogTitle>Time for {dueHabit.name}</AlertDialogTitle>
          <AlertDialogDescription>
            {areaName ? `${areaName} · ` : ""}
            {dueHabit.reminderTime
              ? `Scheduled for ${dueHabit.reminderTime.slice(0, 5)}. `
              : ""}
            Check in now, or come back to it later today.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => dismiss(dueHabit.id)}>
            Not now
          </AlertDialogCancel>
          <AlertDialogAction onClick={checkIn} disabled={toggleCheckIn.isPending}>
            Check in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

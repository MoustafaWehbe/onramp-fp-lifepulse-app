import { Sprout, X } from "lucide-react";
import type { WelcomeBackState } from "@/hooks/useWelcomeBack";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function WelcomeBack({ state }: { state: WelcomeBackState }) {
  const { mode, heading, body, dismiss } = state;

  if (mode === "none") return null;

  if (mode === "popup") {
    return (
      <AlertDialog open>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-surface ring-1 ring-border">
              <Sprout className="size-4 text-area-health" aria-hidden="true" />
            </div>
            <AlertDialogTitle>{heading}</AlertDialogTitle>
            <AlertDialogDescription>{body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={dismiss}>Let&apos;s go</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <div className="mb-8 flex items-start gap-4 rounded-2xl bg-card p-5 ring-1 ring-black/5">
      <Sprout className="mt-0.5 size-5 shrink-0 text-area-health" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm font-medium">{heading}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss welcome back message"
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

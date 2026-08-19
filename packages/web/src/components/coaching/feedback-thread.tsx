import { PencilLine } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { FeedbackEntry } from "@/hooks/useCoachFeedback";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * The one history both sides read. Notes the coach wrote and changes they made
 * to the client's habits share a timeline deliberately — an edited habit that
 * only showed up on the client's Today screen, with no explanation and no
 * date, is exactly the surprise this thread exists to prevent.
 */
export function FeedbackThread({
  entries,
  isPending,
  emptyMessage,
}: {
  entries: FeedbackEntry[];
  isPending: boolean;
  emptyMessage: string;
}) {
  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry) => {
        const isChange = entry.kind === "habit_change";

        return (
          <li
            key={entry.id}
            className={cn(
              "rounded-xl p-4 ring-1",
              isChange
                ? "bg-surface/50 ring-dashed ring-border"
                : "bg-surface ring-border",
            )}
          >
            {isChange && (
              <p className="mono mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                <PencilLine className="size-3" aria-hidden="true" />
                Habit change
              </p>
            )}
            <p className={cn("text-sm", isChange && "text-muted-foreground")}>
              {entry.body}
            </p>
            <p className="mt-2 text-[10px] text-muted-foreground">
              {formatDate(entry.createdAt)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

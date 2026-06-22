import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { areaStyle, type AreaColor } from "@/lib/area-colors";

interface AreaProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  color: AreaColor;
}

export const AreaProgress = forwardRef<HTMLDivElement, AreaProgressProps>(
  ({ value = 0, color, className, ...props }, ref) => {
    const clamped = Math.min(100, Math.max(0, value));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-muted",
          className,
        )}
        {...props}
      >
        <div
          className="h-full transition-all"
          style={{ ...areaStyle(color), width: `${clamped}%` }}
        />
      </div>
    );
  },
);
AreaProgress.displayName = "AreaProgress";

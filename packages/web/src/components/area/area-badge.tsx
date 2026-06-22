import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { areaTokens, type AreaColor } from "@/lib/area-colors";

interface AreaBadgeProps {
  color: AreaColor;
  children: ReactNode;
  className?: string;
}

export function AreaBadge({ color, children, className }: AreaBadgeProps) {
  const t = areaTokens[color];
  return (
    <span
      className={cn(
        "mono inline-flex items-center rounded border-0 px-2 py-1 text-[10px] font-medium uppercase tracking-wider",
        t.bgSoft,
        t.text,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AreaPct({
  color,
  value,
  className,
}: {
  color: AreaColor;
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mono text-xs font-medium tabular-nums",
        areaTokens[color].text,
        className,
      )}
    >
      {value}%
    </span>
  );
}

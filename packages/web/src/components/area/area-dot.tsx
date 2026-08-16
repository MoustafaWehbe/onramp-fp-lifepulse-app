import { cn } from "@/lib/utils";
import { tokensFor, type AreaColor } from "@/lib/area-colors";

interface AreaDotProps {
  color: AreaColor;
  className?: string;
}

export function AreaDot({ color, className }: AreaDotProps) {
  return (
    <span
      className={cn("rounded-full", tokensFor(color).bg, className)}
      aria-hidden="true"
    />
  );
}

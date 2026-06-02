import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function CyberGrid({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 cyber-grid-bg",
        className,
      )}
      {...rest}
    />
  );
}

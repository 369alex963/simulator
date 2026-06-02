import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./animated-counter";
import type { ReactNode } from "react";

type StatTileProps = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  className?: string;
  accent?: boolean;
};

export function StatTile({
  label,
  value,
  prefix,
  suffix,
  decimals,
  icon,
  trend,
  trendLabel,
  className,
  accent = false,
}: StatTileProps) {
  const trendColor =
    trend === "up"   ? "text-success" :
    trend === "down" ? "text-danger"  : "text-muted";

  const trendSymbol =
    trend === "up"   ? "▲" :
    trend === "down" ? "▼" : "—";

  return (
    <div
      className={cn(
        "group relative overflow-hidden",
        "bg-surface-1 border-t-0 border border-border/80",
        "transition-all duration-200",
        "hover:-translate-y-px hover:border-primary/25 hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
        accent && "border-primary/20 bg-surface-1",
        className,
      )}
    >
      {/* Left accent bar */}
      <div
        aria-hidden
        className={cn(
          "absolute left-0 inset-y-0 w-[2px]",
          accent
            ? "bg-primary"
            : "bg-border group-hover:bg-primary/40 transition-colors duration-300",
        )}
      />

      {/* Top micro-gradient line */}
      {accent && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        />
      )}

      <div className="pl-5 pr-4 py-4 flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          {/* Label */}
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-subtle truncate">
            {label}
          </p>

          {/* Value */}
          <p
            className={cn(
              "font-display text-[2rem] leading-none font-bold tabular-nums",
              accent ? "text-primary text-glow" : "text-foreground",
            )}
          >
            <AnimatedCounter
              value={value}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
            />
          </p>

          {/* Trend indicator */}
          {trend ? (
            <p className={cn("font-mono text-[9px] flex items-center gap-1", trendColor)}>
              <span>{trendSymbol}</span>
              <span>{trendLabel ?? trend}</span>
            </p>
          ) : (
            /* Bottom border in place of trend when absent */
            <div className="h-px w-8 bg-border" />
          )}
        </div>

        {/* Icon */}
        {icon ? (
          <div
            className={cn(
              "shrink-0 flex size-9 items-center justify-center",
              "border border-border text-primary/60",
              "group-hover:border-primary/30 group-hover:text-primary transition-colors duration-200",
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

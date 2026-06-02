import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TerminalWindowProps = {
  title?: string;
  prompt?: string;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
  footer?: ReactNode;
  scanlines?: boolean;
};

export function TerminalWindow({
  title = "system://session.terminal",
  prompt = "kernelios@hq:~$",
  className,
  bodyClassName,
  children,
  footer,
  scanlines = true,
}: TerminalWindowProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        "border border-border-strong/60",
        "bg-surface-1",
        "shadow-[var(--shadow-window)]",
        /* Subtle primary inner glow on the container */
        "ring-1 ring-inset ring-primary/8",
        /* Hover: lift the inner glow slightly */
        "transition-shadow duration-300 hover:ring-primary/14",
        className,
      )}
    >
      {/* Top accent line — 2px gradient */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent z-10"
      />

      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-border/80 bg-surface-2/90 px-4 py-2.5">
        {/* Traffic-light dots */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="size-2.5 rounded-full bg-danger/75 ring-1 ring-inset ring-danger/30" />
          <span className="size-2.5 rounded-full bg-warning/75 ring-1 ring-inset ring-warning/30" />
          <span className="size-2.5 rounded-full bg-success/75 ring-1 ring-inset ring-success/30" />
        </div>

        {/* Centered title */}
        <div className="flex-1 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted select-none">
          {title}
        </div>

        {/* Right: PID badge */}
        <div className="font-mono text-[9px] tracking-widest text-subtle shrink-0 tabular-nums">
          PID 0x4F2A
        </div>
      </div>

      {/* Body */}
      <div
        className={cn(
          "relative px-5 py-5 font-mono text-sm leading-relaxed",
          bodyClassName,
        )}
      >
        {/* Optional prompt line */}
        {prompt ? (
          <div className="mb-4 flex items-center gap-2 text-primary">
            <span className="select-none text-primary/60">▶</span>
            <span>{prompt}</span>
            <span className="size-[7px] animate-blink bg-primary inline-block" />
          </div>
        ) : null}

        {children}

        {/* Scanlines overlay */}
        {scanlines ? (
          <span aria-hidden className="scanlines-overlay pointer-events-none" />
        ) : null}

        {/* Bottom vignette */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-1/60 to-transparent z-[5]"
        />
      </div>

      {/* Footer */}
      {footer ? (
        <div className="border-t border-border/70 bg-surface-2/70 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-subtle">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

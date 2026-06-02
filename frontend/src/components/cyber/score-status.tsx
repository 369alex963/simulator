"use client";

import { cn } from "@/lib/utils";

/**
 * Shared scoreboard status pill.
 *
 * Display rules:
 *   started_at == null                                  → PENDING
 *   started_at set, status != completed                 → IN PROGRESS
 *   completed + all bonus answered                      → FINISHED ★ (glow)
 *   completed + all non-bonus answered, no bonus glow   → FINISHED
 *   completed + submitted_at set, NOT all non-bonus     → DONE (partial submit)
 *   completed without submitted_at, partial             → DONE (defensive fallback)
 */
export type ScoreStatusProps = {
  status: string;
  allBonusAnswered?: boolean;
  bonusTotal?: number;
  allNonBonusAnswered?: boolean;
  isSubmitted?: boolean;
  startedAt?: string | null;
};

export function ScoreStatus({
  status,
  allBonusAnswered,
  bonusTotal,
  allNonBonusAnswered,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isSubmitted,
  startedAt,
}: ScoreStatusProps) {
  // isSubmitted is implicit via status === "completed" — accepted as a prop
  // for forward compatibility but not currently needed in the logic.
  const hasStarted = !!startedAt || status === "in_progress" || status === "completed";

  if (status === "completed") {
    // Finished with bonus glow
    if (allBonusAnswered && (bonusTotal ?? 0) > 0 && (allNonBonusAnswered ?? true)) {
      return (
        <span
          className="inline-flex items-center gap-1.5 border border-warning/60 bg-warning/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-warning"
          style={{ textShadow: "0 0 6px var(--warning), 0 0 12px var(--warning)" }}
        >
          <span className="animate-pulse">★</span>
          <span>FINISHED</span>
        </span>
      );
    }
    // Finished — all non-bonus answered (no bonus or partial bonus)
    if (allNonBonusAnswered !== false) {
      return (
        <span className="inline-flex items-center gap-1.5 border border-success/50 bg-success/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-success">
          <span>◈</span><span>FINISHED</span>
        </span>
      );
    }
    // Submitted partial (or completed without all answers)
    return (
      <span className="inline-flex items-center gap-1.5 border border-muted/50 bg-surface-2/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
        <span>◐</span><span>DONE</span>
      </span>
    );
  }

  if (status === "in_progress" || (hasStarted && status !== "registered")) {
    return (
      <span className="inline-flex items-center gap-1.5 border border-primary/50 bg-primary/8 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
        <span className="size-1.5 rounded-full bg-primary animate-pulse" />
        <span>IN PROGRESS</span>
      </span>
    );
  }

  if (status === "paused") {
    return (
      <span className="inline-flex items-center gap-1.5 border border-warning/50 bg-warning/8 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-warning">
        <span>‖</span><span>PAUSED</span>
      </span>
    );
  }

  // status === "registered" or anything else with no start
  return (
    <span className={cn("inline-flex items-center gap-1.5 border border-subtle/40 bg-surface-2/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-subtle")}>
      <span className="size-1.5 rounded-full bg-subtle/60" />
      <span>PENDING</span>
    </span>
  );
}

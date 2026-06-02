"use client";

/**
 * Operative Rank — gamified avatar that evolves as the student progresses.
 *
 * Renders an animated radial HUD with:
 *  - Rank tier name (RECRUIT → SCOUT → OPERATIVE → AGENT → SHADOW → ELITE)
 *  - Circular XP progress ring driven by % answered
 *  - Pulsing core glow that intensifies with progress
 *  - Orbiting markers — one per answered question
 *  - "PERFECT RUN" gold halo when all + bonus answered
 *
 * Pure CSS-vars for colours — automatically themed by the active brand-kit.
 */
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const RANKS = [
  { name: "RECRUIT",   threshold: 0,   color: "var(--muted)" },
  { name: "SCOUT",     threshold: 15,  color: "var(--primary)" },
  { name: "OPERATIVE", threshold: 35,  color: "var(--primary)" },
  { name: "AGENT",     threshold: 60,  color: "var(--primary-glow)" },
  { name: "SHADOW",    threshold: 85,  color: "var(--accent)" },
  { name: "ELITE",     threshold: 100, color: "var(--warning)" },
];

function rankFor(pct: number) {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (pct >= r.threshold) current = r;
  }
  return current;
}

type Props = {
  /** 0–100 — percent of non-bonus questions answered correctly */
  pct: number;
  /** Count of answered questions (for orbit markers) */
  answered: number;
  /** Total non-bonus questions */
  total: number;
  /** True when student answered EVERY bonus question too */
  perfectRun?: boolean;
  /** Whether the exam has been submitted/completed */
  isComplete?: boolean;
  size?: number;
  className?: string;
};

export function OperativeRank({
  pct, answered, total, perfectRun, isComplete, size = 220, className,
}: Props) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, pct));
  const rank = rankFor(clamped);
  const stroke = 6;
  const r = size / 2 - stroke * 2;
  const C = 2 * Math.PI * r;
  const dashOffset = C * (1 - clamped / 100);

  // Orbit markers — up to 12 visible
  const orbitMarkers = Math.min(12, Math.max(0, answered));

  return (
    <div className={cn("relative inline-block", className)} style={{ width: size, height: size }}>
      {/* Perfect-run halo */}
      {perfectRun && (
        <motion.div
          aria-hidden
          className="absolute inset-[-12px] rounded-full"
          style={{
            background: "radial-gradient(circle, color-mix(in oklab, var(--warning) 25%, transparent) 0%, transparent 65%)",
          }}
          animate={reduce ? undefined : { scale: [1, 1.07, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Orbit ring background */}
      <svg width={size} height={size} className="absolute inset-0" viewBox={`0 0 ${size} ${size}`}>
        {/* Outer faint ring */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--border)" strokeWidth="1"
          strokeDasharray="2 4"
        />
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r - 10}
          fill="none" stroke="var(--surface-3, var(--border))" strokeWidth={stroke}
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={r - 10}
          fill="none"
          stroke={perfectRun ? "var(--warning)" : rank.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: reduce ? 0 : 1.2, ease: [0.16, 1, 0.3, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            filter: clamped > 0
              ? `drop-shadow(0 0 6px ${perfectRun ? "var(--warning)" : rank.color})`
              : undefined,
          }}
        />

        {/* Orbiting markers (one per answered question) */}
        {Array.from({ length: orbitMarkers }, (_, i) => {
          const angle = (i / Math.max(orbitMarkers, 1)) * Math.PI * 2 - Math.PI / 2;
          const mr = r + 4;
          const cx = size / 2 + Math.cos(angle) * mr;
          const cy = size / 2 + Math.sin(angle) * mr;
          return (
            <motion.circle
              key={i}
              cx={cx} cy={cy} r={3.5}
              fill={perfectRun ? "var(--warning)" : "var(--primary)"}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.04, duration: 0.4 }}
              style={{
                filter: `drop-shadow(0 0 4px ${perfectRun ? "var(--warning)" : "var(--primary)"})`,
              }}
            />
          );
        })}
      </svg>

      {/* Pulsing inner core */}
      <motion.div
        aria-hidden
        className="absolute rounded-full pointer-events-none"
        style={{
          left: size / 2 - r + 16, top: size / 2 - r + 16,
          width: (r - 16) * 2, height: (r - 16) * 2,
          background: `radial-gradient(circle, ${perfectRun ? "var(--warning)" : rank.color} 0%, transparent 70%)`,
          opacity: 0.1 + (clamped / 100) * 0.25,
        }}
        animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Centre content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="font-mono text-[8px] uppercase tracking-[0.35em] text-subtle">Rank</p>
        <p
          className="font-display text-base font-black tracking-[0.1em] mt-0.5"
          style={{
            color: perfectRun ? "var(--warning)" : rank.color,
            textShadow: perfectRun
              ? "0 0 8px var(--warning), 0 0 16px var(--warning)"
              : clamped > 30 ? `0 0 6px ${rank.color}` : undefined,
          }}
        >
          {perfectRun ? "ELITE ★" : rank.name}
        </p>
        <div className="mt-1.5 flex items-baseline gap-0.5">
          <span className="font-display text-3xl font-black text-foreground tabular-nums leading-none">
            {clamped.toFixed(0)}
          </span>
          <span className="font-mono text-xs text-muted">%</span>
        </div>
        <p className="font-mono text-[9px] text-subtle mt-1 tabular-nums">
          {answered}/{total}
        </p>
        {isComplete && (
          <p className="font-mono text-[8px] uppercase tracking-[0.25em] text-success mt-1">
            {perfectRun ? "★ MISSION ★" : "MISSION COMPLETE"}
          </p>
        )}
      </div>
    </div>
  );
}

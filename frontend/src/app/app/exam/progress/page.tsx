"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { AnimatedCounter } from "@/components/cyber/animated-counter";
import { PulseDot } from "@/components/cyber/pulse-dot";
import { OperativeRank } from "@/components/cyber/operative-rank";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell,
} from "recharts";

type QuestionStat = {
  id: number;
  title: string;
  order: number;
  is_bonus: boolean;
  base_points: number;
  answered: boolean;
  attempts: number;
  hint_used: boolean;
  time_spent: number;
};

type Progress = {
  total_questions: number;
  answered: number;
  answered_non_bonus: number;
  non_bonus_total: number;
  pct_complete: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  questions: QuestionStat[];
};

const CYBER_GREEN = "var(--color-primary, #00ff88)";
const CYBER_DIM = "var(--color-border, #334155)";
const CYBER_WARN = "var(--color-warning, #f59e0b)";

function fmtTime(secs: number) {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    api.get<Progress>("/api/exam/progress/").then(setProgress).catch(() => {});
  }, []);

  if (!progress) return <p className="font-mono text-muted p-6 animate-blink">Loading...</p>;

  const pct = progress.pct_complete;
  const segments = 30;
  const filled = Math.round((pct / 100) * segments);

  // Bar chart data — time per question
  const barData = (progress.questions ?? []).map((q) => ({
    name: `Q${q.order}${q.is_bonus ? "★" : ""}`,
    time: q.time_spent,
    attempts: q.attempts,
    answered: q.answered,
  }));

  // Radar chart — performance dimensions
  const answered = progress.answered_non_bonus;
  const total = progress.non_bonus_total || 1;
  const avgAttempts = progress.questions?.length
    ? progress.questions.reduce((s, q) => s + q.attempts, 0) / progress.questions.length
    : 0;
  const hintsUsed = progress.questions?.filter((q) => q.hint_used).length ?? 0;
  const radarData = [
    { subject: "Completion", value: Math.round(pct) },
    { subject: "Accuracy", value: Math.round(answered / total * 100) },
    { subject: "Speed", value: Math.max(0, 100 - Math.min(100, avgAttempts * 20)) },
    { subject: "Independence", value: Math.max(0, 100 - (hintsUsed / (total || 1)) * 100) },
    { subject: "Bonus", value: progress.questions?.some((q) => q.is_bonus && q.answered) ? 100 : 0 },
  ];

  const statusColor =
    progress.status === "completed" ? "success"
    : progress.status === "in_progress" ? "primary"
    : "warning";

  return (
    <div className="space-y-6 animate-rise">
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Student Portal</p>
        <h1 className="font-display text-2xl font-bold text-foreground">
          MY <span className="text-primary text-glow">PROGRESS</span>
        </h1>
      </div>

      {/* Big completion meter */}
      <TerminalWindow title="system://progress.meter" prompt="student@exam:~$ status">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Operative Rank HUD — evolves with progress */}
            <div className="shrink-0">
              <OperativeRank
                pct={pct}
                answered={progress.answered_non_bonus}
                total={progress.non_bonus_total}
                perfectRun={
                  progress.answered_non_bonus === progress.non_bonus_total &&
                  progress.questions.filter(q => q.is_bonus).every(q => q.answered) &&
                  progress.questions.some(q => q.is_bonus)
                }
                isComplete={progress.status === "completed"}
                size={200}
              />
            </div>
            {/* Big percent display */}
            <div className="text-center space-y-1 shrink-0">
              <div className="font-display text-7xl font-black text-primary text-glow-strong leading-none">
                <AnimatedCounter value={pct} decimals={1} suffix="%" />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">complete</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <PulseDot color={statusColor} size="sm" />
                <span className="font-mono text-xs uppercase text-muted">{progress.status.replace("_", " ")}</span>
              </div>
            </div>

            {/* ASCII progress bar */}
            <div className="flex-1 space-y-3 w-full">
              <div className="font-mono text-base leading-relaxed">
                <span className="text-muted">[</span>
                <span className="text-primary" style={{ textShadow: "0 0 8px var(--color-primary)" }}>
                  {"█".repeat(filled)}
                </span>
                <span className="text-subtle">{"░".repeat(segments - filled)}</span>
                <span className="text-muted">]</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs">
                <div>
                  <span className="text-muted uppercase tracking-[0.15em]">Answered</span>
                  <span className="ml-2 text-primary">{progress.answered_non_bonus}/{progress.non_bonus_total}</span>
                </div>
                {progress.started_at && (
                  <div>
                    <span className="text-muted uppercase tracking-[0.15em]">Started</span>
                    <span className="ml-2 text-foreground">{new Date(progress.started_at).toLocaleTimeString()}</span>
                  </div>
                )}
                {progress.completed_at && (
                  <div>
                    <span className="text-muted uppercase tracking-[0.15em]">Completed</span>
                    <span className="ml-2 text-success">{new Date(progress.completed_at).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </TerminalWindow>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radar chart — performance profile */}
        <TerminalWindow title="system://perf.radar" prompt="">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-4">Performance Profile</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke={CYBER_DIM} />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "var(--color-muted, #64748b)", fontSize: 10, fontFamily: "monospace" }}
                />
                <Radar
                  name="You"
                  dataKey="value"
                  stroke={CYBER_GREEN}
                  fill={CYBER_GREEN}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-[10px] text-muted">
            {radarData.map((d) => (
              <div key={d.subject} className="flex justify-between">
                <span>{d.subject}</span>
                <span className={d.value >= 70 ? "text-success" : d.value >= 40 ? "text-warning" : "text-danger"}>
                  {d.value}%
                </span>
              </div>
            ))}
          </div>
        </TerminalWindow>

        {/* Time per question bar chart */}
        {barData.length > 0 && (
          <TerminalWindow title="system://time.analysis" prompt="">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-4">Time Spent Per Question (seconds)</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--color-muted, #64748b)", fontSize: 9, fontFamily: "monospace" }}
                  />
                  <YAxis tick={{ fill: "var(--color-muted, #64748b)", fontSize: 9, fontFamily: "monospace" }} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-surface-2, #1e293b)", border: "1px solid var(--color-border)", fontFamily: "monospace", fontSize: 11 }}
                    formatter={(v: unknown) => [typeof v === "number" ? fmtTime(v) : String(v ?? ""), "Time"]}
                  />
                  <Bar dataKey="time" radius={[2, 2, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.answered ? CYBER_GREEN : entry.attempts > 0 ? CYBER_WARN : CYBER_DIM}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 font-mono text-[10px]">
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-success/80 inline-block" />Answered</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-warning/80 inline-block" />Attempted</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-border inline-block" />Not started</span>
            </div>
          </TerminalWindow>
        )}
      </div>

      {/* Per-question status table */}
      {(progress.questions?.length ?? 0) > 0 && (
        <TerminalWindow title="system://question.log" prompt="">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-3">Question Timeline</p>
          <div className="space-y-1">
            {progress.questions.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-3 rounded-sm px-3 py-2 font-mono text-xs"
                style={{ background: q.answered ? "rgba(0,255,136,0.04)" : "transparent" }}
              >
                <span className="shrink-0 w-6 text-muted text-right">{q.order}</span>
                {q.is_bonus && <span className="shrink-0 text-warning text-[10px]">★</span>}
                <span className={`flex-1 truncate ${q.answered ? "text-foreground" : "text-muted"}`}>
                  {q.title}
                </span>
                <span className="shrink-0 w-12 text-right text-muted">{fmtTime(q.time_spent)}</span>
                <span className={`shrink-0 w-10 text-right ${q.attempts > 1 ? "text-warning" : "text-muted"}`}>
                  {q.attempts > 0 ? `×${q.attempts}` : "—"}
                </span>
                {q.hint_used && (
                  <span className="shrink-0 text-[9px] text-subtle border border-subtle px-1">HINT</span>
                )}
                <span className="shrink-0 ml-1">
                  {q.answered
                    ? <span className="text-success">✓</span>
                    : q.attempts > 0
                    ? <span className="text-warning">…</span>
                    : <span className="text-subtle">·</span>}
                </span>
              </div>
            ))}
          </div>
        </TerminalWindow>
      )}
    </div>
  );
}

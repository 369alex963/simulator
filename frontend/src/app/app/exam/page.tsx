"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { CyberGrid } from "@/components/cyber/cyber-grid";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { PulseDot } from "@/components/cyber/pulse-dot";
import { PasswordInput } from "@/components/cyber/password-input";
import { InstanceSwitcher } from "@/components/cyber/instance-switcher";
import { AnimatedCounter } from "@/components/cyber/animated-counter";
import { OperativeRank } from "@/components/cyber/operative-rank";
import { CyberModal } from "@/components/cyber/cyber-modal";
import { useBrand } from "@/components/branding/brand-kit-provider";
import { useExamSSE } from "@/hooks/use-exam-sse";
import { cn } from "@/lib/utils";

type QuestionState = {
  id: number;
  order: number;
  title: string;
  prompt: string;
  question_type: "text" | "multiple_choice" | "true_false";
  is_bonus: boolean;
  base_points: number;
  choices: string[] | null;
  has_hint: boolean;
  is_answered: boolean;
  is_current: boolean;
  is_locked: boolean;
  attempts: number;
  hint_used: boolean;
  first_seen_at: string | null;
  completed_at: string | null;
  active_seconds: number;
};

type ExamState = {
  enrollment_id: number;
  instance_id: number;
  instance_name: string;
  instance_status: string;
  is_paused: boolean;
  is_sequential: boolean;
  has_started: boolean;
  started_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  is_submitted: boolean;
  total_active_seconds: number;
  scenario_description: string;
  allow_hints: boolean;
  status: string;
  is_complete: boolean;
  all_answered: boolean;
  all_bonus_answered: boolean;
  bonus_total: number;
  bonus_answered: number;
  answered_count: number;
  total_questions: number;
  non_bonus_total: number;
  questions: QuestionState[];
};

/** Format seconds → H:MM:SS or M:SS */
function formatDuration(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h
    ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
    : `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Live wall-clock timer driven by a server timestamp. Persists across refresh. */
function useWallClockTimer(startedAt: string | null, pausedAt: string | null) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!startedAt || pausedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt, pausedAt]);

  if (!startedAt) return 0;
  const end = pausedAt ? new Date(pausedAt).getTime() : now;
  return Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 1000));
}

export default function ExamPage() {
  const brand = useBrand();
  const sse = useExamSSE(true);
  const [examState, setExamState] = useState<ExamState | null>(null);
  const [selected, setSelected] = useState<QuestionState | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [hintText, setHintText] = useState("");
  // Submit-test modal
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitAck, setSubmitAck] = useState(false);
  const [submittingTest, setSubmittingTest] = useState(false);

  const postSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const viewedRef = useRef<Set<number>>(new Set());

  useEffect(() => () => {
    if (postSubmitTimerRef.current) clearTimeout(postSubmitTimerRef.current);
  }, []);

  const loadState = useCallback(async () => {
    try {
      const s = await api.get<ExamState>("/api/exam/state/");
      setExamState(s);
      if (selectedIdRef.current === null && s.has_started) {
        const current = s.questions.find((q) => q.is_current);
        if (current) {
          setSelected(current);
          selectedIdRef.current = current.id;
        }
      } else if (selectedIdRef.current !== null) {
        const refreshed = s.questions.find((q) => q.id === selectedIdRef.current);
        if (refreshed) setSelected(refreshed);
      }
    } catch { /* not enrolled */ }
  }, []);

  useEffect(() => {
    loadState();
    const interval = setInterval(loadState, 5000);
    return () => clearInterval(interval);
  }, [loadState]);

  const handleInstanceSwitch = useCallback(async () => {
    selectedIdRef.current = null;
    setSelected(null);
    setAnswer("");
    setFeedback(null);
    setHintText("");
    viewedRef.current = new Set();
    await loadState();
  }, [loadState]);

  const isPaused = sse.paused || (examState?.is_paused ?? false);
  const isSubmitted = examState?.is_submitted ?? false;

  // Total exam timer — server-driven from started_at, paused when submitted
  const totalSeconds = useWallClockTimer(
    examState?.started_at ?? null,
    isSubmitted ? (examState?.submitted_at ?? examState?.completed_at ?? null) : null,
  );

  // Per-question timer — also server-driven from first_seen_at to completed_at
  // (or now if still unanswered). Persists across refresh.
  const timeOnQ = useWallClockTimer(
    selected?.first_seen_at ?? null,
    selected?.completed_at
      ?? (isSubmitted ? (examState?.submitted_at ?? examState?.completed_at ?? null) : null),
  );

  // When student selects a question, ensure server stamps first_seen_at.
  // BUT only for questions that are actually answerable — reading a locked
  // question does NOT start its per-question timer.
  useEffect(() => {
    if (!selected || !examState?.has_started || isSubmitted) return;
    if (selected.is_locked) return; // ← reading-ahead doesn't start the timer
    if (selected.first_seen_at) return; // already stamped
    if (viewedRef.current.has(selected.id)) return;
    viewedRef.current.add(selected.id);
    api.post(`/api/exam/view/${selected.id}/`)
      .then(() => loadState())
      .catch(() => { viewedRef.current.delete(selected.id); });
  }, [selected, examState?.has_started, isSubmitted, loadState]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await api.post("/api/exam/start/");
      await loadState();
    } catch { /* ignore */ } finally {
      setStarting(false);
    }
  };

  const handleSelect = (q: QuestionState) => {
    setSelected(q);
    selectedIdRef.current = q.id;
    setAnswer("");
    setFeedback(null);
    setHintText("");
  };

  const handleSubmit = async () => {
    if (!selected || !answer.trim() || selected.is_locked || isSubmitted) return;
    setSubmitting(true);
    try {
      const res = await api.post<{ correct: boolean; message: string; attempts: number }>(
        `/api/exam/submit/${selected.id}/`,
        { answer: answer.trim(), time_spent: timeOnQ },
      );
      setFeedback({ correct: res.correct, message: res.message });
      setSelected((prev) => prev ? { ...prev, attempts: res.attempts, is_answered: res.correct || prev.is_answered } : prev);
      if (res.correct) {
        postSubmitTimerRef.current = setTimeout(() => {
          loadState();
          setFeedback(null);
          setAnswer("");
        }, 1200);
      }
    } catch (e) {
      if (e instanceof ApiError) setFeedback({ correct: false, message: "Error submitting." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleHint = async () => {
    if (!selected || selected.is_locked || isSubmitted) return;
    try {
      const res = await api.post<{ hint: string }>(`/api/exam/hint/${selected.id}/`);
      setHintText(res.hint);
      setSelected((prev) => prev ? { ...prev, hint_used: true } : prev);
    } catch { /* ignore */ }
  };

  const openSubmitModal = () => {
    setSubmitAck(false);
    setSubmitOpen(true);
  };

  const handleSubmitTest = async () => {
    if (!submitAck) return;
    setSubmittingTest(true);
    try {
      await api.post("/api/exam/submit-test/");
      setSubmitOpen(false);
      await loadState();
    } catch { /* ignore */ } finally {
      setSubmittingTest(false);
    }
  };

  // ── Shell container: fills the area below navbar, right of app sidebar ──
  // Negative margins cancel parent's top/bottom padding only. Left and right
  // padding are preserved → equal breathing room from the app nav AND the
  // right edge of the page.
  const shellClasses =
    "flex h-[calc(100dvh-4rem)] -my-6 md:-my-8 bg-surface relative isolate overflow-hidden";

  /* ── Loading ─────────────────────────────────────────────────── */
  if (!examState) {
    return (
      <div className={cn(shellClasses, "items-center justify-center")}>
        <CyberGrid />
        <div className="relative z-[1] space-y-6 text-center animate-rise">
          <div className="font-display text-3xl font-bold text-primary text-glow-strong animate-flicker tracking-[0.15em]">
            {brand?.brand_name ?? "KERNELiOS"}
          </div>
          <div className="flex items-center justify-center gap-3 font-mono text-xs text-muted">
            <div className="size-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
            Connecting to exam server...
          </div>
        </div>
      </div>
    );
  }

  /* ── Pause overlay ───────────────────────────────────────────── */
  if (isPaused) {
    return (
      <div className={cn(shellClasses, "items-center justify-center")}>
        <CyberGrid />
        <div aria-hidden className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, var(--warning) 0, var(--warning) 1px, transparent 0, transparent 50%)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-[1] space-y-6 text-center">
          {brand?.logo ? (
            <Image src={brand.logo} alt={brand.brand_name} width={200} height={56}
              className="mx-auto mb-6 h-14 w-auto object-contain" unoptimized />
          ) : (
            <div className="font-display text-5xl font-bold text-primary text-glow-strong animate-flicker tracking-[0.15em]">
              {brand?.brand_name ?? "KERNELiOS"}
            </div>
          )}
          <div className="font-display text-3xl font-bold uppercase tracking-[0.35em] text-warning text-glow">
            EXAM PAUSED
          </div>
          <div className="border border-warning/30 bg-warning/5 px-8 py-4 font-mono text-xs text-muted max-w-sm mx-auto">
            <p>Your timer is frozen.</p>
            <p className="mt-1 text-subtle">Stand by for instructor instructions.</p>
          </div>
          <PulseDot color="warning" size="lg" className="mx-auto" />
        </div>
      </div>
    );
  }

  /* ── Completion / Submitted screen ───────────────────────────── */
  if (examState.is_complete) {
    const glow = examState.all_bonus_answered;
    return (
      <div className={cn(shellClasses, "items-center justify-center px-4")}>
        <CyberGrid />
        <div className="absolute top-4 right-4 z-[2]">
          <InstanceSwitcher onSwitch={handleInstanceSwitch} activeInstanceId={examState.instance_id} />
        </div>
        <div className="relative z-[1] w-full max-w-2xl animate-rise text-center space-y-6">
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-subtle">
              {isSubmitted ? "◈ Exam Submitted" : "◈ Exam Complete"}
            </p>
            <div className={cn(
              "font-display text-4xl md:text-5xl font-bold tracking-[0.1em]",
              glow ? "text-warning animate-pulse" : "text-primary text-glow-strong",
            )} style={glow ? { textShadow: "0 0 12px var(--warning), 0 0 24px var(--warning), 0 0 36px var(--warning)" } : undefined}>
              {glow ? "PERFECT RUN" : isSubmitted ? "TEST LOCKED" : "MISSION COMPLETE"}
            </div>
            <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          </div>

          {/* Big timer + stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-border bg-surface-1/60 px-4 py-3 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle mb-1">Total Time</p>
              <p className="font-display text-2xl font-bold text-primary tabular-nums">
                {formatDuration(totalSeconds)}
              </p>
            </div>
            <div className="border border-border bg-surface-1/60 px-4 py-3 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle mb-1">Answered</p>
              <p className="font-display text-2xl font-bold text-foreground tabular-nums">
                {examState.answered_count}/{examState.non_bonus_total}
              </p>
            </div>
            <div className="border border-border bg-surface-1/60 px-4 py-3 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle mb-1">Bonus</p>
              <p className={cn("font-display text-2xl font-bold tabular-nums", glow ? "text-warning" : "text-muted")}>
                {examState.bonus_answered}/{examState.bonus_total || 0}
              </p>
            </div>
          </div>

          <TerminalWindow title="system://exam.complete" prompt="">
            <div className="space-y-2.5 text-xs">
              <div className="text-success/90 flex items-center gap-2">
                <span>◈</span><span>{examState.all_answered ? "All required questions answered." : `${examState.answered_count} of ${examState.non_bonus_total} required questions answered.`}</span>
              </div>
              {glow && (
                <div className="text-warning flex items-center gap-2">
                  <span>★</span>
                  <span>All bonus questions answered — {examState.bonus_total} bonus point{examState.bonus_total !== 1 ? "s" : ""} secured.</span>
                </div>
              )}
              <div className="text-success/90 flex items-center gap-2">
                <span>◈</span><span>Results submitted to server.</span>
              </div>
              {isSubmitted && (
                <div className="text-muted flex items-center gap-2">
                  <span className="text-subtle">—</span>
                  <span>This exam is locked. You can no longer modify your answers.</span>
                </div>
              )}
            </div>
          </TerminalWindow>
          <p className="font-mono text-xs text-muted">
            Check the{" "}
            <Link href="/app/exam/scoreboard" className="text-primary hover:text-primary-glow transition-colors">scoreboard</Link>
            {" "}or your{" "}
            <Link href="/app/exam/progress" className="text-primary hover:text-primary-glow transition-colors">progress</Link>.
          </p>
        </div>
      </div>
    );
  }

  /* ── Pre-start screen ─────────────────────────────────────────── */
  if (!examState.has_started) {
    return (
      <div className={cn(shellClasses, "overflow-y-auto items-start justify-center px-4 py-6")}>
        <CyberGrid />
        <div className="absolute top-4 right-4 z-[2]">
          <InstanceSwitcher onSwitch={handleInstanceSwitch} activeInstanceId={examState.instance_id} />
        </div>
        <div className="relative z-[1] w-full max-w-3xl animate-rise space-y-5">
          <div className="text-center space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-subtle">▸ Mission Briefing</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[0.05em]">
              <span className="text-foreground">{examState.instance_name}</span>
            </h1>
            <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Questions", value: examState.non_bonus_total, accent: true },
              { label: "Bonus", value: examState.bonus_total },
              { label: "Mode", value: examState.is_sequential ? "SEQUENTIAL" : "FREE ORDER" },
              { label: "Hints", value: examState.allow_hints ? "ENABLED" : "DISABLED" },
            ].map(({ label, value, accent }) => (
              <div key={label} className="border border-border bg-surface-1/60 px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle mb-1">{label}</p>
                <p className={cn("font-display font-bold text-xl tabular-nums", accent ? "text-primary text-glow" : "text-foreground")}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <TerminalWindow title="system://mission.briefing" prompt="operator@hq:~$ briefing" bodyClassName="space-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2">Mission Parameters</p>
              <p className="font-mono text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {examState.scenario_description || "No additional briefing provided. Proceed with standard exam protocol."}
              </p>
            </div>
            <div className="h-px w-full bg-border/40" />
            <div className="space-y-2.5 font-mono text-xs">
              {[
                examState.is_sequential
                  ? "Sequential — you can read all questions, but only the current one can be answered. Earlier ones must be correct first."
                  : "All questions are open — answer in any order.",
                "Your total elapsed time and per-question time are tracked separately and saved.",
                examState.allow_hints ? "Hints are available, but may affect your final score." : "Hints are disabled for this exam.",
                examState.bonus_total > 0
                  ? `${examState.bonus_total} bonus question${examState.bonus_total !== 1 ? "s" : ""} available — extra points above the cap.`
                  : "",
                "Click SUBMIT TEST when you're done. Once submitted, the exam is locked.",
                "Answers submitted to the server are final once accepted.",
              ].filter(Boolean).map((line, i) => (
                <div key={i} className="flex items-start gap-3 text-muted">
                  <span className="text-primary/70 mt-px">▸</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </TerminalWindow>

          <div className="flex flex-col items-center gap-3 pt-2 pb-4">
            <GlowButton onClick={handleStart} disabled={starting} size="lg"
              className="w-full sm:w-auto px-12 py-5 text-base tracking-[0.2em]">
              {starting ? "INITIALISING..." : "▶  START EXAM"}
            </GlowButton>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-subtle">
              Both timers start when you click START
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main exam layout ───────────────────────────────────────── */
  const progressPct =
    examState.non_bonus_total > 0
      ? Math.round((examState.answered_count / examState.non_bonus_total) * 100)
      : 0;
  // ASCII progress bar segments
  const segments = 18;
  const filled = Math.round((progressPct / 100) * segments);

  return (
    <div className={shellClasses}>
      <CyberGrid />

      {/* ── Question bar (terminal-window styled, stretches nearly to page bottom
          with equal top/bottom margins matching the main scroll container's
          py-6 md:py-8 padding) ── */}
      <aside className="hidden md:flex w-80 lg:w-[22rem] shrink-0 flex-col mt-6 mb-6 md:mt-8 md:mb-8 ml-0 mr-2 relative z-[1] min-h-0 border border-border-strong/60 bg-surface-1 shadow-[var(--shadow-window)]">
        {/* Top accent line — matches TerminalWindow */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent z-10" />

        {/* Title bar (looks like terminal-window header) */}
        <div className="shrink-0 flex items-center gap-3 border-b border-border/80 bg-surface-2/90 px-4 py-2.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="size-2.5 rounded-full bg-danger/75 ring-1 ring-inset ring-danger/30" />
            <span className="size-2.5 rounded-full bg-warning/75 ring-1 ring-inset ring-warning/30" />
            <span className="size-2.5 rounded-full bg-success/75 ring-1 ring-inset ring-success/30" />
          </div>
          <div className="flex-1 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted select-none truncate">
            system://mission.briefing
          </div>
          <InstanceSwitcher onSwitch={handleInstanceSwitch} activeInstanceId={examState.instance_id} />
        </div>

        {/* Instance name */}
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-border/30">
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-subtle mb-1">Operation</p>
          <p className="font-display text-base font-bold text-foreground truncate">{examState.instance_name}</p>
          <p className="font-mono text-[9px] text-subtle mt-0.5 uppercase tracking-wider">
            {examState.is_sequential ? "Sequential mode" : "Free order mode"}
          </p>
        </div>

        {/* Big progress display (video-game style) */}
        <div className="shrink-0 px-5 py-3 border-b border-border/30 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-subtle">Progress</span>
            <span className="font-display text-2xl font-black text-primary text-glow tabular-nums">
              <AnimatedCounter value={progressPct} suffix="%" />
            </span>
          </div>
          <div className="font-mono text-sm leading-none">
            <span className="text-muted">[</span>
            <span className="text-primary" style={{ textShadow: "0 0 6px var(--primary)" }}>
              {"█".repeat(filled)}
            </span>
            <span className="text-subtle/50">{"░".repeat(segments - filled)}</span>
            <span className="text-muted">]</span>
          </div>
          <div className="flex justify-between font-mono text-[9px] text-subtle tabular-nums">
            <span>{examState.answered_count} solved</span>
            <span>{examState.non_bonus_total - examState.answered_count} remaining</span>
          </div>
        </div>

        {/* Two timers */}
        <div className="shrink-0 grid grid-cols-2 border-b border-border/30">
          <div className="px-4 py-3 border-r border-border/30 bg-surface-2/30">
            <p className="font-mono text-[8px] uppercase tracking-[0.25em] text-subtle mb-1">Total</p>
            <p className="font-display text-xl font-bold text-foreground tabular-nums leading-none">
              {formatDuration(totalSeconds)}
            </p>
            <p className="font-mono text-[8px] text-subtle mt-1">Since START</p>
          </div>
          <div className="px-4 py-3 bg-surface-2/30">
            <p className="font-mono text-[8px] uppercase tracking-[0.25em] text-subtle mb-1">On Q{selected?.order ?? "—"}</p>
            <p className="font-display text-xl font-bold text-primary tabular-nums leading-none">
              {formatDuration(timeOnQ)}
            </p>
            <p className="font-mono text-[8px] text-subtle mt-1">Current view</p>
          </div>
        </div>

        {/* Compact scrollable question list — shows ~5-6 at a time, scrolls for more */}
        <div className="shrink-0 px-3 pt-2 pb-1 border-t border-border/30">
          <p className="px-2 font-mono text-[9px] uppercase tracking-[0.35em] text-subtle/60">
            Questions ({examState.questions.length})
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 min-h-0">
          <div className="space-y-1">
            {examState.questions.map((q) => {
              const isSel = selected?.id === q.id;
              const icon = q.is_answered ? "◈" : q.is_locked ? "🔒" : q.is_current ? "▶" : "○";
              return (
                <button
                  key={q.id}
                  onClick={() => handleSelect(q)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left font-mono text-[12px]",
                    "border-l-2 transition-all duration-100 cursor-pointer",
                    q.is_answered
                      ? "border-success/60 bg-success/8 text-success/85"
                      : isSel
                      ? "border-primary bg-primary/15 text-primary"
                      : q.is_locked
                      ? "border-transparent text-muted/60 hover:border-warning/30 hover:bg-warning/5 hover:text-warning/80"
                      : "border-transparent text-muted hover:border-primary/30 hover:bg-surface-2/70 hover:text-foreground",
                  )}
                >
                  <span className="shrink-0 w-5 text-center text-sm">{icon}</span>
                  <span className="font-semibold">Q{q.order}</span>
                  {q.is_bonus && (
                    <span className="ml-auto text-[8px] uppercase tracking-wider text-warning/70 shrink-0 border border-warning/30 px-1 py-px">
                      BONUS
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Submit Test (fixed at the bottom of the panel, outside the scroll) */}
        <div className="shrink-0 border-t border-danger/40 bg-danger/5 px-4 py-3">
          <button
            onClick={openSubmitModal}
            disabled={isSubmitted}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3",
              "border border-danger bg-danger/10 hover:bg-danger/20",
              "font-display text-sm font-bold uppercase tracking-[0.2em] text-danger",
              "transition-all duration-150 active:scale-[0.98]",
              "shadow-[0_0_12px_color-mix(in_oklab,var(--danger)_20%,transparent)]",
              "hover:shadow-[0_0_18px_color-mix(in_oklab,var(--danger)_40%,transparent)]",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <span>⚠</span>
            <span>Submit Test</span>
          </button>
          <p className="mt-2 font-mono text-[9px] text-danger/70 text-center uppercase tracking-wider">
            Locks the exam — final
          </p>
        </div>
      </aside>

      {/* ── Main panel — full remaining width, scrollable body ──── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-[1] overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden shrink-0 px-4 py-3 border-b border-border/40 bg-surface-1/70 backdrop-blur space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-foreground truncate">{examState.instance_name}</span>
            <InstanceSwitcher onSwitch={handleInstanceSwitch} activeInstanceId={examState.instance_id} />
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px]">
            <span className="text-primary tabular-nums">⏱ {formatDuration(totalSeconds)}</span>
            <span className="text-muted tabular-nums">Q: {formatDuration(timeOnQ)}</span>
            <span className="ml-auto text-foreground tabular-nums">{examState.answered_count}/{examState.non_bonus_total}</span>
          </div>
          <button
            onClick={openSubmitModal}
            disabled={isSubmitted}
            className="w-full mt-1 px-3 py-2 border border-danger bg-danger/10 font-mono text-xs uppercase tracking-wider text-danger disabled:opacity-40"
          >
            ⚠ Submit Test
          </button>
        </div>

        {/* Question area — single column. Mission Progress on top (full
            width of the main area), question terminal below it (also full
            width). Top + bottom padding gives equal breathing room. */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 min-h-0">
          {selected ? (
            <div className="space-y-4 animate-rise w-full">
              {/* ── Mission Progress (original strip design) ── */}
              <div className="hidden lg:flex items-center gap-6 border border-border/40 bg-surface-1/40 px-6 py-4">
                <OperativeRank
                  pct={progressPct}
                  answered={examState.answered_count}
                  total={examState.non_bonus_total}
                  perfectRun={examState.all_bonus_answered}
                  isComplete={examState.is_complete}
                  size={120}
                />
                <div className="flex-1 space-y-2 min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-subtle">Operative Status</p>
                  <p className="font-display text-lg font-bold text-foreground">
                    Mission progress<span className="text-primary">.</span>
                  </p>
                  <p className="font-mono text-xs text-muted leading-relaxed">
                    Each correct answer powers your rank. Lock down every bonus to unlock <span className="text-warning">ELITE&nbsp;★</span> standing.
                  </p>
                  <div className="grid grid-cols-3 gap-3 mt-2 font-mono text-[10px]">
                    <div className="border border-border/40 px-2 py-1.5">
                      <p className="text-subtle uppercase tracking-wider">Solved</p>
                      <p className="text-foreground text-base font-bold tabular-nums">{examState.answered_count}</p>
                    </div>
                    <div className="border border-border/40 px-2 py-1.5">
                      <p className="text-subtle uppercase tracking-wider">Bonus</p>
                      <p className={cn("text-base font-bold tabular-nums", examState.all_bonus_answered ? "text-warning" : "text-muted")}>
                        {examState.bonus_answered}/{examState.bonus_total || 0}
                      </p>
                    </div>
                    <div className="border border-border/40 px-2 py-1.5">
                      <p className="text-subtle uppercase tracking-wider">Total Time</p>
                      <p className="text-primary text-base font-bold tabular-nums">{formatDuration(totalSeconds)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Question terminal (below Mission Progress, full width) ── */}
              <TerminalWindow
                title={`system://question-${selected.order}`}
                prompt={`exam@hq:~$ load question-${selected.order}`}
                bodyClassName="space-y-5"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-subtle">
                      Q{selected.order} · {selected.base_points} pts
                    </span>
                    {selected.is_bonus && (
                      <span className="border border-warning/40 bg-warning/8 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-warning">
                        BONUS
                      </span>
                    )}
                    {selected.is_locked && !isSubmitted && (
                      <span className="border border-warning/40 bg-warning/8 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-warning">
                        🔒 READ-ONLY
                      </span>
                    )}
                    {selected.is_current && !selected.is_answered && !isSubmitted && (
                      <span className="border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                        ▶ CURRENT
                      </span>
                    )}
                    {isSubmitted && (
                      <span className="border border-danger/40 bg-danger/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-danger">
                        ⚠ SUBMITTED
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-xl md:text-2xl font-bold text-primary">
                    {selected.title}
                  </h2>
                  <div className="mt-3 h-px w-full bg-border/50" />
                  <p className="mt-4 text-foreground/90 text-base leading-relaxed whitespace-pre-wrap">
                    {selected.prompt}
                  </p>
                </div>

                {isSubmitted ? (
                  <div className="border border-danger/40 bg-danger/8 px-4 py-3 font-mono text-xs text-danger flex items-start gap-2">
                    <span className="mt-px">⚠</span>
                    <div>
                      <p className="font-semibold">Test submitted — exam is locked.</p>
                      <p className="text-danger/70 mt-0.5">No further answers will be accepted.</p>
                    </div>
                  </div>
                ) : selected.is_locked ? (
                  <div className="border border-warning/35 bg-warning/5 px-4 py-3 font-mono text-xs text-warning/90 flex items-start gap-2">
                    <span className="mt-px">🔒</span>
                    <div>
                      <p className="font-semibold">Locked — answer earlier questions first.</p>
                      <p className="text-warning/70 mt-0.5">You can read this question, but the answer input is disabled until you reach it in order.</p>
                    </div>
                  </div>
                ) : null}

                {selected.is_answered ? (
                  <div className="border border-success/40 bg-success/8 px-4 py-3 font-mono text-xs text-success flex items-center gap-2">
                    <span>◈</span>
                    <span>Answered correctly — well done, operator.</span>
                  </div>
                ) : (
                  <>
                    {selected.question_type === "multiple_choice" && selected.choices ? (
                      <div className="space-y-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-subtle">
                          {selected.is_locked || isSubmitted ? "Choices (read-only):" : "Select answer:"}
                        </p>
                        {selected.choices.map((choice, i) => {
                          const disabled = selected.is_locked || isSubmitted;
                          return (
                            <button
                              key={choice}
                              disabled={disabled}
                              onClick={() => !disabled && setAnswer(choice)}
                              className={cn(
                                "w-full flex items-center gap-3 border px-4 py-3 text-left font-mono text-sm transition-all duration-100",
                                disabled
                                  ? "border-border/40 bg-surface-2/30 text-muted/70 cursor-not-allowed"
                                  : answer === choice
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border/70 text-muted hover:border-primary/30 hover:text-foreground hover:bg-surface-2/50",
                              )}
                            >
                              <span className="shrink-0 size-5 border border-current flex items-center justify-center text-[10px]">
                                {answer === choice && !disabled ? "◈" : String.fromCharCode(65 + i)}
                              </span>
                              {choice}
                            </button>
                          );
                        })}
                      </div>
                    ) : selected.question_type === "true_false" ? (
                      <div className="space-y-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-subtle">
                          {selected.is_locked || isSubmitted ? "Options (read-only):" : "Select answer:"}
                        </p>
                        <div className="flex gap-3">
                          {["True", "False"].map((v) => {
                            const disabled = selected.is_locked || isSubmitted;
                            return (
                              <button
                                key={v}
                                disabled={disabled}
                                onClick={() => !disabled && setAnswer(v)}
                                className={cn(
                                  "flex-1 border py-4 font-mono text-sm font-medium tracking-widest uppercase transition-all duration-100",
                                  disabled
                                    ? "border-border/40 bg-surface-2/30 text-muted/70 cursor-not-allowed"
                                    : answer === v
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/70 text-muted hover:border-primary/30 hover:text-foreground",
                                )}
                              >
                                {v}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-subtle">
                          {selected.is_locked || isSubmitted ? "Input disabled." : "Enter answer:"}
                        </p>
                        <PasswordInput
                          prompt=">"
                          value={selected.is_locked || isSubmitted ? "" : answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                          placeholder={selected.is_locked || isSubmitted ? "" : "Enter your answer..."}
                          autoComplete="off"
                          inputClassName="py-3 text-base"
                          disabled={selected.is_locked || isSubmitted}
                        />
                      </div>
                    )}

                    {feedback && (
                      <div className={cn(
                        "border px-4 py-2.5 font-mono text-xs flex items-center gap-2",
                        feedback.correct
                          ? "border-success/40 bg-success/8 text-success"
                          : "border-danger/40 bg-danger/8 text-danger",
                      )}>
                        <span>{feedback.correct ? "◈" : "✕"}</span>
                        <span>{feedback.message}</span>
                      </div>
                    )}

                    {!selected.is_locked && !isSubmitted && (
                      <div className="flex gap-3 pt-1">
                        <GlowButton
                          onClick={handleSubmit}
                          disabled={submitting || !answer}
                          size="md"
                          className="flex-1 justify-center"
                        >
                          {submitting ? "Submitting..." : "Submit Answer ▶"}
                        </GlowButton>
                        {selected.has_hint && !selected.hint_used && examState.allow_hints && (
                          <GlowButton variant="outline" onClick={handleHint} size="md">
                            Use Hint
                          </GlowButton>
                        )}
                      </div>
                    )}

                    {hintText && (
                      <div className="border border-warning/35 bg-warning/5 px-4 py-2.5 font-mono text-xs text-warning">
                        <span className="text-warning/60 mr-2">HINT:</span>
                        {hintText}
                      </div>
                    )}

                    <p className="font-mono text-[10px] text-subtle">
                      Attempts: <span className="tabular-nums text-muted font-semibold">{selected.attempts}</span>
                    </p>
                  </>
                )}
              </TerminalWindow>
            </div>
          ) : (
            <TerminalWindow title="system://select.question" prompt="">
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <span aria-hidden className="text-3xl text-border-strong select-none">◫</span>
                <p className="font-mono text-xs text-muted">
                  Select a question from the left panel to begin.
                </p>
              </div>
            </TerminalWindow>
          )}
        </div>
      </div>

      {/* ── Submit Test confirmation modal ──────────────────────────── */}
      <CyberModal
        open={submitOpen}
        onClose={() => !submittingTest && setSubmitOpen(false)}
        title="system://confirm.submit"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="border border-danger/40 bg-danger/8 p-4 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-danger text-2xl">⚠</span>
              <p className="font-display text-lg font-bold text-danger uppercase tracking-wider">
                Final Submission
              </p>
            </div>
            <p className="font-mono text-xs text-foreground/85 leading-relaxed">
              Once you submit your test, it <span className="text-danger font-semibold">cannot be accessed again</span>.
              You will not be able to answer any more questions from this moment on.
              Your total timer will pause.
            </p>
          </div>

          {/* Current state recap */}
          <div className="grid grid-cols-3 gap-2 font-mono text-xs">
            <div className="border border-border bg-surface-2/30 px-3 py-2">
              <p className="text-[9px] uppercase tracking-wider text-subtle">Answered</p>
              <p className="text-foreground font-bold tabular-nums">{examState.answered_count}/{examState.non_bonus_total}</p>
            </div>
            <div className="border border-border bg-surface-2/30 px-3 py-2">
              <p className="text-[9px] uppercase tracking-wider text-subtle">Unanswered</p>
              <p className={cn("font-bold tabular-nums", (examState.non_bonus_total - examState.answered_count) > 0 ? "text-warning" : "text-success")}>
                {examState.non_bonus_total - examState.answered_count}
              </p>
            </div>
            <div className="border border-border bg-surface-2/30 px-3 py-2">
              <p className="text-[9px] uppercase tracking-wider text-subtle">Time</p>
              <p className="text-foreground font-bold tabular-nums">{formatDuration(totalSeconds)}</p>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={submitAck}
              onChange={(e) => setSubmitAck(e.target.checked)}
              className="mt-0.5 size-4 accent-current text-danger"
            />
            <span className="font-mono text-xs text-foreground/85 leading-relaxed">
              I understand the test will be locked permanently after submission.
              Unanswered questions will be left blank and counted as missed.
            </span>
          </label>

          <div className="flex gap-3 justify-end pt-1">
            <GlowButton
              variant="outline"
              onClick={() => setSubmitOpen(false)}
              disabled={submittingTest}
            >
              Cancel
            </GlowButton>
            <GlowButton
              variant="danger"
              onClick={handleSubmitTest}
              disabled={!submitAck || submittingTest}
            >
              {submittingTest ? "Submitting..." : "Submit & Lock Test"}
            </GlowButton>
          </div>
        </div>
      </CyberModal>
    </div>
  );
}

"use client";

/**
 * Role-aware How-To walkthrough. Renders a multi-step terminal-styled tour
 * with progress dots, animated step content, and per-step icons.
 *
 * Steps differ per role. The component is intentionally a *page* (not a modal)
 * so it can live on /app/how-to and also be auto-shown on first login by the
 * parent.
 */
import { useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { GlowButton } from "@/components/cyber/glow-button";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { PulseDot } from "@/components/cyber/pulse-dot";
import { Reveal } from "@/components/motion/reveal";
import { api } from "@/lib/api";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

type Step = {
  icon: string;
  title: string;
  body: ReactNode;
  /** Optional: a short caption under the icon */
  badge?: string;
  /** Suggested CTA buttons (label + href) — rendered below body */
  cta?: { label: string; href: string }[];
};

const STEPS_BY_ROLE: Record<Role, Step[]> = {
  admin: ADMIN_STEPS(),
  admin_user: ADMIN_STEPS(),
  branch_manager: BRANCH_STEPS(),
  teacher: TEACHER_STEPS(),
  student: STUDENT_STEPS(),
};

export function HowTo({
  role, brandName, onClose,
}: { role: Role; brandName: string; onClose?: () => void }) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const steps = STEPS_BY_ROLE[role] ?? STUDENT_STEPS();
  const [idx, setIdx] = useState(0);
  const step = steps[idx];
  const isLast = idx === steps.length - 1;
  const isFirst = idx === 0;

  const handleFinish = async () => {
    try { await api.post("/api/auth/onboarding/seen/"); } catch { /* ignore */ }
    if (onClose) onClose();
    else router.push(roleDashboard(role));
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-start justify-center px-4 py-6 md:py-10">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <Reveal>
          <div className="text-center space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-subtle">▸ Onboarding Sequence</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[0.05em]">
              <span className="text-foreground">Welcome to </span>
              <span className="text-primary text-glow">{brandName}</span>
            </h1>
            <p className="font-mono text-xs text-muted">
              Role briefing for{" "}
              <span className="text-primary uppercase tracking-wider">
                {role.replace("_", " ")}
              </span>
            </p>
          </div>
        </Reveal>

        {/* Progress dots */}
        <Reveal delay={0.1}>
          <div className="flex items-center justify-center gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Step ${i + 1}`}
                className={cn(
                  "h-1.5 transition-all duration-300 rounded-full",
                  i === idx
                    ? "w-10 bg-primary shadow-[0_0_6px_var(--primary)]"
                    : i < idx
                    ? "w-2 bg-primary/40"
                    : "w-2 bg-surface-3",
                )}
              />
            ))}
            <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-subtle tabular-nums">
              {idx + 1} / {steps.length}
            </span>
          </div>
        </Reveal>

        {/* Step content — animated swap */}
        <TerminalWindow
          title={`system://briefing.${role}.step-${idx + 1}`}
          prompt={`${brandName.toLowerCase().replace(/\s/g, "")}@hq:~$ briefing`}
          bodyClassName="min-h-[360px]"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              <div className="flex items-start gap-5">
                <motion.div
                  initial={reduce ? false : { scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="relative shrink-0"
                >
                  <div
                    aria-hidden
                    className="absolute inset-[-8px] rounded-full opacity-40"
                    style={{
                      background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
                    }}
                  />
                  <div className="relative size-16 border border-primary/40 bg-primary/8 flex items-center justify-center font-display text-3xl text-primary text-glow">
                    {step.icon}
                  </div>
                  {step.badge && (
                    <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-center text-subtle">
                      {step.badge}
                    </p>
                  )}
                </motion.div>

                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-xl md:text-2xl font-bold text-primary mb-2">
                    {step.title}
                  </h2>
                  <div className="font-mono text-sm text-foreground/90 leading-relaxed space-y-2">
                    {step.body}
                  </div>
                </div>
              </div>

              {step.cta && step.cta.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-[5.25rem]">
                  {step.cta.map((c) => (
                    <GlowButton
                      key={c.href}
                      variant="outline"
                      size="sm"
                      onClick={() => { router.push(c.href); }}
                    >
                      {c.label} →
                    </GlowButton>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </TerminalWindow>

        {/* Nav buttons */}
        <Reveal delay={0.2}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={handleFinish}
              className="font-mono text-xs text-subtle uppercase tracking-wider hover:text-primary transition"
            >
              {onClose ? "Skip briefing" : "Skip & continue"}
            </button>
            <div className="flex items-center gap-2">
              <PulseDot color="success" size="sm" static />
              <span className="font-mono text-[10px] uppercase tracking-wider text-subtle">
                Briefing in progress
              </span>
            </div>
            <div className="flex gap-2">
              <GlowButton
                variant="outline"
                size="md"
                disabled={isFirst}
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
              >
                ◀ Back
              </GlowButton>
              {isLast ? (
                <GlowButton size="md" onClick={handleFinish}>
                  Enter HQ ▶
                </GlowButton>
              ) : (
                <GlowButton size="md" onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}>
                  Next ▶
                </GlowButton>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function roleDashboard(role: Role): string {
  switch (role) {
    case "student": return "/app/exam";
    case "teacher": return "/app/teacher";
    case "branch_manager": return "/app/branch";
    default: return "/app/admin";
  }
}

// ─── Step content ────────────────────────────────────────────────────────────

function STUDENT_STEPS(): Step[] {
  return [
    {
      icon: "▶",
      badge: "01",
      title: "Mission Briefing",
      body: (
        <>
          <p>Before each exam you&apos;ll see a briefing screen with the scenario description, question count, mode (sequential or free-order), and bonus availability.</p>
          <p>Click <span className="text-primary font-semibold">▶ START EXAM</span> when you&apos;re ready — your total timer begins the moment you click.</p>
        </>
      ),
    },
    {
      icon: "◉",
      badge: "02",
      title: "Answering Questions",
      body: (
        <>
          <p>Each question shows the title, prompt, and the input type (text, multiple choice, or true/false).</p>
          <p>For text answers, click the <span className="text-primary">eye icon</span> to reveal what you&apos;re typing.</p>
          <p>Press <span className="text-primary font-semibold">Submit Answer</span> or hit <kbd className="border border-border/60 px-1 text-[10px]">Enter</kbd> to submit.</p>
        </>
      ),
    },
    {
      icon: "⏱",
      badge: "03",
      title: "Two Timers",
      body: (
        <>
          <p>The <span className="text-primary">Total</span> timer tracks your entire exam — it freezes only when you submit.</p>
          <p>The <span className="text-primary">On Q</span> timer measures how long you spend on the currently open question. Both persist across page refreshes.</p>
        </>
      ),
    },
    {
      icon: "🔒",
      badge: "04",
      title: "Sequential vs Free Order",
      body: (
        <>
          <p>In <span className="text-primary">sequential</span> exams you can read every question — but you can only answer the next unsolved one. Locked questions show a 🔒 badge and the answer input is disabled.</p>
          <p>In <span className="text-primary">free-order</span> exams every question is open. Answer them in any sequence.</p>
        </>
      ),
    },
    {
      icon: "★",
      badge: "05",
      title: "Operative Rank",
      body: (
        <>
          <p>Your rank evolves as you correctly answer questions: <span className="text-muted">RECRUIT → SCOUT → OPERATIVE → AGENT → SHADOW → ELITE</span>.</p>
          <p>Answering every bonus question unlocks the gold <span className="text-warning">ELITE ★</span> halo. The HUD on the right is yours — watch it light up.</p>
        </>
      ),
    },
    {
      icon: "⚠",
      badge: "06",
      title: "Submitting the Test",
      body: (
        <>
          <p>Answering the final required question auto-submits your exam. You can also click the red <span className="text-danger font-semibold">Submit Test</span> button to lock the exam early — useful when you&apos;ve given up on a question.</p>
          <p className="text-warning text-xs">⚠ Once submitted, you cannot edit any answers. Both timers freeze and your results are sent to your instructor.</p>
        </>
      ),
      cta: [{ label: "Enter Exam", href: "/app/exam" }],
    },
  ];
}

function TEACHER_STEPS(): Step[] {
  return [
    {
      icon: "▣",
      badge: "01",
      title: "Your Instances",
      body: (
        <>
          <p>Each instance is a live exam you&apos;ve been assigned to manage. From <span className="text-primary">My Instances</span> you can view enrolled students, pause/resume exams, and download results.</p>
        </>
      ),
      cta: [{ label: "My Instances", href: "/app/teacher/instances" }],
    },
    {
      icon: "◱",
      badge: "02",
      title: "Live Scoreboards",
      body: (
        <>
          <p>Watch students compete in real time. Status pills show <span className="text-success">FINISHED</span>, <span className="text-warning">FINISHED ★</span> (with bonus), <span className="text-primary">IN PROGRESS</span>, and <span className="text-muted">PENDING</span>.</p>
          <p>Per-student bonus column shows their bonus completion ratio.</p>
        </>
      ),
      cta: [{ label: "Open Scoreboards", href: "/app/teacher/scoreboards" }],
    },
    {
      icon: "?",
      badge: "03",
      title: "Help Requests",
      body: (
        <p>Students can flag a question for assistance — flagged items appear in your <span className="text-primary">Help Requests</span> queue with the question, the student, and a short message.</p>
      ),
      cta: [{ label: "Help Queue", href: "/app/teacher/help-requests" }],
    },
    {
      icon: "↓",
      badge: "04",
      title: "Exporting Results",
      body: (
        <p>Inside any instance you can export results as CSV, XLSX, or PDF. PDFs are themed with your branch&apos;s brand-kit and include total wall-clock time + per-question active time.</p>
      ),
    },
  ];
}

function BRANCH_STEPS(): Step[] {
  return [
    {
      icon: "⬡",
      badge: "01",
      title: "Branch Command",
      body: (
        <p>You manage everything inside your branch: users, instances, analytics. You cannot touch other branches&apos; data — only admins can.</p>
      ),
    },
    {
      icon: "◉",
      badge: "02",
      title: "Users",
      body: (
        <p>Create teachers and students inside your branch. Set passwords, enable/disable accounts, or import a class roster from Moodle.</p>
      ),
      cta: [{ label: "Manage Users", href: "/app/branch/users" }],
    },
    {
      icon: "▣",
      badge: "03",
      title: "Instances",
      body: (
        <p>Open new exam instances, assign teachers, pause/resume, and download results. Closing an instance archives its scoreboard but preserves the data for analytics.</p>
      ),
      cta: [{ label: "Instances", href: "/app/branch/instances" }],
    },
    {
      icon: "◱",
      badge: "04",
      title: "Analytics",
      body: (
        <p>Aggregate stats for your branch — completion rate, average score, time-to-complete distributions, and per-instance breakdowns.</p>
      ),
      cta: [{ label: "Analytics", href: "/app/branch/analytics" }],
    },
    {
      icon: "↑",
      badge: "05",
      title: "Moodle Import",
      body: (
        <p>One-click import an entire class roster from Moodle. Each student gets a per-user random password emailed automatically.</p>
      ),
    },
  ];
}

function ADMIN_STEPS(): Step[] {
  return [
    {
      icon: "◈",
      badge: "01",
      title: "Command Center",
      body: (
        <p>You have system-wide access. From the admin dashboard you can monitor every branch, every instance, and every operator at a glance.</p>
      ),
      cta: [{ label: "Dashboard", href: "/app/admin" }],
    },
    {
      icon: "⬡",
      badge: "02",
      title: "Branches",
      body: (
        <p>Create branches to mirror your organisation&apos;s structure. Each branch owns its own users, instances, and brand-kit theming.</p>
      ),
      cta: [{ label: "Branches", href: "/app/admin/branches" }],
    },
    {
      icon: "◊",
      badge: "03",
      title: "Brand Kits",
      body: (
        <>
          <p>White-label the platform per region or client. Upload logos, set colors, fonts, and even per-kit Moodle/SMTP credentials.</p>
          <p>The active brand-kit is auto-detected by user country, with admin override.</p>
        </>
      ),
      cta: [{ label: "Brand Kits", href: "/app/admin/brand-kits" }],
    },
    {
      icon: "◫",
      badge: "04",
      title: "Scenarios & Instances",
      body: (
        <p>A <span className="text-primary">scenario</span> is the reusable question bank. An <span className="text-primary">instance</span> is a live exam built from a scenario, assigned to a branch with start/end windows, registration, and Moodle hooks.</p>
      ),
      cta: [
        { label: "Scenarios", href: "/app/admin/scenarios" },
        { label: "Instances", href: "/app/admin/instances" },
      ],
    },
    {
      icon: "▸",
      badge: "05",
      title: "Audit + Security Logs",
      body: (
        <p>Every change to users, scenarios, instances and brand-kits is recorded with actor, IP, and field-level diff. Security events — login failures, permission denials, password resets — live in their own log with severity pills.</p>
      ),
      cta: [
        { label: "Audit Log", href: "/app/admin/audit-log" },
        { label: "Security Log", href: "/app/admin/security-log" },
      ],
    },
    {
      icon: "⚙",
      badge: "06",
      title: "Global Settings",
      body: (
        <p>From Settings you can enable maintenance mode, globally pause every active exam, and configure system-wide Moodle/SMTP fallbacks.</p>
      ),
      cta: [{ label: "Settings", href: "/app/admin/settings" }],
    },
  ];
}

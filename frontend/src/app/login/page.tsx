"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CyberGrid } from "@/components/cyber/cyber-grid";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { TypingText } from "@/components/cyber/typing-text";
import { PulseDot } from "@/components/cyber/pulse-dot";
import { BrandHeader } from "@/components/cyber/brand-header";
import { PasswordInput } from "@/components/cyber/password-input";
import { motion } from "framer-motion";
import { login } from "@/lib/auth";
import { ApiError } from "@/lib/api";

const BOOT_LINES = [
  "Initialising secure channel...",
  "Loading encryption keys...",
  "Challenge / response protocol ready.",
  "Awaiting operator credentials.",
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [booted, setBooted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(username, password);
      if (user.must_change_password) router.push("/app/profile?must_change=1");
      else if (user.role === "student") router.push("/app/exam");
      else if (user.role === "teacher") router.push("/app/teacher");
      else if (user.role === "branch_manager") router.push("/app/branch");
      else router.push("/app/admin");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid username or password.");
      } else {
        setError("Connection error. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative isolate flex min-h-[100dvh] overflow-hidden">
      <CyberGrid />

      {/* ── Left panel: narrow brand strip ─────────────────── */}
      <div className="relative hidden lg:flex lg:w-80 shrink-0 flex-col justify-between px-10 py-14 border-r border-border/50 bg-surface-1/90">
        <div aria-hidden className="pointer-events-none absolute right-0 inset-y-0 w-px bg-gradient-to-b from-transparent via-primary/60 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent animate-scan" />

        {/* Brand */}
        <div className="space-y-5">
          <BrandHeader size="lg" linkTo="/" />
          <div className="h-[3px] w-12 bg-primary" />
          <p className="font-mono text-sm text-muted leading-relaxed tracking-wide">
            Secure examination<br />
            and simulation platform.
          </p>
        </div>

        {/* Boot animation — its own terminal */}
        <div className="flex-1 py-8">
          <TerminalWindow
            title="system://boot"
            prompt=""
            scanlines={false}
            bodyClassName="py-4 px-4"
          >
            <TypingText
              lines={BOOT_LINES}
              charDelay={18}
              onComplete={() => setBooted(true)}
              className="text-success/80 text-xs leading-relaxed"
            />
            {booted && (
              <div className="mt-2 flex items-center gap-2 text-primary text-xs">
                <span className="size-[6px] animate-blink bg-primary inline-block" />
                <span>Ready</span>
              </div>
            )}
          </TerminalWindow>
        </div>

        {/* Status */}
        <div className="space-y-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-subtle/60 mb-3">System Status</p>
          {[
            ["ENCRYPTION", "AES-256-GCM", "success"],
            ["AUTH",       "ACTIVE",      "success"],
            ["UPLINK",     "ESTABLISHED", "success"],
            ["THREAT",     "LOW",         "warning"],
          ].map(([label, value, color]) => (
            <div key={label} className="flex items-center justify-between border-b border-border/20 pb-2.5">
              <span className="font-mono text-xs uppercase tracking-[0.15em] text-subtle">{label}</span>
              <span className={`font-mono text-xs font-bold flex items-center gap-1.5 ${color === "success" ? "text-success/80" : "text-warning/80"}`}>
                <span className={`size-1.5 rounded-full ${color === "success" ? "bg-success" : "bg-warning"}`} />
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel: login form ───────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:py-0">
        {/* Mobile brand */}
        <div className="mb-8 lg:hidden">
          <BrandHeader size="md" linkTo="/" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg"
        >
          {/* Login form — its own terminal */}
          <TerminalWindow
            title="system://auth.gate"
            prompt=""
            footer={
              <span className="flex items-center gap-2 text-sm">
                <PulseDot size="sm" color="success" />
                TLS 1.3 active · session secured
              </span>
            }
            bodyClassName="px-8 py-8"
          >
            <div className="mb-7">
              <h1 className="font-display text-3xl font-bold text-primary text-glow tracking-[0.08em]">
                ACCESS TERMINAL
              </h1>
              <p className="mt-1.5 font-mono text-sm uppercase tracking-[0.2em] text-subtle">
                Authorised personnel only
              </p>
            </div>

            {error && (
              <div className="mb-6 border border-danger/40 bg-danger/8 px-4 py-3 font-mono text-sm text-danger flex items-center gap-3">
                <span className="shrink-0 text-base">✕</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-mono text-xs uppercase tracking-[0.25em] text-muted block">
                  Identifier
                </label>
                <div className="flex items-center border border-border bg-surface transition-all duration-150 focus-within:border-primary/70 focus-within:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_15%,transparent)]">
                  <span className="shrink-0 pl-4 pr-2 font-mono text-base text-primary/40 select-none">&gt;</span>
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    className="flex-1 bg-transparent py-4 pr-4 font-mono text-base text-foreground placeholder:text-subtle/40"
                    placeholder="operator"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-mono text-xs uppercase tracking-[0.25em] text-muted block">
                  Access Code
                </label>
                <PasswordInput
                  prompt=">"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  wrapperClassName="border-border"
                  inputClassName="py-4 text-base font-mono"
                />
              </div>

              <GlowButton type="submit" disabled={loading} size="lg" className="w-full justify-center text-base py-4">
                {loading ? "Authenticating..." : "Authenticate ▶"}
              </GlowButton>
            </form>

            <div className="mt-6 border-t border-border/40 pt-5 flex items-center justify-between font-mono text-sm text-subtle">
              <Link href="/forgot-password" className="hover:text-primary transition-colors">
                Forgot access code?
              </Link>
              <Link href="/register" className="text-primary/70 hover:text-primary transition-colors">
                Register for exam →
              </Link>
            </div>
          </TerminalWindow>
        </motion.div>
      </div>
    </main>
  );
}

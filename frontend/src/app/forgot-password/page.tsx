"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CyberGrid } from "@/components/cyber/cyber-grid";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { PulseDot } from "@/components/cyber/pulse-dot";
import { BrandHeader } from "@/components/cyber/brand-header";
import { api, ApiError } from "@/lib/api";

type Step = "input" | "sent" | "reset";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("input");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/password-reset/request/", { email });
      setStep("sent");
    } catch (err) {
      setError(err instanceof ApiError ? String((err.data as any)?.detail ?? "Failed to send reset email.") : "Connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) { setError("Passwords do not match."); return; }
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/password-reset/confirm/", { token, new_password: newPassword });
      setStep("reset");
    } catch (err) {
      setError(err instanceof ApiError ? String((err.data as any)?.detail ?? "Invalid or expired token.") : "Connection error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center px-4">
      <CyberGrid />
      <div className="w-full max-w-md animate-rise">
        <div className="mb-6 flex justify-center">
          <BrandHeader size="md" linkTo="/" />
        </div>
        <TerminalWindow
          title="system://auth.recovery"
          prompt=""
          footer={
            <span className="flex items-center gap-2">
              <PulseDot size="sm" color={step === "reset" ? "success" : "warning"} />
              {step === "reset" ? "account recovered" : "recovery sequence active"}
            </span>
          }
          bodyClassName="px-6 py-8"
        >
          <div className="mb-6 space-y-1">
            <h1 className="font-display text-2xl font-bold text-primary text-glow">
              ACCOUNT RECOVERY
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              {step === "input" && "Enter registered email address"}
              {step === "sent" && "Check your inbox for a reset token"}
              {step === "reset" && "Password successfully updated"}
            </p>
          </div>

          {error && (
            <div className="mb-4 border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
              ✗ {error}
            </div>
          )}

          {step === "input" && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Email Address</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="operator@kernelios.com"
                  className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none transition focus:border-primary focus:shadow-[var(--glow-primary)] placeholder:text-subtle"
                />
              </div>
              <GlowButton type="submit" disabled={loading} size="lg" className="w-full justify-center">
                {loading ? "Sending..." : "Send Reset Token →"}
              </GlowButton>
              <p className="text-center font-mono text-xs text-muted">
                Remembered it?{" "}
                <Link href="/login" className="text-primary hover:underline">Back to login →</Link>
              </p>
            </form>
          )}

          {step === "sent" && (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div className="border border-success/30 bg-success/10 px-3 py-2 font-mono text-xs text-success">
                ✓ Reset token sent to {email}. Check your inbox (and spam folder).
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Reset Token</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  placeholder="Paste token from email"
                  className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none transition focus:border-primary placeholder:text-subtle"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min. 6 chars, 1 uppercase"
                  className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none transition focus:border-primary placeholder:text-subtle"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Repeat new password"
                  className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none transition focus:border-primary placeholder:text-subtle"
                />
              </div>
              <GlowButton type="submit" disabled={loading} size="lg" className="w-full justify-center">
                {loading ? "Resetting..." : "Set New Password →"}
              </GlowButton>
            </form>
          )}

          {step === "reset" && (
            <div className="space-y-4 text-center">
              <div className="font-display text-5xl text-success text-glow">✓</div>
              <p className="font-mono text-sm text-success">Password updated successfully.</p>
              <GlowButton size="lg" className="w-full justify-center" onClick={() => { window.location.href = "/login"; }}>
                Back to Login →
              </GlowButton>
            </div>
          )}
        </TerminalWindow>
      </div>
    </main>
  );
}

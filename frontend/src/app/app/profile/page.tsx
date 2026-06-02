"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import type { User } from "@/types";

export default function ProfilePage() {
  const params = useSearchParams();
  const mustChange = params.get("must_change") === "1";
  const [user, setUser] = useState<User | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get<User>("/api/auth/me/").then(setUser).catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (next !== confirm) { setError("Passwords do not match."); return; }
    try {
      await api.post("/api/auth/change-password/", {
        current_password: current,
        new_password: next,
      });
      setSuccess(true);
      if (mustChange) setTimeout(() => { window.location.href = "/app"; }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        setError((err.data as { detail?: string })?.detail ?? "Error changing password.");
      }
    }
  };

  return (
    <div className="max-w-lg space-y-6 animate-rise">
      {mustChange && (
        <div className="border border-warning/40 bg-warning/10 px-4 py-3 font-mono text-sm text-warning">
          You must set a new password before continuing.
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          MY <span className="text-primary text-glow">PROFILE</span>
        </h1>
        {user && (
          <p className="mt-1 font-mono text-xs text-muted">
            {user.username} · {user.display_role} · {user.branch?.name ?? "HQ"}
          </p>
        )}
      </div>

      <TerminalWindow title="system://change.password" prompt="">
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { id: "current", label: "Current Password", val: current, set: setCurrent },
            { id: "next", label: "New Password (6+ chars, 1 uppercase)", val: next, set: setNext },
            { id: "confirm", label: "Confirm New Password", val: confirm, set: setConfirm },
          ].map(({ id, label, val, set }) => (
            <div key={id} className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</label>
              <input
                type="password"
                value={val}
                onChange={(e) => set(e.target.value)}
                required
                className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none transition focus:border-primary focus:shadow-[var(--glow-primary)] placeholder:text-subtle"
              />
            </div>
          ))}

          {error && <p className="font-mono text-xs text-danger">✗ {error}</p>}
          {success && <p className="font-mono text-xs text-success">✓ Password updated successfully.</p>}

          <GlowButton type="submit" size="lg" className="w-full justify-center">
            Update Password
          </GlowButton>
        </form>
      </TerminalWindow>
    </div>
  );
}

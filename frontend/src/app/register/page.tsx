"use client";

import { useState, type FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CyberGrid } from "@/components/cyber/cyber-grid";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { BrandHeader } from "@/components/cyber/brand-header";
import { PasswordInput } from "@/components/cyber/password-input";
import { api, ApiError } from "@/lib/api";

type InstanceOption = { id: number; name: string; branch_name: string };

export default function RegisterPage() {
  const router = useRouter();
  const [instances, setInstances] = useState<InstanceOption[]>([]);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    instance_id: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<InstanceOption[]>("/api/instances/open/").then(setInstances).catch(() => {});
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setPwd = (field: "password" | "password2") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.password2) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/register/", {
        username: form.username,
        email: form.email,
        password: form.password,
        instance_id: Number(form.instance_id),
      });
      router.push("/app/exam");
    } catch (err) {
      if (err instanceof ApiError) {
        const raw = err.data as { detail?: string } | Record<string, unknown>;
        const msg = (raw as { detail?: string }).detail ?? Object.values(raw as Record<string, unknown>).flat().join(" ");
        setError(String(msg) || "Registration failed.");
      } else {
        setError("Connection error.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center px-4 py-12">
      <CyberGrid />

      <div className="w-full max-w-md animate-rise">
        <div className="mb-6 flex justify-center">
          <BrandHeader size="md" linkTo="/" />
        </div>
        <TerminalWindow
          title="system://register.operator"
          prompt=""
          footer="student portal · self-registration"
          bodyClassName="px-6 py-8"
        >
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-primary text-glow">
              REGISTER OPERATOR
            </h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              Student self-enrollment
            </p>
          </div>

          {error ? (
            <div className="mb-4 border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
              ✗ {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { id: "username", label: "Username", type: "text", placeholder: "operator_name" },
              { id: "email", label: "Email", type: "email", placeholder: "you@example.com" },
            ].map(({ id, label, type, placeholder }) => (
              <div key={id} className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  {label}
                </label>
                <input
                  type={type}
                  value={form[id as keyof typeof form]}
                  onChange={set(id)}
                  required
                  className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none transition focus:border-primary focus:shadow-[var(--glow-primary)] placeholder:text-subtle"
                  placeholder={placeholder}
                />
              </div>
            ))}

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Password</label>
              <PasswordInput
                value={form.password}
                onChange={setPwd("password")}
                required
                placeholder="min 6 chars, 1 uppercase"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Confirm Password</label>
              <PasswordInput
                value={form.password2}
                onChange={setPwd("password2")}
                required
                placeholder="repeat password"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                Exam Instance
              </label>
              <select
                value={form.instance_id}
                onChange={set("instance_id")}
                required
                className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none transition focus:border-primary focus:shadow-[var(--glow-primary)]"
              >
                <option value="">Select your exam...</option>
                {instances.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} [{inst.branch_name}]
                  </option>
                ))}
              </select>
            </div>

            <GlowButton type="submit" disabled={loading} size="lg" className="w-full justify-center mt-2">
              {loading ? "Creating account..." : "Create Account →"}
            </GlowButton>
          </form>

          <div className="mt-6 border-t border-border pt-4 text-center font-mono text-xs text-muted">
            Already have access?{" "}
            <Link href="/login" className="text-primary hover:text-primary-glow">
              Login →
            </Link>
          </div>
        </TerminalWindow>
      </div>
    </main>
  );
}

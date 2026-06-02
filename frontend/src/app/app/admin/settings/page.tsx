"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { PulseDot } from "@/components/cyber/pulse-dot";

type Config = {
  maintenance_mode: boolean;
  maintenance_message: string;
  exam_global_paused: boolean;
  moodle_base_url: string;
  moodle_token: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_use_tls: boolean;
};

function Field({
  label, type = "text", placeholder, value, onChange, helper,
}: {
  label: string; id?: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; helper?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground transition focus-within:border-primary/60 placeholder:text-subtle/50"
      />
      {helper && <p className="font-mono text-[10px] text-subtle/60">{helper}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [form, setForm] = useState<Partial<Config>>({});
  const [saved, setSaved] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [testEmailResult, setTestEmailResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);

  const load = () =>
    api.get<Config>("/api/settings/")
      .then((c) => { setCfg(c); setForm(c); })
      .catch(() => {});

  useEffect(() => { load(); }, []); // load is stable — defined once at component scope

  const set = (f: keyof Config) => (v: string | boolean) =>
    setForm((p) => ({ ...p, [f]: v }));

  const saveSection = async (e: FormEvent, section: string) => {
    e.preventDefault();
    setSavingSection(section);
    await api.patch("/api/settings/", form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setSavingSection(null);
    load();
  };

  const toggleMaintenance = async () => {
    await api.post("/api/settings/maintenance/", {
      message: maintenanceMsg || cfg?.maintenance_message,
    });
    load();
  };

  const togglePause = async () => {
    await api.post("/api/settings/pause/");
    load();
  };

  const sendTestEmail = async () => {
    setTestingEmail(true);
    setTestEmailResult(null);
    try {
      const res = await api.post<{ success: boolean; detail: string }>("/api/settings/test-email/", {});
      setTestEmailResult({ ok: res.success, msg: res.detail });
    } catch (e: unknown) {
      const err = e as { data?: { detail?: string } };
      setTestEmailResult({ ok: false, msg: err?.data?.detail ?? "Send failed." });
    } finally {
      setTestingEmail(false); }
  };

  if (!cfg) return (
    <div className="flex items-center gap-3 p-8 font-mono text-sm text-muted">
      <span className="size-2 animate-pulse rounded-full bg-primary" />
      Loading settings...
    </div>
  );

  return (
    <div className="space-y-8 animate-rise">
      {/* Header */}
      <div>
        <p className="font-mono text-sm uppercase tracking-[0.25em] text-subtle mb-1">Admin Panel</p>
        <h1 className="font-display text-4xl font-bold">
          SYSTEM <span className="text-primary text-glow">SETTINGS</span>
        </h1>
        <p className="font-mono text-sm text-muted mt-2">Configure maintenance, Moodle integration, and email delivery.</p>
      </div>

      {/* ── Row 1: Maintenance + Exam Pause ─────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Maintenance Mode */}
        <TerminalWindow title="system://maintenance" prompt="">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Maintenance Mode</p>
                <div className="flex items-center gap-2 mt-2">
                  <PulseDot color={cfg.maintenance_mode ? "danger" : "success"} size="sm" />
                  <span className={`font-mono text-sm font-semibold ${cfg.maintenance_mode ? "text-danger" : "text-success"}`}>
                    {cfg.maintenance_mode ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <p className="font-mono text-xs text-muted mt-1">
                  {cfg.maintenance_mode ? "Site is offline for all users." : "Site is accessible to all users."}
                </p>
              </div>
              <GlowButton
                variant={cfg.maintenance_mode ? "danger" : "outline"}
                onClick={toggleMaintenance}
                size="sm"
              >
                {cfg.maintenance_mode ? "Disable" : "Enable"}
              </GlowButton>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted block">
                Custom Message (shown to users)
              </label>
              <textarea
                value={maintenanceMsg || cfg.maintenance_message}
                onChange={(e) => setMaintenanceMsg(e.target.value)}
                rows={3}
                className="w-full border border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground resize-none focus-within:border-primary/60"
              />
              <p className="font-mono text-[10px] text-subtle/60">
                Changes take effect when you toggle maintenance mode.
              </p>
            </div>
          </div>
        </TerminalWindow>

        {/* Global Exam Pause */}
        <TerminalWindow title="system://exam.control" prompt="">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Global Exam Pause</p>
                <div className="flex items-center gap-2 mt-2">
                  <PulseDot color={cfg.exam_global_paused ? "warning" : "success"} size="sm" />
                  <span className={`font-mono text-sm font-semibold ${cfg.exam_global_paused ? "text-warning" : "text-success"}`}>
                    {cfg.exam_global_paused ? "ALL PAUSED" : "RUNNING"}
                  </span>
                </div>
                <p className="font-mono text-xs text-muted mt-1">
                  {cfg.exam_global_paused
                    ? "All exam instances are paused system-wide."
                    : "All exam instances are running normally."}
                </p>
              </div>
              <GlowButton
                variant={cfg.exam_global_paused ? "outline" : "secondary"}
                onClick={togglePause}
                size="sm"
              >
                {cfg.exam_global_paused ? "Resume All" : "Pause All"}
              </GlowButton>
            </div>

            <div className="border border-border/40 bg-surface-2/40 px-4 py-3 space-y-1">
              <p className="font-mono text-xs text-muted">
                Pausing affects all active exam instances simultaneously. Students will see a pause screen and their timers will freeze.
              </p>
              <p className="font-mono text-xs text-subtle/60">
                Individual instances can also be paused from the Instances page.
              </p>
            </div>
          </div>
        </TerminalWindow>
      </div>

      {/* ── Row 2: Moodle Integration ────────────────────── */}
      <TerminalWindow title="system://moodle.integration" prompt="">
        <form onSubmit={(e) => saveSection(e, "moodle")} className="space-y-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-mono text-sm font-bold text-primary uppercase tracking-[0.15em]">Moodle Integration</p>
              <p className="font-mono text-xs text-muted mt-0.5">
                Connect to your Moodle LMS to import students and push grades automatically.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {cfg.moodle_base_url && cfg.moodle_token ? (
                <><PulseDot color="success" size="sm" /><span className="font-mono text-xs text-success">Connected</span></>
              ) : (
                <><PulseDot color="warning" size="sm" /><span className="font-mono text-xs text-warning">Not configured</span></>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="moodle_base_url" label="Moodle Base URL" type="url"
              placeholder="https://moodle.yourschool.com"
              value={String(form.moodle_base_url ?? "")}
              onChange={set("moodle_base_url")}
              helper="The root URL of your Moodle installation"
            />
            <Field
              id="moodle_token" label="Moodle Web Service Token" type="password"
              placeholder="••••••••••••••••••••••••••••••••"
              value={String(form.moodle_token ?? "")}
              onChange={set("moodle_token")}
              helper="Generate in Moodle: Site Admin → Server → Web Services → Manage tokens"
            />
          </div>

          <div className="border border-border/40 bg-surface-2/30 px-4 py-3">
            <p className="font-mono text-xs font-semibold text-muted mb-2">How to get a Moodle API Token:</p>
            <ol className="font-mono text-xs text-subtle/80 space-y-1 list-decimal list-inside">
              <li>Login to Moodle as admin</li>
              <li>Go to: Site Administration → Server → Web Services → Manage tokens</li>
              <li>Create a token for the &quot;KERNELiOS&quot; service (or REST protocol)</li>
              <li>Required functions: <span className="text-primary">core_course_get_enrolled_users</span>, <span className="text-primary">gradereport_user_get_grade_items</span></li>
            </ol>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <GlowButton type="submit" disabled={savingSection === "moodle"}>
              {savingSection === "moodle" ? "Saving..." : "Save Moodle Settings"}
            </GlowButton>
            {saved && savingSection === null && <span className="font-mono text-sm text-success">✓ Saved</span>}
          </div>
        </form>
      </TerminalWindow>

      {/* ── Row 3: SMTP / Email ──────────────────────────── */}
      <TerminalWindow title="system://smtp.config" prompt="">
        <form onSubmit={(e) => saveSection(e, "smtp")} className="space-y-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-mono text-sm font-bold text-primary uppercase tracking-[0.15em]">SMTP / Email</p>
              <p className="font-mono text-xs text-muted mt-0.5">
                Configure outbound email for password resets and notifications.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {cfg.smtp_host ? (
                <><PulseDot color="success" size="sm" /><span className="font-mono text-xs text-success">Configured</span></>
              ) : (
                <><PulseDot color="warning" size="sm" /><span className="font-mono text-xs text-warning">Not configured</span></>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field id="smtp_host" label="SMTP Host"
              placeholder="smtp.gmail.com"
              value={String(form.smtp_host ?? "")} onChange={set("smtp_host")}
              helper="e.g. smtp.gmail.com or mail.yourhost.com"
            />
            <Field id="smtp_port" label="SMTP Port" type="number"
              placeholder="587"
              value={String(form.smtp_port ?? "587")} onChange={set("smtp_port")}
              helper="587 (TLS), 465 (SSL), or 25 (plain)"
            />
            <Field id="smtp_user" label="SMTP Username"
              placeholder="noreply@yourschool.com"
              value={String(form.smtp_user ?? "")} onChange={set("smtp_user")}
            />
            <Field id="smtp_password" label="SMTP Password" type="password"
              placeholder="••••••••••••"
              value={String(form.smtp_password ?? "")} onChange={set("smtp_password")}
            />
            <Field id="smtp_from_email" label="From Email Address"
              placeholder="noreply@yourschool.com"
              value={String(form.smtp_from_email ?? "")} onChange={set("smtp_from_email")}
              helper="Address shown in the From: field of all emails"
            />
            <div className="space-y-1.5 flex flex-col justify-center">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted block">Use TLS</label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => set("smtp_use_tls")(!form.smtp_use_tls)}
                  className={`relative w-10 h-5 rounded-full border transition-colors cursor-pointer ${form.smtp_use_tls ? "bg-primary/20 border-primary/60" : "bg-surface-2 border-border"}`}
                >
                  <span className={`absolute top-0.5 size-4 rounded-full transition-transform ${form.smtp_use_tls ? "translate-x-5 bg-primary" : "translate-x-0.5 bg-muted"}`} />
                </div>
                <span className="font-mono text-sm text-muted group-hover:text-foreground transition">
                  {form.smtp_use_tls ? "Enabled (recommended)" : "Disabled"}
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-1 flex-wrap">
            <GlowButton type="submit" disabled={savingSection === "smtp"}>
              {savingSection === "smtp" ? "Saving..." : "Save Email Settings"}
            </GlowButton>
            <button
              type="button"
              onClick={sendTestEmail}
              disabled={testingEmail || !cfg.smtp_host}
              className="border border-border px-4 py-2 font-mono text-sm text-muted transition hover:border-primary/40 hover:text-primary disabled:opacity-40"
            >
              {testingEmail ? "Sending..." : "Send Test Email"}
            </button>
            {testEmailResult && (
              <span className={`font-mono text-sm ${testEmailResult.ok ? "text-success" : "text-danger"}`}>
                {testEmailResult.ok ? "✓" : "✗"} {testEmailResult.msg}
              </span>
            )}
            {saved && savingSection === null && <span className="font-mono text-sm text-success">✓ Saved</span>}
          </div>
        </form>
      </TerminalWindow>
    </div>
  );
}

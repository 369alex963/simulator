"use client";

import { useState } from "react";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { api } from "@/lib/api";

const TEMPLATES = [
  {
    key: "welcome",
    label: "Welcome — New User",
    desc: "Sent when admin creates a user.",
    defaultSubject: "Welcome to {brand_name}",
    defaultBody: "Hello {username},\n\nYour account has been created.\n\nLogin: {login_url}\nPassword: {password}\n\nChange your password on first login.\n\n{brand_name} Team",
    vars: ["{username}", "{password}", "{login_url}", "{brand_name}"],
  },
  {
    key: "moodle_import",
    label: "Moodle Import — Student",
    desc: "Sent to Moodle-imported students.",
    defaultSubject: "Your {brand_name} Exam Account",
    defaultBody: "Hello {username},\n\nYou have been registered for an exam.\n\nLogin: {login_url}\nUsername: {username}\nPassword: Exam1234\n\nExam: {instance_name}\n\n{brand_name} Team",
    vars: ["{username}", "{instance_name}", "{login_url}", "{brand_name}"],
  },
  {
    key: "password_reset",
    label: "Password Reset",
    desc: "Sent on password reset request.",
    defaultSubject: "{brand_name} — Password Reset",
    defaultBody: "Hello {username},\n\nYour password reset token:\n\n{token}\n\nExpires in 1 hour.\n\n{brand_name} Team",
    vars: ["{username}", "{token}", "{brand_name}"],
  },
  {
    key: "instance_results",
    label: "Results Published",
    desc: "Sent when results are released.",
    defaultSubject: "Your results for {instance_name}",
    defaultBody: "Hello {username},\n\nResults for '{instance_name}' are available.\n\nView at: {results_url}\n\n{brand_name} Team",
    vars: ["{username}", "{instance_name}", "{results_url}", "{brand_name}"],
  },
];

export default function EmailTemplatesPage() {
  const [selected, setSelected] = useState(TEMPLATES[0].key);
  const [subjects, setSubjects] = useState<Record<string, string>>(
    Object.fromEntries(TEMPLATES.map((t) => [t.key, t.defaultSubject]))
  );
  const [bodies, setBodies] = useState<Record<string, string>>(
    Object.fromEntries(TEMPLATES.map((t) => [t.key, t.defaultBody]))
  );
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const tpl = TEMPLATES.find((t) => t.key === selected)!;

  const handleSave = () => {
    const stored = JSON.parse(localStorage.getItem("email_templates") ?? "{}");
    stored[selected] = { subject: subjects[selected], body: bodies[selected] };
    localStorage.setItem("email_templates", JSON.stringify(stored));
    setSaved((p) => ({ ...p, [selected]: true }));
    setTimeout(() => setSaved((p) => ({ ...p, [selected]: false })), 2000);
  };

  const handleSendTest = async () => {
    if (!testEmail) return;
    setSending(true);
    setSendResult(null);
    try {
      await api.post("/api/settings/test-email/", { to: testEmail });
      setSendResult({ ok: true, msg: `Test sent to ${testEmail}` });
    } catch {
      setSendResult({ ok: false, msg: "Failed. Check SMTP settings." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-rise max-w-5xl">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-subtle mb-1">Admin Panel</p>
        <h1 className="font-display text-3xl font-bold">
          EMAIL <span className="text-primary text-glow">TEMPLATES</span>
        </h1>
        <p className="font-mono text-sm text-muted mt-1">
          Customise transactional emails. Variables in curly braces are replaced automatically.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Selector */}
        <div className="space-y-1">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelected(t.key)}
              className={`w-full text-left px-4 py-3 border-l-2 transition-all duration-150 ${
                selected === t.key
                  ? "border-primary bg-primary/8 text-primary"
                  : "border-transparent text-muted hover:border-primary/30 hover:bg-surface-2/60 hover:text-foreground"
              }`}
            >
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em]">{t.label}</p>
              <p className="font-mono text-[10px] text-subtle mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>

        {/* Editor */}
        <TerminalWindow title={`system://email.${selected}`} prompt="">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted block">Subject Line</label>
              <input
                value={subjects[selected]}
                onChange={(e) => setSubjects((p) => ({ ...p, [selected]: e.target.value }))}
                className="w-full border border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted block">Body (plain text)</label>
              <textarea
                value={bodies[selected]}
                onChange={(e) => setBodies((p) => ({ ...p, [selected]: e.target.value }))}
                rows={10}
                className="w-full border border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground resize-y"
              />
            </div>

            <div className="border border-border/40 bg-surface-2/30 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2">Available Variables — click to insert</p>
              <div className="flex flex-wrap gap-2">
                {tpl.vars.map((v) => (
                  <button
                    key={v}
                    onClick={() => setBodies((p) => ({ ...p, [selected]: p[selected] + v }))}
                    className="font-mono text-xs text-primary border border-primary/30 bg-primary/5 px-2 py-0.5 hover:bg-primary/15 transition active:scale-[0.97]"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <GlowButton onClick={handleSave}>Save Template</GlowButton>
              {saved[selected] && <span className="font-mono text-sm text-success">✓ Saved</span>}
            </div>

            <div className="border-t border-border/40 pt-5 space-y-3">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Send Test Email</p>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 border border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-subtle/40"
                />
                <GlowButton variant="outline" onClick={handleSendTest} disabled={!testEmail || sending}>
                  {sending ? "Sending..." : "Send Test"}
                </GlowButton>
              </div>
              {sendResult && (
                <p className={`font-mono text-sm ${sendResult.ok ? "text-success" : "text-danger"}`}>
                  {sendResult.ok ? "✓" : "✗"} {sendResult.msg}
                </p>
              )}
            </div>
          </div>
        </TerminalWindow>
      </div>
    </div>
  );
}

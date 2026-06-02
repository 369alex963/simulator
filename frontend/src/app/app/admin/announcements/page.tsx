"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { PulseDot } from "@/components/cyber/pulse-dot";
import { CyberModal } from "@/components/cyber/cyber-modal";

type Ann = { id: number; scope: string; title: string; message: string; severity: string; is_active: boolean; created_at: string };

export default function AnnouncementsPage() {
  const [anns, setAnns] = useState<Ann[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ scope: "global", title: "", message: "", severity: "info" });

  const load = () => api.get<Ann[]>("/api/notifications/announcements/").then(setAnns).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try { await api.post("/api/notifications/announcements/", form); setOpen(false); load(); } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    try { await api.delete(`/api/notifications/announcements/${id}/`); load(); } catch { /* ignore */ }
  };

  const cols: Column<Ann>[] = [
    { key: "title", header: "Title", render: (r) => <span className="text-foreground font-semibold">{r.title}</span> },
    { key: "scope", header: "Scope", render: (r) => <span className="text-primary uppercase text-xs">{r.scope}</span> },
    { key: "severity", header: "Severity", render: (r) => (
      <span className={r.severity === "urgent" ? "text-danger" : r.severity === "warn" ? "text-warning" : "text-muted"}>
        {r.severity.toUpperCase()}
      </span>
    )},
    { key: "is_active", header: "Active", render: (r) => <PulseDot color={r.is_active ? "success" : "danger"} size="sm" /> },
    { key: "id", header: "", render: (r) => (
      <GlowButton variant="danger" size="sm" onClick={() => handleDelete(r.id)}>Delete</GlowButton>
    )},
  ];

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">
          ANNOUNCE<span className="text-primary text-glow">MENTS</span>
        </h1>
        <GlowButton onClick={() => setOpen(true)}>+ New Announcement</GlowButton>
      </div>

      <CyberModal open={open} onClose={() => setOpen(false)} title="system://create.announcement" maxWidth="lg">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: "scope", label: "Scope", opts: ["global","branch","instance"] },
              { id: "severity", label: "Severity", opts: ["info","warn","urgent"] },
            ].map(({ id, label, opts }) => (
              <div key={id} className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</label>
                <select value={form[id as keyof typeof form]} onChange={(e) => setForm(p => ({...p, [id]: e.target.value}))}
                  className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground">
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Title</label>
            <input value={form.title} onChange={(e) => setForm(p => ({...p, title: e.target.value}))}
              autoFocus
              className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Message</label>
            <textarea value={form.message} onChange={(e) => setForm(p => ({...p, message: e.target.value}))} rows={3}
              className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary resize-none" />
          </div>
          <div className="flex gap-3">
            <GlowButton onClick={handleCreate} disabled={!form.title || !form.message}>Publish</GlowButton>
            <GlowButton variant="outline" onClick={() => setOpen(false)}>Cancel</GlowButton>
          </div>
        </div>
      </CyberModal>

      <TerminalWindow title="system://announcements.list" prompt="">
        <DataTable columns={cols} data={anns} keyField="id" emptyMessage="No active announcements." />
      </TerminalWindow>
    </div>
  );
}

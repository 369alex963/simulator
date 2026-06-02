"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { PulseDot } from "@/components/cyber/pulse-dot";

type InstanceRow = { id: number; name: string; status: string; scenario_name: string; enrollment_count: number; registration_open: boolean };

const STATUS_COLORS: Record<string, "success" | "primary" | "warning" | "danger"> = {
  open: "success", paused: "warning", closed: "danger", archived: "danger", draft: "primary",
};

export default function BranchInstancesPage() {
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const load = () => api.get<InstanceRow[]>("/api/instances/").then(setInstances).catch(() => {});
  useEffect(() => { load(); }, []); // load is stable — defined once at component scope

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try { await api.post("/api/instances/", { name: newName }); setCreating(false); setNewName(""); load(); } catch { /* ignore */ }
  };

  const handlePause = async (id: number) => { await api.post(`/api/instances/${id}/pause/`); load(); };
  const handleArchive = async (id: number) => { if (!confirm("Archive?")) return; await api.post(`/api/instances/${id}/archive/`); load(); };
  const handlePushGrades = async (id: number) => {
    try { await api.post(`/api/moodle/push-grades/${id}/`); alert("Grades pushed to Moodle."); } catch { alert("Moodle not configured."); }
  };

  const columns: Column<InstanceRow>[] = [
    { key: "name", header: "Instance", render: (r) => <span className="text-primary font-semibold">{r.name}</span> },
    { key: "status", header: "Status", render: (r) => (
      <span className="flex items-center gap-2"><PulseDot color={STATUS_COLORS[r.status] ?? "primary"} size="sm" />{r.status.toUpperCase()}</span>
    )},
    { key: "scenario_name", header: "Scenario", render: (r) => <span className="text-muted">{r.scenario_name || "—"}</span> },
    { key: "enrollment_count", header: "Students", render: (r) => <span className="text-primary">{r.enrollment_count}</span> },
    { key: "registration_open", header: "Reg.", render: (r) => <span className={r.registration_open ? "text-success" : "text-muted"}>{r.registration_open ? "Open" : "Closed"}</span> },
    { key: "id", header: "Controls", render: (r) => (
      <div className="flex gap-1.5 flex-wrap">
        <GlowButton size="sm" variant="outline" onClick={() => handlePause(r.id)}>{r.status === "paused" ? "Resume" : "Pause"}</GlowButton>
        <GlowButton size="sm" variant="secondary" onClick={() => handleArchive(r.id)}>Archive</GlowButton>
        <GlowButton size="sm" variant="ghost" onClick={() => handlePushGrades(r.id)}>Push Grades</GlowButton>
        <a href={`/api/exports/${r.id}/csv/?mode=full`} target="_blank"
          className="inline-flex items-center border border-border px-2 py-1 font-mono text-[10px] text-muted hover:text-primary hover:border-primary/40 transition">CSV</a>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            BRANCH <span className="text-primary text-glow">INSTANCES</span>
          </h1>
        </div>
        <GlowButton onClick={() => setCreating(!creating)}>+ New Instance</GlowButton>
      </div>

      {creating && (
        <TerminalWindow title="system://create.instance" prompt="">
          <div className="flex gap-3">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Instance name..."
              className="flex-1 border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary" />
            <GlowButton onClick={handleCreate} disabled={!newName.trim()}>Create</GlowButton>
            <GlowButton variant="outline" onClick={() => setCreating(false)}>Cancel</GlowButton>
          </div>
        </TerminalWindow>
      )}

      <TerminalWindow title="system://branch.instances" prompt="">
        <DataTable columns={columns} data={instances} keyField="id" emptyMessage="No instances in this branch." />
      </TerminalWindow>
    </div>
  );
}

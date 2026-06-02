"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { PulseDot } from "@/components/cyber/pulse-dot";
import { CyberModal } from "@/components/cyber/cyber-modal";
import type { Branch } from "@/types";

type BranchRow = Branch & { is_active: boolean; user_count: number; created_at: string };

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const load = () => api.get<BranchRow[]>("/api/branches/").then(setBranches).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setError("");
    try {
      await api.post("/api/branches/", { name: newName });
      setNewName(""); setOpen(false); load();
    } catch (e: any) {
      setError(e?.data?.name?.[0] ?? e?.data?.detail ?? "Error creating branch.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this branch?")) return;
    try { await api.delete(`/api/branches/${id}/`); load(); } catch { /* alert */ }
  };

  const columns: Column<BranchRow>[] = [
    { key: "name", header: "Branch", render: (r) => (
      <span className="flex items-center gap-2 font-mono text-foreground">
        {r.is_hq && <span className="text-[10px] border border-primary/40 text-primary px-1 py-0.5">HQ</span>}
        {r.name}
      </span>
    )},
    { key: "user_count", header: "Users", render: (r) => <span className="text-primary">{r.user_count}</span> },
    { key: "is_active", header: "Status", render: (r) => (
      <span className="flex items-center gap-1.5">
        <PulseDot color={r.is_active ? "success" : "danger"} size="sm" />
        {r.is_active ? "Active" : "Inactive"}
      </span>
    )},
    { key: "id", header: "Actions", render: (r) => (
      !r.is_hq ? (
        <GlowButton variant="danger" size="sm" onClick={() => handleDelete(r.id)}>Delete</GlowButton>
      ) : <span className="text-subtle font-mono text-xs">Protected</span>
    )},
  ];

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            BRANCH <span className="text-primary text-glow">MANAGEMENT</span>
          </h1>
          <p className="font-mono text-xs text-muted">{branches.length} branches configured</p>
        </div>
        <GlowButton onClick={() => setOpen(true)}>+ New Branch</GlowButton>
      </div>

      <CyberModal open={open} onClose={() => { setOpen(false); setError(""); setNewName(""); }} title="system://create.branch" maxWidth="sm">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Branch Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) handleCreate(); }}
              placeholder="Branch name..."
              autoFocus
              className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary placeholder:text-subtle"
            />
          </div>
          {error && <p className="font-mono text-xs text-danger">&#x2717; {error}</p>}
          <div className="flex gap-3">
            <GlowButton onClick={handleCreate} disabled={!newName.trim()}>Create Branch</GlowButton>
            <GlowButton variant="outline" onClick={() => { setOpen(false); setError(""); setNewName(""); }}>Cancel</GlowButton>
          </div>
        </div>
      </CyberModal>

      <TerminalWindow title="system://branches.list" prompt="">
        <DataTable columns={columns} data={branches} keyField="id" emptyMessage="No branches." />
      </TerminalWindow>
    </div>
  );
}

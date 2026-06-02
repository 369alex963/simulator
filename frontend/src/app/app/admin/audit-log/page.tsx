"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { CyberModal } from "@/components/cyber/cyber-modal";

type AuditEntry = {
  id: number;
  action: "create" | "update" | "delete";
  model_name: string;
  object_id: string;
  object_repr: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  actor_username: string;
  ip_address: string | null;
  user_agent: string;
  session_key: string;
  created_at: string;
};

const ACTION_COLORS = {
  create: "text-success",
  update: "text-warning",
  delete: "text-danger",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filters, setFilters] = useState({ action: "", model: "", actor: "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    if (filters.model) params.set("model", filters.model);
    if (filters.actor) params.set("actor", filters.actor);
    try {
      const data = await api.get<AuditEntry[]>(`/api/audit/logs/?${params}`);
      setLogs(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filters]);

  const columns: Column<AuditEntry>[] = [
    { key: "created_at", header: "Time", render: (r) => (
      <span className="font-mono text-xs text-muted tabular-nums">
        {new Date(r.created_at).toLocaleString()}
      </span>
    )},
    { key: "action", header: "Action", render: (r) => (
      <span className={`font-mono text-xs font-bold uppercase ${ACTION_COLORS[r.action]}`}>
        {r.action}
      </span>
    )},
    { key: "model_name", header: "Model", render: (r) => (
      <span className="font-mono text-xs text-primary">{r.model_name}</span>
    )},
    { key: "object_repr", header: "Object", render: (r) => (
      <span className="text-foreground text-xs max-w-[180px] truncate block" title={r.object_repr}>
        {r.object_repr || `#${r.object_id}`}
      </span>
    )},
    { key: "actor_username", header: "Actor", render: (r) => (
      <span className="text-muted font-mono text-xs">{r.actor_username || "—"}</span>
    )},
    { key: "ip_address", header: "IP", render: (r) => (
      <span className="text-muted font-mono text-xs">{r.ip_address ?? "—"}</span>
    )},
    { key: "id", header: "Changes", render: (r) => {
      const count = Object.keys(r.changes).length;
      if (count === 0) return <span className="text-subtle text-xs">—</span>;
      return (
        <button
          onClick={() => setExpanded(r.id)}
          className="font-mono text-xs text-primary hover:text-primary-glow underline"
        >
          {count} field{count !== 1 ? "s" : ""} →
        </button>
      );
    }},
  ];

  const expandedEntry = expanded !== null ? logs.find((l) => l.id === expanded) ?? null : null;

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            AUDIT <span className="text-primary text-glow">LOG</span>
          </h1>
          <p className="font-mono text-xs text-muted">
            Field-level change tracking · {logs.length} entries
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filters.action}
            onChange={(e) => setFilters(f => ({ ...f, action: e.target.value }))}
            className="border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted"
          >
            <option value="">All actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
          <input
            value={filters.model}
            onChange={(e) => setFilters(f => ({ ...f, model: e.target.value }))}
            placeholder="Filter model..."
            className="border border-border bg-surface px-3 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary placeholder:text-subtle w-36"
          />
          <input
            value={filters.actor}
            onChange={(e) => setFilters(f => ({ ...f, actor: e.target.value }))}
            placeholder="Filter actor..."
            className="border border-border bg-surface px-3 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary placeholder:text-subtle w-36"
          />
          <GlowButton size="sm" variant="outline" onClick={load}>Refresh</GlowButton>
        </div>
      </div>

      <TerminalWindow title="system://audit.log" prompt="">
        {loading ? (
          <p className="font-mono text-xs text-muted py-4">Loading...</p>
        ) : (
          <DataTable
            columns={columns}
            data={logs}
            keyField="id"
            emptyMessage="No audit entries yet. Changes to users, scenarios, instances and other tracked models will appear here."
          />
        )}
      </TerminalWindow>

      <CyberModal
        open={expandedEntry !== null}
        onClose={() => setExpanded(null)}
        title={
          expandedEntry
            ? `system://audit.diff/${expandedEntry.model_name}#${expandedEntry.object_id}`
            : "system://audit.diff"
        }
        maxWidth="xl"
      >
        {expandedEntry && (
          <div className="space-y-4">
            {/* Metadata header */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-subtle">Action</p>
                <p className={`mt-0.5 font-bold uppercase ${ACTION_COLORS[expandedEntry.action]}`}>
                  {expandedEntry.action}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-subtle">Model</p>
                <p className="mt-0.5 text-primary">{expandedEntry.model_name}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-subtle">Actor</p>
                <p className="mt-0.5 text-foreground">{expandedEntry.actor_username || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-subtle">IP</p>
                <p className="mt-0.5 text-muted">{expandedEntry.ip_address ?? "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-subtle">Object</p>
                <p className="mt-0.5 text-foreground break-all">{expandedEntry.object_repr || `#${expandedEntry.object_id}`}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-subtle">Timestamp</p>
                <p className="mt-0.5 text-muted tabular-nums">{new Date(expandedEntry.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="h-px w-full bg-border/40" />

            {/* Field diffs */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-3">Field changes</p>
              <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-subtle mb-1">
                <span>Field</span>
                <div className="grid grid-cols-2 gap-3">
                  <span>Old → New</span>
                </div>
              </div>
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                {Object.entries(expandedEntry.changes).map(([field, diff]) => (
                  <div key={field} className="grid grid-cols-[140px_1fr_1fr] gap-3 font-mono text-xs border-b border-border/30 pb-1.5">
                    <span className="text-primary font-semibold truncate" title={field}>{field}</span>
                    <span className="text-danger/80 line-through break-all" title={String(diff.old)}>
                      {diff.old === null ? "null" : String(diff.old)}
                    </span>
                    <span className="text-success break-all" title={String(diff.new)}>
                      {diff.new === null ? "null" : String(diff.new)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {expandedEntry.user_agent && (
              <p className="font-mono text-[10px] text-subtle break-all border-t border-border/40 pt-3">
                <span className="text-muted">UA:</span> {expandedEntry.user_agent}
              </p>
            )}

            <div className="flex justify-end">
              <GlowButton variant="outline" size="sm" onClick={() => setExpanded(null)}>Close</GlowButton>
            </div>
          </div>
        )}
      </CyberModal>
    </div>
  );
}

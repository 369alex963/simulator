"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { PulseDot } from "@/components/cyber/pulse-dot";
import { CyberModal } from "@/components/cyber/cyber-modal";

type SecurityEntry = {
  id: number;
  event_type: string;
  event_type_display: string;
  severity: "info" | "warn" | "critical";
  actor_username: string;
  ip_address: string | null;
  user_agent: string;
  country_code: string;
  details: Record<string, unknown>;
  created_at: string;
};

const SEVERITY_COLOR: Record<string, "success" | "warning" | "danger"> = {
  info: "success",
  warn: "warning",
  critical: "danger",
};

const EVENT_COLOR: Record<string, string> = {
  login_fail: "text-danger",
  login_ok: "text-success",
  logout: "text-muted",
  permission_denied: "text-warning",
  password_reset: "text-primary",
  password_change: "text-primary",
  account_locked: "text-danger",
  suspicious_request: "text-danger",
  rate_limit: "text-warning",
  super_admin_action: "text-warning",
};

export default function SecurityLogPage() {
  const [logs, setLogs] = useState<SecurityEntry[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filters, setFilters] = useState({ event_type: "", severity: "", actor: "", ip: "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.event_type) params.set("event_type", filters.event_type);
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.actor) params.set("actor", filters.actor);
    if (filters.ip) params.set("ip", filters.ip);
    try {
      const data = await api.get<SecurityEntry[]>(`/api/audit/security/?${params}`);
      setLogs(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filters]);

  const failedLogins = logs.filter(l => l.event_type === "login_fail").length;
  const permDenied = logs.filter(l => l.event_type === "permission_denied").length;
  const criticals = logs.filter(l => l.severity === "critical").length;

  const columns: Column<SecurityEntry>[] = [
    { key: "created_at", header: "Time", render: (r) => (
      <span className="font-mono text-xs text-muted tabular-nums">
        {new Date(r.created_at).toLocaleString()}
      </span>
    )},
    { key: "severity", header: "Sev.", render: (r) => (
      <span className="flex items-center gap-1.5">
        <PulseDot color={SEVERITY_COLOR[r.severity] ?? "primary"} size="sm" />
        <span className="font-mono text-[10px] uppercase">{r.severity}</span>
      </span>
    )},
    { key: "event_type", header: "Event", render: (r) => (
      <span className={`font-mono text-xs font-semibold ${EVENT_COLOR[r.event_type] ?? "text-muted"}`}>
        {r.event_type_display}
      </span>
    )},
    { key: "actor_username", header: "Actor", render: (r) => (
      <span className="text-foreground font-mono text-xs">{r.actor_username || "anonymous"}</span>
    )},
    { key: "ip_address", header: "IP", render: (r) => (
      <span className="text-muted font-mono text-xs">{r.ip_address ?? "—"}</span>
    )},
    { key: "country_code", header: "Country", render: (r) => (
      <span className="text-muted font-mono text-xs">{r.country_code || "—"}</span>
    )},
    { key: "id", header: "Details", render: (r) => {
      const hasDetails = Object.keys(r.details).length > 0;
      // Always allow inspection — we may still want to see UA / actor / IP
      return (
        <button
          onClick={() => setExpanded(r.id)}
          className="font-mono text-xs text-primary hover:text-primary-glow underline"
        >
          {hasDetails ? "View →" : "Inspect →"}
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
            SECURITY <span className="text-primary text-glow">LOG</span>
          </h1>
          <p className="font-mono text-xs text-muted">
            {logs.length} events · {failedLogins} failed logins · {permDenied} permission denials · {criticals} critical
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filters.event_type}
            onChange={(e) => setFilters(f => ({ ...f, event_type: e.target.value }))}
            className="border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted"
          >
            <option value="">All events</option>
            <option value="login_fail">Login Failed</option>
            <option value="login_ok">Login OK</option>
            <option value="logout">Logout</option>
            <option value="permission_denied">Permission Denied</option>
            <option value="password_change">Password Changed</option>
            <option value="password_reset">Password Reset</option>
            <option value="super_admin_action">Super-Admin Action</option>
          </select>
          <select
            value={filters.severity}
            onChange={(e) => setFilters(f => ({ ...f, severity: e.target.value }))}
            className="border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted"
          >
            <option value="">All severities</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <input
            value={filters.actor}
            onChange={(e) => setFilters(f => ({ ...f, actor: e.target.value }))}
            placeholder="Filter actor..."
            className="border border-border bg-surface px-3 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary placeholder:text-subtle w-32"
          />
          <input
            value={filters.ip}
            onChange={(e) => setFilters(f => ({ ...f, ip: e.target.value }))}
            placeholder="Filter IP..."
            className="border border-border bg-surface px-3 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary placeholder:text-subtle w-32"
          />
          <GlowButton size="sm" variant="outline" onClick={load}>Refresh</GlowButton>
        </div>
      </div>

      {/* Summary stat strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Failed Logins", value: failedLogins, color: "text-danger" },
          { label: "Permission Denials", value: permDenied, color: "text-warning" },
          { label: "Critical Events", value: criticals, color: "text-danger" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-border bg-surface-1 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</p>
            <p className={`font-mono text-2xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <TerminalWindow title="system://security.log" prompt="">
        {loading ? (
          <p className="font-mono text-xs text-muted py-4">Loading...</p>
        ) : (
          <DataTable
            columns={columns}
            data={logs}
            keyField="id"
            emptyMessage="No security events yet. Login attempts, permission denials, and password changes will appear here."
          />
        )}
      </TerminalWindow>

      <CyberModal
        open={expandedEntry !== null}
        onClose={() => setExpanded(null)}
        title={
          expandedEntry
            ? `system://security.event/${expandedEntry.event_type}`
            : "system://security.event"
        }
        maxWidth="xl"
      >
        {expandedEntry && (
          <div className="space-y-4">
            {/* Header strip with event + severity */}
            <div className="flex items-center justify-between gap-3 border border-border/50 bg-surface-2/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <PulseDot color={SEVERITY_COLOR[expandedEntry.severity] ?? "primary"} size="sm" />
                <span className={`font-display text-base font-bold ${EVENT_COLOR[expandedEntry.event_type] ?? "text-foreground"}`}>
                  {expandedEntry.event_type_display}
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                {expandedEntry.severity}
              </span>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-subtle">Actor</p>
                <p className="mt-0.5 text-foreground break-all">{expandedEntry.actor_username || "anonymous"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-subtle">IP</p>
                <p className="mt-0.5 text-muted">{expandedEntry.ip_address ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-subtle">Country</p>
                <p className="mt-0.5 text-muted">{expandedEntry.country_code || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-subtle">Timestamp</p>
                <p className="mt-0.5 text-muted tabular-nums">{new Date(expandedEntry.created_at).toLocaleString()}</p>
              </div>
            </div>

            {/* Free-form details */}
            {Object.keys(expandedEntry.details).length > 0 && (
              <>
                <div className="h-px w-full bg-border/40" />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2">Event details</p>
                  <div className="font-mono text-xs space-y-1.5 max-h-[40vh] overflow-y-auto border border-border/30 bg-surface-2/40 p-3">
                    {Object.entries(expandedEntry.details).map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[110px_1fr] gap-3">
                        <span className="text-primary truncate" title={k}>{k}</span>
                        <span className="text-foreground/85 break-all">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {expandedEntry.user_agent && (
              <div className="border-t border-border/40 pt-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle mb-1">User Agent</p>
                <p className="font-mono text-[10px] text-muted break-all">{expandedEntry.user_agent}</p>
              </div>
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

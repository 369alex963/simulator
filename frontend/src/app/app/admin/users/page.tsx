"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { PulseDot } from "@/components/cyber/pulse-dot";
import { CyberModal } from "@/components/cyber/cyber-modal";
import { PasswordInput } from "@/components/cyber/password-input";
import type { User, Branch } from "@/types";

type UserRow = User & { id: number; is_super_admin: boolean; created_via?: string };

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<UserRow | null>(null);
  const [pwdValue, setPwdValue] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "student", branch_id: "" });
  const [error, setError] = useState("");

  // Filters
  const [roleFilter, setRoleFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [moodleOnly, setMoodleOnly] = useState(false);
  const [search, setSearch] = useState("");

  const load = () => {
    const params = new URLSearchParams();
    if (roleFilter) params.set("role", roleFilter);
    if (branchFilter) params.set("branch", branchFilter);
    if (moodleOnly) params.set("created_via", "moodle");
    if (search.trim()) params.set("search", search.trim());
    const q = params.toString() ? `?${params}` : "";
    api.get<UserRow[]>(`/api/users/${q}`).then(setUsers).catch(() => {});
  };
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    load();
    api.get<Branch[]>("/api/branches/").then(setBranches).catch(() => {});
  }, [roleFilter, branchFilter, moodleOnly, search]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleCreate = async () => {
    setError("");
    try {
      await api.post("/api/users/", { ...form, branch_id: Number(form.branch_id) });
      setCreateOpen(false);
      setForm({ username: "", email: "", password: "", role: "student", branch_id: "" });
      load();
    } catch (e) {
      if (e instanceof ApiError) setError(JSON.stringify(e.data));
    }
  };

  const handleDelete = async (id: number, isSuperAdmin: boolean) => {
    if (isSuperAdmin) { alert("Cannot delete the super-admin."); return; }
    if (!confirm("Delete this user?")) return;
    try { await api.delete(`/api/users/${id}/`); load(); } catch { /* ignore */ }
  };

  const openPwdModal = (u: UserRow) => {
    setPwdTarget(u);
    setPwdValue("");
    setPwdError("");
    setPwdSuccess("");
  };

  const handleSetPassword = async (generateRandom: boolean) => {
    if (!pwdTarget) return;
    setPwdError(""); setPwdSuccess("");
    if (!generateRandom && pwdValue.length < 6) {
      setPwdError("Password must be at least 6 characters.");
      return;
    }
    try {
      const body = generateRandom ? {} : { password: pwdValue };
      const res = await api.post<{ detail: string; temp_password?: string }>(
        `/api/users/${pwdTarget.id}/reset-password/`, body
      );
      if (res.temp_password) {
        setPwdSuccess(`Generated password: ${res.temp_password}  (copy now — won't be shown again)`);
        setPwdValue(res.temp_password);
      } else {
        setPwdSuccess("Password updated. User must change on next login.");
      }
    } catch (e) {
      if (e instanceof ApiError) setPwdError((e.data as { detail?: string } | null)?.detail ?? "Reset failed.");
      else setPwdError("Reset failed.");
    }
  };

  const columns: Column<UserRow>[] = [
    { key: "username", header: "Username", render: (r) => (
      <span className="flex items-center gap-2">
        <span className="text-foreground font-semibold">{r.username}</span>
        {r.created_via === "moodle" && (
          <span className="text-[9px] uppercase tracking-wider border border-warning/40 text-warning/80 px-1">moodle</span>
        )}
        {r.is_super_admin && (
          <span className="text-[9px] uppercase tracking-wider border border-primary/40 text-primary px-1">super</span>
        )}
      </span>
    )},
    { key: "email", header: "Email", render: (r) => <span className="text-muted">{r.email}</span> },
    { key: "role", header: "Role", render: (r) => (
      <span className="border border-primary/30 px-1.5 py-0.5 text-[10px] uppercase text-primary">{r.display_role}</span>
    )},
    { key: "branch", header: "Branch", render: (r) => <span className="text-muted">{r.branch?.name ?? "—"}</span> },
    { key: "is_active", header: "Status", render: (r) => (
      <PulseDot color={r.is_active ? "success" : "danger"} size="sm" />
    )},
    { key: "id", header: "Actions", render: (r) => (
      <div className="flex gap-2 flex-wrap">
        <GlowButton variant="outline" size="sm" onClick={() => openPwdModal(r)}>Set Password</GlowButton>
        <GlowButton variant="danger" size="sm" onClick={() => handleDelete(r.id, r.is_super_admin)}>Delete</GlowButton>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            USER <span className="text-primary text-glow">MANAGEMENT</span>
          </h1>
          <p className="font-mono text-xs text-muted">{users.length} users</p>
        </div>
        <GlowButton onClick={() => setCreateOpen(true)}>+ New User</GlowButton>
      </div>

      {/* Filters */}
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search username / email..."
          className="border border-border bg-surface px-3 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary placeholder:text-subtle"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted"
        >
          <option value="">All roles</option>
          <option value="admin">admin</option>
          <option value="admin_user">admin_user</option>
          <option value="branch_manager">branch_manager</option>
          <option value="teacher">teacher</option>
          <option value="student">student</option>
        </select>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted"
        >
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <label className="flex items-center gap-2 border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted cursor-pointer hover:border-primary/40">
          <input type="checkbox" checked={moodleOnly} onChange={(e) => setMoodleOnly(e.target.checked)} className="accent-current" />
          <span>Moodle-imported only</span>
        </label>
      </div>

      <CyberModal open={createOpen} onClose={() => { setCreateOpen(false); setError(""); }} title="system://create.user" maxWidth="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Username</label>
            <input value={form.username} onChange={set("username")}
              className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Email</label>
            <input type="email" value={form.email} onChange={set("email")}
              className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Password</label>
            <PasswordInput value={form.password} onChange={set("password")} placeholder="min 6 chars, 1 uppercase" />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Role</label>
            <select value={form.role} onChange={set("role")}
              className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground">
              {["admin_user", "branch_manager", "teacher", "student"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Branch</label>
            <select value={form.branch_id} onChange={set("branch_id")}
              className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground">
              <option value="">Select branch...</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="mt-2 font-mono text-xs text-danger">✗ {error}</p>}
        <div className="mt-4 flex gap-3">
          <GlowButton onClick={handleCreate}>Create User</GlowButton>
          <GlowButton variant="outline" onClick={() => { setCreateOpen(false); setError(""); }}>Cancel</GlowButton>
        </div>
      </CyberModal>

      {/* Set password modal */}
      <CyberModal
        open={!!pwdTarget}
        onClose={() => setPwdTarget(null)}
        title="system://set.password"
        maxWidth="md"
      >
        {pwdTarget && (
          <div className="space-y-4">
            <div className="font-mono text-xs text-muted">
              Setting password for: <span className="text-primary font-semibold">{pwdTarget.username}</span>
              <span className="text-subtle"> ({pwdTarget.email})</span>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">New Password</label>
              <PasswordInput
                value={pwdValue}
                onChange={(e) => setPwdValue(e.target.value)}
                placeholder="enter new password (min 6 chars)"
                autoFocus
              />
              <p className="font-mono text-[10px] text-subtle">
                User will be required to change this password on next login.
              </p>
            </div>
            {pwdError && <p className="font-mono text-xs text-danger">✗ {pwdError}</p>}
            {pwdSuccess && (
              <div className="border border-success/40 bg-success/8 px-3 py-2 font-mono text-xs text-success break-all">
                ◈ {pwdSuccess}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <GlowButton onClick={() => handleSetPassword(false)} disabled={!pwdValue}>
                Set Password
              </GlowButton>
              <GlowButton variant="outline" onClick={() => handleSetPassword(true)}>
                Generate Random
              </GlowButton>
              <GlowButton variant="secondary" onClick={() => setPwdTarget(null)}>Close</GlowButton>
            </div>
          </div>
        )}
      </CyberModal>

      <TerminalWindow title="system://users.list" prompt="">
        <DataTable columns={columns} data={users} keyField="id" emptyMessage="No users match the filters." />
      </TerminalWindow>
    </div>
  );
}

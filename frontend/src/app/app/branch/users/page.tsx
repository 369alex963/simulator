"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { DataTable, type Column } from "@/components/cyber/data-table";
import type { User } from "@/types";

type UserRow = User & { id: number };

export default function BranchUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "teacher" });
  const [error, setError] = useState("");

  const load = () => api.get<UserRow[]>("/api/users/").then(setUsers).catch(() => {});
  useEffect(() => { load(); }, []);

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));

  const handleCreate = async () => {
    setError("");
    try {
      await api.post("/api/users/", form);
      setCreating(false);
      setForm({ username: "", email: "", password: "", role: "teacher" });
      load();
    } catch (e) {
      if (e instanceof ApiError) setError(JSON.stringify(e.data));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    try { await api.delete(`/api/users/${id}/`); load(); } catch { /* ignore */ }
  };

  const columns: Column<UserRow>[] = [
    { key: "username", header: "Username", render: (r) => <span className="text-foreground">{r.username}</span> },
    { key: "email", header: "Email", render: (r) => <span className="text-muted">{r.email}</span> },
    { key: "role", header: "Role", render: (r) => (
      <span className="border border-primary/30 px-1.5 py-0.5 text-[10px] uppercase text-primary">{r.display_role}</span>
    )},
    { key: "id", header: "", render: (r) => (
      <GlowButton variant="danger" size="sm" onClick={() => handleDelete(r.id)}>Delete</GlowButton>
    )},
  ];

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            BRANCH <span className="text-primary text-glow">USERS</span>
          </h1>
          <p className="font-mono text-xs text-muted">{users.length} users in your branch</p>
        </div>
        <GlowButton onClick={() => setCreating(!creating)}>+ New User</GlowButton>
      </div>

      {creating && (
        <TerminalWindow title="system://create.user" prompt="">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: "username", label: "Username", type: "text" },
              { id: "email", label: "Email", type: "email" },
              { id: "password", label: "Password", type: "password" },
            ].map(({ id, label, type }) => (
              <div key={id} className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</label>
                <input type={type} value={form[id as keyof typeof form]} onChange={set(id)}
                  className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary" />
              </div>
            ))}
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Role</label>
              <select value={form.role} onChange={set("role")}
                className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground">
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>
          </div>
          {error && <p className="mt-2 font-mono text-xs text-danger">✗ {error}</p>}
          <div className="mt-4 flex gap-3">
            <GlowButton onClick={handleCreate}>Create User</GlowButton>
            <GlowButton variant="outline" onClick={() => setCreating(false)}>Cancel</GlowButton>
          </div>
        </TerminalWindow>
      )}

      <TerminalWindow title="system://branch.users" prompt="">
        <DataTable columns={columns} data={users} keyField="id" emptyMessage="No users in this branch." />
      </TerminalWindow>
    </div>
  );
}

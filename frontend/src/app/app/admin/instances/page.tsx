"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { PulseDot } from "@/components/cyber/pulse-dot";
import { CyberModal } from "@/components/cyber/cyber-modal";

type InstanceRow = {
  id: number;
  name: string;
  status: string;
  branch_name: string;
  scenario_name: string;
  registration_open: boolean;
  enrollment_count: number;
  created_at: string;
};

type Branch = { id: number; name: string };
type Scenario = { id: number; name: string; question_count: number };

const STATUS_COLORS: Record<string, "success" | "primary" | "warning" | "danger"> = {
  open: "success", paused: "warning", closed: "danger", archived: "danger", draft: "primary",
};

export default function AdminInstancesPage() {
  const router = useRouter();
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [form, setForm] = useState({
    name: "", branch_id: "", scenario_id: "",
    registration_open: true, moodle_course_id: "", moodle_auto_push: false,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => api.get<InstanceRow[]>("/api/instances/").then(setInstances).catch(() => {});
  useEffect(() => { load(); }, []);

  const openModal = () => {
    setBranches([]); setScenarios([]);
    api.get<Branch[]>("/api/branches/").then(setBranches).catch(() => {});
    api.get<Scenario[]>("/api/scenarios/").then(setScenarios).catch(() => {});
    setOpen(true);
  };

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({
      ...p,
      [f]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value,
    }));

  const handleCreate = async () => {
    setError(""); setSaving(true);
    try {
      await api.post("/api/instances/", {
        name: form.name,
        branch_id: Number(form.branch_id),
        scenario_id: form.scenario_id ? Number(form.scenario_id) : null,
        registration_open: form.registration_open,
        moodle_course_id: form.moodle_course_id,
        moodle_auto_push: form.moodle_auto_push,
      });
      setOpen(false);
      setForm({ name: "", branch_id: "", scenario_id: "", registration_open: true, moodle_course_id: "", moodle_auto_push: false });
      load();
    } catch (e) {
      if (e instanceof ApiError) setError((e.data as any)?.detail ?? JSON.stringify(e.data));
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async (id: number) => { await api.post(`/api/instances/${id}/pause/`); load(); };
  const handleArchive = async (id: number) => { if (!confirm("Archive?")) return; await api.post(`/api/instances/${id}/archive/`); load(); };
  const handleDelete = async (id: number) => { if (!confirm("Delete? This will delete all instance-only students.")) return; await api.delete(`/api/instances/${id}/`); load(); };

  const columns: Column<InstanceRow>[] = [
    { key: "name", header: "Instance", render: (r) => (
      <button onClick={() => router.push(`/app/admin/instances/${r.id}`)}
        className="text-primary hover:underline font-semibold text-left">{r.name}</button>
    )},
    { key: "status", header: "Status", render: (r) => (
      <span className="flex items-center gap-2">
        <PulseDot color={STATUS_COLORS[r.status] ?? "primary"} size="sm" />
        {r.status.toUpperCase()}
      </span>
    )},
    { key: "branch_name", header: "Branch", render: (r) => <span className="text-muted">{r.branch_name}</span> },
    { key: "scenario_name", header: "Scenario", render: (r) => <span className="text-muted">{r.scenario_name || "—"}</span> },
    { key: "enrollment_count", header: "Students", render: (r) => <span className="text-primary">{r.enrollment_count}</span> },
    { key: "registration_open", header: "Reg.", render: (r) => (
      <span className={r.registration_open ? "text-success" : "text-muted"}>{r.registration_open ? "Open" : "Closed"}</span>
    )},
    { key: "id", header: "Actions", render: (r) => (
      <div className="flex gap-1.5">
        {r.status !== "archived" && (
          <>
            <GlowButton size="sm" variant="outline" onClick={() => handlePause(r.id)}>
              {r.status === "paused" ? "Resume" : "Pause"}
            </GlowButton>
            <GlowButton size="sm" variant="secondary" onClick={() => handleArchive(r.id)}>Archive</GlowButton>
          </>
        )}
        <GlowButton size="sm" variant="danger" onClick={() => handleDelete(r.id)}>Delete</GlowButton>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            INSTANCE <span className="text-primary text-glow">CONTROL</span>
          </h1>
          <p className="font-mono text-xs text-muted">{instances.length} instances</p>
        </div>
        <GlowButton onClick={openModal}>+ New Instance</GlowButton>
      </div>

      <CyberModal open={open} onClose={() => { setOpen(false); setError(""); }} title="system://create.instance" maxWidth="xl">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Instance Name</label>
            <input value={form.name} onChange={set("name")} autoFocus
              placeholder="e.g. Cyber Security Exam — Spring 2025"
              className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary placeholder:text-subtle" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Branch</label>
              <select value={form.branch_id} onChange={set("branch_id")}
                className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground">
                <option value="">Select branch...</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Scenario</label>
              <select value={form.scenario_id} onChange={set("scenario_id")}
                className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground">
                <option value="">No scenario yet</option>
                {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.question_count}q)</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Moodle Course ID (optional)</label>
            <input value={form.moodle_course_id} onChange={set("moodle_course_id")} placeholder="42"
              className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary placeholder:text-subtle" />
          </div>

          <div className="flex flex-col gap-2 font-mono text-sm text-muted">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.registration_open} onChange={set("registration_open")} />
              Open registration immediately
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.moodle_auto_push} onChange={set("moodle_auto_push")} />
              Auto-push grades to Moodle on completion
            </label>
          </div>

          {error && <p className="font-mono text-xs text-danger">&#x2717; {error}</p>}

          <div className="flex gap-3">
            <GlowButton onClick={handleCreate} disabled={saving || !form.name.trim() || !form.branch_id}>
              {saving ? "Creating..." : "Create Instance"}
            </GlowButton>
            <GlowButton variant="outline" onClick={() => { setOpen(false); setError(""); }}>Cancel</GlowButton>
          </div>
        </div>
      </CyberModal>

      <TerminalWindow title="system://instances.list" prompt="">
        <DataTable columns={columns} data={instances} keyField="id" emptyMessage="No instances." />
      </TerminalWindow>
    </div>
  );
}

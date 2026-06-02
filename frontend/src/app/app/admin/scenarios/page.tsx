"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { CyberModal } from "@/components/cyber/cyber-modal";

type ScenarioRow = {
  id: number;
  name: string;
  description: string;
  question_count: number;
  base_points_total: number;
  allow_hints: boolean;
  randomize_questions: boolean;
  sequential: boolean;
  created_at: string;
};

export default function ScenariosPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", allow_hints: false, randomize_questions: false, sequential: true });

  const load = () => api.get<ScenarioRow[]>("/api/scenarios/").then(setScenarios).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      const created = await api.post<ScenarioRow>("/api/scenarios/", form);
      setOpen(false);
      router.push(`/app/admin/scenarios/${created.id}`);
    } catch { /* error */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this scenario? This cannot be undone. Instances using this scenario must be closed/archived first.")) return;
    try {
      await api.delete(`/api/scenarios/${id}/`);
      load();
    } catch (err) {
      const e = err as { data?: { detail?: string } };
      alert(e?.data?.detail ?? "Cannot delete scenario.");
    }
  };

  const exportCSV = (id: number) => { window.open(`/api/scenarios/${id}/export-csv/`, "_blank"); };
  const exportJSON = (id: number) => { window.open(`/api/scenarios/${id}/export-json/`, "_blank"); };

  const columns: Column<ScenarioRow>[] = [
    { key: "name", header: "Name", render: (r) => (
      <button onClick={() => router.push(`/app/admin/scenarios/${r.id}`)}
        className="text-primary hover:text-primary-glow hover:underline font-semibold text-left">{r.name}</button>
    )},
    { key: "question_count", header: "Questions", render: (r) => <span className="text-primary">{r.question_count}</span> },
    { key: "base_points_total", header: "Base Pts", render: (r) => (
      <span className={r.base_points_total > 100 ? "text-danger" : "text-foreground"}>{r.base_points_total}</span>
    )},
    { key: "allow_hints", header: "Hints", render: (r) => <span className={r.allow_hints ? "text-success" : "text-subtle"}>{r.allow_hints ? "Yes" : "No"}</span> },
    { key: "sequential", header: "Sequential", render: (r) => <span className={r.sequential ? "text-success" : "text-warning"}>{r.sequential ? "Yes" : "No"}</span> },
    { key: "id", header: "", render: (r) => (
      <div className="flex gap-2 flex-wrap">
        <GlowButton size="sm" onClick={() => router.push(`/app/admin/scenarios/${r.id}`)}>Edit</GlowButton>
        <GlowButton size="sm" variant="outline" onClick={() => exportCSV(r.id)}>CSV</GlowButton>
        <GlowButton size="sm" variant="outline" onClick={() => exportJSON(r.id)}>JSON</GlowButton>
        <GlowButton variant="danger" size="sm" onClick={() => handleDelete(r.id)}>Delete</GlowButton>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            SCENARIO <span className="text-primary text-glow">LIBRARY</span>
          </h1>
          <p className="font-mono text-xs text-muted">{scenarios.length} scenarios · max 100 pts per scenario</p>
        </div>
        <GlowButton onClick={() => setOpen(true)}>+ New Scenario</GlowButton>
      </div>

      <CyberModal open={open} onClose={() => setOpen(false)} title="system://create.scenario" maxWidth="lg">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Scenario Name</label>
              <input value={form.name} onChange={(e) => setForm(p => ({...p, name: e.target.value}))}
                autoFocus
                className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary" />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Description</label>
              <input value={form.description} onChange={(e) => setForm(p => ({...p, description: e.target.value}))}
                className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary" />
            </div>
          </div>

          <div className="flex gap-6 font-mono text-sm text-muted">
            {[
              { id: "allow_hints", label: "Allow Hints" },
              { id: "randomize_questions", label: "Randomize Order" },
              { id: "sequential", label: "Sequential Answering" },
            ].map(({ id, label }) => (
              <label key={id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[id as keyof typeof form] as boolean}
                  onChange={(e) => setForm(p => ({...p, [id]: e.target.checked}))}
                  className="accent-current" />
                {label}
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <GlowButton onClick={handleCreate} disabled={!form.name.trim()}>Create &amp; Add Questions</GlowButton>
            <GlowButton variant="outline" onClick={() => setOpen(false)}>Cancel</GlowButton>
          </div>
        </div>
      </CyberModal>

      <TerminalWindow title="system://scenarios.list" prompt="">
        <DataTable columns={columns} data={scenarios} keyField="id" emptyMessage="No scenarios yet. Create one above." />
      </TerminalWindow>
    </div>
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { StatTile } from "@/components/cyber/stat-tile";

type Question = {
  id: number;
  order: number;
  title: string;
  prompt: string;
  question_type: "text" | "multiple_choice" | "true_false";
  is_bonus: boolean;
  base_points: number;
  choices: string[] | null;
  hint: string;
  explanation: string;
};

type ScoringRules = {
  id: number;
  attempt_penalty_after_n: number;
  attempt_penalty_per_mistake: number;
  max_attempt_penalty: number;
  time_penalty_threshold_minutes: number;
  time_penalty_per_minute: number;
  max_time_penalty: number;
  hint_penalty: number;
};

type ScenarioDetail = {
  id: number;
  name: string;
  description: string;
  allow_hints: boolean;
  randomize_questions: boolean;
  sequential: boolean;
  question_count: number;
  base_points_total: number;
  questions: Question[];
  scoring_rules: ScoringRules;
};

type QFormState = {
  title: string; prompt: string;
  question_type: "text" | "multiple_choice" | "true_false";
  is_bonus: boolean; base_points: number; correct_answer: string;
  choices_raw: string; hint: string;
};

const EMPTY_Q: QFormState = {
  title: "", prompt: "", question_type: "text",
  is_bonus: false, base_points: 5, correct_answer: "",
  choices_raw: "", hint: "",
};

export default function ScenarioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const [addingQ, setAddingQ] = useState(false);
  const [editingRules, setEditingRules] = useState(false);
  const [qForm, setQForm] = useState(EMPTY_Q);
  const [rules, setRules] = useState<Partial<ScoringRules>>({});
  const [error, setError] = useState("");
  const [ruleSaved, setRuleSaved] = useState(false);

  const load = () =>
    api.get<ScenarioDetail>(`/api/scenarios/${id}/`).then((s) => {
      setScenario(s);
      setRules(s.scoring_rules ?? {});
    }).catch(() => {});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  const setQ = (f: keyof QFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setQForm((p) => ({ ...p, [f]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value } as QFormState));

  const handleAddQuestion = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    // Parse choices from pipe-separated string
    const choices = qForm.question_type === "multiple_choice"
      ? qForm.choices_raw.split("|").map((c) => c.trim()).filter(Boolean)
      : null;

    try {
      await api.post(`/api/scenarios/${id}/questions/`, {
        order: (scenario?.question_count ?? 0) + 1,
        title: qForm.title,
        prompt: qForm.prompt,
        question_type: qForm.question_type,
        is_bonus: qForm.is_bonus,
        base_points: Number(qForm.base_points),
        correct_answer: qForm.correct_answer,
        choices,
        hint: qForm.hint,
      });
      setAddingQ(false);
      setQForm(EMPTY_Q);
      load();
    } catch (e) {
      if (e instanceof ApiError) setError((e.data as any)?.detail ?? JSON.stringify(e.data));
    }
  };

  const handleDeleteQuestion = async (qid: number) => {
    if (!confirm("Delete question?")) return;
    await api.delete(`/api/scenarios/${id}/questions/${qid}/`);
    load();
  };

  const handleSaveRules = async () => {
    await api.patch(`/api/scenarios/${id}/scoring-rules/`, rules);
    setRuleSaved(true);
    setTimeout(() => setRuleSaved(false), 1800);
    load();
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Build FormData fresh for each request — FormData streams are consumed by fetch
    const buildForm = () => {
      const fd = new FormData();
      fd.append("file", file);
      return fd;
    };

    // Preview pass
    let previewData: { rows?: unknown[]; count?: number; errors?: string[]; detail?: string };
    try {
      const res = await fetch(`/api/scenarios/${id}/import-csv/?preview=1`, {
        method: "POST", credentials: "include", body: buildForm(),
      });
      previewData = await res.json();
      if (!res.ok) {
        alert(previewData.errors?.join("\n") ?? previewData.detail ?? `HTTP ${res.status}`);
        e.target.value = ""; return;
      }
    } catch (err) {
      alert(`Preview failed: ${err}`);
      e.target.value = ""; return;
    }

    if (!confirm(`Import ${previewData.count} questions? This will overwrite existing questions with the same order.`)) {
      e.target.value = ""; return;
    }

    // Real import — fresh FormData
    try {
      const res = await fetch(`/api/scenarios/${id}/import-csv/`, {
        method: "POST", credentials: "include", body: buildForm(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Import failed: ${err.errors?.join("\n") ?? err.detail ?? res.status}`);
      }
    } catch (err) {
      alert(`Import failed: ${err}`);
    } finally {
      e.target.value = "";
      load();
    }
  };

  const qColumns: Column<Question>[] = [
    { key: "order", header: "Q#", render: (r) => <span className="text-primary font-bold">Q{r.order}{r.is_bonus ? " [B]" : ""}</span> },
    { key: "title", header: "Title", render: (r) => <span className="text-foreground">{r.title}</span> },
    { key: "question_type", header: "Type", render: (r) => <span className="text-muted uppercase text-xs">{r.question_type.replace("_", " ")}</span> },
    { key: "base_points", header: "Pts", render: (r) => <span className="text-primary">{r.base_points}</span> },
    { key: "id", header: "", render: (r) => (
      <GlowButton variant="danger" size="sm" onClick={() => handleDeleteQuestion(r.id)}>Delete</GlowButton>
    )},
  ];

  if (!scenario) return <p className="font-mono text-muted p-6">Loading...</p>;

  const remaining = 100 - scenario.base_points_total;

  return (
    <div className="space-y-6 animate-rise">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <button onClick={() => router.push("/app/admin/scenarios")} className="font-mono text-xs text-muted hover:text-primary mb-2 block">
            ← Back to Scenarios
          </button>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {scenario.name}
          </h1>
          <p className="font-mono text-xs text-muted">{scenario.description}</p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="inline-flex items-center gap-2 border border-border px-3 py-1.5 font-mono text-xs text-muted cursor-pointer hover:border-primary/40 hover:text-primary transition">
            ⇪ Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Questions" value={scenario.question_count} accent />
        <StatTile label="Base Points Total" value={scenario.base_points_total} />
        <StatTile label="Pts Remaining (cap 100)" value={remaining} accent={remaining > 0} />
        <StatTile label="Bonus Questions" value={scenario.questions.filter(q => q.is_bonus).length} />
      </div>

      {/* Scenario flags */}
      <TerminalWindow title="system://scenario.config" prompt="">
        <div className="flex flex-wrap gap-6 font-mono text-sm">
          {[
            { label: "Allow Hints", val: scenario.allow_hints },
            { label: "Randomize Order", val: scenario.randomize_questions },
            { label: "Sequential Answering", val: scenario.sequential },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={val ? "text-success" : "text-subtle"}>{val ? "●" : "○"}</span>
              <span className="text-muted">{label}</span>
            </div>
          ))}
        </div>
      </TerminalWindow>

      {/* Question list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">
            QUESTIONS  <span className="text-primary text-glow">({scenario.question_count})</span>
          </h2>
          <div className="flex gap-2">
            <GlowButton variant="outline" size="sm" onClick={() => setEditingRules(!editingRules)}>
              Scoring Rules
            </GlowButton>
            <GlowButton size="sm" onClick={() => setAddingQ(!addingQ)}>+ Add Question</GlowButton>
          </div>
        </div>

        {/* Add Question form */}
        {addingQ && (
          <TerminalWindow title="system://add.question" prompt="">
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Question Title</label>
                  <input value={qForm.title} onChange={setQ("title")} required
                    placeholder="e.g. Recon — SSH Port Scan"
                    className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary placeholder:text-subtle" />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Prompt / Question Body</label>
                  <textarea value={qForm.prompt} onChange={setQ("prompt")} required rows={3}
                    placeholder="Describe the scenario and what the student must do..."
                    className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary placeholder:text-subtle" />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Type</label>
                  <select value={qForm.question_type} onChange={setQ("question_type")}
                    className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground">
                    <option value="text">Text Input</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Correct Answer</label>
                  <input value={qForm.correct_answer} onChange={setQ("correct_answer")} required
                    placeholder={qForm.question_type === "true_false" ? "True or False" : "exact answer (case-insensitive)"}
                    className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary placeholder:text-subtle" />
                </div>

                {qForm.question_type === "multiple_choice" && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                      Answer Choices (pipe-separated: A|B|C|D)
                    </label>
                    <input value={qForm.choices_raw} onChange={setQ("choices_raw")} required
                      placeholder="Option A|Option B|Option C|Option D"
                      className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary placeholder:text-subtle" />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Base Points</label>
                  <input type="number" min="0.5" max="100" step="0.5" value={qForm.base_points} onChange={setQ("base_points")}
                    className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary" />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Hint (optional)</label>
                  <input value={qForm.hint} onChange={setQ("hint")} placeholder="Optional hint for students..."
                    className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary placeholder:text-subtle" />
                </div>
              </div>

              <label className="flex items-center gap-2 font-mono text-sm text-muted cursor-pointer">
                <input type="checkbox" checked={qForm.is_bonus}
                  onChange={(e) => setQForm((p) => ({ ...p, is_bonus: e.target.checked }))} />
                Bonus Question (points on top of 100-point cap, still subject to penalties)
              </label>

              {error && <p className="font-mono text-xs text-danger">✗ {error}</p>}

              <div className="flex gap-3">
                <GlowButton type="submit">Add Question</GlowButton>
                <GlowButton variant="outline" onClick={() => { setAddingQ(false); setError(""); }}>Cancel</GlowButton>
              </div>
            </form>
          </TerminalWindow>
        )}

        {/* Scoring rules editor */}
        {editingRules && scenario.scoring_rules && (
          <TerminalWindow title="system://scoring.rules" prompt="">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: "attempt_penalty_after_n", label: "Penalty after N wrong attempts" },
                { key: "attempt_penalty_per_mistake", label: "Penalty per mistake (pts)" },
                { key: "max_attempt_penalty", label: "Max attempt penalty (pts)" },
                { key: "time_penalty_threshold_minutes", label: "Time threshold (minutes)" },
                { key: "time_penalty_per_minute", label: "Penalty per minute (pts)" },
                { key: "max_time_penalty", label: "Max time penalty (pts)" },
                { key: "hint_penalty", label: "Hint penalty (pts, 0=none)" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</label>
                  <input type="number" step="0.01" min="0"
                    value={String(rules[key as keyof ScoringRules] ?? "")}
                    onChange={(e) => setRules((p) => ({ ...p, [key]: parseFloat(e.target.value) }))}
                    className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary" />
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <GlowButton onClick={handleSaveRules}>Save Rules</GlowButton>
              {ruleSaved && <span className="font-mono text-xs text-success">✓ Saved.</span>}
            </div>
          </TerminalWindow>
        )}

        <TerminalWindow title="system://questions.list" prompt="">
          <DataTable
            columns={qColumns}
            data={scenario.questions}
            keyField="id"
            emptyMessage="No questions yet. Add one above or import from CSV."
          />
        </TerminalWindow>

        {/* CSV format hint */}
        <div className="border border-border/50 rounded-sm px-4 py-3 font-mono text-xs text-subtle">
          CSV import format: <span className="text-muted">order, title, prompt, type (text/multiple_choice/true_false), is_bonus (true/false), base_points, correct_answer, choices (pipe-separated, optional), hint (optional)</span>
        </div>
      </div>
    </div>
  );
}

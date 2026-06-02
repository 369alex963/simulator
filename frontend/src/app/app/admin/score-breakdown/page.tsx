"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { DataTable, type Column } from "@/components/cyber/data-table";

type Row = {
  rank: number;
  username: string;
  questions_answered: number;
  status: string;
  score: number;
};

export default function ScoreBreakdownPage() {
  const [instances, setInstances] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => { api.get<any[]>("/api/instances/").then(setInstances).catch(() => {}); }, []);
  useEffect(() => {
    if (selected) {
      api.get<{ scoreboard: Row[] }>(`/api/exam/scoreboard/${selected}/`)
        .then((d) => setRows(d.scoreboard))
        .catch(() => {});
    }
  }, [selected]);

  const cols: Column<Row>[] = [
    { key: "rank", header: "#", render: (r) => <span className="text-primary font-bold">#{r.rank}</span> },
    { key: "username", header: "Student", render: (r) => <span className="text-foreground">{r.username}</span> },
    { key: "questions_answered", header: "Answered", render: (r) => <span className="text-primary">{r.questions_answered}</span> },
    { key: "score", header: "Score", render: (r) => (
      <span className={r.score >= 70 ? "text-success font-bold" : r.score >= 50 ? "text-warning" : "text-danger"}>
        {r.score?.toFixed?.(1) ?? "—"}
      </span>
    )},
    { key: "status", header: "Status", render: (r) => (
      <span className={r.status === "completed" ? "text-success" : "text-muted"}>{r.status}</span>
    )},
  ];

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          SCORE <span className="text-primary text-glow">BREAKDOWN</span>
        </h1>
        <p className="font-mono text-xs text-muted">Full scores visible to admins and staff only</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {instances.map((i) => (
          <button key={i.id} onClick={() => setSelected(i.id)}
            className={`border px-3 py-1.5 font-mono text-xs transition ${selected === i.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted hover:border-primary/40"}`}>
            {i.name}
          </button>
        ))}
      </div>

      {selected && (
        <TerminalWindow title="system://scores.breakdown" prompt="">
          <DataTable columns={cols} data={rows} keyField="rank" emptyMessage="No enrolled students." />
        </TerminalWindow>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { ScoreStatus } from "@/components/cyber/score-status";

type ScoreRow = {
  rank: number;
  username: string;
  questions_answered: number;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  bonus_answered: number;
  bonus_total: number;
  non_bonus_answered: number;
  non_bonus_total: number;
  all_bonus_answered: boolean;
  all_non_bonus_answered: boolean;
  is_submitted: boolean;
  total_active_seconds: number;
  score?: number;
};

type InstanceRow = { id: number; name: string };

export default function TeacherScoreboardsPage() {
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [rows, setRows] = useState<ScoreRow[]>([]);

  useEffect(() => {
    api.get<InstanceRow[]>("/api/instances/").then(setInstances).catch(() => {});
  }, []);
  useEffect(() => {
    if (selected) {
      api.get<{ scoreboard: ScoreRow[] }>(`/api/exam/scoreboard/${selected}/`)
        .then((d) => setRows(d.scoreboard))
        .catch(() => {});
    }
  }, [selected]);

  const columns: Column<ScoreRow>[] = [
    { key: "rank", header: "Rank", render: (r) => <span className="text-primary font-semibold">#{r.rank}</span> },
    { key: "username", header: "Student", render: (r) => <span className="text-foreground">{r.username}</span> },
    { key: "questions_answered", header: "Questions", render: (r) => <span className="text-primary tabular-nums">{r.questions_answered}</span> },
    { key: "bonus_answered", header: "Bonus", render: (r) => (
      r.bonus_total > 0
        ? <span className={r.all_bonus_answered ? "text-warning font-semibold tabular-nums" : "text-muted tabular-nums"}>
            {r.bonus_answered}/{r.bonus_total}
          </span>
        : <span className="text-subtle">—</span>
    )},
    { key: "score", header: "Score", render: (r) => (
      <span className="text-success tabular-nums">{r.score !== undefined ? r.score.toFixed(1) : "—"}</span>
    )},
    { key: "status", header: "Status", render: (r) => (
      <ScoreStatus
        status={r.status}
        allBonusAnswered={r.all_bonus_answered}
        bonusTotal={r.bonus_total}
        allNonBonusAnswered={r.all_non_bonus_answered}
        isSubmitted={r.is_submitted}
        startedAt={r.started_at}
      />
    )},
  ];

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          LIVE <span className="text-primary text-glow">SCOREBOARDS</span>
        </h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        {instances.map((i) => (
          <button
            key={i.id}
            onClick={() => setSelected(i.id)}
            className={`border px-3 py-1.5 font-mono text-xs transition ${
              selected === i.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted hover:border-primary/40"
            }`}
          >
            {i.name}
          </button>
        ))}
      </div>

      {selected && (
        <TerminalWindow title="system://scoreboard.live" prompt="">
          <DataTable columns={columns} data={rows} keyField="rank" emptyMessage="No students yet." />
        </TerminalWindow>
      )}
    </div>
  );
}

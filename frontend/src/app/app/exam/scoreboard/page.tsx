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

export default function StudentScoreboardPage() {
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [instanceName, setInstanceName] = useState("");

  useEffect(() => {
    api.get<{ enrollment_id: number; instance_id: number; instance_name: string }>("/api/exam/state/")
      .then((state) => {
        setInstanceName(state.instance_name);
        return api.get<{ scoreboard: ScoreRow[]; instance: string }>(`/api/exam/scoreboard/${state.instance_id}/`);
      })
      .then((data) => setRows(data.scoreboard))
      .catch(() => {});
  }, []);

  const columns: Column<ScoreRow>[] = [
    { key: "rank", header: "Rank", render: (r) => <span className="text-primary font-semibold">#{r.rank}</span>, className: "w-12" },
    { key: "username", header: "Operator", render: (r) => <span className="text-foreground">{r.username}</span> },
    { key: "questions_answered", header: "Questions", render: (r) => <span className="text-primary tabular-nums">{r.questions_answered}</span> },
    { key: "bonus_answered", header: "Bonus", render: (r) => (
      r.bonus_total > 0
        ? <span className={r.all_bonus_answered ? "text-warning font-semibold tabular-nums" : "text-muted tabular-nums"}>
            {r.bonus_answered}/{r.bonus_total}
          </span>
        : <span className="text-subtle">—</span>
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
          SCORE<span className="text-primary text-glow">BOARD</span>
        </h1>
        <p className="font-mono text-xs text-muted">{instanceName} · live ranking</p>
      </div>

      <TerminalWindow title="system://scoreboard.live" prompt="">
        <DataTable
          columns={columns}
          data={rows}
          keyField="rank"
          emptyMessage="No participants yet."
        />
      </TerminalWindow>

      <p className="font-mono text-[10px] text-subtle text-center uppercase tracking-[0.2em]">
        Ranked by score · star indicates all bonus questions answered
      </p>
    </div>
  );
}

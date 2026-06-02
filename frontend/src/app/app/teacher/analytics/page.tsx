"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { StatTile } from "@/components/cyber/stat-tile";

type QuestionRow = {
  question_id: number;
  order: number;
  title: string;
  is_bonus: boolean;
  total_attempts: number;
  correct_count: number;
  pct_correct: number;
  avg_attempts: number;
  avg_time_seconds: number;
};

type AnalyticsData = {
  instance_id: number;
  instance_name: string;
  enrollment_count: number;
  questions: QuestionRow[];
};

export default function TeacherAnalyticsPage() {
  const params = useSearchParams();
  const instanceId = params.get("instance");
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (instanceId) {
      api.get<AnalyticsData>(`/api/analytics/instance/${instanceId}/`).then(setData).catch(() => {});
    }
  }, [instanceId]);

  const cols: Column<QuestionRow>[] = [
    { key: "order", header: "Q#", render: (r) => <span className="text-primary">Q{r.order}{r.is_bonus ? " [B]" : ""}</span> },
    { key: "title", header: "Title", render: (r) => <span className="text-foreground">{r.title}</span> },
    { key: "pct_correct", header: "% Correct", render: (r) => (
      <span className={r.pct_correct >= 70 ? "text-success" : r.pct_correct >= 40 ? "text-warning" : "text-danger"}>
        {r.pct_correct}%
      </span>
    )},
    { key: "total_attempts", header: "Attempts", render: (r) => <span className="text-muted">{r.total_attempts}</span> },
    { key: "avg_attempts", header: "Avg Attempts", render: (r) => <span className="text-muted">{r.avg_attempts.toFixed(1)}</span> },
    { key: "avg_time_seconds", header: "Avg Time", render: (r) => (
      <span className="text-muted">{Math.floor(r.avg_time_seconds / 60)}m {Math.round(r.avg_time_seconds % 60)}s</span>
    )},
  ];

  if (!instanceId) return (
    <div className="p-6">
      <TerminalWindow title="system://analytics" prompt="">
        <p className="text-muted">Select an instance from <Link href="/app/teacher/instances" className="text-primary underline">My Instances</Link> to view analytics.</p>
      </TerminalWindow>
    </div>
  );

  if (!data) return <p className="font-mono text-muted p-6">Loading...</p>;

  const avgCorrect = data.questions.length
    ? data.questions.reduce((acc, q) => acc + q.pct_correct, 0) / data.questions.length
    : 0;

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          INSTANCE <span className="text-primary text-glow">ANALYTICS</span>
        </h1>
        <p className="font-mono text-xs text-muted">{data.instance_name}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile label="Students Enrolled" value={data.enrollment_count} accent />
        <StatTile label="Questions" value={data.questions.length} />
        <StatTile label="Avg Correct Rate" value={avgCorrect} decimals={1} suffix="%" accent />
      </div>

      <TerminalWindow title="system://question.analytics" prompt="">
        <DataTable columns={cols} data={data.questions} keyField="question_id" emptyMessage="No data." />
      </TerminalWindow>
    </div>
  );
}

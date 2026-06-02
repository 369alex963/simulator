"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { PulseDot } from "@/components/cyber/pulse-dot";

type HelpReq = {
  id: number;
  student: string;
  question: string | null;
  message: string;
  created_at: string;
};

export default function HelpRequestsPage() {
  const [instances, setInstances] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [reqs, setReqs] = useState<HelpReq[]>([]);

  useEffect(() => { api.get<any[]>("/api/instances/").then(setInstances).catch(() => {}); }, []);
  useEffect(() => {
    if (selected) {
      api.get<HelpReq[]>(`/api/notifications/help-requests/${selected}/`).then(setReqs).catch(() => {});
    }
  }, [selected]);

  const cols: Column<HelpReq>[] = [
    { key: "student", header: "Student", render: (r) => <span className="text-foreground font-semibold">{r.student}</span> },
    { key: "question", header: "Question", render: (r) => <span className="text-muted">{r.question ?? "—"}</span> },
    { key: "message", header: "Message", render: (r) => <span className="text-foreground">{r.message}</span> },
    { key: "created_at", header: "Time", render: (r) => <span className="text-muted font-mono text-xs">{new Date(r.created_at).toLocaleTimeString()}</span> },
  ];

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          HELP <span className="text-primary text-glow">REQUESTS</span>
        </h1>
        <p className="font-mono text-xs text-muted">Students requesting assistance during exam</p>
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
        <TerminalWindow title="system://help.requests" prompt="">
          {reqs.length === 0 ? (
            <div className="flex items-center gap-2 text-success font-mono text-sm">
              <PulseDot color="success" size="sm" />
              No pending help requests for this instance.
            </div>
          ) : (
            <DataTable columns={cols} data={reqs} keyField="id" emptyMessage="No requests." />
          )}
        </TerminalWindow>
      )}
    </div>
  );
}

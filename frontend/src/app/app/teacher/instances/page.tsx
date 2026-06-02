"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { PulseDot } from "@/components/cyber/pulse-dot";

type InstanceRow = {
  id: number;
  name: string;
  status: string;
  branch_name: string;
  scenario_name: string;
  enrollment_count: number;
  registration_open: boolean;
};

const STATUS_COLORS: Record<string, "success" | "primary" | "warning" | "danger"> = {
  open: "success", paused: "warning", closed: "danger", archived: "danger", draft: "primary",
};

type MsgModal = { instanceId: number; instanceName: string } | null;

export default function TeacherInstancesPage() {
  const router = useRouter();
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [msgModal, setMsgModal] = useState<MsgModal>(null);
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgSeverity, setMsgSeverity] = useState("info");
  const [msgSending, setMsgSending] = useState(false);
  const [msgResult, setMsgResult] = useState("");

  const load = () => api.get<InstanceRow[]>("/api/instances/").then(setInstances).catch(() => {});
  useEffect(() => { load(); }, []);

  const handlePause = async (id: number) => { await api.post(`/api/instances/${id}/pause/`); load(); };
  const handleToggleReg = async (id: number) => { await api.post(`/api/instances/${id}/toggle-registration/`); load(); };

  const openMsg = (row: InstanceRow) => {
    setMsgTitle("");
    setMsgBody("");
    setMsgSeverity("info");
    setMsgResult("");
    setMsgModal({ instanceId: row.id, instanceName: row.name });
  };

  const sendMessage = async () => {
    if (!msgModal) return;
    setMsgSending(true);
    setMsgResult("");
    try {
      await api.post("/api/notifications/announcements/", {
        scope: "instance",
        instance: msgModal.instanceId,
        title: msgTitle,
        message: msgBody,
        severity: msgSeverity,
        is_active: true,
      });
      setMsgResult("Message sent successfully.");
      setTimeout(() => setMsgModal(null), 1500);
    } catch {
      setMsgResult("Failed to send message.");
    } finally {
      setMsgSending(false);
    }
  };

  const columns: Column<InstanceRow>[] = [
    { key: "name", header: "Instance", render: (r) => (
      <span className="flex items-center gap-2 text-primary font-semibold">{r.name}</span>
    )},
    { key: "status", header: "Status", render: (r) => (
      <span className="flex items-center gap-2">
        <PulseDot color={STATUS_COLORS[r.status] ?? "primary"} size="sm" />
        {r.status.toUpperCase()}
      </span>
    )},
    { key: "enrollment_count", header: "Students", render: (r) => <span className="text-primary">{r.enrollment_count}</span> },
    { key: "registration_open", header: "Registration", render: (r) => (
      <span className={r.registration_open ? "text-success" : "text-muted"}>{r.registration_open ? "Open" : "Closed"}</span>
    )},
    { key: "id", header: "Controls", render: (r) => (
      <div className="flex gap-2 flex-wrap">
        <GlowButton size="sm" variant="outline" onClick={() => handlePause(r.id)}>
          {r.status === "paused" ? "Resume" : "Pause"}
        </GlowButton>
        <GlowButton size="sm" variant="secondary" onClick={() => handleToggleReg(r.id)}>
          {r.registration_open ? "Close Reg." : "Open Reg."}
        </GlowButton>
        <GlowButton size="sm" onClick={() => router.push(`/app/teacher/analytics?instance=${r.id}`)}>
          Analytics
        </GlowButton>
        <GlowButton size="sm" variant="outline" onClick={() => openMsg(r)}>
          Send Message
        </GlowButton>
        <a
          href={`/api/exports/${r.id}/xlsx/`}
          target="_blank"
          className="inline-flex items-center gap-1 border border-border px-2 py-1 font-mono text-[10px] text-muted hover:text-primary hover:border-primary/40 transition"
        >
          XLSX
        </a>
        <a
          href={`/api/exports/${r.id}/pdf/`}
          target="_blank"
          className="inline-flex items-center gap-1 border border-border px-2 py-1 font-mono text-[10px] text-muted hover:text-danger hover:border-danger/40 transition"
        >
          PDF
        </a>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          MY <span className="text-primary text-glow">INSTANCES</span>
        </h1>
        <p className="font-mono text-xs text-muted">Assigned exam instances</p>
      </div>

      <TerminalWindow title="system://teacher.instances" prompt="">
        <DataTable columns={columns} data={instances} keyField="id" emptyMessage="No assigned instances." />
      </TerminalWindow>

      {/* Send Message Modal */}
      {msgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/80 backdrop-blur-sm">
          <div className="w-full max-w-md animate-rise">
            <TerminalWindow title={`system://msg → ${msgModal.instanceName}`} prompt="">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Title</label>
                  <input
                    value={msgTitle}
                    onChange={(e) => setMsgTitle(e.target.value)}
                    placeholder="Announcement title"
                    className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary placeholder:text-subtle"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Message</label>
                  <textarea
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    rows={4}
                    placeholder="Message to students in this instance..."
                    className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary placeholder:text-subtle resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Severity</label>
                  <select
                    value={msgSeverity}
                    onChange={(e) => setMsgSeverity(e.target.value)}
                    className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="danger">Critical</option>
                    <option value="success">Success</option>
                  </select>
                </div>

                {msgResult && (
                  <p className={`font-mono text-xs ${msgResult.includes("success") ? "text-success" : "text-danger"}`}>
                    {msgResult.includes("success") ? "✓" : "✗"} {msgResult}
                  </p>
                )}

                <div className="flex gap-3">
                  <GlowButton onClick={sendMessage} disabled={!msgTitle || !msgBody || msgSending}>
                    {msgSending ? "Sending..." : "Send to Instance →"}
                  </GlowButton>
                  <button
                    onClick={() => setMsgModal(null)}
                    className="font-mono text-xs text-muted hover:text-foreground transition px-3 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </TerminalWindow>
          </div>
        </div>
      )}
    </div>
  );
}

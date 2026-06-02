"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { StatTile } from "@/components/cyber/stat-tile";
import { PulseDot } from "@/components/cyber/pulse-dot";
import { CyberModal } from "@/components/cyber/cyber-modal";
import { ScoreStatus } from "@/components/cyber/score-status";

type EnrollmentRow = {
  id: number;
  user_id: number;
  username: string;
  email: string;
  status: string;
  score_total: number;
  started_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  bonus_answered: number;
  bonus_total: number;
  non_bonus_answered: number;
  non_bonus_total: number;
  all_bonus_answered: boolean;
  all_non_bonus_answered: boolean;
  is_submitted: boolean;
};

type InstanceDetail = {
  id: number;
  name: string;
  status: string;
  branch: { id: number; name: string };
  scenario: { id: number; name: string; question_count: number } | null;
  assigned_teachers: { id: number; username: string }[];
  registration_open: boolean;
  moodle_course_id: string;
  moodle_auto_push: boolean;
  enrollment_count: number;
  exported_at: string | null;
  created_at: string;
};

type CandidateUser = { id: number; username: string; email: string; role: string; branch?: { id: number; name: string } | null };

const STATUS_COLORS: Record<string, "success" | "primary" | "warning" | "danger"> = {
  open: "success", paused: "warning", closed: "danger", archived: "danger", draft: "primary",
};

export default function InstanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [instance, setInstance] = useState<InstanceDetail | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);

  // Enrollment management modal state
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [selectedToEnroll, setSelectedToEnroll] = useState<Set<number>>(new Set());
  const [enrollSearch, setEnrollSearch] = useState("");
  const [enrollMsg, setEnrollMsg] = useState("");

  // Teacher assignment modal state
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [teacherCandidates, setTeacherCandidates] = useState<CandidateUser[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<number>>(new Set());

  const load = async () => {
    try {
      const [inst, enrs] = await Promise.all([
        api.get<InstanceDetail>(`/api/instances/${id}/`),
        api.get<EnrollmentRow[]>(`/api/instances/${id}/enrollments/`).catch(() => [] as EnrollmentRow[]),
      ]);
      setInstance(inst);
      setEnrollments(enrs);
    } catch { /* ignore */ }
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => { load(); }, [id]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handlePause = async () => { try { await api.post(`/api/instances/${id}/pause/`); load(); } catch { /* ignore */ } };
  const handleArchive = async () => {
    if (!confirm("Archive this instance?")) return;
    try { await api.post(`/api/instances/${id}/archive/`); load(); } catch { /* ignore */ }
  };
  const handleToggleReg = async () => { try { await api.post(`/api/instances/${id}/toggle-registration/`); load(); } catch { /* ignore */ } };
  const handlePushGrades = async () => {
    try { await api.post(`/api/moodle/push-grades/${id}/`); alert("Grades pushed to Moodle."); }
    catch { alert("Moodle not configured or error occurred."); }
  };
  const handleRemoveEnrollment = async (userId: number) => {
    if (!confirm("Remove this user from the instance?")) return;
    try {
      // DRF DELETE supports body via fetch
      await fetch(`/api/instances/${id}/enrollments/`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: [userId] }),
      });
      load();
    } catch { /* ignore */ }
  };

  // ── Enroll-users modal ────────────────────────────────────────────
  const openEnroll = async () => {
    setEnrollOpen(true);
    setSelectedToEnroll(new Set());
    setEnrollSearch("");
    setEnrollMsg("");
    try {
      const branchId = instance?.branch.id;
      const params = new URLSearchParams({ role: "student" });
      if (branchId) params.set("branch", String(branchId));
      const users = await api.get<CandidateUser[]>(`/api/users/?${params}`);
      // Exclude already-enrolled
      const already = new Set(enrollments.map(e => e.user_id));
      setCandidates(users.filter(u => !already.has(u.id)));
    } catch { setCandidates([]); }
  };
  const handleEnroll = async () => {
    if (selectedToEnroll.size === 0) return;
    try {
      const res = await api.post<{ enrolled: number; already_enrolled: number }>(
        `/api/instances/${id}/enrollments/`,
        { user_ids: Array.from(selectedToEnroll) }
      );
      setEnrollMsg(`Enrolled ${res.enrolled} user(s).`);
      load();
      setSelectedToEnroll(new Set());
      // Refresh candidates list
      setTimeout(() => { setEnrollOpen(false); }, 800);
    } catch { setEnrollMsg("Enrollment failed."); }
  };

  // ── Teacher assignment modal ──────────────────────────────────────
  const openTeacherModal = async () => {
    setTeacherOpen(true);
    setSelectedTeachers(new Set(instance?.assigned_teachers.map(t => t.id) ?? []));
    try {
      const branchId = instance?.branch.id;
      const params = new URLSearchParams({ role: "teacher" });
      if (branchId) params.set("branch", String(branchId));
      const users = await api.get<CandidateUser[]>(`/api/users/?${params}`);
      setTeacherCandidates(users);
    } catch { setTeacherCandidates([]); }
  };
  const handleAssignTeachers = async () => {
    try {
      await api.post(`/api/instances/${id}/assign-teachers/`,
        { teacher_ids: Array.from(selectedTeachers) });
      setTeacherOpen(false);
      load();
    } catch { /* ignore */ }
  };

  if (!instance) return <p className="font-mono text-muted p-6">Loading...</p>;

  const completed = enrollments.filter(e => e.status === "completed").length;
  const avgScore = enrollments.length
    ? enrollments.reduce((acc, e) => acc + (e.score_total ?? 0), 0) / enrollments.length
    : 0;

  const enrollmentColumns: Column<EnrollmentRow>[] = [
    { key: "username", header: "Student", render: (r) => <span className="text-foreground font-semibold">{r.username}</span> },
    { key: "email", header: "Email", render: (r) => <span className="text-muted text-xs">{r.email}</span> },
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
    { key: "score_total", header: "Score", render: (r) => (
      <span className="text-success tabular-nums">{r.score_total.toFixed(1)}</span>
    )},
    { key: "id", header: "Actions", render: (r) => (
      <GlowButton variant="danger" size="sm" onClick={() => handleRemoveEnrollment(r.user_id)}>
        Remove
      </GlowButton>
    )},
  ];

  const filteredCandidates = candidates.filter(
    c => !enrollSearch.trim() ||
         c.username.toLowerCase().includes(enrollSearch.toLowerCase()) ||
         c.email.toLowerCase().includes(enrollSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <button onClick={() => router.push("/app/admin/instances")} className="font-mono text-xs text-muted hover:text-primary mb-2 block">
          ← Back to Instances
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{instance.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <PulseDot color={STATUS_COLORS[instance.status] ?? "primary"} size="sm" />
              <span className="font-mono text-xs text-muted uppercase">{instance.status}</span>
              <span className="text-border">·</span>
              <span className="font-mono text-xs text-muted">{instance.branch.name}</span>
              {instance.scenario && (
                <>
                  <span className="text-border">·</span>
                  <span className="font-mono text-xs text-muted">{instance.scenario.name}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {instance.status !== "archived" && (
              <>
                <GlowButton size="sm" variant="outline" onClick={handlePause}>
                  {instance.status === "paused" ? "Resume Exam" : "Pause Exam"}
                </GlowButton>
                <GlowButton size="sm" variant="outline" onClick={handleToggleReg}>
                  {instance.registration_open ? "Close Registration" : "Open Registration"}
                </GlowButton>
                <GlowButton size="sm" variant="secondary" onClick={handleArchive}>Archive</GlowButton>
              </>
            )}
            {instance.moodle_course_id && (
              <GlowButton size="sm" onClick={handlePushGrades}>Push Grades → Moodle</GlowButton>
            )}
            {(["xlsx", "csv", "pdf"] as const).map((fmt) => (
              <a key={fmt} href={`/api/exports/${id}/${fmt}/${fmt === "csv" || fmt === "pdf" ? "?mode=full" : ""}`} target="_blank"
                className="inline-flex items-center border border-border px-3 py-1.5 font-mono text-xs text-muted hover:text-primary hover:border-primary/40 transition uppercase">
                {fmt}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Enrolled" value={enrollments.length} accent />
        <StatTile label="Completed" value={completed} trend={completed > 0 ? "up" : "neutral"} />
        <StatTile label="Avg Score" value={avgScore} decimals={1} suffix="%" accent />
        <StatTile label="Registration" value={instance.registration_open ? 1 : 0}
          suffix={instance.registration_open ? " OPEN" : " CLOSED"} decimals={0} />
      </div>

      {/* User management */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Students */}
        <TerminalWindow title="system://instance.students" prompt="" footer={
          <div className="flex items-center justify-between gap-3 text-foreground">
            <span>{enrollments.length} enrolled · {completed} completed</span>
            <GlowButton size="sm" onClick={openEnroll}>+ Add Students</GlowButton>
          </div>
        }>
          <DataTable
            columns={enrollmentColumns}
            data={enrollments}
            keyField="id"
            emptyMessage="No students enrolled yet. Click + Add Students."
          />
        </TerminalWindow>

        {/* Teachers */}
        <TerminalWindow title="system://instance.teachers" prompt="" footer={
          <div className="flex items-center justify-between gap-3 text-foreground">
            <span>{instance.assigned_teachers.length} assigned</span>
            <GlowButton size="sm" onClick={openTeacherModal}>Manage Teachers</GlowButton>
          </div>
        }>
          {instance.assigned_teachers.length === 0 ? (
            <p className="font-mono text-xs text-muted py-4 text-center">
              No teachers assigned. Click Manage Teachers.
            </p>
          ) : (
            <div className="space-y-1">
              {instance.assigned_teachers.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2 border-b border-border/30 font-mono text-sm">
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span className="text-foreground">{t.username}</span>
                </div>
              ))}
            </div>
          )}
        </TerminalWindow>
      </div>

      {/* Instance details */}
      <TerminalWindow title="system://instance.details" prompt="">
        <div className="grid gap-3 sm:grid-cols-2 font-mono text-sm">
          <div><span className="text-muted">Created:</span> <span className="text-foreground">{new Date(instance.created_at).toLocaleString()}</span></div>
          {instance.exported_at && (
            <div><span className="text-muted">Last export:</span> <span className="text-success">{new Date(instance.exported_at).toLocaleString()}</span></div>
          )}
          {instance.moodle_course_id && (
            <div><span className="text-muted">Moodle Course ID:</span> <span className="text-foreground">{instance.moodle_course_id}</span></div>
          )}
          <div><span className="text-muted">Auto-push grades:</span> <span className={instance.moodle_auto_push ? "text-success" : "text-muted"}>{instance.moodle_auto_push ? "Yes" : "No"}</span></div>
        </div>
      </TerminalWindow>

      {/* Enroll students modal */}
      <CyberModal open={enrollOpen} onClose={() => setEnrollOpen(false)} title="system://enroll.students" maxWidth="xl">
        <div className="space-y-4">
          <div>
            <p className="font-mono text-xs text-muted mb-2">
              Showing eligible students from <span className="text-primary">{instance.branch.name}</span> who are not yet enrolled.
            </p>
            <input
              value={enrollSearch}
              onChange={(e) => setEnrollSearch(e.target.value)}
              placeholder="Search by username / email..."
              autoFocus
              className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary placeholder:text-subtle"
            />
          </div>
          <div className="max-h-[40vh] overflow-y-auto border border-border/40">
            {filteredCandidates.length === 0 ? (
              <p className="font-mono text-xs text-muted text-center py-6">
                {candidates.length === 0 ? "All eligible students already enrolled." : "No match."}
              </p>
            ) : (
              filteredCandidates.map((c) => {
                const checked = selectedToEnroll.has(c.id);
                return (
                  <label key={c.id} className={`flex items-center gap-3 px-3 py-2 border-b border-border/20 cursor-pointer transition ${checked ? "bg-primary/8" : "hover:bg-surface-2/50"}`}>
                    <input type="checkbox" checked={checked} onChange={(e) => {
                      setSelectedToEnroll(prev => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(c.id);
                        else next.delete(c.id);
                        return next;
                      });
                    }} />
                    <span className="font-mono text-sm text-foreground flex-1">{c.username}</span>
                    <span className="font-mono text-xs text-muted">{c.email}</span>
                  </label>
                );
              })
            )}
          </div>
          {enrollMsg && <p className="font-mono text-xs text-success">{enrollMsg}</p>}
          <div className="flex justify-between items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-subtle">
              {selectedToEnroll.size} selected
            </span>
            <div className="flex gap-3">
              <GlowButton onClick={handleEnroll} disabled={selectedToEnroll.size === 0}>
                Enroll {selectedToEnroll.size > 0 ? `(${selectedToEnroll.size})` : ""}
              </GlowButton>
              <GlowButton variant="outline" onClick={() => setEnrollOpen(false)}>Cancel</GlowButton>
            </div>
          </div>
        </div>
      </CyberModal>

      {/* Teacher assignment modal */}
      <CyberModal open={teacherOpen} onClose={() => setTeacherOpen(false)} title="system://assign.teachers" maxWidth="lg">
        <div className="space-y-4">
          <p className="font-mono text-xs text-muted">
            Toggle teachers from <span className="text-primary">{instance.branch.name}</span> who will manage this instance.
          </p>
          <div className="max-h-[40vh] overflow-y-auto border border-border/40">
            {teacherCandidates.length === 0 ? (
              <p className="font-mono text-xs text-muted text-center py-6">
                No teachers available in this branch.
              </p>
            ) : (
              teacherCandidates.map((c) => {
                const checked = selectedTeachers.has(c.id);
                return (
                  <label key={c.id} className={`flex items-center gap-3 px-3 py-2 border-b border-border/20 cursor-pointer transition ${checked ? "bg-primary/8" : "hover:bg-surface-2/50"}`}>
                    <input type="checkbox" checked={checked} onChange={(e) => {
                      setSelectedTeachers(prev => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(c.id);
                        else next.delete(c.id);
                        return next;
                      });
                    }} />
                    <span className="font-mono text-sm text-foreground flex-1">{c.username}</span>
                    <span className="font-mono text-xs text-muted">{c.email}</span>
                  </label>
                );
              })
            )}
          </div>
          <div className="flex justify-end gap-3">
            <GlowButton onClick={handleAssignTeachers}>Save Assignments</GlowButton>
            <GlowButton variant="outline" onClick={() => setTeacherOpen(false)}>Cancel</GlowButton>
          </div>
        </div>
      </CyberModal>
    </div>
  );
}

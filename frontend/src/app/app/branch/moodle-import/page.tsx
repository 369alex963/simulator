"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";

type MoodleUser = { id: number; username: string; email: string };
type PreviewData = { count: number; users: MoodleUser[] };

export default function BranchMoodleImportPage() {
  const [courseId, setCourseId] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [createInstance, setCreateInstance] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [result, setResult] = useState<{ imported: number; instance_id?: number; message: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setError(""); setPreview(null);
    setLoading(true);
    try {
      const data = await api.get<PreviewData>(`/api/moodle/course-users/?course_id=${courseId}`);
      setPreview(data);
      setInstanceName(`Course ${courseId} Import`);
    } catch (e) {
      setError(e instanceof ApiError ? String((e.data as any)?.detail) : "Cannot reach Moodle.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setError(""); setLoading(true);
    try {
      // branch_id omitted — backend will use the manager's own branch
      const res = await api.post<typeof result>("/api/moodle/import/", {
        course_id: Number(courseId),
        create_instance: createInstance,
        instance_name: instanceName,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? String((e.data as any)?.detail) : "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-rise max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          MOODLE <span className="text-primary text-glow">IMPORT</span>
        </h1>
        <p className="font-mono text-xs text-muted">Import a Moodle course. Students are added to your branch automatically. Default password: Exam1234</p>
      </div>

      <TerminalWindow title="system://moodle.branch-import" prompt="">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Moodle Course ID</label>
            <input
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="e.g. 42"
              className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary placeholder:text-subtle"
            />
          </div>

          <GlowButton onClick={handlePreview} disabled={!courseId || loading}>
            {loading && !preview ? "Fetching..." : "Preview Course"}
          </GlowButton>

          {error && <p className="font-mono text-xs text-danger">✗ {error}</p>}

          {preview && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="font-mono text-sm text-success">✓ Found {preview.count} students in course {courseId}</p>

              <div className="max-h-40 overflow-y-auto border border-border bg-surface p-3 font-mono text-xs text-muted space-y-1">
                {preview.users.slice(0, 20).map((u) => (
                  <div key={u.id}>{u.username} · {u.email}</div>
                ))}
                {preview.count > 20 && <div className="text-subtle">... and {preview.count - 20} more</div>}
              </div>

              <label className="flex items-center gap-2 font-mono text-sm text-muted cursor-pointer">
                <input type="checkbox" checked={createInstance} onChange={(e) => setCreateInstance(e.target.checked)} />
                Create new instance for these students
              </label>

              {createInstance && (
                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Instance Name</label>
                  <input
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
              )}

              <GlowButton onClick={handleImport} disabled={loading}>
                {loading ? "Importing..." : `Import ${preview.count} Students`}
              </GlowButton>
            </div>
          )}

          {result && (
            <div className="border border-success/40 bg-success/10 px-4 py-3 font-mono text-sm text-success">
              ✓ {result.message}
              {result.instance_id && <span className="ml-2 text-muted">Instance ID: {result.instance_id}</span>}
            </div>
          )}
        </div>
      </TerminalWindow>
    </div>
  );
}

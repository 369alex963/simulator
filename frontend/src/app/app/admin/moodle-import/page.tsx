"use client";

import { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import type { Branch } from "@/types";

type MoodleUser = { id: number; username: string; email: string; name: string };
type PreviewData = { count: number; users: MoodleUser[] };

export default function MoodleImportPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [courseId, setCourseId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [createInstance, setCreateInstance] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [result, setResult] = useState<{ imported: number; instance_id?: number; message: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get<Branch[]>("/api/branches/").then(setBranches).catch(() => {}); }, []);

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
      const res = await api.post<typeof result>("/api/moodle/import/", {
        course_id: Number(courseId),
        branch_id: Number(branchId),
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
        <p className="font-mono text-xs text-muted">Import a Moodle course as student accounts. Default password: Exam1234</p>
      </div>

      <TerminalWindow title="system://moodle.import" prompt="">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Moodle Course ID</label>
              <input value={courseId} onChange={(e) => setCourseId(e.target.value)} placeholder="e.g. 42"
                className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary placeholder:text-subtle" />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Target Branch</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}
                className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground">
                <option value="">Select branch...</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <GlowButton onClick={handlePreview} disabled={!courseId || loading}>Preview Course</GlowButton>
          </div>

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
                  <input value={instanceName} onChange={(e) => setInstanceName(e.target.value)}
                    className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary" />
                </div>
              )}

              <GlowButton onClick={handleImport} disabled={!branchId || loading}>
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

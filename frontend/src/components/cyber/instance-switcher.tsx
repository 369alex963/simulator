"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Enrollment = {
  enrollment_id?: number;
  instance_id: number;
  instance_name: string;
  instance_status: string;
  branch_name: string;
  status?: string;
};

type Props = {
  /** Called after the user switches — parent should re-fetch state */
  onSwitch?: () => void;
  /** Currently active instance id to highlight */
  activeInstanceId?: number | null;
  /** Whether this is a student (uses enrollment switch) or teacher (just informational) */
  role?: "student" | "teacher";
  className?: string;
};

/**
 * Compact dropdown that lists the user's enrollments / assigned instances.
 * Hidden when the user only has one — no clutter.
 */
export function InstanceSwitcher({ onSwitch, activeInstanceId, role = "student", className }: Props) {
  const [list, setList] = useState<Enrollment[]>([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    api.get<Enrollment[]>("/api/instances/my-enrollments/")
      .then(setList).catch(() => setList([]));
  }, []);

  if (list.length <= 1) return null;

  const active = list.find(e => e.instance_id === activeInstanceId) ?? list[0];

  const handlePick = async (e: Enrollment) => {
    setOpen(false);
    if (e.instance_id === activeInstanceId) return;
    setSwitching(true);
    try {
      if (role === "student" && e.enrollment_id) {
        await api.post("/api/instances/select/", { enrollment_id: e.enrollment_id });
      }
      onSwitch?.();
    } catch { /* ignore */ } finally {
      setSwitching(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        className={cn(
          "flex items-center gap-2 border border-border bg-surface-1 px-3 py-1.5",
          "font-mono text-xs text-muted hover:border-primary/40 hover:text-foreground transition",
          "disabled:opacity-60",
        )}
        aria-label="Switch instance"
      >
        <span className="size-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-foreground max-w-[180px] truncate">{active.instance_name}</span>
        <span className="text-subtle text-[10px]">({list.length})</span>
        <span className="text-subtle">▾</span>
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-label="Close" />
          <div className="absolute right-0 top-full mt-2 z-20 min-w-[280px] border border-border-strong bg-surface-2 shadow-[var(--shadow-window)]">
            <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="px-4 py-2 border-b border-border/40 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">
              Switch Instance
            </div>
            <div className="max-h-[40vh] overflow-y-auto">
              {list.map((e) => {
                const isActive = e.instance_id === active.instance_id;
                return (
                  <button
                    key={e.enrollment_id ?? e.instance_id}
                    onClick={() => handlePick(e)}
                    className={cn(
                      "w-full text-left flex flex-col gap-0.5 px-4 py-2.5",
                      "border-b border-border/20 transition font-mono",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:bg-primary/8 hover:text-foreground",
                    )}
                  >
                    <span className="text-sm font-semibold flex items-center gap-2">
                      {isActive && <span className="text-primary">▶</span>}
                      <span>{e.instance_name}</span>
                    </span>
                    <span className="text-[10px] text-subtle flex items-center gap-2">
                      <span>{e.branch_name}</span>
                      <span>·</span>
                      <span className="uppercase">{e.instance_status}</span>
                      {e.status && <><span>·</span><span className="uppercase">{e.status.replace("_", " ")}</span></>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

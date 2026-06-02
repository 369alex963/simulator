"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { StatTile } from "@/components/cyber/stat-tile";

type Stats = {
  branch_name: string;
  total_users: number;
  active_instances: number;
  total_enrollments: number;
  completed_enrollments: number;
  avg_score: number;
};

const EMPTY: Stats = {
  branch_name: "—",
  total_users: 0,
  active_instances: 0,
  total_enrollments: 0,
  completed_enrollments: 0,
  avg_score: 0,
};

export default function BranchDashboard() {
  const [stats, setStats] = useState<Stats>(EMPTY);

  useEffect(() => {
    api.get<Stats>("/api/analytics/branch-summary/").then(setStats).catch(() => {});
  }, []);

  const completionRate =
    stats.total_enrollments > 0
      ? Math.round((stats.completed_enrollments / stats.total_enrollments) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <div className="animate-rise">
        <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-subtle mb-1">
          ⬡ Regional Command
        </p>
        <div className="flex items-end gap-4">
          <h1 className="font-display text-2xl font-bold leading-none">
            <span className="text-primary text-glow">{stats.branch_name}</span>{" "}
            <span className="text-foreground">BRANCH</span>
          </h1>
          <div className="mb-0.5 h-px flex-1 bg-gradient-to-r from-border to-transparent hidden md:block" />
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-subtle">
          Branch operations · enrollment metrics · regional status
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-rise delay-75">
        <StatTile label="Branch Users" value={stats.total_users} accent icon={<span className="text-base">◉</span>} />
        <StatTile label="Active Instances" value={stats.active_instances} trend="up" trendLabel="running" icon={<span className="text-base">▣</span>} />
        <StatTile label="Enrollments" value={stats.total_enrollments} icon={<span className="text-base">◱</span>} />
        <StatTile label="Completed" value={stats.completed_enrollments} trend="up" trendLabel="finished" icon={<span className="text-base">◐</span>} />
        <StatTile label="Avg Score" value={stats.avg_score} decimals={1} suffix="%" accent trend={stats.avg_score >= 70 ? "up" : "down"} icon={<span className="text-base">◫</span>} />
        <StatTile label="Completion Rate" value={completionRate} suffix="%" trend={completionRate >= 50 ? "up" : "down"} icon={<span className="text-base">▸</span>} />
      </div>

      <div className="grid gap-6 md:grid-cols-5 animate-rise delay-150">
        <div className="md:col-span-2">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-foreground">Enrollment Flow</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <TerminalWindow title="system://branch.metrics" prompt="">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-subtle">
                  <span>Completion Rate</span>
                  <span className="text-foreground tabular-nums">{completionRate}%</span>
                </div>
                <div className="h-1 w-full bg-surface-3 overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-700 ease-out shadow-[0_0_6px_var(--primary)]" style={{ width: `${completionRate}%` }} />
                </div>
              </div>

              <div className="h-px bg-border/50" />

              {[
                ["Total Enrolled",     stats.total_enrollments,     "muted"],
                ["In Progress",        stats.total_enrollments - stats.completed_enrollments, "warning"],
                ["Completed",          stats.completed_enrollments,  "success"],
                ["Active Instances",   stats.active_instances,       "success"],
              ].map(([label, val, color]) => (
                <div key={String(label)} className="flex items-center justify-between border-b border-border/30 pb-2.5 last:border-0 last:pb-0">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-subtle">{label}</span>
                  <span className={`font-mono text-sm font-bold tabular-nums ${color === "success" ? "text-success/90" : color === "warning" ? "text-warning/80" : "text-foreground"}`}>{val}</span>
                </div>
              ))}
            </div>
          </TerminalWindow>
        </div>

        <div className="md:col-span-3">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-foreground">Operations</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <TerminalWindow title="system://branch.ops" prompt="branch-mgr:~$ help">
            <div className="grid gap-px sm:grid-cols-2 bg-border/30">
              {[
                ["users",         "/app/branch/users",         "Manage branch users",      "◉"],
                ["instances",     "/app/branch/instances",     "Open / manage instances",   "▣"],
                ["analytics",     "/app/branch/analytics",     "Branch analytics",          "◱"],
                ["moodle-import", "/app/branch/moodle-import", "Import class from Moodle", "⇪"],
                ["announcements", "/app/branch/announcements", "Branch announcements",      "▲"],
              ].map(([cmd, href, desc, icon]) => (
                <Link key={cmd} href={href} prefetch
                  className="group flex items-start gap-2.5 bg-surface-1 px-3 py-3 transition-colors hover:bg-primary/8 border border-transparent hover:border-primary/15"
                >
                  <span className="shrink-0 text-primary/60 group-hover:text-primary transition-colors mt-px">{icon}</span>
                  <div className="min-w-0">
                    <span className="block font-mono text-[10px] font-medium text-primary/90 group-hover:text-primary uppercase tracking-wider">{cmd}</span>
                    <span className="font-mono text-[9px] text-subtle group-hover:text-muted block transition-colors">{desc}</span>
                  </div>
                </Link>
              ))}
            </div>
          </TerminalWindow>
        </div>
      </div>
    </div>
  );
}

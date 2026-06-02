"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { StatTile } from "@/components/cyber/stat-tile";
import { Reveal, Stagger } from "@/components/motion/reveal";

type Stats = {
  total_users: number;
  total_branches: number;
  total_instances: number;
  active_instances: number;
  total_enrollments: number;
  avg_score: number;
};

const EMPTY: Stats = {
  total_users: 0, total_branches: 0, total_instances: 0,
  active_instances: 0, total_enrollments: 0, avg_score: 0,
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>(EMPTY);

  useEffect(() => {
    api.get<Stats>("/api/analytics/admin-summary/").then(setStats).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <Reveal>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-subtle mb-2 flex items-center gap-2">
            <motion.span
              className="size-1.5 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ boxShadow: "0 0 6px var(--primary)" }}
            />
            Command Center
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            <span className="text-foreground">Admin</span>{" "}
            <span className="text-primary text-glow">Dashboard</span>
          </h1>
          <div className="mt-3 flex items-center gap-3 text-xs font-mono text-muted">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            <span>Global System Overview</span>
            <span className="text-border-strong">·</span>
            <span>All Branches</span>
            <span className="text-border-strong">·</span>
            <span>Real-Time</span>
          </div>
        </div>
      </Reveal>

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" step={0.08} initial={0.1}>
        {[
          { label: "Total Users",      value: stats.total_users,       icon: "◉", accent: true },
          { label: "Branches",         value: stats.total_branches,    icon: "⬡" },
          { label: "Instances",        value: stats.total_instances,   icon: "▣" },
          { label: "Active Instances", value: stats.active_instances,  icon: "▶", trend: "up" as const, trendLabel: "running" },
          { label: "Enrollments",      value: stats.total_enrollments, icon: "◱" },
          { label: "Avg Score",        value: stats.avg_score, decimals: 1, suffix: "%", icon: "◐", accent: true, trend: (stats.avg_score >= 70 ? "up" : "down") as "up" | "down" },
        ].map((tile) => (
          <Reveal key={tile.label}>
            <StatTile
              label={tile.label}
              value={tile.value}
              decimals={tile.decimals}
              suffix={tile.suffix}
              accent={tile.accent}
              trend={tile.trend}
              trendLabel={tile.trendLabel}
              icon={<span>{tile.icon}</span>}
            />
          </Reveal>
        ))}
      </Stagger>

      <div className="grid gap-6 lg:grid-cols-5">
        <Reveal delay={0.2} className="lg:col-span-3">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide mb-4">Quick Operations</h2>
          <TerminalWindow title="system://admin.quickops" prompt="admin@hq:~$ help">
            <Stagger className="grid gap-px sm:grid-cols-2 bg-border/30" step={0.05}>
              {[
                ["branches",      "/app/admin/branches",      "Manage system branches",       "⬡"],
                ["users",         "/app/admin/users",         "Manage all users",             "◉"],
                ["scenarios",     "/app/admin/scenarios",     "Build exam scenarios",         "◫"],
                ["instances",     "/app/admin/instances",     "Open & manage instances",      "▣"],
                ["brand-kits",    "/app/admin/brand-kits",    "White-label brand kits",       "◊"],
                ["moodle-import", "/app/admin/moodle-import", "Import students from Moodle",  "↑"],
                ["settings",      "/app/admin/settings",      "System configuration",         "⚙"],
                ["audit-log",     "/app/admin/audit-log",     "Login & activity audit",       "▸"],
              ].map(([cmd, href, desc, icon]) => (
                <Reveal key={cmd}>
                  <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 280, damping: 20 }}>
                    <Link
                      href={href}
                      prefetch
                      className="group flex items-start gap-3 bg-surface-1 px-4 py-4 transition-all hover:bg-primary/8 border border-transparent hover:border-primary/15"
                    >
                      <span className="shrink-0 text-lg text-primary/50 group-hover:text-primary transition-colors mt-0.5">{icon}</span>
                      <div className="min-w-0">
                        <span className="block font-mono text-sm font-semibold text-foreground group-hover:text-primary uppercase tracking-wide">{cmd}</span>
                        <span className="font-mono text-xs text-muted block mt-0.5">{desc}</span>
                      </div>
                    </Link>
                  </motion.div>
                </Reveal>
              ))}
            </Stagger>
          </TerminalWindow>
        </Reveal>

        <Reveal delay={0.3} className="lg:col-span-2">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide mb-4">System Status</h2>
          <TerminalWindow title="system://sys.status" prompt="">
            <Stagger className="divide-y divide-border/30" step={0.06}>
              {[
                ["API Server",  "ONLINE",     "success"],
                ["Database",    "ONLINE",     "success"],
                ["Exam Engine", "ACTIVE",     "success"],
                ["SSE Broker",  "LISTENING",  "success"],
                ["Maintenance", "DISABLED",   "muted"],
                ["Email Relay", "CONFIGURED", "success"],
              ].map(([label, status, color]) => (
                <Reveal key={label}>
                  <div className="flex items-center justify-between py-3">
                    <span className="font-mono text-sm text-muted">{label}</span>
                    <span className={`font-mono text-sm font-semibold flex items-center gap-2 ${color === "success" ? "text-success" : "text-muted"}`}>
                      <motion.span
                        className={`size-2 rounded-full ${color === "success" ? "bg-success" : "bg-muted/40"}`}
                        animate={color === "success" ? { opacity: [0.6, 1, 0.6] } : undefined}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={color === "success" ? { boxShadow: "0 0 4px var(--success)" } : undefined}
                      />
                      {status}
                    </span>
                  </div>
                </Reveal>
              ))}
            </Stagger>
          </TerminalWindow>
        </Reveal>
      </div>
    </div>
  );
}

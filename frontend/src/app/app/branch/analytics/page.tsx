"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StatTile } from "@/components/cyber/stat-tile";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

type Summary = {
  branch_name: string;
  total_users: number;
  active_instances: number;
  total_enrollments: number;
  completed_enrollments: number;
  avg_score: number;
};

const CYBER_TOOLTIP = {
  contentStyle: { background: "#14161c", border: "1px solid #27272a", fontFamily: "JetBrains Mono, monospace", fontSize: 12 },
  labelStyle: { color: "#a1a1aa" },
  itemStyle: { color: "#ffd700" },
};

export default function BranchAnalyticsPage() {
  const [stats, setStats] = useState<Summary | null>(null);

  useEffect(() => {
    api.get<Summary>("/api/analytics/branch-summary/").then(setStats).catch(() => {});
  }, []);

  if (!stats) return <p className="font-mono text-muted p-6">Loading...</p>;

  const enrollmentData = [
    { name: "Registered", value: stats.total_enrollments - stats.completed_enrollments },
    { name: "Completed", value: stats.completed_enrollments },
  ];
  const COLORS = ["#4b0082", "#ffd700"];

  const barData = [
    { name: "Users", value: stats.total_users },
    { name: "Active Instances", value: stats.active_instances },
    { name: "Enrollments", value: stats.total_enrollments },
    { name: "Completed", value: stats.completed_enrollments },
  ];

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Branch Manager</p>
        <h1 className="font-display text-2xl font-bold text-foreground">
          <span className="text-primary text-glow">{stats.branch_name}</span> ANALYTICS
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile label="Branch Users" value={stats.total_users} accent />
        <StatTile label="Active Instances" value={stats.active_instances} trend="up" />
        <StatTile label="Enrollments" value={stats.total_enrollments} />
        <StatTile label="Completed" value={stats.completed_enrollments} trend="up" />
        <StatTile label="Avg Score" value={stats.avg_score} decimals={1} suffix="%" accent />
        <StatTile label="Completion Rate"
          value={stats.total_enrollments > 0 ? (stats.completed_enrollments / stats.total_enrollments) * 100 : 0}
          decimals={1} suffix="%" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TerminalWindow title="system://branch.overview" prompt="">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-4">Branch Activity</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontFamily: "JetBrains Mono", fontSize: 9 }} />
              <YAxis tick={{ fill: "#a1a1aa", fontFamily: "JetBrains Mono", fontSize: 9 }} />
              <Tooltip {...CYBER_TOOLTIP} />
              <Bar dataKey="value" fill="#ffd700" opacity={0.85} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </TerminalWindow>

        <TerminalWindow title="system://completion.status" prompt="">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-4">Enrollment Status</p>
          <div className="flex items-center justify-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={enrollmentData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {enrollmentData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip {...CYBER_TOOLTIP} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 font-mono text-xs text-muted">
              {enrollmentData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="inline-block size-3 rounded-sm" style={{ background: COLORS[i] }} />
                  {d.name}: <span className="text-foreground ml-1">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </TerminalWindow>
      </div>

      <TerminalWindow title="system://score.performance" prompt="">
        <div className="flex items-center gap-4">
          <div className="font-display text-5xl font-bold text-primary text-glow">
            {stats.avg_score.toFixed(1)}<span className="text-muted text-2xl">%</span>
          </div>
          <div className="flex-1">
            <div className="h-3 rounded-sm bg-surface-3 overflow-hidden">
              <div className="h-full rounded-sm transition-all duration-1000"
                style={{ width: `${stats.avg_score}%`, background: "var(--primary)" }} />
            </div>
            <p className="mt-1 font-mono text-xs text-subtle">
              Average score across {stats.completed_enrollments} completed enrollments in {stats.branch_name}
            </p>
          </div>
        </div>
      </TerminalWindow>
    </div>
  );
}

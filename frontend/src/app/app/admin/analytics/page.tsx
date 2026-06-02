"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { StatTile } from "@/components/cyber/stat-tile";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

type DeepAnalytics = {
  instance_id: string;
  headline: {
    total_enrollments: number; total_completed: number; completion_rate: number;
    avg_score: number; min_score: number; max_score: number; total_hint_uses: number;
  };
  score_distribution: { range: string; count: number }[];
  completion_timeline: { date: string; completed: number }[];
  role_stats: { role: string; count: number }[];
  top_performers: { username: string; score: number; instance: string }[];
  branch_breakdown: { branch: string; enrolled: number; completed: number; avg_score: number }[];
  question_difficulty: { order: number; title: string; pct_correct: number; avg_attempts: number; hint_pct: number }[];
};

type InstanceOption = { id: number; name: string };

const CYBER_GREEN = "var(--color-primary, #ffd700)";
const CYBER_DIM   = "var(--color-border, #27272a)";
const CYBER_WARN  = "var(--color-warning, #ffb800)";
const CYBER_DANG  = "var(--color-danger, #ef4444)";
const CYBER_SUC   = "var(--color-success, #00ff88)";
const PIE_COLORS  = [CYBER_GREEN, CYBER_SUC, CYBER_WARN, CYBER_DANG, "#9333ea"];

export default function AdminAnalyticsPage() {
  const [instances, setInstances] = useState<InstanceOption[]>([]);
  const [selected, setSelected]   = useState<string>("all");
  const [data, setData] = useState<DeepAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<InstanceOption[]>("/api/instances/").then(setInstances).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get<DeepAnalytics>(`/api/analytics/admin-deep/?instance=${selected}`)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selected]);

  return (
    <div className="space-y-8 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-subtle mb-1">Reports</p>
          <h1 className="font-display text-3xl font-bold">
            <span className="text-foreground">Deep</span>{" "}
            <span className="text-primary text-glow">Analytics</span>
          </h1>
          <p className="mt-2 font-mono text-sm text-muted">
            Performance, distribution, and score breakdown across all instances.
          </p>
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted block mb-1">Instance</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground min-w-[260px]">
            <option value="all">All Instances (Global)</option>
            {instances.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center gap-3 p-8 font-mono text-sm text-muted">
          <span className="size-2 animate-pulse rounded-full bg-primary" /> Crunching numbers...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Enrollments"    value={data.headline.total_enrollments} accent icon={<span>◱</span>} />
            <StatTile label="Completed"       value={data.headline.total_completed} icon={<span>◐</span>} />
            <StatTile label="Completion Rate" value={data.headline.completion_rate} decimals={1} suffix="%" accent icon={<span>▶</span>} />
            <StatTile label="Avg Score"       value={data.headline.avg_score} decimals={1} suffix="%" trend={data.headline.avg_score >= 70 ? "up" : "down"} icon={<span>◈</span>} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Min Score"        value={data.headline.min_score} decimals={1} suffix="%" icon={<span>▼</span>} />
            <StatTile label="Max Score"        value={data.headline.max_score} decimals={1} suffix="%" icon={<span>▲</span>} />
            <StatTile label="Hint Uses"        value={data.headline.total_hint_uses} icon={<span>?</span>} />
            <StatTile label="Active Instances" value={instances.length} icon={<span>▣</span>} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Score Distribution" subtitle="Number of enrollments per score range">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.score_distribution}>
                  <CartesianGrid stroke={CYBER_DIM} strokeDasharray="2 4" />
                  <XAxis dataKey="range" tick={{ fill: "var(--color-muted)", fontSize: 11, fontFamily: "monospace" }} />
                  <YAxis tick={{ fill: "var(--color-muted)", fontSize: 11, fontFamily: "monospace" }} />
                  <Tooltip contentStyle={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", fontFamily: "monospace", fontSize: 12 }} />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {data.score_distribution.map((_, i) => (
                      <Cell key={i} fill={i < 5 ? CYBER_DANG : i < 7 ? CYBER_WARN : CYBER_SUC} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Completion Timeline" subtitle="Daily completions, last 30 days">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.completion_timeline}>
                  <CartesianGrid stroke={CYBER_DIM} strokeDasharray="2 4" />
                  <XAxis dataKey="date" tick={{ fill: "var(--color-muted)", fontSize: 9, fontFamily: "monospace" }}
                    tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fill: "var(--color-muted)", fontSize: 11, fontFamily: "monospace" }} />
                  <Tooltip contentStyle={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", fontFamily: "monospace", fontSize: 12 }} />
                  <Line type="monotone" dataKey="completed" stroke={CYBER_GREEN} strokeWidth={2}
                    dot={{ fill: CYBER_GREEN, r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Users by Role" subtitle="Active user distribution">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.role_stats} dataKey="count" nameKey="role"
                    cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                    paddingAngle={2} stroke="var(--color-surface)">
                    {data.role_stats.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", fontFamily: "monospace", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-muted)" }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Branch Performance" subtitle="Enrollments vs. completion vs. avg score">
              {data.branch_breakdown.length === 0 ? <EmptyState message="No branch data" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.branch_breakdown}>
                    <CartesianGrid stroke={CYBER_DIM} strokeDasharray="2 4" />
                    <XAxis dataKey="branch" tick={{ fill: "var(--color-muted)", fontSize: 10, fontFamily: "monospace" }} />
                    <YAxis tick={{ fill: "var(--color-muted)", fontSize: 11, fontFamily: "monospace" }} />
                    <Tooltip contentStyle={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", fontFamily: "monospace", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 11 }} />
                    <Bar dataKey="enrolled"  name="Enrolled"  fill={CYBER_DIM} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill={CYBER_SUC} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="avg_score" name="Avg"       fill={CYBER_GREEN} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {selected !== "all" && data.question_difficulty.length > 0 && (
            <ChartCard title="Question Difficulty" subtitle="Per-question correct rate & hint usage for selected instance">
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={data.question_difficulty} outerRadius="78%">
                  <PolarGrid stroke={CYBER_DIM} />
                  <PolarAngleAxis dataKey="order" tick={{ fill: "var(--color-muted)", fontSize: 11, fontFamily: "monospace" }} />
                  <PolarRadiusAxis angle={90} tick={{ fill: "var(--color-subtle)", fontSize: 9 }} />
                  <Radar name="% Correct" dataKey="pct_correct" stroke={CYBER_SUC}  fill={CYBER_SUC}  fillOpacity={0.25} strokeWidth={2} />
                  <Radar name="Hint Use %" dataKey="hint_pct"    stroke={CYBER_WARN} fill={CYBER_WARN} fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", fontFamily: "monospace", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <TerminalWindow title="system://leaderboard.top10" prompt="">
              <h3 className="font-mono text-sm font-bold text-foreground uppercase tracking-wide mb-3">Top 10 Performers</h3>
              {data.top_performers.length === 0 ? <EmptyState message="No completions yet" /> : (
                <div className="divide-y divide-border/30">
                  {data.top_performers.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`font-display text-sm font-bold w-6 ${i < 3 ? "text-primary" : "text-subtle"}`}>{i + 1}</span>
                        <div className="min-w-0">
                          <p className="font-mono text-sm text-foreground truncate">{p.username}</p>
                          <p className="font-mono text-[11px] text-subtle truncate">{p.instance}</p>
                        </div>
                      </div>
                      <span className="font-display tabular-nums text-sm font-bold text-primary">{p.score.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </TerminalWindow>

            <TerminalWindow title="system://branch.scores" prompt="">
              <h3 className="font-mono text-sm font-bold text-foreground uppercase tracking-wide mb-3">Branch Breakdown</h3>
              {data.branch_breakdown.length === 0 ? <EmptyState message="No branches" /> : (
                <div className="divide-y divide-border/30">
                  {data.branch_breakdown.map((b) => (
                    <div key={b.branch} className="py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-sm text-foreground">{b.branch}</span>
                        <span className="font-display tabular-nums text-sm font-bold text-primary">{b.avg_score.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between mb-1 font-mono text-[11px] text-subtle">
                        <span>{b.completed} / {b.enrolled} completed</span>
                        <span>{b.enrolled ? Math.round(b.completed / b.enrolled * 100) : 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-3 overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${b.enrolled ? b.completed / b.enrolled * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TerminalWindow>
          </div>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <TerminalWindow title={`system://chart`} prompt="">
      <div className="mb-3">
        <h3 className="font-mono text-sm font-bold text-foreground uppercase tracking-wide">{title}</h3>
        {subtitle && <p className="font-mono text-[11px] text-subtle mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </TerminalWindow>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span aria-hidden className="text-2xl text-border-strong">◫</span>
      <p className="font-mono text-xs text-subtle mt-2">{message}</p>
    </div>
  );
}

/**
 * Maintenance page — fully brand-kit aware.
 * Django middleware redirects here when maintenance_mode is active.
 * Admin / admin_user logins still work at /login (they bypass maintenance).
 */
import { CyberGrid } from "@/components/cyber/cyber-grid";
import { TerminalWindow } from "@/components/cyber/terminal-window";

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const message =
    params?.message ??
    "We are performing scheduled maintenance. We will be back shortly.";

  return (
    <main className="relative isolate flex min-h-[100dvh] flex-col items-center justify-center px-4 overflow-hidden">
      <CyberGrid />

      {/* Diagonal warning stripes — very subtle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--warning) 0, var(--warning) 2px, transparent 0, transparent 50%)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Animated horizontal scan line */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 overflow-hidden h-full">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-scan" />
      </div>

      <div className="relative w-full max-w-lg space-y-6 text-center animate-rise">
        {/* Big offline headline */}
        <div className="space-y-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.45em] text-subtle">
            ◻ System Status
          </p>
          <h1 className="font-display font-bold text-primary animate-flicker tracking-[0.18em]"
            style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)" }}>
            SYSTEM OFFLINE
          </h1>
          <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          {/* Blinking status indicator */}
          <div className="flex items-center justify-center gap-2 font-mono text-[10px] text-muted">
            <span className="size-1.5 rounded-full bg-warning shadow-[0_0_6px_var(--warning)] animate-blink" />
            <span className="uppercase tracking-[0.25em] text-warning/80">Maintenance Mode Active</span>
          </div>
        </div>

        {/* Terminal window with message */}
        <TerminalWindow
          title="system://maintenance.mode"
          prompt="kernelios@hq:~$ status"
          footer="ETA: restore pending · contact your administrator"
        >
          <div className="space-y-3.5 text-xs">
            <div className="flex items-start gap-2.5 text-danger/80">
              <span className="shrink-0 mt-px">!</span>
              <span>System is currently in maintenance mode. All user operations are suspended.</span>
            </div>
            <div className="h-px bg-border/50" />
            <div className="flex items-start gap-2.5 text-muted">
              <span className="shrink-0 mt-px text-subtle">—</span>
              <span>{message}</span>
            </div>
            <div className="h-px bg-border/50" />
            <div className="flex items-start gap-2.5 text-subtle">
              <span className="shrink-0 mt-px">◈</span>
              <span>
                Administrators may{" "}
                <a href="/login" className="text-primary/80 hover:text-primary transition-colors underline">
                  login here
                </a>{" "}
                to manage the system.
              </span>
            </div>
          </div>
        </TerminalWindow>

        {/* System status rows */}
        <div className="border border-border/60 bg-surface-1/60 divide-y divide-border/30">
          {[
            ["API Server",   "MAINTENANCE", "warning"],
            ["Exam Engine",  "SUSPENDED",   "warning"],
            ["Admin Portal", "ACCESSIBLE",  "success"],
          ].map(([label, status, color]) => (
            <div key={String(label)} className="flex items-center justify-between px-5 py-2.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-subtle">
                {label}
              </span>
              <span
                className={`font-mono text-[9px] flex items-center gap-1.5 ${
                  color === "success" ? "text-success/80" :
                  color === "warning" ? "text-warning/70" : "text-muted"
                }`}
              >
                <span
                  className={`size-1 rounded-full ${
                    color === "success" ? "bg-success" :
                    color === "warning" ? "bg-warning animate-blink" : "bg-muted/50"
                  }`}
                />
                {status}
              </span>
            </div>
          ))}
        </div>

        <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-subtle/50">
          Advanced Simulator System
        </p>
      </div>
    </main>
  );
}

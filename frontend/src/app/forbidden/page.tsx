import Link from "next/link";
import { CyberGrid } from "@/components/cyber/cyber-grid";

export default function ForbiddenPage() {
  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center gap-8 px-4 text-center">
      <CyberGrid />

      <div className="space-y-2 animate-rise">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
          system://error.403
        </p>
        <div className="font-display text-[8rem] font-black leading-none text-danger select-none"
          style={{ textShadow: "0 0 40px var(--color-danger, #ef4444)" }}>
          403
        </div>
        <p className="font-display text-xl font-bold text-foreground uppercase tracking-[0.15em]">
          Access Denied
        </p>
        <p className="font-mono text-sm text-muted max-w-xs mx-auto">
          Your clearance level is insufficient for this node. This incident has been logged.
        </p>
      </div>

      <div className="font-mono text-xs text-subtle border border-danger/30 bg-danger/5 px-6 py-4 space-y-1 max-w-sm w-full">
        <div className="text-danger">ERR: ACCESS_DENIED</div>
        <div className="text-muted">CLEARANCE: INSUFFICIENT</div>
        <div className="text-muted">CODE: 0x403</div>
        <div className="text-muted">TRACE: auth · role · check · <span className="text-danger">BLOCKED</span></div>
      </div>

      <Link
        href="/app"
        className="font-mono text-xs uppercase tracking-[0.2em] border border-border bg-surface-1 px-6 py-2.5 text-muted transition hover:border-primary/40 hover:text-primary"
      >
        ← Return to Base
      </Link>
    </main>
  );
}

import Link from "next/link";
import { CyberGrid } from "@/components/cyber/cyber-grid";

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-[100dvh] flex-col items-center justify-center gap-8 px-4 text-center overflow-hidden">
      <CyberGrid />

      {/* Large 404 glow behind */}
      <div
        aria-hidden
        className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-[0.03]"
      >
        <span className="font-display font-black text-primary"
          style={{ fontSize: "clamp(14rem, 40vw, 28rem)", lineHeight: 1 }}>
          404
        </span>
      </div>

      {/* Content */}
      <div className="relative space-y-4 animate-rise">
        <p className="font-mono text-[9px] uppercase tracking-[0.45em] text-subtle">
          system://error · node not found
        </p>
        <div
          className="font-display font-black text-primary text-glow select-none leading-none"
          style={{ fontSize: "clamp(5rem, 18vw, 10rem)" }}
        >
          404
        </div>
        <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <p className="font-display text-lg font-bold text-foreground uppercase tracking-[0.15em]">
          Signal Lost
        </p>
        <p className="font-mono text-xs text-muted max-w-xs mx-auto leading-relaxed">
          The requested node could not be located within the network topology.
        </p>
      </div>

      {/* Error terminal readout */}
      <div className="relative w-full max-w-sm border border-border/80 bg-surface-1 animate-rise delay-150">
        {/* Top accent */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-danger/40 to-transparent"
        />
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/70 bg-surface-2/70 px-4 py-2">
          <span className="size-2 rounded-full bg-danger/70" />
          <span className="size-2 rounded-full bg-warning/60" />
          <span className="size-2 rounded-full bg-border" />
          <span className="flex-1 text-center font-mono text-[8px] uppercase tracking-[0.2em] text-subtle">
            system://error.log
          </span>
        </div>
        <div className="px-5 py-4 font-mono text-xs space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="text-subtle shrink-0">ERR</span>
            <span className="text-danger">NODE_NOT_FOUND</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-subtle shrink-0">PTH</span>
            <span className="text-muted/70">&lt;requested-route&gt;</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-subtle shrink-0">COD</span>
            <span className="text-muted">0x404</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-subtle shrink-0">TRC</span>
            <span className="text-muted">
              routing · lookup · resolve · <span className="text-danger">FAIL</span>
            </span>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="animate-rise delay-225">
        <Link
          href="/app"
          className="group inline-flex items-center gap-2 border border-primary/35 bg-primary/5 px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-primary transition-all duration-150 hover:bg-primary/12 hover:border-primary/60 hover:shadow-[var(--glow-primary)] active:scale-[0.97]"
        >
          <span className="transition-transform group-hover:-translate-x-0.5">◂</span>
          Return to Base
        </Link>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useBrand } from "@/components/branding/brand-kit-provider";

type LoadingSplashProps = {
  message?: string;
  lines?: string[];
};

const DEFAULT_LINES = [
  "[ BOOT ] Initializing secure channel...",
  "[ AUTH ] Verifying operator credentials...",
  "[ LOAD ] Mounting exam environment...",
  "[ SYNC ] Fetching question matrix...",
];

export function LoadingSplash({ message, lines = DEFAULT_LINES }: LoadingSplashProps) {
  const brand = useBrand();
  const [lineIdx, setLineIdx] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (lineIdx >= lines.length) return;
    const t = setTimeout(() => setLineIdx((i) => i + 1), 380);
    return () => clearTimeout(t);
  }, [lineIdx, lines.length]);

  const progress = Math.min(100, (lineIdx / lines.length) * 100);
  const logo = brand?.logo || "/logo.png";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-surface">
      <div aria-hidden className="absolute inset-0 cyber-grid-bg opacity-60" />
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-scan" />
      </div>

      <div className="relative text-center space-y-2">
        {!logoFailed && (
          <Image
            src={logo}
            alt={brand?.brand_name ?? "KERNELiOS"}
            width={240}
            height={64}
            className="mx-auto h-16 w-auto animate-flicker object-contain"
            style={{ height: "auto", maxHeight: "64px" }}
            unoptimized
            priority
            onError={() => setLogoFailed(true)}
          />
        )}
      </div>

      <div className="relative w-full max-w-md border border-border-strong/60 bg-surface-1/90 shadow-[var(--shadow-window)]">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="flex items-center gap-2 border-b border-border/70 bg-surface-2/80 px-4 py-2">
          <span className="size-2 rounded-full bg-danger/70" />
          <span className="size-2 rounded-full bg-warning/70" />
          <span className="size-2 rounded-full bg-success/70" />
          <span className="flex-1 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-subtle">
            system://boot.sequence
          </span>
        </div>

        <div className="px-5 py-4 font-mono text-sm space-y-0.5">
          <div className="mb-3 flex items-center gap-2 text-primary text-xs">
            <span className="text-primary/60">▶</span>
            <span>kernelios@system:~$</span>
            <span className="size-[6px] animate-blink bg-primary inline-block" />
          </div>
          <div className="space-y-1">
            {lines.slice(0, lineIdx).map((l, i) => (
              <div key={i} className="text-success/80 text-xs">{l}</div>
            ))}
            {lineIdx < lines.length && (
              <div className="text-muted text-xs animate-pulse">{lines[lineIdx]}</div>
            )}
          </div>
        </div>
      </div>

      <div className="w-48 space-y-2">
        <div className="h-px w-full overflow-hidden bg-surface-3">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_6px_var(--primary)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        {message && (
          <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-subtle text-center">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

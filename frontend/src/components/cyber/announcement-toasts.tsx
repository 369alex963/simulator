"use client";

import { useState } from "react";
import { useExamSSE } from "@/hooks/use-exam-sse";

const SEVERITY_STYLES: Record<string, string> = {
  info: "border-primary/60 bg-primary/10 text-primary",
  warn: "border-warning/60 bg-warning/10 text-warning",
  urgent: "border-danger/60 bg-danger/10 text-danger animate-pulse",
};

const SEVERITY_LABEL: Record<string, string> = {
  urgent: "URGENT",
  warn: "WARNING",
  info: "INFO",
};

export function AnnouncementToasts() {
  const { announcements } = useExamSSE(true);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const visible = announcements.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {visible.map((ann) => (
        <div
          key={ann.id}
          className={`relative border px-4 py-3 shadow-[var(--shadow-window)] backdrop-blur-sm font-mono ${SEVERITY_STYLES[ann.severity] ?? SEVERITY_STYLES.info}`}
        >
          <button
            onClick={() => setDismissed((prev) => new Set([...prev, ann.id]))}
            className="absolute top-2 right-2 text-[10px] opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            ✕
          </button>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-70 mb-1">
            {SEVERITY_LABEL[ann.severity] ?? "INFO"}
          </p>
          <p className="text-sm font-semibold">{ann.title}</p>
          <p className="text-xs opacity-80 mt-0.5">{ann.message}</p>
        </div>
      ))}
    </div>
  );
}

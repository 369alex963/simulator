"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TypingTextProps = {
  lines: string[];
  className?: string;
  charDelay?: number;
  lineDelay?: number;
  startDelay?: number;
  cursor?: boolean;
  onComplete?: () => void;
};

export function TypingText({
  lines,
  className,
  charDelay = 22,
  lineDelay = 220,
  startDelay = 250,
  cursor = true,
  onComplete,
}: TypingTextProps) {
  const [rendered, setRendered] = useState<string[]>(() => lines.map(() => ""));
  const [done, setDone] = useState(false);

  // Stash onComplete in a ref so changing the prop doesn't restart the animation.
  // Without this, an inline `onComplete={() => ...}` from the parent triggers an
  // infinite render loop because every parent re-render gives us a new function
  // reference, which would re-run this effect, which fires onComplete, etc.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  useEffect(() => {
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timeouts.push(t);
    };

    let cumulative = startDelay;
    setRendered(lines.map(() => ""));
    setDone(false);

    lines.forEach((line, lineIdx) => {
      for (let charIdx = 0; charIdx <= line.length; charIdx += 1) {
        schedule(() => {
          setRendered((prev) => {
            const next = [...prev];
            next[lineIdx] = line.slice(0, charIdx);
            return next;
          });
        }, cumulative);
        cumulative += charDelay;
      }
      cumulative += lineDelay;
    });

    schedule(() => {
      setDone(true);
      onCompleteRef.current?.();
    }, cumulative);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  // Deliberately exclude onComplete — it's read via ref to avoid infinite loops.
  // Joining lines into a string makes the dep stable even if the parent passes
  // an inline array literal (a new reference each render).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.join("\n"), charDelay, lineDelay, startDelay]);

  return (
    <div className={cn("space-y-1", className)}>
      {rendered.map((line, idx) => (
        <div key={idx} className="whitespace-pre-wrap">
          {line}
          {cursor && !done && idx === rendered.length - 1 ? (
            <span className="ml-0.5 inline-block h-[1em] w-[0.5ch] translate-y-[0.15em] animate-blink bg-primary align-baseline" />
          ) : null}
        </div>
      ))}
      {cursor && done ? (
        <span className="inline-block h-[1em] w-[0.5ch] translate-y-[0.15em] animate-blink bg-primary align-baseline" />
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*<>/\\|";

type GlitchTextProps = {
  text: string;
  className?: string;
  onHover?: boolean;
  speed?: number;
};

export function GlitchText({ text, className, onHover = true, speed = 30 }: GlitchTextProps) {
  const [display, setDisplay] = useState(text);
  const [active, setActive] = useState(!onHover);
  const iter = useRef(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) { setDisplay(text); return; }

    iter.current = 0;
    interval.current = setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((char, idx) => {
            if (char === " ") return " ";
            if (idx < iter.current) return char;
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join(""),
      );
      iter.current += 0.4;
      if (iter.current >= text.length) {
        clearInterval(interval.current!);
        setDisplay(text);
      }
    }, speed);

    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, [text, active, speed]);

  return (
    <span
      className={cn("font-mono", className)}
      onMouseEnter={() => onHover && setActive(true)}
      onMouseLeave={() => onHover && setActive(false)}
    >
      {display}
    </span>
  );
}
